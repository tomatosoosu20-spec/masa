const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const WIDTH = 800;
const HEIGHT = 500;
canvas.width = WIDTH;
canvas.height = HEIGHT;

const GRAVITY = 0.4;
const FRICTION = 0.82;
const MAX_SPEED = 5;
const JUMP_FORCE = -11;
const BLAST_ZONE_OFFSET = 180;

// Game State
let isStarted = false;
let isGameOver = false;
let frameCount = 0;
let players = [];
const particles = [];

const hudEl = document.getElementById('hud');
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const winnerText = document.getElementById('winner-text');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');

const COLORS = [
    "#ff0055", "#0088ff", "#00ff88", "#ffaa00",
    "#aa00ff", "#00ffff", "#ff00ff", "#ffffff"
];

const CPU_NAMES = ["STRIKER", "GHOST", "BLADE", "CRINGE", "ALPHA", "OMEGA", "NEON", "PRIME"];

const introOverlay = document.getElementById('intro-overlay');
const introText = document.getElementById('intro-text');
const canvasWrapper = document.querySelector('.canvas-wrapper');

let screenShakeTimer = 0;

// Keyboard State
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

class Player {
    constructor(id, x, y, color) {
        this.id = id;
        this.name = id === 1 ? "YOU" : CPU_NAMES[id - 1];
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 32;
        this.color = color;
        this.dx = 0;
        this.dy = 0;
        this.percent = 0;
        this.lives = 3;
        this.grounded = false;
        this.jumpCount = 0;
        this.facing = id === 1 ? 1 : (Math.random() > 0.5 ? 1 : -1);
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.hitstun = 0;
        this.spawnX = x;
        this.spawnY = y;
        this.target = null;
        this.aiDecisionTimer = 0;
        this.isCPU = id !== 1; // Only the first character is NOT a CPU
        this.trails = [];
        this.upPressed = false;
        this.attackPressed = false;
    }

    update() {
        if (this.lives <= 0) return;

        // Trail effect when fast
        if (Math.abs(this.dx) > 8 || Math.abs(this.dy) > 8) {
            this.trails.push({ x: this.x, y: this.y, life: 10 });
        }
        this.trails.forEach((t, i) => {
            t.life--;
            if (t.life <= 0) this.trails.splice(i, 1);
        });

        if (this.hitstun > 0) {
            this.hitstun--;
            this.dy += GRAVITY;
            this.x += this.dx;
            this.y += this.dy;
            this.checkBoundaries();
            return;
        }

        if (this.isCPU) {
            if (isStarted && !isPaused) this.handleAI();
        } else {
            this.handleInput();
        }

        // Gravity
        this.dy += GRAVITY;

        // Apply velocities
        this.x += this.dx;
        this.y += this.dy;

        this.checkCollisions();
        this.checkBoundaries();

        if (this.attackTimer > 0) {
            this.attackTimer--;
            if (this.attackTimer === 0) this.isAttacking = false;
        }
        if (this.attackCooldown > 0) this.attackCooldown--;
    }

    handleInput() {
        if (isPaused) return;

        // Horizontal Movement
        if (keys['KeyA'] || keys['ArrowLeft']) {
            this.dx = -MAX_SPEED;
            this.facing = -1;
        } else if (keys['KeyD'] || keys['ArrowRight']) {
            this.dx = MAX_SPEED;
            this.facing = 1;
        } else {
            this.dx *= FRICTION;
        }

        // Jump (WASD or Arrows)
        if ((keys['KeyW'] || keys['ArrowUp']) && !this.upPressed) {
            if (this.jumpCount < 2) {
                this.dy = JUMP_FORCE;
                this.jumpCount++;
                this.grounded = false;
            }
            this.upPressed = true;
        }
        if (!keys['KeyW'] && !keys['ArrowUp']) this.upPressed = false;

        // Attack (F or Space)
        if ((keys['KeyF'] || keys['Space']) && !this.attackPressed && this.attackCooldown <= 0) {
            this.performAttack();
            this.attackPressed = true;
        }
        if (!keys['KeyF'] && !keys['Space']) this.attackPressed = false;
    }

