const overworldCanvas = document.getElementById('overworldCanvas');
const owCtx = overworldCanvas.getContext('2d');
const battleCanvas = document.getElementById('battleCanvas');
const bCtx = battleCanvas.getContext('2d');

const TILE_SIZE = 16;
const COLS = 15;
const ROWS = 10;

// GAME STATES
const STATE_MAP = 0;
const STATE_BATTLE = 1;
const STATE_UI = 2; // Menus, dialogue

let currentState = STATE_MAP;
let uiState = ''; 
// 'DIALOGUE', 'FIELD_MENU', 'BAG', 'POKEMON', 'CHOICE', 'BATTLE_COMMAND', 'BATTLE_MOVE', 'BATTLE_MESSAGE', 'SHOP'

// TILES: 
const TILE_PATH = 0;
const TILE_GRASS = 1;
const TILE_WALL = 2;
const TILE_WATER = 3;
const TILE_LAVA = 4;
const TILE_CAVE = 5;
const TILE_FLOOR = 6;

// MAP GENERATORS
function fillMap(tile) {
    let m = [];
    for(let i=0; i<ROWS; i++){
        let r = [];
        for(let j=0; j<COLS; j++) r.push(tile);
        m.push(r);
    }
    return m;
}

const maps = [];
const events = [];

for(let i=0; i<9; i++) {
    maps.push(fillMap(TILE_PATH));
    events.push([]);
}

// -- MAP 1: Starter Area --
for(let y=0; y<ROWS; y++) for(let x=0; x<COLS; x++) {
    if (x===0 || y===0 || x===COLS-1) maps[0][y][x] = TILE_WALL;
    else maps[0][y][x] = TILE_GRASS; 
    if(y>3 && y<7 && x>3 && x<7) maps[0][y][x] = TILE_PATH; 
}
events[0].push({x: 5, y: 3, type: 'p1', name: 'フシギダネ', pTarget: {name: 'フシギダネ', type: 'くさ', level: 5, maxHp: 20, moves: [{name:'たいあたり', power: 4, pp: 35}, {name:'つるのムチ', power: 8, pp: 20}], hp:20} });
events[0].push({x: 6, y: 3, type: 'p2', name: 'ヒトカゲ', pTarget: {name: 'ヒトカゲ', type: 'ほのお', level: 5, maxHp: 20, moves: [{name:'ひっかく', power: 4, pp: 35}, {name:'ひのこ', power: 8, pp: 20}], hp:20} });
events[0].push({x: 7, y: 3, type: 'p3', name: 'ゼニガメ', pTarget: {name: 'ゼニガメ', type: 'みず', level: 5, maxHp: 20, moves: [{name:'たいあたり', power: 4, pp: 35}, {name:'みずでっぽう', power: 8, pp: 20}], hp:20} });
events[0].push({x: 6, y: 6, type: 'npc', name: 'オーキド', msg: ['わしは オーキド！', 'さあ つくえの うえから', 'すきな ポケモンを えらぶんじゃ！']});
events[0].push({id: 'q1', x: 2, y: 5, type: 'quest', target: 'ポッポ', amt: 1, reward: 500, state: 'not_started', msgGiver: ['ポッポって ポケモンに', 'いつも いやがらせを されているんだ…', '１ぴき たおしてくれたら おれいをするよ！'], msgDone: ['すごいや！ おもいしらせてやったね！', 'おれいの 500円だよ！']});

// -- MAP 2: City with Rock Gym --
for(let y=0; y<ROWS; y++) for(let x=0; x<COLS; x++) {
    if (y===0) maps[1][y][x] = TILE_WALL;
    else maps[1][y][x] = TILE_PATH;
}
events[1].push({x: 3, y: 3, type: 'center'});
events[1].push({x: 8, y: 3, type: 'shop'});
events[1].push({x: 12, y: 8, type: 'gym', badge: 1, reward: 2000, gName: 'タケシ', msg: ['いわタイプこそ さいきょう！'], team: [{name:'イシツブテ', level:10, maxHp:40, hp:40, type:'いわ', moves:[{name:'たいあたり', power:5}]}]});
events[1].push({id: 'q2', x: 2, y: 8, type: 'quest', target: 'イシツブテ', amt: 2, reward: 1000, state: 'not_started', msgGiver: ['どうくつから イシツブテが きて', 'じゃま なんだ…', '２ひき たおしてくれたら おれいをするよ！'], msgDone: ['ありがとう！ 1000円あげる！']});

// -- MAP 3: Sea Area --
for(let y=0; y<ROWS; y++) for(let x=0; x<COLS; x++) {
    if (x>5) maps[2][y][x] = TILE_WATER;
    else maps[2][y][x] = TILE_PATH;
}
events[2].push({x: 12, y: 5, type: 'gym', badge: 2, reward: 3000, gName: 'カスミ', msg: ['みずポケモンの つよさ みせてあげる！'], team: [{name:'スターミー', type:'みず', level:15, maxHp:50, hp:50, moves:[{name:'みずでっぽう', power:10}]}]});
events[2].push({x: 3, y: 5, type: 'npc', msg: ['みずポケモンなら うみを わたれるぞ']});

