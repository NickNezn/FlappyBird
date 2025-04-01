/************************************************************
 * FLAPPY BIRD + SHOP
 * 1) Coins in pillar gaps
 * 2) Coin shop with cost-based skins
 * 3) Particle effects on coin pickup
 * 4) coinCount + purchasedSkins saved in localStorage
 * 5) Skins cost: Duck=10, Twitter=50, Black=100
 ************************************************************/

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1200;
canvas.height = 800;

const bgImage = new Image();
bgImage.src = 'pictures/background.jpg';

// Bird
const bird = {
  x: 25,
  y: 50,
  width: 40,
  height: 40,
  gravity: 0.10,
  velocity: 0,
  image: new Image(),
  skinSrc: 'pictures/result.png'
};
bird.image.src = bird.skinSrc;

/************************************************************
 * Game Variables
 ************************************************************/
let gameRunning = false;
let score = 0;
let playerName = '';
let difficulty = 'easy';

/************************************************************
 * coinCount + purchasedSkins => localStorage
 ************************************************************/
// read coinCount
let coinCount = 0;
if (localStorage.getItem('coinCount')) {
  coinCount = parseInt(localStorage.getItem('coinCount'), 10) || 0;
}

// read purchasedSkins object: e.g. { duck:true, twitter:true, black:false }
let purchasedSkins = {};
if (localStorage.getItem('purchasedSkins')) {
  purchasedSkins = JSON.parse(localStorage.getItem('purchasedSkins'));
} else {
  // if none, init empty
  purchasedSkins = {};
}

/************************************************************
 * Display + Save coinCount
 ************************************************************/
function updateCoinDisplay() {
  document.getElementById('coinDisplay').textContent = coinCount;
  localStorage.setItem('coinCount', coinCount.toString()); // save
}

/************************************************************
 * Sounds
 ************************************************************/
const sounds = {
  bgMusic: new Audio('sounds/background.mp3'),
  jump: new Audio('sounds/jump.mp3'),
  crash: new Audio('sounds/defeat.mp3'),
  point: new Audio('sounds/point.mp3'),
  coin: new Audio('sounds/coin.mp3')
};
sounds.bgMusic.loop = true;
sounds.bgMusic.volume = 0.02;

/************************************************************
 * Pillars + Gaps
 ************************************************************/
const pillars = [];
const pillarWidth = 100;
const gapHeight = 200;
let pillarInterval = 2500;
let pillarTimer = 0;

const pillarIntervals = {
  easy: 2500,
  medium: 1800,
  hard: 1200
};

const baseSpeeds = {
  easy: 2,
  medium: 4,
  hard: 6
};

let gameSpeed = baseSpeeds.easy;
let lastScoreSpeedIncrement = 0;

/************************************************************
 * coin + particle arrays
 ************************************************************/
let coins = [];       // { x, y, radius, collected }
let particles = [];   // { x, y, vx, vy, life }

/************************************************************
 * Resize Canvas
 ************************************************************/
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

/************************************************************
 * DrawInitial
 ************************************************************/
function drawInitialState() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw background
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  
    // Place the bird in a nice starting position (centered horizontally, maybe?)
    const initialBirdX = 25;          // or canvas.width * 0.1
    const initialBirdY = canvas.height * 0.4; // ~40% from top
    ctx.drawImage(bird.image, initialBirdX, initialBirdY, bird.width, bird.height);
  
    // Show Start button on the canvas
    showStartButton();
  }
  

/************************************************************
 * Difficulty
 ************************************************************/
function setDifficulty(level) {
  difficulty = level;
  gameSpeed = baseSpeeds[level];
  pillarInterval = pillarIntervals[level];
  lastScoreSpeedIncrement = 0;

  document.querySelectorAll('#difficultyButtons button').forEach(btn =>
    btn.classList.toggle('active-difficulty', btn.id === `${level}Button`)
  );
}
['easy','medium','hard'].forEach(level => {
  document.getElementById(`${level}Button`).addEventListener('click', () => setDifficulty(level));
});

/************************************************************
 * Start / Restart
 ************************************************************/
function startGame() {
  if (gameRunning) return;
  hideStartButton();
  hideRestartButton();
  gameRunning = true;

  bird.y = 150;
  bird.velocity = 0;
  pillars.length = 0;
  coins.length = 0;
  particles.length = 0;
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
  coins.length = 0;
  particles.length = 0;
  score = 0;
  pillarTimer = 0;
  gameSpeed = baseSpeeds[difficulty];
  lastScoreSpeedIncrement = 0;

  sounds.bgMusic.currentTime = 0;
  sounds.bgMusic.play();
  requestAnimationFrame(gameLoop);
}

