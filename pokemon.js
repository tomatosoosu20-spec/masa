// === GBA STATE PARSER ===
class GbaStateParser {
    constructor(file) {
        this.file = file;
        this.headerSize = 256;
    }

    analyze(onReady) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const buffer = e.target.result;
            const data = new Uint8Array(buffer).slice(0, this.headerSize);
            
            let title = '';
            for (let i = 0xA0; i < 0xAC; i++) {
                if(data[i] !== 0) title += String.fromCharCode(data[i]);
            }
            title = title.trim();

            let gameCode = '';
            for (let i = 0xAC; i < 0xB0; i++) {
                if(data[i] !== 0) gameCode += String.fromCharCode(data[i]);
            }
            gameCode = gameCode.trim();

            let hexDump = '';
            for (let i = 0; i < data.length; i += 16) {
                let chunk = data.slice(i, i + 16);
                let hexStr = Array.from(chunk).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
                let asciiStr = Array.from(chunk).map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
                
                let offsetStr = i.toString(16).padStart(8, '0').toUpperCase();
                hexStr = hexStr.padEnd(16 * 3, ' ');
                
                hexDump += `${offsetStr}: ${hexStr} |${asciiStr}|\n`;
            }

            onReady({
                filename: this.file.name,
                title: title !== '' ? title : '(抽出エラー/不明)',
                gameCode: gameCode !== '' ? gameCode : '(不明)',
                hexDump: hexDump
            });
        };

        reader.readAsArrayBuffer(this.file);
    }
}

// === POKEMON BATTLE LOGIC ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const images = {
    bg: new Image(),
    player: new Image(),
    enemy: new Image()
};

images.bg.src = 'assets/pokemon_bg.png';
images.player.src = 'assets/charizard_player.png';
images.enemy.src = 'assets/blastoise_enemy.png';

const gameState = {
    mode: 'PARSER', // 'PARSER' or 'GAME'
    phase: 'INTRO', // INTRO, COMMAND, MOVE, ATTACK, MESSAGE
    player: {
        name: 'リザードン',
        maxHp: 200,
        hp: 200,
        level: 50,
        moves: [
            { name: 'かえんほうしゃ', type: 'ほのお', pp: 15, damage: 40 },
            { name: 'そらをとぶ', type: 'ひこう', pp: 15, damage: 35 },
            { name: 'ドラゴンクロー', type: 'ドラゴン', pp: 15, damage: 30 },
            { name: 'ブラストバーン', type: 'ほのお', pp: 5, damage: 60 }
        ]
    },
    enemy: {
        name: 'カメックス',
        maxHp: 220,
        hp: 220,
        level: 50
    },
    menuIndex: 0,
    moveIndex: 0,
    messageQueue: [],
    currentMessage: '',
    isWriting: false
};

// UI Elements
const dialogueBox = document.getElementById('dialogue-box');
const messageEl = document.getElementById('message');
const commandMenu = document.getElementById('command-menu');
const moveMenu = document.getElementById('move-menu');
const playerHpFill = document.getElementById('player-hp-fill');
const enemyHpFill = document.getElementById('enemy-hp-fill');
const playerHpText = document.getElementById('player-hp-current');

const parserScreen = document.getElementById('parser-screen');
const gameScreen = document.getElementById('game-screen');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const outputSection = document.getElementById('output-section');
const startGameBtn = document.getElementById('start-game-btn');

let gameLoopId;

function init() {
    window.addEventListener('keydown', handleInput);
    
    // Add Button Click Handlers
    document.querySelector('.up').addEventListener('click', () => handleInput('arrowup'));
    document.querySelector('.down').addEventListener('click', () => handleInput('arrowdown'));
    document.querySelector('.left').addEventListener('click', () => handleInput('arrowleft'));
    document.querySelector('.right').addEventListener('click', () => handleInput('arrowright'));
    document.querySelector('.btn-a').addEventListener('click', () => handleInput('a'));
    document.querySelector('.btn-b').addEventListener('click', () => handleInput('b'));
    document.querySelector('.start').addEventListener('click', () => handleInput('enter'));
    document.querySelector('.select').addEventListener('click', () => handleInput('enter'));

    // Parser File Load Logic
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const parser = new GbaStateParser(file);
            
            parser.analyze((result) => {
                uploadSection.classList.add('hidden');
                outputSection.classList.remove('hidden');
                
                document.getElementById('file-name-display').textContent = `--- File Analysis: ${result.filename} ---`;
                document.getElementById('title-display').textContent = `推定ゲームタイトル: ${result.title}`;
                document.getElementById('code-display').textContent = `ゲームコード: ${result.gameCode}`;
                document.getElementById('hex-dump').textContent = result.hexDump;
                
                // Show Start Game Button
                startGameBtn.classList.remove('hidden');
            });
        }
    });

    startGameBtn.addEventListener('click', startActualGame);
}