// -- MAP 4: Grass Gym --
for(let y=0; y<ROWS; y++) for(let x=0; x<COLS; x++) {
    if(x===0) maps[3][y][x] = TILE_WALL;
    else maps[3][y][x] = TILE_PATH;
}
events[3].push({x: 4, y: 3, type: 'center'});
events[3].push({x: 9, y: 3, type: 'shop'});
events[3].push({x: 7, y: 8, type: 'gym', badge: 3, reward: 4000, gName: 'エリカ', msg: ['くさポケモンは いつくしいですわ'], team: [{name:'ラフレシア', type:'くさ', level:20, maxHp:70, hp:70, moves:[{name:'メガドレイン', power:15}]}]});

// -- MAP 5: Cave --
for(let y=0; y<ROWS; y++) for(let x=0; x<COLS; x++) {
    if(x===0||x===COLS-1||y===0||y===ROWS-1) maps[4][y][x] = TILE_WALL;
    else maps[4][y][x] = TILE_CAVE;
    if(y===5 && x===0) maps[4][y][x] = TILE_CAVE; 
    if(y===5 && x===COLS-1) maps[4][y][x] = TILE_CAVE; 
    if(x===7 && y===0) maps[4][y][x] = TILE_CAVE; 
    if(x===7 && y===ROWS-1) maps[4][y][x] = TILE_CAVE; 
}

// -- MAP 6: Poison Gym & Damp Town --
for(let y=0; y<ROWS; y++) for(let x=0; x<COLS; x++) maps[5][y][x] = TILE_GRASS;
events[5].push({x: 3, y: 4, type: 'center'});
events[5].push({x: 7, y: 4, type: 'shop'});
events[5].push({x: 12, y: 7, type: 'gym', badge: 4, reward: 5000, gName: 'キョウ', msg: ['シュッシュッ！ どくの おそろしさを あじわえ！'], team: [{name:'マタドガス', type:'どく', level:25, maxHp:90, hp:90, moves:[{name:'スモッグ', power:20}]}]});
events[5].push({id: 'q3', x: 6, y: 8, type: 'quest', target: 'アーボ', amt: 1, reward: 1500, state: 'not_started', msgGiver: ['アーボが むらで あばれているんだ！', 'たおしたら 1500円 あげるぜ！'], msgDone: ['サンキュー！ やくそくの コインだ！']});

// -- MAP 7: Volcano --
for(let y=0; y<ROWS; y++) for(let x=0; x<COLS; x++) {
    if(y>3) maps[6][y][x] = TILE_LAVA;
    else maps[6][y][x] = TILE_PATH;
}
events[6].push({x: 7, y: 7, type: 'gym', badge: 5, reward: 6000, gName: 'カツラ', msg: ['やけどするほど あつい クイズだ！'], team: [{name:'ウインディ', type:'ほのお', level:30, maxHp:120, hp:120, moves:[{name:'ダイモジ', power:30}]}]});
events[6].push({x: 3, y: 2, type: 'npc', msg: ['ほのおポケモンなら ようがんの うえを あるけるわ']});

// -- MAP 8: Forest Route --
for(let y=0; y<ROWS; y++) for(let x=0; x<COLS; x++) {
    if(x%3===0 && y%3===0) maps[7][y][x] = TILE_WALL; 
    else maps[7][y][x] = TILE_GRASS;
}
events[7].push({x:7, y:5, type:'npc', msg:['ここは さまよいのもり だ。']});

// -- MAP 9: Pokemon League --
for(let y=0; y<ROWS; y++) for(let x=0; x<COLS; x++) {
    maps[8][y][x] = TILE_FLOOR;
    if(y===4 && x!==7) maps[8][y][x] = TILE_WALL; // Gate
}
events[8].push({x:7, y:2, type:'gym', badge: 6, reward: 10000, gName:'ワタル', msg:['よくぞ ここまで きた！','ドラゴンつかいの ワタル！ いざ じんじょうに！'], team:[{name:'カイリュー', type:'ドラゴン', level:40, maxHp:150, hp:150, moves:[{name:'はかいこうせん', power:40}]}]});


// --- PLAYER STATE ---
const player = {
    x: 7, y: 7,
    mapId: 0, 
    pixelX: 7 * TILE_SIZE, pixelY: 7 * TILE_SIZE,
    moving: false, direction: 'up',
    targetX: 7, targetY: 7,
    speed: 2,
    money: 0, // NEW!
    party: [], // Up to 6
    items: {
        pokeball: 0,
        potion: 0
    },
    badges: [],
    flags: { starterChosen: false },
    quests: {} // track progress e.g. { 'q1': { defeated: 0 } }
};

// --- DATA ---
const wildPools = {
    grass: [{name:"ポッポ", type:"ノーマル", level:3, hp:12, maxHp:12, moves:[{name:'たいあたり', power: 3}]},
            {name:"コラッタ", type:"ノーマル", level:4, hp:15, maxHp:15, moves:[{name:'ひっかく', power: 4}]}],
    cave: [{name:"ズバット", type:"どく", level:8, hp:25, maxHp:25, moves:[{name:'すいとる', power: 10}]},
           {name:"イシツブテ", type:"いわ", level:10, hp:30, maxHp:30, moves:[{name:'たいあたり', power: 8}]}],
    water: [{name:"メノクラゲ", type:"みず", level:12, hp:40, maxHp:40, moves:[{name:'ようかいえき', power: 12}]}],
    poison: [{name:"アーボ", type:"どく", level:15, hp:50, maxHp:50, moves:[{name:'どくばり', power: 15}]}],
    forest: [{name:"キャタピー", type:"むし", level:5, hp:18, maxHp:18, moves:[{name:'たいあたり', power: 2}]}, 
             {name:"ストライク", type:"むし", level:20, hp:70, maxHp:70, moves:[{name:'きりさく', power: 25}]}]
};

