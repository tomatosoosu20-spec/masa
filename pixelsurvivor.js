const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timeEl = document.getElementById('time');
const killsEl = document.getElementById('kills');
const lvlEl = document.getElementById('lvl');
const xpBar = document.getElementById('xp-bar');
const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const levelupScreen = document.getElementById('levelup-screen');
const victoryScreen = document.getElementById('victory-screen');
const upgradeChoicesContainer = document.getElementById('upgrade-choices');
const finalTimeEl = document.getElementById('finalTime');
const finalKillsEl = document.getElementById('finalKills');
const victoryTimeEl = document.getElementById('victoryTime');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');
const nextStageBtn = document.getElementById('nextStageBtn');
const reviveBtn = document.getElementById('reviveBtn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseScreen = document.getElementById('pause-screen');
const pauseTimeEl = document.getElementById('pause-time');
const pauseInventoryEl = document.getElementById('pause-inventory');

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
let isPaused = false;
let magnetRange = 50;
let bossSpawned = false;
let finalBossSpawned = false;
let isVictory = false;
let bossProjectiles = [];
let currentStage = 1;

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
    atkTimer: 0,
    atkDamage: 50,
    moveSpeedMult: 1,
    inventory: [],
    lastDirX: 1,
    lastDirY: 0,
    robotBTimer: 0
};

// Arrays
let enemies = [];
let bullets = [];
let particles = [];
let gems = [];
let orbitals = []; // Knife orbit
let circularBlasts = []; // Robot A blast
let robotBProjectiles = []; // Robot B projectiles
let damageNumbers = []; // Floating numbers

function init(isNextStage = false) {
    isStarted = true;
    isGameOver = false;
    startTime = Date.now();
    
    // Reset or carry over
    if (!isNextStage) {
        currentStage = 1;
        kills = 0;
        level = 1;
        xp = 0;
        xpToNext = 100;
        player.inventory = ['pistol'];
        player.hp = 100;
        player.maxHp = 100;
        player.moveSpeedMult = 1;
        player.atkDamage = 50;
        magnetRange = 50;
    } else {
        // Heal 30% on stage up
        player.hp = Math.min(player.maxHp, player.hp + (player.maxHp * 0.3));
    }
    
    frameCount = 0;

    enemies = [];
    bullets = [];
    particles = [];
    gems = [];
    orbitals = [];
    circularBlasts = [];
    damageNumbers = [];
    bossSpawned = false;
    finalBossSpawned = false;
    isVictory = false;
    bossProjectiles = [];
    robotBProjectiles = [];
    player.inventory = [];

    // Spawn 4 initial gems at random locations
    for (let i = 0; i < 4; i++) {
        gems.push({
            x: Math.random() * WIDTH,
            y: Math.random() * HEIGHT,
            xp: 20
        });
    }
    player.moveSpeedMult = 1;
    player.atkDamage = 50;
    magnetRange = 50;

    player.x = WIDTH / 2;
    player.y = HEIGHT / 2;
    player.atkCooldown = player.inventory.includes('pistol') ? Math.max(5, Math.floor(40 * 0.7)) : 40;
    player.lastDirX = 1;
    player.lastDirY = 0;
    player.robotBTimer = 0;
    player.robotATimer = 0;

    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    levelupScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    isPaused = false;

    updateUI();
    requestAnimationFrame(loop);
}

