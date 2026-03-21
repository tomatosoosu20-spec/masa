// 3D Cyber Geometry Athletic Game

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
scene.fog = new THREE.FogExp2(0x050510, 0.02);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Renderer
const container = document.getElementById('game-container');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 50, 20);
dirLight.castShadow = true;
scene.add(dirLight);

// Elements
const distEl = document.getElementById('dist');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const currentPointsEl = document.getElementById('currentPoints');

const startScreen = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const shopScreen = document.getElementById('shop-screen');
const shopItemsContainer = document.getElementById('shopItemsContainer');

// Shop State
let pongPoints = localStorage.getItem('pong_total_points');
if (pongPoints === null) {
    pongPoints = 100;
    localStorage.setItem('pong_total_points', pongPoints);
} else {
    pongPoints = parseInt(pongPoints);
}

const skins = [
    { id: 'red', name: 'RED SKIN', color: 0xff0000, price: 50 },
    { id: 'yellow', name: 'YELLOW SKIN', color: 0xffff00, price: 50 },
    { id: 'green', name: 'GREEN SKIN', color: 0x00ff00, price: 50 },
    { id: 'blue', name: 'BLUE SKIN', color: 0x0000ff, price: 0 }, // FREE
    { id: 'brown', name: 'BROWN SKIN', color: 0x8b4513, price: 50 },
    { id: 'pink', name: 'PINK SKIN', color: 0xffc0cb, price: 50 },
    { id: 'purple', name: 'PURPLE SKIN', color: 0x800080, price: 50 },
    { id: 'silver', name: 'SILVER SKIN', color: 0xc0c0c0, price: 500 },
    { id: 'gold', name: 'GOLD SKIN', color: 0xffd700, price: 2000 },
    { id: 'hero', name: 'HERO SKIN', price: 600, image: 'assets/mario_player.png' }
];

let skinClickCounts = {};
skins.forEach(s => skinClickCounts[s.id] = 0);

// UI Update for Points
if (currentPointsEl) currentPointsEl.innerText = pongPoints;

// Game State
let level = 1;
let lives = 3;
let gameMode = 'normal';
let isGameStarted = false;
let isGameOver = false;
let isLevelClear = false;
let startTime = 0;

// Mode Buttons Logic
const setupModeBtns = () => {
    // Check Unlock Status
    if (localStorage.getItem('geometry_cleared') === 'true') {
        document.getElementById('start1000mBtn').classList.remove('hidden');
        document.getElementById('header1000mBtn').classList.remove('hidden');
        document.getElementById('retry1000mBtn').classList.remove('hidden');
    }

    // Start/Retry/Header logic unchanged...
    document.getElementById('startNormalBtn').addEventListener('click', () => startGame('normal'));
    document.getElementById('startEasyBtn').addEventListener('click', () => startGame('easy'));
    document.getElementById('start1000mBtn').addEventListener('click', () => startGame('1000m'));
    document.getElementById('retryNormalBtn').addEventListener('click', () => startGame('normal'));
    document.getElementById('retryEasyBtn').addEventListener('click', () => startGame('easy'));
    document.getElementById('retry1000mBtn').addEventListener('click', () => startGame('1000m'));
    document.getElementById('normalModeBtn').addEventListener('click', () => startGame('normal'));
    document.getElementById('easyModeBtn').addEventListener('click', () => startGame('easy'));
    document.getElementById('header1000mBtn').addEventListener('click', () => startGame('1000m'));

    // Shop Buttons
    document.getElementById('shopBtn').addEventListener('click', () => shopScreen.classList.remove('hidden'));
    document.getElementById('closeShopBtn').addEventListener('click', () => shopScreen.classList.add('hidden'));

    renderShop();
};

function renderShop() {
    if (!shopItemsContainer) return;
    shopItemsContainer.innerHTML = '';

    skins.forEach(skin => {
        const isBought = (skin.price === 0) || localStorage.getItem(`geometry_skin_${skin.id}_bought`) === 'true';
        if (skin.price === 0 && !localStorage.getItem(`geometry_skin_${skin.id}_bought`)) {
            localStorage.setItem(`geometry_skin_${skin.id}_bought`, 'true');
        }

        const item = document.createElement('div');
        item.className = 'shop-item';
        item.innerHTML = `
            <div class="item-preview ${skin.id}"></div>
            <h3>${skin.name}</h3>
            <p class="price" id="price-${skin.id}">${skin.price} PT ${isBought ? '(OWNED)' : ''}</p>
            <button class="btn btn-sm" id="btn-${skin.id}">${isBought ? 'EQUIP' : 'BUY'}</button>
        `;

        item.addEventListener('click', () => {
            if (isBought || skin.id === 'gold') return; // Gold skin is excluded from secret discount
            skinClickCounts[skin.id]++;
            if (skinClickCounts[skin.id] >= 26) {
                skin.price = 0;
                document.getElementById(`price-${skin.id}`).innerText = "0 (FREE!)";
                document.getElementById(`price-${skin.id}`).style.color = "#00ff41";
            }
        });

        item.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            const bought = localStorage.getItem(`geometry_skin_${skin.id}_bought`) === 'true';
            if (bought) {
                applySkin(skin.id);
                alert(`${skin.name} equipped!`);
                return;
            }

            if (pongPoints >= skin.price) {
                pongPoints -= skin.price;
                localStorage.setItem('pong_total_points', pongPoints);
                localStorage.setItem(`geometry_skin_${skin.id}_bought`, 'true');
                if (currentPointsEl) currentPointsEl.innerText = pongPoints;
                renderShop();
                applySkin(skin.id);
                alert(`Purchased and equipped ${skin.name}!`);
            } else {
                alert('ポイントが出ません。ピンポンゲームでポイントを貯めてください。');
            }
        });

        shopItemsContainer.appendChild(item);
    });
}

