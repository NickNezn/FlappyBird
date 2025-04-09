/************************************************************
 * FLAPPY BIRD + SHOP + ACHIEVEMENTS
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

// Game Variables
let gameRunning = false;
let score = 0;
let playerName = '';
let difficulty = 'easy';

/************************************************************
 * coinCount + purchasedSkins => localStorage
 ************************************************************/
// coinCount
let coinCount = 0;
if (localStorage.getItem('coinCount')) {
  coinCount = parseInt(localStorage.getItem('coinCount'), 10) || 0;
}
// purchasedSkins
let purchasedSkins = {};
if (localStorage.getItem('purchasedSkins')) {
  purchasedSkins = JSON.parse(localStorage.getItem('purchasedSkins'));
} else {
  purchasedSkins = {};
}

// Additional lifetime stats for achievements
let lifetimeCoins = 0;
let lifetimePillars = 0;
/** Achievements data */
let achievements = {
  coins100: false,
  pillars20: false,
  pillars50: false,
  pillars100: false,
  score20: false
};
// Load from localStorage if found
if(localStorage.getItem('lifetimeCoins')){
  lifetimeCoins = parseInt(localStorage.getItem('lifetimeCoins'), 10) || 0;
}
if(localStorage.getItem('lifetimePillars')){
  lifetimePillars = parseInt(localStorage.getItem('lifetimePillars'), 10) || 0;
}
if(localStorage.getItem('achievements')){
  achievements = JSON.parse(localStorage.getItem('achievements'));
}

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
 * coins + particles
 ************************************************************/
let coins = [];
let particles = [];

/************************************************************
 * checkAchievements
 ************************************************************/
function checkAchievements() {
  // coins100 => if lifetimeCoins >= 100
  if(!achievements.coins100 && lifetimeCoins >= 100) {
    achievements.coins100 = true;
  }
  // pillars20 => if lifetimePillars >= 20
  if(!achievements.pillars20 && lifetimePillars >= 20) {
    achievements.pillars20 = true;
  }
  // pillars50
  if(!achievements.pillars50 && lifetimePillars >= 50) {
    achievements.pillars50 = true;
  }
  // pillars100
  if(!achievements.pillars100 && lifetimePillars >= 100) {
    achievements.pillars100 = true;
  }
  // score20 => if user got at least 20 in a single run
  if(!achievements.score20 && score >= 20) {
    achievements.score20 = true;
  }

  // Save
  localStorage.setItem('achievements', JSON.stringify(achievements));

  // update achievements UI
  updateAchievementsUI();
}

/************************************************************
 * updateAchievementsUI
 ************************************************************/
function updateAchievementsUI() {
  const list = document.getElementById('achievementsList');
  if(!list) return;

  let html = '';
  html += `<li>${achievements.coins100   ? '✔' : '✖'} Collect 100 coins (lifetime)</li>`;
  html += `<li>${achievements.score20    ? '✔' : '✖'} Score 20 in one run</li>`;
  html += `<li>${achievements.pillars20  ? '✔' : '✖'} Pass 20 pillars (all runs)</li>`;
  html += `<li>${achievements.pillars50  ? '✔' : '✖'} Pass 50 pillars (all runs)</li>`;
  html += `<li>${achievements.pillars100 ? '✔' : '✖'} Pass 100 pillars (all runs)</li>`;

  list.innerHTML = html;
}

/************************************************************
 * updateCoinDisplay
 ************************************************************/
function updateCoinDisplay() {
  document.getElementById('coinDisplay').textContent = coinCount;
  localStorage.setItem('coinCount', coinCount.toString());
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
 * Resize Canvas
 ************************************************************/
function resizeCanvas() {
  const aspectRatio = 1200 / 800;
  let width = window.innerWidth;
  let height = window.innerHeight;

  if (width / height > aspectRatio) {
    width = height * aspectRatio;
  } else {
    height = width / aspectRatio;
  }

  canvas.width = width;
  canvas.height = height;
  drawInitialState();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/************************************************************
 * drawInitialState
 ************************************************************/
function drawInitialState() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

  const initialBirdX = 25;
  const initialBirdY = canvas.height * 0.4;
  ctx.drawImage(bird.image, initialBirdX, initialBirdY, bird.width, bird.height);

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
  const gap = (gapHeight / 2) + Math.random()*(canvas.height - gapHeight);
  pillars.push({ x:canvas.width, top:gap-gapHeight, bottom:gap, passed:false });

  // spawn coin in gap
  const coinX= canvas.width + pillarWidth/2;
  const coinY= gap - gapHeight + (gapHeight / 2);
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

    p.x -= gameSpeed;

    if(!p.passed && p.x + pillarWidth < bird.x){
      p.passed= true;
      score++;
      sounds.point.play();

      // lifetimePillars++ => achievements
      lifetimePillars++;
      localStorage.setItem('lifetimePillars', lifetimePillars.toString());
      checkAchievements();
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

      // also lifetimeCoins
      lifetimeCoins++;
      localStorage.setItem('lifetimeCoins', lifetimeCoins.toString());
      checkAchievements();
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
    bird.x < p.x + pillarWidth &&
    bird.x + bird.width > p.x &&
    (bird.y < p.top || bird.y + bird.height > p.bottom)
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

  if(timestamp - lastPillarSpawnTime > pillarInterval){
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

  // Check if final score >= 20 => achievements
  checkAchievements();

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

// Display top 5 scoreboard
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
      // Display top 5
      entries.slice(0,5).forEach(entry => {
        const li = document.createElement('li');
        li.textContent = `${entry.name}: ${entry.score}`;
        listElement.appendChild(li);
      });
    }).catch(err => {
      listElement.innerHTML = `Error loading leaderboard for ${mode}`;
      console.error(`[Leaderboard ERROR - ${mode}]`, err);
    });
  }

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
 * Touch Controls
 ************************************************************/
function addTouchListeners() {
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameRunning) {
      startGame();
    } else {
      birdJump();
    }
  }, { passive: false });
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
 ************************************************************/
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
 * initGame
 ************************************************************/
function initGame(){
  resizeCanvas();
  drawInitialState();
  addCanvasClickListener();
  setTimeout(displayLeaderboard,300);
  addTouchListeners();


  // show coin + purchased skins
  updateCoinDisplay();
  updateAchievementsUI();
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
