const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const hpEl = document.getElementById('hp');
const restartBtn = document.getElementById('restartBtn');

// Game constants
const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const SPEED = 5;

// Game state
let score = 0;
let isGameOver = false;
let animationId;
let currentLevelIndex = 0;

// Input
const keys = {
    right: false,
    left: false,
    up: false
};

// Player
const player = {
    x: 100,
    y: 100,
    width: 32,
    height: 32,
    dx: 0,
    dy: 0,
    dy: 0,
    grounded: false,
    jumpCount: 0,
    comboTimer: null,
    hp: 3,
    color: '#e60012', // Red mario
    image: new Image()
};
player.image.src = 'assets/mario_player.png';

// Levels Data
const levels = [
    // Level 1
    {
        platforms: [
            { x: 0, y: 400, width: 800, height: 50, color: '#009900' }, // Ground
            { x: 100, y: 320, width: 100, height: 20, color: '#b85c00' },
            { x: 300, y: 250, width: 150, height: 20, color: '#b85c00' },
            { x: 550, y: 200, width: 100, height: 20, color: '#b85c00' },
            { x: 700, y: 120, width: 100, height: 20, color: '#b85c00' },
            { x: 250, y: 150, width: 80, height: 20, color: '#b85c00' },
            { x: 0, y: 100, width: 100, height: 20, color: '#b85c00' },
        ],
        spikes: [
            { x: 250, y: 400 - 20, width: 40, height: 20 },
            { x: 450, y: 400 - 20, width: 40, height: 20 },
            { x: 650, y: 400 - 20, width: 40, height: 20 },
            { x: 350, y: 250 - 20, width: 40, height: 20 },
            { x: 600, y: 200 - 20, width: 20, height: 20 },
        ],
        coins: [
            { x: 140, y: 280, width: 20, height: 20, collected: false },
            { x: 320, y: 210, width: 20, height: 20, collected: false },
            { x: 740, y: 80, width: 20, height: 20, collected: false },
            { x: 40, y: 60, width: 20, height: 20, collected: false },
            { x: 280, y: 110, width: 20, height: 20, collected: false },
            // Added coins
            { x: 200, y: 350, width: 20, height: 20, collected: false },
            { x: 500, y: 280, width: 20, height: 20, collected: false },
            { x: 600, y: 150, width: 20, height: 20, collected: false },
            { x: 100, y: 350, width: 20, height: 20, collected: false },
            { x: 50, y: 200, width: 20, height: 20, collected: false },
        ],
        enemies: [
            { x: 400, y: 300, width: 32, height: 32, dx: 2, color: '#8b4513', isDead: false },
            { x: 600, y: 300, width: 32, height: 32, dx: -2, color: '#8b4513', isDead: false },
        ]
    },
    // Level 2
    // Level 2 (continued/fixed)
    {
        platforms: [
            { x: 0, y: 400, width: 200, height: 50, color: '#000099' }, // Gap level
            { x: 300, y: 400, width: 200, height: 50, color: '#000099' },
            { x: 600, y: 400, width: 200, height: 50, color: '#000099' },
            { x: 150, y: 300, width: 100, height: 20, color: '#6666ff' },
            { x: 450, y: 250, width: 100, height: 20, color: '#6666ff' },
            { x: 250, y: 150, width: 300, height: 20, color: '#6666ff' },
        ],
        spikes: [
            { x: 100, y: 400 - 20, width: 40, height: 20 },
            { x: 400, y: 400 - 20, width: 40, height: 20 },
            { x: 350, y: 150 - 20, width: 20, height: 20 },
            { x: 450, y: 150 - 20, width: 20, height: 20 },
        ],
        coins: [
            { x: 50, y: 350, width: 20, height: 20, collected: false },
            { x: 350, y: 350, width: 20, height: 20, collected: false },
            { x: 650, y: 350, width: 20, height: 20, collected: false },
            { x: 400, y: 100, width: 20, height: 20, collected: false }, // High coin
            { x: 180, y: 250, width: 20, height: 20, collected: false },
            // Added coins
            { x: 100, y: 350, width: 20, height: 20, collected: false },
            { x: 500, y: 350, width: 20, height: 20, collected: false },
            { x: 200, y: 300, width: 20, height: 20, collected: false },
            { x: 500, y: 250, width: 20, height: 20, collected: false },
            { x: 700, y: 300, width: 20, height: 20, collected: false },
        ],
        enemies: [
            { x: 300, y: 100, width: 32, height: 32, dx: 2, color: '#8b4513', isDead: false },
            { x: 700, y: 350, width: 32, height: 32, dx: -2, color: '#8b4513', isDead: false },
        ]
    },
    // Level 3: Bridge of Doom
    {
        platforms: [
            { x: 0, y: 400, width: 100, height: 50, color: '#006400' }, // Start
            { x: 150, y: 400, width: 80, height: 20, color: '#8b4513' },
            { x: 280, y: 350, width: 60, height: 20, color: '#8b4513' },
            { x: 380, y: 300, width: 40, height: 20, color: '#8b4513' }, // Tiny platform
            { x: 450, y: 300, width: 40, height: 20, color: '#8b4513' },
            { x: 550, y: 250, width: 100, height: 20, color: '#8b4513' },
            { x: 700, y: 400, width: 100, height: 50, color: '#006400' }, // End
            { x: 600, y: 150, width: 100, height: 20, color: '#8b4513' }
        ],
        spikes: [
            { x: 570, y: 250 - 20, width: 20, height: 20 },
            { x: 650, y: 400 - 20, width: 20, height: 20 }
        ],
        coins: [
            { x: 80, y: 320, width: 20, height: 20, collected: false },
            { x: 220, y: 280, width: 20, height: 20, collected: false },
            { x: 390, y: 260, width: 20, height: 20, collected: false },
            { x: 500, y: 180, width: 20, height: 20, collected: false }, // High jump
            { x: 580, y: 220, width: 20, height: 20, collected: false },
            { x: 650, y: 300, width: 20, height: 20, collected: false },
            { x: 750, y: 350, width: 20, height: 20, collected: false }, // Goal
        ],
        enemies: [
            { x: 200, y: 50, width: 32, height: 32, dx: 2, color: '#8b4513', isDead: false },
        ]
    },
    // Level 4: The Tower
    {
        playerStart: { x: 50, y: 380 }, // Start at bottom
        platforms: [
            { x: 0, y: 430, width: 800, height: 20, color: '#444' }, // Floor
            { x: 100, y: 350, width: 100, height: 20, color: '#777' },
            { x: 300, y: 300, width: 100, height: 20, color: '#777' },
            { x: 100, y: 250, width: 100, height: 20, color: '#777' },
            { x: 300, y: 200, width: 100, height: 20, color: '#777' },
            { x: 100, y: 150, width: 100, height: 20, color: '#777' },
            { x: 350, y: 100, width: 400, height: 20, color: '#777' }, // Top floor
        ],
        spikes: [
            { x: 200, y: 430 - 20, width: 400, height: 20 }, // Floor spikes
            { x: 450, y: 100 - 20, width: 20, height: 20 },
            { x: 550, y: 100 - 20, width: 20, height: 20 },
            { x: 650, y: 100 - 20, width: 20, height: 20 },
        ],
        coins: [
            { x: 140, y: 310 - 100, width: 20, height: 20, collected: false }, // Higher
            { x: 340, y: 260 - 120, width: 20, height: 20, collected: false }, // Much higher
            { x: 140, y: 210 - 150, width: 20, height: 20, collected: false }, // Very high
            { x: 340, y: 160 - 100, width: 20, height: 20, collected: false },
            { x: 140, y: 110 - 50, width: 20, height: 20, collected: false }, // Top
            { x: 750, y: 50, width: 20, height: 20, collected: false }, // Goal High
            { x: 50, y: 150, width: 20, height: 20, collected: false }, // Extra High
            { x: 250, y: 100, width: 20, height: 20, collected: false },
            { x: 500, y: 50, width: 20, height: 20, collected: false },
            { x: 600, y: 50, width: 20, height: 20, collected: false },
        ],
        enemies: Array.from({ length: 15 }, (_, i) => ({
            x: 200 + Math.random() * 550, // Avoid spawning near player start (x=50)
            y: (i % 2 === 0) ? 400 : 100, // Floor or Top floor
            width: 32,
            height: 32,
            dx: (Math.random() > 0.5 ? 2 : -2) * (Math.random() + 0.5), // Random speed/direction
            color: '#8b4513',
            isDead: false
        }))
    },
    // Level 5: Final Boss (Lava Zone)
    {
        platforms: [
            { x: 0, y: 400, width: 100, height: 50, color: '#330000' }, // Start
            { x: 150, y: 320, width: 80, height: 20, color: '#8b0000' },
            { x: 300, y: 220, width: 80, height: 20, color: '#8b0000' }, // High island
            { x: 450, y: 320, width: 80, height: 20, color: '#8b0000' },
            { x: 600, y: 220, width: 80, height: 20, color: '#8b0000' }, // High island
            { x: 700, y: 400, width: 100, height: 50, color: '#330000' }, // Goal area
            { x: 0, y: 448, width: 800, height: 2, color: '#ff4400' }, // Lava visual (death floor is logic)
        ],
        spikes: [
            { x: 320, y: 220 - 20, width: 40, height: 20 }, // Spike on high island 1
            { x: 620, y: 220 - 20, width: 40, height: 20 }, // Spike on high island 2
            { x: 200, y: 320, width: 20, height: 20 }, // Creating a tricky jump
        ],
        coins: [
            { x: 180, y: 280, width: 20, height: 20, collected: false },
            { x: 340, y: 150, width: 20, height: 20, collected: false }, // High coin
            { x: 490, y: 280, width: 20, height: 20, collected: false },
            { x: 640, y: 150, width: 20, height: 20, collected: false }, // High coin
            { x: 750, y: 350, width: 20, height: 20, collected: false },
        ],
        enemies: Array.from({ length: 140 }, () => ({
            x: 200 + Math.random() * 550, // Avoid spawning near player (x=50)
            y: 300 + Math.random() * 140, // Lower side
            width: 32,
            height: 32,
            dx: (Math.random() - 0.5) * 4, // Random speed
            color: '#8b4513',
            isDead: false
        }))
    }
];

