const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const distEl = document.getElementById('dist');
const speedDisplayEl = document.getElementById('speedDisplay');
const highScoreEl = document.getElementById('highScore');
const finalDistEl = document.getElementById('finalDist');
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');

// Config
const WIDTH = 800;
const HEIGHT = 400;
canvas.width = WIDTH;
canvas.height = HEIGHT;

const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const GROUND_Y = 320;
const PLAYER_SIZE = 30;

// Game State
let isStarted = false;
let isGameOver = false;
let distance = 0;
let highScore = localStorage.getItem('pixeldash_highscore') || 0;
let gameSpeed = 5;
let frameCount = 0;

highScoreEl.innerText = highScore;

// Player Obj
const player = {
    x: 100,
    y: GROUND_Y - PLAYER_SIZE,
    vy: 0,
    isJumping: false,
    color: '#00f3ff'
};

// Obstacles & Background
let obstacles = [];
let particles = [];
let clouds = [];

function init() {
    isStarted = true;
    isGameOver = false;
    distance = 0;
    gameSpeed = 6;
    obstacles = [];
    particles = [];
    clouds = Array.from({ length: 5 }, () => ({
        x: Math.random() * WIDTH,
        y: Math.random() * 150,
        speed: 0.5 + Math.random() * 1,
        w: 40 + Math.random() * 60
    }));

    player.y = GROUND_Y - PLAYER_SIZE;
    player.vy = 0;
    player.isJumping = false;

    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');

    requestAnimationFrame(loop);
}

function loop() {
    if (isGameOver) return;

    update();
    draw();

    requestAnimationFrame(loop);
}

function update() {
    frameCount++;
    distance += Math.floor(gameSpeed / 2);
    distEl.innerText = distance;

    // Increment speed
    if (frameCount % 500 === 0) {
        gameSpeed += 0.5;
        speedDisplayEl.innerText = (gameSpeed / 5).toFixed(1);
    }

    // Player Physics
    player.vy += GRAVITY;
    player.y += player.vy;

    if (player.y > GROUND_Y - PLAYER_SIZE) {
        player.y = GROUND_Y - PLAYER_SIZE;
        player.vy = 0;
        player.isJumping = false;
    }

    // Jump Input
    if ((keys['Space'] || keys['ArrowUp'] || keys['mouse']) && !player.isJumping) {
        player.vy = JUMP_FORCE;
        player.isJumping = true;
        createParticles(player.x, player.y + PLAYER_SIZE, '#fff', 5);
    }

    // Clouds
    clouds.forEach(c => {
        c.x -= c.speed;
        if (c.x + c.w < 0) c.x = WIDTH + Math.random() * 100;
    });

    // Obstacles
    if (frameCount % Math.max(40, Math.floor(100 - gameSpeed * 2)) === 0) {
        spawnObstacle();
    }

    obstacles.forEach((o, index) => {
        o.x -= gameSpeed;

        // Collision
        if (player.x < o.x + o.w &&
            player.x + PLAYER_SIZE > o.x &&
            player.y < o.y + o.h &&
            player.y + PLAYER_SIZE > o.y) {
            gameOver();
        }

        if (o.x + o.w < 0) obstacles.splice(index, 1);
    });

    // Particles
    particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particles.splice(index, 1);
    });
}

function spawnObstacle() {
    const types = ['spike', 'block', 'wide'];
    const type = types[Math.floor(Math.random() * types.length)];
    let o = { x: WIDTH, type: type };

    if (type === 'spike') {
        o.w = 30; o.h = 30; o.y = GROUND_Y - 30;
    } else if (type === 'block') {
        o.w = 40; o.h = 60; o.y = GROUND_Y - 60;
    } else {
        o.w = 80; o.h = 20; o.y = GROUND_Y - 20;
    }
    obstacles.push(o);
}

function draw() {
    // BG
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    clouds.forEach(c => {
        ctx.fillRect(c.x, c.y, c.w, 15);
    });

    // Floor
    ctx.fillStyle = '#111';
    ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
    ctx.strokeStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(WIDTH, GROUND_Y);
    ctx.stroke();

    // Floor Grid Effect
    ctx.strokeStyle = '#00f3ff1a';
    ctx.lineWidth = 1;
    for (let i = 0; i < WIDTH; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i - (frameCount % 40), GROUND_Y);
        ctx.lineTo(i - (frameCount % 40) - 100, HEIGHT);
        ctx.stroke();
    }

    // Obstacles
    obstacles.forEach(o => {
        if (o.type === 'spike') {
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.moveTo(o.x, o.y + o.h);
            ctx.lineTo(o.x + o.w / 2, o.y);
            ctx.lineTo(o.x + o.w, o.y + o.h);
            ctx.fill();
            // Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0055';
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#ff00de';
            ctx.fillRect(o.x, o.y, o.w, o.h);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(o.x, o.y, o.w, o.h);
        }
    });

    // Particles
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1.0;

    // Player
    ctx.fillStyle = player.color;
    // Main Body
    ctx.fillRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);

    // Neon Outline
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);

    // Eye
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x + 18, player.y + 8, 8, 8);

    // Glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = player.color;
    ctx.strokeRect(player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
    ctx.shadowBlur = 0;
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 2) * 2,
            life: 1.0,
            color: color
        });
    }
}

function gameOver() {
    isGameOver = true;
    createParticles(player.x + 15, player.y + 15, '#00f3ff', 20);
    createParticles(player.x + 15, player.y + 15, '#ff00de', 20);

    if (distance > highScore) {
        highScore = distance;
        localStorage.setItem('pixeldash_highscore', highScore);
        highScoreEl.innerText = highScore;
    }

    finalDistEl.innerText = distance;
    gameoverScreen.classList.remove('hidden');
}

// Input
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);
canvas.addEventListener('mousedown', () => keys['mouse'] = true);
canvas.addEventListener('mouseup', () => keys['mouse'] = false);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); keys['mouse'] = true; }, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); keys['mouse'] = false; }, { passive: false });

startBtn.addEventListener('click', init);
retryBtn.addEventListener('click', init);

// Initial Draw
draw();
