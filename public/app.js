const API_URL = '/api';

// Elements
const eventList = document.getElementById('eventList');
const adminBtn = document.getElementById('adminBtn');
const createEventModal = document.getElementById('createEventModal');
const bookingModal = document.getElementById('bookingModal');
const closeButtons = document.querySelectorAll('.close-modal, .close-modal-btn');
const overlay = document.querySelectorAll('.modal-overlay');

// Forms
const eventForm = document.getElementById('eventForm');
const bookingForm = document.getElementById('bookingForm');

// State
let events = [];
let currentEventForBooking = null;

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

    // Convert form to JSON object
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

    // payload: { event_id, guest_name, quantity }

    try {
        const res = await fetch(`${API_URL}/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.message === 'success') {
            alert(`Booking Confirmed! Order ID: #${data.data.booking_id}`);
            closeAllModals();
            fetchEvents();
        } else {
            alert('Booking failed: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error booking ticket:', err);
        alert('Failed to process booking');
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