function applySkin(type) {
    const skin = skins.find(s => s.id === type);
    if (skin) {
        if (skin.image) {
            const texture = new THREE.TextureLoader().load(skin.image);
            player.material = new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                emissive: 0xffffff,
                emissiveIntensity: 0.2
            });
            // ジオメトリを平面に変更（見た目だけ）
            player.geometry = new THREE.PlaneGeometry(playerParams.size, playerParams.size);
            player.userData.is2D = true;
        } else {
            player.material = playerMat; // 元の共有マテリアルに戻す
            player.material.color.setHex(skin.color);
            player.material.emissive.setHex(skin.color);
            player.material.emissiveIntensity = 0.8;
            player.geometry = playerGeo; // 元のキューブに戻す
            player.userData.is2D = false;
        }
        localStorage.setItem('geometry_active_skin', type);
    }
}

function startGame(mode) {
    gameMode = mode;
    if (mode === 'easy') lives = 777;
    else if (mode === '1000m') lives = 1;
    else lives = 3;

    isGameStarted = true;
    isGameOver = false;
    isLevelClear = false;
    startTime = Date.now();

    // Reset Checkpoint state if first time or forced
    if (mode === '1000m') {
        const reached = localStorage.getItem('geometry_checkpoint_reached') === 'true';
        checkpointZ = reached ? -500 : 0;
    } else {
        checkpointZ = 0;
    }

    // UI Update
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    shopScreen.classList.add('hidden');

    // Reset Material if normal game (re-apply skin if owned)
    player.material.color.setHex(gameMode === '1000m' ? 0xff00de : 0x00f3ff);
    player.material.emissive.setHex(gameMode === '1000m' ? 0xff00de : 0x00f3ff);
    player.material.emissiveIntensity = 0.5;

    const activeSkin = localStorage.getItem('geometry_active_skin');
    if (activeSkin) applySkin(activeSkin);

    if (gameMode === '1000m') {
        loadLevel(999); // Special index for 1000m mode
    } else {
        loadLevel(0);
    }
}

// Player
const playerParams = {
    size: 1,
    speed: 0.165,
    jumpForce: 0.25,
    gravity: 0.01
};

const playerGeo = new THREE.BoxGeometry(playerParams.size, playerParams.size, playerParams.size);
const playerMat = new THREE.MeshStandardMaterial({
    color: 0x00f3ff,
    emissive: 0x00f3ff,
    emissiveIntensity: 0.5
});
const player = new THREE.Mesh(playerGeo, playerMat);
player.castShadow = true;
scene.add(player);

// Particle system for effects
let particles = [];
function createParticle(pos, color = 0xffffff) {
    const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
    const p = new THREE.Mesh(geo, mat);
    p.position.set(
        pos.x + (Math.random() - 0.5) * 1.5,
        pos.y + (Math.random() - 0.5) * 1.5,
        pos.z + (Math.random() - 0.5) * 1.5
    );
    p.userData = {
        vx: (Math.random() - 0.5) * 0.05,
        vy: 0.05 + Math.random() * 0.05,
        vz: (Math.random() - 0.5) * 0.05,
        life: 1.0
    };
    scene.add(p);
    particles.push(p);
}

// Physics State
let velocity = new THREE.Vector3();
let onGround = false;

// Levels (3D)
let platforms = [];
let hazards = [];
let movingPlatforms = [];
let currentPlatform = null;
let goal = null;
let warpGoalMesh = null;
let deathFlag = null; // 500m地点の旗
let checkpointZ = 0; // チェックポイント