const keyState = { Up:false, Down:false, Left:false, Right:false, Z:false, X:false, Enter:false };

// --- UI ELEMENTS ---
const uiLayer = document.getElementById('ui-layer');
const dialogueBox = document.getElementById('dialogue-box');
const messageEl = document.getElementById('message');
const fieldMenu = document.getElementById('field-menu');
const commandMenu = document.getElementById('command-menu');
const moveMenu = document.getElementById('move-menu');
const choiceMenu = document.getElementById('choice-menu');
const listMenu = document.getElementById('list-menu');
const listUl = document.getElementById('list-ul');
const listTitle = document.getElementById('list-title');
const moneyBox = document.getElementById('money-box');
const moneyText = document.getElementById('money-text');

// --- QUEUES ---
let messageQueue = [];
let currentCallback = null;
let isTyping = false;
let currentText = "";
let typeTimer;
let menuIndex = 0;
let listIndex = 0;
let currentList = [];
let choiceCallback = null;
let activeEventTarget = null; // tracking interaction object

window.addEventListener('keydown', (e) => { handleKey(e.key, true); });
window.addEventListener('keyup', (e) => { handleKey(e.key, false); });

function bindBtn(sel, k) {
    const el = document.querySelector(sel);
    if(!el) return;
    el.addEventListener('mousedown', () => { handleKey(k, true); });
    el.addEventListener('mouseup', () => { handleKey(k, false); });
    el.addEventListener('touchstart', (e) => { e.preventDefault(); handleKey(k, true); }, {passive: false});
    el.addEventListener('touchend', (e) => { e.preventDefault(); handleKey(k, false); }, {passive: false});
}
bindBtn('.up', 'ArrowUp'); bindBtn('.down', 'ArrowDown');
bindBtn('.left', 'ArrowLeft'); bindBtn('.right', 'ArrowRight');
bindBtn('.btn-a', 'z'); bindBtn('.btn-b', 'x'); bindBtn('.start', 'Enter');

function mapKey(k) {
    k = k.toLowerCase();
    if(k==='arrowup') return 'Up';
    if(k==='arrowdown') return 'Down';
    if(k==='arrowleft') return 'Left';
    if(k==='arrowright') return 'Right';
    if(k==='z' || k==='a') return 'Z';
    if(k==='x' || k==='b') return 'X';
    if(k==='enter') return 'Enter';
    return null;
}

function updateMoneyUI() {
    moneyText.textContent = `円: ${player.money}`;
}

function handleKey(key, isDown) {
    let k = mapKey(key);
    if(k) keyState[k] = isDown;

    if(!isDown) return; 
    
    if (currentState === STATE_UI) {
        if (isTyping && (k==='Z' || k==='Enter' || k==='X')) {
            finishTyping();
            return;
        }

        if (uiState === 'DIALOGUE') {
            if (k==='Z' || k==='Enter') advanceMessage();
        } else if (uiState === 'CHOICE') {
            if (k==='Up') menuIndex = 0;
            if (k==='Down') menuIndex = 1;
            updateChoiceUI();
            if (k==='Z' || k==='Enter') {
                let res = (menuIndex === 0);
                choiceMenu.classList.add('hidden');
                if(choiceCallback) choiceCallback(res);
            }
        } else if (uiState === 'SHOP') {
            if(k==='Up') listIndex = Math.max(0, listIndex - 1);
            if(k==='Down') listIndex = Math.min(currentList.length - 1, listIndex + 1);
            updateListUI();
            if (k==='X') { 
                listMenu.classList.add('hidden'); 
                moneyBox.classList.add('hidden');
                closeUI();
            }
            if (k==='Z' || k==='Enter') {
                handleListSelection();
            }
        } else if (uiState === 'FIELD_MENU') {
            if(k==='Up') menuIndex = (menuIndex+2)%3;
            if(k==='Down') menuIndex = (menuIndex+1)%3;
            updateFieldMenuUI();
            if (k==='X') { closeFieldMenu(); }
            if (k==='Z' || k==='Enter') {
                if(menuIndex === 0) openPokemonMenu(false);
                else if(menuIndex === 1) openBagMenu(false);
                else closeFieldMenu();
            }
        } else if (uiState === 'BAG' || uiState === 'POKEMON') {
            if(k==='Up') listIndex = Math.max(0, listIndex - 1);
            if(k==='Down') listIndex = Math.min(currentList.length - 1, listIndex + 1);
            updateListUI();
            if (k==='X') { 
                if(battleActive) {
                    uiState = 'BATTLE_COMMAND';
                    listMenu.classList.add('hidden');
                    updateBattleUI();
                } else {
                    listMenu.classList.add('hidden'); 
                    uiState = 'FIELD_MENU'; 
                }
            }
            if (k==='Z' || k==='Enter') {
                handleListSelection();
            }
        }
    } else if (currentState === STATE_BATTLE) {
        if (uiState === 'BATTLE_COMMAND') {
            if (k==='Right') menuIndex = (menuIndex+1)%4;
            if (k==='Left') menuIndex = (menuIndex+3)%4;
            if (k==='Down') menuIndex = (menuIndex+2)%4;
            if (k==='Up') menuIndex = (menuIndex+2)%4;
            updateBattleUI();
            if (k==='Z' || k==='Enter') {
                if(menuIndex === 0) { uiState = 'BATTLE_MOVE'; menuIndex=0; updateBattleUI(); }
                if(menuIndex === 1) openBagMenu(true);
                if(menuIndex === 2) openPokemonMenu(true);
                if(menuIndex === 3) tryRun();
            }
        } else if (uiState === 'BATTLE_MOVE') {
            if (k==='Right') menuIndex = (menuIndex+1)%4;
            if (k==='Left') menuIndex = (menuIndex+3)%4;
            if (k==='Down') menuIndex = (menuIndex+2)%4;
            if (k==='Up') menuIndex = (menuIndex+2)%4;
            updateBattleUI();
            if (k==='X') { uiState = 'BATTLE_COMMAND'; menuIndex=0; updateBattleUI(); }
            if (k==='Z' || k==='Enter') {
                executePlayerMove(menuIndex);
            }
        }
    } else if (currentState === STATE_MAP) {
        if (k==='Enter') {
            openFieldMenu();
        } else if (k==='Z') {
            interact();
        }
    }
}