    handleAI() {
        this.aiDecisionTimer--;
        
        // Better Recovery Logic
        const mainPlatform = stage[0];
        
        if (this.y > mainPlatform.y + 50 || this.x < 100 || this.x > 700) {
            // Priority: Get back to stage
            const targetX = WIDTH / 2;
            this.dx = (targetX > this.x ? 1 : -1) * MAX_SPEED * 0.9;
            
            if (this.dy > 0 && this.jumpCount < 2) {
                 this.dy = JUMP_FORCE;
                 this.jumpCount++;
            }
        } else {
            // Combat logic
            if (this.aiDecisionTimer <= 0) {
                this.findTarget();
                this.aiDecisionTimer = 15;
            }

            if (this.target && this.target.lives > 0) {
                const dist = this.target.x - this.x;
                const distY = this.target.y - this.y;
                this.facing = dist > 0 ? 1 : -1;
                
                if (Math.abs(dist) > 40) {
                    this.dx = Math.sign(dist) * MAX_SPEED * 0.85;
                } else {
                    this.dx *= FRICTION;
                    if (this.attackCooldown <= 0) this.performAttack();
                }

                // Jump if target is higher
                if (distY < -50 && this.grounded) {
                    this.dy = JUMP_FORCE;
                    this.grounded = false;
                }
            } else {
                this.dx *= FRICTION;
            }
        }
    }

    findTarget() {
        let minDist = Infinity;
        let closest = null;
        players.forEach(p => {
            if (p !== this && p.lives > 0) {
                const d = Math.sqrt((p.x-this.x)**2 + (p.y-this.y)**2);
                if (d < minDist) {
                    minDist = d;
                    closest = p;
                }
            }
        });
        this.target = closest;
    }

    performAttack() {
        this.isAttacking = true;
        this.attackTimer = 12;
        this.attackCooldown = 35 + Math.random() * 25;

        const hitBox = {
            x: this.facing === 1 ? this.x + this.width : this.x - 35,
            y: this.y - 10,
            width: 35,
            height: this.height + 20
        };

        players.forEach(p => {
            if (p !== this && p.lives > 0 && this.checkHit(hitBox, p)) {
                p.takeHit(this.facing, this.percent);
            }
        });
    }

    checkHit(box, target) {
        return box.x < target.x + target.width &&
               box.x + box.width > target.x &&
               box.y < target.y + target.height &&
               box.y + box.height > target.y;
    }

    takeHit(direction, attackerPercent) {
        this.percent += 7 + Math.floor(Math.random() * 6);
        this.hitstun = 18;
        
        const force = (this.percent / 10) + 5;
        this.dx = direction * force;
        this.dy = -force * 0.5;
        
        createParticles(this.x + this.width/2, this.y + this.height/2, this.color);
        
        // Shake screen on heavy hits
        if (this.percent > 50) {
            screenShakeTimer = 10;
        }
    }

    checkCollisions() {
        this.grounded = false;
        stage.forEach(p => {
            // Standard platform logic
            if (this.dy > 0 && this.x < p.x + p.width && this.x + this.width > p.x && 
                this.y + this.height >= p.y && this.y + this.height - this.dy <= p.y + 10) {
                this.y = p.y - this.height;
                this.dy = 0;
                this.grounded = true;
                this.jumpCount = 0;
                this.dx *= FRICTION;
            }
        });
    }

    checkBoundaries() {
        if (this.x < -BLAST_ZONE_OFFSET || this.x > WIDTH + BLAST_ZONE_OFFSET || 
            this.y < -BLAST_ZONE_OFFSET || this.y > HEIGHT + BLAST_ZONE_OFFSET) {
            this.loseLife();
        }
    }

    loseLife() {
        this.lives--;
        screenShakeTimer = 20;
        canvasWrapper.classList.add('ko-flash');
        setTimeout(() => canvasWrapper.classList.remove('ko-flash'), 500);

        createExplosion(this.x, this.y, this.color);
        if (this.lives > 0) {
            this.respawn();
        } else {
            checkGameOver();
        }
    }

    respawn() {
        this.x = WIDTH/2 - 50 + Math.random() * 100;
        this.y = -50;
        this.dx = 0;
        this.dy = 0;
        this.percent = 0;
        this.hitstun = 0;
        this.isAttacking = false;
    }

    draw() {
        if (this.lives <= 0) return;

        // Draw trails
        this.trails.forEach(t => {
            ctx.fillStyle = `rgba(${parseInt(this.color.slice(1,3),16)}, ${parseInt(this.color.slice(3,5),16)}, ${parseInt(this.color.slice(5,7),16)}, ${t.life/10})`;
            ctx.fillRect(t.x, t.y, this.width, this.height);
        });

        // Draw player body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Glow effect for hitstun
        if (this.hitstun > 0) {
             ctx.strokeStyle = "white";
             ctx.lineWidth = 2;
             ctx.strokeRect(this.x, this.y, this.width, this.height);
        }

        // Simple eyes
        ctx.fillStyle = "black";
        const eyeX = this.facing === 1 ? this.x + 16 : this.x + 4;
        ctx.fillRect(eyeX, this.y + 6, 4, 4);

        // Attack visual
        if (this.isAttacking) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            const hitX = this.facing === 1 ? this.x + this.width : this.x - 35;
            ctx.fillRect(hitX, this.y - 10, 35, this.height + 20);
        }
    }
}