const levelData = [
    {
        start: { x: 0, y: 5, z: 0 },
        blocks: [
            { x: 0, y: 0, z: 0, w: 4, h: 1, d: 20, color: 0x00f3ff },
            { x: 0, y: 2, z: -15, w: 4, h: 1, d: 8, color: 0x00f3ff },
            { x: 0, y: 4, z: -25, w: 4, h: 1, d: 8, color: 0x00f3ff },
            { x: 0, y: 4, z: -35, w: 2, h: 1, d: 8, color: 0x00f3ff },
        ],
        hazards: [{ x: 0, y: 2, z: -15, w: 4, h: 0.5, d: 2 }],
        goal: { x: 0, y: 5, z: -45 }
    },
    {
        start: { x: 0, y: 5, z: 0 },
        blocks: [
            { x: 0, y: 0, z: 0, w: 4, h: 1, d: 10, color: 0xff00ff },
            { x: 0, y: 0, z: -12, w: 3, h: 1, d: 3, color: 0xff00ff },
            { x: 4, y: 1, z: -18, w: 3, h: 1, d: 3, color: 0xff00ff },
            { x: 0, y: 2, z: -25, w: 3, h: 1, d: 3, color: 0xff00ff },
            { x: -4, y: 3, z: -32, w: 3, h: 1, d: 3, color: 0xff00ff },
            { x: 0, y: 4, z: -40, w: 6, h: 1, d: 6, color: 0xff00ff },
        ],
        hazards: [],
        goal: { x: 0, y: 5, z: -40 }
    },
    {
        start: { x: 0, y: 5, z: 0 },
        blocks: [
            { x: 0, y: 0, z: 0, w: 4, h: 1, d: 10, color: 0x00ff41 },
            { x: 0, y: 0, z: -15, w: 2, h: 1, d: 10, color: 0x00ff41 },
            { x: 0, y: 0, z: -30, w: 2, h: 1, d: 10, color: 0x00ff41 },
            { x: 0, y: 2, z: -45, w: 4, h: 1, d: 10, color: 0x00ff41 },
            { x: 0, y: 1, z: 8, w: 2, h: 1, d: 2, color: 0x333333 },
            { x: 0, y: 2, z: 14, w: 2, h: 1, d: 2, color: 0x333333 },
            { x: 0, y: 3, z: 20, w: 4, h: 1, d: 4, color: 0xffd700 },
        ],
        hazards: [{ x: 0, y: 0.5, z: -22, w: 4, h: 0.5, d: 2 }],
        goal: { x: 0, y: 3, z: -48 },
        warpGoal: { x: 0, y: 4, z: 20, targetLevel: 7 }
    },
    {
        start: { x: 0, y: 5, z: 0 },
        blocks: [
            { x: 0, y: 0, z: 0, w: 4, h: 1, d: 6, color: 0xffff00 },
            { x: 3, y: 1, z: -8, w: 4, h: 1, d: 4, color: 0xffff00 },
            { x: -1, y: 2, z: -14, w: 4, h: 1, d: 4, color: 0xffff00 },
            { x: 3, y: 3, z: -20, w: 4, h: 1, d: 4, color: 0xffff00 },
            { x: 0, y: 4, z: -28, w: 6, h: 1, d: 6, color: 0xffff00 },
        ],
        hazards: [],
        goal: { x: 0, y: 5, z: -28 }
    },
    {
        start: { x: 0, y: 5, z: 0 },
        blocks: [
            { x: 0, y: 0, z: 0, w: 4, h: 1, d: 4, color: 0xff0000 },
            { x: 0, y: 0, z: -8, w: 2, h: 1, d: 2, color: 0xff0000 },
            { x: 0, y: 0, z: -14, w: 2, h: 1, d: 2, color: 0xff0000 },
            { x: 0, y: 0, z: -20, w: 2, h: 1, d: 2, color: 0xff0000 },
            { x: 0, y: 0, z: -26, w: 2, h: 1, d: 2, color: 0xff0000 },
            { x: 0, y: 0, z: -35, w: 4, h: 1, d: 4, color: 0xff0000 },
        ],
        hazards: [],
        goal: { x: 0, y: 1, z: -35 }
    },
    {
        start: { x: 0, y: 5, z: 0 },
        blocks: [
            { x: 0, y: 0, z: 0, w: 4, h: 1, d: 6, color: 0xffffff },
            { x: 5, y: 0, z: -10, w: 3, h: 1, d: 3, color: 0xffffff },
            { x: 10, y: 0, z: -20, w: 3, h: 1, d: 3, color: 0xffffff },
            { x: 15, y: 0, z: -30, w: 3, h: 1, d: 3, color: 0xffffff },
            { x: 20, y: 0, z: -40, w: 6, h: 1, d: 6, color: 0xffffff },
        ],
        hazards: [],
        goal: { x: 20, y: 1, z: -40 }
    },
    {
        start: { x: 0, y: 5, z: 0 },
        blocks: [
            { x: 0, y: 0, z: 0, w: 4, h: 1, d: 5, color: 0x0000ff },
            { x: 4, y: 1, z: -8, w: 2, h: 1, d: 2, color: 0x0000ff },
            { x: -3, y: 2, z: -15, w: 3, h: 1, d: 3, color: 0x0000ff },
            { x: 2, y: 3, z: -22, w: 2, h: 1, d: 2, color: 0x0000ff },
            { x: -4, y: 4, z: -30, w: 3, h: 1, d: 3, color: 0x0000ff },
            { x: 0, y: 5, z: -38, w: 6, h: 1, d: 6, color: 0x0000ff },
        ],
        hazards: [
            { x: -3, y: 2.5, z: -15, w: 1, h: 0.5, d: 1 },
            { x: -4, y: 4.5, z: -30, w: 1, h: 0.5, d: 1 },
        ],
        goal: { x: 0, y: 6, z: -38 }
    },
    {
        start: { x: 0, y: 5, z: 0 },
        blocks: [
            { x: 0, y: 0, z: 0, w: 4, h: 1, d: 4, color: 0x800080 },
            { x: 4, y: 1, z: 0, w: 4, h: 1, d: 4, color: 0x800080, move: { axis: 'x', range: 3, speed: 2 } },
            { x: 4, y: 2, z: 4, w: 4, h: 1, d: 4, color: 0x800080, move: { axis: 'z', range: 3, speed: 1.5 } },
            { x: 0, y: 3, z: 4, w: 4, h: 1, d: 4, color: 0x800080, move: { axis: 'y', range: 2, speed: 2 } },
            { x: -4, y: 4, z: 4, w: 4, h: 1, d: 4, color: 0x800080, move: { axis: 'x', range: 3, speed: 1.5 } },
            { x: -4, y: 5, z: 0, w: 4, h: 1, d: 4, color: 0x800080, move: { axis: 'z', range: 3, speed: 2 } },
            { x: 0, y: 6, z: 0, w: 4, h: 1, d: 4, color: 0x800080 },
        ],
        hazards: [],
        goal: { x: 0, y: 7, z: 0 }
    },
    {
        start: { x: 0, y: 5, z: 0 },
        blocks: [
            { x: 0, y: 0, z: 0, w: 4, h: 1, d: 5, color: 0xff8800 },
            { x: 4, y: 1, z: -8, w: 4, h: 1, d: 4, color: 0xff8800, move: { axis: 'x', range: 4, speed: 2 } },
            { x: -4, y: 2, z: -16, w: 4, h: 1, d: 4, color: 0xff8800, move: { axis: 'x', range: 4, speed: 2.5 } },
            { x: 0, y: 3, z: -24, w: 4, h: 1, d: 4, color: 0xff8800, move: { axis: 'z', range: 3, speed: 1.5 } },
            { x: 0, y: 4, z: -32, w: 6, h: 1, d: 6, color: 0xff8800, move: { axis: 'y', range: 2, speed: 2 } },
            { x: 0, y: 5, z: -40, w: 6, h: 1, d: 6, color: 0xff8800 },
        ],
        hazards: [],
        goal: { x: 0, y: 6, z: -40 }
    },
    // Level 10 (Swapped from Level 12)
    {
        start: { x: 0, y: 5, z: 0 },
        blocks: [
            { x: 0, y: 0, z: 0, w: 4, h: 1, d: 5, color: 0xff00ff },
            { x: 0, y: 0, z: -10, w: 1, h: 1, d: 5, color: 0xff00ff },
            { x: 3, y: 1, z: -15, w: 3, h: 1, d: 3, color: 0xff00ff },
            { x: -3, y: 2, z: -22, w: 3, h: 1, d: 3, color: 0xff00ff },
            { x: 0, y: 3, z: -30, w: 1, h: 1, d: 8, color: 0xff00ff },
            { x: 0, y: 3, z: -40, w: 6, h: 1, d: 6, color: 0xff00ff },
        ],
        hazards: [{ x: 0, y: 3.5, z: -30, w: 1, h: 0.5, d: 1 }],
        goal: { x: 0, y: 4, z: -40 }
    },
    {
        start: { x: 0, y: 5, z: 0 },
        blocks: [
            { x: 0, y: 0, z: 0, w: 4, h: 1, d: 4, color: 0xffffff },
            { x: 0, y: 2, z: -8, w: 2, h: 1, d: 2, color: 0xffffff },
            { x: 0, y: 4, z: -16, w: 2, h: 1, d: 2, color: 0xffffff },
            { x: 0, y: 6, z: -24, w: 2, h: 1, d: 2, color: 0xffffff },
            { x: 0, y: 8, z: -32, w: 4, h: 1, d: 4, color: 0xffffff },
        ],
        hazards: [],
        goal: { x: 0, y: 9, z: -32 }
    },
    // Level 12 (Swapped from Level 10 and expanded 3x)
    {
        start: { x: 0, y: 5, z: 0 },
        blocks: [
            // Section A: Branches (0 - 30m)
            { x: 0, y: 0, z: 0, w: 6, h: 1, d: 6, color: 0x0088ff },
            { x: -5, y: 0, z: -15, w: 2, h: 1, d: 20, color: 0x0088ff },
            { x: 5, y: 0, z: -15, w: 2, h: 1, d: 20, color: 0x0088ff },
            { x: 0, y: 0, z: -30, w: 12, h: 1, d: 6, color: 0x0088ff },

            // Section B: Vertical Ascent (30 - 60m)
            { x: -4, y: 2, z: -40, w: 3, h: 1, d: 3, color: 0x0088ff },
            { x: 4, y: 4, z: -50, w: 3, h: 1, d: 3, color: 0x0088ff },
            { x: 0, y: 6, z: -60, w: 8, h: 1, d: 6, color: 0x0088ff },

            // Section C: The Thin High Path (60 - 95m)
            { x: 0, y: 6, z: -75, w: 1, h: 1, d: 25, color: 0x0088ff },
            { x: 0, y: 6, z: -95, w: 10, h: 1, d: 10, color: 0x0088ff }, // Final Goal Area
        ],
        hazards: [
            { x: -5, y: 0.5, z: -15, w: 1, h: 0.5, d: 1 },
            { x: 5, y: 0.5, z: -25, w: 1, h: 0.5, d: 1 },
            { x: 0, y: 6.5, z: -75, w: 1, h: 0.5, d: 2 },
            { x: -3, y: 6.5, z: -90, w: 2, h: 0.5, d: 2 },
            { x: 3, y: 6.5, z: -90, w: 2, h: 0.5, d: 2 },
        ],
        goal: { x: 0, y: 7, z: -95 }
    }
];