let platforms = [];
let spikes = [];
let coins = [];
let enemies = [];

function loadLevel(index) {
    if (index >= levels.length) {
        // Game Clear
        gameWin();
        return;
    }
    currentLevelIndex = index;
    // Deep copy to reset state if needed
    platforms = JSON.parse(JSON.stringify(levels[index].platforms));
    spikes = JSON.parse(JSON.stringify(levels[index].spikes));
    coins = JSON.parse(JSON.stringify(levels[index].coins));
    enemies = JSON.parse(JSON.stringify(levels[index].enemies || []));

    // Store spawn points for respawn logic
    enemies.forEach(e => {
        e.spawnX = e.x;
        e.spawnY = e.y;
        e.spawnDx = e.dx;
    });

    // Reset player pos
    const startPos = levels[index].playerStart || { x: 50, y: 100 };
    player.x = startPos.x;
    player.y = startPos.y;
    player.dx = 0;
    player.dy = 0;
}

// Event listeners
window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowRight') keys.right = true;
    if (e.code === 'ArrowLeft') keys.left = true;
    if (e.code === 'ArrowUp') {
        if (player.grounded) {
            // Triple Jump Logic
            if (player.jumpCount === 0) {
                player.dy = JUMP_FORCE; // -10
                player.jumpCount = 1;
            } else if (player.jumpCount === 1) {
                player.dy = JUMP_FORCE * 1.1; // Medium Jump (1.1x)
                player.jumpCount = 2;
            } else if (player.jumpCount === 2) {
                player.dy = JUMP_FORCE * 1.3; // Super Jump (1.3x)
                player.jumpCount = 3; // Will reset on land
            } else {
                player.dy = JUMP_FORCE;
                player.jumpCount = 1;
            }

            player.grounded = false;
            // Clear timer if we jumped
            if (player.comboTimer) clearTimeout(player.comboTimer);
        }
    }
    // Skip Level Debug Key
    if (e.code === 'KeyS') {
        loadLevel(currentLevelIndex + 1);
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowRight') keys.right = false;
    if (e.code === 'ArrowLeft') keys.left = false;
});

