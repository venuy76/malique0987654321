// ===================================
//  SUPABASE & LEADERBOARD
// ===================================
const SUPABASE_URL = 'https://sipjmopbtotdqakmqotf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcGptb3BidG90ZHFha21xb3RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMzgzODUsImV4cCI6MjA3NjgxNDM4NX0.iZJcFc5y9WGqLwLMfQt7Ae8ZN_xQviq7YWylfuVDRAQ';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const leaderboardList = document.getElementById('leaderboard-list');
const submitScoreForm = document.getElementById('submit-score-form');
const playerNameInput = document.getElementById('player-name-input');
let finalScore = 0;
let localHighScore = localStorage.getItem('dino-high-score') || 0;

async function fetchLeaderboard() {
    leaderboardList.innerHTML = '<li>Loading...</li>';
    const { data, error } = await _supabase
        .from('leaderboard')
        .select('player_name, score')
        .order('score', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching leaderboard:', error.message);
        leaderboardList.innerHTML = '<li>Error loading scores</li>';
        return;
    }
    leaderboardList.innerHTML = '';
    data.forEach((entry, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span><strong>${index + 1}.</strong> ${entry.player_name}</span>
            <span>${entry.score}</span>
        `;
        leaderboardList.appendChild(li);
    });
}

async function submitScore(e) {
    e.preventDefault();
    const playerName = playerNameInput.value.trim();
    if (!playerName) return alert('Please enter a name!');
    
    submitScoreForm.querySelector('button').disabled = true;
    
    await _supabase.from('leaderboard').insert({
        player_name: playerName,
        score: finalScore
    });

    submitScoreForm.classList.add('hidden');
    playerNameInput.value = '';
    submitScoreForm.querySelector('button').disabled = false;
    fetchLeaderboard();
}

submitScoreForm.addEventListener('submit', submitScore);
fetchLeaderboard();


// ===================================
//  AUDIO CONTEXT (FOR SOUND)
// ===================================
let audioContext;
try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
    console.warn('Web Audio API is not supported in this browser');
}

function playSound(type) {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Volume
    
    if (type === 'jump') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
    } else if (type === 'game-over') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
    } else if (type === 'score-milestone') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1500, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
    }
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}


// ===================================
//  GAME ENGINE
// ===================================

// DOM Elements
const body = document.body;
const gameWorld = document.getElementById('game-world');
const dino = document.getElementById('dino');
const ground = document.getElementById('ground');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('high-score');
const startMessage = document.getElementById('start-message');
const gameOverMessage = document.getElementById('game-over-message');

// Game Constants
const GRAVITY = 0.8;
const JUMP_STRENGTH = -18;
const MAX_JUMP_HOLD_TIME = 200; // ms
const DINO_RUN_SPEED = 0.5; // Controls CSS animation speed
const INITIAL_GAME_SPEED = 5;
const GAME_SPEED_INCREMENT = 0.001;
const PTERODACTYL_START_SCORE = 500;
const NIGHT_MODE_SCORE = 700;

// Game State
let isGameRunning = false;
let isJumping = false;
let isDucking = false;
let isJumpKeyHeld = false;
let jumpHoldTimer = 0;
let dinoY = 0;
let dinoVelocity = 0;
let currentScore = 0;
let gameSpeed = INITIAL_GAME_SPEED;
let obstacleList = [];
let lastFrameTime = 0;
let nextObstacleTime = 2000;
let timeSinceLastObstacle = 0;
let isNightMode = false;
let lastMilestone = 0;

// Update High Score Display
highScoreDisplay.textContent = `HI ${String(localHighScore).padStart(5, '0')}`;

// ===================================
//  GAME LOOP & UPDATES
// ===================================

function gameLoop(currentTime) {
    if (!isGameRunning) return;

    const delta = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    updateGameSpeed(delta);
    updateScore(delta);
    updateDino(delta);
    updateObstacles(delta);

    if (checkCollision()) {
        gameOver();
        return;
    }

    requestAnimationFrame(gameLoop);
}

function updateGameSpeed(delta) {
    gameSpeed += GAME_SPEED_INCREMENT * delta;
    ground.style.animationDuration = `${100 / gameSpeed}s`;
}

function updateScore(delta) {
    currentScore += Math.floor(delta * 0.02 * gameSpeed);
    scoreDisplay.textContent = String(currentScore).padStart(5, '0');

    // Night mode check
    const nightModeThreshold = NIGHT_MODE_SCORE;
    const currentPhase = Math.floor(currentScore / nightModeThreshold);
    const inNightPhase = currentPhase % 2 !== 0;

    if (inNightPhase && !isNightMode) {
        isNightMode = true;
        body.classList.add('night-mode');
    } else if (!inNightPhase && isNightMode) {
        isNightMode = false;
        body.classList.remove('night-mode');
    }

    // Milestone beep
    if (currentScore > lastMilestone + 100) {
        lastMilestone = Math.floor(currentScore / 100) * 100;
        playSound('score-milestone');
    }
}

function updateDino(delta) {
    // === Handle Jumping ===
    if (isJumping) {
        dinoY += dinoVelocity * (delta / 16);
        dinoVelocity += GRAVITY * (delta / 16);

        // Variable jump height: stop jump if key is released
        if (!isJumpKeyHeld && dinoVelocity < 0) {
            dinoVelocity = Math.max(dinoVelocity, -5); // Taper off the jump
        }

        // Fast fall
        if (isDucking && dinoVelocity > 0) {
            dinoVelocity += GRAVITY * 2 * (delta / 16);
        }

        // Check for landing
        if (dinoY >= 0) {
            dinoY = 0;
            dinoVelocity = 0;
            isJumping = false;
            // If still ducking on land, keep ducking
            if (isDucking) setDinoState('duck');
            else setDinoState('run');
        }
    }
    
    dino.style.transform = `translateY(${dinoY}px)`;
}

function updateObstacles(delta) {
    timeSinceLastObstacle += delta;

    if (timeSinceLastObstacle > nextObstacleTime) {
        timeSinceLastObstacle = 0;
        createObstacle();
        
        // Shorten time between obstacles as game speeds up
        const minTime = 800;
        const maxTime = 2000;
        nextObstacleTime = Math.random() * (maxTime - minTime) + minTime - (gameSpeed * 50);
        nextObstacleTime = Math.max(nextObstacleTime, minTime); // Cap at min time
    }

    // Move all obstacles
    for (let i = obstacleList.length - 1; i >= 0; i--) {
        const obstacle = obstacleList[i];
        let newX = parseFloat(obstacle.style.left) - gameSpeed * (delta / 16);
        obstacle.style.left = `${newX}px`;

        // Remove obstacle if it's off-screen
        if (newX < -100) { // -100 to be safe
            obstacle.remove();
            obstacleList.splice(i, 1);
        }
    }
}

// ===================================
//  GAME STATE & MECHANICS
// ===================================

function startGame() {
    isGameRunning = true;
    isJumping = false;
    isDucking = false;
    dinoY = 0;
    dinoVelocity = 0;
    currentScore = 0;
    lastMilestone = 0;
    gameSpeed = INITIAL_GAME_SPEED;
    timeSinceLastObstacle = 0;
    nextObstacleTime = 2000;
    
    // Clear old obstacles
    obstacleList.forEach(obstacle => obstacle.remove());
    obstacleList = [];

    // Reset UI
    startMessage.classList.add('hidden');
    gameOverMessage.classList.add('hidden');
    submitScoreForm.classList.add('hidden');
    
    // Start animations
    setDinoState('run');
    ground.style.animationPlayState = 'running';

    // Start the game loop
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    isGameRunning = false;
    isDucking = false; // Just in case
    setDinoState('idle'); // Stops run animation
    ground.style.animationPlayState = 'paused';
    gameOverMessage.classList.remove('hidden');
    
    // Update and save high score
    if (currentScore > localHighScore) {
        localHighScore = currentScore;
        localStorage.setItem('dino-high-score', localHighScore);
        highScoreDisplay.textContent = `HI ${String(localHighScore).padStart(5, '0')}`;
    }

    // Show leaderboard submit
    finalScore = currentScore;
    submitScoreForm.classList.remove('hidden');
    
    playSound('game-over');
    fetchLeaderboard(); // Refresh leaderboard
}

function createObstacle() {
    const obstacle = document.createElement('div');
    obstacle.classList.add('obstacle');
    
    const isPterodactyl = currentScore > PTERODACTYL_START_SCORE && Math.random() < 0.3;

    if (isPterodactyl) {
        obstacle.classList.add('pterodactyl');
        // Random height
        const height = [20, 60, 100][Math.floor(Math.random() * 3)];
        obstacle.style.bottom = `${height}px`;
    } else {
        // Cactus
        const isLarge = Math.random() < 0.5;
        obstacle.classList.add(isLarge ? 'cactus-large' : 'cactus-small');
    }

    obstacle.style.left = `${gameWorld.offsetWidth}px`;
    gameWorld.appendChild(obstacle);
    obstacleList.push(obstacle);
}

function setDinoState(state) {
    const legs = document.querySelectorAll('.dino-leg');
    if (state === 'run') {
        dino.classList.remove('ducking');
        legs.forEach(leg => leg.style.animationPlayState = 'running');
    } else if (state === 'duck') {
        dino.classList.add('ducking');
        legs.forEach(leg => leg.style.animationPlayState = 'running');
    } else if (state === 'idle') {
        dino.classList.remove('ducking');
        legs.forEach(leg => leg.style.animationPlayState = 'paused');
    }
}

function checkCollision() {
    // Use the dino body for a more accurate (and smaller) hitbox
    const dinoRect = dino.querySelector('.dino-body').getBoundingClientRect();

    for (const obstacle of obstacleList) {
        const obstacleRect = obstacle.getBoundingClientRect();
        
        // Simple AABB collision check
        if (
            dinoRect.right > obstacleRect.left + 10 && // +10 for feel
            dinoRect.left < obstacleRect.right - 10 && // -10 for feel
            dinoRect.bottom > obstacleRect.top + 10 &&
            dinoRect.top < obstacleRect.bottom - 10
        ) {
            return true;
        }
    }
    return false;
}

function handleJump() {
    if (!isGameRunning || isJumping || isDucking) return;
    
    isJumping = true;
    isJumpKeyHeld = true;
    jumpHoldTimer = 0;
    dinoVelocity = JUMP_STRENGTH;
    playSound('jump');
    
    // Stop holding after max time
    setTimeout(() => {
        isJumpKeyHeld = false;
    }, MAX_JUMP_HOLD_TIME);
}

function handleDuck(isPressed) {
    if (!isGameRunning) return;
    isDucking = isPressed;

    if (!isJumping) {
        setDinoState(isPressed ? 'duck' : 'run');
    }
}

// ===================================
//  INPUT LISTENERS
// ===================================

document.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!isGameRunning) {
            startGame();
        } else {
            handleJump();
        }
    } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        if (!isJumpKeyHeld) { // Don't duck if holding jump
            handleDuck(true);
        }
    }
});

document.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        isJumpKeyHeld = false;
    } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleDuck(false);
    }
});

// Also handle touch/mouse for mobile
document.addEventListener('touchstart', e => {
    e.preventDefault();
    if (!isGameRunning) {
        startGame();
    } else {
        handleJump();
    }
});
document.addEventListener('touchend', e => {
    e.preventDefault();
    isJumpKeyHeld = false;
});