function generate1000mLevel() {
    const data = {
        start: { x: 0, y: 5, z: 0 },
        blocks: [
            { x: 0, y: 0, z: 0, w: 6, h: 1, d: 10, color: 0xff00de }
        ],
        hazards: [],
        goal: { x: 0, y: 0, z: -1000 }
    };

    let cx = 0, cy = 0, cz = -8;
    let checkpointSpawned = false;

    // Generate up to -1000m
    while (cz > -1000) {
        // Randomize next platform params
        let gap = 2 + Math.random() * 3; // 2-5m jump
        let width = 2 + Math.random() * 3;
        let depth = 2 + Math.random() * 6;
        let height = 1;
        let color = Math.random() > 0.8 ? 0xffffff : 0xff00de;
        let isMoving = Math.random() < 0.1;

        // Force a large platform at -500m
        if (!checkpointSpawned && cz <= -480) {
            gap = 5;
            width = 15;
            depth = 15;
            color = 0x800080; // Dark purple for checkpoint
            isMoving = false;
            checkpointSpawned = true;
            cx = 0; // Center the checkpoint platform
            cz = -500; // Exact position
        } else {
            cz -= (gap + depth / 2);
            // Random X/Y variation
            if (Math.random() > 0.3) cx += (Math.random() - 0.5) * 6; // +/- 3m
            if (Math.random() > 0.4) cy += (Math.random() - 0.5) * 4; // +/- 2m
        }

        // Clamp Y to avoid too high/low
        if (cy > 10) cy = 10;
        if (cy < -5) cy = -5;

        // Add Platform
        const block = { x: cx, y: cy, z: cz, w: width, h: height, d: depth, color: color };

        if (isMoving) {
            block.move = { axis: Math.random() > 0.5 ? 'x' : 'y', range: 3, speed: 1 + Math.random() };
            block.color = 0x00ffea;
        } else if (checkpointSpawned && cz < -505) {
            // Cloud platforms after checkpoint
            block.type = 'cloud';
            block.color = 0xffffff;
        }

        data.blocks.push(block);

        // 5% chance to add hazard on top (skip for checkpoint)
        if (!checkpointSpawned && Math.random() < 0.05 && depth > 3) {
            data.hazards.push({ x: cx, y: cy + 0.75, z: cz, w: width, h: 0.5, d: 1 });
        }

        cz -= depth / 2; // Move reference to end of block
    }

    // Set final goal position
    data.goal = { x: cx, y: cy + 2, z: cz - 5 };
    // Final platform for goal
    data.blocks.push({ x: cx, y: cy, z: cz - 5, w: 6, h: 1, d: 6, color: 0xffff00 });

    return data;
}

