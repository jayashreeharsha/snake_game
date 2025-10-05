// Game variables
const canvas = document.getElementById('gameBoard');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const difficultySelect = document.getElementById('difficulty');
const soundToggle = document.getElementById('soundToggle');

// Audio elements
const eatSound = document.getElementById('eatSound');
const gameOverSound = document.getElementById('gameOverSound');

// Game settings
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Difficulty settings
const difficultySettings = {
    easy: { speed: 200, scoreMultiplier: 1 },
    medium: { speed: 150, scoreMultiplier: 1.5 },
    hard: { speed: 100, scoreMultiplier: 2 },
    insane: { speed: 60, scoreMultiplier: 3 }
};

// Game state
let snake = [
    {x: 10, y: 10}
];
let food = {};
let specialFood = null;
let dx = 0;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameRunning = false;
let gameLoop;
let currentSpeed = difficultySettings.medium.speed;
let scoreMultiplier = difficultySettings.medium.scoreMultiplier;
let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
let specialFoodTimer = 0;

// Create sound effects programmatically
function createSound(frequency, duration, type = 'sine') {
    if (!soundEnabled) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Draw realistic snake head
function drawSnakeHead(x, y, radius) {
    ctx.save();
    
    // Main head shape (oval)
    ctx.fillStyle = '#2d5a3d';
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.8, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Head highlight
    ctx.fillStyle = '#38a169';
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.3, y - radius * 0.2, radius * 0.6, radius * 0.4, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Eyes based on direction
    ctx.fillStyle = '#000000';
    const eyeSize = radius * 0.15;
    const eyeOffset = radius * 0.4;
    
    if (dx === 1) { // Moving right
        // Right-facing eyes
        ctx.beginPath();
        ctx.arc(x + eyeOffset, y - eyeOffset * 0.5, eyeSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + eyeOffset, y + eyeOffset * 0.5, eyeSize, 0, 2 * Math.PI);
        ctx.fill();
    } else if (dx === -1) { // Moving left
        // Left-facing eyes
        ctx.beginPath();
        ctx.arc(x - eyeOffset, y - eyeOffset * 0.5, eyeSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - eyeOffset, y + eyeOffset * 0.5, eyeSize, 0, 2 * Math.PI);
        ctx.fill();
    } else if (dy === -1) { // Moving up
        // Up-facing eyes
        ctx.beginPath();
        ctx.arc(x - eyeOffset * 0.5, y - eyeOffset, eyeSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + eyeOffset * 0.5, y - eyeOffset, eyeSize, 0, 2 * Math.PI);
        ctx.fill();
    } else if (dy === 1) { // Moving down
        // Down-facing eyes
        ctx.beginPath();
        ctx.arc(x - eyeOffset * 0.5, y + eyeOffset, eyeSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + eyeOffset * 0.5, y + eyeOffset, eyeSize, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // Eye shine
    ctx.fillStyle = '#ffffff';
    const shineSize = eyeSize * 0.4;
    if (dx === 1) {
        ctx.beginPath();
        ctx.arc(x + eyeOffset + shineSize * 0.5, y - eyeOffset * 0.5 - shineSize * 0.5, shineSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + eyeOffset + shineSize * 0.5, y + eyeOffset * 0.5 - shineSize * 0.5, shineSize, 0, 2 * Math.PI);
        ctx.fill();
    } else if (dx === -1) {
        ctx.beginPath();
        ctx.arc(x - eyeOffset - shineSize * 0.5, y - eyeOffset * 0.5 - shineSize * 0.5, shineSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - eyeOffset - shineSize * 0.5, y + eyeOffset * 0.5 - shineSize * 0.5, shineSize, 0, 2 * Math.PI);
        ctx.fill();
    } else if (dy === -1) {
        ctx.beginPath();
        ctx.arc(x - eyeOffset * 0.5 - shineSize * 0.5, y - eyeOffset - shineSize * 0.5, shineSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + eyeOffset * 0.5 - shineSize * 0.5, y - eyeOffset - shineSize * 0.5, shineSize, 0, 2 * Math.PI);
        ctx.fill();
    } else if (dy === 1) {
        ctx.beginPath();
        ctx.arc(x - eyeOffset * 0.5 - shineSize * 0.5, y + eyeOffset + shineSize * 0.5, shineSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + eyeOffset * 0.5 - shineSize * 0.5, y + eyeOffset + shineSize * 0.5, shineSize, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // Forked tongue (occasionally visible)
    if (Math.random() < 0.1) { // 10% chance to show tongue
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (dx === 1) {
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + radius + 8, y - 3);
            ctx.moveTo(x + radius + 6, y - 3);
            ctx.lineTo(x + radius + 8, y + 3);
        } else if (dx === -1) {
            ctx.moveTo(x - radius, y);
            ctx.lineTo(x - radius - 8, y - 3);
            ctx.moveTo(x - radius - 6, y - 3);
            ctx.lineTo(x - radius - 8, y + 3);
        } else if (dy === -1) {
            ctx.moveTo(x, y - radius);
            ctx.lineTo(x - 3, y - radius - 8);
            ctx.moveTo(x - 3, y - radius - 6);
            ctx.lineTo(x + 3, y - radius - 8);
        } else if (dy === 1) {
            ctx.moveTo(x, y + radius);
            ctx.lineTo(x - 3, y + radius + 8);
            ctx.moveTo(x - 3, y + radius + 6);
            ctx.lineTo(x + 3, y + radius + 8);
        }
        ctx.stroke();
    }
    
    ctx.restore();
}

// Draw realistic snake body
function drawSnakeBody(x, y, radius, segmentIndex) {
    ctx.save();
    
    // Body gets slightly smaller towards tail
    const sizeMultiplier = Math.max(0.6, 1 - (segmentIndex * 0.05));
    const bodyRadius = radius * sizeMultiplier;
    
    // Main body (circular)
    ctx.fillStyle = '#48bb78';
    ctx.beginPath();
    ctx.arc(x, y, bodyRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Body pattern/scales
    ctx.fillStyle = '#38a169';
    ctx.beginPath();
    ctx.arc(x - bodyRadius * 0.3, y - bodyRadius * 0.3, bodyRadius * 0.4, 0, 2 * Math.PI);
    ctx.fill();
    
    // Scale pattern
    ctx.fillStyle = '#2d5a3d';
    const scaleSize = bodyRadius * 0.15;
    for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const scaleX = x + Math.cos(angle) * bodyRadius * 0.5;
        const scaleY = y + Math.sin(angle) * bodyRadius * 0.5;
        ctx.beginPath();
        ctx.arc(scaleX, scaleY, scaleSize, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    ctx.restore();
}

// Draw a bug (beetle-like insect)
function drawBug(x, y, size) {
    const time = Date.now() * 0.005;
    const pulse = Math.sin(time) * 0.1 + 1; // Subtle pulsing effect
    const bugSize = size * pulse;
    
    ctx.save();
    ctx.translate(x, y);
    
    // Bug body (oval)
    ctx.fillStyle = '#8B4513'; // Brown color
    ctx.beginPath();
    ctx.ellipse(0, 0, bugSize * 0.8, bugSize * 1.2, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // Bug head (smaller circle)
    ctx.fillStyle = '#654321'; // Darker brown
    ctx.beginPath();
    ctx.arc(0, -bugSize * 0.9, bugSize * 0.5, 0, 2 * Math.PI);
    ctx.fill();
    
    // Bug spots on body
    ctx.fillStyle = '#2F1B14'; // Very dark brown
    ctx.beginPath();
    ctx.arc(-bugSize * 0.3, -bugSize * 0.2, bugSize * 0.15, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bugSize * 0.3, bugSize * 0.1, bugSize * 0.12, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, bugSize * 0.4, bugSize * 0.1, 0, 2 * Math.PI);
    ctx.fill();
    
    // Bug legs (6 legs, 3 on each side)
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    
    // Left legs
    for (let i = 0; i < 3; i++) {
        const legY = -bugSize * 0.4 + i * bugSize * 0.4;
        const legAnimation = Math.sin(time * 3 + i) * 0.2;
        ctx.beginPath();
        ctx.moveTo(-bugSize * 0.6, legY);
        ctx.lineTo(-bugSize * 1.2 + legAnimation, legY - bugSize * 0.3);
        ctx.stroke();
    }
    
    // Right legs
    for (let i = 0; i < 3; i++) {
        const legY = -bugSize * 0.4 + i * bugSize * 0.4;
        const legAnimation = Math.sin(time * 3 + i + Math.PI) * 0.2;
        ctx.beginPath();
        ctx.moveTo(bugSize * 0.6, legY);
        ctx.lineTo(bugSize * 1.2 + legAnimation, legY - bugSize * 0.3);
        ctx.stroke();
    }
    
    // Bug antennae
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 1.5;
    const antennaAnimation = Math.sin(time * 2) * 0.1;
    
    // Left antenna
    ctx.beginPath();
    ctx.moveTo(-bugSize * 0.2, -bugSize * 1.2);
    ctx.lineTo(-bugSize * 0.4 + antennaAnimation, -bugSize * 1.6);
    ctx.stroke();
    
    // Right antenna
    ctx.beginPath();
    ctx.moveTo(bugSize * 0.2, -bugSize * 1.2);
    ctx.lineTo(bugSize * 0.4 - antennaAnimation, -bugSize * 1.6);
    ctx.stroke();
    
    // Antenna tips
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.arc(-bugSize * 0.4 + antennaAnimation, -bugSize * 1.6, 1.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bugSize * 0.4 - antennaAnimation, -bugSize * 1.6, 1.5, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.restore();
}

// Initialize game
function init() {
    highScoreElement.textContent = highScore;
    updateSoundToggle();
    generateFood();
    drawGame();
    
    // Event listeners
    document.addEventListener('keydown', changeDirection);
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('pauseBtn').addEventListener('click', pauseGame);
    document.getElementById('resetBtn').addEventListener('click', resetGame);
    document.getElementById('playAgainBtn').addEventListener('click', resetGame);
    difficultySelect.addEventListener('change', changeDifficulty);
    soundToggle.addEventListener('click', toggleSound);
    
    // Add touch controls for mobile
    addTouchControls();
}

// Generate random food position
function generateFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    
    // Make sure food doesn't spawn on snake
    for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
            generateFood();
            return;
        }
    }
}

// Generate special food occasionally
function generateSpecialFood() {
    if (Math.random() < 0.1 && !specialFood) { // 10% chance
        specialFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount),
            type: Math.random() < 0.5 ? 'bonus' : 'speed',
            timer: 100 // Disappears after 100 frames
        };
        
        // Make sure special food doesn't spawn on snake or regular food
        for (let segment of snake) {
            if (segment.x === specialFood.x && segment.y === specialFood.y) {
                specialFood = null;
                return;
            }
        }
        if (specialFood && specialFood.x === food.x && specialFood.y === food.y) {
            specialFood = null;
        }
    }
}

// Draw game elements with enhanced visuals
function drawGame() {
    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#2d3748');
    gradient.addColorStop(1, '#1a202c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw snake with enhanced visuals
     snake.forEach((segment, index) => {
         if (index === 0) {
             // Snake head with special styling
             drawSnakeHead(segment.x * gridSize + gridSize/2, segment.y * gridSize + gridSize/2, gridSize/2 - 1);
         } else {
             // Snake body segments
             drawSnakeBody(segment.x * gridSize + gridSize/2, segment.y * gridSize + gridSize/2, gridSize/2 - 1, index);
         }
     });
    
    // Draw regular food as a bug
    drawBug(food.x * gridSize + gridSize/2, food.y * gridSize + gridSize/2, gridSize/2 - 2);
    
    // Draw special food if it exists
    if (specialFood) {
        specialFood.timer--;
        if (specialFood.timer <= 0) {
            specialFood = null;
        } else {
            if (specialFood.type === 'bonus') {
                ctx.fillStyle = '#ffd700'; // Gold
                ctx.fillRect(specialFood.x * gridSize + 2, specialFood.y * gridSize + 2, gridSize - 4, gridSize - 4);
            } else if (specialFood.type === 'speed') {
                ctx.fillStyle = '#00ffff'; // Cyan
                ctx.beginPath();
                ctx.arc(specialFood.x * gridSize + gridSize/2, specialFood.y * gridSize + gridSize/2, gridSize/2 - 2, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
}

// Enhanced move snake function
function moveSnake() {
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    
    // Check wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
    }
    
    // Check self collision
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            gameOver();
            return;
        }
    }
    
    snake.unshift(head);
    
    // Check regular food collision
    if (head.x === food.x && head.y === food.y) {
        score += Math.floor(10 * scoreMultiplier);
        scoreElement.textContent = score;
        createSound(800, 0.1); // Eating sound
        generateFood();
        generateSpecialFood();
    }
    // Check special food collision
    else if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
        if (specialFood.type === 'bonus') {
            score += Math.floor(50 * scoreMultiplier);
            createSound(1200, 0.2); // Bonus sound
        } else if (specialFood.type === 'speed') {
            score += Math.floor(25 * scoreMultiplier);
            // Temporary speed boost (handled in game loop)
            createSound(1000, 0.15); // Speed sound
        }
        scoreElement.textContent = score;
        specialFood = null;
    }
    else {
        snake.pop();
    }
}

// Handle keyboard input
function changeDirection(event) {
    if (!gameRunning) return;
    
    const keyPressed = event.keyCode;
    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingRight = dx === 1;
    const goingLeft = dx === -1;
    
    // Arrow keys and WASD
    if ((keyPressed === 37 || keyPressed === 65) && !goingRight) { // Left or A
        dx = -1;
        dy = 0;
    }
    if ((keyPressed === 38 || keyPressed === 87) && !goingDown) { // Up or W
        dx = 0;
        dy = -1;
    }
    if ((keyPressed === 39 || keyPressed === 68) && !goingLeft) { // Right or D
        dx = 1;
        dy = 0;
    }
    if ((keyPressed === 40 || keyPressed === 83) && !goingUp) { // Down or S
        dx = 0;
        dy = 1;
    }
}

// Change difficulty
function changeDifficulty() {
    const difficulty = difficultySelect.value;
    currentSpeed = difficultySettings[difficulty].speed;
    scoreMultiplier = difficultySettings[difficulty].scoreMultiplier;
    
    if (gameRunning) {
        clearInterval(gameLoop);
        gameLoop = setInterval(() => {
            moveSnake();
            drawGame();
        }, currentSpeed);
    }
}

// Toggle sound
function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('soundEnabled', soundEnabled);
    updateSoundToggle();
}

function updateSoundToggle() {
    if (soundEnabled) {
        soundToggle.textContent = '🔊 Sound';
        soundToggle.classList.remove('muted');
    } else {
        soundToggle.textContent = '🔇 Muted';
        soundToggle.classList.add('muted');
    }
}

// Add touch controls for mobile
function addTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (!gameRunning) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        const minSwipeDistance = 30;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0 && dx !== -1) {
                    dx = 1; dy = 0; // Right
                } else if (deltaX < 0 && dx !== 1) {
                    dx = -1; dy = 0; // Left
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(deltaY) > minSwipeDistance) {
                if (deltaY > 0 && dy !== -1) {
                    dx = 0; dy = 1; // Down
                } else if (deltaY < 0 && dy !== 1) {
                    dx = 0; dy = -1; // Up
                }
            }
        }
    });
}

