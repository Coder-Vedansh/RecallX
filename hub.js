// --- DOM Elements: Auth ---
const authContainer = document.getElementById('auth-container');
const loginView = document.getElementById('login-view');
const otpView = document.getElementById('otp-view');
const inputName = document.getElementById('player-name');
const inputEmail = document.getElementById('player-email');
const inputOtp = document.getElementById('player-otp');

const btnSendOtp = document.getElementById('btn-send-otp');
const btnVerifyOtp = document.getElementById('btn-verify-otp');
const btnBackLogin = document.getElementById('btn-back-login');
const otpDesc = document.getElementById('otp-desc');

// --- DOM Elements: Email Fake ---
const emailModal = document.getElementById('email-modal');
const emailText = document.getElementById('email-text');
const btnCloseEmail = document.getElementById('btn-close-email');

// --- DOM Elements: Hub ---
const hubContainer = document.getElementById('hub-container');
const greetingText = document.getElementById('greeting-text');
const btnLogout = document.getElementById('btn-logout');

// --- DOM Elements: Master Leaderboard ---
const btnHubLeaderboard = document.getElementById('btn-hub-leaderboard');
const masterLeaderboardContainer = document.getElementById('master-leaderboard-container');
const btnLbBackHub = document.getElementById('btn-lb-back-hub');
const lbTabs = document.querySelectorAll('.lb-tab');
const masterTableHead = document.getElementById('master-table-head');
const masterLeaderboardBody = document.getElementById('master-leaderboard-body');


// --- State Variables ---
let currentEmail = null;
let currentName = null;
let generatedOtp = null;
let activeMasterTab = 'sequence'; // Default tab

// Initialize check for returning users (cross-window via sessionStorage)
window.onload = () => {
    let session = JSON.parse(sessionStorage.getItem('active_player') || 'null');
    if (session && session.email) {
        currentEmail = session.email;
        currentName = session.name;
        showHub();
    }
};

function getDB() {
    return JSON.parse(sessionStorage.getItem('users_db') || '{}');
}

function showHub() {
    authContainer.classList.add('hidden');
    masterLeaderboardContainer.classList.add('hidden');
    hubContainer.classList.remove('hidden');
    greetingText.innerText = `Agent ${currentName}`;
    
    // Save to active session so other windows know who is logged in
    sessionStorage.setItem('active_player', JSON.stringify({ email: currentEmail, name: currentName }));
}

// --- Auth Mechanics ---

btnSendOtp.addEventListener('click', async () => {
    const name = inputName.value.trim();
    const email = inputEmail.value.trim();
    
    if (!name || !email) {
        alert("Please provide both Name and Email address.");
        return;
    }

    currentName = name;
    currentEmail = email;

    generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

    btnSendOtp.innerText = "Dispatching Email...";
    btnSendOtp.disabled = true;

    try {
        const response = await fetch('/api/send_email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentEmail, name: currentName, otp: generatedOtp })
        });
        const data = await response.json();

        if (data.success) {
            alert(`✅ Verification sent to ${currentEmail}!`);
        } else {
            console.error(data.error);
            emailText.innerText = `To: ${currentEmail}\nSubject: RecallX Code\n\nYour code is: ${generatedOtp}`;
            emailModal.classList.remove('hidden');
        }
    } catch (err) {
        emailText.innerText = `To: ${currentEmail}\nSubject: RecallX Code\n\nYour code is: ${generatedOtp}`;
        emailModal.classList.remove('hidden');
    }

    btnSendOtp.innerText = "Authenticate";
    btnSendOtp.disabled = false;

    loginView.classList.add('hidden');
    otpView.classList.remove('hidden');
    otpDesc.innerText = `Enter the code sent to ${currentEmail}.`;
});

btnCloseEmail.addEventListener('click', () => {
    emailModal.classList.add('hidden');
});

btnBackLogin.addEventListener('click', () => {
    otpView.classList.add('hidden');
    loginView.classList.remove('hidden');
    inputOtp.value = '';
});

btnVerifyOtp.addEventListener('click', () => {
    const otp = inputOtp.value.trim();
    if (!otp) return;

    if (otp !== generatedOtp) {
        alert("Invalid Security Code! Please try again.");
        return;
    }

    let db = getDB();
    if (!db[currentEmail]) {
        db[currentEmail] = { name: currentName };
        sessionStorage.setItem('users_db', JSON.stringify(db));
    } else {
        currentName = db[currentEmail].name;
    }

    inputOtp.value = '';
    showHub();
});