function loadLevel(idx) {
    if (idx === 999) {
        level = '1000m';
        levelEl.innerText = 'MAX';
    } else {
        if (idx >= levelData.length) {
            gameClear();
            return;
        }
        level = idx + 1;
        levelEl.innerText = level;
    }

    updateLivesUI();
    camYaw = 0;
    camPitch = 0.5;

    platforms.forEach(p => scene.remove(p));
    hazards.forEach(h => scene.remove(h));
    if (goal) scene.remove(goal);
    if (warpGoalMesh) scene.remove(warpGoalMesh);
    if (deathFlag) scene.remove(deathFlag);
    platforms = [];
    hazards = [];
    movingPlatforms = [];
    warpGoalMesh = null;
    deathFlag = null;

    if (idx !== 999) checkpointZ = 0; // Reset checkpoint for normal levels
    const data = (idx === 999) ? generate1000mLevel() : levelData[idx];

    // Warp to checkpoint if reached
    if (idx === 999 && checkpointZ === -500) {
        player.position.set(0, 5, -500);
    } else {
        player.position.set(data.start.x, data.start.y, data.start.z);
    }
    velocity.set(0, 0, 0);

    data.blocks.forEach(b => {
        const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
        const mat = new THREE.MeshStandardMaterial({ color: b.color, transparent: true, opacity: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(b.x, b.y, b.z);
        mesh.userData = { w: b.w, h: b.h, d: b.d, type: b.type || 'platform' };
        if (b.move) {
            mesh.userData.move = b.move;
            mesh.userData.startX = b.x;
            mesh.userData.startY = b.y;
            mesh.userData.startZ = b.z;
            movingPlatforms.push(mesh);
        }
        mesh.receiveShadow = true;
        scene.add(mesh);
        platforms.push(mesh);
        const edges = new THREE.EdgesGeometry(geo);
        mesh.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })));
    });

    if (data.hazards) {
        data.hazards.forEach(h => {
            const geo = new THREE.BoxGeometry(h.w, h.h, h.d);
            const mat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(h.x, h.y, h.z);
            mesh.userData = { w: h.w, h: h.h, d: h.d, type: 'hazard' };
            scene.add(mesh);
            hazards.push(mesh);
        });
    }

    const gGeo = new THREE.BoxGeometry(2, 4, 2);
    const gMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, opacity: 0.5, transparent: true });
    goal = new THREE.Mesh(gGeo, gMat);
    goal.position.set(data.goal.x, data.goal.y, data.goal.z);
    scene.add(goal);

    if (data.warpGoal) {
        const wGeo = new THREE.BoxGeometry(2, 4, 2);
        const wMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, opacity: 0.7, transparent: true });
        warpGoalMesh = new THREE.Mesh(wGeo, wMat);
        warpGoalMesh.position.set(data.warpGoal.x, data.warpGoal.y, data.warpGoal.z);
        warpGoalMesh.userData = { targetLevel: data.warpGoal.targetLevel };
        scene.add(warpGoalMesh);
    }

    // 500m Flag (Death Flag)
    // 1000mモード、またはゴールが500mより先にある場合に設置
    const goalDist = Math.abs(data.goal.z);
    if (goalDist >= 500 || idx === 999) {
        const flagGroup = new THREE.Group();

        // Pole
        const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 8, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 4;
        flagGroup.add(pole);

        // Flag fabric
        const isReached = localStorage.getItem('geometry_checkpoint_reached') === 'true';
        const fabricGeo = new THREE.BoxGeometry(2, 1.5, 0.1);
        const fabricMat = new THREE.MeshStandardMaterial({
            color: isReached ? 0x00ff00 : 0xff0000,
            emissive: isReached ? 0x00ff00 : 0xff0000,
            emissiveIntensity: 0.5
        });
        const fabric = new THREE.Mesh(fabricGeo, fabricMat);
        fabric.position.set(1, 7, 0);
        fabric.userData = { type: 'flagFabric' };
        flagGroup.add(fabric);

        // Find a platform near -500 to place the flag on
        const targetZ = -500;
        const nearbyBlock = data.blocks.find(b => Math.abs(b.z - targetZ) < 5); // Tighten search
        let flagX = 0, flagY = 0;

        if (nearbyBlock) {
            flagX = nearbyBlock.x;
            flagY = nearbyBlock.y + nearbyBlock.h / 2;
        } else {
            flagX = 0; flagY = 5;
        }

        flagGroup.position.set(flagX, flagY, targetZ);
        flagGroup.userData = { w: 2, h: 8, d: 2, type: 'hazard' }; // Use hazard type for logic
        scene.add(flagGroup);
        deathFlag = flagGroup;
    }
}

