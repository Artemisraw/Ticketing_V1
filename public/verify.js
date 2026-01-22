const API_URL = '/api';

let verificationHistory = [];

// Auto-focus input
document.getElementById('verifyInput').focus();

// Enter key to verify
document.getElementById('verifyInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        verifyTicket();
    }
});

async function verifyTicket() {
    const code = document.getElementById('verifyInput').value.trim().toUpperCase();
    const resultDiv = document.getElementById('verifyResult');

    if (!code) {
        resultDiv.className = 'verify-result-large invalid';
        resultDiv.innerHTML = '<h3>⚠️ Please enter a ticket code</h3>';
        return;
    }

    resultDiv.innerHTML = '<h3>Verifying...</h3>';
    resultDiv.className = 'verify-result-large';

    try {
        const res = await fetch(`${API_URL}/verify/${code}`);
        const data = await res.json();

        if (data.valid) {
            resultDiv.className = 'verify-result-large valid';
            resultDiv.innerHTML = `
                <div class="verify-success">
                    <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h2>✅ VALID TICKET</h2>
                </div>
                <div class="verify-details-large">
                    <div class="detail-row">
                        <strong>Guest:</strong> <span>${escapeHtml(data.data.guest_name)}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Event:</strong> <span>${escapeHtml(data.data.event_title)}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Seats:</strong> <span>${data.data.quantity}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Status:</strong> <span>${data.data.verified ? '⚠️ Already Scanned' : '✓ First Scan - ADMIT'}</span>
                    </div>
                </div>
            `;

            // Add to history
            addToHistory({
                code: code,
                guest: data.data.guest_name,
                event: data.data.event_title,
                valid: true,
                time: new Date()
            });

        } else {
            resultDiv.className = 'verify-result-large invalid';
            resultDiv.innerHTML = `
                <div class="verify-error">
                    <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h2>❌ INVALID TICKET</h2>
                    <p>Ticket code not found in system</p>
                </div>
            `;

            addToHistory({
                code: code,
                valid: false,
                time: new Date()
            });
        }

        // Clear input for next scan
        document.getElementById('verifyInput').value = '';
        document.getElementById('verifyInput').focus();

    } catch (err) {
        console.error('Verification error:', err);
        resultDiv.className = 'verify-result-large invalid';
        resultDiv.innerHTML = '<h3>⚠️ Verification failed. Please try again.</h3>';
    }
}

function addToHistory(entry) {
    verificationHistory.unshift(entry);
    if (verificationHistory.length > 10) {
        verificationHistory = verificationHistory.slice(0, 10);
    }
    renderHistory();
}

function renderHistory() {
    const historyDiv = document.getElementById('recentVerifications');

    if (verificationHistory.length === 0) {
        historyDiv.innerHTML = '<p class="empty-state">No verifications yet</p>';
        return;
    }

    historyDiv.innerHTML = verificationHistory.map(entry => {
        const timeStr = entry.time.toLocaleTimeString();
        if (entry.valid) {
            return `
                <div class="history-item valid">
                    <div class="history-time">${timeStr}</div>
                    <div class="history-code">${entry.code}</div>
                    <div class="history-details">${escapeHtml(entry.guest)} - ${escapeHtml(entry.event)}</div>
                    <div class="history-status">✅ Valid</div>
                </div>
            `;
        } else {
            return `
                <div class="history-item invalid">
                    <div class="history-time">${timeStr}</div>
                    <div class="history-code">${entry.code}</div>
                    <div class="history-details">Invalid ticket</div>
                    <div class="history-status">❌ Invalid</div>
                </div>
            `;
        }
    }).join('');
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