/************************************************************
 * Bird Jump
 ************************************************************/
function birdJump() {
  bird.velocity = -4;
  sounds.jump.currentTime = 0;
  sounds.jump.play();
}

/************************************************************
 * Spacebar => start or jump
 ************************************************************/
document.addEventListener('keydown', e => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!gameRunning) {
      startGame();
    } else {
      birdJump();
    }
  }
});

/************************************************************
 * Bird + Pillars
 ************************************************************/
function updateBird() {
  bird.velocity += bird.gravity;
  bird.y += bird.velocity;
  if(bird.y + bird.height > canvas.height) {
    endGame();
  }
}
function drawBird() {
  ctx.drawImage(bird.image,bird.x,bird.y,bird.width,bird.height);
}

function addPillar() {
  const gap = (gapHeight/2) + Math.random()*(canvas.height-gapHeight);
  pillars.push({ x:canvas.width, top:gap-gapHeight, bottom:gap, passed:false });

  // spawn coin in gap
  const coinX= canvas.width + pillarWidth/2;
  const coinY= gap - gapHeight + (gapHeight/2);
  coins.push({
    x: coinX,
    y: coinY,
    radius:15,
    collected:false
  });
}

function drawPillars(){
  pillars.forEach((p,i)=>{
    const pillarGradient= ctx.createLinearGradient(0,0,0,canvas.height);
    pillarGradient.addColorStop(0,'#66ff66');
    pillarGradient.addColorStop(1,'#1eb141');

    ctx.fillStyle= pillarGradient;
    ctx.fillRect(p.x, 0, pillarWidth, p.top);
    ctx.fillRect(p.x, p.bottom, pillarWidth, canvas.height - p.bottom);

    ctx.shadowColor='rgba(0,0,0,0.5)';
    ctx.shadowBlur=10;
    ctx.shadowOffsetX=3;
    ctx.shadowOffsetY=3;
    ctx.shadowColor='transparent';

    p.x-= gameSpeed;

    if(!p.passed && p.x + pillarWidth< bird.x){
      p.passed= true;
      score++;
      sounds.point.play();
    }
    if(p.x + pillarWidth<0){
      pillars.splice(i,1);
    }
  });
}

/************************************************************
 * Coins
 ************************************************************/
function updateCoins(){
  coins.forEach((c,i)=>{
    if(c.collected) return;
    c.x-= gameSpeed;
    if(c.x + c.radius<0){
      coins.splice(i,1);
    }
  });
}
function drawCoins(){
  coins.forEach(c=>{
    if(!c.collected){
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0,2*Math.PI);
      ctx.fillStyle='yellow';
      ctx.fill();
      ctx.lineWidth=2;
      ctx.strokeStyle='orange';
      ctx.stroke();
    }
  });
}
function checkCoinCollision(){
  coins.forEach(c=>{
    if(c.collected) return;
    const distX= bird.x+ bird.width/2 - c.x;
    const distY= bird.y+ bird.height/2 - c.y;
    const dist= Math.sqrt(distX*distX + distY*distY);
    if(dist < c.radius + bird.width/2){
      c.collected= true;
      coinCount++;
      updateCoinDisplay(); 
      sounds.coin.currentTime=0;
      sounds.coin.play();
      spawnParticles(c.x,c.y);
    }
  });
}

/************************************************************
 * Particles
 ************************************************************/
function spawnParticles(x,y){
  for(let i=0; i<10; i++){
    particles.push({
      x:x,
      y:y,
      vx:(Math.random()-0.5)*4,
      vy:(Math.random()-0.5)*4,
      life:30
    });
  }
}
function updateParticles(){
  particles.forEach((p,i)=>{
    p.x+= p.vx;
    p.y+= p.vy;
    p.life--;
    if(p.life<=0){
      particles.splice(i,1);
    }
  });
}
function drawParticles(){
  ctx.fillStyle='orange';
  particles.forEach(p=>{
    ctx.beginPath();
    ctx.arc(p.x,p.y,3,0,2*Math.PI);
    ctx.fill();
  });
}

/************************************************************
 * Check Collision
 ************************************************************/
