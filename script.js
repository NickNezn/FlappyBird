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

// Define pillar intervals for each difficulty
const pillarIntervals = {
    easy: 2500,       // Pillar spawn interval for Easy mode
    medium: 1800,     // Shorter pillar spawn interval for Medium mode
    hard: 1200        // Even shorter pillar spawn interval for Hard mode
};

// Define base speeds for each difficulty
const baseSpeeds = {
    easy: 2,          // Slow initial speed for Easy mode
    medium: 4,        // Faster initial speed for Medium mode
    hard: 6           // Faster initial speed for Hard mode
};

let gameSpeed = baseSpeeds.easy;
let lastScoreSpeedIncrement = 0;

function resizeCanvas() {
    const maxWidth = 1200, maxHeight = 800, aspectRatio = maxWidth / maxHeight;
    let newWidth = window.innerWidth - 40;
    let newHeight = window.innerHeight - 100;
    if (newWidth > maxWidth) newWidth = maxWidth;
    if (newHeight > maxHeight) newHeight = maxHeight;
    if (newWidth / newHeight > aspectRatio) {
        newWidth = newHeight * aspectRatio;
    } else {
        newHeight = newWidth / aspectRatio;
    }
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
    const width = 200, height = 50;
    const bx = x - width / 2;
    const by = y - height / 2;

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
    pillarInterval = pillarIntervals[level];
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

// ✅ Spacebar jump
document.addEventListener('keydown', e => {
    if (e.code === 'Space' && gameRunning) {
        birdJump();
    }
});

// ✅ Canvas click to jump
function addCanvasClickListener() {
    canvas.addEventListener('click', () => {
        if (!gameRunning) {
            startGame();
        } else {
            // If game is already running, jump
            birdJump();
        }
    });
}

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
        const pillarGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        pillarGradient.addColorStop(0, '#66ff66');
        pillarGradient.addColorStop(1, '#1eb141');

        ctx.fillStyle = pillarGradient;
        ctx.fillRect(p.x, 0, pillarWidth, p.top);
        ctx.fillRect(p.x, p.bottom, pillarWidth, canvas.height - p.bottom);

        // Shadows for effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.shadowColor = 'transparent';

        // Move pillars
        p.x -= gameSpeed;

        // Scoring logic
        if (!p.passed && p.x + pillarWidth < bird.x) {
            p.passed = true;
            score++;
            sounds.point.play();
        }

        // Remove off-screen pillars
        if (p.x + pillarWidth < 0) {
            pillars.splice(i, 1);
        }
    });
}

function checkCollision() {
    return pillars.some(p =>
        bird.x < p.x + pillarWidth &&
        bird.x + bird.width > p.x &&
        (bird.y < p.top || bird.y + bird.height > p.bottom)
    );
}

let lastPillarSpawnTime = 0;
let pillarSpeed = 2;

function gameLoop(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    updateBird();
    drawBird();

    pillarSpeed = gameSpeed;

    if (timestamp - lastPillarSpawnTime > pillarInterval) {
        addPillar();
        lastPillarSpawnTime = timestamp;
    }

    drawPillars();
    drawScore();

    // Increase speed over time
    if (difficulty === 'easy') {
        if (timestamp - lastScoreSpeedIncrement > 1000) {
            gameSpeed += 0.01;
            lastScoreSpeedIncrement = timestamp;
        }
    } else if (difficulty === 'medium') {
        if (timestamp - lastScoreSpeedIncrement > 900) {
            gameSpeed += 0.02;
            lastScoreSpeedIncrement = timestamp;
        }
    } else if (difficulty === 'hard') {
        if (timestamp - lastScoreSpeedIncrement > 700) {
            gameSpeed += 0.03;
            lastScoreSpeedIncrement = timestamp;
        }
    }

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
        timestamp: Date.now(),
        difficulty: difficulty
    });
}

function displayLeaderboard() {
    const { ref, get, query, orderByChild, equalTo, limitToLast } = window.firebaseRefs;
    const db = window.firebaseDB;

    const easyList   = document.getElementById('easyLeaderboard');
    const mediumList = document.getElementById('mediumLeaderboard');
    const hardList   = document.getElementById('hardLeaderboard');

    easyList.innerHTML = 'Loading...';
    mediumList.innerHTML = 'Loading...';
    hardList.innerHTML   = 'Loading...';

    const easyScoresRef   = query(ref(db, 'scores'), orderByChild('difficulty'), equalTo('easy'));
    const mediumScoresRef = query(ref(db, 'scores'), orderByChild('difficulty'), equalTo('medium'));
    const hardScoresRef   = query(ref(db, 'scores'), orderByChild('difficulty'), equalTo('hard'));

    function renderLeaderboard(list, scoresRef, mode) {
        get(scoresRef).then(snapshot => {
            const entries = [];
            snapshot.forEach(child => {
                entries.push(child.val());
            });

            if (entries.length === 0) {
                list.innerHTML = `No entries yet for ${mode}`;
                return;
            }

            entries.sort((a, b) => b.score - a.score);
            list.innerHTML = '';

            entries.slice(0, 5).forEach(entry => {
                const li = document.createElement('li');
                li.textContent = `${entry.name}: ${entry.score}`;
                list.appendChild(li);
            });
        }).catch(err => {
            list.innerHTML = `Error loading leaderboard for ${mode}`;
            console.error(`[Leaderboard ERROR - ${mode}]`, err);
        });
    }

    renderLeaderboard(easyList,   easyScoresRef,   'Easy');
    renderLeaderboard(mediumList, mediumScoresRef, 'Medium');
    renderLeaderboard(hardList,   hardScoresRef,   'Hard');
}

function addCanvasClickListener() {
    // ✅ Canvas click to jump or start game
    canvas.addEventListener('click', () => {
        if (!gameRunning) {
            startGame();
        } else {
            birdJump();
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

document.addEventListener('DOMContentLoaded', function () {
    const volumeSlider = document.getElementById('volumeSlider');
    volumeSlider.value = 0.1;
    adjustVolume();
    volumeSlider.addEventListener('input', adjustVolume);

    // Try to load saved player name from localStorage
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
        document.getElementById('playerName').value = savedName;
        playerName = savedName;
    }
});

document.getElementById('startGameButton').addEventListener('click', () => {
    const inputName = document.getElementById('playerName').value.trim();
    playerName = inputName || 'Anonymous';

    // Save name to localStorage
    localStorage.setItem('playerName', playerName);

    startGame();
});

document.getElementById('startHtmlButton').addEventListener('click', () => {
    const inputName = document.getElementById('playerName').value.trim();
    playerName = inputName || 'Anonymous';

    // Save name to localStorage
    localStorage.setItem('playerName', playerName);

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
    setTimeout(displayLeaderboard, 300);
}

initGame();
