// --- DOM Elements ---
const authContainer = document.getElementById('auth-container');
const loginView = document.getElementById('login-view');
const otpView = document.getElementById('otp-view');
const gameContainer = document.getElementById('game-container');
const smsModal = document.getElementById('sms-modal');

// Auth Flow Elements
const inputName = document.getElementById('player-name');
const inputPhone = document.getElementById('player-phone');
const inputOtp = document.getElementById('player-otp');
const btnSendOtp = document.getElementById('btn-send-otp');
const btnVerifyOtp = document.getElementById('btn-verify-otp');
const btnBackLogin = document.getElementById('btn-back-login');
const otpDesc = document.getElementById('otp-desc');

// SMS Modal Elements
const smsText = document.getElementById('sms-text');
const btnCloseSms = document.getElementById('btn-close-sms');

// Game Flow Elements
const greetingText = document.getElementById('greeting-text');
const levelText = document.getElementById('level-text');
const boardStatus = document.getElementById('board-status');
const gridBoard = document.getElementById('grid-board');
const btnLogout = document.getElementById('btn-logout');

// --- State Variables ---
let currentName = '';
let currentPhone = '';
let generatedOtp = '';

// Game State
const levelsConfig = [8, 14, 20, 26, 36];
let currentLevel = 0;
let sequence = [];
let currentStep = 0;
let isFlashing = false;
let tiles = [];

// --- LocalStorage Database Mock ---
function getOrCreateUser(phone, name) {
    let db = JSON.parse(localStorage.getItem('players_db') || '{}');
    if (db[phone]) {
        return { name: db[phone].name, isNew: false };
    } else {
        db[phone] = { name: name, highest_level: 1 };
        localStorage.setItem('players_db', JSON.stringify(db));
        return { name: name, isNew: true };
    }
}

// --- Auth Flow ---

btnSendOtp.addEventListener('click', () => {
    currentName = inputName.value.trim();
    currentPhone = inputPhone.value.trim();

    if (!currentName || !currentPhone) {
        alert("Please enter Name and Phone number.");
        return;
    }

    // Generate random 4 digit code locally
    generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Show custom simulated SMS
    smsText.innerText = `Hey ${currentName},\n\nYour RecallX verification code is: ${generatedOtp}\n\n(Do not share this)`;
    smsModal.classList.remove('hidden');
    
    // Switch to OTP view
    loginView.classList.add('hidden');
    otpView.classList.remove('hidden');
    otpDesc.innerText = `Enter the OTP sent to ${currentPhone}.`;
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

    if (otp === generatedOtp) {
        // Authenticate locally!
        const userState = getOrCreateUser(currentPhone, currentName);

        // Authorized! Start game
        authContainer.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        
        if (!userState.isNew && userState.name !== currentName) {
            alert(`Welcome back, ${userState.name}!`);
        }
        
        greetingText.innerText = `Welcome, ${userState.name}!`;
        startGame();
    } else {
        alert("Invalid OTP! Try again.");
    }
});

btnLogout.addEventListener('click', () => {
    gameContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
    
    // Reset Auth state
    otpView.classList.add('hidden');
    loginView.classList.remove('hidden');
    inputName.value = '';
    inputPhone.value = '';
    inputOtp.value = '';
});

// --- Game Sequence Logic ---

function startGame() {
    currentLevel = 0;
    startLevel();
}

function startLevel() {
    if (currentLevel >= levelsConfig.length) {
        alert("🎉 Incredible! You've mastered all 5 levels!\n\nYou have perfect sequence memory.");
        startGame(); // Reset
        return;
    }

    const numCards = levelsConfig[currentLevel];
    levelText.innerText = `Level ${currentLevel + 1}`;
    
    // Generate Grid layout
    gridBoard.innerHTML = '';
    tiles = [];
    
    // Use JS to assign dynamic grid columns tightly based on level to optimize view space
    const cols = numCards <= 8 ? 4 : (numCards <= 20 ? 5 : 6);
    gridBoard.style.gridTemplateColumns = `repeat(${cols}, minmax(40px, 1fr))`;
    
    for (let i = 0; i < numCards; i++) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.dataset.index = i;
        tile.addEventListener('click', () => handleTileClick(i));
        gridBoard.appendChild(tile);
        tiles.push(tile);
    }
    
    // Setup Sequence
    const sequenceLength = currentLevel + 4; // L1: 4, L5: 8
    sequence = [];
    for (let i = 0; i < sequenceLength; i++) {
        sequence.push(Math.floor(Math.random() * numCards));
    }
    
    currentStep = 0;
    isFlashing = true;
    boardStatus.innerText = "Get Ready...";
    boardStatus.style.color = "#ebcb8b";
    
    setTimeout(playSequence, 1500);
}

function playSequence() {
    boardStatus.innerText = "Watch Closely!";
    
    let index = 0;
    const interval = setInterval(() => {
        if (index >= sequence.length) {
            clearInterval(interval);
            setTimeout(() => {
                isFlashing = false;
                boardStatus.innerText = "Your Turn!";
                boardStatus.style.color = "#9ece6a";
            }, 400);
            return;
        }

        const targetIndex = sequence[index];
        const tile = tiles[targetIndex];
        
        tile.classList.add('highlight');
        setTimeout(() => tile.classList.remove('highlight'), 400); 
        
        index++;
    }, 800); 
}

function handleTileClick(index) {
    if (isFlashing) return;
    
    const expectedIndex = sequence[currentStep];
    const tile = tiles[index];

    if (index === expectedIndex) {
        // Correct click
        tile.classList.add('success');
        setTimeout(() => tile.classList.remove('success'), 200);
        
        currentStep++;
        
        if (currentStep === sequence.length) {
            isFlashing = true;
            boardStatus.innerText = "Perfect!";
            boardStatus.style.color = "#7aa2f7";
            setTimeout(() => {
                alert(`Flawless memory! Transitioning to Level ${currentLevel + 2}.`);
                currentLevel++;
                startLevel();
            }, 800);
        }
    } else {
        // Wrong Logic
        isFlashing = true; 
        tile.classList.add('error');
        
        const expectedTile = tiles[expectedIndex];
        expectedTile.classList.add('highlight'); 
        
        boardStatus.innerText = "Incorrect!";
        boardStatus.style.color = "#f7768e";
        
        setTimeout(() => {
            alert("Oops! That was the wrong tile. Let's grab a new sequence.");
            startLevel(); 
        }, 1500);
    }
}
