const API_URL = '/api';

// Elements
const eventList = document.getElementById('eventList');
const adminBtn = document.getElementById('adminBtn');
const createEventModal = document.getElementById('createEventModal');
const bookingModal = document.getElementById('bookingModal');
const ticketModal = document.getElementById('ticketModal');
const closeButtons = document.querySelectorAll('.close-modal, .close-modal-btn');
const overlay = document.querySelectorAll('.modal-overlay');

// Forms
const eventForm = document.getElementById('eventForm');
const bookingForm = document.getElementById('bookingForm');

// State
let events = [];
let currentEventForBooking = null;
let currentBookingData = null;

// Initial Load
fetchEvents();

// Event Listeners
adminBtn.addEventListener('click', () => createEventModal.classList.remove('hidden'));
closeButtons.forEach(btn => btn.addEventListener('click', closeAllModals));
overlay.forEach(ov => ov.addEventListener('click', closeAllModals));

eventForm.addEventListener('submit', handleCreateEvent);
bookingForm.addEventListener('submit', handleBookTicket);
document.getElementById('quantity').addEventListener('input', updateGrandTotal);

// Functions
function closeAllModals() {
    createEventModal.classList.add('hidden');
    bookingModal.classList.add('hidden');
    ticketModal.classList.add('hidden');
    eventForm.reset();
    bookingForm.reset();
    currentEventForBooking = null;
}

async function fetchEvents() {
    try {
        const res = await fetch(`${API_URL}/events`);
        const data = await res.json();
        if (data.message === 'success') {
            events = data.data;
            renderEvents();
        }
    } catch (err) {
        console.error('Error fetching events:', err);
        eventList.innerHTML = '<div class="error">Failed to load events.</div>';
    }
}

function renderEvents() {
    if (events.length === 0) {
        eventList.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No upcoming events scheduled.</p>';
        return;
    }

    eventList.innerHTML = events.map(event => {
        const dateObj = new Date(event.date);
        const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const isSoldOut = event.available_seats <= 0;

        return `
            <div class="event-card ${isSoldOut ? 'sold-out' : ''}">
                <div class="event-image">
                    ${event.imageUrl ? `<img src="${event.imageUrl}" alt="${event.title}">` :
                `<svg width="40" height="40" fill="none" class="opacity-50" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>`}
                </div>
                <div class="event-body">
                    <div class="event-date">${dateStr}</div>
                    <div class="event-title">${escapeHtml(event.title)}</div>
                    <div class="event-desc">${escapeHtml(event.description || '')}</div>
                    <div class="event-meta">
                        <div>
                            <div class="price-tag">Ksh ${event.price.toFixed(2)}</div>
                            <div class="seats-info">${isSoldOut ? 'Sold Out' : `${event.available_seats} seats left`}</div>
                        </div>
                        <button class="btn btn-primary" onclick="openBookingModal(${event.id})" ${isSoldOut ? 'disabled' : ''}>
                            ${isSoldOut ? 'Sold Out' : 'Buy Tickets'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function handleCreateEvent(e) {
    e.preventDefault();

    const formData = new FormData(eventForm);
    const payload = Object.fromEntries(formData.entries());

    try {
        const res = await fetch(`${API_URL}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.message === 'success') {
            closeAllModals();
            fetchEvents();
        }
    } catch (err) {
        console.error('Error creating event:', err);
        alert('Failed to create event');
    }
}

function openBookingModal(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    currentEventForBooking = event;

    document.getElementById('bookingEventId').value = event.id;
    document.getElementById('bookingEventTitle').textContent = event.title;
    document.getElementById('bookingEventDate').textContent = new Date(event.date).toLocaleDateString();
    document.getElementById('bookingEventPrice').textContent = `${event.price} Ksh/ticket`;
    document.getElementById('quantity').max = event.available_seats;
    document.getElementById('quantity').value = 1;

    updateGrandTotal();
    bookingModal.classList.remove('hidden');
}

