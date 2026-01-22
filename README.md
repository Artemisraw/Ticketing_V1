Event Ticketing System Walkthrough
I have successfully transitioned the application from a support ticketing system to an Event Ticketing System. Users can now view upcoming events (plays, concerts) and book tickets.

How to Run
Navigate to the project directory:
cd ~/Ticketing_V1
Start the server (if not already running):
node server.js
Open your browser: http://localhost:3000
New Features Verified
Event Dashboard: Displays upcoming events with date, price, and real-time seat availability.
Admin Scheduling: "Admin Area" allows creating new events (e.g., "Hamlet", "The Lion King") with capacity limits.
Booking Flow:
Users can select an event and click "Book Tickets".
Modal shows event details and calculates total price based on quantity.
Booking updates the database and immediately reduces available seats.
Sold Out Logic: visual indicators when an event has 0 seats left.
System Architecture
Backend: Node.js + Express
Database: SQLite3 (Tables: events, bookings)
Frontend: Vanilla JS with a responsive, modern Grid layout.
Verification
Event Creation: Created "Hamlet" with 100 seats.
Booking: Booked 2 tickets; verified available seats dropped to 98.
Persistence: Restarted server and verified event data remains.
