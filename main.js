const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const scoreLabel = document.querySelector("#score");
const bestLabel = document.querySelector("#best");
const finalScoreLabel = document.querySelector("#finalScore");
const startOverlay = document.querySelector("#startOverlay");
const gameOverOverlay = document.querySelector("#gameOverOverlay");
const muteButton = document.querySelector("#muteButton");
const leaderboardList = document.querySelector("#leaderboardList");
const leaderboardStatus = document.querySelector("#leaderboardStatus");
const leaderboardEndpoint =
  "https://script.google.com/macros/s/AKfycbwYFg7LTrHtgoliJmC5MmgMbMCOKP5Wvl8DLGGBrUBogev4YoNnJzSTTq-O2tUUFY_E/exec";
const birdImage = new Image();
birdImage.src = "örjanlax.png";

const world = { width: 900, height: 600, ground: 528 };
const bird = { x: 190, y: 280, radius: 20, velocity: 0, rotation: 0 };
const settings = {
  gravity: 0.42,
  flap: -7.8,
  pipeSpeed: 3.3,
  pipeWidth: 82,
  gap: 165,
};
let pipes = [];
let score = 0;
let best = Number(localStorage.getItem("wing-it-best") || 0);
let state = "ready";
let muted = false;
let lastTime = 0;
let pipeTimer = 0;

bestLabel.textContent = best;

function resetGame() {
  bird.y = 280;
  bird.velocity = 0;
  bird.rotation = 0;
  pipes = [];
  score = 0;
  pipeTimer = 0;
  state = "ready";
  updateScore();
  startOverlay.hidden = false;
  gameOverOverlay.hidden = true;
}

function updateScore() {
  scoreLabel.textContent = score;
  bestLabel.textContent = best;
}

function startGame() {
  if (state !== "ready") return;
  state = "playing";
  startOverlay.hidden = true;
  flap();
}

function flap() {
  if (state === "ready") {
    startGame();
    return;
  }
  if (state === "playing") bird.velocity = settings.flap;
}

function addPipe() {
  const margin = 82;
  const gapTop =
    margin + Math.random() * (world.ground - settings.gap - margin * 2);
  pipes.push({ x: world.width + 30, gapTop, counted: false });
}

function birdBox() {
  return {
    x: bird.x - bird.radius + 4,
    y: bird.y - bird.radius + 4,
    w: bird.radius * 2 - 8,
    h: bird.radius * 2 - 8,
  };
}

function collidesPipe(pipe) {
  const box = birdBox();
  const overlapsX =
    box.x + box.w > pipe.x && box.x < pipe.x + settings.pipeWidth;
  return (
    overlapsX &&
    (box.y < pipe.gapTop || box.y + box.h > pipe.gapTop + settings.gap)
  );
}

