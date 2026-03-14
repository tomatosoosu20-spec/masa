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

class Player {
    constructor(id, x, y, color) {
        this.id = id;
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
        this.facing = Math.random() > 0.5 ? 1 : -1;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.hitstun = 0;
        this.spawnX = x;
        this.spawnY = y;
        this.target = null;
        this.aiDecisionTimer = 0;
        this.isCPU = true;
    }

    update() {
        if (this.lives <= 0) return;

        if (this.hitstun > 0) {
            this.hitstun--;
            this.dy += GRAVITY;
            this.x += this.dx;
            this.y += this.dy;
            this.checkBoundaries();
            return;
        }

        if (this.isCPU) {
            this.handleAI();
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

    handleAI() {
        this.aiDecisionTimer--;
        
        // Basic Recovery Logic
        const centerX = WIDTH / 2;
        const mainPlatform = stage[0];
        
        if (this.y > mainPlatform.y || this.x < 150 || this.x > 650) {
            // Out of position or falling, try to recover
            if (this.x < mainPlatform.x) this.dx = MAX_SPEED * 0.8;
            else if (this.x > mainPlatform.x + mainPlatform.width) this.dx = -MAX_SPEED * 0.8;
            
            if (this.dy > 0 && this.jumpCount < 2) {
                 this.dy = JUMP_FORCE;
                 this.jumpCount++;
            }
        } else {
            // Normal Battle Logic
            if (this.aiDecisionTimer <= 0) {
                this.findTarget();
                this.aiDecisionTimer = 10 + Math.random() * 20;
            }

            if (this.target && this.target.lives > 0) {
                const dist = this.target.x - this.x;
                this.facing = dist > 0 ? 1 : -1;
                
                if (Math.abs(dist) > 50) {
                    this.dx = Math.sign(dist) * MAX_SPEED * 0.8;
                } else {
                    this.dx *= FRICTION;
                    if (this.attackCooldown <= 0) this.performAttack();
                }

                // Randomly jump
                if (Math.random() < 0.02 && this.grounded) {
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
                const d = Math.abs(p.x - this.x);
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
        this.attackTimer = 15;
        this.attackCooldown = 40 + Math.random() * 30;

        const hitBox = {
            x: this.facing === 1 ? this.x + this.width : this.x - 30,
            y: this.y - 5,
            width: 30,
            height: this.height + 10
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
        this.percent += 8 + Math.floor(Math.random() * 5);
        this.hitstun = 15;
        
        const force = (this.percent / 12) + 4;
        this.dx = direction * force;
        this.dy = -force * 0.6;
        
        createParticles(this.x + this.width/2, this.y + this.height/2, this.color);
    }

    checkCollisions() {
        this.grounded = false;
        stage.forEach(p => {
            if (this.dy > 0 && this.x < p.x + p.width && this.x + this.width > p.x && 
                this.y + this.height >= p.y && this.y + this.height - this.dy <= p.y) {
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
        createExplosion(this.x, this.y, this.color);
        if (this.lives > 0) {
            this.respawn();
        } else {
            checkGameOver();
        }
    }

    respawn() {
        this.x = WIDTH/2 - 100 + Math.random() * 200;
        this.y = 0;
        this.dx = 0;
        this.dy = 0;
        this.percent = 0;
        this.hitstun = 0;
        this.isAttacking = false;
    }

    draw() {
        if (this.lives <= 0) return;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Attack visual
        if (this.isAttacking) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            const hitX = this.facing === 1 ? this.x + this.width : this.x - 30;
            ctx.fillRect(hitX, this.y - 5, 30, this.height + 10);
        }
    }
}

const stage = [
    { x: 200, y: 320, width: 400, height: 30 }
];

function init() {
    players = [];
    hudEl.innerHTML = '';
    
    for (let i = 0; i < 8; i++) {
        const x = 250 + (i % 4) * 80;
        const y = 150;
        const p = new Player(i + 1, x, y, COLORS[i]);
        players.push(p);

        // Create HUD element
        const stat = document.createElement('div');
        stat.className = `player-stats p${i+1}`;
        stat.id = `p-stat-${i+1}`;
        stat.style.borderColor = COLORS[i];
        stat.innerHTML = `
            <div class="p-name">CPU ${i+1}</div>
            <div class="percent">0%</div>
            <div class="lives">❤❤❤</div>
        `;
        hudEl.appendChild(stat);
    }
    
    isStarted = true;
    isGameOver = false;
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    loop();
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
        
        percentEl.textContent = `${p.percent}%`;
        livesEl.textContent = "❤".repeat(p.lives);
        
        if (p.lives <= 0) {
            el.classList.add('eliminated');
            livesEl.textContent = "KO";
        }

        // Color intensity
        percentEl.style.color = `rgb(255, ${Math.max(50, 255 - p.percent*1.5)}, ${Math.max(50, 255 - p.percent*2)})`;
    });
}

function draw() {
    ctx.fillStyle = "#0c0c14";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Tech grid
    ctx.strokeStyle = "#1a1a2b";
    ctx.lineWidth = 1;
    for (let i = 0; i < WIDTH; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, HEIGHT); ctx.stroke();
    }
    for (let i = 0; i < HEIGHT; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(WIDTH, i); ctx.stroke();
    }

    // Stage
    ctx.fillStyle = "#222";
    stage.forEach(p => {
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = "#444";
        ctx.strokeRect(p.x, p.y, p.width, p.height);
        // Stage glow
        ctx.shadowBlur = 10; ctx.shadowColor = "#333";
        ctx.strokeRect(p.x, p.y, p.width, p.height);
        ctx.shadowBlur = 0;
    });

    players.forEach(p => p.draw());
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
}

function createParticles(x, y, color) {
    for (let i = 0; i < 6; i++) {
        particles.push({
            x, y, dx: (Math.random()-0.5)*8, dy: (Math.random()-0.5)*8,
            size: Math.random()*3+1, life: 15, color
        });
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push({
            x, y, dx: (Math.random()-0.5)*15, dy: (Math.random()-0.5)*15,
            size: Math.random()*6+2, life: 30, color
        });
    }
}

function checkGameOver() {
    const alive = players.filter(p => p.lives > 0);
    if (alive.length === 1) {
        isGameOver = true;
        winnerText.textContent = `CPU ${alive[0].id} WINS!`;
        winnerText.style.color = alive[0].color;
        gameoverScreen.classList.remove('hidden');
    } else if (alive.length === 0) {
        isGameOver = true;
        winnerText.textContent = `DRAW!`;
        winnerText.style.color = "white";
        gameoverScreen.classList.remove('hidden');
    }
}

startBtn.addEventListener('click', init);
retryBtn.addEventListener('click', init);
