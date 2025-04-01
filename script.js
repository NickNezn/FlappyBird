// Improved and cleaned-up version of your Flappy Bird script

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1200;
canvas.height = 800;

const bgImage = new Image();
bgImage.src = 'pictures/background.jpg';

const bird = {
    x: 25,
    y: 50,
    width: 40,
    height: 40,
    gravity: 0.10,
    velocity: 0,
    image: new Image()
};
bird.image.src = 'pictures/result.png';

let gameRunning = false;
let score = 0;
let playerName = '';
let difficulty = 'easy';

const sounds = {
    bgMusic: new Audio('sounds/background.mp3'),
    jump: new Audio('sounds/jump.mp3'),
    crash: new Audio('sounds/defeat.mp3'),
    point: new Audio('sounds/point.mp3')
};
sounds.bgMusic.loop = true;
sounds.bgMusic.volume = 0.02;

const pillars = [];
const pillarWidth = 100;
const gapHeight = 200;
let pillarInterval = 2500;
let pillarTimer = 0;

const baseSpeeds = { easy: 2, medium: 6, hard: 20 };
let gameSpeed = baseSpeeds.easy;
let lastScoreSpeedIncrement = 0;

function resizeCanvas() {
    const maxWidth = 1200, maxHeight = 800, aspectRatio = maxWidth / maxHeight;
    let newWidth = window.innerWidth - 40;
    let newHeight = window.innerHeight - 100;
    if (newWidth > maxWidth) newWidth = maxWidth;
    if (newHeight > maxHeight) newHeight = maxHeight;
    if (newWidth / newHeight > aspectRatio) newWidth = newHeight * aspectRatio;
    else newHeight = newWidth / aspectRatio;
    canvas.width = newWidth;
    canvas.height = newHeight;
    drawInitialState();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawInitialState() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    showStartButton();
}

function drawButton(text, x, y) {
    const width = 200, height = 50, bx = x - width / 2, by = y - height / 2;
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(bx, by, width, height);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    const textX = bx + (width - ctx.measureText(text).width) / 2;
    const textY = by + (height / 2) + 6;
    ctx.fillText(text, textX, textY);
}

function setDifficulty(level) {
    difficulty = level;
    gameSpeed = baseSpeeds[level];
    lastScoreSpeedIncrement = 0;
    document.querySelectorAll('#difficultyButtons button').forEach(btn =>
        btn.classList.toggle('active-difficulty', btn.id === `${level}Button`)
    );
}
['easy', 'medium', 'hard'].forEach(level => {
    document.getElementById(`${level}Button`).addEventListener('click', () => setDifficulty(level));
});

function startGame() {
    if (gameRunning) return;
    hideStartButton();
    hideRestartButton();
    gameRunning = true;
    bird.y = 150;
    bird.velocity = 0;
    pillars.length = 0;
    score = 0;
    pillarTimer = 0;
    gameSpeed = baseSpeeds[difficulty];
    lastScoreSpeedIncrement = 0;
    sounds.bgMusic.play();
    requestAnimationFrame(gameLoop);
}

function restartGame() {
    hideRestartButton();
    gameRunning = true;
    bird.y = 150;
    bird.velocity = 0;
    pillars.length = 0;
    score = 0;
    pillarTimer = 0;
    gameSpeed = baseSpeeds[difficulty];
    lastScoreSpeedIncrement = 0;
    sounds.bgMusic.currentTime = 0;
    sounds.bgMusic.play();
    requestAnimationFrame(gameLoop);
}

function birdJump() {
    bird.velocity = -4;
    sounds.jump.currentTime = 0;
    sounds.jump.play();
}

document.addEventListener('keydown', e => e.code === 'Space' && gameRunning && birdJump());
canvas.addEventListener('touchstart', e => {
    if (gameRunning) birdJump();
    e.preventDefault();
}, { passive: false });

function updateBird() {
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
    if (bird.y + bird.height > canvas.height) endGame();
}

function drawBird() {
    ctx.drawImage(bird.image, bird.x, bird.y, bird.width, bird.height);
}

function addPillar() {
    const gap = (gapHeight / 2) + Math.random() * (canvas.height - gapHeight);
    pillars.push({ x: canvas.width, top: gap - gapHeight, bottom: gap, passed: false });
}

