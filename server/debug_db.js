const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./inventory.db');

db.all("PRAGMA table_info(users)", (err, rows) => {
    if (err) console.error(err);
    console.log("Schema users:", rows);
});

db.all("SELECT id, username, role, team3150_unlocked FROM users LIMIT 5", (err, rows) => {
    if (err) console.error(err);
    console.log("Data users:", rows);
});