function loop() {
    if (isGameOver) return;
    if (!isPaused) {
        update();
        draw();
    }
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
        const speed = player.speed * player.moveSpeedMult;
        player.x += Math.cos(angle) * speed;
        player.y += Math.sin(angle) * speed;

        // Bounds
        player.x = Math.max(0, Math.min(WIDTH, player.x));
        player.y = Math.max(0, Math.min(HEIGHT, player.y));

        // Update last direction
        player.lastDirX = mx;
        player.lastDirY = my;
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
        if (b.life <= 0 || b.x < 0 || b.x > WIDTH || b.y < 0 || b.y > HEIGHT) {
            bullets.splice(i, 1);
            return;
        }
    });

    // Boss Projectiles
    bossProjectiles.forEach((bp, i) => {
        bp.x += bp.vx;
        bp.y += bp.vy;
        if (bp.x < 0 || bp.x > WIDTH || bp.y < 0 || bp.y > HEIGHT) {
            bossProjectiles.splice(i, 1);
            return;
        }
        if (Math.hypot(bp.x - player.x, bp.y - player.y) < player.size / 2 + 5) {
            player.hp -= 5;
            bossProjectiles.splice(i, 1);
            if (player.hp <= 0) gameOver();
        }
    });

    // Orbitals (Knife & Katana)
    orbitals.forEach(o => {
        // Katana has 2x speed, Knife uses default speed
        const currentSpeed = player.inventory.includes('katana') ? o.speed * 2 : o.speed;
        o.angle += currentSpeed;
        o.x = player.x + Math.cos(o.angle) * o.dist;
        o.y = player.y + Math.sin(o.angle) * o.dist;

        enemies.forEach((e, ei) => {
            const hitRadius = o.size ? o.size : 5;
            const dist = Math.hypot(e.x - o.x, e.y - o.y);
            if (dist < e.radius + hitRadius) {
                const dmg = e.isBoss ? 50 : o.damage;
                e.hp -= dmg;
                createDamageNumber(e.x, e.y - 10, dmg);
                createParticles(e.x, e.y, o.color, 2);
            }
        });
    });

    // Circular Blasts (Robot A / Destruction Wave)
    circularBlasts.forEach((cb, i) => {
        cb.radius += 5;
        cb.life--;
        enemies.forEach(e => {
            const d = Math.hypot(e.x - player.x, e.y - player.y);
            if (Math.abs(d - cb.radius) < e.radius + 5) {
                e.hp -= cb.damage;
                createDamageNumber(e.x, e.y - 10, cb.damage);
                createParticles(e.x, e.y, cb.color || '#fff', 1);

                // Slow effect for Destruction Wave
                if (cb.isDestructionWave) {
                    e.slowTimer = 60; // 1 second slow
                }
            }
        });
        if (cb.life <= 0) circularBlasts.splice(i, 1);
    });

    // Robot B Projectiles
    robotBProjectiles.forEach((rp, i) => {
        rp.x += rp.vx;
        rp.y += rp.vy;
        rp.life--;
        enemies.forEach(e => {
            const d = Math.hypot(e.x - rp.x, e.y - rp.y);
            if (d < e.radius + rp.size) {
                e.hp -= rp.damage;
                createDamageNumber(e.x, e.y - 10, rp.damage);
                createParticles(e.x, e.y, '#00ffff', 5);
            }
        });
        if (rp.life <= 0 || rp.x < -50 || rp.x > WIDTH + 50 || rp.y < -50 || rp.y > HEIGHT + 50) {
            robotBProjectiles.splice(i, 1);
        }
    });

    const isHordeActive = elapsed >= 210 && elapsed < 240;

    // Item Timers
    if (player.inventory.includes('robota') || player.inventory.includes('destruction_wave')) {
        let isWave = player.inventory.includes('destruction_wave');
        let count = isWave ? 5 : player.inventory.filter(id => id === 'robota').length;
        
        let color = isWave ? '#ff00ff' : '#fff';
        let dmg = isWave ? 200 : 25; // 25 DMG for Robot A
        
        // Base cooldown 120 frames, 30% faster per star
        const raCooldown = Math.max(20, 120 * Math.pow(0.7, count - 1));
        
        if (typeof player.robotATimer === 'undefined') player.robotATimer = 0;
        player.robotATimer--;
        
        if (player.robotATimer <= 0) {
            circularBlasts.push({ radius: 0, life: 30, damage: dmg, color: color, isDestructionWave: isWave });
            player.robotATimer = raCooldown;
        }
    }

    if (player.inventory.includes('robotb') || player.inventory.includes('destruction_wave')) {
        let isWave = player.inventory.includes('destruction_wave');
        let count = isWave ? 5 : player.inventory.filter(id => id === 'robotb').length; // Max stars effectively
        let dmg = isWave ? 150 : 100; // 100 + 50

        // Base cooldown 120 frames, 30% faster per star
        const rbCooldown = Math.max(20, 120 * Math.pow(0.7, count - 1));
        player.robotBTimer--;
        if (player.robotBTimer <= 0) {
            const baseAngle = Math.atan2(player.lastDirY, player.lastDirX);

            // Forward shot
            robotBProjectiles.push({
                x: player.x,
                y: player.y,
                vx: Math.cos(baseAngle) * 5,
                vy: Math.sin(baseAngle) * 5,
                size: 15,
                damage: dmg,
                life: 300
            });

            if (isWave) {
                // Left shot
                let angleLeft = baseAngle - Math.PI / 4;
                robotBProjectiles.push({
                    x: player.x, y: player.y,
                    vx: Math.cos(angleLeft) * 5, vy: Math.sin(angleLeft) * 5,
                    size: 15, damage: dmg, life: 300
                });

                // Right shot
                let angleRight = baseAngle + Math.PI / 4;
                robotBProjectiles.push({
                    x: player.x, y: player.y,
                    vx: Math.cos(angleRight) * 5, vy: Math.sin(angleRight) * 5,
                    size: 15, damage: dmg, life: 300
                });
            }

            player.robotBTimer = rbCooldown;
        }
    }

    // Enemies
    const isBossArena = elapsed >= 300 && finalBossSpawned;
    const isDensitySpike = elapsed >= 240;
    const spawnMultiplier = (isHordeActive || isDensitySpike) ? 2 : 1;
    const spawnInterval = Math.max(5, Math.floor((60 - level * 2) / spawnMultiplier));
    if (!isBossArena && frameCount % spawnInterval === 0) {
        spawnEnemy();
    }

    // Final Boss Warning at 4:55 (295s)
    if (elapsed === 295 && frameCount % 60 === 0) {
        // Just for logic, drawing is handled in draw()
    }
    // Spawn Final Boss at 300s
    if (elapsed >= 300 && !finalBossSpawned) {
        enemies = enemies.filter(e => e.isBoss); // Clear minions
        spawnFinalBoss();
        finalBossSpawned = true;
    }

    enemies.forEach((e, i) => {
        if (e.isFinalBoss) {
            updateFinalBossAI(e);
        } else {
            let speedMult = isHordeActive ? 1.5 : 1;

            // Apply slow debuff if active
            if (e.slowTimer > 0) {
                speedMult *= 0.5;
                e.slowTimer--;
            }

            let moveSpeed = e.speed * speedMult;
            // Override speed during mass spawn (Horde) to match player's original speed
            if (isHordeActive && !e.isBoss) {
                moveSpeed = player.speed * (e.slowTimer > 0 ? 0.5 : 1);
            }

            const angle = Math.atan2(player.y - e.y, player.x - e.x);
            e.x += Math.cos(angle) * moveSpeed;
            e.y += Math.sin(angle) * moveSpeed;
        }

        // Collision with bullet
        bullets.forEach((b, bi) => {
            const dist = Math.hypot(e.x - b.x, e.y - b.y);
            if (dist < e.radius + 5) {
                const dmg = player.atkDamage;
                e.hp -= dmg;
                createDamageNumber(e.x, e.y - 10, dmg);
                bullets.splice(bi, 1);
                createParticles(e.x, e.y, e.color, 3);
            }
        });

        if (e.hp <= 0) {
            kills++;
            // Boss drops Red Orb, others drop regular XP
            if (e.isFinalBoss) {
                victory();
            } else if (e.isBoss) {
                gems.push({ x: e.x, y: e.y, xp: xpToNext, isRedOrb: true });
            } else {
                if (e.color === '#0088ff' && Math.random() < 0.15) {
                    gems.push({ x: e.x, y: e.y, xp: 20 * 4, isGreenOrb: true });
                } else {
                    gems.push({ x: e.x, y: e.y, xp: 20 });
                }
            }

            // Cursed Piggy Bank effect
            if (player.inventory.includes('cursed_piggy') && !e.isBoss) {
                if (Math.random() < 0.5) {
                    const rx = e.x, ry = e.y;
                    const rRadius = e.radius, rSpeed = e.speed, rHp = e.maxHp || e.hp, rColor = e.color;
                    setTimeout(() => {
                        if (isStarted && !isPaused && !isGameOver) {
                            enemies.push({
                                x: rx, y: ry, radius: rRadius, speed: rSpeed, hp: rHp, maxHp: rHp, color: rColor, isBoss: false
                            });
                        }
                    }, 3000);
                }
            }

            enemies.splice(i, 1);
            updateUI();
        }

        // Collision with player
        if (Math.hypot(e.x - player.x, e.y - player.y) < player.size / 2 + e.radius) {
            player.hp -= e.isBoss ? 2 : 0.5;
            if (player.hp <= 0) gameOver();
        }
    });

    // Gems
    gems.forEach((g, i) => {
        const d = Math.hypot(g.x - player.x, g.y - player.y);
        if (d < magnetRange) {
            const angle = Math.atan2(player.y - g.y, player.x - g.x);
            g.x += Math.cos(angle) * 7;
            g.y += Math.sin(angle) * 7;
        }
        if (d < 15) {
            if (g.isRedOrb) {
                xp = xpToNext; // Instant level up
            } else {
                const xpGain = player.inventory.includes('cursed_piggy') ? g.xp * 2 : g.xp;
                xp += xpGain;
            }
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

    // Damage Numbers
    damageNumbers.forEach((dn, i) => {
        dn.y -= dn.vy;
        dn.life -= 0.02;
    });
    damageNumbers = damageNumbers.filter(dn => dn.life > 0);
}

function createDamageNumber(x, y, dmg) {
    damageNumbers.push({
        x: x,
        y: y,
        dmg: Math.floor(dmg),
        vy: 1,
        life: 1.0
    });
}

function spawnFinalBoss() {
    // Stage multiplier
    const stageMult = Math.pow(1.5, currentStage - 1);
    const hp = 50000 * stageMult;

    enemies.push({
        x: WIDTH / 2,
        y: -100,
        radius: 60,
        isBoss: true,
        isFinalBoss: true,
        speed: 1.5 + (currentStage * 0.1),
        hp: hp,
        maxHp: hp,
        color: '#ff0000',
        state: 'move',
        stateTimer: 120,
        dashX: 0, dashY: 0
    });
}

function spawnEnemy() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    // Boss Spawn at 2:30 (150s)
    if (elapsed >= 150 && !bossSpawned) {
        spawnMidBoss();
        bossSpawned = true;
        return;
    }

    const isBlue = elapsed >= 60;

    let x, y;
    if (Math.random() > 0.5) {
        x = Math.random() > 0.5 ? -20 : WIDTH + 20;
        y = Math.random() * HEIGHT;
    } else {
        x = Math.random() * WIDTH;
        y = Math.random() > 0.5 ? -20 : HEIGHT + 20;
    }

    // Stage multiplier
    const stageMult = Math.pow(1.5, currentStage - 1);
    const maxHp = ((isBlue ? 500 : 300) + (level * 20)) * stageMult;
    
    // Switch colors slightly per stage to indicate difficulty increase visually
    let enemyColor = isBlue ? '#0088ff' : '#ff0033';
    if (currentStage > 1) {
        enemyColor = isBlue ? '#00ffff' : '#ff8800'; // Stage 2+ colors
    }

    enemies.push({
        x: x,
        y: y,
        radius: 8,
        isBoss: false,
        speed: (1 + Math.random() * 0.5 + (level * 0.1)) * (1 + (currentStage - 1) * 0.2),
        hp: maxHp,
        maxHp: maxHp,
        color: enemyColor
    });
}

function spawnMidBoss() {
    console.log("BOSS SPAWNING!");
    // Stage multiplier
    const stageMult = Math.pow(1.5, currentStage - 1);
    const hp = 5555 * stageMult;

    enemies.push({
        x: WIDTH / 2,
        y: -50,
        radius: 40,
        isBoss: true,
        speed: 0.6 + (currentStage * 0.1),
        hp: hp,
        maxHp: hp,
        color: '#ff0000',
        label: 'MID-BOSS'
    });
}

const UPGRADES = [
    {
        id: 'knife',
        name: 'ナイフ',
        desc: '周囲を回転する刃。近くの敵にダメージ（500 DMG）を与える。',
        type: 'weapon',
        onSelect: () => {
            player.inventory.push('knife');
            // Count total knives
            const count = player.inventory.filter(id => id === 'knife').length;
            // Redistribute all knives
            orbitals = [];
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                orbitals.push({ angle: angle, dist: 60, speed: 0.05, damage: 500, color: '#fff' });
            }
        }
    },
    {
        id: 'pistol',
        name: '拳銃',
        desc: '弾のダメージが50アップし、発射速度が30%向上する。',
        type: 'weapon',
        onSelect: () => {
            player.atkDamage += 50;
            player.atkCooldown = Math.max(5, Math.floor(player.atkCooldown * 0.7));
            player.inventory.push('pistol');
        }
    },
    {
        id: 'robota',
        name: 'ロボットA',
        desc: '円状のエネルギー衝撃波（25 DMG）を定期的に放出する。星の数により発射速度が30%早くなる。',
        type: 'weapon',
        onSelect: () => {
            player.inventory.push('robota');
        }
    },
    {
        id: 'boots',
        name: 'ブーツ',
        desc: '移動速度が20%向上する。',
        type: 'stat',
        onSelect: () => {
            player.moveSpeedMult += 0.2;
            player.inventory.push('boots');
        }
    },
    {
        id: 'shield',
        name: 'シールド',
        desc: '最大HPが20加算され、HPが全回復する。',
        type: 'stat',
        onSelect: () => {
            player.maxHp += 20;
            player.hp = player.maxHp;
            player.inventory.push('shield');
        }
    },
    {
        id: 'magnet',
        name: '磁石',
        desc: '経験値オーブの回収範囲が50%広がる。',
        type: 'stat',
        onSelect: () => {
            magnetRange *= 1.5;
            player.inventory.push('magnet');
        }
    },
    {
        id: 'vitamin',
        name: 'ビタミン',
        desc: 'HPが毎秒1回復するようになる。',
        type: 'item',
        onSelect: () => {
            if (!player.inventory.includes('vitamin')) {
                setInterval(() => {
                    if (isStarted && !isPaused && !isGameOver) {
                        player.hp = Math.min(player.hp + 1, player.maxHp);
                    }
                }, 1000);
            }
            player.inventory.push('vitamin');
        }
    },
    {
        id: 'clover',
        name: 'クローバー',
        desc: '経験値オーブから得られる経験値が50%増加する（内部効果）。',
        type: 'item',
        onSelect: () => {
            player.inventory.push('clover');
        }
    },
    {
        id: 'robotb',
        name: 'ロボットB',
        desc: '向いている方向に大きな玉（100 DMG）を飛ばす。星の数分、発射速度が30%早くなる。',
        type: 'weapon',
        onSelect: () => {
            player.inventory.push('robotb');
        }
    },
    {
        id: 'cursed_piggy',
        name: '呪いの貯金箱',
        desc: 'もらえる経験値が100%増加するが、50%の確率で倒した敵が3秒後に復活する。',
        type: 'item',
        onSelect: () => {
            player.inventory.push('cursed_piggy');
        }
    },
    {
        id: 'katana',
        name: '🗡️日本刀',
        desc: 'ナイフの進化系。サイズが50%アップし、回転スピードが2倍になる。',
        type: 'weapon',
        onSelect: () => {
            // Remove all knives
            player.inventory = player.inventory.filter(id => id !== 'knife');
            player.inventory.push('katana');
            // Distribute katana
            orbitals = [{ angle: 0, dist: 90, speed: 0.1, damage: 1000, color: '#ff0000', size: 7.5 }];
        }
    },
    {
        id: 'destruction_wave',
        name: '破壊の波動',
        desc: 'ロボットAとロボットBの進化系。ダメージが+50され、波動で敵が遅くなり、ロボットBの弾が3発になる。',
        type: 'weapon',
        onSelect: () => {
            // Remove robots base components to represent evolution (optional, but keep it clean)
            player.inventory = player.inventory.filter(id => id !== 'robota' && id !== 'robotb');
            player.inventory.push('destruction_wave');
        }
    }
];