restartBtn.addEventListener('click', resetGame);

function resetGame() {
    player.jumpCount = 0;
    player.hp = 3;
    hpEl.innerText = player.hp;
    score = 0;
    scoreEl.innerText = score;
    isGameOver = false;
    restartBtn.classList.add('hidden');
    cancelAnimationFrame(animationId);
    loadLevel(0); // Load Level 1
    update();
}

function update() {
    if (isGameOver) return;

    // Horizontal Movement
    if (keys.right) player.dx = SPEED;
    else if (keys.left) player.dx = -SPEED;
    else player.dx = 0;

    player.x += player.dx;

    // Wall collision (keep in bounds)
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Vertical Movement (Gravity)
    player.dy += GRAVITY;
    player.y += player.dy;

    // Landing detection
    const wasGrounded = player.grounded;
    player.grounded = false;

    // Platform Collision checks
    platforms.forEach(p => {
        // Simple AABB collision
        if (player.x < p.x + p.width &&
            player.x + player.width > p.x &&
            player.y < p.y + p.height &&
            player.y + player.height > p.y) {

            // Collision detected. Resolve based on velocity
            // Landing on top
            if (player.dy > 0 && player.y + player.height - player.dy <= p.y) {
                player.grounded = true;
                player.dy = 0;
                player.y = p.y - player.height;
            }
            // Hitting bottom (head bump)
            else if (player.dy < 0 && player.y - player.dy >= p.y + p.height) {
                player.dy = 0;
                player.y = p.y + p.height;
            }
            // Side collisions (simplified, mostly neglected for this quick demo or could be improving)
        }
    });

    // Handle Landing Event for Triple Jump
    if (!wasGrounded && player.grounded) {
        // Just landed
        if (player.jumpCount > 0 && player.jumpCount < 3) {
            // Start timer for next jump combo window (e.g. 0.3s)
            player.comboTimer = setTimeout(() => {
                player.jumpCount = 0;
            }, 400);
        } else {
            // Landed after 3rd jump or invalid state, reset
            player.jumpCount = 0;
        }
    }

    // Spike Collision logic
    spikes.forEach(s => {
        // AABB check first
        if (player.x < s.x + s.width &&
            player.x + player.width > s.x &&
            player.y < s.y + s.height &&
            player.y + player.height > s.y) {

            // Detailed Triangle Check
            // Spike Triangle vertices
            const sTop = { x: s.x + s.width / 2, y: s.y };
            const sLeft = { x: s.x, y: s.y + s.height };
            const sRight = { x: s.x + s.width, y: s.y + s.height };

            // Check if Spike Top is inside Player Rect (Landing on spike)
            if (sTop.x >= player.x && sTop.x <= player.x + player.width &&
                sTop.y >= player.y && sTop.y <= player.y + player.height) {
                gameOver();
                return;
            }

            // Check if any Player corner is inside Spike Triangle
            const pPoints = [
                { x: player.x, y: player.y + player.height }, // Bottom Left
                { x: player.x + player.width, y: player.y + player.height }, // Bottom Right
                { x: player.x, y: player.y }, // Top Left
                { x: player.x + player.width, y: player.y } // Top Right
            ];

            // Barycentric coordinate system or Edge checks approach can be used.
            // Simplified check:
            // For a point P to be in triangle ABC, it must be on correct side of AB, BC, and CA.
            // However, since spikes are upright isosceles triangles, we can simplify.
            // Within the spike's bounding box (which we correspond to y), the x range of the spike is linear.

            for (let p of pPoints) {
                // Determine width of spike at height p.y
                if (p.y >= sTop.y && p.y <= sLeft.y) {
                    // Normalize Y (0 at top, 1 at bottom)
                    const ratio = (p.y - sTop.y) / s.height;
                    const halfWidth = (s.width / 2) * ratio;
                    const minX = sTop.x - halfWidth;
                    const maxX = sTop.x + halfWidth;

                    if (p.x >= minX && p.x <= maxX) {
                        gameOver();
                        return;
                    }
                }
            }
        }
    });

    // Pitfall check
    if (player.y > canvas.height) {
        gameOver();
    }

    // Coin collection
    coins.forEach(c => {
        if (!c.collected &&
            player.x < c.x + c.width &&
            player.x + player.width > c.x &&
            player.y < c.y + c.height &&
            player.y + player.height > c.y) {

            c.collected = true;
            score += 100;
            scoreEl.innerText = score;
        }
    });

    // Level Complete Condition
    if (coins.every(c => c.collected)) {
        // Next Level
        loadLevel(currentLevelIndex + 1);
    }

    // Enemy Update Logic
    enemies.forEach(enemy => {
        if (enemy.isDead) return;

        // Gravity
        enemy.dy = (enemy.dy || 0) + GRAVITY;
        enemy.y += enemy.dy;
        enemy.x += enemy.dx;

        // Wall Collision & Platform landing
        let enemyGrounded = false;
        platforms.forEach(p => {
            if (enemy.x < p.x + p.width &&
                enemy.x + enemy.width > p.x &&
                enemy.y < p.y + p.height &&
                enemy.y + enemy.height > p.y) {

                // Landing
                if ((enemy.dy || 0) > 0 && enemy.y + enemy.height - enemy.dy <= p.y) {
                    enemy.y = p.y - enemy.height;
                    enemy.dy = 0;
                    enemyGrounded = true;
                }
                // Wall hit (reverse direction)
                else if (enemy.y + enemy.height > p.y && enemy.y < p.y + p.height) {
                    enemy.dx = -enemy.dx;
                }
            }
        });

        // Screen bounds
        if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
            enemy.dx = -enemy.dx;
        }
        if (enemy.y > canvas.height + 100) {
            // Respawn Logic: If fallen out, reset to spawn point
            enemy.x = enemy.spawnX;
            enemy.y = enemy.spawnY;
            enemy.dx = enemy.spawnDx;
            enemy.dy = 0;
        }

        // Collision with Player
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {

            // Mario stomp logic: Player must be falling and hitting the top of the enemy
            // We check if player bottom was above enemy center in previous frame roughly,
            // or just check if player center is above enemy center significantly.
            // A simple check: Player is falling (dy > 0) AND Player bottom is not too deep into enemy.
            const hitFromAbove = (player.dy > 0) && (player.y + player.height - player.dy <= enemy.y + enemy.height * 0.5);

            if (hitFromAbove) {
                // Kill Enemy
                enemy.isDead = true;
                // Bounce Player
                player.dy = -8;
                score += 200; // Bonus score
                scoreEl.innerText = score;
            } else {
                // Kill Player
                gameOver();
            }
        }
    });

    render();
    animationId = requestAnimationFrame(update);
}

