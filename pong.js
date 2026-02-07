const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

const playerScoreEl = document.getElementById('playerScore');
const aiScoreEl = document.getElementById('aiScore');
const restartBtn = document.getElementById('restartBtn');

// Game objects
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 8,
    speed: 5, // Initial speed
    dx: 5,
    dy: 5,
    color: '#ff006e'
};

const paddleHeight = 80;
const paddleWidth = 10;

const player = {
    x: 10,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    color: '#3a86ff',
    score: 0
};

const ai = {
    x: canvas.width - 20,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    color: '#7b2cbf',
    score: 0
};

const WINNING_SCORE = 5;
let isGameOver = false;

// Event listener for mouse movement
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const root = document.documentElement;
    let mouseY = e.clientY - rect.top - root.scrollTop;

    player.y = mouseY - player.height / 2;

    // Boundary checks
    if (player.y < 0) player.y = 0;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
});

restartBtn.addEventListener('click', resetGame);

function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function drawCircle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();
}

function drawNet() {
    for (let i = 0; i <= canvas.height; i += 30) {
        drawRect(canvas.width / 2 - 1, i, 2, 20, 'rgba(255,255,255,0.1)');
    }
}

function drawText(text, x, y, color, size = '40px') {
    ctx.fillStyle = color;
    ctx.font = `${size} Outfit`;
    ctx.fillText(text, x, y);
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speed = 5;
    ball.dx = (ball.dx > 0 ? -1 : 1) * ball.speed; // Reset speed magnitude, keep toggle direction
    ball.dy = (Math.random() < 0.5 ? -1 : 1) * ball.speed; // Randomize vertical direction slightly or reset
}

function resetGame() {
    player.score = 0;
    ai.score = 0;
    playerScoreEl.textContent = 0;
    aiScoreEl.textContent = 0;
    isGameOver = false;
    restartBtn.classList.add('hidden');
    resetBall();
    update();
}

function update() {
    if (isGameOver) return;

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collision (top/bottom)
    if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
    }

    // AI Movement (Simple tracking with delay/speed limit)
    let aiCenter = ai.y + ai.height / 2;
    if (aiCenter < ball.y - 35) {
        ai.y += 4; // AI Speed
    } else if (aiCenter > ball.y + 35) {
        ai.y -= 4;
    }
    // Boundary for AI
    if (ai.y < 0) ai.y = 0;
    if (ai.y + ai.height > canvas.height) ai.y = canvas.height - ai.height;

    // Paddle collision
    let playerOrAi = (ball.x < canvas.width / 2) ? player : ai;

    if (collision(ball, playerOrAi)) {
        // Where did the ball hit the paddle?
        let collidePoint = ball.y - (playerOrAi.y + playerOrAi.height / 2);
        // Normalize (-1 to 1)
        collidePoint = collidePoint / (playerOrAi.height / 2);

        // Calculate angle (45 degrees max)
        let angleRad = collidePoint * (Math.PI / 4);

        // Direction of ball
        let direction = (ball.x < canvas.width / 2) ? 1 : -1;

        ball.dx = direction * ball.speed * Math.cos(angleRad);
        ball.dy = ball.speed * Math.sin(angleRad);

        // Increase speed for challenge
        ball.speed += 1.0;
    }

    // Score update
    if (ball.x - ball.radius < 0) {
        ai.score++;
        aiScoreEl.textContent = ai.score;
        if (ai.score >= WINNING_SCORE) {
            endGame("AI WINS!");
            return;
        }
        resetBall();
    } else if (ball.x + ball.radius > canvas.width) {
        player.score++;
        playerScoreEl.textContent = player.score;
        if (player.score >= WINNING_SCORE) {
            endGame("YOU WIN!");
            return;
        }
        resetBall();
    }

    render();
    requestAnimationFrame(update);
}

function collision(b, p) {
    b.top = b.y - b.radius;
    b.bottom = b.y + b.radius;
    b.left = b.x - b.radius;
    b.right = b.x + b.radius;

    p.top = p.y;
    p.bottom = p.y + p.height;
    p.left = p.x;
    p.right = p.x + p.width;

    return b.right > p.left && b.bottom > p.top && b.left < p.right && b.top < p.bottom;
}

function endGame(message) {
    isGameOver = true;
    resetBall(); // Reset ball to center
    // Reset paddles to center
    player.y = canvas.height / 2 - paddleHeight / 2;
    ai.y = canvas.height / 2 - paddleHeight / 2;
    render();
    drawText(message, canvas.width / 2 - 100, canvas.height / 2, '#fff');
    restartBtn.textContent = 'ゲームスタート';
    restartBtn.classList.remove('hidden');
}

function render() {
    // Clear canvas
    drawRect(0, 0, canvas.width, canvas.height, 'rgba(0,0,0,0)'); // We want transparent/clear, but handled by clearing rect properly
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Correct way

    drawNet();
    drawRect(player.x, player.y, player.width, player.height, player.color);
    drawRect(ai.x, ai.y, ai.width, ai.height, ai.color);
    drawCircle(ball.x, ball.y, ball.radius, ball.color);
}

// Start game
resetBall();
render();
