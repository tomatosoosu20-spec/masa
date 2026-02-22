/**
 * CYBER SHOOTER - Rich Shop UI Version
 */

// Scene Settings
const scene = new THREE.Scene();
const skyColor = 0x052005;
scene.background = new THREE.Color(skyColor);
scene.fog = new THREE.FogExp2(skyColor, 0.02);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('game-container').appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);
const spotLight = new THREE.SpotLight(0x00ff41, 4);
spotLight.position.set(0, 20, 0);
scene.add(spotLight);
const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(0, 10, 10);
scene.add(pointLight);

// Elements
const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const overlay = document.getElementById('overlay');
const shopOverlay = document.getElementById('shop-overlay');
const shopPointsEl = document.getElementById('shop-points');
const messageEl = document.getElementById('message');
const ammoEl = document.getElementById('ammo');

// Game State
let isPlaying = false;
let isShopOpen = false;
let score = 0;
let health = 100;
let enemies = [];
const moveState = { forward: false, backward: false, left: false, right: false };

// Player Stats (Upgradable)
let rapidLv = 0;
let fireRate = 450; // Initial
let weaponType = 'laser'; // 'laser' or 'triple'

// Floor
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400, 40, 40),
    new THREE.MeshStandardMaterial({ color: 0x00ff41, transparent: true, opacity: 0.8 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Weapon
const gunGroup = new THREE.Group();
const gunBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
);
gunBody.position.set(0.3, -0.4, -0.6);
gunGroup.add(gunBody);
camera.add(gunGroup);
scene.add(camera);

const clock = new THREE.Clock();
let pitch = 0, yaw = 0;

// Shop Logic & HUD
const updateHUD = () => {
    scoreEl.innerText = score;
    healthEl.innerText = Math.max(0, Math.floor(health));
    shopPointsEl.innerText = score;
    ammoEl.innerText = "INF";
    updateShopUI();
};

const updateShopUI = () => {
    const prices = { rapid: (rapidLv + 1) * 500, repair: 300, triple: 3000 };

    // Rapid Fire Card
    const cardRapid = document.getElementById('card-rapid');
    const statusRapid = document.getElementById('status-rapid');
    const priceRapid = document.getElementById('price-rapid');
    const btnRapid = document.getElementById('buyRapidBtn');

    if (rapidLv >= 5) {
        statusRapid.innerText = "MAX LEVEL";
        priceRapid.innerText = "--- pt";
        cardRapid.classList.add('disabled');
        btnRapid.innerText = "MAXED";
    } else {
        statusRapid.innerText = `Lv.${rapidLv}`;
        priceRapid.innerText = `${prices.rapid} pt`;
        cardRapid.classList.toggle('disabled', score < prices.rapid);
        btnRapid.innerText = "UPGRADE";
    }

    // Repair Card
    const statusRepair = document.getElementById('status-repair');
    const cardRepair = document.getElementById('card-repair');
    statusRepair.innerText = health >= 100 ? "OPTIMAL" : `${Math.floor(health)}%`;
    cardRepair.classList.toggle('disabled', score < prices.repair || health >= 100);

    // Triple Gun Card
    const cardCannon = document.getElementById('card-cannon');
    const statusCannon = document.getElementById('status-cannon');
    const btnCannon = document.getElementById('buyCannonBtn');
    if (weaponType === 'triple') {
        statusCannon.innerText = "EQUIPPED";
        cardCannon.classList.add('active-item');
        cardCannon.classList.remove('disabled');
        btnCannon.innerText = "OWNED";
    } else {
        statusCannon.innerText = "NOT OWNED";
        cardCannon.classList.remove('active-item');
        cardCannon.classList.toggle('disabled', score < prices.triple);
        btnCannon.innerText = "INSTALL";
    }
};

const showShopMessage = (text, isError = false) => {
    messageEl.innerText = text;
    messageEl.style.color = isError ? "#ff0044" : "#00ff41";
    setTimeout(() => { if (!isShopOpen) messageEl.style.color = "var(--neon-green)"; }, 2000);
};

const toggleShop = (forceClose = false) => {
    if (forceClose || isShopOpen) {
        isShopOpen = false;
        shopOverlay.classList.add('hidden');
        if (isPlaying) document.body.requestPointerLock();
    } else {
        isShopOpen = true;
        shopOverlay.classList.remove('hidden');
        document.exitPointerLock();
    }
    updateHUD();
};

let lastFireTime = 0;
const shoot = () => {
    if (!isPlaying || isShopOpen) return;
    const now = Date.now();
    if (now - lastFireTime < fireRate) return;
    lastFireTime = now;

    // Define weapon properties
    const isTriple = (weaponType === 'triple');
    const color = isTriple ? 0xff00ff : 0x00ff41;
    const size = isTriple ? 0.08 : 0.01;

    // Rotation offsets for triple shot (in radians)
    const angles = isTriple ? [-0.15, 0, 0.15] : [0];

    angles.forEach(angleOffset => {
        // Calculate direction: base forward vector rotated by camera + lateral offset
        const direction = new THREE.Vector3(0, 0, -1);
        // Apply lateral rotation in camera's local space
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);
        // Transform to world space
        direction.applyQuaternion(camera.quaternion);

        // Muzzle Flash
        const flash = new THREE.PointLight(color, 20, 5);
        flash.position.copy(camera.position).add(direction.clone().multiplyScalar(1.5));
        scene.add(flash);
        setTimeout(() => scene.remove(flash), 50);

        // Laser Beam Mesh
        const laserGeo = new THREE.BoxGeometry(size, size, 80);
        const laserMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
        const laser = new THREE.Mesh(laserGeo, laserMat);

        // Align z-axis of box with direction
        laser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
        laser.position.copy(camera.position).add(direction.clone().multiplyScalar(40));
        scene.add(laser);
        setTimeout(() => scene.remove(laser), 100);

        // Hit Detection
        const raycaster = new THREE.Raycaster(camera.position, direction.clone().normalize());
        const intersects = raycaster.intersectObjects(enemies);
        if (intersects.length > 0) {
            destroyEnemy(intersects[0].object);
        }
    });
};

