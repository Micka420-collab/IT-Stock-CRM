const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.resolve(__dirname, 'inventory.db');

let db;

async function initializeDatabase() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT, -- 'admin', 'hotliner'
      xp INTEGER DEFAULT 0,
      team3150_unlocked INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      category_id INTEGER,
      quantity INTEGER DEFAULT 0,
      min_quantity INTEGER DEFAULT 5,
      description TEXT,
      location TEXT,
      notes TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT,
      details TEXT,
      quantity_change INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      department TEXT,
      password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS equipment_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      employee_id INTEGER,
      assigned_by INTEGER,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      returned_at DATETIME,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (assigned_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS loan_pcs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      serial_number TEXT,
      status TEXT DEFAULT 'available',
      current_user TEXT,
      loan_reason TEXT,
      loan_start DATETIME,
      loan_end_expected DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS loan_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pc_id INTEGER,
      pc_name TEXT,
      user_name TEXT,
      reason TEXT,
      start_date DATETIME,
      end_date DATETIME,
      actual_return_date DATETIME,
      notes TEXT,
      created_by INTEGER,
      action_type TEXT DEFAULT 'loan',
      FOREIGN KEY (pc_id) REFERENCES loan_pcs(id)
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pc_id INTEGER,
      user_name TEXT,
      start_date DATETIME,
      end_date DATETIME,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pc_id) REFERENCES loan_pcs(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      user_role TEXT,
      action TEXT,
      details TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      badge_id TEXT,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Migration: Ensure gamification columns exist in users table
  try {
    await db.exec(`ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0`);
    console.log('Added xp column to users table');
  } catch (e) {
    // Column already exists
  }
  try {
    await db.exec(`ALTER TABLE users ADD COLUMN team3150_unlocked INTEGER DEFAULT 0`);
    console.log('Added team3150_unlocked column to users table');
  } catch (e) {
    // Column already exists
  }

  // Seed default admin if not exists
  const admin = await db.get("SELECT * FROM users WHERE username = 'admin'");
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 10);
    await db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', hash, 'admin']);
    console.log('Default admin user created: admin / admin123');
  }

  // Seed Hotline6 admin if not exists
  const hotline6 = await db.get("SELECT * FROM users WHERE username = 'Hotline6'");
  if (!hotline6) {
    const hash = await bcrypt.hash('Elouan', 10);
    await db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['Hotline6', hash, 'admin']);
    console.log('Admin user created: Hotline6');
  }

  // Seed categories
  const categories = ['PC', 'Laptop', 'Screen', 'Keyboard', 'Mouse', 'Battery', 'Charger', 'Adapter', 'Cleaning', 'Cables', 'Projector', 'Privacy Filter'];
  for (const cat of categories) {
    await db.run("INSERT OR IGNORE INTO categories (name) VALUES (?)", [cat]);
  }

  console.log('Database initialized');

  // Migration: Add quantity_change column if it doesn't exist
  try {
    await db.run("ALTER TABLE logs ADD COLUMN quantity_change INTEGER");
    console.log('Migration: Added quantity_change column to logs table');
  } catch (e) {
    // Column already exists, ignore error
  }

  // Migration: Add password column to employees if it doesn't exist
  try {
    await db.run("ALTER TABLE employees ADD COLUMN password TEXT");
    console.log('Migration: Added password column to employees table');
  } catch (e) {
    // Column already exists, ignore error
  }

  // Migration: Add photo column to products if it doesn't exist
  try {
    await db.run("ALTER TABLE products ADD COLUMN photo TEXT");
    console.log('Migration: Added photo column to products table');
  } catch (e) {
    // Column already exists, ignore error
  }

  // Migration: Add has_seen_tutorial column to users if it doesn't exist
  try {
    // Default to 0 (false)
    await db.run("ALTER TABLE users ADD COLUMN has_seen_tutorial INTEGER DEFAULT 0");
    console.log('Migration: Added has_seen_tutorial column to users table');
  } catch (e) {
    // Column already exists, ignore error
  }

  // Migration: Add has_seen_tutorial column to employees if it doesn't exist
  try {
    await db.run("ALTER TABLE employees ADD COLUMN has_seen_tutorial INTEGER DEFAULT 0");
    console.log('Migration: Added has_seen_tutorial column to employees table');
  } catch (e) {
    // Column already exists, ignore error
  }

  // Migration: Add is_remastering to loan_pcs
  try {
    await db.run("ALTER TABLE loan_pcs ADD COLUMN is_remastering INTEGER DEFAULT 0");
    console.log('Migration: Added is_remastering column to loan_pcs table');
  } catch (e) {
    // Column already exists, ignore
  }

  // Create auth_logs table for login tracking
  await db.run(`
    CREATE TABLE IF NOT EXISTS auth_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add XP columns to users
  try {
    await db.run("ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0");
    console.log('Migration: Added xp column to users table');
  } catch (e) { /* exists */ }

  try {
    await db.run("ALTER TABLE users ADD COLUMN team3150_unlocked INTEGER DEFAULT 0");
    console.log('Migration: Added team3150_unlocked column to users table');
  } catch (e) { /* exists */ }

  // Migration: Add photo_url column to users
  try {
    await db.run("ALTER TABLE users ADD COLUMN photo_url TEXT");
    console.log('Migration: Added photo_url column to users table');
  } catch (e) { /* exists */ }

  // Migration: Add photo_url column to employees
  try {
    await db.run("ALTER TABLE employees ADD COLUMN photo_url TEXT");
    console.log('Migration: Added photo_url column to employees table');
  } catch (e) { /* exists */ }

  // Migration: Add team3150_unlocked to employees
  try {
    await db.run("ALTER TABLE employees ADD COLUMN team3150_unlocked INTEGER DEFAULT 0");
    console.log('Migration: Added team3150_unlocked column to employees table');
  } catch (e) { /* exists */ }

  // Migration: Add xp to employees
  try {
    await db.run("ALTER TABLE employees ADD COLUMN xp INTEGER DEFAULT 0");
    console.log('Migration: Added xp column to employees table');
  } catch (e) { /* exists */ }

  // Migration: Add action_type column to loan_history
  try {
    await db.run("ALTER TABLE loan_history ADD COLUMN action_type TEXT DEFAULT 'loan'");
    console.log('Migration: Added action_type column to loan_history table');
  } catch (e) { /* exists */ }

  // Migration: Add permissions column to users
  try {
    await db.run("ALTER TABLE users ADD COLUMN permissions TEXT");
    console.log('Migration: Added permissions column to users table');
    // Set default permissions based on role
    await db.run(`UPDATE users SET permissions = '["inventory_view","inventory_edit","employees_view","employees_edit","loans_view","loans_manage","settings_access","users_manage"]' WHERE role = 'admin' AND permissions IS NULL`);
    await db.run(`UPDATE users SET permissions = '["inventory_view","inventory_edit","employees_view","loans_view","loans_manage"]' WHERE role = 'hotliner' AND permissions IS NULL`);
  } catch (e) { /* exists */ }

  // Migration: Add permissions column to employees
  try {
    await db.run("ALTER TABLE employees ADD COLUMN permissions TEXT");
    console.log('Migration: Added permissions column to employees table');
  } catch (e) { /* exists */ }

  // Migration: Create audit_logs table if not exists (for existing DBs)
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT,
        user_role TEXT,
        action TEXT,
        details TEXT,
        ip_address TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Migration: Created audit_logs table');
  } catch (e) { /* exists */ }

  // Migration: Create user_badges table if not exists (for existing DBs)
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        badge_id TEXT,
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('Migration: Created user_badges table');
  } catch (e) { /* exists */ }

  // Migration: Add creator_role to loan_history
  try {
    await db.run("ALTER TABLE loan_history ADD COLUMN creator_role TEXT DEFAULT 'user'");
    console.log('Migration: Added creator_role column to loan_history table');
  } catch (e) { /* exists */ }

  // Migration: Add creator_role to notes
  try {
    await db.run("ALTER TABLE notes ADD COLUMN creator_role TEXT DEFAULT 'user'");
    console.log('Migration: Added creator_role column to notes table');
  } catch (e) { /* exists */ }

  // Migration: Add user_role to user_badges
  try {
    await db.run("ALTER TABLE user_badges ADD COLUMN user_role TEXT DEFAULT 'user'");
    console.log('Migration: Added user_role column to user_badges table');
  } catch (e) { /* exists */ }

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

module.exports = { initializeDatabase, getDb };