function checkCollision(){
  return pillars.some(p=>
    bird.x< p.x+ pillarWidth &&
    bird.x+ bird.width> p.x &&
    (bird.y< p.top || bird.y+ bird.height> p.bottom)
  );
}

/************************************************************
 * Main Game Loop
 ************************************************************/
let lastPillarSpawnTime=0;
function gameLoop(timestamp){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(bgImage,0,0,canvas.width,canvas.height);

  updateBird();
  drawBird();

  if(timestamp- lastPillarSpawnTime> pillarInterval){
    addPillar();
    lastPillarSpawnTime= timestamp;
  }
  drawPillars();

  updateCoins();
  drawCoins();
  checkCoinCollision();

  updateParticles();
  drawParticles();

  drawScore();

  // Speed up
  if(difficulty==='easy'){
    if(timestamp- lastScoreSpeedIncrement>1000){
      gameSpeed+=0.01;
      lastScoreSpeedIncrement= timestamp;
    }
  } else if(difficulty==='medium'){
    if(timestamp- lastScoreSpeedIncrement>900){
      gameSpeed+=0.02;
      lastScoreSpeedIncrement= timestamp;
    }
  } else if(difficulty==='hard'){
    if(timestamp- lastScoreSpeedIncrement>700){
      gameSpeed+=0.03;
      lastScoreSpeedIncrement= timestamp;
    }
  }

  if(checkCollision()) endGame();
  if(gameRunning) requestAnimationFrame(gameLoop);
}

/************************************************************
 * Score
 ************************************************************/
function drawScore(){
  ctx.fillStyle='black';
  ctx.font='24px Arial';
  const txt= `Score: ${score} | Coins: ${coinCount}`;
  ctx.fillText(txt, (canvas.width- ctx.measureText(txt).width)/2, 30);
}

/************************************************************
 * EndGame
 ************************************************************/
function endGame(){
  gameRunning=false;
  sounds.crash.play();
  sounds.bgMusic.pause();
  sounds.bgMusic.currentTime=0;
  updateLeaderboard(score);
  showRestartButton();
}

/************************************************************
 * Leaderboard
 ************************************************************/
function updateLeaderboard(newScore){
  const { ref, push, set } = window.firebaseRefs;
  const db= window.firebaseDB;
  const scoresRef= ref(db, 'scores');
  const newEntry= push(scoresRef);
  set(newEntry,{
    name: playerName,
    score:newScore,
    timestamp:Date.now(),
    difficulty:difficulty
  });
}

function displayLeaderboard() {
    const { ref, get, query, orderByChild, equalTo } = window.firebaseRefs;
    const db = window.firebaseDB;
  
    const easyList   = document.getElementById('easyLeaderboard');
    const mediumList = document.getElementById('mediumLeaderboard');
    const hardList   = document.getElementById('hardLeaderboard');
  
    easyList.innerHTML   = 'Loading...';
    mediumList.innerHTML = 'Loading...';
    hardList.innerHTML   = 'Loading...';
  
    // Build the queries: one per difficulty
    const easyRef   = query(ref(db, 'scores'), orderByChild('difficulty'), equalTo('easy'));
    const mediumRef = query(ref(db, 'scores'), orderByChild('difficulty'), equalTo('medium'));
    const hardRef   = query(ref(db, 'scores'), orderByChild('difficulty'), equalTo('hard'));
  
    function renderBoard(listElement, firebaseQuery, mode) {
      get(firebaseQuery).then(snapshot => {
        const entries = [];
        snapshot.forEach(child => {
          entries.push(child.val()); // Collect each score in an array
        });
  
        if (entries.length === 0) {
          listElement.innerHTML = `No entries yet for ${mode}`;
          return;
        }
  
        // Sort scores descending
        entries.sort((a, b) => b.score - a.score);
  
        listElement.innerHTML = '';
        // Display only top 5
        entries.slice(0, 3).forEach(entry => {
          const li = document.createElement('li');
          li.textContent = `${entry.name}: ${entry.score}`;
          listElement.appendChild(li);
        });
      }).catch(err => {
        listElement.innerHTML = `Error loading leaderboard for ${mode}`;
        console.error(`[Leaderboard ERROR - ${mode}]`, err);
      });
    }
  
    // Render each difficulty board
    renderBoard(easyList,   easyRef,   'Easy');
    renderBoard(mediumList, mediumRef, 'Medium');
    renderBoard(hardList,   hardRef,   'Hard');
  }
  

/************************************************************
 * Canvas => Start or Jump
 ************************************************************/