// --- OVERWORLD LOGIC ---
function updateOverworld() {
    if (player.moving) {
        let tx = player.targetX * TILE_SIZE;
        let ty = player.targetY * TILE_SIZE;
        
        if (player.pixelX < tx) player.pixelX += player.speed;
        if (player.pixelX > tx) player.pixelX -= player.speed;
        if (player.pixelY < ty) player.pixelY += player.speed;
        if (player.pixelY > ty) player.pixelY -= player.speed;

        if (player.pixelX === tx && player.pixelY === ty) {
            player.x = player.targetX;
            player.y = player.targetY;
            player.moving = false;
            postMoveCheck();
        }
    } else {
        let dx = 0, dy = 0;
        if(keyState.Up) { dy = -1; player.direction='up'; }
        else if(keyState.Down) { dy = 1; player.direction='down'; }
        else if(keyState.Left) { dx = -1; player.direction='left'; }
        else if(keyState.Right) { dx = 1; player.direction='right'; }
        
        if (dx !== 0 || dy !== 0) {
            let nx = player.x + dx;
            let ny = player.y + dy;
            
            // Map Edge Transitions
            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
                transitionMap(nx, ny);
                return;
            }

            let mId = player.mapId;
            let tile = maps[mId][ny][nx];
            let blocked = false;

            for(let e of events[mId]) {
                if(e.x === nx && e.y === ny && !e.hidden) blocked = true;
            }

            if (tile === TILE_WALL) blocked = true;
            if (tile === TILE_WATER && !hasType('みず')) blocked = true;
            if (tile === TILE_LAVA && !hasType('ほのお')) blocked = true;

            if (!blocked) {
                player.targetX = nx;
                player.targetY = ny;
                player.moving = true;
            }
        }
    }
}

function hasType(type) {
    for(let p of player.party) {
        if(p.type === type) return true;
    }
    return false;
}

function transitionMap(nx, ny) {
    let gridX = player.mapId % 3;
    let gridY = Math.floor(player.mapId / 3);
    
    if (nx < 0) { gridX--; player.x = COLS-1; }
    else if (nx >= COLS) { gridX++; player.x = 0; }
    else if (ny < 0) { gridY--; player.y = ROWS-1; }
    else if (ny >= ROWS) { gridY++; player.y = 0; }

    if (gridX >= 0 && gridX < 3 && gridY >= 0 && gridY < 3) {
        player.mapId = gridY * 3 + gridX;
        player.targetX = player.x;
        player.targetY = player.y;
        player.pixelX = player.x * TILE_SIZE;
        player.pixelY = player.y * TILE_SIZE;
        document.getElementById('transition-overlay').className = 'fade-in-out';
        setTimeout(()=>{ document.getElementById('transition-overlay').className = 'hidden'; }, 600);
    }
}

function postMoveCheck() {
    let tile = maps[player.mapId][player.y][player.x];
    if (tile === TILE_GRASS) {
        if(Math.random() < 0.1 && player.party.length > 0) {
            triggerBattle(getWildPool());
        }
    } else if (tile === TILE_CAVE) {
        if(Math.random() < 0.05 && player.party.length > 0) {
            triggerBattle(wildPools.cave);
        }
    }
}

function getWildPool() {
    if(player.mapId === 5) return wildPools.poison;
    if(player.mapId === 7) return wildPools.forest;
    return wildPools.grass;
}

