const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./inventory.db');

db.all("PRAGMA table_info(employees)", (err, rows) => {
    if (err) console.error(err);
    console.log("Schema employees:", rows);
});

db.all("SELECT id, name, permissions FROM employees LIMIT 5", (err, rows) => {
    if (err) console.error(err);
    console.log("Data employees:", rows);
});
