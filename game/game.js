const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const hitsElement = document.getElementById("hits");
const targetDateElement = document.getElementById("targetDate");
const powerElement = document.getElementById("power");
const startButton = document.getElementById("startButton");

let contributions = [];
let targets = [];
let bullets = [];
let particles = [];

let rocket = {
  x: 80,
  y: 260,
  width: 55,
  height: 28
};

let hits = 0;
let power = 0;
let gameRunning = false;
let currentTarget = null;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width;
  canvas.height = rect.height;

  rocket.y = canvas.height / 2;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();


// --------------------------------------------------
// LOAD REAL GITHUB CONTRIBUTION DATA
// --------------------------------------------------

async function loadContributions() {
  try {
    const response = await fetch("../Contribution/contributions.json");

    if (!response.ok) {
      throw new Error("Could not load contributions.json");
    }

    const data = await response.json();

    contributions = data.contributions
      .filter(day => Number(day.count) > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    power = data.total;

    powerElement.textContent = power;

    createTargets();

  } catch (error) {
    console.error(error);
    targetDateElement.textContent = "Data unavailable";
  }
}


// --------------------------------------------------
// CREATE CONTRIBUTION TARGETS
// --------------------------------------------------

function createTargets() {

  targets = [];

  const maxTargets = Math.min(contributions.length, 80);

  const selected = contributions.slice(-maxTargets);

  selected.forEach((day, index) => {

    const strength = Number(day.count);

    targets.push({
      date: day.date,
      count: strength,
      x: canvas.width - 100 - (index % 10) * 75,
      y: 80 + Math.floor(index / 10) * 50,
      radius: Math.min(8 + strength * 1.5, 20),
      alive: true,
      pulse: Math.random() * Math.PI * 2
    });

  });
}


// --------------------------------------------------
// DRAW BACKGROUND
// --------------------------------------------------

function drawBackground() {

  ctx.fillStyle = "#050810";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stars

  for (let i = 0; i < 80; i++) {

    const x = (i * 137) % canvas.width;
    const y = (i * 83) % canvas.height;

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Battle line

  ctx.strokeStyle = "rgba(57,211,83,0.15)";
  ctx.setLineDash([6, 10]);

  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();

  ctx.setLineDash([]);
}


// --------------------------------------------------
// DRAW CONTRIBUTION TARGETS
// --------------------------------------------------

function drawTargets() {

  targets.forEach(target => {

    if (!target.alive) return;

    target.pulse += 0.04;

    const glow =
      Math.sin(target.pulse) * 3;

    // Glow

    const gradient = ctx.createRadialGradient(
      target.x,
      target.y,
      1,
      target.x,
      target.y,
      target.radius + 15 + glow
    );

    gradient.addColorStop(
      0,
      "rgba(57,211,83,0.45)"
    );

    gradient.addColorStop(
      1,
      "rgba(57,211,83,0)"
    );

    ctx.fillStyle = gradient;

    ctx.beginPath();

    ctx.arc(
      target.x,
      target.y,
      target.radius + 15 + glow,
      0,
      Math.PI * 2
    );

    ctx.fill();

    // Target

    ctx.fillStyle =
      target.count >= 10
        ? "#ff4d4d"
        : target.count >= 5
        ? "#39d353"
        : "#26a641";

    ctx.beginPath();

    ctx.arc(
      target.x,
      target.y,
      target.radius,
      0,
      Math.PI * 2
    );

    ctx.fill();

    // Contribution count

    ctx.fillStyle = "#ffffff";

    ctx.font = "11px Arial";

    ctx.textAlign = "center";

    ctx.fillText(
      target.count,
      target.x,
      target.y + 4
    );

  });
}


// --------------------------------------------------
// DRAW ROCKET
// --------------------------------------------------

function drawRocket() {

  ctx.save();

  ctx.translate(
    rocket.x,
    rocket.y
  );

  // Rocket body

  ctx.fillStyle = "#e6edf3";

  ctx.beginPath();

  ctx.roundRect(
    -25,
    -12,
    40,
    24,
    8
  );

  ctx.fill();

  // Rocket nose

  ctx.fillStyle = "#39d353";

  ctx.beginPath();

  ctx.moveTo(15, -12);
  ctx.lineTo(30, 0);
  ctx.lineTo(15, 12);

  ctx.closePath();

  ctx.fill();

  // Window

  ctx.fillStyle = "#58a6ff";

  ctx.beginPath();

  ctx.arc(
    5,
    0,
    5,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // Fire

  ctx.fillStyle = "#ff9f1c";

  ctx.beginPath();

  ctx.moveTo(-25, -6);
  ctx.lineTo(-42, 0);
  ctx.lineTo(-25, 6);

  ctx.closePath();

  ctx.fill();

  ctx.restore();
}


// --------------------------------------------------
// SHOOT BULLET
// --------------------------------------------------

function shoot() {

  if (!gameRunning) return;

  const target =
    targets.find(t => t.alive);

  if (!target) return;

  currentTarget = target;

  bullets.push({
    x: rocket.x + 30,
    y: rocket.y,
    target: target,
    speed: 9
  });

  targetDateElement.textContent =
    target.date;
}


// --------------------------------------------------
// UPDATE BULLETS
// --------------------------------------------------

function updateBullets() {

  bullets.forEach((bullet, index) => {

    if (!bullet.target.alive) {
      bullets.splice(index, 1);
      return;
    }

    const dx =
      bullet.target.x - bullet.x;

    const dy =
      bullet.target.y - bullet.y;

    const distance =
      Math.sqrt(dx * dx + dy * dy);

    if (distance < bullet.speed) {

      hitTarget(bullet.target);

      bullets.splice(index, 1);

      return;
    }

    bullet.x +=
      (dx / distance) * bullet.speed;

    bullet.y +=
      (dy / distance) * bullet.speed;

  });
}


// --------------------------------------------------
// DRAW BULLETS
// --------------------------------------------------

function drawBullets() {

  bullets.forEach(bullet => {

    ctx.fillStyle = "#ffffff";

    ctx.shadowBlur = 15;
    ctx.shadowColor = "#39d353";

    ctx.beginPath();

    ctx.arc(
      bullet.x,
      bullet.y,
      4,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.shadowBlur = 0;

  });
}


// --------------------------------------------------
// HIT TARGET
// --------------------------------------------------

function hitTarget(target) {

  target.alive = false;

  hits++;

  hitsElement.textContent = hits;

  createExplosion(
    target.x,
    target.y
  );

  targetDateElement.textContent =
    `💥 ${target.date}`;
}


// --------------------------------------------------
// EXPLOSION
// --------------------------------------------------

function createExplosion(x, y) {

  for (let i = 0; i < 20; i++) {

    particles.push({

      x,
      y,

      vx:
        (Math.random() - 0.5) * 6,

      vy:
        (Math.random() - 0.5) * 6,

      life: 40
    });

  }
}


// --------------------------------------------------
// UPDATE PARTICLES
// --------------------------------------------------

function updateParticles() {

  particles.forEach((particle, index) => {

    particle.x += particle.vx;
    particle.y += particle.vy;

    particle.life--;

    if (particle.life <= 0) {

      particles.splice(index, 1);

    }

  });
}


// --------------------------------------------------
// DRAW PARTICLES
// --------------------------------------------------

function drawParticles() {

  particles.forEach(particle => {

    ctx.fillStyle =
      `rgba(57,211,83,${particle.life / 40})`;

    ctx.fillRect(
      particle.x,
      particle.y,
      3,
      3
    );

  });
}


// --------------------------------------------------
// GAME LOOP
// --------------------------------------------------

function gameLoop() {

  drawBackground();

  drawTargets();

  drawRocket();

  updateBullets();

  drawBullets();

  updateParticles();

  drawParticles();

  if (gameRunning) {

    rocket.x += 0.25;

    if (rocket.x >
        canvas.width - 200) {

      rocket.x = 80;

    }

  }

  requestAnimationFrame(gameLoop);
}


// --------------------------------------------------
// START GAME
// --------------------------------------------------

startButton.addEventListener(
  "click",
  () => {

    gameRunning = true;

    startButton.textContent =
      "🚀 BATTLE ACTIVE";

    startButton.disabled = true;

    shoot();

    setInterval(
      shoot,
      1800
    );

  }
);


// Start

loadContributions();

gameLoop();
