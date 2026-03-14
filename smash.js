const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const WIDTH = 800;
const HEIGHT = 500;
canvas.width = WIDTH;
canvas.height = HEIGHT;

const GRAVITY = 0.4;
const FRICTION = 0.8;
const MAX_SPEED = 6;
const JUMP_FORCE = -11;
const BLAST_ZONE_OFFSET = 150;

// Game State
let isStarted = false;
let isGameOver = false;
let frameCount = 0;

const p1PercentEl = document.getElementById('p1-percent');
const p2PercentEl = document.getElementById('p2-percent');
const p1LivesEl = document.getElementById('p1-lives');
const p2LivesEl = document.getElementById('p2-lives');
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const winnerText = document.getElementById('winner-text');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');

class Player {
    constructor(x, y, color, controls, id) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 40;
        this.color = color;
        this.dx = 0;
        this.dy = 0;
        this.percent = 0;
        this.lives = 3;
        this.grounded = false;
        this.jumpCount = 0;
        this.controls = controls;
        this.facing = id === 1 ? 1 : -1; // 1 for right, -1 for left
        this.isAttacking = false;
        this.attackTimer = 0;
        this.hitstun = 0;
        this.spawnX = x;
        this.spawnY = y;
    }

    update(keys) {
        if (this.hitstun > 0) {
            this.hitstun--;
            this.dy += GRAVITY;
            this.x += this.dx;
            this.y += this.dy;
            this.checkBoundaries();
            return;
        }

        // Horizontal movement
        if (keys[this.controls.left]) {
            this.dx = -MAX_SPEED;
            this.facing = -1;
        } else if (keys[this.controls.right]) {
            this.dx = MAX_SPEED;
            this.facing = 1;
        } else {
            this.dx *= FRICTION;
        }

        // Jump
        if (keys[this.controls.up] && !this.upPressed) {
            if (this.jumpCount < 2) {
                this.dy = JUMP_FORCE;
                this.jumpCount++;
                this.grounded = false;
            }
            this.upPressed = true;
        }
        if (!keys[this.controls.up]) this.upPressed = false;

        // Attack
        if ((keys[this.controls.attack] || keys[this.controls.attack2]) && !this.attackPressed && !this.isAttacking) {
            this.performAttack();
            this.attackPressed = true;
        }
        if (!keys[this.controls.attack] && !keys[this.controls.attack2]) this.attackPressed = false;

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
    }

    performAttack() {
        this.isAttacking = true;
        this.attackTimer = 20;

        // Hit detection
        const opponent = this.id === 1 ? p2 : p1;
        const hitBox = {
            x: this.facing === 1 ? this.x + this.width : this.x - 40,
            y: this.y,
            width: 40,
            height: this.height
        };

        if (this.checkHit(hitBox, opponent)) {
            opponent.takeHit(this.facing, this.percent);
        }
    }

    checkHit(box, target) {
        return box.x < target.x + target.width &&
               box.x + box.width > target.x &&
               box.y < target.y + target.height &&
               box.y + box.height > target.y;
    }

    takeHit(direction, attackerPercent) {
        this.percent += 10;
        this.hitstun = 20;
        
        // Knockback formula
        const force = (this.percent / 10) + 5;
        this.dx = direction * force;
        this.dy = -force * 0.5;
        
        createParticles(this.x + this.width/2, this.y + this.height/2, this.color);
    }

    checkCollisions() {
        this.grounded = false;
        stage.forEach(p => {
            if (this.dx > 0 && this.x + this.width >= p.x && this.x < p.x && this.y + this.height > p.y && this.y < p.y + p.height) {
                this.x = p.x - this.width;
                this.dx = 0;
            } else if (this.dx < 0 && this.x <= p.x + p.width && this.x + this.width > p.x + p.width && this.y + this.height > p.y && this.y < p.y + p.height) {
                this.x = p.x + p.width;
                this.dx = 0;
            }

            if (this.dy > 0 && this.x < p.x + p.width && this.x + this.width > p.x && this.y + this.height >= p.y && this.y < p.y) {
                this.y = p.y - this.height;
                this.dy = 0;
                this.grounded = true;
                this.jumpCount = 0;
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
        if (this.lives <= 0) {
            endGame(this.id === 1 ? 2 : 1);
        } else {
            this.respawn();
        }
    }

    respawn() {
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.dx = 0;
        this.dy = 0;
        this.percent = 0;
        this.hitstun = 0;
        this.isAttacking = false;
    }

    draw() {
        // Draw player
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // Draw selection highlight if hitstun
        if (this.hitstun > 0) {
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
        }

        // Draw attack box
        if (this.isAttacking) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            const hitX = this.facing === 1 ? this.x + this.width : this.x - 40;
            ctx.fillRect(hitX, this.y, 40, this.height);
        }
    }
}

// Stage Definition
const stage = [
    { x: 200, y: 300, width: 400, height: 40 } // Main platform
];

// Instances
let p1, p2;
const keys = {};

function init() {
    p1 = new Player(250, 200, "#ff0055", { up: "KeyW", left: "KeyA", right: "KeyD", attack: "KeyF", attack2: "KeyG" }, 1);
    p2 = new Player(520, 200, "#0088ff", { up: "ArrowUp", left: "ArrowLeft", right: "ArrowRight", attack: "KeyK", attack2: "KeyL" }, 2);
    
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
    p1.update(keys);
    p2.update(keys);
    updateHUD();

    // Particle update
    particles.forEach((p, i) => {
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    });
}

function updateHUD() {
    p1PercentEl.textContent = `${p1.percent}%`;
    p2PercentEl.textContent = `${p2.percent}%`;
    p1LivesEl.textContent = "❤".repeat(p1.lives);
    p2LivesEl.textContent = "❤".repeat(p2.lives);

    // Color scaling for percent
    p1PercentEl.style.color = `rgb(255, ${Math.max(0, 255 - p1.percent*2)}, ${Math.max(0, 255 - p1.percent*2)})`;
    p2PercentEl.style.color = `rgb(255, ${Math.max(0, 255 - p2.percent*2)}, ${Math.max(0, 255 - p2.percent*2)})`;
}

function draw() {
    // Clear
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Grid lines for "tech" feel
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    for (let i = 0; i < WIDTH; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, HEIGHT); ctx.stroke();
    }
    for (let i = 0; i < HEIGHT; i += 50) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(WIDTH, i); ctx.stroke();
    }

    // Draw Stage
    ctx.fillStyle = "#333";
    stage.forEach(p => {
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = "#444";
        ctx.strokeRect(p.x, p.y, p.width, p.height);
    });

    // Draw Players
    p1.draw();
    p2.draw();

    // Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
}

// Particle System
const particles = [];
function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            dx: (Math.random() - 0.5) * 10,
            dy: (Math.random() - 0.5) * 10,
            size: Math.random() * 5 + 2,
            life: 20,
            color: color
        });
    }
}

function endGame(winner) {
    isGameOver = true;
    winnerText.textContent = winner === 1 ? "PLAYER 1 WINS!" : "PLAYER 2 WINS!";
    winnerText.style.color = winner === 1 ? "#ff0055" : "#0088ff";
    gameoverScreen.classList.remove('hidden');
}

// Event Listeners
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

startBtn.addEventListener('click', init);
retryBtn.addEventListener('click', init);