function drawPillars() {
    pillars.forEach((p, i) => {
        ctx.fillStyle = '#8FBC8F';
        ctx.fillRect(p.x, 0, pillarWidth, p.top);
        ctx.fillRect(p.x, p.bottom, pillarWidth, canvas.height - p.bottom);
        p.x -= gameSpeed;
        if (!p.passed && p.x + pillarWidth < bird.x) {
            p.passed = true;
            score++;
            sounds.point.play();

            if (difficulty === 'easy' && score > lastScoreSpeedIncrement) {
                gameSpeed += 0.05;
                lastScoreSpeedIncrement = score;
            }
        }
        if (p.x + pillarWidth < 0) pillars.splice(i, 1);
    });
}

function checkCollision() {
    return pillars.some(p =>
        bird.x < p.x + pillarWidth &&
        bird.x + bird.width > p.x &&
        (bird.y < p.top || bird.y + bird.height > p.bottom)
    );
}

function gameLoop(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    updateBird();
    drawBird();
    if (timestamp - pillarTimer > pillarInterval) {
        addPillar();
        pillarTimer = timestamp;
    }
    drawPillars();
    drawScore();
    if (checkCollision()) endGame();
    if (gameRunning) requestAnimationFrame(gameLoop);
}

function drawScore() {
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    const text = `Score: ${score}`;
    ctx.fillText(text, (canvas.width - ctx.measureText(text).width) / 2, 30);
}

function endGame() {
    gameRunning = false;
    sounds.crash.play();
    sounds.bgMusic.pause();
    sounds.bgMusic.currentTime = 0;
    updateLeaderboard(score);
    showRestartButton();
}

function updateLeaderboard(newScore) {
    const { ref, push, set } = window.firebaseRefs;
    const db = window.firebaseDB;

    const scoresRef = ref(db, 'scores');
    const newEntry = push(scoresRef);
    set(newEntry, {
        name: playerName,
        score: newScore,
        timestamp: Date.now()
    });
}

function displayLeaderboard() {
    const { ref, get, query, orderByChild, limitToLast } = window.firebaseRefs;
    const db = window.firebaseDB;

    const list = document.getElementById('leaderboardList');
    if (!list) return;
    list.innerHTML = 'Loading...';

    const scoresRef = query(ref(db, 'scores'), orderByChild('score'), limitToLast(5));

    get(scoresRef).then(snapshot => {
        const entries = [];
        snapshot.forEach(child => entries.push(child.val()));

        entries.sort((a, b) => b.score - a.score);

        list.innerHTML = '';
        entries.forEach(entry => {
            const li = document.createElement('li');
            li.textContent = `${entry.name}: ${entry.score}`;
            list.appendChild(li);
        });
    }).catch(err => {
        list.innerHTML = 'Error loading leaderboard';
        console.error('[Leaderboard ERROR]', err);
    });
}

function addCanvasClickListener() {
    canvas.addEventListener('click', () => {
        if (!gameRunning) {
            startGame();
        }
    });
}

function showRestartButton() {
    document.getElementById('restartButton').style.display = 'block';
}

function hideRestartButton() {
    document.getElementById('restartButton').style.display = 'none';
}

function showStartButton() {
    document.getElementById('startHtmlButton').style.display = 'block';
}

function hideStartButton() {
    document.getElementById('startHtmlButton').style.display = 'none';
}

function adjustVolume() {
    const vol = document.getElementById('volumeSlider').value;
    Object.values(sounds).forEach(s => s.volume = vol);
}
document.getElementById('volumeSlider').addEventListener('input', adjustVolume);
adjustVolume();

document.getElementById('startGameButton').addEventListener('click', () => {
    playerName = document.getElementById('playerName').value.trim() || 'Anonymous';
    startGame();
});

document.getElementById('startHtmlButton').addEventListener('click', () => {
    playerName = document.getElementById('playerName').value.trim() || 'Anonymous';
    startGame();
});

document.getElementById('restartButton').addEventListener('click', restartGame);

['bird1Button', 'bird2Button', 'bird3Button'].forEach((id, index) => {
    document.getElementById(id).addEventListener('click', function () {
        const birdImages = ['duck.png', 'twitter.png', 'black.png'];
        bird.image.src = `pictures/${birdImages[index]}`;
        document.querySelectorAll('#birdSelection button').forEach(btn => btn.classList.remove('selected'));
        this.classList.add('selected');
    });
});

function initGame() {
    resizeCanvas();
    drawInitialState();
    addCanvasClickListener();
    setTimeout(displayLeaderboard, 300); // Wait to ensure Firebase is ready
}

initGame();