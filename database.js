const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'tickets.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // Create Events Table
        db.run(`CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            date DATE NOT NULL,
            price REAL NOT NULL,
            total_seats INTEGER NOT NULL,
            available_seats INTEGER NOT NULL,
            imageUrl TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error('Error creating events table: ' + err.message);
        });

        // Create Bookings Table
        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER,
            guest_name TEXT NOT NULL,
            email TEXT,
            phone_number TEXT,
            quantity INTEGER NOT NULL,
            total_price REAL NOT NULL,
            ticket_code TEXT UNIQUE,
            payment_status TEXT DEFAULT 'pending',
            verified INTEGER DEFAULT 0,
            booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(event_id) REFERENCES events(id)
        )`, (err) => {
            if (err) {
                console.error('Error creating bookings table: ' + err.message);
            } else {
                // Migration: Add columns if they don't exist (for existing databases)
                const columnsToAdd = [
                    { name: 'email', type: 'TEXT' },
                    { name: 'phone_number', type: 'TEXT' },
                    { name: 'payment_status', type: "TEXT DEFAULT 'pending'" }
                ];

                columnsToAdd.forEach(col => {
                    db.run(`ALTER TABLE bookings ADD COLUMN ${col.name} ${col.type}`, (err) => {
                        if (err) {
                            if (!err.message.includes('duplicate column name')) {
                                console.log(`Column ${col.name} already exists or error: ${err.message}`);
                            }
                        } else {
                            console.log(`Added column ${col.name} to bookings table.`);
                        }
                    });
                });
            }
        });
    }
});

module.exports = db;
