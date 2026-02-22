// Pixel Quest - 2D Dot Adventure

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const gemsEl = document.getElementById('gems');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const startScreen = document.getElementById('start-screen');
const statusMsg = document.getElementById('status-msg');

// Game Settings
const TILE_SIZE = 32;
const ROWS = 15;
const COLS = 20;
canvas.width = COLS * TILE_SIZE;
canvas.height = ROWS * TILE_SIZE;

let score = 0;
let level = 1;
let gemsCollected = 0;
let totalGems = 0;
let isGameRunning = false;

// Entity State
const player = {
    x: 1,
    y: 1,
    color: '#00ff41',
    prevX: 1,
    prevY: 1,
    moveDelay: 0,
    maxMoveDelay: 5
};

let map = [];
let gems = [];
let slimes = [];
let exit = { x: -1, y: -1 };

// Levels
const generateLevel = (lvl) => {
    map = [];
    gems = [];
    slimes = [];
    gemsCollected = 0;

    // Create boxed map
    for (let r = 0; r < ROWS; r++) {
        map[r] = [];
        for (let c = 0; c < COLS; c++) {
            if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
                map[r][c] = 1; // Wall
            } else {
                map[r][c] = Math.random() < 0.15 ? 1 : 0; // Random walls
            }
        }
    }

    // Clear start area
    player.x = 1; player.y = 1;
    map[1][1] = 0; map[1][2] = 0; map[2][1] = 0;

    // Place gems
    totalGems = 5 + lvl;
    for (let i = 0; i < totalGems; i++) {
        let gx, gy;
        do {
            gx = Math.floor(Math.random() * (COLS - 2)) + 1;
            gy = Math.floor(Math.random() * (ROWS - 2)) + 1;
        } while (map[gy][gx] !== 0 || (gx === 1 && gy === 1));
        gems.push({ x: gx, y: gy });
    }

    // Place exit (closed until all gems collected)
    do {
        exit.x = Math.floor(Math.random() * (COLS - 2)) + 1;
        exit.y = Math.floor(Math.random() * (ROWS - 2)) + 1;
    } while (map[exit.y][exit.x] !== 0 || (exit.x === 1 && exit.y === 1));

    // Place slimes
    const numSlimes = 1 + lvl;
    for (let i = 0; i < numSlimes; i++) {
        let sx, sy;
        do {
            sx = Math.floor(Math.random() * (COLS - 2)) + 1;
            sy = Math.floor(Math.random() * (ROWS - 2)) + 1;
        } while (map[sy][sx] !== 0 || Math.abs(sx - 1) + Math.abs(sy - 1) < 5);
        slimes.push({
            x: sx,
            y: sy,
            vx: Math.random() < 0.5 ? 1 : -1,
            vy: 0,
            moveDelay: 0,
            maxMoveDelay: 10 + Math.random() * 10
        });
    }

    updateUI();
};

const updateUI = () => {
    scoreEl.innerText = score;
    gemsEl.innerText = `${gemsCollected}/${totalGems}`;
    levelEl.innerText = level;
};

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => (keys[e.code] = true));
window.addEventListener('keyup', (e) => (keys[e.code] = false));

const updateSlimes = () => {
    slimes.forEach(s => {
        s.moveDelay++;
        if (s.moveDelay >= s.maxMoveDelay) {
            s.moveDelay = 0;
            // Decide horizontal or vertical
            if (Math.random() < 0.05) {
                if (s.vx !== 0) { s.vx = 0; s.vy = Math.random() < 0.5 ? 1 : -1; }
                else { s.vy = 0; s.vx = Math.random() < 0.5 ? 1 : -1; }
            }

            const nx = s.x + s.vx;
            const ny = s.y + s.vy;

            if (map[ny][nx] === 0) {
                s.x = nx;
                s.y = ny;
            } else {
                s.vx *= -1;
                s.vy *= -1;
            }
        }
    });
};

