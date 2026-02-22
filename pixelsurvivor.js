const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timeEl = document.getElementById('time');
const killsEl = document.getElementById('kills');
const lvlEl = document.getElementById('lvl');
const xpBar = document.getElementById('xp-bar');
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const finalTimeEl = document.getElementById('finalTime');
const finalKillsEl = document.getElementById('finalKills');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');

const WIDTH = 600;
const HEIGHT = 600;
canvas.width = WIDTH;
canvas.height = HEIGHT;

// Game State
let isStarted = false;
let isGameOver = false;
let startTime = 0;
let kills = 0;
let level = 1;
let xp = 0;
let xpToNext = 100;
let frameCount = 0;

// Player
const player = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    size: 20,
    speed: 3,
    color: '#00ff41',
    hp: 100,
    maxHp: 100,
    atkCooldown: 40,
    atkTimer: 0
};

// Arrays
let enemies = [];
let bullets = [];
let particles = [];
let gems = [];

function init() {
    isStarted = true;
    isGameOver = false;
    startTime = Date.now();
    kills = 0;
    level = 1;
    xp = 0;
    xpToNext = 100;
    frameCount = 0;

    enemies = [];
    bullets = [];
    particles = [];
    gems = [];

    player.x = WIDTH / 2;
    player.y = HEIGHT / 2;
    player.hp = 100;
    player.atkCooldown = 40;

    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');

    updateUI();
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

    // Timer
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    timeEl.innerText = `${m}:${s}`;

    // Player Movement
    let mx = 0, my = 0;
    if (keys['KeyW'] || keys['ArrowUp']) my -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) my += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) mx += 1;

    if (mx !== 0 || my !== 0) {
        const angle = Math.atan2(my, mx);
        player.x += Math.cos(angle) * player.speed;
        player.y += Math.sin(angle) * player.speed;

        // Bounds
        player.x = Math.max(0, Math.min(WIDTH, player.x));
        player.y = Math.max(0, Math.min(HEIGHT, player.y));
    }

    // Auto Attack
    player.atkTimer--;
    if (player.atkTimer <= 0 && enemies.length > 0) {
        // Find nearest enemy
        let nearest = null;
        let minDist = Infinity;
        enemies.forEach(e => {
            const d = Math.hypot(e.x - player.x, e.y - player.y);
            if (d < minDist) {
                minDist = d;
                nearest = e;
            }
        });

        if (nearest) {
            const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
            bullets.push({
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * 7,
                vy: Math.sin(angle) * 7,
                life: 100
            });
            player.atkTimer = player.atkCooldown;
        }
    }

    // Bullets
    bullets.forEach((b, i) => {
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
        if (b.life <= 0 || b.x < 0 || b.x > WIDTH || b.y < 0 || b.y > HEIGHT) bullets.splice(i, 1);
    });

    // Enemies
    if (frameCount % Math.max(10, 60 - level * 2) === 0) {
        spawnEnemy();
    }

    enemies.forEach((e, i) => {
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;

        // Collision with bullet
        bullets.forEach((b, bi) => {
            if (Math.hypot(e.x - b.x, e.y - b.y) < 15) {
                e.hp -= 50;
                bullets.splice(bi, 1);
                createParticles(e.x, e.y, e.color, 3);
            }
        });

        if (e.hp <= 0) {
            kills++;
            gems.push({ x: e.x, y: e.y, xp: 20 });
            enemies.splice(i, 1);
            updateUI();
        }

        // Collision with player
        if (Math.hypot(e.x - player.x, e.y - player.y) < player.size) {
            player.hp -= 0.5;
            if (player.hp <= 0) gameOver();
        }
    });

    // Gems
    gems.forEach((g, i) => {
        const d = Math.hypot(g.x - player.x, g.y - player.y);
        if (d < 50) {
            const angle = Math.atan2(player.y - g.y, player.x - g.x);
            g.x += Math.cos(angle) * 5;
            g.y += Math.sin(angle) * 5;
        }
        if (d < 15) {
            xp += g.xp;
            gems.splice(i, 1);
            checkLevelUp();
        }
    });

    // Particles
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
    });
}

function spawnEnemy() {
    let x, y;
    if (Math.random() > 0.5) {
        x = Math.random() > 0.5 ? -20 : WIDTH + 20;
        y = Math.random() * HEIGHT;
    } else {
        x = Math.random() * WIDTH;
        y = Math.random() > 0.5 ? -20 : HEIGHT + 20;
    }

    enemies.push({
        x: x,
        y: y,
        speed: 1 + Math.random() * 0.5 + (level * 0.1),
        hp: 50 + (level * 10),
        color: '#ff0033'
    });
}

function checkLevelUp() {
    if (xp >= xpToNext) {
        xp -= xpToNext;
        level++;
        xpToNext = Math.floor(xpToNext * 1.2);
        player.hp = Math.min(player.hp + 20, player.maxHp);
        player.atkCooldown = Math.max(10, player.atkCooldown - 2);
        updateUI();
    }
    xpBar.style.width = (xp / xpToNext * 100) + '%';
}

function draw() {
    ctx.fillStyle = '#0c0c0c';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Grid Lines (Static)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let i = 0; i < WIDTH; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.lineTo(i, HEIGHT); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i); ctx.lineTo(WIDTH, i); ctx.stroke();
    }

    // Gems
    gems.forEach(g => {
        ctx.fillStyle = '#0088ff';
        ctx.fillRect(g.x - 3, g.y - 3, 6, 6);
    });

    // Bullets
    bullets.forEach(b => {
        ctx.fillStyle = '#fff';
        ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
        ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
        ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
        ctx.shadowBlur = 0;
    });

    // Enemies
    enemies.forEach(e => {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
        ctx.fill();
    });

    // Player
    ctx.fillStyle = player.hp < 30 && frameCount % 10 < 5 ? '#ff0000' : player.color;
    ctx.fillRect(player.x - 10, player.y - 10, 20, 20);
    // HP Bar on player
    ctx.fillStyle = '#333';
    ctx.fillRect(player.x - 15, player.y + 15, 30, 4);
    ctx.fillStyle = '#00ff41';
    ctx.fillRect(player.x - 15, player.y + 15, (player.hp / player.maxHp) * 30, 4);

    // Particles
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 2, 2);
    });
    ctx.globalAlpha = 1.0;
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1.0, color: color
        });
    }
}

function updateUI() {
    killsEl.innerText = kills;
    lvlEl.innerText = level;
}

function gameOver() {
    isGameOver = true;
    finalTimeEl.innerText = timeEl.innerText;
    finalKillsEl.innerText = kills;
    gameoverScreen.classList.remove('hidden');
}

// Input
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

startBtn.addEventListener('click', init);
retryBtn.addEventListener('click', init);

// Initial Bg
draw();
