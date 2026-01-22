const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all events
router.get('/events', (req, res) => {
    const sql = "SELECT * FROM events ORDER BY date ASC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// POST create event (Admin)
router.post('/events', (req, res) => {
    const { title, description, date, price, total_seats, imageUrl } = req.body;
    const available_seats = total_seats; // Initial availability
    const sql = `INSERT INTO events (title, description, date, price, total_seats, available_seats, imageUrl) 
                 VALUES (?,?,?,?,?,?,?)`;
    const params = [title, description, date, price, total_seats, available_seats, imageUrl];

    db.run(sql, params, function (err, result) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": { id: this.lastID, ...req.body, available_seats }
        });
    });
});

// DELETE event
router.delete('/events/:id', (req, res) => {
    const sql = 'DELETE FROM events WHERE id = ?';
    const params = [req.params.id];
    db.run(sql, params, function (err, result) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", changes: this.changes });
    });
});

// POST Book Ticket
router.post('/book', (req, res) => {
    const { event_id, guest_name, quantity } = req.body;

    // First check availability
    db.get("SELECT * FROM events WHERE id = ?", [event_id], (err, event) => {
        if (err || !event) {
            res.status(400).json({ "error": "Event not found" });
            return;
        }

        if (event.available_seats < quantity) {
            res.status(400).json({ "error": "Not enough seats available" });
            return;
        }

        const total_price = event.price * quantity;

        // Transaction-like approach (SQLite serialized mode by default assists here)
        const updateSql = "UPDATE events SET available_seats = available_seats - ? WHERE id = ?";
        db.run(updateSql, [quantity, event_id], function (err) {
            if (err) {
                res.status(500).json({ "error": err.message });
                return;
            }

            const insertBooking = `INSERT INTO bookings (event_id, guest_name, quantity, total_price) 
                                   VALUES (?,?,?,?)`;
            db.run(insertBooking, [event_id, guest_name, quantity, total_price], function (err) {
                if (err) {
                    // Ideally we should rollback the seat update here, but for V1 we'll keep it simple
                    res.status(500).json({ "error": "Booking failed but seats reserved. Contact admin." });
                    return;
                }
                res.json({
                    "message": "success",
                    "data": { booking_id: this.lastID, event: event.title, seats: quantity, total: total_price }
                });
            });
        });
    });
});

module.exports = router;