function updateLivesUI() {
    if (!livesEl) return;
    livesEl.innerText = lives > 10 ? "❤️ x " + lives : "❤️".repeat(Math.max(0, lives));
}

function takeDamage() {
    lives--;
    updateLivesUI();
    if (lives <= 0) gameOver();
    else {
        player.material.emissive.setHex(0xff0000);
        setTimeout(() => player.material.emissive.setHex(0x00f3ff), 500);
        const data = (level === '1000m') ? { start: { x: 0, y: 5, z: 0 } } : levelData[level - 1];
        if (level === '1000m') {
            // Checkpoint respawn for 1000m
            if (checkpointZ < 0) {
                // Respawn at checkpoint (slighly back from -500 if that was it)
                player.position.set(0, 5, checkpointZ + 2); // Respawn slightly "before" checkpoint
            } else {
                loadLevel(999);
            }
            velocity.set(0, 0, 0);
            return;
        }
        player.position.set(data.start.x, data.start.y, data.start.z);
        velocity.set(0, 0, 0);
    }
}

let camYaw = 0, camPitch = 0.5;
let isFirstPerson = false;
const CAM_DIST = 8;
const keys = { up: false, down: false, left: false, right: false, space: false, w: false, a: false, s: false, d: false };

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp') keys.up = true;
    if (e.code === 'ArrowDown') keys.down = true;
    if (e.code === 'ArrowLeft') keys.left = true;
    if (e.code === 'ArrowRight') keys.right = true;
    if (e.code === 'Space') keys.space = true;
    if (e.code === 'KeyW') keys.w = true;
    if (e.code === 'KeyA') keys.a = true;
    if (e.code === 'KeyS') keys.s = true;
    if (e.code === 'KeyD') keys.d = true;

    if (e.code === 'Digit1') {
        isFirstPerson = !isFirstPerson;
        player.visible = !isFirstPerson;
    }
});
window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp') keys.up = false;
    if (e.code === 'ArrowDown') keys.down = false;
    if (e.code === 'ArrowLeft') keys.left = false;
    if (e.code === 'ArrowRight') keys.right = false;
    if (e.code === 'Space') keys.space = false;
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'KeyD') keys.d = false;
});

