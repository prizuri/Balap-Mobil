const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const speedTextEl = document.getElementById("speedText");
const coinsEl = document.getElementById("coins");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const themeBtn = document.getElementById("themeBtn");
const difficultyBtns = document.querySelectorAll(".difficulty-btn");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const boostBtn = document.getElementById("boostBtn");

const W = canvas.width;
const H = canvas.height;

const road = {
  x: 70,
  y: 0,
  width: 280,
  height: H,
  laneCount: 3
};

const modes = {
  easy: { baseSpeed: 3.8, enemyRate: 94, coinRate: 135, label: "Easy" },
  normal: { baseSpeed: 5.0, enemyRate: 76, coinRate: 125, label: "Normal" },
  hard: { baseSpeed: 6.2, enemyRate: 58, coinRate: 115, label: "Hard" }
};

let mode = "easy";
let player;
let enemies;
let coins;
let particles;
let keys;
let score;
let coinCount;
let highScore = Number(localStorage.getItem("turboLaneHighScore")) || 0;
let frame;
let roadOffset;
let gameSpeed;
let animationId;
let isRunning = false;
let isPaused = false;

highScoreEl.textContent = highScore;

function cssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

function resetGame() {
  player = {
    x: W / 2 - 22,
    y: H - 110,
    width: 44,
    height: 78,
    speed: 6.8,
    color: "#38bdf8"
  };

  enemies = [];
  coins = [];
  particles = [];
  keys = {
    left: false,
    right: false,
    boost: false,
    brake: false
  };

  score = 0;
  coinCount = 0;
  frame = 0;
  roadOffset = 0;
  gameSpeed = modes[mode].baseSpeed;
  isPaused = false;

  scoreEl.textContent = score;
  coinsEl.textContent = coinCount;
  speedTextEl.textContent = "1x";
  pauseBtn.textContent = "Pause";

  drawScene();
}

function startGame() {
  cancelAnimationFrame(animationId);
  resetGame();
  isRunning = true;
  overlay.classList.add("hidden");
  loop();
}

function pauseGame() {
  if (!isRunning) return;

  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "Lanjut" : "Pause";

  if (isPaused) {
    cancelAnimationFrame(animationId);
    showOverlay("Game Dijeda", "Tekan Lanjut atau Space untuk melanjutkan balapan.", "Lanjutkan");
  } else {
    overlay.classList.add("hidden");
    loop();
  }
}

function restartGame() {
  startGame();
}

function showOverlay(title, text, buttonText) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startBtn.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function loop() {
  update();
  drawScene();
  animationId = requestAnimationFrame(loop);
}

function update() {
  frame += 1;

  const boostBonus = keys.boost ? 2.3 : 0;
  const brakePenalty = keys.brake ? 1.8 : 0;
  gameSpeed = Math.max(2.5, modes[mode].baseSpeed + boostBonus - brakePenalty + score / 1600);

  roadOffset += gameSpeed;
  score += Math.floor(gameSpeed / 2);
  scoreEl.textContent = score;

  const speedMultiplier = (gameSpeed / modes[mode].baseSpeed).toFixed(1);
  speedTextEl.textContent = `${speedMultiplier}x`;

  movePlayer();
  spawnObjects();
  moveObjects();
  checkCollisions();
  updateParticles();
}

function movePlayer() {
  if (keys.left) player.x -= player.speed;
  if (keys.right) player.x += player.speed;

  const minX = road.x + 12;
  const maxX = road.x + road.width - player.width - 12;
  player.x = Math.max(minX, Math.min(maxX, player.x));
}

function laneX(laneIndex, width) {
  const laneWidth = road.width / road.laneCount;
  return road.x + laneIndex * laneWidth + laneWidth / 2 - width / 2;
}