btnLogout.addEventListener('click', () => {
    currentEmail = null;
    currentName = null;
    generatedOtp = null;
    sessionStorage.removeItem('active_player');
    
    hubContainer.classList.add('hidden');
    masterLeaderboardContainer.classList.add('hidden');
    otpView.classList.add('hidden');
    loginView.classList.remove('hidden');
    authContainer.classList.remove('hidden');
});


// --- MASTER LEADERBOARD LOGIC ---

btnHubLeaderboard.addEventListener('click', () => {
    hubContainer.classList.add('hidden');
    masterLeaderboardContainer.classList.remove('hidden');
    fetchAndRenderMasterLB(activeMasterTab);
});

btnLbBackHub.addEventListener('click', showHub);

lbTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Toggle Active CSS Class
        lbTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Fetch new game
        activeMasterTab = tab.getAttribute('data-game');
        fetchAndRenderMasterLB(activeMasterTab);
    });
});

async function fetchAndRenderMasterLB(gameType) {
    masterLeaderboardBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">Establishing connection to ${gameType.toUpperCase()} Mainframe...</td></tr>`;
    
    // Adjust headers based on game metric semantics
    if (gameType === 'sequence') {
        masterTableHead.innerHTML = `<th>Rank</th><th>Player (Email)</th><th>Levels Beaten</th><th>Failures</th>`;
    } else if (gameType === 'number') {
        masterTableHead.innerHTML = `<th>Rank</th><th>Player (Email)</th><th>Digits Saved</th><th>Errors</th>`;
    } else if (gameType === 'reaction') {
        masterTableHead.innerHTML = `<th>Rank</th><th>Player (Email)</th><th colspan="2">Reflex Time (MS)</th>`;
    } else if (gameType === 'puzzle') {
        masterTableHead.innerHTML = `<th>Rank</th><th>Player (Email)</th><th colspan="2">Moves Taken</th>`;
    }

    try {
        const res = await fetch(`/api/leaderboard?game=${gameType}`);
        const data = await res.json();
        const lb = data.leaderboard || [];
        
        masterLeaderboardBody.innerHTML = '';
        
        if (lb.length === 0) {
            masterLeaderboardBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Global Database for ${gameType} is completely empty.</td></tr>`;
            return;
        }

        lb.forEach((entry, i) => {
            const tr = document.createElement('tr');
            let rankColor = i === 0 ? '#fbbf24' : (i === 1 ? '#94a3b8' : (i === 2 ? '#b45309' : 'var(--text-muted)'));
            
            // Obfuscate
            const parts = entry.email.split('@');
            let displayEmail = entry.email;
            if (parts.length === 2 && parts[0].length > 3) {
                displayEmail = parts[0].substring(0, 3) + '***@' + parts[1];
            } else if (parts.length === 2) {
                displayEmail = '***@' + parts[1];
            }
            
            let statsHtml = '';
            // Render columns specific to game type
            if (gameType === 'sequence') {
                statsHtml = `<td>Level ${entry.levelsBeaten}</td><td><span style="color:var(--error); font-weight:600;">${entry.failures}</span> misses</td>`;
            } else if (gameType === 'number') {
                statsHtml = `<td>${entry.levelsBeaten} digits</td><td><span style="color:var(--error); font-weight:600;">${entry.failures}</span> mistakes</td>`;
            } else if (gameType === 'reaction') {
                statsHtml = `<td colspan="2"><span style="color:var(--primary); font-weight:800;">${entry.failures}</span> ms</td>`;
            } else if (gameType === 'puzzle') {
                statsHtml = `<td colspan="2"><span style="color:var(--primary); font-weight:800;">${entry.failures}</span> total moves</td>`;
            }

            tr.innerHTML = `
                <td style="color: ${rankColor}; font-weight:800; font-size:1.1rem;">#${i+1}</td>
                <td style="font-weight:600;">${entry.name} <br> <span style="font-size:0.75rem; color:var(--text-muted)">${displayEmail}</span></td>
                ${statsHtml}
            `;
            masterLeaderboardBody.appendChild(tr);
        });

    } catch (err) {
        masterLeaderboardBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: #ef4444;">Network Error. Failed to fetch High Scores.</td></tr>`;
    }
}