// Enhanced start game
function startGame() {
    if (gameRunning) return;
    
    gameRunning = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
    
    // Start with right direction if no direction set
    if (dx === 0 && dy === 0) {
        dx = 1;
        dy = 0;
    }
    
    gameLoop = setInterval(() => {
        moveSnake();
        drawGame();
    }, currentSpeed);
}

// Pause game
function pauseGame() {
    if (!gameRunning) return;
    
    gameRunning = false;
    clearInterval(gameLoop);
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
}

// Enhanced reset game
function resetGame() {
    gameRunning = false;
    clearInterval(gameLoop);
    
    // Reset game state
    snake = [{x: 10, y: 10}];
    dx = 0;
    dy = 0;
    score = 0;
    specialFood = null;
    scoreElement.textContent = score;
    
    // Reset UI
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    gameOverElement.style.display = 'none';
    
    generateFood();
    drawGame();
}

// Enhanced game over
function gameOver() {
    gameRunning = false;
    clearInterval(gameLoop);
    
    // Play game over sound
    createSound(200, 0.5, 'sawtooth');
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem('snakeHighScore', highScore);
    }
    
    // Show game over screen
    finalScoreElement.textContent = score;
    gameOverElement.style.display = 'block';
    
    // Reset UI
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
}

// Initialize game when page loads
window.addEventListener('load', init);