function startActualGame() {
    gameState.mode = 'GAME';
    parserScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    updateHp();
    startBattle();
    gameLoopId = requestAnimationFrame(gameLoop);
}

function startBattle() {
    gameState.phase = 'MESSAGE';
    showUI('MESSAGE');
    queueMessage(`あ！ やせいの ${gameState.enemy.name} が\nあらわれた！`);
    queueMessage(`${gameState.player.name}！\nゆけっ！`);
    showNextMessage();
}

function queueMessage(msg) {
    gameState.messageQueue.push(msg);
}

function showNextMessage() {
    if (gameState.messageQueue.length > 0) {
        const msg = gameState.messageQueue.shift();
        typeMessage(msg);
    } else {
        if (gameState.phase === 'MESSAGE' || gameState.phase === 'ATTACK') {
            gameState.phase = 'COMMAND';
            showUI('COMMAND');
        }
    }
}

let typeInterval;
function typeMessage(text) {
    if (gameState.isWriting) {
        clearInterval(typeInterval);
        messageEl.textContent = gameState.currentMessage;
        gameState.isWriting = false;
        return;
    }

    gameState.isWriting = true;
    gameState.currentMessage = text;
    messageEl.textContent = '';
    dialogueBox.classList.remove('hidden');
    
    let i = 0;
    typeInterval = setInterval(() => {
        messageEl.textContent += text[i];
        i++;
        if (i >= text.length) {
            clearInterval(typeInterval);
            gameState.isWriting = false;
        }
    }, 30);
}

function showUI(type) {
    dialogueBox.classList.add('hidden');
    commandMenu.classList.add('hidden');
    moveMenu.classList.add('hidden');

    if (type === 'COMMAND') {
        commandMenu.classList.remove('hidden');
    } else if (type === 'MOVE') {
        moveMenu.classList.remove('hidden');
    } else if (type === 'MESSAGE') {
        dialogueBox.classList.remove('hidden');
    }
}

function handleInput(e) {
    const key = e.key ? e.key.toLowerCase() : e.toLowerCase ? e.toLowerCase() : e;

    if (gameState.mode === 'PARSER') {
        if (key === 'b') {
            // Reset Parser
            fileInput.value = '';
            outputSection.classList.add('hidden');
            uploadSection.classList.remove('hidden');
        } else if (key === 'a' || key === 'enter') {
            if (!outputSection.classList.contains('hidden')) {
                startActualGame();
            } else {
                fileInput.click();
            }
        }
        return;
    }

    if (gameState.isWriting) {
        if (key === 'z' || key === 'enter' || key === 'a') {
            typeMessage(gameState.currentMessage); // Skip to end
        }
        return;
    }

    if (dialogueBox.classList.contains('hidden') === false && gameState.messageQueue.length >= 0) {
        if (key === 'z' || key === 'enter' || key === 'a') {
             if (gameState.messageQueue.length > 0) {
                 showNextMessage();
             } else {
                 if (gameState.phase === 'MESSAGE' || gameState.phase === 'ATTACK') {
                    showNextMessage();
                 }
             }
             return;
        }
    }

    if (gameState.phase === 'COMMAND') {
        if (key === 'arrowright') gameState.menuIndex = (gameState.menuIndex + 1) % 4;
        if (key === 'arrowleft') gameState.menuIndex = (gameState.menuIndex + 3) % 4;
        if (key === 'arrowdown') gameState.menuIndex = (gameState.menuIndex + 2) % 4;
        if (key === 'arrowup') gameState.menuIndex = (gameState.menuIndex + 2) % 4;
        
        updateMenuSelection();

        if (key === 'z' || key === 'enter' || key === 'a') {
            if (gameState.menuIndex === 0) { // FIGHT
                gameState.phase = 'MOVE';
                showUI('MOVE');
            } else if (gameState.menuIndex === 3) { // RUN
                queueMessage('うまく にげきれた！');
                gameState.phase = 'MESSAGE';
                showUI('MESSAGE');
                showNextMessage();
            }
        }
    } else if (gameState.phase === 'MOVE') {
        if (key === 'arrowright') gameState.moveIndex = (gameState.moveIndex + 1) % 4;
        if (key === 'arrowleft') gameState.moveIndex = (gameState.moveIndex + 3) % 4;
        if (key === 'arrowdown') gameState.moveIndex = (gameState.moveIndex + 2) % 4;
        if (key === 'arrowup') gameState.moveIndex = (gameState.moveIndex + 2) % 4;

        updateMoveSelection();

        if (key === 'x' || key === 'b') {
            gameState.phase = 'COMMAND';
            showUI('COMMAND');
        }

        if (key === 'z' || key === 'enter' || key === 'a') {
            executeMove(gameState.player.moves[gameState.moveIndex]);
        }
    }
}