function spawnEnemy() {
    if (!isPlaying || isShopOpen) return;
    const size = 1.5;
    const enemy = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshStandardMaterial({ color: 0xff0044, emissive: 0xff0044, emissiveIntensity: 0.5 })
    );
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 20;
    enemy.position.set(camera.position.x + Math.cos(angle) * dist, size / 2, camera.position.z + Math.sin(angle) * dist);
    scene.add(enemy);
    enemies.push(enemy);
}

function destroyEnemy(target) {
    scene.remove(target);
    enemies = enemies.filter(e => e !== target);
    score += 100;
    updateHUD();
    const p = new THREE.PointLight(0xff0044, 15, 6);
    p.position.copy(target.position);
    scene.add(p);
    setTimeout(() => scene.remove(p), 200);
}

// Event Listeners
document.addEventListener('mousemove', (e) => {
    if (!isPlaying || isShopOpen) return;
    yaw -= (e.movementX || 0) * 0.002;
    pitch -= (e.movementY || 0) * 0.002;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyP') toggleShop();
    if (!isPlaying || isShopOpen) return;
    if (e.code === 'KeyW') moveState.forward = true;
    if (e.code === 'KeyS') moveState.backward = true;
    if (e.code === 'KeyA') moveState.left = true;
    if (e.code === 'KeyD') moveState.right = true;
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyW') moveState.forward = false;
    if (e.code === 'KeyS') moveState.backward = false;
    if (e.code === 'KeyA') moveState.left = false;
    if (e.code === 'KeyD') moveState.right = false;
});

window.addEventListener('mousedown', shoot);
document.getElementById('startBtn').addEventListener('click', () => document.body.requestPointerLock());

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === document.body) {
        isPlaying = true;
        overlay.classList.add('hidden');
        messageEl.innerText = "SYSTEM ACTIVE";
    } else if (!isShopOpen) {
        isPlaying = false;
        overlay.classList.remove('hidden');
    }
});

// Purchase Actions
document.getElementById('buyRapidBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const price = (rapidLv + 1) * 500;
    if (rapidLv >= 5) return;
    if (score >= price) {
        score -= price;
        rapidLv++;
        fireRate = Math.max(80, fireRate - 70);
        updateHUD();
        showShopMessage(`RAPID FIRE LEVEL ${rapidLv}`);
    } else showShopMessage("INSUFFICIENT CREDITS", true);
});

document.getElementById('buyRepairBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const price = 300;
    if (health >= 100) return;
    if (score >= price) {
        score -= price;
        health = 100;
        updateHUD();
        showShopMessage("INTEGRITY RESTORED");
    } else showShopMessage("INSUFFICIENT CREDITS", true);
});

document.getElementById('buyCannonBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const price = 3000;
    if (weaponType === 'triple') return;
    if (score >= price) {
        score -= price;
        weaponType = 'triple';
        gunBody.material.color.setHex(0xff00ff);
        updateHUD();
        showShopMessage("TRIPLE GUN SYSTEM LOADED");
    } else showShopMessage("INSUFFICIENT CREDITS", true);
});

document.getElementById('closeShopBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleShop(true); });
document.getElementById('exitGameBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm("ミッションを中断してメニューに戻りますか？")) {
        location.href = "index.html";
    }
});
document.getElementById('homeBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm("ミッションを中断してメニューに戻りますか？")) {
        location.href = "index.html";
    }
});

// Update Loop
function update() {
    requestAnimationFrame(update);
    if (isPlaying && !isShopOpen) {
        const dir = new THREE.Vector3();
        if (moveState.forward) dir.z -= 1;
        if (moveState.backward) dir.z += 1;
        if (moveState.left) dir.x -= 1;
        if (moveState.right) dir.x += 1;
        dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        camera.position.addScaledVector(dir, 0.15);

        enemies.forEach(e => {
            const v = new THREE.Vector3().subVectors(camera.position, e.position);
            v.y = 0;
            e.position.addScaledVector(v.normalize(), 0.06);
            if (e.position.distanceTo(camera.position) < 2) {
                health -= 0.6;
                updateHUD();
            }
            e.rotation.y += 0.04;
        });

        if (Math.random() < 0.03 && enemies.length < 25) spawnEnemy();
        if (health <= 0) {
            isPlaying = false;
            document.exitPointerLock();
            overlay.innerHTML = `<h1 class="glow-text fatal">FAILURE</h1><p>SCORE: ${score}</p><button onclick="location.reload()" class="btn">REBOOT</button>`;
            overlay.classList.remove('hidden');
        }
    }
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

update();