const EVOLUTIONS = [
    {
        resultId: 'katana',
        reqWeapon: 'knife',
        reqItem: 'boots'
    },
    {
        resultId: 'destruction_wave',
        reqWeapon: 'robota',
        reqItem: 'robotb'
    }
];

function checkLevelUp() {
    if (xp >= xpToNext) {
        xp -= xpToNext;
        level++;
        xpToNext = Math.floor(xpToNext * 1.3);
        showLevelUp();
    }
    xpBar.style.width = (xp / xpToNext * 100) + '%';
}

function showLevelUp() {
    isPaused = true;
    levelupScreen.classList.remove('hidden');
    upgradeChoicesContainer.innerHTML = '';

    // Filter out upgrades that have reached max level (initial + 4 stars = 5 total)
    const availableUpgrades = UPGRADES.filter(upgrade => {
        // Prevent normal upgrades that are actually evolutions from appearing randomly
        if (upgrade.id === 'katana' || upgrade.id === 'destruction_wave') return false;

        const count = player.inventory.filter(id => id === upgrade.id).length;
        // The user asked for a maximum of 4 stars, meaning 5 items total (1 base + 4 upgrades)
        return count < 5;
    });

    // Check Evolutions
    EVOLUTIONS.forEach(evo => {
        const weaponCount = player.inventory.filter(id => id === evo.reqWeapon).length;
        const itemCount = player.inventory.filter(id => id === evo.reqItem).length;
        const hasReachedEvoAlready = player.inventory.includes(evo.resultId);

        // Katana needs Knife Lv5 (5) and Boots Lv4 (4)
        // Wave needs Robot A Lv5 (5) and Robot B Lv5 (5)
        let canEvolve = false;
        if (evo.resultId === 'katana' && weaponCount >= 5 && itemCount >= 4) canEvolve = true;
        if (evo.resultId === 'destruction_wave' && weaponCount >= 5 && itemCount >= 5) canEvolve = true;

        if (canEvolve && !hasReachedEvoAlready) {
            const evoUpgrade = UPGRADES.find(u => u.id === evo.resultId);
            if (evoUpgrade) availableUpgrades.push(evoUpgrade);
        }
    });

    if (availableUpgrades.length === 0) {
        resumeGame();
        return;
    }

    // Random 3 choices from available ones
    let shuffled = [...availableUpgrades].sort(() => 0.5 - Math.random());
    
    // Guarantee at least one weapon on first level up (Level 2)
    if (level === 2) {
        const weaponIndex = shuffled.findIndex(u => u.type === 'weapon');
        if (weaponIndex > 0) {
            // Move the first found weapon to the front
            const weapon = shuffled.splice(weaponIndex, 1)[0];
            shuffled.unshift(weapon);
        }
    }

    const selected = shuffled.slice(0, 3);

    selected.forEach(upgrade => {
        const count = player.inventory.filter(id => id === upgrade.id).length;
        // Don't show stars if it's the first time getting it, otherwise show up to 4 stars.
        let stars = count > 0 ? '⭐️'.repeat(count) : '';
        if (count === 4) {
            stars += '（最大）';
        }

        // Determine label based on type
        let typeLabel = '';
        if (upgrade.type === 'weapon') {
            typeLabel = '【武器】 ';
        } else if (upgrade.type === 'item' || upgrade.type === 'stat') {
            typeLabel = '【アイテム】 ';
        }

        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `
            <h3>${typeLabel}${upgrade.name}${stars}</h3>
            <p>${upgrade.desc}</p>
        `;
        card.onclick = () => {
            upgrade.onSelect();
            resumeGame();
        };
        upgradeChoicesContainer.appendChild(card);
    });
}

