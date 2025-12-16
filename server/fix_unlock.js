const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./inventory.db');

db.run("UPDATE users SET team3150_unlocked = 1 WHERE role != 'admin'", function (err) {
    if (err) {
        console.error(err.message);
    } else {
        console.log(`Manually unlocked ${this.changes} users`);
    }
});

db.run("UPDATE employees SET team3150_unlocked = 1", function (err) {
    if (err) {
        console.error(err.message);
    } else {
        console.log(`Manually unlocked ${this.changes} employees`);
    }
});