const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Map
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (map[r][c] === 1) {
                ctx.fillStyle = '#444';
                ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                ctx.strokeStyle = '#222';
                ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    // Draw Exit
    ctx.fillStyle = gemsCollected >= totalGems ? '#ffd700' : '#555';
    ctx.fillRect(exit.x * TILE_SIZE + 4, exit.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(exit.x * TILE_SIZE + 4, exit.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);

    // Draw Gems
    gems.forEach(g => {
        ctx.fillStyle = '#00eaff';
        ctx.beginPath();
        ctx.moveTo(g.x * TILE_SIZE + 16, g.y * TILE_SIZE + 8);
        ctx.lineTo(g.x * TILE_SIZE + 24, g.y * TILE_SIZE + 16);
        ctx.lineTo(g.x * TILE_SIZE + 16, g.y * TILE_SIZE + 24);
        ctx.lineTo(g.x * TILE_SIZE + 8, g.y * TILE_SIZE + 16);
        ctx.fill();
    });

    // Draw Slimes
    slimes.forEach(s => {
        ctx.fillStyle = '#ff00de';
        ctx.fillRect(s.x * TILE_SIZE + 6, s.y * TILE_SIZE + 10, TILE_SIZE - 12, TILE_SIZE - 16);
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(s.x * TILE_SIZE + 10, s.y * TILE_SIZE + 14, 4, 4);
        ctx.fillRect(s.x * TILE_SIZE + TILE_SIZE - 14, s.y * TILE_SIZE + 14, 4, 4);
    });

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x * TILE_SIZE + 4, player.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    // Player accent
    ctx.fillStyle = '#fff';
    ctx.fillRect(player.x * TILE_SIZE + 8, player.y * TILE_SIZE + 8, 4, 4);
};

const gameLoop = () => {
    if (!isGameRunning) return;

    // Player move
    if (player.moveDelay > 0) player.moveDelay--;
    if (player.moveDelay === 0) {
        let dx = 0, dy = 0;
        if (keys['ArrowUp'] || keys['KeyW']) dy = -1;
        else if (keys['ArrowDown'] || keys['KeyS']) dy = 1;
        else if (keys['ArrowLeft'] || keys['KeyA']) dx = -1;
        else if (keys['ArrowRight'] || keys['KeyD']) dx = 1;

        if (dx !== 0 || dy !== 0) {
            if (map[player.y + dy][player.x + dx] === 0) {
                player.x += dx;
                player.y += dy;
                player.moveDelay = player.maxMoveDelay;
            }
        }
    }

    // Gem Collection
    for (let i = gems.length - 1; i >= 0; i--) {
        if (gems[i].x === player.x && gems[i].y === player.y) {
            gems.splice(i, 1);
            gemsCollected++;
            score += 100;
            updateUI();
        }
    }

    // Enemy Collision
    slimes.forEach(s => {
        if (s.x === player.x && s.y === player.y) {
            gameOver();
        }
    });

    // Exit Detection
    if (gemsCollected >= totalGems && player.x === exit.x && player.y === exit.y) {
        levelClear();
    }

    updateSlimes();
    draw();
    requestAnimationFrame(gameLoop);
};

const gameOver = () => {
    isGameRunning = false;
    statusMsg.innerText = "GAME OVER";
    statusMsg.style.color = "#ff0000";
    overlay.classList.remove('hidden');
};

const levelClear = () => {
    isGameRunning = false;
    level++;
    statusMsg.innerText = "LEVEL CLEAR!";
    statusMsg.style.color = "#00ff41";
    overlay.classList.remove('hidden');
    // Save progress? Total points are saved in script.js context usually
    let pongPoints = parseInt(localStorage.getItem('pong_total_points')) || 0;
    pongPoints += 500;
    localStorage.setItem('pong_total_points', pongPoints);
};

document.getElementById('startBtn').addEventListener('click', () => {
    startScreen.classList.add('hidden');
    isGameRunning = true;
    level = 1;
    score = 0;
    generateLevel(level);
    gameLoop();
});

document.getElementById('restartBtn').addEventListener('click', () => {
    overlay.classList.add('hidden');
    isGameRunning = true;
    generateLevel(level);
    gameLoop();
});

document.getElementById('menuBtn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

// Initial draw behind screens
generateLevel(1);
draw();
