// --- DOM Elements: Layouts ---
const appRoot = document.getElementById('app-root');
const authContainer = document.getElementById('auth-container');
const loginView = document.getElementById('login-view');
const otpView = document.getElementById('otp-view');
const gameContainer = document.getElementById('game-container');
const leaderboardContainer = document.getElementById('leaderboard-container');
const emailModal = document.getElementById('email-modal');

// --- DOM Elements: Auth ---
const inputName = document.getElementById('player-name');
const inputEmail = document.getElementById('player-email');
const inputOtp = document.getElementById('player-otp');

const btnSendOtp = document.getElementById('btn-send-otp');
const btnVerifyOtp = document.getElementById('btn-verify-otp');
const btnBackLogin = document.getElementById('btn-back-login');
const otpDesc = document.getElementById('otp-desc');

// --- DOM Elements: Email Fake ---
const emailText = document.getElementById('email-text');
const btnCloseEmail = document.getElementById('btn-close-email');

// --- DOM Elements: Game ---
const greetingText = document.getElementById('greeting-text');
const levelText = document.getElementById('level-text');
const boardStatus = document.getElementById('board-status');
const gridBoard = document.getElementById('grid-board');
const failureCountUI = document.getElementById('failure-count');
const progressBar = document.getElementById('progress-bar');
const btnLogout = document.getElementById('btn-logout');
const btnViewLeaderboard = document.getElementById('btn-view-leaderboard');

// --- DOM Elements: Leaderboard ---
const leaderboardBody = document.getElementById('leaderboard-body');
const btnLbPlay = document.getElementById('btn-lb-play');
const btnLbLogout = document.getElementById('btn-lb-logout');

// --- State Variables ---
let currentEmail = null;
let currentName = null;
let generatedOtp = null;

const levelsConfig = [8, 14, 20, 26, 36];
let currentLevel = 0;
let sequence = [];
let currentStep = 0;
let isFlashing = false;
let tiles = [];
let failuresThisRun = 0;

// --- Auth Architecture (Mocked Local DB remains local for user auth since DB is leaderboard only) ---

function getDB() {
    return JSON.parse(localStorage.getItem('users_db') || '{}');
}

// --- GLOBAL DATABASE ARCHITECTURE (Vercel KV) ---

async function fetchGlobalLeaderboard() {
    try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        return data.leaderboard || [];
    } catch (e) {
        console.error("Failed to fetch global leaderboard:", e);
        return [];
    }
}

async function saveGlobalScore(email, name, levelsBeaten, failures) {
    try {
        await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, levelsBeaten, failures })
        });
    } catch (e) {
        console.error("Failed to save to global leaderboard:", e);
    }
}


// --- View Routers ---

async function showView(viewId) {
    authContainer.classList.add('hidden');
    gameContainer.classList.add('hidden');
    leaderboardContainer.classList.add('hidden');
    
    if(viewId === 'auth') {
        authContainer.classList.remove('hidden');
    } else if (viewId === 'game') {
        gameContainer.classList.remove('hidden');
    } else if (viewId === 'leaderboard') {
        leaderboardContainer.classList.remove('hidden');
        await renderLeaderboard();
    }
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
            body: JSON.stringify({
                email: currentEmail,
                name: currentName,
                otp: generatedOtp
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(`✅ Verification sent to ${currentEmail}!`);
        } else {
            console.error(data.error);
            if (data.error === 'MISSING_KEYS') {
                alert("⚠️ System Warning: Gmail API Keys not found in Vercel.\n\nFalling back to simulated view.");
            } else {
                alert(`⚠️ Delivery Failed.\nFalling back to simulated view.`);
            }
            emailText.innerText = `To: ${currentEmail}\nSubject: RecallX Code\n\nYour code is: ${generatedOtp}`;
            emailModal.classList.remove('hidden');
        }

    } catch (err) {
        emailText.innerText = `To: ${currentEmail}\nSubject: RecallX Code\n\nYour code is: ${generatedOtp}`;
        emailModal.classList.remove('hidden');
    }

    btnSendOtp.innerText = "Send OTP";
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
        localStorage.setItem('users_db', JSON.stringify(db));
    } else {
        currentName = db[currentEmail].name;
    }

    greetingText.innerText = `Agent ${currentName}`;
    inputOtp.value = '';
    
    showView('game');
    startFullGameSession();
});

async function logout() {
    if (currentEmail && currentLevel > 0) {
        await saveGlobalScore(currentEmail, currentName, currentLevel, failuresThisRun);
    }
    currentEmail = null;
    currentName = null;
    generatedOtp = null;
    
    otpView.classList.add('hidden');
    loginView.classList.remove('hidden');
    showView('auth');
}

btnLogout.addEventListener('click', logout);
btnLbLogout.addEventListener('click', logout);

btnViewLeaderboard.addEventListener('click', async () => {
    btnViewLeaderboard.innerText = "Syncing...";
    await saveGlobalScore(currentEmail, currentName, currentLevel, failuresThisRun);
    btnViewLeaderboard.innerText = "Leaderboard";
    showView('leaderboard');
});
btnLbPlay.addEventListener('click', () => {
    showView('game');
    startFullGameSession();
});

