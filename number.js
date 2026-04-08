// --- DOM Elements ---
const gameContainer = document.getElementById('game-container');
const leaderboardContainer = document.getElementById('leaderboard-container');
const greetingText = document.getElementById('greeting-text');
const levelText = document.getElementById('level-text');
const boardStatus = document.getElementById('board-status');
const progressBar = document.getElementById('progress-bar');
const btnViewLeaderboard = document.getElementById('btn-view-leaderboard');
const leaderboardBody = document.getElementById('leaderboard-body');
const btnLbPlay = document.getElementById('btn-lb-play');
const scoreUI = document.getElementById('failure-count');

// Number Memory specific UI
const numberFlashArea = document.getElementById('number-flash-area');
const largeNumber = document.getElementById('large-number');
const numberInputArea = document.getElementById('number-input-area');
const userNumberInput = document.getElementById('user-number-input');
const btnSubmitNumber = document.getElementById('btn-submit-number');
const resultArea = document.getElementById('result-area');
const resultActual = document.getElementById('result-actual');
const resultUser = document.getElementById('result-user');
const btnNextLevel = document.getElementById('btn-next-level');

// --- State Variables ---
let currentEmail = null;
let currentName = null;
const GAME_TYPE = 'number';

let currentLevel = 1; // Level 1 starts with 3 digits
let currentNumber = "";
let errorsMade = 0;
let highestLevelRanked = 0; // The score sent to leaderboard

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

async function saveGlobalScore() {
    try {
        await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                gameType: GAME_TYPE, 
                email: currentEmail, 
                name: currentName, 
                levelsBeaten: highestLevelRanked, 
                failures: errorsMade 
            })
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
    await saveGlobalScore();
    btnViewLeaderboard.innerText = "Leaderboard";
    showView('leaderboard');
});
btnLbPlay.addEventListener('click', () => {
    showView('game');
    startFullGameSession();
});

btnNextLevel.addEventListener('click', () => {
    resultArea.classList.add('hidden');
    startLevelSequence();
});

function startFullGameSession() {
    currentLevel = 1;
    errorsMade = 0;
    highestLevelRanked = 0;
    resultArea.classList.add('hidden');
    startLevelSequence();
}

function startLevelSequence() {
    numberFlashArea.classList.remove('hidden');
    numberInputArea.classList.add('hidden');
    userNumberInput.value = '';
    
    levelText.innerText = `LEVEL ${currentLevel}`;
    scoreUI.innerText = highestLevelRanked;
    boardStatus.innerText = "Memorize...";
    boardStatus.style.color = "#fcd34d";
    
    // Generate Random Number String
    let length = currentLevel + 2; // Level 1 -> 3 Digits
    let numStr = "";
    for(let i=0; i<length; i++) {
        // Prevent strictly leading 0 for visuals
        if(i===0) numStr += Math.floor(Math.random() * 9) + 1;
        else numStr += Math.floor(Math.random() * 10);
    }
    currentNumber = numStr;
    largeNumber.innerText = currentNumber;
    
    // Progress Bar Animation
    progressBar.style.transition = 'none';
    progressBar.style.width = '100%';
    
    setTimeout(() => {
        progressBar.style.transition = 'width 3s linear';
        progressBar.style.width = '0%';
    }, 50);

    // Hide number after 3 seconds
    setTimeout(() => {
        numberFlashArea.classList.add('hidden');
        numberInputArea.classList.remove('hidden');
        boardStatus.innerText = "Awaiting Input...";
        boardStatus.style.color = "#60a5fa";
        userNumberInput.focus();
    }, 3000);
}

btnSubmitNumber.addEventListener('click', () => {
    const userInput = userNumberInput.value.trim();
    if(!userInput) return;
    
    numberInputArea.classList.add('hidden');
    resultArea.classList.remove('hidden');
    
    resultActual.innerText = currentNumber;
    resultUser.innerText = userInput;
    
    if(userInput === currentNumber) {
        // Success
        boardStatus.innerText = "Access Granted";
        boardStatus.style.color = "#10b981";
        resultUser.style.color = "#10b981";
        resultUser.style.textDecoration = "none";
        
        highestLevelRanked = currentLevel + 2; // the amount of digits they beat
        currentLevel++;
        btnNextLevel.innerText = "Next Level";
        btnNextLevel.style.display = "inline-block";
        scoreUI.innerText = highestLevelRanked;
    } else {
        // Fail
        errorsMade++;
        boardStatus.innerText = "Syntax Error - Pattern Broken";
        boardStatus.style.color = "#ef4444";
        resultUser.style.color = "#ef4444";
        resultUser.style.textDecoration = "line-through";
        
        btnNextLevel.innerText = "Game Over - Save Score";
        btnNextLevel.onclick = async () => {
            await saveGlobalScore();
            showView('leaderboard');
            // reset onclick for next play
            btnNextLevel.onclick = () => {
                resultArea.classList.add('hidden');
                startLevelSequence();
            };
        };
    }
});

userNumberInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        btnSubmitNumber.click();
    }
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
            <td>${entry.levelsBeaten} digits</td>
            <td><span style="color:var(--error); font-weight:600;">${entry.failures}</span> mistakes</td>
        `;
        leaderboardBody.appendChild(tr);
    });
}
