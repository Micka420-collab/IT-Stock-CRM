const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./inventory.db');

db.all("PRAGMA table_info(loan_history)", (err, rows) => {
    if (err) console.error(err);
    console.log("Schema loan_history:", rows);
});

db.all("SELECT * FROM loan_history LIMIT 5", (err, rows) => {
    if (err) console.error(err);
    console.log("Data loan_history:", rows);
});
