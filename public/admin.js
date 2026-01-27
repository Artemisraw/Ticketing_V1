const API_URL = '/api';

// Auth Check
if (!localStorage.getItem('adminToken')) {
    window.location.href = 'login.html';
}

function getAuthHeader() {
    return { 'Authorization': localStorage.getItem('adminToken') };
}

// Elements
const eventModal = document.getElementById('eventModal');
const bookingsModal = document.getElementById('bookingsModal');
const eventForm = document.getElementById('eventForm');
const eventTableBody = document.getElementById('eventTableBody');
const closeButtons = document.querySelectorAll('.close-modal, .close-modal-btn');
const overlays = document.querySelectorAll('.modal-overlay');

let events = [];
let editingEventId = null;

// Initial Load
fetchStats();
fetchEvents();

// Event Listeners
closeButtons.forEach(btn => btn.addEventListener('click', closeAllModals));
overlays.forEach(ov => ov.addEventListener('click', closeAllModals));
eventForm.addEventListener('submit', handleSubmitEvent);
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    window.location.href = 'login.html';
});
function closeAllModals() {
    eventModal.classList.add('hidden');
    bookingsModal.classList.add('hidden');
    eventForm.reset();
    editingEventId = null;
    document.getElementById('modalTitle').textContent = 'Schedule New Event';
    document.getElementById('submitBtn').textContent = 'Publish Event';
}

// ============ STATS ============
async function fetchStats() {
    try {
        const res = await fetch(`${API_URL}/stats`, {
            headers: getAuthHeader()
        });
        const data = await res.json();
        if (data.message === 'success') {
            renderStats(data.data);
        } else if (res.status === 401) {
            window.location.href = 'login.html';
        }
    } catch (err) {
        console.error('Error fetching stats:', err);
    }
}

function renderStats(stats) {
    document.getElementById('statRevenue').textContent = `Ksh ${stats.total_revenue.toLocaleString()}`;
    document.getElementById('statTodayTickets').textContent = stats.today_tickets;
    document.getElementById('statEvents').textContent = stats.total_events;
    document.getElementById('statPopular').textContent = stats.popular_event || '-';
}

// ============ EVENTS ============
async function fetchEvents() {
    try {
        const res = await fetch(`${API_URL}/events`);
        const data = await res.json();
        if (data.message === 'success') {
            events = data.data;
            renderEventsTable();
        }
    } catch (err) {
        console.error('Error fetching events:', err);
        eventTableBody.innerHTML = '<tr><td colspan="6">Failed to load events.</td></tr>';
    }
}