function resumeGame() {
    isPaused = false;
    levelupScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    updateUI();
}

function showPause() {
    if (!isStarted || isGameOver || levelupScreen.classList.contains('hidden') === false) return;
    isPaused = true;
    pauseScreen.classList.remove('hidden');

    // Update Stats
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    pauseTimeEl.innerText = `${m}:${s}`;

    // Update Inventory
    pauseInventoryEl.innerHTML = '';
    const itemCounts = {};
    player.inventory.forEach(id => {
        itemCounts[id] = (itemCounts[id] || 0) + 1;
    });

    Object.keys(itemCounts).forEach(id => {
        const upgrade = UPGRADES.find(u => u.id === id);
        if (upgrade) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'pause-item';
            const stars = '⭐️'.repeat(itemCounts[id] - 1); // Level 1 is base, Level 2 is ⭐️
            itemDiv.innerHTML = `
                <span>${upgrade.name}</span>
                <span class="pause-item-stars">${stars}</span>
            `;
            pauseInventoryEl.appendChild(itemDiv);
        }
    });

    // Update Evolutions
    const pauseEvolutionsEl = document.getElementById('pause-evolutions');
    if (pauseEvolutionsEl) {
        pauseEvolutionsEl.innerHTML = '<h3 style="margin-top: 15px; margin-bottom: 10px; font-size: 10px; text-align: center; color: #ff00de;">進化レシピ</h3>';
        EVOLUTIONS.forEach(evo => {
            const result = UPGRADES.find(u => u.id === evo.resultId);
            const w1 = UPGRADES.find(u => u.id === evo.reqWeapon);
            const w2 = UPGRADES.find(u => u.id === evo.reqItem);
            
            const evoDiv = document.createElement('div');
            evoDiv.className = 'pause-item';
            evoDiv.style.fontSize = '8px';
            evoDiv.style.justifyContent = 'center';
            evoDiv.style.gap = '5px';
            evoDiv.style.padding = '8px';
            evoDiv.innerHTML = `
                <span style="color:#aaa">${w1.name}</span> + <span style="color:#aaa">${w2.name}</span> = <span style="color:#00ff41">${result.name}</span>
            `;
            pauseEvolutionsEl.appendChild(evoDiv);
        });
    }
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
        if (g.isRedOrb) {
            ctx.fillStyle = '#ff0000';
            ctx.shadowBlur = 15; ctx.shadowColor = '#ff0000';
            ctx.fillRect(g.x - 6, g.y - 6, 12, 12);
            ctx.shadowBlur = 0;
        } else if (g.isGreenOrb) {
            ctx.fillStyle = '#00ff41';
            ctx.shadowBlur = 10; ctx.shadowColor = '#00ff41';
            ctx.fillRect(g.x - 4, g.y - 4, 8, 8);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#0088ff';
            ctx.fillRect(g.x - 3, g.y - 3, 6, 6);
        }
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
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();

        if (e.isBoss) {
            // Boss HP bar
            const barW = e.isFinalBoss ? 160 : 80;
            const max = e.isFinalBoss ? 50000 : 5555;
            ctx.fillStyle = '#333';
            ctx.fillRect(e.x - barW / 2, e.y - e.radius - 20, barW, 8);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(e.x - barW / 2, e.y - e.radius - 20, (e.hp / max) * barW, 8);

            // Label
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(e.isFinalBoss ? "FINAL BOSS" : "MID-BOSS", e.x, e.y - e.radius - 25);
        }
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

    // Orbitals
    orbitals.forEach(o => {
        ctx.fillStyle = o.color;
        ctx.shadowBlur = 10; ctx.shadowColor = o.color;
        ctx.beginPath();
        ctx.arc(o.x, o.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Circular Blasts
    circularBlasts.forEach(cb => {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, cb.radius, 0, Math.PI * 2);
        ctx.stroke();
    });

    // Robot B Projectiles
    robotBProjectiles.forEach(rp => {
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 15; ctx.shadowColor = '#00ffff';
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Damage Numbers
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    damageNumbers.forEach(dn => {
        ctx.fillStyle = `rgba(255, 255, 255, ${dn.life})`;
        ctx.fillText(dn.dmg, dn.x, dn.y);
    });

    // Final Boss Warning at 4:55 (295s)
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed >= 295 && elapsed < 300) {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 30; ctx.shadowColor = '#ff0000';
        ctx.fillText("ボス発生！！", WIDTH / 2, HEIGHT / 2);
        ctx.shadowBlur = 0;
    }

    // Boss Projectiles
    bossProjectiles.forEach(bp => {
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 10; ctx.shadowColor = '#ff00ff';
        ctx.beginPath();
        ctx.arc(bp.x, bp.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    if (isVictory) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#00ff41';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("VICTORY!", WIDTH / 2, HEIGHT / 2 - 20);
        ctx.font = '20px Arial';
        ctx.fillText("Final Boss Defeated!", WIDTH / 2, HEIGHT / 2 + 30);
    }
}

function updateFinalBossAI(e) {
    e.stateTimer--;
    if (e.stateTimer <= 0) {
        // Pick new state
        const rand = Math.random();
        if (rand < 0.4) {
            e.state = 'shoot';
            e.stateTimer = 180; // 3 seconds shooting
        } else if (rand < 0.8) {
            e.state = 'telegraph_dash';
            e.stateTimer = 60; // 1 second prep
            e.color = '#ff6600';
        } else {
            e.state = 'move';
            e.stateTimer = 120; // 2 seconds move
            e.color = '#ff0000';
        }
    }

    if (e.state === 'move') {
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;
    } else if (e.state === 'telegraph_dash') {
        // Slow move or stay still
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * 0.5;
        e.y += Math.sin(angle) * 0.5;
        // At the end of telegraph, set dash target
        if (e.stateTimer === 1) {
            e.state = 'dash';
            e.stateTimer = 40;
            const dashAngle = Math.atan2(player.y - e.y, player.x - e.x);
            e.dashX = Math.cos(dashAngle) * 8;
            e.dashY = Math.sin(dashAngle) * 8;
            e.color = '#ff00ff';
        }
    } else if (e.state === 'dash') {
        e.x += e.dashX;
        e.y += e.dashY;
    } else if (e.state === 'shoot') {
        if (e.stateTimer % 20 === 0) {
            // Circle shot
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
                bossProjectiles.push({
                    x: e.x, y: e.y,
                    vx: Math.cos(a) * 4,
                    vy: Math.sin(a) * 4
                });
            }
        }
        // Small move
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        e.x += Math.cos(angle) * 0.5;
        e.y += Math.sin(angle) * 0.5;
    }
}

function victory() {
    if (isVictory) return;
    isVictory = true;
    victoryTimeEl.innerText = timeEl.innerText;
    document.getElementById('victory-screen').classList.remove('hidden');
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
    
    // Show revive button if enough kills
    if (kills >= 100) {
        reviveBtn.classList.remove('hidden');
    } else {
        reviveBtn.classList.add('hidden');
    }
}

function revive() {
    if (kills < 100) return;
    
    kills -= 100;
    player.hp = player.maxHp;
    isGameOver = false;
    
    // Clear enemies near player for safety
    enemies = enemies.filter(e => Math.hypot(e.x - player.x, e.y - player.y) > 150 || e.isBoss);
    
    gameoverScreen.classList.add('hidden');
    updateUI();
    requestAnimationFrame(loop);
}

// Input
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

startBtn.addEventListener('click', () => init(false));
retryBtn.addEventListener('click', () => init(false));
nextStageBtn.addEventListener('click', () => {
    currentStage++;
    init(true);
});
reviveBtn.addEventListener('click', revive);
pauseBtn.addEventListener('click', showPause);
resumeBtn.addEventListener('click', resumeGame);

// Initial Bg
draw();
