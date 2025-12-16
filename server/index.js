require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { initializeDatabase } = require('./database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'fallback_dev_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// ==================== SECURITY: Blocked IPs Storage ====================
const blockedIPs = new Map(); // IP -> { blockedAt, reason, attempts }

// Helper to check if IP is blocked
const isIPBlocked = (ip) => {
  const blocked = blockedIPs.get(ip);
  if (!blocked) return false;

  // Auto-unblock after 1 hour
  const oneHour = 60 * 60 * 1000;
  if (Date.now() - blocked.blockedAt > oneHour) {
    blockedIPs.delete(ip);
    return false;
  }
  return true;
};

// ==================== SECURITY: Helmet (HTTP Headers) ====================
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false
}));

// ==================== SECURITY: CORS Configuration ====================
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174').split(',');
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, true); // In dev, allow anyway but log warning
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==================== SECURITY: Rate Limiting ====================
// General API rate limiter - DISABLED FOR DEVELOPMENT (skip all)
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 0, // 0 = disabled (unlimited)
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => true // SKIP ALL REQUESTS - rate limiting disabled for team development
});

// Strict login rate limiter with remaining attempts info
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 10, // 10 attempts per 15 min (more reasonable for dev)
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const maxAttempts = options.max;

    // Track attempts for blocking
    const current = blockedIPs.get(ip) || { attempts: 0 };
    current.attempts++;

    if (current.attempts >= 15) {
      // Block IP after 15 total failed attempts
      blockedIPs.set(ip, { blockedAt: Date.now(), reason: 'Too many login attempts', attempts: current.attempts });
      console.warn(`[SECURITY] IP ${ip} blocked after ${current.attempts} failed login attempts`);
      return res.status(403).json({
        error: 'IP bloquée temporairement. Contactez un administrateur.',
        blocked: true
      });
    } else {
      blockedIPs.set(ip, current);
    }

    // Calculate time until reset
    const resetTime = Math.ceil(options.windowMs / 60000);

    res.status(429).json({
      error: `Trop de tentatives de connexion. Réessayez dans ${resetTime} minutes.`,
      remaining: 0,
      retryAfter: resetTime
    });
  }
});

// Middleware to check blocked IPs
const checkBlockedIP = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  if (isIPBlocked(ip)) {
    return res.status(403).json({ error: 'Accès temporairement bloqué. Contactez un administrateur.' });
  }
  next();
};

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(generalLimiter);