// Battlefield Stage
const stage = [
    { x: 180, y: 340, width: 440, height: 40 }, // Main
    { x: 220, y: 240, width: 120, height: 15 }, // Platform L
    { x: 460, y: 240, width: 120, height: 15 }, // Platform R
    { x: 340, y: 150, width: 120, height: 15 }  // Platform TOP
];

let isPaused = true;

function init() {
    players = [];
    hudEl.innerHTML = '';
    isPaused = true;
    
    for (let i = 0; i < 8; i++) {
        const x = 250 + (i % 4) * 80;
        const y = 200;
        const p = new Player(i + 1, x, y, COLORS[i]);
        players.push(p);

        const stat = document.createElement('div');
        stat.className = `player-stats p${i+1}`;
        stat.id = `p-stat-${i+1}`;
        stat.style.borderColor = COLORS[i];
        stat.innerHTML = `
            <div class="p-name">${p.name}</div>
            <div class="percent">0%</div>
            <div class="lives">❤❤❤</div>
        `;
        hudEl.appendChild(stat);
    }
    
    isStarted = true;
    isGameOver = false;
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    
    startCountdown();
    loop();
}

function startCountdown() {
    introOverlay.classList.remove('hidden');
    introText.textContent = "READY?";
    introText.style.color = "white";
    setTimeout(() => {
        introText.classList.add('active');
        setTimeout(() => {
            introText.classList.remove('active');
            setTimeout(() => {
                introText.textContent = "GO!";
                introText.style.color = "#ffdd00";
                introText.classList.add('active');
                isPaused = false;
                setTimeout(() => {
                    introOverlay.classList.add('hidden');
                    introText.classList.remove('active');
                }, 800);
            }, 200);
        }, 800);
    }, 100);
}

function loop() {
    if (isGameOver) return;
    update();
    draw();
    frameCount++;
    requestAnimationFrame(loop);
}

function update() {
    players.forEach(p => p.update());
    updateHUD();

    if (screenShakeTimer > 0) {
        screenShakeTimer--;
        canvasWrapper.classList.add('shake');
    } else {
        canvasWrapper.classList.remove('shake');
    }

    particles.forEach((p, i) => {
        p.x += p.dx; p.y += p.dy; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    });
}

function updateHUD() {
    players.forEach((p, i) => {
        const el = document.getElementById(`p-stat-${i+1}`);
        if (!el) return;
        const percentEl = el.querySelector('.percent');
        const livesEl = el.querySelector('.lives');
        
        const oldPercent = parseInt(percentEl.textContent);
        percentEl.textContent = `${p.percent}%`;
        livesEl.textContent = "❤".repeat(p.lives);
        
        if (p.lives <= 0) {
            el.classList.add('eliminated');
            livesEl.textContent = "KO";
        }

        if (p.percent > oldPercent) {
             percentEl.style.transform = "scale(1.3)";
             setTimeout(() => percentEl.style.transform = "scale(1)", 100);
        }

        // Dynamic color
        const r = 255;
        const g = Math.max(0, 255 - p.percent * 2);
        const b = Math.max(0, 255 - p.percent * 3);
        percentEl.style.color = `rgb(${r}, ${g}, ${b})`;
    });
}

function draw() {
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Background Atmosphere
    const rad = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, 50, WIDTH/2, HEIGHT/2, 400);
    rad.addColorStop(0, "rgba(30, 30, 60, 0.2)");
    rad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Stage
    ctx.fillStyle = "#222";
    stage.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? "#1a1a1a" : "#333";
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = i === 0 ? "#444" : "#666";
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.width, p.height);
        
        // Platform underline glow
        ctx.beginPath();
        ctx.strokeStyle = i === 0 ? "#ff005544" : "#0088ff44";
        ctx.moveTo(p.x, p.y + p.height);
        ctx.lineTo(p.x + p.width, p.y + p.height);
        ctx.stroke();
    });

    players.forEach(p => p.draw());
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
}

function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x, y, dx: (Math.random()-0.5)*12, dy: (Math.random()-0.5)*12,
            size: Math.random()*4+1, life: 20, color
        });
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 30; i++) {
        particles.push({
            x, y, dx: (Math.random()-0.5)*20, dy: (Math.random()-0.5)*20,
            size: Math.random()*8+2, life: 40, color
        });
    }
}

function checkGameOver() {
    const alive = players.filter(p => p.lives > 0);
    if (alive.length === 1) {
        isGameOver = true;
        winnerText.textContent = `${alive[0].name} WINS!`;
        winnerText.style.color = alive[0].color;
        gameoverScreen.classList.remove('hidden');
    }
}

startBtn.addEventListener('click', init);
retryBtn.addEventListener('click', init);
