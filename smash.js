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

const charSelectScreen = document.getElementById('char-select-screen');
const charGrid = document.getElementById('char-grid');
const startBattleBtn = document.getElementById('start-battle-btn');
const introOverlay = document.getElementById('intro-overlay');
const introText = document.getElementById('intro-text');
const canvasWrapper = document.querySelector('.canvas-wrapper');

let screenShakeTimer = 0;

// Player Configuration
let charConfigs = [];
for (let i = 0; i < 8; i++) {
    charConfigs.push({
        id: i + 1,
        type: i === 0 ? 'player' : (i < 4 ? 'cpu' : 'off'), // Default: 1 player, 3 CPUs
        color: COLORS[i]
    });
}

const CONTROL_SCHEMES = [
    { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', attack: 'Space', special: 'KeyZ' },
    { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', attack: 'KeyF', special: 'KeyG' },
    { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL', attack: 'KeyO', special: 'KeyP' },
    { up: 'Numpad8', down: 'Numpad5', left: 'Numpad4', right: 'Numpad6', attack: 'Numpad7', special: 'Numpad9' }
];
let items = [];
let projectiles = [];

class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.type = type;
        this.dy = 0;
        this.uses = type === 'gun' ? 6 : 1;
    }
    update() {
        this.dy += GRAVITY * 0.5;
        this.y += this.dy;
        stage.forEach(p => {
            if (this.dy > 0 && this.x < p.x + p.width && this.x + this.width > p.x && 
                this.y + this.height >= p.y && this.y + this.height - this.dy <= p.y + 10) {
                this.y = p.y - this.height;
                this.dy = 0;
            }
        });
        if (this.y > HEIGHT + 100) {
            const idx = items.indexOf(this);
            if (idx > -1) items.splice(idx, 1);
        }
    }
    render() { this.renderAt(this.x, this.y); }
    renderAt(x, y) {
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let icon = "🍄";
        if (this.type === 'gun') icon = "🔫";
        ctx.fillText(icon, x + this.width/2, y + this.height/2);
    }
}

class Projectile {
    constructor(x, y, dir, owner) {
        this.x = x;
        this.y = y;
        this.dx = dir * 12;
        this.width = 12;
        this.height = 4;
        this.owner = owner;
        this.life = 60;
    }
    update() {
        this.x += this.dx;
        this.life--;
        players.forEach(p => {
            if (p !== this.owner && p.lives > 0 && !p.invincible) {
                if (this.x < p.x + p.width && this.x + this.width > p.x &&
                    this.y < p.y + p.height && this.y + this.height > p.y) {
                    p.takeHit(Math.sign(this.dx), p.percent, 8, 1);
                    this.life = 0;
                }
            }
        });
    }
    draw() {
        ctx.fillStyle = "#fff";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "cyan";
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

// Keyboard State
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

class Player {
    constructor(id, x, y, color, type) {
        this.id = id;
        this.name = type === 'player' ? `P${id}` : CPU_NAMES[id - 1];
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 32;
        this.color = color;
        this.dx = 0;
        this.dy = 0;
        this.percent = 0;
        this.lives = parseInt(document.getElementById('stock-select').value) || 3;
        this.grounded = false;
        this.jumpCount = 0;
        this.facing = id % 2 === 0 ? -1 : 1;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackCooldown = 0;
        this.hitstun = 0;
        this.spawnX = x;
        this.spawnY = y;
        this.target = null;
        this.aiDecisionTimer = 0;
        this.isCPU = type === 'cpu';
        this.type = type;
        this.trails = [];
        this.upPressed = false;
        this.attackPressed = false;
        this.dropTimer = 0;
        
        // Item state
        this.heldItem = null;
        this.mushroomTimer = 0;
        this.sizeMult = 1;
        this.invincible = false;
        this.invincibleTimer = 0;
        
        // Ability stats
        this.speedMult = 1.0;
        this.rangeMult = 1.0;
        this.comboCount = 0;
        this.comboTimer = 0;
        
        if (this.color === '#0088ff') this.speedMult = 1.3; // Blue
        if (this.color === '#00ff88') this.rangeMult = 1.3; // Green
        if (this.color === '#00ffff') { this.speedMult = 1.15; this.rangeMult = 1.15; } // Cyan

        // Control scheme index
        const playersBefore = players.filter(p => p.type === 'player').length;
        this.controls = CONTROL_SCHEMES[playersBefore % CONTROL_SCHEMES.length];
    }

    update() {
        if (this.lives <= 0) return;

        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer === 0) this.comboCount = 0;
        }

        if (this.invincibleTimer > 0) {
            this.invincibleTimer--;
            if (this.invincibleTimer === 0) this.invincible = false;
        }

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

        this.dy += GRAVITY;
        this.x += this.dx;
        this.y += this.dy;

        // Apply item effects
        if (this.mushroomTimer > 0) {
            this.mushroomTimer--;
            this.sizeMult = 2;
            if (this.mushroomTimer === 0) {
                this.sizeMult = 1;
                this.width = 24; // Reset to original size
                this.height = 32; // Reset to original size
            } else {
                this.width = 24 * this.sizeMult;
                this.height = 32 * this.sizeMult;
            }
        }

        this.updateTrails();
        this.checkCollisions();
        this.checkBoundaries();

        if (this.attackTimer > 0) {
            this.attackTimer--;
            if (this.attackTimer === 0) this.isAttacking = false;
        }
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.dropTimer > 0) this.dropTimer--;
        
        this.checkItemPickup();
    }

    updateTrails() {
        if (Math.abs(this.dx) > 8 || Math.abs(this.dy) > 8) {
            this.trails.push({ x: this.x, y: this.y, life: 10 });
        }
        this.trails.forEach((t, i) => {
            t.life--;
            if (t.life <= 0) this.trails.splice(i, 1);
        });
    }

    handleInput() {
        if (isPaused) return;

        const currentMaxSpeed = MAX_SPEED * this.speedMult;

        if (keys[this.controls.left]) {
            this.dx = -currentMaxSpeed;
            this.facing = -1;
        } else if (keys[this.controls.right]) {
            this.dx = currentMaxSpeed;
            this.facing = 1;
        } else {
            this.dx *= FRICTION;
        }

        if (keys[this.controls.up] && !this.upPressed) {
            if (this.jumpCount < 2) {
                this.dy = JUMP_FORCE;
                this.jumpCount++;
                this.grounded = false;
            }
            this.upPressed = true;
        }
        if (!keys[this.controls.up]) this.upPressed = false;

        if (keys[this.controls.down]) {
            this.dropTimer = 10;
        }

        if ((keys[this.controls.attack] || (keys[this.controls.special] && this.heldItem)) && !this.attackPressed && this.attackCooldown <= 0) {
            this.performAttack();
            this.attackPressed = true;
        }
        if (!keys[this.controls.attack] && !keys[this.controls.special]) this.attackPressed = false;
    }

    handleAI() {
        this.aiDecisionTimer--;
        const difficulty = document.getElementById('difficulty-select').value;
        const mainPlatform = stage[0];
        
        let speedMult = 0.85;
        let reactionTime = 15;
        let attackCooldownBase = 35;
        
        if (difficulty === 'easy') {
            speedMult = 0.55;
            reactionTime = 35;
            attackCooldownBase = 60;
        } else if (difficulty === 'hard') {
            speedMult = 1.05;
            reactionTime = 6;
            attackCooldownBase = 15;
        }

        if (this.y > mainPlatform.y + 50 || this.x < 100 || this.x > 700) {
            const targetX = WIDTH / 2;
            const currentMaxSpeed = MAX_SPEED * this.speedMult;
            this.dx = (targetX > this.x ? 1 : -1) * currentMaxSpeed * speedMult;
            if (this.dy > 0 && this.jumpCount < 2) {
                 this.dy = JUMP_FORCE;
                 this.jumpCount++;
            }
        } else {
            if (this.aiDecisionTimer <= 0) {
                this.findTarget();
                this.aiDecisionTimer = reactionTime;
            }

            if (this.target && this.target.lives > 0) {
                const dist = this.target.x - this.x;
                const distY = this.target.y - this.y;
                this.facing = dist > 0 ? 1 : -1;
                
                const currentMaxSpeed = MAX_SPEED * this.speedMult;
                if (Math.abs(dist) > 40) {
                    this.dx = Math.sign(dist) * currentMaxSpeed * speedMult;
                } else {
                    this.dx *= FRICTION;
                    if (difficulty !== 'none' && this.attackCooldown <= 0) {
                        if (difficulty !== 'easy' || Math.random() < 0.4) {
                            this.performAttack();
                            this.attackCooldown = attackCooldownBase + Math.random() * 25;
                        }
                    }
                }

                if (distY < -50 && this.grounded) {
                    this.dy = JUMP_FORCE;
                    this.grounded = false;
                } else if (distY > 50 && this.grounded) {
                    const dropChance = difficulty === 'easy' ? 0.05 : (difficulty === 'hard' ? 0.4 : 0.2);
                    if (Math.random() < dropChance) {
                        this.dropTimer = 10;
                    }
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

    checkItemPickup() {
        if (this.heldItem) return;
        items.forEach((item, index) => {
            if (this.x < item.x + item.width && this.x + this.width > item.x &&
                this.y < item.y + item.height && this.y + this.height > item.y) {
                
                if (item.type === 'mushroom') {
                    this.mushroomTimer = 900; // 15 seconds
                    items.splice(index, 1);
                    createParticles(this.x + this.width/2, this.y + this.height/2, '#ff0000', 15);
                } else {
                    this.heldItem = item;
                    items.splice(index, 1);
                }
            }
        });
    }

    performAttack() {
        if (this.heldItem && this.heldItem.type === 'gun') {
            const bulletX = this.x + (this.facing > 0 ? this.width : -10);
            projectiles.push(new Projectile(bulletX, this.y + this.height/2, this.facing, this));
            this.attackCooldown = 20;
            // Gun uses
            this.heldItem.uses = (this.heldItem.uses || 5) - 1;
            if (this.heldItem.uses <= 0) this.heldItem = null;
            return;
        }

        this.isAttacking = true;
        this.attackTimer = 12;
        this.attackCooldown = 35 + Math.random() * 25;

        // Base HitBox
        let hbW = 35 * this.rangeMult;
        let hbH = (this.height + 20) * this.rangeMult;
        
        // Red: range increases with percent
        if (this.color === '#ff0055') {
            hbW += this.percent * 0.4;
            hbH += this.percent * 0.2;
        }

        const hitBox = {
            x: this.facing === 1 ? this.x + this.width : this.x - hbW,
            y: this.y - (hbH - this.height) / 2,
            width: hbW,
            height: hbH
        };

        // Damage calculation
        let damage = 7 + Math.floor(Math.random() * 6);
        let knockbackMult = 1;
        
        // Ability bonus
        if (this.color === '#ffaa00' && this.heldItem) damage *= 2; // Yellow
        if (this.color === '#aa00ff') damage *= (1 + this.comboCount * 0.5); // Purple

        if (this.mushroomTimer > 0) {
            damage *= 1.5;
            knockbackMult = 1.2;
        }

        let hitAny = false;
        players.forEach(p => {
            if (p !== this && p.lives > 0 && !p.invincible && this.checkHit(hitBox, p)) {
                p.takeHit(this.facing, this.percent, damage, knockbackMult);
                hitAny = true;
            }
        });

        if (hitAny) {
            if (this.color === '#ff00ff') this.percent = Math.max(0, this.percent - 1); // Pink heal
            if (this.color === '#aa00ff') { // Purple combo
                this.comboCount++;
                this.comboTimer = 120; // 2 seconds to keep combo
            }
        }
    }

    checkHit(box, target) {
        return box.x < target.x + target.width &&
               box.x + box.width > target.x &&
               box.y < target.y + target.height &&
               box.y + box.height > target.y;
    }

    takeHit(direction, attackerPercent, baseDamage, knockbackMult) {
        this.percent += baseDamage;
        this.hitstun = 18;
        const force = ((this.percent / 10) + 5) * knockbackMult;
        this.dx = direction * force;
        this.dy = -force * 0.5;
        createParticles(this.x + this.width/2, this.y + this.height/2, this.color);
        
        // Purple combo reset on hit
        if (this.color === '#aa00ff') {
            this.comboCount = 0;
            this.comboTimer = 0;
        }

        if (this.percent > 50) screenShakeTimer = 10;
        this.invincible = true;
        this.invincibleTimer = 30; // 0.5 seconds of invincibility
    }

    checkCollisions() {
        this.grounded = false;
        if (this.dropTimer > 0) return;
        
        stage.forEach(p => {
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
        if (this.lives > 0) this.respawn();
        else checkGameOver();
    }

    respawn() {
        this.x = WIDTH/2 - 50 + Math.random() * 100;
        this.y = -50;
        this.dx = 0;
        this.dy = 0;
        this.percent = 0;
        this.hitstun = 0;
        this.isAttacking = false;
        this.invincible = true;
        this.invincibleTimer = 120; // 2 seconds of invincibility after respawn
        this.heldItem = null;
        this.mushroomTimer = 0;
        this.sizeMult = 1;
        this.comboCount = 0;
        this.comboTimer = 0;
        this.width = 24;
        this.height = 32;
    }

    draw() {
        if (this.lives <= 0) return;

        ctx.save();
        
        if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.5;

        this.trails.forEach(t => {
            ctx.fillStyle = `rgba(${parseInt(this.color.slice(1,3),16)}, ${parseInt(this.color.slice(3,5),16)}, ${parseInt(this.color.slice(5,7),16)}, ${t.life/10})`;
            ctx.fillRect(t.x, t.y, this.width, this.height);
        });
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw combo UI for Purple
        if (this.color === '#aa00ff' && this.comboCount > 0) {
            ctx.fillStyle = "white";
            ctx.font = "bold 12px Arial";
            ctx.fillText(`${this.comboCount} COMBO!`, this.x + this.width/2, this.y - 10);
        }

        // Draw held item
        if (this.heldItem) {
            const ix = this.x + (this.facing > 0 ? this.width - 5 : -10);
            const iy = this.y + 10;
            this.heldItem.renderAt(ix, iy);
        }

        if (this.hitstun > 0) {
             ctx.strokeStyle = "white";
             ctx.lineWidth = 2;
             ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
        ctx.fillStyle = "black";
        const eyeX = this.facing === 1 ? this.x + 16 : this.x + 4;
        ctx.fillRect(eyeX, this.y + 6, 4, 4);
        if (this.isAttacking) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            const hitX = this.facing === 1 ? this.x + this.width : this.x - 35;
            ctx.fillRect(hitX, this.y - 10, 35, this.height + 20);
        }
        ctx.restore();
    }
}

const stage = [
    { x: 180, y: 340, width: 440, height: 40 },
    { x: 220, y: 240, width: 120, height: 15 },
    { x: 460, y: 240, width: 120, height: 15 },
    { x: 340, y: 150, width: 120, height: 15 }
];

let isPaused = true;

const ABILITY_DESCS = {
    "#ff0055": "赤: ダメージ%に応じて攻撃範囲拡大",
    "#0088ff": "青: 移動速度+30%",
    "#00ff88": "緑: 攻撃範囲+30%",
    "#ffaa00": "黄: アイテム保持時に攻撃力2倍",
    "#aa00ff": "紫: コンボボーナス(連続ヒットで攻撃力上昇)",
    "#00ffff": "水色: 移動速度・攻撃範囲+15%",
    "#ff00ff": "ピンク: 命中時にダメージ1%回復",
    "#ffffff": "白: 標準"
};

function renderCharSelect() {
    charGrid.innerHTML = '';
    charConfigs.forEach(config => {
        const slot = document.createElement('div');
        slot.className = `char-slot ${config.type !== 'off' ? 'active' : ''}`;
        slot.innerHTML = `
            <div class="char-preview" style="background: ${config.color}"></div>
            <div class="char-name">SLOT ${config.id}</div>
            <div class="ability-desc" style="font-size: 10px; margin-bottom: 5px; color: #aaa;">${ABILITY_DESCS[config.color]}</div>
            <div class="toggle-group">
                <button class="toggle-btn player ${config.type === 'player' ? 'active' : ''}">PLAYER</button>
                <button class="toggle-btn cpu ${config.type === 'cpu' ? 'active' : ''}">CPU</button>
                <button class="toggle-btn off ${config.type === 'off' ? 'active' : ''}">OFF</button>
            </div>
        `;

        slot.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = btn.classList.contains('player') ? 'player' : (btn.classList.contains('cpu') ? 'cpu' : 'off');
                
                // Enforce single player: if selecting player, switch existing player to cpu
                if (type === 'player') {
                    charConfigs.forEach(c => {
                        if (c.type === 'player') c.type = 'cpu';
                    });
                }
                
                config.type = type;
                renderCharSelect();
            });
        });

        charGrid.appendChild(slot);
    });
}

function init() {
    players = [];
    hudEl.innerHTML = '';
    isPaused = true;
    
    charConfigs.forEach(config => {
        if (config.type === 'off') return;
        
        const x = 200 + Math.random() * 400;
        const y = 200;
        const p = new Player(config.id, x, y, config.color, config.type);
        players.push(p);

        const stat = document.createElement('div');
        stat.className = `player-stats p${config.id}`;
        stat.id = `p-stat-${config.id}`;
        stat.style.borderColor = config.color;
        const label = config.type === 'player' ? `P${config.id}` : `CPU ${config.id}`;
        stat.innerHTML = `
            <div class="p-name">${label}</div>
            <div class="percent">0%</div>
            <div class="lives">❤❤❤</div>
        `;
        hudEl.appendChild(stat);
    });
    
    // Adjust grid columns based on player count
    hudEl.style.gridTemplateColumns = `repeat(${Math.min(4, players.length)}, 1fr)`;
    
    isStarted = true;
    isGameOver = false;
    startScreen.classList.add('hidden');
    charSelectScreen.classList.add('hidden');
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
    
    // Spawn items
    if (frameCount % 420 === 0 && items.length < 4) {
        const types = ['mushroom', 'gun'];
        const type = types[Math.floor(Math.random() * types.length)];
        items.push(new Item(100 + Math.random() * (WIDTH - 200), -50, type));
    }
    
    items.forEach(item => item.update());
    projectiles.forEach((proj, i) => {
        proj.update();
        if (proj.life <= 0) projectiles.splice(i, 1);
    });

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
    players.forEach(p => {
        const el = document.getElementById(`p-stat-${p.id}`);
        if (!el) return;
        const percentEl = el.querySelector('.percent');
        const livesEl = el.querySelector('.lives');
        const oldPercent = parseInt(percentEl.textContent);
        percentEl.textContent = `${p.percent}%`;
        
        if (p.lives > 5) {
            livesEl.textContent = `❤ x ${p.lives}`;
        } else {
            livesEl.textContent = "❤".repeat(Math.max(0, p.lives));
        }
        
        if (p.lives <= 0) {
            el.classList.add('eliminated');
            livesEl.textContent = "KO";
        }
        if (p.percent > oldPercent) {
             percentEl.style.transform = "scale(1.3)";
             setTimeout(() => percentEl.style.transform = "scale(1)", 100);
        }
        const r = 255;
        const g = Math.max(0, 255 - p.percent * 2);
        const b = Math.max(0, 255 - p.percent * 3);
        percentEl.style.color = `rgb(${r}, ${g}, ${b})`;
    });
}

function draw() {
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const rad = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, 50, WIDTH/2, HEIGHT/2, 400);
    rad.addColorStop(0, "rgba(30, 30, 60, 0.2)");
    rad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    stage.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? "#1a1a1a" : "#333";
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeStyle = i === 0 ? "#444" : "#666";
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.width, p.height);
        ctx.beginPath();
        ctx.strokeStyle = i === 0 ? "#ff005544" : "#0088ff44";
        ctx.moveTo(p.x, p.y + p.height);
        ctx.lineTo(p.x + p.width, p.y + p.height);
        ctx.stroke();
    });
    
    items.forEach(item => item.render());
    projectiles.forEach(proj => proj.draw());
    players.forEach(p => p.draw());
    
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
}

function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
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
    } else if (alive.length === 0) {
        isGameOver = true;
        winnerText.textContent = "DRAW!";
        winnerText.style.color = "white";
        gameoverScreen.classList.remove('hidden');
    }
}

startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    charSelectScreen.classList.remove('hidden');
    renderCharSelect();
});

startBattleBtn.addEventListener('click', () => {
    const active = charConfigs.filter(c => c.type !== 'off');
    if (active.length < 2) {
        alert("Select at least 2 characters to battle!");
        return;
    }
    init();
});

retryBtn.addEventListener('click', () => {
    gameoverScreen.classList.add('hidden');
    charSelectScreen.classList.remove('hidden');
    renderCharSelect();
});
