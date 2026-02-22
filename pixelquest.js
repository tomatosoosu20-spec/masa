const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const finalScoreEl = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');

// Canvas scaling for pixel art
const WIDTH = 400;
const HEIGHT = 400;
canvas.width = WIDTH;
canvas.height = HEIGHT;

// Game State
let score = 0;
let lives = 3;
let level = 1;
let isGameStarted = false;
let isGameOver = false;
let frameCount = 0;

// Constants
const TILE_SIZE = 20;
const GRID_W = WIDTH / TILE_SIZE;
const GRID_H = HEIGHT / TILE_SIZE;

// Player
const player = {
    x: 2,
    y: 2,
    color: '#00f3ff',
    targetX: 2,
    targetY: 2,
    moveSpeed: 0.15,
    lastMove: 0
};

// Items and Enemies
let gems = [];
let enemies = [];
let particles = [];

// Input
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

function initGame() {
    score = 0;
    lives = 3;
    level = 1;
    isGameOver = false;
    isGameStarted = true;

    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');

    player.x = 2;
    player.y = 2;
    player.targetX = 2;
    player.targetY = 2;

    spawnLevel();
    updateUI();
    requestAnimationFrame(update);
}

function spawnLevel() {
    gems = [];
    enemies = [];

    // Simple gem spawning
    for (let i = 0; i < 5 + level; i++) {
        gems.push({
            x: Math.floor(Math.random() * (GRID_W - 2)) + 1,
            y: Math.floor(Math.random() * (GRID_H - 2)) + 1,
            color: '#ffff00'
        });
    }

    // Enemy spawning
    for (let i = 0; i < level; i++) {
        enemies.push({
            x: Math.floor(Math.random() * (GRID_W - 10)) + 8,
            y: Math.floor(Math.random() * (GRID_H - 10)) + 8,
            color: '#ff0055',
            dirX: Math.random() > 0.5 ? 1 : -1,
            dirY: Math.random() > 0.5 ? 1 : -1,
            speed: 0.02 + (level * 0.005)
        });
    }
}

function update() {
    if (!isGameStarted || isGameOver) return;

    frameCount++;

    // Smooth movement
    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;
    if (Math.abs(dx) > 0.01) player.x += dx * player.moveSpeed;
    else player.x = player.targetX;
    if (Math.abs(dy) > 0.01) player.y += dy * player.moveSpeed;
    else player.y = player.targetY;

    // Grid movement input
    const now = Date.now();
    if (now - player.lastMove > 150) {
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
            let nextX = player.targetX;
            let nextY = player.targetY;

            if (keys['ArrowUp'] || keys['KeyW']) nextY--;
            else if (keys['ArrowDown'] || keys['KeyS']) nextY++;
            else if (keys['ArrowLeft'] || keys['KeyA']) nextX--;
            else if (keys['ArrowRight'] || keys['KeyD']) nextX++;

            if (nextX >= 0 && nextX < GRID_W && nextY >= 0 && nextY < GRID_H) {
                player.targetX = nextX;
                player.targetY = nextY;
                player.lastMove = now;
            }
        }
    }

    // Update Enemies
    enemies.forEach(e => {
        e.x += e.dirX * e.speed;
        e.y += e.dirY * e.speed;

        if (e.x < 0 || e.x > GRID_W - 1) e.dirX *= -1;
        if (e.y < 0 || e.y > GRID_H - 1) e.dirY *= -1;

        // Collision with player
        const dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < 0.8) {
            takeDamage();
        }
    });

    // Gem Collection
    gems = gems.filter(g => {
        const dist = Math.hypot(player.x - g.x, player.y - g.y);
        if (dist < 0.8) {
            score += 10;
            createExplosion(g.x, g.y, g.color);
            updateUI();
            return false;
        }
        return true;
    });

    if (gems.length === 0) {
        level++;
        spawnLevel();
        updateUI();
    }

    draw();
    requestAnimationFrame(update);
}

function takeDamage() {
    lives--;
    updateUI();
    createExplosion(player.x, player.y, '#ff0000');

    if (lives <= 0) {
        gameOver();
    } else {
        // Reset player position
        player.x = 2;
        player.y = 2;
        player.targetX = 2;
        player.targetY = 2;
    }
}

function updateUI() {
    scoreEl.innerText = score;
    livesEl.innerText = '❤️'.repeat(Math.max(0, lives));
    levelEl.innerText = level;
}

function draw() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw grid lines subtle
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    for (let i = 0; i < GRID_W; i++) {
        ctx.beginPath();
        ctx.moveTo(i * TILE_SIZE, 0);
        ctx.lineTo(i * TILE_SIZE, HEIGHT);
        ctx.stroke();
    }
    for (let j = 0; j < GRID_H; j++) {
        ctx.beginPath();
        ctx.moveTo(0, j * TILE_SIZE);
        ctx.lineTo(WIDTH, j * TILE_SIZE);
        ctx.stroke();
    }

    // Draw Gems
    gems.forEach(g => {
        const s = Math.sin(frameCount * 0.1) * 2;
        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.arc(g.x * TILE_SIZE + TILE_SIZE / 2, g.y * TILE_SIZE + TILE_SIZE / 2, 4 + s, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 10;
        ctx.shadowColor = g.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Draw Enemies
    enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(e.x * TILE_SIZE + TILE_SIZE / 2, e.y * TILE_SIZE);
        ctx.lineTo(e.x * TILE_SIZE + TILE_SIZE, e.y * TILE_SIZE + TILE_SIZE);
        ctx.lineTo(e.x * TILE_SIZE, e.y * TILE_SIZE + TILE_SIZE);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = 'white';
        ctx.fillRect(e.x * TILE_SIZE + 6, e.y * TILE_SIZE + 8, 2, 2);
        ctx.fillRect(e.x * TILE_SIZE + 12, e.y * TILE_SIZE + 8, 2, 2);
    });

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x * TILE_SIZE + 2, player.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);

    // Player Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = player.color;
    ctx.fillRect(player.x * TILE_SIZE + 4, player.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    ctx.shadowBlur = 0;

    // Draw Particles
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x * TILE_SIZE, p.y * TILE_SIZE, 3, 3);
        return p.life > 0;
    });
    ctx.globalAlpha = 1.0;
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x + 0.5,
            y: y + 0.5,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            life: 1.0,
            color: color
        });
    }
}

function gameOver() {
    isGameOver = true;
    gameoverScreen.classList.remove('hidden');
    finalScoreEl.innerText = score;
}

startBtn.addEventListener('click', initGame);
retryBtn.addEventListener('click', initGame);

// Background draw for start screen
function animate() {
    if (!isGameStarted) {
        frameCount++;
        draw();
        requestAnimationFrame(animate);
    }
}
animate();