function addCanvasClickListener(){
  canvas.addEventListener('click', ()=>{
    if(!gameRunning){
      startGame();
    } else {
      birdJump();
    }
  });
}

/************************************************************
 * Show/Hide Buttons
 ************************************************************/
function showRestartButton(){
  document.getElementById('restartButton').style.display='block';
}
function hideRestartButton(){
  document.getElementById('restartButton').style.display='none';
}
function showStartButton(){
  document.getElementById('startHtmlButton').style.display='block';
}
function hideStartButton(){
  document.getElementById('startHtmlButton').style.display='none';
}

/************************************************************
 * Volume
 ************************************************************/
function adjustVolume(){
  const vol= document.getElementById('volumeSlider').value;
  Object.values(sounds).forEach(s=> s.volume= vol);
}

/************************************************************
 * Bird Skins
 * Duck=10, Twitter=50, Black=100
 * If skin not purchased => cost coins; else free re-equip
 ************************************************************/
// Skin definitions with cost
const skins = [
    { key: 'duck',    src: 'pictures/duck.png',    cost: 10  },
    { key: 'twitter', src: 'pictures/twitter.png', cost: 50  },
    { key: 'black',   src: 'pictures/black.png',   cost: 100 }
  ];
  
  // We'll map each button to an errorDiv
  const errorDivs = [ 'duckError', 'twitterError', 'blackError' ];
  
  ['bird1Button', 'bird2Button', 'bird3Button'].forEach((buttonId, index) => {
    const chosenSkin = skins[index];
    const errorDivId = errorDivs[index];
  
    document.getElementById(buttonId).addEventListener('click', () => {
      // 1) Clear any old error message first
      hideAllSkinErrors();
  
      if (purchasedSkins[chosenSkin.key]) {
        // Already purchased => re-equip
        bird.image.src = chosenSkin.src;
        highlightSkinButton(buttonId);
      } else {
        // Not purchased => check cost
        if (coinCount < chosenSkin.cost) {
          // Show inline error message
          const errorDiv = document.getElementById(errorDivId);
          errorDiv.textContent = `Not enough coins! Need ${chosenSkin.cost}, have ${coinCount}.`;
          errorDiv.style.display = 'block';
          return;
        }
        // Enough coins => purchase
        coinCount -= chosenSkin.cost;
        updateCoinDisplay();
  
        purchasedSkins[chosenSkin.key] = true;
        localStorage.setItem('purchasedSkins', JSON.stringify(purchasedSkins));
  
        bird.image.src = chosenSkin.src;
        highlightSkinButton(buttonId);
      }
    });
  });
  
  function hideAllSkinErrors() {
    // hide all error messages
    errorDivs.forEach(id => {
      const div = document.getElementById(id);
      div.style.display = 'none';
      div.textContent = '';
    });
  }
  
  function highlightSkinButton(btnId) {
    document.querySelectorAll('#shopSkins button').forEach(b => b.classList.remove('selected'));
    document.getElementById(btnId).classList.add('selected');
  }
  
  
/************************************************************
 * Initialize
 ************************************************************/
function initGame(){
  resizeCanvas();
  drawInitialState();
  addCanvasClickListener();
  setTimeout(displayLeaderboard,300);

  // show coin + purchased skins
  updateCoinDisplay();
}

/************************************************************
 * DOMContentLoaded => load Name
 ************************************************************/
document.addEventListener('DOMContentLoaded', ()=>{
  // volume
  const volumeSlider= document.getElementById('volumeSlider');
  volumeSlider.value= 0.1;
  adjustVolume();
  volumeSlider.addEventListener('input', adjustVolume);

  // load saved name
  const savedName= localStorage.getItem('playerName');
  if(savedName){
    document.getElementById('playerName').value= savedName;
    playerName= savedName;
  }
});

/************************************************************
 * Start + Submit + Restart
 ************************************************************/
document.getElementById('startGameButton').addEventListener('click', ()=>{
  const inputName= document.getElementById('playerName').value.trim();
  playerName= inputName||'Anonymous';
  localStorage.setItem('playerName', playerName);
  startGame();
});
document.getElementById('startHtmlButton').addEventListener('click', ()=>{
  const inputName= document.getElementById('playerName').value.trim();
  playerName= inputName||'Anonymous';
  localStorage.setItem('playerName', playerName);
  startGame();
});
document.getElementById('restartButton').addEventListener('click', restartGame);

initGame();