function interact() {
    if (player.moving) return;
    let dx=0, dy=0;
    if(player.direction==='up') dy=-1;
    if(player.direction==='down') dy=1;
    if(player.direction==='left') dx=-1;
    if(player.direction==='right') dx=1;
    
    let fx = player.x + dx;
    let fy = player.y + dy;
    
    let ev = events[player.mapId].find(e => e.x===fx && e.y===fy && !e.hidden);
    if (!ev) return;

    if (ev.type.startsWith('p') && !player.flags.starterChosen) {
        askChoice(`[${ev.name}] に する？`, (res) => {
            if(res){
                player.party.push(JSON.parse(JSON.stringify(ev.pTarget)));
                player.items.pokeball += 3;
                player.flags.starterChosen = true;
                events[0].forEach(e => { if(e.type && e.type.startsWith('p')) e.hidden = true; });
                showMessage([`${ev.name} を もらった！`, `モンスターボールx3 を もらった！`]);
            } else { closeUI(); }
        });
    } else if (ev.type === 'center') {
        showMessage(['ポケモンセンターへ ようこそ！', 'ポケモンを かいふく しますね。'], () => {
            for(let p of player.party) p.hp = p.maxHp;
            showMessage(['げんきに なりました！']);
        });
    } else if (ev.type === 'shop') {
        openShopMenu();
    } else if (ev.type === 'gym') {
        if (player.badges.includes(ev.badge)) {
            showMessage(['おまえは つよい！']);
        } else {
            showMessage(ev.msg, () => {
                if(player.party.length > 0) {
                    startTrainerBattle(ev);
                } else {
                    showMessage(['まずは ポケモンを もらってきな！']);
                }
            });
        }
    } else if (ev.type === 'quest') {
        let q = player.quests[ev.id];
        if(!q) {
            // Give quest
            showMessage(ev.msgGiver, () => {
                player.quests[ev.id] = { defeated: 0 };
            });
        } else {
            if (ev.state === 'done') {
                showMessage(['ほんとに ありがとうな！']);
            } else if (q.defeated >= ev.amt) {
                // Return quest
                ev.state = 'done';
                player.money += ev.reward;
                updateMoneyUI();
                showMessage(ev.msgDone);
            } else {
                showMessage([`まだ ${ev.target} は ${q.defeated}/${ev.amt} しか たおしてないぞ。`, `がんばってくれ！`]);
            }
        }
    } else if (ev.type === 'npc') {
        showMessage(ev.msg);
    }
}

// --- SHOP LOGIC ---
function openShopMenu() {
    uiLayer.classList.remove('hidden');
    listMenu.classList.remove('hidden');
    moneyBox.classList.remove('hidden');
    updateMoneyUI();
    uiState = 'SHOP';
    listTitle.textContent = "ショップ";
    currentList = [
        {label: `モンスターボール (200円)`, price: 200, item: 'pokeball'},
        {label: `キズぐすり (300円)`, price: 300, item: 'potion'},
        {label: `やめる`, price: 0, item: 'exit'}
    ];
    listIndex = 0;
    updateListUI();
}

function buyItem(itemObj) {
    if (itemObj.item === 'exit') {
        listMenu.classList.add('hidden');
        moneyBox.classList.add('hidden');
        closeUI();
        return;
    }

    if (player.money >= itemObj.price) {
        askChoice(`1こ 買いますか？`, (res) => {
            if(res) {
                player.money -= itemObj.price;
                player.items[itemObj.item]++;
                updateMoneyUI();
                showMessage([`まいど あり！`], () => { openShopMenu(); });
            } else {
                openShopMenu();
            }
        });
    } else {
        msgOnly(['お金が たりないみたいだね。'], () => { openShopMenu(); });
    }
}

// --- RENDERING OVERWORLD ---
function drawOverworld() {
    owCtx.clearRect(0,0, overworldCanvas.width, overworldCanvas.height);
    let m = maps[player.mapId];
    
    for(let y=0; y<ROWS; y++) {
        for(let x=0; x<COLS; x++){
            let px = x*TILE_SIZE, py = y*TILE_SIZE;
            let t = m[y][x];
            if(t===0 || t===6) { owCtx.fillStyle = '#C0A080'; owCtx.fillRect(px,py,16,16); }
            else if(t===1) { owCtx.fillStyle = '#60A040'; owCtx.fillRect(px,py,16,16); owCtx.fillStyle='#408020'; owCtx.fillRect(px+2,py+2,4,4); }
            else if(t===2) { owCtx.fillStyle = '#206020'; owCtx.fillRect(px,py,16,16); }
            else if(t===3) { owCtx.fillStyle = '#4040D0'; owCtx.fillRect(px,py,16,16); }
            else if(t===4) { owCtx.fillStyle = '#D04040'; owCtx.fillRect(px,py,16,16); }
            else if(t===5) { owCtx.fillStyle = '#808080'; owCtx.fillRect(px,py,16,16); }
        }
    }

    // Draw Entities
    for(let e of events[player.mapId]) {
        if(e.hidden) continue;
        let px = e.x*TILE_SIZE, py = e.y*TILE_SIZE;
        if(e.type && e.type.startsWith('p')) { owCtx.fillStyle='white'; owCtx.beginPath(); owCtx.arc(px+8,py+8,6,0,Math.PI*2); owCtx.fill(); owCtx.fillStyle='red'; owCtx.fillRect(px+4,py+5,8,3); }
        else if(e.type === 'gym') { owCtx.fillStyle='#000'; owCtx.fillRect(px+2,py+2,12,14); owCtx.fillStyle='purple'; owCtx.fillRect(px+3,py+3,10,6); }
        else if(e.type === 'center') { owCtx.fillStyle='#F88'; owCtx.fillRect(px,py,16,16); owCtx.fillStyle='#FFF'; owCtx.fillText('PC', px+2,py+12); }
        else if(e.type === 'shop') { owCtx.fillStyle='#88F'; owCtx.fillRect(px,py,16,16); owCtx.fillStyle='#FFF'; owCtx.fillText('SH', px+2,py+12); }
        else { owCtx.fillStyle='#FF0'; owCtx.fillRect(px+4,py+4,8,8); }
    }

    // Player
    owCtx.fillStyle = '#FF0000';
    owCtx.fillRect(player.pixelX+2, player.pixelY+2, 12, 14);
    owCtx.fillStyle = '#FFF';
    if(player.direction==='down') owCtx.fillRect(player.pixelX+4, player.pixelY+6, 8, 4);
    else if(player.direction==='up') owCtx.fillRect(player.pixelX+4, player.pixelY+2, 8, 4);
    else if(player.direction==='left') owCtx.fillRect(player.pixelX+2, player.pixelY+6, 4, 4);
    else if(player.direction==='right') owCtx.fillRect(player.pixelX+10, player.pixelY+6, 4, 4);
}

