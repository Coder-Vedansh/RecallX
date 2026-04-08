// --- DOM Elements ---
const gameContainer = document.getElementById('game-container');
const leaderboardContainer = document.getElementById('leaderboard-container');
const greetingText = document.getElementById('greeting-text');
const boardStatus = document.getElementById('board-status');
const btnViewLeaderboard = document.getElementById('btn-view-leaderboard');
const leaderboardBody = document.getElementById('leaderboard-body');
const btnLbPlay = document.getElementById('btn-lb-play');
const scoreUI = document.getElementById('failure-count');

// Reaction specific UI
const reactionPad = document.getElementById('reaction-pad');
const reactionPadText = document.getElementById('reaction-pad-text');
const resultArea = document.getElementById('result-area');
const resultMs = document.getElementById('result-ms');
const btnSubmitScore = document.getElementById('btn-submit-score');

// --- State Variables ---
let currentEmail = null;
let currentName = null;
const GAME_TYPE = 'reaction';

let gameState = 'IDLE'; // IDLE, WAIT, GO, RESULT
let timeoutId = null;
let startTime = 0;
let reactionTime = 0;

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

async function saveGlobalScore() {
    try {
        await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                gameType: GAME_TYPE, 
                email: currentEmail, 
                name: currentName, 
                levelsBeaten: 1, 
                failures: reactionTime 
            })
        });
    } catch (e) {}
}

function showView(viewId) {
    gameContainer.classList.add('hidden');
    leaderboardContainer.classList.add('hidden');
    
    if (viewId === 'game') {
        gameContainer.classList.remove('hidden');
        resetGame();
    } else if (viewId === 'leaderboard') {
        leaderboardContainer.classList.remove('hidden');
        renderLeaderboard();
    }
}

btnViewLeaderboard.addEventListener('click', () => {
    showView('leaderboard');
});

btnLbPlay.addEventListener('click', () => {
    showView('game');
});

function resetGame() {
    gameState = 'IDLE';
    clearTimeout(timeoutId);
    reactionPad.className = 'pad-idle';
    reactionPadText.innerText = "Click to start";
    boardStatus.innerText = "When the box turns green, click as fast as you can.";
    resultArea.classList.add('hidden');
}

reactionPad.addEventListener('mousedown', () => {
    if (gameState === 'IDLE') {
        resultArea.classList.add('hidden');
        gameState = 'WAIT';
        reactionPad.className = 'pad-wait';
        reactionPadText.innerText = "Wait for green...";
        
        // Random wait between 1.5s and 5s
        const randomWait = Math.floor(Math.random() * 3500) + 1500;
        timeoutId = setTimeout(() => {
            gameState = 'GO';
            reactionPad.className = 'pad-go';
            reactionPadText.innerText = "CLICK!";
            startTime = Date.now();
        }, randomWait);

    } else if (gameState === 'WAIT') {
        clearTimeout(timeoutId);
        gameState = 'IDLE';
        reactionPad.className = 'pad-idle';
        reactionPadText.innerText = "Too early! Click to try again.";
        reactionPadText.style.color = "#fbbf24";
        setTimeout(() => { reactionPadText.style.color = "#fff"; }, 1000);

    } else if (gameState === 'GO') {
        const endTime = Date.now();
        reactionTime = endTime - startTime;
        gameState = 'RESULT';
        
        reactionPad.className = 'pad-idle';
        reactionPadText.innerText = `Click to try again`;
        scoreUI.innerText = reactionTime;
        
        resultMs.innerText = `${reactionTime} ms`;
        resultArea.classList.remove('hidden');
    }
});

btnSubmitScore.addEventListener('click', async () => {
    btnSubmitScore.innerText = "Syncing...";
    await saveGlobalScore();
    btnSubmitScore.innerText = "Save Score to Global";
    showView('leaderboard');
});


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
            <td><span style="color:var(--primary); font-weight:800;">${entry.failures}</span> ms</td>
        `;
        leaderboardBody.appendChild(tr);
    });
}