function updateGrandTotal() {
    if (!currentEventForBooking) return;
    const qty = document.getElementById('quantity').value;
    const total = (qty * currentEventForBooking.price).toFixed(2);
    document.getElementById('grandTotal').textContent = `${total} Ksh`;
}

async function handleBookTicket(e) {
    e.preventDefault();

    const formData = new FormData(bookingForm);
    const payload = Object.fromEntries(formData.entries());

    try {
        const res = await fetch(`${API_URL}/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.message === 'success') {
            // Show ticket confirmation modal
            showTicketConfirmation(data.data);
            bookingModal.classList.add('hidden');
            fetchEvents();
        } else {
            alert('Booking failed: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error booking ticket:', err);
        alert('Failed to process booking');
    }
}

function showTicketConfirmation(bookingData) {
    // Store booking data globally for manual download
    currentBookingData = bookingData;

    // Populate ticket details
    document.getElementById('ticketGuest').textContent = bookingData.guest_name;
    document.getElementById('ticketEvent').textContent = bookingData.event;
    document.getElementById('ticketSeats').textContent = bookingData.seats;
    document.getElementById('ticketTotal').textContent = bookingData.total.toFixed(2);
    document.getElementById('ticketCodeDisplay').textContent = bookingData.ticket_code;

    // Generate QR Code
    const qrContainer = document.querySelector('.qr-code-container');
    qrContainer.innerHTML = ''; // Clear previous QR code
    new QRCode(qrContainer, {
        text: bookingData.ticket_code,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });

    // Show modal
    ticketModal.classList.remove('hidden');

    // Auto-download ticket after a brief delay (to ensure QR code is rendered)
    setTimeout(() => {
        downloadTicket(bookingData);
    }, 500);
}

function downloadCurrentTicket() {
    if (currentBookingData) {
        downloadTicket(currentBookingData);
    }
}

function downloadTicket(bookingData) {
    // Create a downloadable ticket using canvas
    const ticketDisplay = document.querySelector('#ticketModal .ticket-display');

    // Use html2canvas if available, otherwise use a simple approach
    if (typeof html2canvas !== 'undefined') {
        html2canvas(ticketDisplay, {
            backgroundColor: '#ffffff',
            scale: 2
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `ticket-${bookingData.ticket_code}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    } else {
        // Fallback: Download QR code only
        const qrCanvas = qrContainer.querySelector('canvas');
        if (qrCanvas) {
            const link = document.createElement('a');
            link.download = `ticket-${bookingData.ticket_code}.png`;
            link.href = qrCanvas.toDataURL('image/png');
            link.click();
        }
    }
}

async function verifyTicket() {
    const code = document.getElementById('verifyInput').value.trim().toUpperCase();
    const resultDiv = document.getElementById('verifyResult');

    if (!code) {
        resultDiv.className = 'verify-result invalid';
        resultDiv.innerHTML = '⚠️ Please enter a ticket code';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/verify/${code}`);
        const data = await res.json();

        if (data.valid) {
            resultDiv.className = 'verify-result valid';
            resultDiv.innerHTML = `
                ✅ <strong>Valid Ticket</strong>
                <div class="verify-details">
                    <p><strong>Guest:</strong> ${escapeHtml(data.data.guest_name)}</p>
                    <p><strong>Event:</strong> ${escapeHtml(data.data.event_title)}</p>
                    <p><strong>Seats:</strong> ${data.data.quantity}</p>
                    <p><strong>Status:</strong> ${data.data.verified ? '✓ Already Verified' : '✓ First Scan'}</p>
                </div>
            `;
        } else {
            resultDiv.className = 'verify-result invalid';
            resultDiv.innerHTML = '❌ <strong>Invalid Ticket</strong><br>Ticket code not found in system';
        }
    } catch (err) {
        console.error('Verification error:', err);
        resultDiv.className = 'verify-result invalid';
        resultDiv.innerHTML = '⚠️ Verification failed. Please try again.';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