// --- UI SYSTEMS ---
function showMessage(msgs, cb=null) {
    messageQueue = msgs.slice();
    currentCallback = cb;
    currentState = STATE_UI;
    if(uiState !== 'SHOP') uiLayer.classList.remove('hidden'); // don't disrupt shop
    dialogueBox.classList.remove('hidden');
    
    // Determine if we need to switch UI state
    uiState = 'DIALOGUE';
    advanceMessage();
}

function msgOnly(msgs, cb=null) {
    messageQueue = msgs.slice();
    currentCallback = cb;
    currentState = STATE_UI;
    uiState = 'DIALOGUE';
    dialogueBox.classList.remove('hidden');
    advanceMessage();
}


function advanceMessage() {
    if(messageQueue.length > 0) {
        let text = messageQueue.shift();
        isTyping = true;
        currentText = text;
        messageEl.textContent = "";
        let i = 0;
        clearInterval(typeTimer);
        typeTimer = setInterval(() => {
            messageEl.textContent += text[i];
            i++;
            if(i>=text.length) finishTyping();
        }, 30);
    } else {
        dialogueBox.classList.add('hidden');
        if(currentCallback) {
            let cb = currentCallback;
            currentCallback = null;
            cb();
        } else {
            closeUI();
        }
    }
}

function finishTyping() {
    clearInterval(typeTimer);
    messageEl.textContent = currentText;
    isTyping = false;
}

function askChoice(msg, cb) {
    messageQueue = [msg];
    choiceCallback = cb;
    currentState = STATE_UI;
    uiState = 'CHOICE';
    uiLayer.classList.remove('hidden');
    dialogueBox.classList.remove('hidden');
    choiceMenu.classList.remove('hidden');
    menuIndex = 0;
    updateChoiceUI();
    
    let text = messageQueue.shift();
    isTyping = true;
    currentText = text;
    messageEl.textContent = "";
    let i = 0;
    clearInterval(typeTimer);
    typeTimer = setInterval(() => {
        messageEl.textContent += text[i];
        i++;
        if(i>=text.length) finishTyping();
    }, 30);
}

function updateChoiceUI() {
    let items = choiceMenu.querySelectorAll('.menu-item');
    items.forEach((e,i) => e.classList.toggle('active', i===menuIndex));
}

function closeUI() {
    if (battleActive) {
        uiState = 'BATTLE_COMMAND';
        dialogueBox.classList.add('hidden');
        updateBattleUI();
        return;
    }
    uiLayer.classList.add('hidden');
    dialogueBox.classList.add('hidden');
    currentState = STATE_MAP;
}

// FIELD MENUS
function openFieldMenu() {
    currentState = STATE_UI;
    uiState = 'FIELD_MENU';
    uiLayer.classList.remove('hidden');
    fieldMenu.classList.remove('hidden');
    moneyBox.classList.remove('hidden');
    updateMoneyUI();
    menuIndex = 0;
    updateFieldMenuUI();
}

function updateFieldMenuUI() {
    let items = fieldMenu.querySelectorAll('.menu-item');
    items.forEach((e,i) => e.classList.toggle('active', i===menuIndex));
}

function closeFieldMenu() {
    uiLayer.classList.add('hidden');
    fieldMenu.classList.add('hidden');
    moneyBox.classList.add('hidden');
    currentState = STATE_MAP;
}

// LIST MENUS
function openBagMenu(inBattle) {
    uiState = 'BAG';
    listMenu.classList.remove('hidden');
    listTitle.textContent = "バッグ";
    currentList = [
        {label: `モンスターボール x${player.items.pokeball}`, action: () => useItem('pokeball')},
        {label: `キズぐすり x${player.items.potion}`, action: () => useItem('potion')}
    ];
    listIndex = 0;
    updateListUI();
}

