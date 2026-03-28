const overworldCanvas = document.getElementById('overworldCanvas');
const owCtx = overworldCanvas.getContext('2d');
const battleCanvas = document.getElementById('battleCanvas');
const bCtx = battleCanvas.getContext('2d');

const TILE_SIZE = 16;
const COLS = 15; // 240 / 16
const ROWS = 10; // 160 / 16

const STATE_MAP = 0;
const STATE_BATTLE = 1;
let currentState = STATE_MAP;

// --- MAP DATA ---
// 0: Path, 1: Grass, 2: Tree (Obstacle)
const map = [
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    [2,1,1,1,0,0,0,1,1,1,1,1,1,2,2],
    [2,1,1,1,0,0,0,1,1,1,1,1,1,2,2],
    [2,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
    [2,0,0,0,0,0,0,0,2,2,2,0,0,0,2],
    [2,1,1,1,0,0,0,0,2,2,2,0,0,0,2],
    [2,1,1,1,0,0,0,1,1,1,1,1,0,0,2],
    [2,1,1,1,0,0,0,1,1,1,1,1,0,0,2],
    [2,1,1,1,0,0,0,1,1,1,1,1,0,0,2],
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
];

// --- PLAYER STATE ---
const player = {
    x: 4,
    y: 3,
    pixelX: 4 * TILE_SIZE,
    pixelY: 3 * TILE_SIZE,
    moving: false,
    direction: 'down',
    targetX: 4,
    targetY: 3,
    speed: 1, // pixels per frame
};

const keys = {
    ArrowUp: false, ArrowDown: false, 
    ArrowLeft: false, ArrowRight: false,
    z: false, x: false, Enter: false
};

// --- BATTLE STATE ---
const battleUI = document.getElementById('battle-ui');
const dialogueBox = document.getElementById('dialogue-box');
const messageEl = document.getElementById('message');
const commandMenu = document.getElementById('command-menu');
const moveMenu = document.getElementById('move-menu');
const transitionOverlay = document.getElementById('transition-overlay');

let battlePhase = 'INTRO';
let menuIndex = 0;
let moveIndex = 0;
let isMessageWriting = false;
let messageQueue = [];
let currentMsgText = "";
let typeInterval;

const playerPokemon = {
    name: "ヒトカゲ",
    level: 5,
    maxHp: 20,
    hp: 20,
    moves: [
        {name: "ひっかく", type: "ノーマル", pp: 35, maxPp: 35, power: 4},
        {name: "なきごえ", type: "ノーマル", pp: 40, maxPp: 40, power: 0},
        {name: "-", type: "--", pp: 0, maxPp: 0, power: 0},
        {name: "-", type: "--", pp: 0, maxPp: 0, power: 0}
    ]
};

let wildPokemon = null;
const wildEncounters = [
    {name: "ポッポ", level: 3, maxHp: 15, hp: 15, moves: [{name: "たいあたり", power: 3}]},
    {name: "コラッタ", level: 4, maxHp: 16, hp: 16, moves: [{name: "たいあたり", power: 4}]}
];

// --- INPUT HANDLING ---
window.addEventListener('keydown', (e) => {
    if(keys.hasOwnProperty(e.key)) keys[e.key] = true;
    handleKeyPress(e.key);
});
window.addEventListener('keyup', (e) => {
    if(keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Virtual buttons
document.querySelector('.up').addEventListener('mousedown', () => { keys.ArrowUp = true; handleKeyPress('ArrowUp');});
document.querySelector('.down').addEventListener('mousedown', () => { keys.ArrowDown = true; handleKeyPress('ArrowDown');});
document.querySelector('.left').addEventListener('mousedown', () => { keys.ArrowLeft = true; handleKeyPress('ArrowLeft');});
document.querySelector('.right').addEventListener('mousedown', () => { keys.ArrowRight = true; handleKeyPress('ArrowRight');});
document.querySelector('.btn-a').addEventListener('mousedown', () => { keys.z = true; handleKeyPress('z');});
document.querySelector('.btn-b').addEventListener('mousedown', () => { keys.x = true; handleKeyPress('x');});
document.querySelector('.start').addEventListener('mousedown', () => { keys.Enter = true; handleKeyPress('Enter');});

document.addEventListener('mouseup', () => {
    keys.ArrowUp = false; keys.ArrowDown = false;
    keys.ArrowLeft = false; keys.ArrowRight = false;
    keys.z = false; keys.x = false; keys.Enter = false;
});


function handleKeyPress(key) {
    if(currentState === STATE_MAP) {
        // Handled in update loop for smooth movement
        return;
    }

    // BATTLE STATE INPUT
    if (isMessageWriting) {
        if (key === 'z' || key === 'Enter') {
            finishTypingMessage();
        }
        return;
    }

    if (battlePhase === 'MESSAGE') {
        if (key === 'z' || key === 'Enter') {
            advanceMessage();
        }
    } else if (battlePhase === 'COMMAND') {
        if (key === 'ArrowRight') menuIndex = (menuIndex + 1) % 4;
        if (key === 'ArrowLeft') menuIndex = (menuIndex + 3) % 4;
        if (key === 'ArrowDown') menuIndex = (menuIndex + 2) % 4;
        if (key === 'ArrowUp') menuIndex = (menuIndex + 2) % 4;
        updateBattleUI();

        if (key === 'z' || key === 'Enter') {
            if (menuIndex === 0) { // FIGHT
                battlePhase = 'MOVE';
                updateBattleUI();
            } else if (menuIndex === 3) { // RUN
                queueMessage("うまく にげきれた！");
                startMessagePhase(() => {
                    endBattle();
                });
            }
        }
    } else if (battlePhase === 'MOVE') {
        if (key === 'ArrowRight') moveIndex = (moveIndex + 1) % 4;
        if (key === 'ArrowLeft') moveIndex = (moveIndex + 3) % 4;
        if (key === 'ArrowDown') moveIndex = (moveIndex + 2) % 4;
        if (key === 'ArrowUp') moveIndex = (moveIndex + 2) % 4;
        updateBattleUI();

        if (key === 'x') { // B button
            battlePhase = 'COMMAND';
            updateBattleUI();
        }
        if (key === 'z' || key === 'Enter') {
            executeMove(playerPokemon.moves[moveIndex]);
        }
    }
}

// --- OVERWORLD LOGIC ---
function updateOverworld() {
    if (!player.moving) {
        let dx = 0, dy = 0;
        if (keys.ArrowUp) { dy = -1; player.direction = 'up'; }
        else if (keys.ArrowDown) { dy = 1; player.direction = 'down'; }
        else if (keys.ArrowLeft) { dx = -1; player.direction = 'left'; }
        else if (keys.ArrowRight) { dx = 1; player.direction = 'right'; }

        if (dx !== 0 || dy !== 0) {
            let nextX = player.x + dx;
            let nextY = player.y + dy;
            
            // Bounds and collision check
            if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS) {
                if (map[nextY][nextX] !== 2) { // 2 is Tree/Wall
                    player.targetX = nextX;
                    player.targetY = nextY;
                    player.moving = true;
                }
            }
        }
    } else {
        // Move towards target
        let targetPixelX = player.targetX * TILE_SIZE;
        let targetPixelY = player.targetY * TILE_SIZE;
        
        if (player.pixelX < targetPixelX) player.pixelX += player.speed;
        if (player.pixelX > targetPixelX) player.pixelX -= player.speed;
        if (player.pixelY < targetPixelY) player.pixelY += player.speed;
        if (player.pixelY > targetPixelY) player.pixelY -= player.speed;

        if (player.pixelX === targetPixelX && player.pixelY === targetPixelY) {
            player.x = player.targetX;
            player.y = player.targetY;
            player.moving = false;

            // Step completed. Check grass encounter
            if (map[player.y][player.x] === 1) { // 1 is Grass
                if (Math.random() < 0.1) {
                    startEncounter();
                }
            }
        }
    }
}

function drawOverworld() {
    owCtx.clearRect(0, 0, overworldCanvas.width, overworldCanvas.height);
    
    // Draw Map
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            let tile = map[y][x];
            let px = x * TILE_SIZE;
            let py = y * TILE_SIZE;
            
            if (tile === 0) { // Path
                owCtx.fillStyle = '#C0A080';
                owCtx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            } else if (tile === 1) { // Grass
                owCtx.fillStyle = '#60A040';
                owCtx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                // Grass details
                owCtx.fillStyle = '#408020';
                owCtx.fillRect(px+2, py+2, 4, 4);
                owCtx.fillRect(px+10, py+8, 4, 4);
            } else if (tile === 2) { // Tree
                owCtx.fillStyle = '#206020';
                owCtx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                owCtx.fillStyle = '#104010';
                owCtx.beginPath();
                owCtx.arc(px + TILE_SIZE/2, py + TILE_SIZE/2, TILE_SIZE/2 - 2, 0, Math.PI*2);
                owCtx.fill();
            }
        }
    }

    // Draw Player
    owCtx.fillStyle = '#FF0000'; // Red hat
    owCtx.beginPath();
    owCtx.arc(player.pixelX + TILE_SIZE/2, player.pixelY + TILE_SIZE/2 - 2, TILE_SIZE/2 - 2, 0, Math.PI*2);
    owCtx.fill();
    
    // Direction indicator (face)
    owCtx.fillStyle = '#FFF';
    if(player.direction === 'down') {
        owCtx.fillRect(player.pixelX+4, player.pixelY+8, 2, 2);
        owCtx.fillRect(player.pixelX+10, player.pixelY+8, 2, 2);
    } else if(player.direction === 'up') {
        // Back of head
    } else if(player.direction === 'left') {
        owCtx.fillRect(player.pixelX+4, player.pixelY+8, 2, 2);
    } else if(player.direction === 'right') {
        owCtx.fillRect(player.pixelX+10, player.pixelY+8, 2, 2);
    }
}

function startEncounter() {
    // Reset keys
    for(let k in keys) keys[k] = false;
    
    // Flash animation
    transitionOverlay.classList.remove('hidden');
    transitionOverlay.classList.remove('flash-animation');
    // trigger reflow
    void transitionOverlay.offsetWidth;
    transitionOverlay.classList.add('flash-animation');
    
    setTimeout(() => {
        currentState = STATE_BATTLE;
        battleUI.classList.remove('hidden');
        transitionOverlay.classList.add('hidden');
        initBattle();
    }, 1000);
}

// --- BATTLE LOGIC ---
let battleCallback = null;

function initBattle() {
    // Pick wild pokemon
    wildPokemon = JSON.parse(JSON.stringify(wildEncounters[Math.floor(Math.random() * wildEncounters.length)]));
    
    document.getElementById('enemy-name').textContent = wildPokemon.name;
    document.getElementById('enemy-level').textContent = "Lv." + wildPokemon.level;
    document.getElementById('enemy-hp-bar').classList.remove('hidden');
    
    document.getElementById('player-name').textContent = playerPokemon.name;
    document.getElementById('player-level').textContent = "Lv." + playerPokemon.level;
    document.getElementById('player-hp-bar').classList.remove('hidden');
    
    updateHPUIs();
    
    menuIndex = 0;
    moveIndex = 0;
    
    // Setup move menu texts
    for(let i=0; i<4; i++) {
        document.getElementById('move-'+(i+1)).textContent = playerPokemon.moves[i].name;
    }

    queueMessage(`あ！ やせいの ${wildPokemon.name} が\nとびだしてきた！`);
    queueMessage(`ゆけっ！ ${playerPokemon.name}！`);
    
    startMessagePhase(() => {
        battlePhase = 'COMMAND';
        updateBattleUI();
    });
}

function updateBattleUI() {
    commandMenu.classList.add('hidden');
    moveMenu.classList.add('hidden');
    dialogueBox.classList.add('hidden');

    if (battlePhase === 'COMMAND') {
        commandMenu.classList.remove('hidden');
        dialogueBox.classList.remove('hidden');
        messageEl.textContent = `${playerPokemon.name}はどうする？`;
        
        const items = document.querySelectorAll('.menu-item');
        items.forEach((item, i) => {
            item.classList.toggle('active', i === menuIndex);
        });
    } else if (battlePhase === 'MOVE') {
        moveMenu.classList.remove('hidden');
        dialogueBox.classList.remove('hidden');
        messageEl.textContent = "";

        const items = document.querySelectorAll('.move-item');
        items.forEach((item, i) => {
            item.classList.toggle('active', i === moveIndex);
        });
        
        const move = playerPokemon.moves[moveIndex];
        document.getElementById('move-type').textContent = `タイプ/${move.type}`;
        document.getElementById('move-pp').textContent = `PP ${move.pp}/${move.maxPp}`;
    } else if (battlePhase === 'MESSAGE') {
        dialogueBox.classList.remove('hidden');
    }
}

function executeMove(move) {
    if (move.name === "-") return;
    if (move.pp <= 0) {
        queueMessage("PPが ない！");
        startMessagePhase(() => {
            battlePhase = 'COMMAND';
            updateBattleUI();
        });
        return;
    }

    move.pp--;
    
    // Player attacks
    queueMessage(`${playerPokemon.name}の ${move.name}！`);
    startMessagePhase(() => {
        if(move.power > 0) {
            let dmg = move.power + Math.floor(Math.random() * 2);
            wildPokemon.hp -= dmg;
            if(wildPokemon.hp < 0) wildPokemon.hp = 0;
            updateHPUIs();
            shakeEntity('enemy');
        }
        
        if (wildPokemon.hp === 0) {
            queueMessage(`やせいの ${wildPokemon.name} は たおれた！`);
            queueMessage(`${playerPokemon.name} は 32 けいけんちを もらった！`);
            startMessagePhase(() => {
                endBattle();
            });
        } else {
            // Enemy attacks
            let eMove = wildPokemon.moves[0];
            queueMessage(`やせいの ${wildPokemon.name}の ${eMove.name}！`);
            startMessagePhase(() => {
                let eDmg = eMove.power + Math.floor(Math.random()*2);
                playerPokemon.hp -= eDmg;
                if(playerPokemon.hp < 0) playerPokemon.hp = 0;
                updateHPUIs();
                shakeEntity('player');

                if (playerPokemon.hp === 0) {
                     queueMessage(`${playerPokemon.name} は たおれた…`);
                     queueMessage(`めのまえが まっくらになった！`);
                     startMessagePhase(() => {
                         // Heal and return
                         playerPokemon.hp = playerPokemon.maxHp;
                         endBattle();
                     });
                } else {
                    battlePhase = 'COMMAND';
                    updateBattleUI();
                }
            });
        }
    });
}

function updateHPUIs() {
    let pPct = (playerPokemon.hp / playerPokemon.maxHp) * 100;
    document.getElementById('player-hp-fill').style.width = pPct + '%';
    document.getElementById('player-hp-fill').style.background = pPct > 20 ? '#0f0' : '#f00';
    document.getElementById('player-hp-current').textContent = playerPokemon.hp;
    document.getElementById('player-hp-max').textContent = playerPokemon.maxHp;

    let ePct = (wildPokemon.hp / wildPokemon.maxHp) * 100;
    document.getElementById('enemy-hp-fill').style.width = ePct + '%';
    document.getElementById('enemy-hp-fill').style.background = ePct > 20 ? '#0f0' : '#f00';
}

function endBattle() {
    currentState = STATE_MAP;
    battleUI.classList.add('hidden');
    document.getElementById('enemy-hp-bar').classList.add('hidden');
    document.getElementById('player-hp-bar').classList.add('hidden');
}

// --- MESSAGE SYSTEM ---
function queueMessage(msg) {
    messageQueue.push(msg);
}

function startMessagePhase(onComplete) {
    battlePhase = 'MESSAGE';
    battleCallback = onComplete;
    updateBattleUI();
    advanceMessage();
}

function advanceMessage() {
    if (messageQueue.length > 0) {
        let msg = messageQueue.shift();
        typeMessage(msg);
    } else {
        if (battleCallback) {
            let cb = battleCallback;
            battleCallback = null;
            cb();
        }
    }
}

function typeMessage(text) {
    isMessageWriting = true;
    currentMsgText = text;
    messageEl.textContent = "";
    
    let i = 0;
    typeInterval = setInterval(() => {
        messageEl.textContent += text[i];
        i++;
        if(i >= text.length) {
            finishTypingMessage();
        }
    }, 40);
}

function finishTypingMessage() {
    clearInterval(typeInterval);
    messageEl.textContent = currentMsgText;
    isMessageWriting = false;
}

// --- BATTLE RENDER ---
let eShake = {x:0, y:0};
let pShake = {x:0, y:0};

function shakeEntity(target) {
    let shakes = 5;
    let amt = 5;
    let intv = setInterval(() => {
        if(target === 'enemy') eShake.x = (shakes%2===0)?amt:-amt;
        else pShake.x = (shakes%2===0)?amt:-amt;
        shakes--;
        if(shakes < 0) {
            eShake.x = 0; pShake.x = 0;
            clearInterval(intv);
        }
    }, 50);
}

function drawBattle() {
    bCtx.clearRect(0,0, battleCanvas.width, battleCanvas.height);
    
    // Background
    bCtx.fillStyle = '#E8E8E8'; // Light gray like grassy area
    bCtx.fillRect(0,0, battleCanvas.width, battleCanvas.height);
    
    // Enemy Platform
    bCtx.fillStyle = '#A0D080';
    bCtx.beginPath();
    bCtx.ellipse(180, 50, 50, 15, 0, 0, Math.PI*2);
    bCtx.fill();

    // Player Platform
    bCtx.beginPath();
    bCtx.ellipse(60, 130, 60, 20, 0, 0, Math.PI*2);
    bCtx.fill();

    // Enemy Sprite (primitive)
    let ex = 180 + eShake.x;
    let ey = 50 + eShake.y;
    bCtx.fillStyle = '#8B4513'; // Pidgey/Rattata brown
    bCtx.beginPath();
    bCtx.arc(ex, ey-15, 15, 0, Math.PI*2);
    bCtx.fill();
    bCtx.fillStyle = '#fff';
    bCtx.fillRect(ex-5, ey-20, 4, 4);
    
    // Player Sprite (Charizard-ish red)
    let px = 60 + pShake.x;
    let py = 130 + pShake.y;
    bCtx.fillStyle = '#FF4500';
    bCtx.beginPath();
    bCtx.arc(px, py-20, 25, 0, Math.PI*2);
    bCtx.fill();
    bCtx.fillStyle = '#fff';
    bCtx.fillRect(px+5, py-30, 6, 6);
}


// --- MAIN LOOP ---
function gameLoop() {
    if (currentState === STATE_MAP) {
        updateOverworld();
        drawOverworld();
    } else if (currentState === STATE_BATTLE) {
        drawBattle();
    }
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