function updateMenuSelection() {
    const items = document.querySelectorAll('.menu-item');
    items.forEach((item, i) => {
        item.classList.toggle('active', i === gameState.menuIndex);
    });
}

function updateMoveSelection() {
    const items = document.querySelectorAll('.move-item');
    items.forEach((item, i) => {
        item.classList.toggle('active', i === gameState.moveIndex);
    });
    const move = gameState.player.moves[gameState.moveIndex];
    document.getElementById('move-type').textContent = `タイプ/${move.type}`;
    document.getElementById('move-pp').textContent = `PP ${move.pp}/${move.pp}`;
}

function executeMove(move) {
    gameState.phase = 'ATTACK';
    showUI('MESSAGE');
    
    queueMessage(`${gameState.player.name} の\n${move.name}！`);
    
    setTimeout(() => {
        const damage = move.damage + Math.floor(Math.random() * 10);
        gameState.enemy.hp -= damage;
        if (gameState.enemy.hp < 0) gameState.enemy.hp = 0;
        
        updateHp();
        shakeScreen();
        
        queueMessage(`あいての ${gameState.enemy.name} に\nダメージを あたえた！`);
        
        if (gameState.enemy.hp <= 0) {
            queueMessage(`あいての ${gameState.enemy.name} は\nたおれた！`);
            queueMessage(`${gameState.player.name} は\n2534 けいけんちを もらった！`);
        } else {
            queueMessage(`あいての ${gameState.enemy.name} の\nハイドロポンプ！`);
            setTimeout(() => {
                const eDamage = 40 + Math.floor(Math.random() * 10);
                gameState.player.hp -= eDamage;
                if (gameState.player.hp < 0) gameState.player.hp = 0;
                updateHp();
                shakeScreen();
                queueMessage(`${gameState.player.name} は\nダメージを うけた！`);
            }, 1000);
        }
        
        showNextMessage();
    }, 500);
}

function updateHp() {
    playerHpFill.style.width = `${(gameState.player.hp / gameState.player.maxHp) * 100}%`;
    enemyHpFill.style.width = `${(gameState.enemy.hp / gameState.enemy.maxHp) * 100}%`;
    playerHpText.textContent = Math.floor(gameState.player.hp);
}

function shakeScreen() {
    canvas.classList.add('shake');
    setTimeout(() => canvas.classList.remove('shake'), 400);
}

function draw() {
    if (gameState.mode !== 'GAME') return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (images.bg.complete) {
        ctx.drawImage(images.bg, 0, 0, canvas.width, canvas.height);
    }
    
    if (images.enemy.complete) {
        ctx.drawImage(images.enemy, 140, 10, 80, 80);
    }
    
    if (images.player.complete) {
        ctx.drawImage(images.player, 20, 50, 100, 100);
    }
}

function gameLoop() {
    draw();
    gameLoopId = requestAnimationFrame(gameLoop);
}

// Start
init();