function gameOver() {
    player.hp--;
    hpEl.innerText = player.hp;

    if (player.hp > 0) {
        // Respawn in same level
        loadLevel(currentLevelIndex);
        return;
    }

    isGameOver = true;
    render();

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    ctx.font = '40px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText("ゲームオーバー", canvas.width / 2, canvas.height / 2);

    restartBtn.innerText = "もう一度遊ぶ";
    restartBtn.classList.remove('hidden');
}

function gameWin() {
    isGameOver = true;
    render();

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fbd000';
    ctx.font = '50px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText("全レベルクリア！", canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = '#fff';
    ctx.font = '30px Outfit';
    ctx.fillText("最終スコア: " + score, canvas.width / 2, canvas.height / 2 + 30);

    restartBtn.innerText = "もう一度遊ぶ";
    restartBtn.classList.remove('hidden');
}


function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Platforms
    platforms.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        // Add border for "brick" look
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.width, p.height);
    });

    // Draw Spikes
    ctx.fillStyle = '#aaa'; // Grey spikes
    spikes.forEach(s => {
        // Draw Triangle
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + s.height); // Bottom left
        ctx.lineTo(s.x + s.width / 2, s.y); // Top center
        ctx.lineTo(s.x + s.width, s.y + s.height); // Bottom right
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });

    // Draw Coins
    coins.forEach(c => {
        if (!c.collected) {
            ctx.fillStyle = '#fbd000';
            ctx.fillRect(c.x, c.y, c.width, c.height);
            // Shine effect
            ctx.fillStyle = '#fff';
            ctx.fillRect(c.x + 4, c.y + 4, 4, 4);
        }
    });

    // Draw Enemies
    enemies.forEach(e => {
        if (e.isDead) return;
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x, e.y, e.width, e.height);
    });

    // Draw Player
    if (player.image.complete) {
        ctx.save();
        if (keys.left) {
            // Flip image horizontally
            ctx.scale(-1, 1);
            ctx.drawImage(player.image, -player.x - player.width, player.y, player.width, player.height);
        } else {
            ctx.drawImage(player.image, player.x, player.y, player.width, player.height);
        }
        ctx.restore();
    } else {
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

// Start game
loadLevel(0);
update();
