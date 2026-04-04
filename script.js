// --- DOM Elements: Layouts ---
const appRoot = document.getElementById('app-root');
const authContainer = document.getElementById('auth-container');
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const gameContainer = document.getElementById('game-container');
const leaderboardContainer = document.getElementById('leaderboard-container');

// --- DOM Elements: Auth ---
const loginUser = document.getElementById('login-username');
const loginPass = document.getElementById('login-password');
const btnLogin = document.getElementById('btn-login');

const regUser = document.getElementById('reg-username');
const regPass = document.getElementById('reg-password');
const btnRegister = document.getElementById('btn-register');

const linkRegister = document.getElementById('link-register');
const linkLogin = document.getElementById('link-login');
const authSubtitle = document.getElementById('auth-subtitle');

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
let currentUser = null;
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

function saveScore(username, levelsBeaten, failures) {
    let lb = getLeaderboard();
    lb.push({ username, levelsBeaten, failures, date: new Date().toISOString() });
    
    // Sort logic: Higher levels beaten is better. If tied, fewer failures is better.
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

// Auth Routing
linkRegister.addEventListener('click', () => {
    loginView.classList.add('hidden');
    registerView.classList.remove('hidden');
    authSubtitle.innerText = "Create your profile.";
});

linkLogin.addEventListener('click', () => {
    registerView.classList.add('hidden');
    loginView.classList.remove('hidden');
    authSubtitle.innerText = "Welcome back! Please login.";
});

// --- Auth Mechanics ---

btnRegister.addEventListener('click', () => {
    const user = regUser.value.trim();
    const pass = regPass.value.trim();
    
    if (!user || pass.length < 4) {
        alert("Username required and password must be at least 4 characters.");
        return;
    }

    let db = getDB();
    if (db[user]) {
        alert("Username already exists!");
        return;
    }

    db[user] = { password: pass }; // Storing normally (mock backend)
    localStorage.setItem('users_db', JSON.stringify(db));
    
    alert("Profile created! Logging you in.");
    doLogin(user);
});

btnLogin.addEventListener('click', () => {
    const user = loginUser.value.trim();
    const pass = loginPass.value.trim();
    
    if (!user || !pass) return;

    let db = getDB();
    if (!db[user]) {
        alert("Account not found.");
        return;
    }
    
    if (db[user].password !== pass) {
        alert("Invalid Password!");
        return;
    }
    
    doLogin(user);
});

function doLogin(username) {
    currentUser = username;
    greetingText.innerText = `Agent ${currentUser}`;
    
    // Clear inputs safely
    loginUser.value = ''; loginPass.value = '';
    regUser.value = ''; regPass.value = '';
    
    showView('game');
    startFullGameSession();
}

function logout() {
    // If they were mid-game, record their run to leaderboard!
    if (currentUser && currentLevel > 0) {
        saveScore(currentUser, currentLevel, failuresThisRun);
    }
    currentUser = null;
    showView('auth');
}

btnLogout.addEventListener('click', logout);
btnLbLogout.addEventListener('click', logout);

btnViewLeaderboard.addEventListener('click', () => {
    saveScore(currentUser, currentLevel, failuresThisRun);
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
            saveScore(currentUser, 5, failuresThisRun);
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
    boardStatus.style.color = "#fcd34d"; // Yellow warning
    
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
                boardStatus.style.color = "#60a5fa"; // Blue info
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
        // Correct Action
        tile.classList.add('success');
        setTimeout(() => tile.classList.remove('success'), 200);
        
        currentStep++;
        progressBar.style.width = `${(currentStep / sequence.length) * 100}%`;
        
        if (currentStep === sequence.length) {
            isFlashing = true;
            boardStatus.innerText = "Access Granted";
            boardStatus.style.color = "#10b981"; // Green success
            setTimeout(() => {
                currentLevel++;
                startLevelSequence();
            }, 1000);
        }
    } else {
        // Wrong Action
        isFlashing = true; 
        failuresThisRun++;
        updateStatusText();
        
        tile.classList.add('error');
        tiles[expectedIndex].classList.add('highlight'); 
        
        boardStatus.innerText = "Critical Fault Detect";
        boardStatus.style.color = "#ef4444"; // Red error
        progressBar.style.background = "#ef4444";
        
        setTimeout(() => {
            progressBar.style.background = "var(--primary)";
            startLevelSequence(); // Re-roll sequence for same level
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

    // Capture Top 10 max
    const topRuns = lb.slice(0, 10);
    
    topRuns.forEach((entry, i) => {
        const tr = document.createElement('tr');
        
        // Highlight first place gold
        let rankColor = i === 0 ? '#fbbf24' : (i === 1 ? '#94a3b8' : (i === 2 ? '#b45309' : 'var(--text-muted)'));
        
        tr.innerHTML = `
            <td style="color: ${rankColor}; font-weight:800; font-size:1.1rem;">#${i+1}</td>
            <td style="font-weight:600;">${entry.username}</td>
            <td>Level ${entry.levelsBeaten}</td>
            <td><span style="color:var(--error); font-weight:600;">${entry.failures}</span> misses</td>
        `;
        leaderboardBody.appendChild(tr);
    });
}