function spawnObjects() {
  const difficulty = modes[mode];

  if (frame % difficulty.enemyRate === 0) {
    const lane = Math.floor(Math.random() * road.laneCount);
    const enemyWidth = 42 + Math.random() * 9;
    const enemy = {
      x: laneX(lane, enemyWidth),
      y: -90,
      width: enemyWidth,
      height: 76,
      speed: gameSpeed + 1.8 + Math.random() * 2.1,
      color: randomEnemyColor()
    };

    const safeToSpawn = !enemies.some(item => Math.abs(item.y - enemy.y) < 120 && Math.abs(item.x - enemy.x) < 56);
    if (safeToSpawn) enemies.push(enemy);
  }

  if (frame % difficulty.coinRate === 0) {
    const lane = Math.floor(Math.random() * road.laneCount);
    coins.push({
      x: laneX(lane, 28),
      y: -40,
      size: 28,
      speed: gameSpeed + 1.2,
      angle: 0
    });
  }
}

function moveObjects() {
  enemies.forEach(enemy => enemy.y += enemy.speed);
  coins.forEach(coin => {
    coin.y += coin.speed;
    coin.angle += 0.15;
  });

  enemies = enemies.filter(enemy => enemy.y < H + 120);
  coins = coins.filter(coin => coin.y < H + 60);
}

function checkCollisions() {
  for (const enemy of enemies) {
    if (rectsOverlap(player, enemy)) {
      endGame();
      return;
    }
  }

  coins = coins.filter(coin => {
    const coinRect = {
      x: coin.x,
      y: coin.y,
      width: coin.size,
      height: coin.size
    };

    if (rectsOverlap(player, coinRect)) {
      coinCount += 1;
      score += 120;
      coinsEl.textContent = coinCount;
      scoreEl.textContent = score;
      addCoinParticles(coin.x + coin.size / 2, coin.y + coin.size / 2);
      return false;
    }

    return true;
  });
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function endGame() {
  cancelAnimationFrame(animationId);
  isRunning = false;

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("turboLaneHighScore", highScore);
    highScoreEl.textContent = highScore;
  }

  showOverlay("Game Over", `Skor kamu ${score} dan koin terkumpul ${coinCount}. Klik Main Lagi untuk balapan ulang.`, "Main Lagi");
}

function drawScene() {
  drawBackground();
  drawRoad();
  drawCoins();
  drawEnemies();
  drawPlayer();
  drawParticles();
  drawHudLine();
}