// ==================== AUTHENTICATION MIDDLEWARE ====================
// Middleware to verify Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Middleware to verify Admin role
const verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Middleware to verify specific permission
const requirePermission = (permission) => {
  return async (req, res, next) => {
    // Admins have all permissions
    if (req.user.role === 'admin') return next();

    const db = require('./database').getDb();
    try {
      let user;
      if (req.user.role === 'employee') {
        user = await db.get("SELECT permissions FROM employees WHERE id = ?", [req.user.id]);
      } else {
        user = await db.get("SELECT permissions FROM users WHERE id = ?", [req.user.id]);
      }

      if (!user) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Permissions are stored as JSON stirng in DB
      let permissions = [];
      try {
        permissions = user.permissions ? JSON.parse(user.permissions) : [];
      } catch (e) {
        permissions = [];
      }

      if (permissions.includes(permission)) {
        next();
      } else {
        res.status(403).json({ error: "Insufficient permissions" });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
};

// Helper to log audit events
const logAudit = async (req, action, details) => {
  if (!req.user) return; // Should allow logging even if auth failed? For now, only authenticated actions or passed manually

  const db = require('./database').getDb();
  const userId = req.user.id;
  const username = req.user.username || req.user.name || 'Unknown';
  const userRole = req.user.role || 'user';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  try {
    await db.run(
      "INSERT INTO audit_logs (user_id, username, user_role, action, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, username, userRole, action, typeof details === 'object' ? JSON.stringify(details) : details, ip]
    );
  } catch (e) {
    console.error("Audit Log Error:", e);
  }
};

// Helper: Check and Unlock Badges (Stub)
const checkAndUnlockBadges = async (userId, role) => {
  // Placeholder to prevent ReferenceError
  // Logic will be implemented later based on requirements
  return;
};

// Routes
// Login with rate limiting and input validation
app.post('/api/login',
  checkBlockedIP,
  loginLimiter,
  [
    body('username').trim().notEmpty().withMessage('Username requis'),
    body('password').notEmpty().withMessage('Mot de passe requis')
  ],
  async (req, res) => {
    // Validate inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, password } = req.body;
    const db = require('./database').getDb();
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    try {
      // First check users table (admin, hotliner)
      const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
      if (user) {
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          await db.run("INSERT INTO auth_logs (user_id, username, action, ip_address) VALUES (?, ?, ?, ?)",
            [user.id, username, 'LOGIN_FAILED', clientIp]);

          // Get remaining attempts from rate limit headers
          const remaining = res.getHeader('RateLimit-Remaining') || '?';
          const maxAttempts = parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 10;
          return res.status(401).json({
            error: `Identifiants incorrects. Tentatives restantes: ${remaining}/${maxAttempts}`,
            remaining: parseInt(remaining) || 0
          });
        }

        // Clear IP from blocked list on successful login
        blockedIPs.delete(clientIp);

        await db.run("INSERT INTO auth_logs (user_id, username, action, ip_address) VALUES (?, ?, ?, ?)",
          [user.id, username, 'LOGIN_SUCCESS', clientIp]);

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: JWT_EXPIRES_IN });
        return res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            photo_url: user.photo_url,
            permissions: user.permissions ? JSON.parse(user.permissions) : [],
            has_seen_tutorial: user.has_seen_tutorial === 1
          }
        });
      }

      // Then check employees table (employee role - dashboard only)
      const employee = await db.get("SELECT * FROM employees WHERE email = ? AND password IS NOT NULL", [username]);
      if (employee) {
        const valid = await bcrypt.compare(password, employee.password);
        if (!valid) {
          await db.run("INSERT INTO auth_logs (user_id, username, action, ip_address) VALUES (?, ?, ?, ?)",
            [employee.id, username, 'LOGIN_FAILED', clientIp]);

          const remaining = res.getHeader('RateLimit-Remaining') || '?';
          const maxAttempts = parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 10;
          return res.status(401).json({
            error: `Identifiants incorrects. Tentatives restantes: ${remaining}/${maxAttempts}`,
            remaining: parseInt(remaining) || 0
          });
        }

        await db.run("INSERT INTO auth_logs (user_id, username, action, ip_address) VALUES (?, ?, ?, ?)",
          [employee.id, username, 'LOGIN_SUCCESS', clientIp]);

        const token = jwt.sign({ id: employee.id, name: employee.name, role: 'employee' }, SECRET_KEY, { expiresIn: '8h' });
        return res.json({
          token,
          user: {
            id: employee.id,
            username: employee.name,
            role: 'employee',
            permissions: employee.permissions ? JSON.parse(employee.permissions) : [], // ADDED
            has_seen_tutorial: employee.has_seen_tutorial === 1
          }
        });
      }

      await db.run("INSERT INTO auth_logs (user_id, username, action, ip_address) VALUES (?, ?, ?, ?)",
        [null, username, 'LOGIN_FAILED', clientIp]);

      const remaining = res.getHeader('RateLimit-Remaining') || '?';
      const maxAttempts = parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 10;
      return res.status(401).json({
        error: `Identifiants incorrects. Tentatives restantes: ${remaining}/${maxAttempts}`,
        remaining: parseInt(remaining) || 0
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// Update Tutorial Status
app.post('/api/users/tutorial-seen', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    if (req.user.role === 'employee') {
      await db.run("UPDATE employees SET has_seen_tutorial = 1 WHERE id = ?", [req.user.id]);
    } else {
      await db.run("UPDATE users SET has_seen_tutorial = 1 WHERE id = ?", [req.user.id]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get User Gamification Data
app.get('/api/users/gamification', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    let user;
    if (req.user.role === 'employee') {
      user = await db.get("SELECT xp, team3150_unlocked FROM employees WHERE id = ?", [req.user.id]);
    } else {
      user = await db.get("SELECT xp, team3150_unlocked FROM users WHERE id = ?", [req.user.id]);
    }

    res.json({
      xp: user?.xp || 0,
      team3150_unlocked: user?.team3150_unlocked === 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update User XP
app.post('/api/users/xp', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  const { xp } = req.body;
  try {
    if (req.user.role === 'employee') {
      await db.run("UPDATE employees SET xp = ? WHERE id = ?", [xp, req.user.id]);
    } else {
      await db.run("UPDATE users SET xp = ? WHERE id = ?", [xp, req.user.id]);
    }
    res.json({ success: true, xp });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unlock Easter Egg
app.post('/api/users/unlock-easter-egg', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  console.log(`[DEBUG] Attempting unlock for user ${req.user.id} (${req.user.role})`);
  try {
    let result;
    if (req.user.role === 'employee') {
      result = await db.run("UPDATE employees SET team3150_unlocked = 1 WHERE id = ?", [req.user.id]);
    } else {
      result = await db.run("UPDATE users SET team3150_unlocked = 1 WHERE id = ?", [req.user.id]);
    }

    console.log(`[DEBUG] Unlock result for ${req.user.role} ${req.user.id}:`, result);

    // Double check
    let verify;
    if (req.user.role === 'employee') {
      verify = await db.get("SELECT team3150_unlocked FROM employees WHERE id = ?", [req.user.id]);
    } else {
      verify = await db.get("SELECT team3150_unlocked FROM users WHERE id = ?", [req.user.id]);
    }
    // If still null, try the other table just to see
    if (!verify) {
      verify = await db.get("SELECT team3150_unlocked FROM employees WHERE id = ?", [req.user.id]);
    }

    console.log(`[DEBUG] Verification after update:`, verify);

    res.json({ success: true, changes: result.changes });
  } catch (error) {
    console.error(`[DEBUG] Unlock error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user info
app.get('/api/me', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    let user;
    if (req.user.role === 'employee') {
      user = await db.get(
        "SELECT id, name as username, 'employee' as role, photo_url, team3150_unlocked, xp, has_seen_tutorial, department, created_at, permissions FROM employees WHERE id = ?",
        [req.user.id]
      );
    } else {
      user = await db.get(
        "SELECT id, username, role, photo_url, team3150_unlocked, xp, level, created_at, permissions FROM users WHERE id = ?",
        [req.user.id]
      );
    }

    if (!user) return res.status(404).json({ error: "User not found" });

    // Normalize response
    const userData = {
      ...user,
      permissions: user.permissions ? JSON.parse(user.permissions) : []
    };

    res.json(userData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== USERS MANAGEMENT ====================

// Get all users (Permission: users_manage)
app.get('/api/users', authenticateToken, requirePermission('users_manage'), async (req, res) => {
  const db = require('./database').getDb();
  try {
    const users = await db.all("SELECT id, username, role, photo_url, permissions, created_at FROM users ORDER BY created_at DESC");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Create user (Permission: users_manage)
app.post('/api/users', authenticateToken, requirePermission('users_manage'), async (req, res) => {
  const { username, password, role, permissions } = req.body;
  const db = require('./database').getDb();
  try {
    const existing = await db.get("SELECT * FROM users WHERE username = ?", [username]);
    if (existing) return res.status(400).json({ error: "Username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const permsString = permissions ? (Array.isArray(permissions) ? JSON.stringify(permissions) : permissions) : '[]';

    const result = await db.run(
      "INSERT INTO users (username, password, role, permissions) VALUES (?, ?, ?, ?)",
      [username, hashedPassword, role || 'hotliner', permsString]
    );

    await logAudit(req, 'CREATE_USER', `Created user: ${username} (${role})`);
    res.json({ id: result.lastID, username, role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user (Permission: users_manage)
app.put('/api/users/:id', authenticateToken, requirePermission('users_manage'), async (req, res) => {
  const { id } = req.params;
  const { username, password, role, permissions } = req.body;
  const db = require('./database').getDb();
  try {
    const permsString = permissions ? (Array.isArray(permissions) ? JSON.stringify(permissions) : permissions) : '[]';

    // Check if user exists
    const user = await db.get("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Prevent deleting/modifying last admin if attempting to change role to hotliner
    if (user.role === 'admin' && role && role !== 'admin') {
      const adminCount = await db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
      if (adminCount.count <= 1) {
        return res.status(400).json({ error: "Cannot downgrade the last admin" });
      }
    }

    let query = "UPDATE users SET username = ?, role = ?, permissions = ? WHERE id = ?";
    let params = [username, role, permsString, id];

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = "UPDATE users SET username = ?, password = ?, role = ?, permissions = ? WHERE id = ?";
      params = [username, hashedPassword, role, permsString, id];
    }

    await db.run(query, params);
    await logAudit(req, 'UPDATE_USER', `Updated user ID: ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (Permission: users_manage)
app.delete('/api/users/:id', authenticateToken, requirePermission('users_manage'), async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();
  try {
    const user = await db.get("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.username === 'admin') return res.status(400).json({ error: "Cannot delete admin user" });

    await db.run("DELETE FROM users WHERE id = ?", [id]);
    await logAudit(req, 'DELETE_USER', `Deleted user: ${user.username}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload user photo (Admin or self)
app.post('/api/users/:id/photo', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { photo_url } = req.body;
  const db = require('./database').getDb();

  // Check permissions: admin can update any, others can only update self
  if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
    return res.status(403).json({ error: "Permission denied" });
  }

  try {
    await db.run("UPDATE users SET photo_url = ? WHERE id = ?", [photo_url, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user photo (Admin Only)
app.delete('/api/users/:id/photo', authenticateToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();
  try {
    await db.run("UPDATE users SET photo_url = NULL WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload employee photo (Admin Only)
app.post('/api/employees/:id/photo', authenticateToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { photo_url } = req.body;
  const db = require('./database').getDb();
  try {
    await db.run("UPDATE employees SET photo_url = ? WHERE id = ?", [photo_url, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete employee photo (Admin Only)
app.delete('/api/employees/:id/photo', authenticateToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();
  try {
    await db.run("UPDATE employees SET photo_url = NULL WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AUDIT LOGS ====================

// Get Audit Logs (Permission: settings_access) - Unified with Auth Logs
app.get('/api/audit-logs', authenticateToken, requirePermission('settings_access'), async (req, res) => {
  const db = require('./database').getDb();
  const { user_id, action, start_date, end_date } = req.query;

  // Base query combining audit_logs and auth_logs
  let query = `
    SELECT 
      id, user_id, username, user_role, action, details, ip_address, timestamp, 'audit' as source
    FROM audit_logs
    UNION ALL
    SELECT 
      id, user_id, username, 'N/A' as user_role, action, 'Authentication Event' as details, ip_address, timestamp, 'auth' as source
    FROM auth_logs
  `;

  // Wrapping in subquery to apply filters/sort
  let finalQuery = `SELECT * FROM (${query}) WHERE 1=1`;
  let params = [];

  if (user_id) {
    finalQuery += " AND user_id = ?";
    params.push(user_id);
  }
  if (action) {
    finalQuery += " AND action LIKE ?";
    params.push(`%${action}%`);
  }
  if (start_date) {
    finalQuery += " AND timestamp >= ?";
    params.push(start_date);
  }
  if (end_date) {
    finalQuery += " AND timestamp <= ?";
    params.push(end_date);
  }

  finalQuery += " ORDER BY timestamp DESC LIMIT 500";

  try {
    const logs = await db.all(finalQuery, params);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== NOTES ====================

// Get notes for an entity
app.get('/api/notes/:type/:entityId', authenticateToken, async (req, res) => {
  const { type, entityId } = req.params;
  const db = require('./database').getDb();
  try {
    const notes = await db.all(`
      SELECT n.*, u.username as author_name 
      FROM notes n 
      LEFT JOIN users u ON n.created_by = u.id 
      WHERE n.entity_type = ? AND n.entity_id = ?
      ORDER BY n.created_at DESC
    `, [type, entityId]);
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a note
app.post('/api/notes/:type/:entityId', authenticateToken, async (req, res) => {
  const { type, entityId } = req.params;
  const { content } = req.body;
  const db = require('./database').getDb();

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Content is required" });
  }

  try {
    const creatorRole = req.user.role === 'employee' ? 'employee' : 'user';
    const result = await db.run(
      "INSERT INTO notes (entity_type, entity_id, content, created_by, creator_role) VALUES (?, ?, ?, ?, ?)",
      [type, entityId, content.trim(), req.user.id, creatorRole]
    );
    const note = await db.get(`
      SELECT n.*, u.username as author_name 
      FROM notes n 
      LEFT JOIN users u ON n.created_by = u.id 
      WHERE n.id = ?
    `, [result.lastID]);
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a note
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();
  try {
    await db.run("DELETE FROM notes WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Products
app.get('/api/products', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  const products = await db.all(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
  `);
  res.json(products);
});

// Add Product
app.post('/api/products', authenticateToken, async (req, res) => {
  const { name, category_id, quantity, min_quantity, description, location, serial_number, asset_tag, condition, last_maintenance, next_maintenance } = req.body;
  const db = require('./database').getDb();
  try {
    const result = await db.run(
      `INSERT INTO products (name, category_id, quantity, min_quantity, description, location, serial_number, asset_tag, condition, last_maintenance, next_maintenance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category_id, quantity, min_quantity, description, location, serial_number || null, asset_tag || null, condition || 'Bon', last_maintenance || null, next_maintenance || null]
    );
    // Log with quantity info
    await db.run("INSERT INTO logs (user_id, action, details, quantity_change) VALUES (?, ?, ?, ?)",
      [req.user.id, 'ADD_PRODUCT', `Added "${name}" (qty: ${quantity})${asset_tag ? ` [${asset_tag}]` : ''}`, quantity]);
    res.json({ id: result.lastID, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Stock
app.post('/api/products/:id/stock', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { change, recipient } = req.body; // change: +1 or -1, recipient: name for removals
  const db = require('./database').getDb();
  try {
    // Get product name for better logging
    const product = await db.get("SELECT name FROM products WHERE id = ?", [id]);
    if (!product) return res.status(404).json({ error: "Product not found" });

    await db.run("UPDATE products SET quantity = quantity + ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?", [change, id]);

    // Create descriptive log message
    let details;
    if (change < 0 && recipient) {
      details = `${product.name}: -1 → ${recipient}`;
    } else if (change > 0) {
      details = `${product.name}: +${change} unit(s)`;
    } else {
      details = `${product.name}: ${change} unit(s)`;
    }

    await db.run("INSERT INTO logs (user_id, action, details, quantity_change) VALUES (?, ?, ?, ?)",
      [req.user.id, 'UPDATE_STOCK', details, change]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BULK IMPORTS ====================

// Import employees from CSV
app.post('/api/employees/import', authenticateToken, requirePermission('employees_edit'), async (req, res) => {
  const { data } = req.body;
  const db = require('./database').getDb();

  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ error: "Invalid data format" });
  }

  try {
    let imported = 0;
    for (const row of data) {
      if (row.name?.trim()) {
        await db.run(
          "INSERT INTO employees (name, email, department) VALUES (?, ?, ?)",
          [row.name.trim(), row.email?.trim() || '', row.department?.trim() || '']
        );
        imported++;
      }
    }
    res.json({ success: true, imported });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import products from CSV
app.post('/api/products/import', authenticateToken, verifyAdmin, async (req, res) => {
  const { data } = req.body;
  const db = require('./database').getDb();

  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ error: "Invalid data format" });
  }

  try {
    let imported = 0;
    for (const row of data) {
      if (row.name?.trim()) {
        // Find category by name
        let categoryId = null;
        if (row.category) {
          const cat = await db.get("SELECT id FROM categories WHERE name = ?", [row.category.trim()]);
          if (cat) categoryId = cat.id;
        }

        await db.run(
          "INSERT INTO products (name, category_id, quantity, min_quantity, location, description) VALUES (?, ?, ?, ?, ?, ?)",
          [
            row.name.trim(),
            categoryId,
            parseInt(row.quantity) || 0,
            parseInt(row.min_quantity) || 5,
            row.location?.trim() || '',
            row.description?.trim() || ''
          ]
        );
        imported++;
      }
    }
    res.json({ success: true, imported });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Product
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();
  try {
    // Get product name for logging
    const product = await db.get("SELECT name FROM products WHERE id = ?", [id]);
    if (!product) return res.status(404).json({ error: "Product not found" });

    await db.run("DELETE FROM products WHERE id = ?", [id]);

    await db.run("INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)",
      [req.user.id, 'DELETE_PRODUCT', `Deleted "${product.name}"`]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Product
app.put('/api/products/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, category_id, quantity, min_quantity, description, location, serial_number, asset_tag, condition, last_maintenance, next_maintenance } = req.body;
  const db = require('./database').getDb();
  try {
    const product = await db.get("SELECT * FROM products WHERE id = ?", [id]);
    if (!product) return res.status(404).json({ error: "Product not found" });

    await db.run(
      `UPDATE products SET name = ?, category_id = ?, quantity = ?, min_quantity = ?, description = ?, location = ?, serial_number = ?, asset_tag = ?, condition = ?, last_maintenance = ?, next_maintenance = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, category_id, quantity, min_quantity, description || '', location || '', serial_number || null, asset_tag || null, condition || 'Bon', last_maintenance || null, next_maintenance || null, id]
    );

    await db.run("INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)",
      [req.user.id, 'UPDATE_PRODUCT', `Updated "${name}"${asset_tag ? ` [${asset_tag}]` : ''}`]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Categories
app.get('/api/categories', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  const categories = await db.all("SELECT * FROM categories");
  res.json(categories);
});

// Add Category (Admin Only)
app.post('/api/categories', authenticateToken, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Category name is required" });

  const db = require('./database').getDb();
  try {
    const existing = await db.get("SELECT * FROM categories WHERE name = ?", [name]);
    if (existing) return res.status(400).json({ error: "Category already exists" });

    const result = await db.run("INSERT INTO categories (name) VALUES (?)", [name]);
    res.json({ id: result.lastID, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Category (Admin Only)
app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();
  try {
    // Check if category has products
    const products = await db.get("SELECT COUNT(*) as count FROM products WHERE category_id = ?", [id]);
    if (products.count > 0) {
      return res.status(400).json({ error: "Cannot delete category with products" });
    }
    await db.run("DELETE FROM categories WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==================== PHONES INVENTORY ====================

// Get all phones
app.get('/api/phones', authenticateToken, requirePermission('phones_view'), async (req, res) => {
  const db = require('./database').getDb();
  try {
    const phones = await db.all("SELECT * FROM phones ORDER BY last_updated DESC");
    res.json(phones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add phone
app.post('/api/phones', authenticateToken, requirePermission('phones_add'), async (req, res) => {
  const { name, serial_number, tlp_id, assigned_to, department, condition, notes } = req.body;
  const db = require('./database').getDb();
  try {
    const result = await db.run(
      `INSERT INTO phones (name, serial_number, tlp_id, assigned_to, department, condition, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, serial_number || null, tlp_id || null, assigned_to || null, department || null, condition || 'Bon', notes || null]
    );
    await db.run("INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)",
      [req.user.id, 'ADD_PHONE', `Added phone "${name}"${tlp_id ? ` [${tlp_id}]` : ''}`]);
    res.json({ id: result.lastID, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update phone
app.put('/api/phones/:id', authenticateToken, requirePermission('phones_edit'), async (req, res) => {
  const { id } = req.params;
  const { name, serial_number, tlp_id, assigned_to, department, condition, notes } = req.body;
  const db = require('./database').getDb();
  try {
    const phone = await db.get("SELECT * FROM phones WHERE id = ?", [id]);
    if (!phone) return res.status(404).json({ error: "Phone not found" });

    await db.run(
      `UPDATE phones SET name = ?, serial_number = ?, tlp_id = ?, assigned_to = ?, department = ?, condition = ?, notes = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, serial_number || null, tlp_id || null, assigned_to || null, department || null, condition || 'Bon', notes || null, id]
    );
    await db.run("INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)",
      [req.user.id, 'UPDATE_PHONE', `Updated phone "${name}"${tlp_id ? ` [${tlp_id}]` : ''}`]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete phone
app.delete('/api/phones/:id', authenticateToken, requirePermission('phones_delete'), async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();
  try {
    const phone = await db.get("SELECT * FROM phones WHERE id = ?", [id]);
    if (!phone) return res.status(404).json({ error: "Phone not found" });

    await db.run("DELETE FROM phones WHERE id = ?", [id]);
    await db.run("INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)",
      [req.user.id, 'DELETE_PHONE', `Deleted phone "${phone.name}"${phone.tlp_id ? ` [${phone.tlp_id}]` : ''}`]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import phones from CSV
app.post('/api/phones/import', authenticateToken, requirePermission('phones_export'), async (req, res) => {
  const { data } = req.body;
  const db = require('./database').getDb();

  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ error: "Invalid data format" });
  }

  try {
    let imported = 0;
    for (const row of data) {
      if (row.name?.trim()) {
        await db.run(
          "INSERT INTO phones (name, serial_number, tlp_id, assigned_to, department, condition, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [row.name.trim(), row.serial_number?.trim() || '', row.tlp_id?.trim() || '', row.assigned_to?.trim() || '', row.department?.trim() || '', row.condition?.trim() || 'Bon', row.notes?.trim() || '']
        );
        imported++;
      }
    }
    await db.run("INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)",
      [req.user.id, 'IMPORT_PHONES', `Imported ${imported} phones`]);
    res.json({ success: true, imported });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export phones
app.get('/api/phones/export', authenticateToken, requirePermission('phones_export'), async (req, res) => {
  const db = require('./database').getDb();
  try {
    const phones = await db.all("SELECT name, serial_number, tlp_id, assigned_to, department, condition, notes FROM phones");
    res.json(phones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EMPLOYEES ====================

// Get Employees
app.get('/api/employees', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    const employees = await db.all("SELECT * FROM employees ORDER BY name");
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Employee (Permission: employees_edit)
app.post('/api/employees', authenticateToken, requirePermission('employees_edit'), async (req, res) => {
  const { name, email, department, password, permissions } = req.body;
  if (!name) return res.status(400).json({ error: "Employee name is required" });

  const db = require('./database').getDb();
  try {
    let hashedPassword = null;
    if (password && password.trim() !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const permsString = permissions ? (Array.isArray(permissions) ? JSON.stringify(permissions) : permissions) : '[]';

    const result = await db.run(
      "INSERT INTO employees (name, email, department, password, permissions) VALUES (?, ?, ?, ?, ?)",
      [name, email || '', department || '', hashedPassword, permsString]
    );

    await logAudit(req, 'CREATE_EMPLOYEE', `Created employee: ${name}`);
    res.json({ id: result.lastID, name, email, department });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Employee (Permission: employees_edit)
app.put('/api/employees/:id', authenticateToken, requirePermission('employees_edit'), async (req, res) => {
  const { id } = req.params;
  const { name, email, department, password, permissions } = req.body;

  const db = require('./database').getDb();
  try {
    const permsString = permissions ? (Array.isArray(permissions) ? JSON.stringify(permissions) : permissions) : '[]';
    let query = "UPDATE employees SET name = ?, email = ?, department = ?, permissions = ? WHERE id = ?";
    let params = [name, email, department, permsString, id];

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = "UPDATE employees SET name = ?, email = ?, department = ?, password = ?, permissions = ? WHERE id = ?";
      params = [name, email, department, hashedPassword, permsString, id];
    }

    await db.run(query, params);

    await logAudit(req, 'UPDATE_EMPLOYEE', `Updated employee ID: ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Employee (Permission: employees_edit)
app.delete('/api/employees/:id', authenticateToken, requirePermission('employees_edit'), async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();
  try {
    // Check if employee has active assignments
    const assignments = await db.get(
      "SELECT COUNT(*) as count FROM equipment_assignments WHERE employee_id = ? AND returned_at IS NULL",
      [id]
    );
    if (assignments.count > 0) {
      return res.status(400).json({ error: "Cannot delete employee with active equipment" });
    }
    await db.run("DELETE FROM employees WHERE id = ?", [id]);
    await logAudit(req, 'DELETE_EMPLOYEE', `Deleted employee ID: ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Employee Equipment
app.get('/api/employees/:id/equipment', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();
  try {
    const equipment = await db.all(`
      SELECT ea.*, p.name as product_name, p.category_id, c.name as category_name, u.username as assigned_by_name
      FROM equipment_assignments ea
      JOIN products p ON ea.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON ea.assigned_by = u.id
      WHERE ea.employee_id = ?
      ORDER BY ea.assigned_at DESC
    `, [id]);
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==================== EQUIPMENT ASSIGNMENTS ====================

// Assign equipment to employee
app.post('/api/assignments', authenticateToken, async (req, res) => {
  const { product_id, employee_id } = req.body;
  const db = require('./database').getDb();

  try {
    // Check product has stock
    const product = await db.get("SELECT * FROM products WHERE id = ?", [product_id]);
    if (!product || product.quantity <= 0) {
      return res.status(400).json({ error: "Product not available" });
    }

    // Get employee name for logging
    const employee = await db.get("SELECT name FROM employees WHERE id = ?", [employee_id]);
    if (!employee) return res.status(400).json({ error: "Employee not found" });

    // Create assignment
    const result = await db.run(
      "INSERT INTO equipment_assignments (product_id, employee_id, assigned_by) VALUES (?, ?, ?)",
      [product_id, employee_id, req.user.id]
    );

    // Decrease stock
    await db.run("UPDATE products SET quantity = quantity - 1 WHERE id = ?", [product_id]);

    // Log
    await db.run(
      "INSERT INTO logs (user_id, action, details, quantity_change) VALUES (?, ?, ?, ?)",
      [req.user.id, 'ASSIGN_EQUIPMENT', `${product.name} → ${employee.name}`, -1]
    );

    res.json({ id: result.lastID, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Return equipment
app.post('/api/assignments/:id/return', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();

  try {
    // Get assignment details
    const assignment = await db.get(`
      SELECT ea.*, p.name as product_name, e.name as employee_name
      FROM equipment_assignments ea
      JOIN products p ON ea.product_id = p.id
      JOIN employees e ON ea.employee_id = e.id
      WHERE ea.id = ?
    `, [id]);

    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (assignment.returned_at) return res.status(400).json({ error: "Already returned" });

    // Mark as returned
    await db.run(
      "UPDATE equipment_assignments SET returned_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );

    // Increase stock
    await db.run("UPDATE products SET quantity = quantity + 1 WHERE id = ?", [assignment.product_id]);

    // Log
    await db.run(
      "INSERT INTO logs (user_id, action, details, quantity_change) VALUES (?, ?, ?, ?)",
      [req.user.id, 'RETURN_EQUIPMENT', `${assignment.product_name} ← ${assignment.employee_name}`, 1]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get Logs (History)
app.get('/api/logs', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    const logs = await db.all(`
      SELECT l.*, u.username 
      FROM logs l 
      LEFT JOIN users u ON l.user_id = u.id 
      ORDER BY l.timestamp DESC 
      LIMIT 100
    `);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Management (Admin Only)

app.get('/api/users', authenticateToken, verifyAdmin, async (req, res) => {
  const db = require('./database').getDb();
  try {
    const users = await db.all("SELECT id, username, role, created_at FROM users");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', authenticateToken, verifyAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  const db = require('./database').getDb();

  if (!username || !password || !role) return res.status(400).json({ error: "Missing fields" });

  try {
    const existing = await db.get("SELECT * FROM users WHERE username = ?", [username]);
    if (existing) return res.status(400).json({ error: "Username already exists" });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [username, hash, role]);

    res.json({ id: result.lastID, username, role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', authenticateToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();
  try {
    await db.run("DELETE FROM users WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Update User (Admin Only)
app.put('/api/users/:id', authenticateToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;

  const db = require('./database').getDb();
  try {
    let query = "UPDATE users SET username = ?, role = ? WHERE id = ?";
    let params = [username, role, id];

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = "UPDATE users SET username = ?, role = ?, password = ? WHERE id = ?";
      params = [username, role, hashedPassword, id];
    }

    await db.run(query, params);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EXPORT / SEARCH / SECURITY ====================

// Export Products to CSV
app.get('/api/export/csv', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    const products = await db.all(`
      SELECT p.id, p.name, c.name as category, p.quantity, p.min_quantity, p.location, p.description
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
    `);

    // Generate CSV
    const headers = ['ID', 'Name', 'Category', 'Quantity', 'Min Quantity', 'Location', 'Description'];
    const rows = products.map(p => [p.id, p.name, p.category || '', p.quantity, p.min_quantity, p.location || '', p.description || '']);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Global Search
app.get('/api/search', authenticateToken, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ products: [], employees: [], logs: [] });

  const db = require('./database').getDb();
  const searchTerm = `%${q}%`;

  try {
    const [products, employees, logs] = await Promise.all([
      db.all(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.name LIKE ? OR p.description LIKE ? OR p.location LIKE ?
        LIMIT 10
      `, [searchTerm, searchTerm, searchTerm]),
      db.all(`
        SELECT * FROM employees 
        WHERE name LIKE ? OR email LIKE ? OR department LIKE ?
        LIMIT 10
      `, [searchTerm, searchTerm, searchTerm]),
      db.all(`
        SELECT l.*, u.username 
        FROM logs l 
        LEFT JOIN users u ON l.user_id = u.id
        WHERE l.details LIKE ?
        ORDER BY l.timestamp DESC
        LIMIT 10
      `, [searchTerm])
    ]);

    res.json({ products, employees, logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change Password
app.post('/api/users/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Missing fields" });

  const db = require('./database').getDb();

  try {
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.user.id]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.run("UPDATE users SET password = ? WHERE id = ?", [hash, req.user.id]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GAMIFICATION ENDPOINTS ====================

// Get user gamification data (XP, level, easter egg status)
app.get('/api/users/gamification', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    let user;
    if (req.user.role === 'employee') {
      user = await db.get("SELECT xp, team3150_unlocked FROM employees WHERE id = ?", [req.user.id]);
    } else {
      user = await db.get("SELECT xp, team3150_unlocked FROM users WHERE id = ?", [req.user.id]);
    }

    if (!user && req.user.role === 'employee') {
      // Auto-fix for legacy employees without XP column if needed, or return default
      return res.json({ xp: 0, team3150_unlocked: false });
    }

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      xp: user.xp || 0,
      team3150_unlocked: user.team3150_unlocked === 1 || user.team3150_unlocked === 'true'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save user XP
app.post('/api/users/gamification', authenticateToken, async (req, res) => {
  const { xp } = req.body;
  const db = require('./database').getDb();

  try {
    if (req.user.role === 'employee') {
      await db.run("UPDATE employees SET xp = ? WHERE id = ?", [xp || 0, req.user.id]);
    } else {
      await db.run("UPDATE users SET xp = ? WHERE id = ?", [xp || 0, req.user.id]);
    }
    res.json({ success: true, xp });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Get Achievements Status
app.get('/api/achievements/status', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();

  try {
    // Determine if user is from users or employees table
    const isEmployee = req.user.role === 'employee';

    // Get user stats for achievements including XP
    const [loansCount, notesCount, userXp] = await Promise.all([
      db.get("SELECT COUNT(*) as count FROM loan_history WHERE created_by = ? AND action_type = 'loan'", [req.user.id]),
      db.get("SELECT COUNT(*) as count FROM notes WHERE created_by = ?", [req.user.id]),
      isEmployee
        ? db.get("SELECT xp FROM employees WHERE id = ?", [req.user.id])
        : db.get("SELECT xp FROM users WHERE id = ?", [req.user.id])
    ]);

    const stats = {
      loans_count: loansCount?.count || 0,
      notes_count: notesCount?.count || 0,
      xp: userXp?.xp || 0
    };

    // Calculate unlocked badges based on stats
    const unlocked_badges = [];
    if (stats.loans_count >= 1) unlocked_badges.push('first_loan');
    if (stats.loans_count >= 10) unlocked_badges.push('10_loans');
    if (stats.loans_count >= 50) unlocked_badges.push('50_loans');
    if (stats.loans_count >= 100) unlocked_badges.push('100_loans');
    if (stats.notes_count >= 1) unlocked_badges.push('first_note');
    if (stats.notes_count >= 10) unlocked_badges.push('10_notes');
    if (stats.notes_count >= 50) unlocked_badges.push('50_notes');
    if (stats.xp >= 200) unlocked_badges.push('christmas_theme');

    res.json({ stats, unlocked_badges });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Product History
app.get('/api/products/:id/history', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();

  try {
    const [assignments, logs] = await Promise.all([
      db.all(`
        SELECT ea.*, e.name as employee_name, u.username as assigned_by_name
        FROM equipment_assignments ea
        JOIN employees e ON ea.employee_id = e.id
        LEFT JOIN users u ON ea.assigned_by = u.id
        WHERE ea.product_id = ?
        ORDER BY ea.assigned_at DESC
      `, [id]),
      db.all(`
        SELECT l.*, u.username
        FROM logs l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE l.details LIKE ?
        ORDER BY l.timestamp DESC
        LIMIT 50
      `, [`%product ${id}%`])
    ]);

    res.json({ assignments, logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==================== STATISTICS ====================

// Stock evolution (last 30 days)
app.get('/api/stats/evolution', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    const logs = await db.all(`
      SELECT DATE(timestamp) as date, SUM(quantity_change) as change
      FROM logs
      WHERE timestamp >= date('now', '-30 days')
      AND quantity_change IS NOT NULL
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Top outgoing products (most assigned)
app.get('/api/stats/top-products', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    const products = await db.all(`
      SELECT l.details, COUNT(*) as count
      FROM logs l
      WHERE l.action = 'UPDATE_STOCK'
      AND l.quantity_change < 0
      GROUP BY SUBSTR(l.details, 1, INSTR(l.details || ':', ':') - 1)
      ORDER BY count DESC
      LIMIT 5
    `);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PRT history search (search by reference like PRT3150)
app.get('/api/search/prt/:prt', authenticateToken, async (req, res) => {
  const { prt } = req.params;
  const db = require('./database').getDb();
  try {
    const logs = await db.all(`
      SELECT l.*, u.username
      FROM logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.details LIKE ?
      ORDER BY l.timestamp DESC
    `, [`%${prt}%`]);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==================== AUTH LOGS (Admin Only) ====================

app.get('/api/auth-logs', authenticateToken, verifyAdmin, async (req, res) => {
  const db = require('./database').getDb();
  try {
    const logs = await db.all(`
      SELECT * FROM auth_logs
      ORDER BY timestamp DESC
      LIMIT 100
    `);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ==================== LOAN PCs ====================

// Get all loan PCs
app.get('/api/loan-pcs', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    const pcs = await db.all("SELECT * FROM loan_pcs ORDER BY name");
    res.json(pcs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get loan PC stats
app.get('/api/loan-pcs/stats', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    const total = await db.get("SELECT COUNT(*) as count FROM loan_pcs");
    const available = await db.get("SELECT COUNT(*) as count FROM loan_pcs WHERE status = 'available'");
    const loaned = await db.get("SELECT COUNT(*) as count FROM loan_pcs WHERE status = 'loaned'");
    const outOfService = await db.get("SELECT COUNT(*) as count FROM loan_pcs WHERE status = 'out_of_service'");
    const remastering = await db.get("SELECT COUNT(*) as count FROM loan_pcs WHERE is_remastering = 1");

    // Overdue PCs
    const overdue = await db.all(`
      SELECT * FROM loan_pcs 
      WHERE status = 'loaned' 
      AND loan_end_expected < datetime('now')
    `);

    res.json({
      total: total.count,
      available: available.count,
      loaned: loaned.count,
      outOfService: outOfService.count,
      remastering: remastering.count,
      overdue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new loan PC
app.post('/api/loan-pcs', authenticateToken, async (req, res) => {
  const { name, serial_number, notes } = req.body;
  if (!name) return res.status(400).json({ error: "PC name is required" });

  const db = require('./database').getDb();
  try {
    const result = await db.run(
      "INSERT INTO loan_pcs (name, serial_number, notes, status) VALUES (?, ?, ?, 'available')",
      [name, serial_number || '', notes || '']
    );
    res.json({ id: result.lastID, name, serial_number, notes, status: 'available' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update loan PC
app.put('/api/loan-pcs/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, serial_number, notes, status } = req.body;
  const db = require('./database').getDb();
  try {
    await db.run(
      "UPDATE loan_pcs SET name = ?, serial_number = ?, notes = ?, status = ? WHERE id = ?",
      [name, serial_number, notes, status, id]
    );
    // Check for badges
    await checkAndUnlockBadges(req.user.id, req.user.role);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Loan a PC (assign to user)
app.post('/api/loan-pcs/:id/loan', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { user_name, reason, end_date, notes, override_reservation } = req.body;
  if (!user_name) return res.status(400).json({ error: "User name is required" });

  const db = require('./database').getDb();
  try {
    const pc = await db.get("SELECT * FROM loan_pcs WHERE id = ?", [id]);
    if (!pc) return res.status(404).json({ error: "PC not found" });
    // Allow loan if status is strictly NOT 'loaned' and NOT 'out_of_service'
    if (pc.status === 'loaned') return res.status(400).json({ error: "PC is already loaned" });
    if (pc.status === 'out_of_service') return res.status(400).json({ error: "PC is out of service" });

    // Check for active or upcoming reservations that block this loan
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Find reservations that:
    // 1. Start today (active reservation)
    // 2. Start in the past but end in the future (ongoing reservation)
    const activeReservation = await db.get(`
      SELECT * FROM reservations 
      WHERE pc_id = ? 
      AND date(start_date) <= date(?) 
      AND date(end_date) >= date(?)
    `, [id, todayStr, todayStr]);

    if (activeReservation && !override_reservation) {
      return res.status(409).json({
        error: `Ce PC est réservé par ${activeReservation.user_name} du ${new Date(activeReservation.start_date).toLocaleDateString('fr-FR')} au ${new Date(activeReservation.end_date).toLocaleDateString('fr-FR')}.`,
        reservation: activeReservation,
        is_reservation_conflict: true
      });
    }

    // If override_reservation is true, delete the reservation and proceed with loan
    if (activeReservation && override_reservation) {
      await db.run("DELETE FROM reservations WHERE id = ?", [activeReservation.id]);
      logAudit(req, 'OVERRIDE_RESERVATION', `Reservation ${activeReservation.id} overridden for loan to ${user_name}`);
    }

    const now = new Date().toISOString();
    await db.run(
      `UPDATE loan_pcs SET 
        status = 'loaned', 
        current_user = ?, 
        loan_reason = ?, 
        loan_start = ?, 
        loan_end_expected = ?,
        notes = ?
      WHERE id = ?`,
      [user_name, reason || '', now, end_date || '', notes || '', id]
    );

    // Add to history
    const creatorRole = req.user.role === 'employee' ? 'employee' : 'user';
    await db.run(
      `INSERT INTO loan_history (pc_id, pc_name, user_name, reason, start_date, end_date, notes, created_by, creator_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, pc.name, user_name, reason, now, end_date, notes, req.user.id, creatorRole]
    );

    // Check for badges
    await checkAndUnlockBadges(req.user.id, req.user.role);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Return a PC
app.post('/api/loan-pcs/:id/return', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();
  try {
    const pc = await db.get("SELECT * FROM loan_pcs WHERE id = ?", [id]);
    if (!pc) return res.status(404).json({ error: "PC not found" });

    const now = new Date().toISOString();

    // Update last history entry with actual return date
    await db.run(
      `UPDATE loan_history SET actual_return_date = ? 
       WHERE pc_id = ? AND actual_return_date IS NULL`,
      [now, id]
    );

    await db.run(
      `UPDATE loan_pcs SET 
        status = 'available', 
        current_user = NULL, 
        loan_reason = NULL, 
        loan_start = NULL, 
        loan_end_expected = NULL
      WHERE id = ?`,
      [id]
    );

    // Check for badges (e.g. "First Return")
    await checkAndUnlockBadges(req.user.id, req.user.role);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== RESERVATIONS ====================

// Get all reservations
app.get('/api/reservations', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    const reservations = await db.all(`
            SELECT r.*, lp.name as pc_name 
            FROM reservations r 
            LEFT JOIN loan_pcs lp ON r.pc_id = lp.id 
            ORDER BY r.start_date
        `);
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Reservation
app.post('/api/reservations', authenticateToken, async (req, res) => {
  const { pc_id, user_name, start_date, end_date, notes } = req.body;
  if (!pc_id || !user_name || !start_date || !end_date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const db = require('./database').getDb();
  try {
    // Validation: Check for overlap
    const conflict = await db.get(`
            SELECT * FROM reservations 
            WHERE pc_id = ? 
            AND (
                (start_date <= ? AND end_date >= ?) -- New start is inside existing
                OR (start_date <= ? AND end_date >= ?) -- New end is inside existing
                OR (start_date >= ? AND end_date <= ?) -- New wraps existing
            )
        `, [pc_id, start_date, start_date, end_date, end_date, start_date, end_date]);

    if (conflict) {
      return res.status(409).json({ error: `Conflit: Réservé par ${conflict.user_name} du ${new Date(conflict.start_date).toLocaleDateString()} au ${new Date(conflict.end_date).toLocaleDateString()}` });
    }

    await db.run(
      `INSERT INTO reservations (pc_id, user_name, start_date, end_date, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
      [pc_id, user_name, start_date, end_date, notes || '', req.user.id]
    );

    // Audit Log
    const pc = await db.get("SELECT name FROM loan_pcs WHERE id = ?", [pc_id]);
    logAudit(req, 'CREATE_RESERVATION', `Reserved PC ${pc?.name} for ${user_name} (${start_date} -> ${end_date})`);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Reservation
app.delete('/api/reservations/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();
  try {
    await db.run("DELETE FROM reservations WHERE id = ?", [id]);
    logAudit(req, 'DELETE_RESERVATION', `Deleted reservation ${id}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set PC out of service
app.post('/api/loan-pcs/:id/out-of-service', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const db = require('./database').getDb();
  try {
    const pc = await db.get("SELECT * FROM loan_pcs WHERE id = ?", [id]);
    if (!pc) return res.status(404).json({ error: "PC not found" });

    await db.run(
      "UPDATE loan_pcs SET status = 'out_of_service', notes = ? WHERE id = ?",
      [reason || 'Out of service', id]
    );

    // Add to history
    const now = new Date().toISOString();
    const creatorRole = req.user.role === 'employee' ? 'employee' : 'user';
    await db.run(
      `INSERT INTO loan_history (pc_id, pc_name, user_name, reason, start_date, notes, created_by, action_type, creator_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, pc.name, '-', reason || 'Hors service', now, reason, req.user.id, 'repair', creatorRole]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore PC to available
app.post('/api/loan-pcs/:id/restore', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();
  try {
    const pc = await db.get("SELECT * FROM loan_pcs WHERE id = ?", [id]);
    if (!pc) return res.status(404).json({ error: "PC not found" });

    await db.run(
      "UPDATE loan_pcs SET status = 'available', is_remastering = 0, notes = NULL WHERE id = ?",
      [id]
    );

    // Add to history
    const now = new Date().toISOString();
    const creatorRole = req.user.role === 'employee' ? 'employee' : 'user';
    await db.run(
      `INSERT INTO loan_history (pc_id, pc_name, user_name, reason, start_date, notes, created_by, action_type, creator_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, pc.name, '-', 'Remis en service', now, 'PC restauré et disponible', req.user.id, 'restore', creatorRole]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle Remastering (Maintenance) status
app.post('/api/loan-pcs/:id/remaster', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { is_remastering } = req.body; // boolean
  const db = require('./database').getDb();
  try {
    const pc = await db.get("SELECT * FROM loan_pcs WHERE id = ?", [id]);
    if (!pc) return res.status(404).json({ error: "PC not found" });

    await db.run(
      "UPDATE loan_pcs SET is_remastering = ? WHERE id = ?",
      [is_remastering ? 1 : 0, id]
    );

    // Add to history
    const now = new Date().toISOString();
    const actionType = is_remastering ? 'remaster_start' : 'remaster_end';
    const reason = is_remastering ? 'Remasterisation démarrée' : 'Remasterisation terminée';
    const creatorRole = req.user.role === 'employee' ? 'employee' : 'user';
    await db.run(
      `INSERT INTO loan_history (pc_id, pc_name, user_name, reason, start_date, notes, created_by, action_type, creator_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, pc.name, '-', reason, now, null, req.user.id, actionType]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete loan PC
app.delete('/api/loan-pcs/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const db = require('./database').getDb();
  try {
    // Get PC info before deletion for logging
    const pc = await db.get("SELECT * FROM loan_pcs WHERE id = ?", [id]);
    if (!pc) return res.status(404).json({ error: "PC not found" });

    // Check if PC is currently loaned
    if (pc.status === 'loaned') {
      return res.status(400).json({ error: "Cannot delete a PC that is currently loaned" });
    }

    // Delete the PC
    await db.run("DELETE FROM loan_pcs WHERE id = ?", [id]);

    // Add to history log
    const now = new Date().toISOString();
    const creatorRole = req.user.role === 'employee' ? 'employee' : 'user';
    await db.run(
      `INSERT INTO loan_history (pc_id, pc_name, user_name, reason, start_date, notes, created_by, action_type, creator_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, pc.name, '-', 'PC supprimé du parc', now, `Serial: ${pc.serial_number || 'N/A'}`, req.user.id, 'delete', creatorRole]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get loan history
app.get('/api/loan-history', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    const history = await db.all(`
      SELECT 
        lh.*,
        COALESCE(u.username, e.name) as created_by_name
      FROM loan_history lh
      LEFT JOIN users u ON lh.created_by = u.id AND lh.creator_role = 'user'
      LEFT JOIN employees e ON lh.created_by = e.id AND lh.creator_role = 'employee'
      ORDER BY lh.timestamp DESC
    `);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// --- Admin Danger Zone ---

// Reset Entire Database (Preserve Users/Admins)
app.post('/api/admin/reset-database', authenticateToken, verifyAdmin, async (req, res) => {
  const db = require('./database').getDb();
  try {
    // Delete data from operational tables
    await db.run("DELETE FROM products");
    await db.run("DELETE FROM categories");
    await db.run("DELETE FROM logs");
    await db.run("DELETE FROM equipment_assignments");
    await db.run("DELETE FROM loan_pcs");
    await db.run("DELETE FROM loan_history");
    await db.run("DELETE FROM auth_logs");

    // NOTE: We do NOT delete from 'users' to preserve admin access
    // We do NOT delete from 'employees' here based on user request to have separate button.

    res.json({ message: "Database operational data reset successfully." });
  } catch (error) {
    console.error("Database reset error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Reset Employees
app.post('/api/admin/reset-employees', authenticateToken, verifyAdmin, async (req, res) => {
  const db = require('./database').getDb();
  try {
    await db.run("DELETE FROM employees");
    res.json({ message: "All employees deleted successfully." });
  } catch (error) {
    console.error("Employee reset error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== DASHBOARD STATS ====================

// Get Phone Statistics (Charts)
app.get('/api/stats/phones', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    const stats = {};

    // 1. Status Distribution
    const distribution = await db.all("SELECT assigned_to, condition, COUNT(*) as count FROM phones GROUP BY assigned_to, condition");
    stats.distribution = {
      available: 0,
      assigned: 0,
      out_of_service: 0,
      total: 0
    };
    stats.conditions = {}; // Breakdown by condition

    distribution.forEach(row => {
      // Condition breakdown
      stats.conditions[row.condition] = (stats.conditions[row.condition] || 0) + row.count;

      // Status breakdown
      if (row.condition === 'Hors service') {
        stats.distribution.out_of_service += row.count;
      } else if (row.assigned_to) {
        stats.distribution.assigned += row.count;
      } else {
        stats.distribution.available += row.count;
      }
      stats.distribution.total += row.count;
    });

    // 2. Phone Activity (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString();

    const activity = await db.all(`
      SELECT date(timestamp) as date, COUNT(*) as count 
      FROM logs 
      WHERE action IN ('ADD_PHONE', 'UPDATE_PHONE', 'DELETE_PHONE') AND timestamp > ? 
      GROUP BY date(timestamp)
      ORDER BY date(timestamp)
    `, [dateStr]);

    // Fill in missing days
    stats.activity = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const found = activity.find(a => a.date === dateKey);
      stats.activity.push({ date: dateKey, count: found ? found.count : 0 });
    }
    stats.activity.reverse();

    // 3. Top Departments (if available)
    stats.departments = await db.all(`
      SELECT department, COUNT(*) as count 
      FROM phones 
      WHERE department IS NOT NULL AND department != '' 
      GROUP BY department 
      ORDER BY count DESC 
      LIMIT 5
    `);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Dashboard Statistics (Charts)
app.get('/api/stats/dashboard', authenticateToken, async (req, res) => {
  const db = require('./database').getDb();
  try {
    const stats = {};

    // 1. Status Distribution (Pie Chart)
    // 1. Status Distribution (Improved)
    const statusCounts = await db.all("SELECT status, is_remastering, COUNT(*) as count FROM loan_pcs GROUP BY status, is_remastering");
    stats.distribution = {
      available: 0,
      remastering: 0, // NEW
      loaned: 0,
      out_of_service: 0,
      total: 0
    };
    statusCounts.forEach(row => {
      if (row.status === 'available' && row.is_remastering === 1) {
        stats.distribution.remastering += row.count;
      } else if (row.status === 'loaned') {
        stats.distribution.loaned += row.count;
      } else if (row.status === 'out_of_service') {
        stats.distribution.out_of_service += row.count;
      } else {
        stats.distribution.available += row.count;
      }
      stats.distribution.total += row.count;
    });

    // 2. Loans Activity (Last 7 days) (Line Chart)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString();

    const activity = await db.all(`
      SELECT date(start_date) as date, COUNT(*) as count 
      FROM loan_history 
      WHERE action_type = 'loan' AND start_date > ? 
      GROUP BY date(start_date)
      ORDER BY date(start_date)
    `, [dateStr]);

    // Fill in missing days
    stats.activity = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const found = activity.find(a => a.date === dateKey);
      stats.activity.push({ date: dateKey, count: found ? found.count : 0 });
    }
    stats.activity.reverse(); // Chronological order

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
async function startServer() {
  await initializeDatabase();
  // ==================== GAMIFICATION ====================

  // Helper function to check and unlock badges
  async function checkAndUnlockBadges(userId, userRole) {
    const db = require('./database').getDb();
    try {
      // 1. Get current stats
      const stats = {
        notes_count: 0,
        loans_count: 0
      };

      // Normalize role: 'employee' stays 'employee', anything else (admin, hotliner) becomes 'user'
      // This matches how we store it in creator_role
      const normalizedRole = userRole === 'employee' ? 'employee' : 'user';

      const notes = await db.get("SELECT COUNT(*) as count FROM notes WHERE created_by = ? AND creator_role = ?", [userId, normalizedRole]);
      const loans = await db.get("SELECT COUNT(*) as count FROM loan_history WHERE created_by = ? AND action_type='loan' AND creator_role = ?", [userId, normalizedRole]);
      stats.notes_count = notes?.count || 0;
      stats.loans_count = loans?.count || 0;

      // 2. Define Badges Logic (Server-Side Source of Truth)
      const BADGES = [
        { id: 'first_loan', target: 1, type: 'loans' },
        { id: '10_loans', target: 10, type: 'loans' },
        { id: '50_loans', target: 50, type: 'loans' },
        { id: '100_loans', target: 100, type: 'loans' },
        { id: 'first_note', target: 1, type: 'notes' },
        { id: '10_notes', target: 10, type: 'notes' },
        { id: '50_notes', target: 50, type: 'notes' },
      ];

      // 3. Check and Insert
      const now = new Date().toISOString();
      let newBadges = 0;

      // Get already unlocked badges for this user AND role
      // We need to filter by user_role (normalized) to separate Employee 1 from User 1
      const unlocked = await db.all("SELECT badge_id FROM user_badges WHERE user_id = ? AND user_role = ?", [userId, normalizedRole]);
      const unlockedIds = unlocked.map(b => b.badge_id);

      for (const badge of BADGES) {
        const currentVal = badge.type === 'loans' ? stats.loans_count : stats.notes_count;
        if (currentVal >= badge.target && !unlockedIds.includes(badge.id)) {
          try {
            await db.run(
              "INSERT INTO user_badges (user_id, badge_id, unlocked_at, user_role) VALUES (?, ?, ?, ?)",
              [userId, badge.id, now, normalizedRole]
            );
            newBadges++;
          } catch (e) {
            // Ignore error
          }
        }
      }

      // 4. Update XP in Users/Employees table
      // Formula: 1 Note = 10 XP, 1 Loan = 50 XP (Arbitrary but feels "XP-like")
      const newXp = (stats.notes_count * 10) + (stats.loans_count * 50);

      const table = userRole === 'employee' ? 'employees' : 'users';
      await db.run(`UPDATE ${table} SET xp = ? WHERE id = ?`, [newXp, userId]);

      return newBadges > 0;

    } catch (e) {
      console.error("Badge Check Error:", e);
    }
  }

  // Get Leaderboard (Activity based on XP)
  app.get('/api/leaderboard', authenticateToken, async (req, res) => {
    const db = require('./database').getDb();
    try {
      // We use the stored XP column which is updated by checkAndUnlockBadges
      // However, to be safe, we can recalculate or just select.
      // Let's select the XP column directly as it allows manual adjustments if ever needed and persists.

      const query = `
      SELECT 
        u.id, 
        u.username as name, 
        u.role, 
        u.photo_url,
        u.xp as score, -- Map XP to score for frontend compatibility
        (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id AND user_role = 'user') as badges_count
      FROM users u
      WHERE (u.team3150_unlocked = 1 OR u.role = 'admin') -- Include unlocked users AND admins
      AND u.xp > 0
      UNION ALL
      SELECT 
        e.id, 
        e.name, 
        'employee' as role,
        e.photo_url,
        e.xp as score,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = e.id AND user_role = 'employee') as badges_count
      FROM employees e
      WHERE e.xp > 0
      ORDER BY score DESC
      LIMIT 20
    `;

      // NOTE: Collision issue in user_badges. 
      // Solution: Add user_type column to user_badges or use composite key.
      // Modifying database.js schema is safer but I will do it here if needed.
      // For now, I will modify the check function to assume a unified ID space isn't there.
      // I'll add 'user_type' to user_badges if possible, or just ignore badges count in leaderboard for now to fulfill "XP" request.

      const leaderboard = await db.all(query);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get User Achievements Status
  app.get('/api/achievements/status', authenticateToken, async (req, res) => {
    const db = require('./database').getDb();
    const userId = req.user.id;
    const userRole = req.user.role;
    try {
      const normalizedRole = userRole === 'employee' ? 'employee' : 'user';

      // Calculate current stats for the user to check against badges
      const stats = await db.get(`
      SELECT 
        (SELECT COUNT(*) FROM loan_history WHERE created_by = ? AND creator_role = ?) as loans_count,
        (SELECT COUNT(*) FROM notes WHERE created_by = ? AND creator_role = ?) as notes_count
      `, [userId, normalizedRole, userId, normalizedRole]);

      // Fetch unlocked badges
      const unlocked = await db.all("SELECT badge_id, unlocked_at FROM user_badges WHERE user_id = ? AND user_role = ?", [userId, normalizedRole]);
      const unlockedIds = unlocked.map(b => b.badge_id);

      res.json({
        stats,
        unlocked_badges: unlockedIds
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== SECURITY: Admin Blocked IPs Management ====================

  // Get all blocked IPs
  app.get('/api/admin/blocked-ips', authenticateToken, verifyAdmin, (req, res) => {
    const blocked = [];
    blockedIPs.forEach((data, ip) => {
      blocked.push({
        ip,
        blockedAt: data.blockedAt,
        reason: data.reason,
        attempts: data.attempts,
        expiresIn: Math.max(0, Math.round((data.blockedAt + 3600000 - Date.now()) / 60000)) + ' min'
      });
    });
    res.json(blocked);
  });

  // Unblock a specific IP
  app.delete('/api/admin/blocked-ips/:ip', authenticateToken, verifyAdmin, (req, res) => {
    const { ip } = req.params;
    const decodedIp = decodeURIComponent(ip);

    if (blockedIPs.has(decodedIp)) {
      blockedIPs.delete(decodedIp);
      logAudit(req, 'UNBLOCK_IP', `Unblocked IP: ${decodedIp}`);
      res.json({ success: true, message: `IP ${decodedIp} débloquée` });
    } else {
      res.status(404).json({ error: 'IP non trouvée dans la liste des bloquées' });
    }
  });

  // Unblock all IPs
  app.delete('/api/admin/blocked-ips', authenticateToken, verifyAdmin, (req, res) => {
    const count = blockedIPs.size;
    blockedIPs.clear();
    logAudit(req, 'UNBLOCK_ALL_IPS', `Cleared ${count} blocked IPs`);
    res.json({ success: true, message: `${count} IPs débloquées` });
  });

  // ==================== SECURITY: Password Policy Validation ====================
  // Helper function to validate password strength
  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push('Minimum 8 caractères');
    if (!/[A-Z]/.test(password)) errors.push('Au moins une majuscule');
    if (!/[0-9]/.test(password)) errors.push('Au moins un chiffre');
    if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) errors.push('Au moins un caractère spécial');
    return errors;
  };

  // Endpoint to validate password (useful for frontend)
  app.post('/api/validate-password', (req, res) => {
    const { password } = req.body;
    const errors = validatePassword(password || '');
    res.json({
      valid: errors.length === 0,
      errors,
      strength: errors.length === 0 ? 'Fort' : errors.length <= 2 ? 'Moyen' : 'Faible'
    });
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