async function submitScore(finalScore) {
  if (!leaderboardEndpoint) return;

  const name = prompt("Enter your name for the leaderboard:", "")?.trim();
  if (!name) return;

  try {
    const response = await fetch(leaderboardEndpoint, {
      method: "POST",
      body: JSON.stringify({
        name: name.slice(0, 20),
        score: Math.max(0, Math.floor(finalScore)),
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await loadLeaderboard();
  } catch (error) {
    console.error("Could not submit leaderboard score", error);
  }
}

function renderLeaderboard(scores) {
  leaderboardList.replaceChildren();

  if (!scores.length) {
    leaderboardStatus.textContent = "No scores yet. Be the first one in.";
    return;
  }

  leaderboardStatus.textContent = "Top 10 all-time scores";
  scores.forEach((entry, index) => {
    const row = document.createElement("li");
    row.className =
      index < 3 ? `leaderboard-row rank-${index + 1}` : "leaderboard-row";

    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = `${index + 1}.`;

    const name = document.createElement("span");
    name.className = "leaderboard-name";
    name.textContent = entry.name;

    const scoreValue = document.createElement("strong");
    scoreValue.className = "leaderboard-score";
    scoreValue.textContent = `score: ${entry.score}`;

    row.append(rank, name, scoreValue);
    leaderboardList.append(row);
  });
}

async function loadLeaderboard() {
  if (!leaderboardEndpoint) return;

  leaderboardStatus.textContent = "Loading the rage board...";
  try {
    const response = await fetch(leaderboardEndpoint, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    if (!result.ok || !Array.isArray(result.scores)) {
      throw new Error("Invalid leaderboard response");
    }

    renderLeaderboard(result.scores);
  } catch (error) {
    leaderboardStatus.textContent = "Leaderboard unavailable right now.";
    console.error("Could not load leaderboard", error);
  }
}

function endGame() {
  if (state !== "playing") return;
  state = "over";
  best = Math.max(best, score);
  localStorage.setItem("wing-it-best", best);
  updateScore();
  finalScoreLabel.textContent = score;
  gameOverOverlay.hidden = false;
  submitScore(score);
}

function update(delta) {
  if (state !== "playing") return;
  const step = Math.min(delta / 16.67, 2);
  bird.velocity += settings.gravity * step;
  bird.y += bird.velocity * step;
  bird.rotation = Math.min(Math.PI / 2, Math.max(-0.45, bird.velocity * 0.08));
  pipeTimer += delta;
  if (pipeTimer > 1500) {
    pipeTimer = 0;
    addPipe();
  }
  pipes.forEach((pipe) => {
    pipe.x -= settings.pipeSpeed * step;
    if (!pipe.counted && pipe.x + settings.pipeWidth < bird.x) {
      pipe.counted = true;
      score += 1;
      updateScore();
    }
    if (collidesPipe(pipe)) endGame();
  });
  pipes = pipes.filter((pipe) => pipe.x > -settings.pipeWidth - 10);
  if (bird.y - bird.radius < 0 || bird.y + bird.radius > world.ground)
    endGame();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, world.height);
  sky.addColorStop(0, "#e36b3d");
  sky.addColorStop(1, "#f5c36b");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, world.width, world.height);
  ctx.fillStyle = "rgba(255,255,255,.42)";
  for (let x = -40; x < world.width + 100; x += 210) {
    const y = 85 + ((x * 7) % 100);
    ctx.beginPath();
    ctx.arc(x, y, 27, Math.PI, 0);
    ctx.arc(x + 30, y, 34, Math.PI, 0);
    ctx.arc(x + 69, y, 24, Math.PI, 0);
    ctx.fill();
  }
  ctx.fillStyle = "#7f9b54";
  ctx.beginPath();
  ctx.moveTo(0, world.ground);
  for (let x = 0; x <= world.width; x += 55)
    ctx.lineTo(x, world.ground - 30 - Math.sin(x * 0.025) * 24);
  ctx.lineTo(world.width, world.height);
  ctx.lineTo(0, world.height);
  ctx.fill();
  ctx.fillStyle = "#d49b3d";
  ctx.fillRect(0, world.ground, world.width, world.height - world.ground);
  ctx.fillStyle = "#4f6039";
  ctx.fillRect(0, world.ground, world.width, 8);
}

function drawPipe(x, y, height, top) {
  ctx.fillStyle = "#6f3025";
  ctx.fillRect(x, y, settings.pipeWidth, height);
  ctx.fillStyle = "#c4532f";
  ctx.fillRect(x + 10, y, 16, height);
  ctx.fillStyle = "#3e1f1c";
  ctx.fillRect(x + settings.pipeWidth - 10, y, 10, height);
  ctx.fillStyle = "#9c3f2c";
  ctx.fillRect(x - 8, top ? y + height - 20 : y, settings.pipeWidth + 16, 20);
}

function drawPipes() {
  pipes.forEach((pipe) => {
    drawPipe(pipe.x, 0, pipe.gapTop, true);
    drawPipe(
      pipe.x,
      pipe.gapTop + settings.gap,
      world.ground - pipe.gapTop - settings.gap,
      false,
    );
  });
}

function drawBird() {
  const width = 40;
  const height = 74;
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);
  ctx.drawImage(birdImage, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, world.width, world.height);
  drawBackground();
  drawPipes();
  drawBird();
}

function loop(time) {
  const delta = Math.min(time - lastTime || 16.67, 40);
  lastTime = time;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

function handleInput(event) {
  if (event) event.preventDefault();
  if (state === "over") {
    resetGame();
    startGame();
    return;
  }
  flap();
}

document.querySelector("#startButton").addEventListener("click", handleInput);
document.querySelector("#restartButton").addEventListener("click", handleInput);
canvas.addEventListener("pointerdown", handleInput);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") handleInput(event);
});
muteButton.addEventListener("click", () => {
  muted = !muted;
  muteButton.textContent = muted ? "SOUND OFF" : "SOUND ON";
  muteButton.setAttribute("aria-pressed", String(muted));
});

resetGame();
loadLeaderboard();
requestAnimationFrame(loop);
