// --- DOM Elements: Layouts ---
const appRoot = document.getElementById('app-root');
const authContainer = document.getElementById('auth-container');
const loginView = document.getElementById('login-view');
const otpView = document.getElementById('otp-view');
const gameContainer = document.getElementById('game-container');
const leaderboardContainer = document.getElementById('leaderboard-container');
const smsModal = document.getElementById('sms-modal');

// --- DOM Elements: Auth ---
const inputName = document.getElementById('player-name');
const inputPhone = document.getElementById('player-phone');
const inputOtp = document.getElementById('player-otp');

const btnSendOtp = document.getElementById('btn-send-otp');
const btnVerifyOtp = document.getElementById('btn-verify-otp');
const btnBackLogin = document.getElementById('btn-back-login');
const otpDesc = document.getElementById('otp-desc');

// --- DOM Elements: SMS ---
const smsText = document.getElementById('sms-text');
const btnCloseSms = document.getElementById('btn-close-sms');

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
let currentPhone = null;
let currentName = null;
let generatedOtp = null;

const levelsConfig = [8, 14, 20, 26, 36];
let currentLevel = 0;
let sequence = [];
let currentStep = 0;
let isFlashing = false;
let tiles = [];
let failuresThisRun = 0;

// --- Auth Architecture (Mocked Local DB) ---

function getDB() {
    return JSON.parse(localStorage.getItem('users_db') || '{}');
}

function getLeaderboard() {
    return JSON.parse(localStorage.getItem('leaderboard_db') || '[]');
}

function saveScore(phone, name, levelsBeaten, failures) {
    let lb = getLeaderboard();
    lb.push({ phone, name, levelsBeaten, failures, date: new Date().toISOString() });
    
    // Sort logic
    lb.sort((a, b) => {
        if (b.levelsBeaten !== a.levelsBeaten) {
            return b.levelsBeaten - a.levelsBeaten;
        }
        return a.failures - b.failures;
    });

    localStorage.setItem('leaderboard_db', JSON.stringify(lb));
}

// --- View Routers ---

function showView(viewId) {
    authContainer.classList.add('hidden');
    gameContainer.classList.add('hidden');
    leaderboardContainer.classList.add('hidden');
    
    if(viewId === 'auth') {
        authContainer.classList.remove('hidden');
    } else if (viewId === 'game') {
        gameContainer.classList.remove('hidden');
    } else if (viewId === 'leaderboard') {
        leaderboardContainer.classList.remove('hidden');
        renderLeaderboard();
    }
}

// --- Auth Mechanics ---

btnSendOtp.addEventListener('click', async () => {
    const name = inputName.value.trim();
    const phone = inputPhone.value.trim();
    
    if (!name || !phone) {
        alert("Please provide both Name and Phone number.");
        return;
    }

    currentName = name;
    currentPhone = phone;

    // Simulate OTP server side generation
    generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Update button visually while connecting
    btnSendOtp.innerText = "Dispatching SMS...";
    btnSendOtp.disabled = true;

    try {
        const response = await fetch('/api/send_sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: currentPhone,
                name: currentName,
                otp: generatedOtp
            })
        });

        const data = await response.json();

        if (data.success) {
            alert("✅ SMS Message dispatched to your phone via Twilio!");
        } else {
            console.error("Twilio Gateway Warning:", data.error);
            if (data.error === 'MISSING_KEYS') {
                alert("⚠️ System Warning: Twilio API Keys are not configured in Vercel.\n\nFalling back to simulated SMS Mode.");
            } else {
                alert(`⚠️ SMS Delivery Failed (${data.error}).\nFalling back to simulated SMS mode.`);
            }
            // Trigger emergency fallback modal since texts won't arrive
            smsText.innerText = `Alert for ${currentName}:\n\nYour RecallX Pro security code is: ${generatedOtp}\n\nDo not share this with anyone.`;
            smsModal.classList.remove('hidden');
        }

    } catch (err) {
        console.error("Network error hitting /api: ", err);
        alert("⚠️ Vercel /api endpoint unreachable. Are you testing this locally without Vercel CLI? Falling back to simulated SMS.");
        smsText.innerText = `Alert for ${currentName}:\n\nYour RecallX Pro security code is: ${generatedOtp}\n\nDo not share this with anyone.`;
        smsModal.classList.remove('hidden');
    }

    // Reset button
    btnSendOtp.innerText = "Send OTP";
    btnSendOtp.disabled = false;

    // Route view
    loginView.classList.add('hidden');
    otpView.classList.remove('hidden');
    otpDesc.innerText = `Enter the 4-digit code sent to ${currentPhone}.`;
});

btnCloseSms.addEventListener('click', () => {
    smsModal.classList.add('hidden');
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

    // Authenticate
    let db = getDB();
    if (!db[currentPhone]) {
        db[currentPhone] = { name: currentName };
        localStorage.setItem('users_db', JSON.stringify(db));
    } else {
        // If they logged in before, fetch their real name registered with this phone
        currentName = db[currentPhone].name;
    }

    greetingText.innerText = `Agent ${currentName}`;
    inputOtp.value = '';
    
    showView('game');
    startFullGameSession();
});


function logout() {
    if (currentPhone && currentLevel > 0) {
        saveScore(currentPhone, currentName, currentLevel, failuresThisRun);
    }
    currentPhone = null;
    currentName = null;
    generatedOtp = null;
    
    otpView.classList.add('hidden');
    loginView.classList.remove('hidden');
    showView('auth');
}

btnLogout.addEventListener('click', logout);
btnLbLogout.addEventListener('click', logout);

btnViewLeaderboard.addEventListener('click', () => {
    saveScore(currentPhone, currentName, currentLevel, failuresThisRun);
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
        setTimeout(() => {
            alert(`🎉 Incredible! You beat all 5 phases with only ${failuresThisRun} mistakes!`);
            saveScore(currentPhone, currentName, 5, failuresThisRun);
            showView('leaderboard');
        }, 1000);
        return;
    }

    updateStatusText();
    const numCards = levelsConfig[currentLevel];
    
    // Grid Generation
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
    
    // Sequence Generation
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
function renderLeaderboard() {
    const lb = getLeaderboard();
    leaderboardBody.innerHTML = '';
    
    if (lb.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No data found. Be the first!</td></tr>';
        return;
    }

    const topRuns = lb.slice(0, 10);
    
    topRuns.forEach((entry, i) => {
        const tr = document.createElement('tr');
        
        let rankColor = i === 0 ? '#fbbf24' : (i === 1 ? '#94a3b8' : (i === 2 ? '#b45309' : 'var(--text-muted)'));
        
        // Obfuscate phone slightly for privacy on leaderboard 
        const displayPhone = entry.phone.length >= 4 
            ? '****' + entry.phone.slice(-4) 
            : entry.phone;
            
        tr.innerHTML = `
            <td style="color: ${rankColor}; font-weight:800; font-size:1.1rem;">#${i+1}</td>
            <td style="font-weight:600;">${entry.name} <br> <span style="font-size:0.75rem; color:var(--text-muted)">${displayPhone}</span></td>
            <td>Level ${entry.levelsBeaten}</td>
            <td><span style="color:var(--error); font-weight:600;">${entry.failures}</span> misses</td>
        `;
        leaderboardBody.appendChild(tr);
    });
}
