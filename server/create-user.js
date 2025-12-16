const bcrypt = require('bcrypt');
const sqlite = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

(async () => {
    try {
        const db = await open({ filename: path.join(__dirname, 'data.db'), driver: sqlite.Database });
        const hash = await bcrypt.hash('admin3150', 10);
        await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['Hotline6', hash, 'admin']);
        console.log('User Hotline6 created successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