function openPokemonMenu(inBattle) {
    uiState = 'POKEMON';
    listMenu.classList.remove('hidden');
    listTitle.textContent = "てもちポケモン";
    currentList = player.party.map((p, i) => {
        return {label: `${p.name} Lv${p.level} HP:${p.hp}/${p.maxHp}`, action: () => selectPokemon(i)};
    });
    listIndex = 0;
    updateListUI();
}

function updateListUI() {
    listUl.innerHTML = "";
    currentList.forEach((item, i) => {
        let li = document.createElement('li');
        li.className = 'list-item' + (i===listIndex ? ' active' : '');
        li.textContent = item.label;
        listUl.appendChild(li);
    });
}

function handleListSelection() {
    if(currentList.length > 0) {
        if(uiState==='SHOP') buyItem(currentList[listIndex]);
        else currentList[listIndex].action();
    }
}

// ITEM / POKEMON ACTIONS
function useItem(itemKey) {
    if (player.items[itemKey] <= 0) return;
    
    if (itemKey === 'pokeball') {
        if (!battleActive || activeTrainerGym) {
            // Cannot catch in trainer battle
            return;
        }
        player.items.pokeball--;
        listMenu.classList.add('hidden');
        throwPokeball();
    } else if (itemKey === 'potion') {
        player.items.potion--;
        player.party[0].hp = Math.min(player.party[0].maxHp, player.party[0].hp + 20);
        listMenu.classList.add('hidden');
        if(battleActive) {
            showMessage(['キズぐすりを つかった！'], () => { enemyTurn(); });
        } else {
            closeFieldMenu();
        }
    }
}

function selectPokemon(idx) {
    if (battleActive) {
        if (idx === 0) return; // already active
        if (player.party[idx].hp <= 0) return;
        // Swap logic
        let temp = player.party[0];
        player.party[0] = player.party[idx];
        player.party[idx] = temp;
        listMenu.classList.add('hidden');
        activePokemon = player.party[0];
        refreshBattleUI();
        showMessage([`${activePokemon.name}に こうたいした！`], () => { enemyTurn(); });
    } else {
        // Just view out of battle
    }
}


// --- BATTLE SYSTEM ---
let battleActive = false;
let activeEnemy = null;
let activePokemon = null;
let activeTrainerGym = null; 

function triggerBattle(pool) {
    let p = pool[Math.floor(Math.random() * pool.length)];
    activeEnemy = JSON.parse(JSON.stringify(p));
    activeTrainerGym = null;
    startBattleSequence();
}

function startTrainerBattle(gymObj) {
    activeEnemy = JSON.parse(JSON.stringify(gymObj.team[0]));
    activeTrainerGym = gymObj;
    startBattleSequence();
}

function startBattleSequence() {
    battleActive = true;
    currentState = STATE_UI;
    
    let tOverlay = document.getElementById('transition-overlay');
    tOverlay.className = 'flash-animation';
    setTimeout(() => {
        tOverlay.className = 'hidden';
        document.getElementById('battle-ui').classList.remove('hidden');
        uiLayer.classList.remove('hidden');
        
        activePokemon = player.party[0]; // first alive pokemon
        if(activePokemon.hp <= 0) {
            activePokemon = player.party.find(p=>p.hp>0);
            if(!activePokemon) { endBattle(); return; }
        }

        refreshBattleUI();
        
        let introMsg = activeTrainerGym ? `${activeTrainerGym.gName}が しょうぶを しかけてきた！` : `あ！ やせいの ${activeEnemy.name}が とびだしてきた！`;
        showMessage([introMsg, `ゆけっ！ ${activePokemon.name}！`]);
    }, 1200);
}

function refreshBattleUI() {
    document.getElementById('enemy-hp-bar').classList.remove('hidden');
    document.getElementById('player-hp-bar').classList.remove('hidden');

    document.getElementById('enemy-name').textContent = activeEnemy.name;
    document.getElementById('enemy-level').textContent = "Lv."+activeEnemy.level;
    let epct = activeEnemy.hp/activeEnemy.maxHp*100;
    document.getElementById('enemy-hp-fill').style.width = epct+'%';

    document.getElementById('player-name').textContent = activePokemon.name;
    document.getElementById('player-level').textContent = "Lv."+activePokemon.level;
    document.getElementById('player-hp-current').textContent = activePokemon.hp;
    document.getElementById('player-hp-max').textContent = activePokemon.maxHp;
    let ppct = activePokemon.hp/activePokemon.maxHp*100;
    document.getElementById('player-hp-fill').style.width = ppct+'%';

    // Map moves
    for(let i=0; i<4; i++){
        let m = activePokemon.moves[i];
        let el = document.getElementById('move-'+(i+1));
        if(m) el.textContent = m.name;
        else el.textContent = "-";
    }
}

function updateBattleUI() {
    commandMenu.classList.add('hidden');
    moveMenu.classList.add('hidden');
    
    if (uiState === 'BATTLE_COMMAND') {
        commandMenu.classList.remove('hidden');
        dialogueBox.classList.remove('hidden');
        messageEl.textContent = "どうする？";
        let items = commandMenu.querySelectorAll('.menu-item');
        items.forEach((e,i)=>e.classList.toggle('active', i===menuIndex));
    } else if (uiState === 'BATTLE_MOVE') {
        moveMenu.classList.remove('hidden');
        dialogueBox.classList.remove('hidden');
        messageEl.textContent = "";
        let items = moveMenu.querySelectorAll('.move-item');
        items.forEach((e,i)=>e.classList.toggle('active', i===menuIndex));
        let m = activePokemon.moves[menuIndex];
        if(m) {
            document.getElementById('move-type').textContent = `タイプ/${m.type||'--'}`;
            document.getElementById('move-pp').textContent = `PP ${m.pp}/${m.pp}`;
        }
    }
}