// --- Game Sequence Logic ---

function startFullGameSession() {
    currentLevel = 0;
    failuresThisRun = 0;
    updateStatusText();
    startLevelSequence();
}

function updateStatusText() {
    failureCountUI.innerText = failuresThisRun;
    levelText.innerText = `LEVEL ${currentLevel + 1}`;
}

function startLevelSequence() {
    if (currentLevel >= levelsConfig.length) {
        boardStatus.innerText = "SYSTEM MASTERED!";
        boardStatus.style.color = "#10b981";
        progressBar.style.width = "100%";
        setTimeout(async () => {
            alert(`🎉 Incredible! You beat all phases with ${failuresThisRun} mistakes!`);
            await saveGlobalScore(currentEmail, currentName, 5, failuresThisRun);
            showView('leaderboard');
        }, 1000);
        return;
    }

    updateStatusText();
    const numCards = levelsConfig[currentLevel];
    
    gridBoard.innerHTML = '';
    tiles = [];
    const cols = numCards <= 8 ? 4 : (numCards <= 20 ? 5 : 6);
    gridBoard.style.gridTemplateColumns = `repeat(${cols}, minmax(40px, 1fr))`;
    
    for (let i = 0; i < numCards; i++) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.addEventListener('click', () => handleTileClick(i));
        gridBoard.appendChild(tile);
        tiles.push(tile);
    }
    
    const sequenceLength = currentLevel + 4; 
    sequence = [];
    for (let i = 0; i < sequenceLength; i++) {
        sequence.push(Math.floor(Math.random() * numCards));
    }
    
    currentStep = 0;
    isFlashing = true;
    progressBar.style.width = "0%";
    
    boardStatus.innerText = "Memorize Pattern...";
    boardStatus.style.color = "#fcd34d";
    
    setTimeout(playSequence, 1500);
}

function playSequence() {
    let index = 0;
    const interval = setInterval(() => {
        if (index >= sequence.length) {
            clearInterval(interval);
            setTimeout(() => {
                isFlashing = false;
                boardStatus.innerText = "Awaiting Input...";
                boardStatus.style.color = "#60a5fa";
            }, 300);
            return;
        }

        const targetIndex = sequence[index];
        const tile = tiles[targetIndex];
        
        tile.classList.add('highlight');
        setTimeout(() => tile.classList.remove('highlight'), 350); 
        
        index++;
    }, 850); 
}

function handleTileClick(index) {
    if (isFlashing) return;
    
    const expectedIndex = sequence[currentStep];
    const tile = tiles[index];

    if (index === expectedIndex) {
        tile.classList.add('success');
        setTimeout(() => tile.classList.remove('success'), 200);
        
        currentStep++;
        progressBar.style.width = `${(currentStep / sequence.length) * 100}%`;
        
        if (currentStep === sequence.length) {
            isFlashing = true;
            boardStatus.innerText = "Access Granted";
            boardStatus.style.color = "#10b981";
            setTimeout(() => {
                currentLevel++;
                startLevelSequence();
            }, 1000);
        }
    } else {
        isFlashing = true; 
        failuresThisRun++;
        updateStatusText();
        
        tile.classList.add('error');
        tiles[expectedIndex].classList.add('highlight'); 
        
        boardStatus.innerText = "Critical Fault Detect";
        boardStatus.style.color = "#ef4444";
        progressBar.style.background = "#ef4444";
        
        setTimeout(() => {
            progressBar.style.background = "var(--primary)";
            startLevelSequence(); 
        }, 1500);
    }
}

// --- Leaderboard Logic ---
async function renderLeaderboard() {
    // Show Loading state explicitly
    leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Fetching Global Ranks...</td></tr>';
    
    const lb = await fetchGlobalLeaderboard();
    leaderboardBody.innerHTML = '';
    
    if (lb.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Global Database empty. Be the first!</td></tr>';
        return;
    }
    
    lb.forEach((entry, i) => {
        const tr = document.createElement('tr');
        
        let rankColor = i === 0 ? '#fbbf24' : (i === 1 ? '#94a3b8' : (i === 2 ? '#b45309' : 'var(--text-muted)'));
        
        // Obfuscate email
        const parts = entry.email.split('@');
        let displayEmail = entry.email;
        if (parts.length === 2 && parts[0].length > 3) {
            displayEmail = parts[0].substring(0, 3) + '***@' + parts[1];
        } else if (parts.length === 2) {
            displayEmail = '***@' + parts[1];
        }
            
        tr.innerHTML = `
            <td style="color: ${rankColor}; font-weight:800; font-size:1.1rem;">#${i+1}</td>
            <td style="font-weight:600;">${entry.name} <br> <span style="font-size:0.75rem; color:var(--text-muted)">${displayEmail}</span></td>
            <td>Level ${entry.levelsBeaten}</td>
            <td><span style="color:var(--error); font-weight:600;">${entry.failures}</span> misses</td>
        `;
        leaderboardBody.appendChild(tr);
    });
}