function checkCollision(obj) {
    const pMinX = player.position.x - 0.5, pMaxX = player.position.x + 0.5;
    const pMinY = player.position.y - 0.5, pMaxY = player.position.y + 0.5;
    const pMinZ = player.position.z - 0.5, pMaxZ = player.position.z + 0.5;
    const oMinX = obj.position.x - obj.userData.w / 2, oMaxX = obj.position.x + obj.userData.w / 2;
    const oMinY = obj.position.y - obj.userData.h / 2, oMaxY = obj.position.y + obj.userData.h / 2;
    const oMinZ = obj.position.z - obj.userData.d / 2, oMaxZ = obj.position.z + obj.userData.d / 2;
    return (pMinX < oMaxX && pMaxX > oMinX && pMinY < oMaxY && pMaxY > oMinY && pMinZ < oMaxZ && pMaxZ > oMinZ);
}

function update() {
    if (!isGameStarted || isGameOver || isLevelClear) {
        renderer.render(scene, camera);
        requestAnimationFrame(update);
        return;
    }

    if (isFirstPerson) {
        if (keys.a) camYaw -= 0.03;
        if (keys.d) camYaw += 0.03;
        if (keys.w) camPitch = Math.max(camPitch - 0.03, 0.1);
        if (keys.s) camPitch = Math.min(camPitch + 0.03, 1.5);
    } else {
        if (keys.a) camYaw += 0.03;
        if (keys.d) camYaw -= 0.03;
        if (keys.w) camPitch = Math.min(camPitch + 0.03, 1.5);
        if (keys.s) camPitch = Math.max(camPitch - 0.03, 0.1);
    }

    let moveSpeed = playerParams.speed;
    if (localStorage.getItem('geometry_active_skin') === 'gold') {
        moveSpeed *= 2;
    }
    let ix = 0, iz = 0;
    if (keys.up) iz -= 1; if (keys.down) iz += 1;
    if (keys.left) ix -= 1; if (keys.right) ix += 1;
    if (ix !== 0 || iz !== 0) {
        const s = Math.sin(camYaw), c = Math.cos(camYaw);
        player.position.x += (ix * c + iz * s) * moveSpeed;
        player.position.z += (-ix * s + iz * c) * moveSpeed;
    }

    if (keys.space && onGround) { velocity.y = playerParams.jumpForce; onGround = false; }
    velocity.y -= playerParams.gravity;
    player.position.y += velocity.y;

    // Billboard effect for 2D skins
    if (player.userData.is2D) {
        player.quaternion.copy(camera.quaternion);
    } else {
        player.rotation.set(0, 0, 0); // Reset rotation for 3D boxes
    }

    // Move platforms
    const time = Date.now() * 0.001;
    movingPlatforms.forEach(p => {
        const move = p.userData.move;
        const oldPos = p.position.clone();
        const offset = Math.sin(time * move.speed) * move.range;

        if (move.axis === 'x') p.position.x = p.userData.startX + offset;
        if (move.axis === 'y') p.position.y = p.userData.startY + offset;
        if (move.axis === 'z') p.position.z = p.userData.startZ + offset;

        // Carry player if on this platform
        if (currentPlatform === p) {
            const movement = p.position.clone().sub(oldPos);
            player.position.add(movement);
        }
    });

    onGround = false;
    currentPlatform = null;
    for (let p of platforms) {
        if (checkCollision(p)) {
            if (velocity.y <= 0 && player.position.y > p.position.y + p.userData.h / 2) {
                player.position.y = p.position.y + p.userData.h / 2 + 0.5;
                velocity.y = 0; onGround = true;
                currentPlatform = p;

                // Cloud platform descending logic
                if (p.userData.type === 'cloud') {
                    const fallSpeed = 0.05;
                    p.position.y -= fallSpeed;
                    player.position.y -= fallSpeed;
                }
            }
        }
    }

    for (let h of hazards) if (checkCollision(h)) takeDamage();

    // Death Flag Collision (Now Checkpoint Flag)
    if (deathFlag) {
        const pPos = player.position;
        const fPos = deathFlag.position;
        const dx = Math.abs(pPos.x - fPos.x);
        const dy = pPos.y - fPos.y;
        const dz = Math.abs(pPos.z - fPos.z);
        if (dz < 1.5 && dx < 2 && dy > 0 && dy < 8) {
            // Reached Checkpoint
            if (checkpointZ === 0) {
                checkpointZ = -500;
                localStorage.setItem('geometry_checkpoint_reached', 'true');
                // Change flag color to green
                deathFlag.children.forEach(child => {
                    if (child.userData.type === 'flagFabric') {
                        child.material.color.setHex(0x00ff00);
                        child.material.emissive.setHex(0x00ff00);
                    }
                });
                player.material.emissive.setHex(0x00ff00);
                setTimeout(() => {
                    const activeSkin = localStorage.getItem('geometry_active_skin');
                    if (activeSkin) applySkin(activeSkin);
                    else player.material.emissive.setHex(gameMode === '1000m' ? 0xff00de : 0x00f3ff);
                }, 1000);
            }
        }
    }

    if (goal && player.position.distanceTo(goal.position) < 2) {
        if (gameMode === '1000m') {
            alert('1000m CHALLENGE CLEARED! AMAZING!');
            location.reload();
        } else {
            loadLevel(level);
        }
    }
    if (warpGoalMesh && player.position.distanceTo(warpGoalMesh.position) < 2) loadLevel(warpGoalMesh.userData.targetLevel);

    if (player.position.y < -10) takeDamage();

    if (isFirstPerson) {
        camera.position.copy(player.position);
        camera.position.y += 0.4; // Eye level
        const target = new THREE.Vector3();
        target.x = player.position.x - Math.sin(camYaw);
        target.z = player.position.z - Math.cos(camYaw);
        target.y = camera.position.y + (0.5 - camPitch) * 2; // Look up/down adjustment
        camera.lookAt(target);
    } else {
        camera.position.x = player.position.x + Math.sin(camYaw) * CAM_DIST;
        camera.position.z = player.position.z + Math.cos(camYaw) * CAM_DIST;
        camera.position.y = player.position.y + CAM_DIST * camPitch;
        camera.lookAt(player.position);
    }

    // Effect Particles
    const activeSkin = localStorage.getItem('geometry_active_skin');
    if (activeSkin === 'silver' && Math.random() < 0.3) {
        createParticle(player.position, 0xffffff); // White sparkle for silver
    } else if (activeSkin === 'gold' && Math.random() < 0.5) {
        createParticle(player.position, 0xffcc00); // Golden sparkle for gold (more frequent)
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.x += p.userData.vx;
        p.position.y += p.userData.vy;
        p.position.z += p.userData.vz;
        p.userData.life -= 0.02;
        p.material.opacity = p.userData.life;
        if (p.userData.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }

    distEl.innerText = Math.abs(Math.floor(player.position.z));

    // Checkpoint logic
    if (level === '1000m' && player.position.z <= -500 && checkpointZ === 0) {
        checkpointZ = -500;
        player.material.emissive.setHex(0x00ff00); // Visual feedback
        setTimeout(() => {
            const activeSkin = localStorage.getItem('geometry_active_skin');
            if (activeSkin) applySkin(activeSkin);
            else player.material.emissive.setHex(gameMode === '1000m' ? 0xff00de : 0x00f3ff);
        }, 1000);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(update);
}

function gameOver() {
    isGameOver = true;
    gameoverScreen.classList.remove('hidden');
    player.material.color.setHex(0xff0000);
}

function gameClear() {
    isLevelClear = true;
    const endTime = Date.now();
    const clearTime = Math.floor((endTime - startTime) / 1000);
    alert(`あなたはこのゲームをクリアしました。\nタイム: ${clearTime}秒`);
    localStorage.setItem('geometry_cleared', 'true');
    location.reload();
}

setupModeBtns();
const activeSkin = localStorage.getItem('geometry_active_skin');
if (activeSkin) applySkin(activeSkin);
update();
loadLevel(0); // Setup initial level view behind menu