function drawBackground() {
  ctx.fillStyle = cssVar("--grass");
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.11)";
  for (let i = 0; i < 22; i++) {
    const x = (i * 53 + frame * 0.6) % W;
    const y = (i * 97 + roadOffset * 0.45) % H;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRoad() {
  ctx.fillStyle = cssVar("--road");
  roundRect(road.x, 0, road.width, road.height, 0, cssVar("--road"));

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(road.x, 0, 8, H);
  ctx.fillRect(road.x + road.width - 8, 0, 8, H);

  const laneWidth = road.width / road.laneCount;
  ctx.strokeStyle = cssVar("--road-line");
  ctx.lineWidth = 5;
  ctx.setLineDash([34, 28]);
  ctx.lineDashOffset = -roadOffset;

  for (let i = 1; i < road.laneCount; i++) {
    const x = road.x + laneWidth * i;
    ctx.beginPath();
    ctx.moveTo(x, -40);
    ctx.lineTo(x, H + 40);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawPlayer() {
  drawCar(player.x, player.y, player.width, player.height, player.color, true);

  if (keys.boost) {
    ctx.fillStyle = "rgba(249, 115, 22, 0.75)";
    ctx.beginPath();
    ctx.moveTo(player.x + 12, player.y + player.height - 2);
    ctx.lineTo(player.x + 22, player.y + player.height + 28 + Math.random() * 12);
    ctx.lineTo(player.x + 32, player.y + player.height - 2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawEnemies() {
  enemies.forEach(enemy => {
    drawCar(enemy.x, enemy.y, enemy.width, enemy.height, enemy.color, false);
  });
}

function drawCar(x, y, width, height, color, isPlayer) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 8;

  roundRect(x, y, width, height, 12, color);

  ctx.shadowColor = "transparent";

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  roundRect(x + width * 0.18, y + height * 0.14, width * 0.64, height * 0.22, 7, "rgba(255,255,255,0.58)");
  roundRect(x + width * 0.22, y + height * 0.48, width * 0.56, height * 0.20, 6, "rgba(15,23,42,0.35)");

  ctx.fillStyle = "#111827";
  roundRect(x - 5, y + height * 0.17, 7, height * 0.18, 3, "#111827");
  roundRect(x + width - 2, y + height * 0.17, 7, height * 0.18, 3, "#111827");
  roundRect(x - 5, y + height * 0.66, 7, height * 0.18, 3, "#111827");
  roundRect(x + width - 2, y + height * 0.66, 7, height * 0.18, 3, "#111827");

  ctx.fillStyle = isPlayer ? "#e0f2fe" : "#fee2e2";
  roundRect(x + width * 0.18, y + 5, width * 0.22, 6, 3, ctx.fillStyle);
  roundRect(x + width * 0.60, y + 5, width * 0.22, 6, 3, ctx.fillStyle);

  ctx.restore();
}

function drawCoins() {
  coins.forEach(coin => {
    const centerX = coin.x + coin.size / 2;
    const centerY = coin.y + coin.size / 2;
    const scaleX = Math.max(0.35, Math.abs(Math.cos(coin.angle)));

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scaleX, 1);
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(0, 0, coin.size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, coin.size / 2 - 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawHudLine() {
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(road.x, 0, road.width, 2);
}

function roundRect(x, y, width, height, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function randomEnemyColor() {
  const colors = ["#ef4444", "#a855f7", "#f97316", "#14b8a6", "#eab308", "#64748b"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function addCoinParticles(x, y) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 28
    });
  }
}

function updateParticles() {
  particles.forEach(particle => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 1;
  });

  particles = particles.filter(particle => particle.life > 0);
}

function drawParticles() {
  particles.forEach(particle => {
    ctx.globalAlpha = particle.life / 28;
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function setKey(key, value) {
  keys[key] = value;
}

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if (key === "arrowleft" || key === "a") setKey("left", true);
  if (key === "arrowright" || key === "d") setKey("right", true);
  if (key === "arrowup" || key === "w") setKey("boost", true);
  if (key === "arrowdown" || key === "s") setKey("brake", true);

  if (event.code === "Space") {
    event.preventDefault();
    if (!isRunning) startGame();
    else pauseGame();
  }
});

document.addEventListener("keyup", event => {
  const key = event.key.toLowerCase();

  if (key === "arrowleft" || key === "a") setKey("left", false);
  if (key === "arrowright" || key === "d") setKey("right", false);
  if (key === "arrowup" || key === "w") setKey("boost", false);
  if (key === "arrowdown" || key === "s") setKey("brake", false);
});

function bindHold(button, key) {
  const on = event => {
    event.preventDefault();
    setKey(key, true);
  };

  const off = event => {
    event.preventDefault();
    setKey(key, false);
  };

  button.addEventListener("pointerdown", on);
  button.addEventListener("pointerup", off);
  button.addEventListener("pointerleave", off);
  button.addEventListener("pointercancel", off);
}

bindHold(leftBtn, "left");
bindHold(rightBtn, "right");
bindHold(boostBtn, "boost");

difficultyBtns.forEach(button => {
  button.addEventListener("click", () => {
    difficultyBtns.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    mode = button.dataset.mode;
    resetGame();
  });
});

startBtn.addEventListener("click", () => {
  if (isRunning && isPaused) {
    isPaused = false;
    pauseBtn.textContent = "Pause";
    overlay.classList.add("hidden");
    loop();
  } else {
    startGame();
  }
});

pauseBtn.addEventListener("click", pauseGame);
restartBtn.addEventListener("click", restartGame);

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("light");
  themeBtn.textContent = document.body.classList.contains("light") ? "☀️" : "🌙";
  drawScene();
});

resetGame();
