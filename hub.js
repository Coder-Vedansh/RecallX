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

// --- State Variables ---
let currentEmail = null;
let currentName = null;
let generatedOtp = null;

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
    otpView.classList.add('hidden');
    loginView.classList.remove('hidden');
    authContainer.classList.remove('hidden');
});
