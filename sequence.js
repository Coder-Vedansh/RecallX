// --- DOM Elements ---
const gameContainer = document.getElementById('game-container');
const leaderboardContainer = document.getElementById('leaderboard-container');
const greetingText = document.getElementById('greeting-text');
const levelText = document.getElementById('level-text');
const boardStatus = document.getElementById('board-status');
const gridBoard = document.getElementById('grid-board');
const failureCountUI = document.getElementById('failure-count');
const progressBar = document.getElementById('progress-bar');
const btnViewLeaderboard = document.getElementById('btn-view-leaderboard');
const leaderboardBody = document.getElementById('leaderboard-body');
const btnLbPlay = document.getElementById('btn-lb-play');

// --- State Variables ---
let currentEmail = null;
let currentName = null;

const levelsConfig = [8, 14, 20, 26, 36];
let currentLevel = 0;
let sequence = [];
let currentStep = 0;
let isFlashing = false;
let tiles = [];
let failuresThisRun = 0;
const GAME_TYPE = 'sequence';

// Verify Login Session
window.onload = () => {
    let session = JSON.parse(sessionStorage.getItem('active_player') || 'null');
    if (!session || !session.email) {
        alert("Authentication Error: You are not logged into the Hub.");
        window.location.href = 'index.html';
        return;
    }
    currentEmail = session.email;
    currentName = session.name;
    greetingText.innerText = `Agent ${currentName}`;
    
    showView('game');
    startFullGameSession();
};

async function fetchGlobalLeaderboard() {
    try {
        const res = await fetch(`/api/leaderboard?game=${GAME_TYPE}`);
        const data = await res.json();
        return data.leaderboard || [];
    } catch (e) {
        return [];
    }
}

async function saveGlobalScore(email, name, levelsBeaten, failures) {
    try {
        await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameType: GAME_TYPE, email, name, levelsBeaten, failures })
        });
    } catch (e) {}
}

function showView(viewId) {
    gameContainer.classList.add('hidden');
    leaderboardContainer.classList.add('hidden');
    
    if (viewId === 'game') {
        gameContainer.classList.remove('hidden');
    } else if (viewId === 'leaderboard') {
        leaderboardContainer.classList.remove('hidden');
        renderLeaderboard();
    }
}

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

async function renderLeaderboard() {
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