function renderEventsTable() {
    if (events.length === 0) {
        eventTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 3rem; font-weight: 800; color: var(--text-muted);">NO SHOWS SCHEDULED YET</td></tr>';
        return;
    }

    eventTableBody.innerHTML = events.map(event => {
        const dateObj = new Date(event.date);
        const dateStr = dateObj.toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const sold = event.total_seats - event.available_seats;
        const percentSold = ((sold / event.total_seats) * 100).toFixed(0);

        return `
            <tr>
                <td>
                    <div style="font-weight:900; font-size:1.1rem; text-transform:uppercase;">${escapeHtml(event.title)}</div>
                    ${event.description ? `<div style="font-size:0.8rem; color:var(--text-muted); text-transform:none;">${escapeHtml(event.description).substring(0, 50)}...</div>` : ''}
                </td>
                <td style="font-weight:700; color:var(--text-muted); font-size:0.85rem;">${dateStr}</td>
                <td>
                    <div class="sold-info">
                        <span style="font-weight:800; font-size:0.8rem;">${sold} / ${event.total_seats} SOLD</span>
                        <div class="progress-bar"><div class="progress-fill" style="width:${percentSold}%"></div></div>
                    </div>
                </td>
                <td style="font-weight:900; font-size:1.1rem;">Ksh ${event.price.toFixed(0)}</td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="viewBookings(${event.id}, '${escapeHtml(event.title)}')" title="View Bookings">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                    <button class="btn-icon" onclick="openEditModal(${event.id})" title="Edit Show">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button class="btn-icon" onclick="deleteEvent(${event.id})" title="Delete Show" style="color:var(--primary);">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ============ CREATE / EDIT ============
function openCreateModal() {
    editingEventId = null;
    document.getElementById('modalTitle').textContent = 'Schedule New Show';
    document.getElementById('submitBtn').textContent = 'Publish Show';
    eventForm.reset();
    document.getElementById('eventId').value = '';
    document.getElementById('eventImage').value = '';
    eventModal.classList.remove('hidden');
}

function openEditModal(id) {
    const event = events.find(e => e.id === id);
    if (!event) return;

    editingEventId = id;
    document.getElementById('modalTitle').textContent = 'Edit Show';
    document.getElementById('submitBtn').textContent = 'Save Changes';

    // Populate form
    document.getElementById('eventId').value = id;
    document.getElementById('title').value = event.title;
    document.getElementById('description').value = event.description || '';
    document.getElementById('price').value = event.price;
    document.getElementById('total_seats').value = event.total_seats;
    document.getElementById('eventImage').value = ''; // Reset file input

    // Format date for input
    const dateObj = new Date(event.date);
    // Correctly handle timezone offset for datetime-local input
    const offset = dateObj.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dateObj - offset)).toISOString().slice(0, 16);
    document.getElementById('date').value = localISOTime;

    eventModal.classList.remove('hidden');
}

async function handleSubmitEvent(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';

    const formData = new FormData(eventForm);
    // The backend expects key 'image' for file (name="image" in HTML)
    // and other fields match name attributes.

    try {
        const url = editingEventId ? `${API_URL}/events/${editingEventId}` : `${API_URL}/events`;
        const method = editingEventId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: getAuthHeader(),
            body: formData
        });

        const data = await res.json();
        if (data.message === 'success') {
            closeAllModals();
            fetchEvents();
            fetchStats();
        } else {
            alert('Error: ' + (data.error || 'Unknown'));
        }
    } catch (err) {
        console.error('Error saving event:', err);
        alert('Failed to save event');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText; // Restore text
    }
}

async function deleteEvent(id) {
    if (!confirm('Delete this event? This cannot be undone.')) return;

    try {
        const res = await fetch(`${API_URL}/events/${id}`, {
            method: 'DELETE',
            headers: getAuthHeader()
        });
        const data = await res.json();
        if (data.message === 'deleted') {
            fetchEvents();
            fetchStats();
        }
    } catch (err) {
        console.error('Error deleting:', err);
    }
}

// ============ BOOKINGS ============
async function viewBookings(id, title) {
    document.getElementById('bookingsEventTitle').textContent = title;

    try {
        const res = await fetch(`${API_URL}/events/${id}/bookings`, {
            headers: getAuthHeader()
        });
        const data = await res.json();

        if (data.message === 'success' && data.data.length > 0) {
            document.getElementById('bookingsList').innerHTML = `
                <table class="bookings-table">
                    <thead>
                        <tr><th>Guest</th><th>Contact</th><th>Tickets</th><th>Total</th><th>Code</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                        ${data.data.map(b => `
                            <tr>
                                <td>${escapeHtml(b.guest_name)}</td>
                                <td>
                                    <div class="contact-info">${escapeHtml(b.email)}</div>
                                    <div class="contact-info">${escapeHtml(b.phone_number)}</div>
                                </td>
                                <td>${b.quantity}</td>
                                <td>Ksh ${b.total_price.toFixed(2)}</td>
                                <td><code>${b.ticket_code}</code></td>
                                <td>${new Date(b.booking_date).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            document.getElementById('bookingsList').innerHTML = '<p class="empty-state">No bookings yet</p>';
        }

        bookingsModal.classList.remove('hidden');
    } catch (err) {
        console.error('Error fetching bookings:', err);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
