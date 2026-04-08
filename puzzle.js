// --- DOM Elements ---
const gameContainer = document.getElementById('game-container');
const leaderboardContainer = document.getElementById('leaderboard-container');
const greetingText = document.getElementById('greeting-text');
const boardStatus = document.getElementById('board-status');
const btnViewLeaderboard = document.getElementById('btn-view-leaderboard');
const leaderboardBody = document.getElementById('leaderboard-body');
const btnLbPlay = document.getElementById('btn-lb-play');
const scoreUI = document.getElementById('failure-count');
const btnRestart = document.getElementById('btn-restart');

// Puzzle specific UI
const puzzleGrid = document.getElementById('puzzle-grid');
const winArea = document.getElementById('win-area');
const btnSubmitScore = document.getElementById('btn-submit-score');

// --- State Variables ---
let currentEmail = null;
let currentName = null;
const GAME_TYPE = 'puzzle';

const ICONS = ['⚛️', '🪐', '🧬', '🧠', '⚙️', '🧿', '🎲', '🚀'];
let boardCards = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let movesMade = 0;
let pairsFound = 0;

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
                failures: movesMade 
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

btnViewLeaderboard.addEventListener('click', () => { showView('leaderboard'); });
btnLbPlay.addEventListener('click', () => { showView('game'); });
btnRestart.addEventListener('click', () => { resetGame(); });

function resetGame() {
    puzzleGrid.innerHTML = '';
    winArea.classList.add('hidden');
    movesMade = 0;
    pairsFound = 0;
    firstCard = null;
    secondCard = null;
    lockBoard = false;
    scoreUI.innerText = movesMade;
    boardStatus.innerText = "Match all pairs. Lowest moves wins.";
    
    // Duplicate symbols to make 8 pairs (16 cards)
    boardCards = [...ICONS, ...ICONS];
    // Shuffle Array randomly
    boardCards.sort(() => 0.5 - Math.random());
    
    boardCards.forEach((icon, index) => {
        const cardElem = document.createElement('div');
        cardElem.classList.add('puzzle-card');
        cardElem.dataset.icon = icon;
        cardElem.dataset.index = index;
        cardElem.innerHTML = `<span class="card-inner">${icon}</span>`;
        
        cardElem.addEventListener('click', () => flipCard(cardElem));
        puzzleGrid.appendChild(cardElem);
    });
}

function flipCard(card) {
    if (lockBoard) return;
    if (card === firstCard) return; // double click same card
    if (card.classList.contains('matched')) return;

    card.classList.add('flipped');

    if (!firstCard) {
        firstCard = card;
        return;
    }

    secondCard = card;
    movesMade++;
    scoreUI.innerText = movesMade;
    checkForMatch();
}

function checkForMatch() {
    let isMatch = firstCard.dataset.icon === secondCard.dataset.icon;

    if (isMatch) {
        disableDocs();
    } else {
        unflipCards();
    }
}

function disableDocs() {
    firstCard.classList.add('matched');
    secondCard.classList.add('matched');
    
    pairsFound++;
    if(pairsFound === 8) {
        setTimeout(() => {
            boardStatus.innerText = "Puzzle Complete!";
            winArea.classList.remove('hidden');
        }, 500);
    }

    resetBoard();
}

function unflipCards() {
    lockBoard = true;
    setTimeout(() => {
        firstCard.classList.remove('flipped');
        secondCard.classList.remove('flipped');
        resetBoard();
    }, 1000);
}

function resetBoard() {
    [firstCard, secondCard] = [null, null];
    lockBoard = false;
}


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
            <td><span style="color:var(--primary); font-weight:800;">${entry.failures}</span> moves</td>
        `;
        leaderboardBody.appendChild(tr);
    });
}
