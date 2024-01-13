const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');


canvas.width = 1200;
canvas.height = 800;


const bgImage = new Image();
bgImage.src = 'background.jpg'; 


const bird = {
    x: 25,
    y: 50,
    width: 40,
    height: 40,
    gravity: 0.25,
    velocity: 0,
    image: new Image()
};


bird.image.src = 'result.png';


let gameRunning = false;
let score = 0;
let playerName = '';

const bgMusic = new Audio('background.mp3');
const jumpSound = new Audio('jump.mp3');
const crashSound = new Audio('dead.mp3');
const pointSound = new Audio('point.mp3');
bgMusic.loop = true; 
bgMusic.volume = 0.05;


const pillars = [];
const pillarWidth = 100;
const gapHeight = 150;
let pillarInterval = 2500;
let pillarTimer = 0;


function resizeCanvas() {
    var maxWidth = 1200; 
    var maxHeight = 800; 
    var aspectRatio = maxWidth / maxHeight;

    var newWidth = window.innerWidth - 40; 
    var newHeight = window.innerHeight - 100; 

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


function drawStartButton() {
    drawButton('Start Game', canvas.width / 2, canvas.height / 2);
}

let gameSpeed; 

const baseSpeeds = {
    easy: 2,
    medium: 6,
    hard: 20
};

function updateActiveButton(activeButtonId) {
    const buttons = document.querySelectorAll('#difficultyButtons button');
    buttons.forEach(button => {
        if (button.id === activeButtonId) {
            button.classList.add('active-difficulty');
        } else {
            button.classList.remove('active-difficulty');
        }
    });
}

document.getElementById('easyButton').addEventListener('click', function() {
    setDifficulty('easy');
    updateActiveButton('easyButton');
});
document.getElementById('mediumButton').addEventListener('click', function() {
    setDifficulty('medium');
    updateActiveButton('mediumButton');
});
document.getElementById('hardButton').addEventListener('click', function() {
    setDifficulty('hard');
    updateActiveButton('hardButton');
});




function setDifficulty(difficulty) {
    gameSpeed = baseSpeeds[difficulty];
    
}



document.getElementById('easyButton').addEventListener('click', function() {
    setDifficulty('easy');
});
document.getElementById('mediumButton').addEventListener('click', function() {
    setDifficulty('medium');
});
document.getElementById('hardButton').addEventListener('click', function() {
    setDifficulty('hard');
});

function drawButton(text, x, y) {
    const buttonWidth = 200;
    const buttonHeight = 50;
    const buttonX = x - buttonWidth / 2;
    const buttonY = y - buttonHeight / 2;

    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    const textX = buttonX + (buttonWidth - ctx.measureText(text).width) / 2;
    const textY = buttonY + (buttonHeight / 2) + 6; 
    ctx.fillText(text, textX, textY);
}

let lastSpeedIncreaseScore = 0;

function adjustGameSpeed() {
    
    if (score > lastSpeedIncreaseScore) {
        gameSpeed += 1; 
        lastSpeedIncreaseScore = score; 
    }
}



document.addEventListener('keydown', function(event) {
    if (event.code === 'Space' && gameRunning) {
        bird.velocity = -6;
        jumpSound.play();
    }
});

function birdJump() {
    bird.velocity = -6;
    jumpSound.play();
}


canvas.addEventListener('touchstart', function(event) {
    if (gameRunning) {
        birdJump();
    }
    event.preventDefault(); 
}, { passive: false });

function startGame() {
    if (!gameRunning) {
    gameRunning = true;
    bird.y = 150;
    bird.velocity = 0;
    pillars.length = 0;
    score = 0;
    pillarTimer = 0;
    bgMusic.play();
    requestAnimationFrame(gameLoop)};
}

function initGame() {
    resizeCanvas();
    drawStartButton(); 
    addCanvasClickListener(); 
}

function drawInitialState() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    drawStartButton(); 
}

document.getElementById('startGameButton').addEventListener('click', function() {
    playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
        playerName = 'Anonymous'; 
    }
    startGame();
});

function updateBird() {
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    if (bird.y + bird.height > canvas.height) {
        endGame();
    }
}


function drawBird() {
    ctx.drawImage(bird.image, bird.x, bird.y, bird.width, bird.height);
}

function addPillar() {
    const gapPosition = (gapHeight / 2) + (Math.random() * (canvas.height - gapHeight));
    pillars.push({ x: canvas.width, top: gapPosition - gapHeight, bottom: gapPosition, passed: false });
}


function drawPillars() {
    pillars.forEach((pillar, index) => {
        ctx.fillStyle = '#8FBC8F';
        ctx.fillRect(pillar.x, 0, pillarWidth, pillar.top);
        ctx.fillRect(pillar.x, pillar.bottom, pillarWidth, canvas.height - pillar.bottom);

        pillar.x -= gameSpeed;

        if (pillar.x + pillarWidth < bird.x && !pillar.passed) {
            pillar.passed = true;
            score++;
            pointSound.play();
        }

        if (pillar.x + pillarWidth < 0) {
            pillars.splice(index, 1);
        }
    });
}


function checkCollision() {
    for (let pillar of pillars) {
        if (bird.x < pillar.x + pillarWidth &&
            bird.x + bird.width > pillar.x &&
            (bird.y < pillar.top || bird.y + bird.height > pillar.bottom)) {
            return true;
        }
    }
    return false;
}


function gameLoop(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    adjustGameSpeed(); 
    updateBird();
    drawBird();

    if (timestamp - pillarTimer > pillarInterval) {
        addPillar();
        pillarTimer = timestamp;
    }

    drawPillars();
    drawScore();

    if (checkCollision()) {
        endGame();
    }

    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}


function endGame() {
    gameRunning = false;
    crashSound.play();
    bgMusic.pause();
    bgMusic.currentTime = 0;
    updateLeaderboard(score); 
    showRestartButton();
}



function drawScore() {
    ctx.fillStyle = 'black'; 
    ctx.font = '24px Arial'; 
    const textWidth = ctx.measureText(`Score: ${score}`).width;
    const xPosition = (canvas.width - textWidth) / 2;
    const yPosition = 30; 
    ctx.fillText(`Score: ${score}`, xPosition, yPosition);
}


function drawRestartButton() {
    drawButton('Restart Game', canvas.width / 2, canvas.height / 2);

    
}

function showRestartButton() {
    drawButton('Restart Game', canvas.width / 2, canvas.height / 2);
}


function addCanvasClickListener() {
    canvas.addEventListener('click', function() {
        if (!gameRunning) {
            startGame();
        } else {
            restartGame();
        }
    });
}
    






function endGame() {
    gameRunning = false;
    crashSound.play();
    bgMusic.pause();
    bgMusic.currentTime = 0;
    updateLeaderboard(score); 
    showRestartButton();
}

const volumeSlider = document.getElementById('volumeSlider');


function adjustVolume() {
    const volume = volumeSlider.value;
    bgMusic.volume = volume;
    jumpSound.volume = volume;
    crashSound.volume = volume;
    pointSound.volume = volume;
}


volumeSlider.addEventListener('input', adjustVolume);


adjustVolume();


function updateLeaderboard(newScore) {
    let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    leaderboard.push({ name: playerName, score: newScore });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 5); // Keep only top 5
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    displayLeaderboard();
}



function displayLeaderboard() {
    const leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    leaderboardList.innerHTML = ''; 
    leaderboard.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = `${entry.name}: ${entry.score}`;
        leaderboardList.appendChild(li);
    });
}





initGame();
