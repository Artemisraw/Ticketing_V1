const express = require('express');
const router = express.Router();
const db = require('../database');

// Generate unique ticket code
function generateTicketCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'TKT-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

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

// PUT update event (Admin)
router.put('/events/:id', (req, res) => {
    const { title, description, date, price, total_seats } = req.body;

    // Get current event to calculate available seats adjustment
    db.get("SELECT * FROM events WHERE id = ?", [req.params.id], (err, event) => {
        if (err || !event) {
            res.status(400).json({ "error": "Event not found" });
            return;
        }

        // Adjust available seats if total seats changed
        const seatsSold = event.total_seats - event.available_seats;
        const newAvailableSeats = total_seats - seatsSold;

        if (newAvailableSeats < 0) {
            res.status(400).json({ "error": "Cannot reduce seats below already sold amount" });
            return;
        }

        const sql = `UPDATE events SET 
                     title = COALESCE(?, title),
                     description = COALESCE(?, description),
                     date = COALESCE(?, date),
                     price = COALESCE(?, price),
                     total_seats = COALESCE(?, total_seats),
                     available_seats = ?
                     WHERE id = ?`;
        const params = [title, description, date, price, total_seats, newAvailableSeats, req.params.id];

        db.run(sql, params, function (err) {
            if (err) {
                res.status(400).json({ "error": err.message });
                return;
            }
            res.json({ "message": "success", "changes": this.changes });
        });
    });
});

// GET bookings for event
router.get('/events/:id/bookings', (req, res) => {
    const sql = `SELECT * FROM bookings WHERE event_id = ? ORDER BY booking_date DESC`;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "success", "data": rows });
    });
});

// GET dashboard stats
router.get('/stats', (req, res) => {
    const stats = {};

    // Get total revenue
    db.get("SELECT SUM(total_price) as total_revenue, COUNT(*) as total_bookings FROM bookings", [], (err, row) => {
        stats.total_revenue = row ? row.total_revenue || 0 : 0;
        stats.total_bookings = row ? row.total_bookings : 0;

        // Get today's sales
        const today = new Date().toISOString().split('T')[0];
        db.get(`SELECT SUM(total_price) as today_revenue, SUM(quantity) as today_tickets 
                FROM bookings WHERE DATE(booking_date) = ?`, [today], (err, row) => {
            stats.today_revenue = row ? row.today_revenue || 0 : 0;
            stats.today_tickets = row ? row.today_tickets || 0 : 0;

            // Get total events
            db.get("SELECT COUNT(*) as total_events FROM events", [], (err, row) => {
                stats.total_events = row ? row.total_events : 0;

                // Get most popular event
                db.get(`SELECT e.title, SUM(b.quantity) as tickets_sold 
                        FROM events e 
                        LEFT JOIN bookings b ON e.id = b.event_id 
                        GROUP BY e.id 
                        ORDER BY tickets_sold DESC LIMIT 1`, [], (err, row) => {
                    stats.popular_event = row ? row.title : 'N/A';
                    stats.popular_tickets = row ? row.tickets_sold || 0 : 0;

                    res.json({ "message": "success", "data": stats });
                });
            });
        });
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
        const ticket_code = generateTicketCode();

        // Transaction-like approach (SQLite serialized mode by default assists here)
        const updateSql = "UPDATE events SET available_seats = available_seats - ? WHERE id = ?";
        db.run(updateSql, [quantity, event_id], function (err) {
            if (err) {
                res.status(500).json({ "error": err.message });
                return;
            }

            const insertBooking = `INSERT INTO bookings (event_id, guest_name, quantity, total_price, ticket_code) 
                                   VALUES (?,?,?,?,?)`;
            db.run(insertBooking, [event_id, guest_name, quantity, total_price, ticket_code], function (err) {
                if (err) {
                    // Ideally we should rollback the seat update here, but for V1 we'll keep it simple
                    res.status(500).json({ "error": "Booking failed but seats reserved. Contact admin." });
                    return;
                }
                res.json({
                    "message": "success",
                    "data": {
                        booking_id: this.lastID,
                        event: event.title,
                        seats: quantity,
                        total: total_price,
                        ticket_code: ticket_code,
                        guest_name: guest_name
                    }
                });
            });
        });
    });
});

// GET verify ticket
router.get('/verify/:code', (req, res) => {
    const sql = `SELECT b.*, e.title as event_title, e.date as event_date 
                 FROM bookings b 
                 JOIN events e ON b.event_id = e.id 
                 WHERE b.ticket_code = ?`;

    db.get(sql, [req.params.code], (err, booking) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }

        if (!booking) {
            res.status(404).json({ "error": "Ticket not found", "valid": false });
            return;
        }

        // Mark as verified if not already
        if (!booking.verified) {
            db.run("UPDATE bookings SET verified = 1 WHERE ticket_code = ?", [req.params.code]);
        }

        res.json({
            "message": "success",
            "valid": true,
            "data": {
                ticket_code: booking.ticket_code,
                guest_name: booking.guest_name,
                event_title: booking.event_title,
                event_date: booking.event_date,
                quantity: booking.quantity,
                total_price: booking.total_price,
                verified: booking.verified === 1,
                booking_date: booking.booking_date
            }
        });
    });

});

// DELETE Cancel Booking (Admin)
router.delete('/bookings/:id', (req, res) => {
    // First get the booking to know how many seats to restore
    db.get("SELECT * FROM bookings WHERE id = ?", [req.params.id], (err, booking) => {
        if (err || !booking) {
            res.status(404).json({ "error": "Booking not found" });
            return;
        }

        // Restore seats
        db.run("UPDATE events SET available_seats = available_seats + ? WHERE id = ?",
            [booking.quantity, booking.event_id], function (err) {
                if (err) {
                    res.status(500).json({ "error": "Failed to restore seats" });
                    return;
                }

                // Delete booking
                db.run("DELETE FROM bookings WHERE id = ?", [req.params.id], function (err) {
                    if (err) {
                        res.status(500).json({ "error": "Failed to delete booking" });
                        return;
                    }
                    res.json({ "message": "deleted", "restored_seats": booking.quantity });
                });
            });
    });
});


module.exports = router;
