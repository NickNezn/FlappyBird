const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set the canvas dimensions
canvas.width = 1200;
canvas.height = 800;

// Load background image
const bgImage = new Image();
bgImage.src = 'background.jpg'; // Make sure this path is correct

// Bird properties
const bird = {
    x: 25,
    y: 50,
    width: 40,
    height: 40,
    gravity: 0.25,
    velocity: 0,
    image: new Image()
};

// Load the bird image
bird.image.src = 'result.png'; // Make sure this path is correct

// Game state variables
let gameRunning = false;
let score = 0;
let playerName = '';

const bgMusic = new Audio('background.mp3');
const jumpSound = new Audio('jump.mp3');
const crashSound = new Audio('dead.mp3');
const pointSound = new Audio('point.mp3');
bgMusic.loop = true; // Background music will loop
bgMusic.volume = 0.05;

// Pillar properties
const pillars = [];
const pillarWidth = 100;
const gapHeight = 150;
let pillarInterval = 2500;
let pillarTimer = 0;

// Function to resize canvas
function resizeCanvas() {
    var maxWidth = 1200; // Maximum canvas width
    var maxHeight = 800; // Maximum canvas height
    var aspectRatio = maxWidth / maxHeight;

    var newWidth = window.innerWidth - 40; // 20px padding on each side
    var newHeight = window.innerHeight - 100; // Extra space for buttons

    if (newWidth > maxWidth) newWidth = maxWidth;
    if (newHeight > maxHeight) newHeight = maxHeight;

    if (newWidth / newHeight > aspectRatio) {
        newWidth = newHeight * aspectRatio;
    } else {
        newHeight = newWidth / aspectRatio;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
    drawInitialState(); // Redraw the initial state when resized
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Function to draw start button
function drawStartButton() {
    drawButton('Choose Difficulty', canvas.width / 2, canvas.height / 2);
}

let gameSpeed; 

const baseSpeeds = {
    easy: 2,
    medium: 6,
    hard: 20
};

function setDifficulty(difficulty) {
    gameSpeed = baseSpeeds[difficulty];
    // Other game difficulty settings can go here
}

// Event listeners for difficulty buttons
document.getElementById('easyButton').addEventListener('click', function() {
    setDifficulty('easy');
});
document.getElementById('mediumButton').addEventListener('click', function() {
    setDifficulty('medium');
});
document.getElementById('hardButton').addEventListener('click', function() {
    setDifficulty('hard');
});
// Function to draw button on canvas
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
    const textY = buttonY + (buttonHeight / 2) + 6; // Adjusting vertical alignment
    ctx.fillText(text, textX, textY);
}

let lastSpeedIncreaseScore = 0;

function adjustGameSpeed() {
    // Check if we have reached a new point and not already increased the speed for this score
    if (score > lastSpeedIncreaseScore) {
        gameSpeed += 1; // Adjust the value as needed for gradual increase
        lastSpeedIncreaseScore = score; // Remember the score at which we last increased the speed
    }
}

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





document.addEventListener('keydown', function(event) {
    if (event.code === 'Space' && gameRunning) {
        bird.velocity = -6;
        jumpSound.play();
    }
});
// Function to start the game
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
    resizeCanvas(); // Ensure canvas is correctly sized
    drawStartButton(); // Draw the start button
    addCanvasClickListener(); // Setup the click event listener
}
// Function to draw initial state of the game
function drawInitialState() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    drawStartButton(); // Draw the start button
}

document.getElementById('startGameButton').addEventListener('click', function() {
    playerName = document.getElementById('playerName').value.trim();
    if (!playerName) {
        playerName = 'Anonymous'; // Default name if none entered
    }
    startGame();
});
function saveScore(playerName, score) {
    var scoresRef = firebase.database().ref('scores');
    scoresRef.push({
      name: playerName,
      score: score
    });
  }
  

canvas.addEventListener('click', function() {
    if (gameRunning) {
        bird.velocity = -6; // Adjust the value as needed for the jump strength
        jumpSound.play();
    }
});
// Function to update bird's position
function updateBird() {
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    if (bird.y + bird.height > canvas.height) {
        endGame();
    }
}

// Function to draw the bird
function drawBird() {
    ctx.drawImage(bird.image, bird.x, bird.y, bird.width, bird.height);
}
// Function to add a new pillar
function addPillar() {
    const gapPosition = (gapHeight / 2) + (Math.random() * (canvas.height - gapHeight));
    pillars.push({ x: canvas.width, top: gapPosition - gapHeight, bottom: gapPosition, passed: false });
}

// Function to draw pillars and increment score
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

// Check for collision
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

// Game loop
function gameLoop(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    adjustGameSpeed(); // Adjust game speed based on score
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

// End game function
function endGame() {
    gameRunning = false;
    crashSound.play();
    bgMusic.pause();
    bgMusic.currentTime = 0;
    updateLeaderboard(score); // Update leaderboard with the final score
    showRestartButton();
}


// Function to draw score
function drawScore() {
    ctx.fillStyle = 'black'; // Set the text color
    ctx.font = '24px Arial'; // Set the font
    const textWidth = ctx.measureText(`Score: ${score}`).width;
    const xPosition = (canvas.width - textWidth) / 2;
    const yPosition = 30; // You can adjust this value as needed
    ctx.fillText(`Score: ${score}`, xPosition, yPosition);
}

// Function to draw restart button
function drawRestartButton() {
    drawButton('Restart Game', canvas.width / 2, canvas.height / 2);

    
}

function showRestartButton() {
    drawButton('Restart Game', canvas.width / 2, canvas.height / 2);
}

// Function to add event listener for canvas clicks
function addCanvasClickListener() {
    canvas.addEventListener('click', function() {
        if (!gameRunning) {
            startGame();
        } else {
            restartGame();
        }
    });
}
    





// Function to restart the game
function endGame() {
    gameRunning = false;
    crashSound.play();
    bgMusic.pause();
    bgMusic.currentTime = 0;
    updateLeaderboard(score); // Update leaderboard with the final score
    showRestartButton();
}


// Function to update and display the leaderboard
function updateLeaderboard(newScore) {
    let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
    leaderboard.push({ name: playerName, score: newScore });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 3); // Keep only top 3 scores
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    displayLeaderboard();
}


// Function to display the leaderboard
function displayLeaderboard() {
    var scoresRef = firebase.database().ref('scores').orderByChild('score').limitToLast(10);
    scoresRef.on('value', function(snapshot) {
      var scores = snapshot.val();
      // Clear existing leaderboard
      var leaderboardList = document.getElementById('leaderboardList');
      leaderboardList.innerHTML = '';
  
      // Update leaderboard with new scores
      for (var key in scores) {
        var li = document.createElement('li');
        li.textContent = `${scores[key].name}: ${scores[key].score}`;
        leaderboardList.appendChild(li);
      }
    });
  }
  function displayHighScores() {
    var scoresRef = firebase.database().ref('scores').orderByChild('score').limitToLast(10);
    scoresRef.on('value', function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        var childData = childSnapshot.val();
        console.log(childData); // Check if data is being retrieved
        // Code to display scores
      });
    });
  }
  




// Initialize game
initGame();