function updateQuestProgress(enemyName) {
    for(let i=0; i<9; i++) {
        for(let e of events[i]) {
            if (e.type === 'quest' && e.target === enemyName && player.quests[e.id]) {
                player.quests[e.id].defeated++;
            }
        }
    }
}

function executePlayerMove(idx) {
    let move = activePokemon.moves[idx];
    if(!move || move.name==='-') return;
    
    uiState = 'BATTLE_MESSAGE';
    showMessage([`${activePokemon.name} の ${move.name}！`], () => {
        let dmg = move.power + Math.floor(Math.random()*2);
        activeEnemy.hp = Math.max(0, activeEnemy.hp - dmg);
        refreshBattleUI();

        if (activeEnemy.hp === 0) {
            showMessage([`${activeEnemy.name} は たおれた！`, `${activePokemon.name} は けいけんちを もらった！`], () => {
                
                // Quest update
                if(!activeTrainerGym) {
                    updateQuestProgress(activeEnemy.name);
                }

                if (activeTrainerGym) {
                    player.badges.push(activeTrainerGym.badge);
                    player.money += activeTrainerGym.reward;
                    showMessage([`${activeTrainerGym.gName} に かった！`, `賞金として ${activeTrainerGym.reward}円と バッジを もらった！`], () => { endBattle(); });
                } else {
                    endBattle();
                }
            });
        } else {
            enemyTurn();
        }
    });
}

function enemyTurn() {
    let eMove = activeEnemy.moves[0];
    showMessage([`${activeEnemy.name} の ${eMove.name}！`], () => {
        let dmg = eMove.power + Math.floor(Math.random()*2);
        activePokemon.hp = Math.max(0, activePokemon.hp - dmg);
        refreshBattleUI();

        if (activePokemon.hp === 0) {
            showMessage([`${activePokemon.name} は たおれた…`], () => {
                let nextP = player.party.find(p=>p.hp>0);
                if (nextP) {
                    openPokemonMenu(true);
                } else {
                    showMessage(['めのまえが まっくらになった！'], () => {
                        for(let p of player.party) p.hp = p.maxHp;
                        player.x = 7; player.y = 7; player.mapId = 0; player.pixelX = 7*TILE_SIZE; player.pixelY = 7*TILE_SIZE;
                        endBattle();
                    });
                }
            });
        } else {
            uiState = 'BATTLE_COMMAND';
            updateBattleUI();
        }
    });
}

function tryRun() {
    if (activeTrainerGym) {
        showMessage(['トレーナーせんでは にげられない！'], () => { uiState = 'BATTLE_COMMAND'; updateBattleUI(); });
    } else {
        showMessage(['うまく にげきれた！'], () => { endBattle(); });
    }
}

function throwPokeball() {
    showMessage(['モンスターボールを なげた！'], () => {
        let catchRate = (activeEnemy.maxHp - activeEnemy.hp) / activeEnemy.maxHp;
        if (Math.random() < catchRate + 0.2) {
            showMessage(['やったー！', `${activeEnemy.name} を つかまえた！`], () => {
                if (player.party.length < 6) {
                    activeEnemy.maxHp = activeEnemy.hp = 20; // normalize
                    player.party.push(activeEnemy);
                }
                endBattle();
            });
        } else {
            showMessage(['あぁっ！ もうすこし だったのに！'], () => {
                enemyTurn();
            });
        }
    });
}

function endBattle() {
    battleActive = false;
    currentState = STATE_MAP;
    document.getElementById('battle-ui').classList.add('hidden');
    uiLayer.classList.add('hidden');
}

function drawBattle() {
    bCtx.fillStyle = '#E8E8D8';
    bCtx.fillRect(0,0, battleCanvas.width, battleCanvas.height);
    
    bCtx.fillStyle = '#A0D080';
    bCtx.beginPath(); bCtx.ellipse(180, 50, 50, 15, 0, 0, Math.PI*2); bCtx.fill();
    bCtx.beginPath(); bCtx.ellipse(60, 130, 60, 20, 0, 0, Math.PI*2); bCtx.fill();

    if(activeEnemy) {
        bCtx.fillStyle = (activeTrainerGym) ? '#444' : '#8B4513';
        bCtx.beginPath(); bCtx.arc(180, 35, 15, 0, Math.PI*2); bCtx.fill();
    }
    if(activePokemon && activePokemon.hp > 0) {
        bCtx.fillStyle = (activePokemon.type==='みず')?'blue':(activePokemon.type==='くさ')?'green':'red';
        bCtx.beginPath(); bCtx.arc(60, 110, 20, 0, Math.PI*2); bCtx.fill();
    }
}

// MAIN LOOP
function gameLoop() {
    if (currentState === STATE_MAP) {
        updateOverworld();
        drawOverworld();
    } else if (battleActive) {
        drawBattle();
    }
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
