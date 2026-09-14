const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const scoreLabel = document.querySelector("#score");
const statusLabel = document.querySelector("#statusText");
const message = document.querySelector("#gameMessage");
const finalScore = document.querySelector("#finalScore");
const keys = {};

const mapTemplates = [
  [
    "SKOGEN",
    "#9bd1d1",
    1920,
    [480, 220, 210, 260, 220, 220],
    [330, 670, 950, 1170, 1280, 1510, 1790],
  ],
  [
    "SKÄRGÅRDEN",
    "#83c9df",
    2040,
    [330, 190, 180, 180, 180, 190, 320],
    [275, 500, 760, 1010, 1260, 1530, 1870],
  ],
  [
    "NATTÅGET",
    "#425a79",
    2160,
    [390, 170, 180, 220, 170, 190, 330],
    [330, 540, 785, 1060, 1160, 1600, 1950],
  ],
  [
    "FJÄLLEN",
    "#b6d5df",
    2280,
    [300, 160, 170, 210, 170, 180, 180, 280],
    [250, 450, 690, 970, 1215, 1480, 1760],
  ],
  [
    "FIKAFORTET",
    "#e6b9a8",
    2400,
    [360, 150, 150, 150, 190, 170, 190, 180, 220],
    [300, 490, 720, 950, 1190, 1480, 1720, 1990],
  ],
];
const maps = mapTemplates.map(([name, sky, width, widths, bunXs], mapIndex) => {
  const starts = [
    0,
    ...widths
      .slice(0, -1)
      .reduce(
        (positions, current, index) => [
          ...positions,
          positions[index] + current + 90,
        ],
        [],
      ),
  ];
  const platforms = starts.map((x, index) => ({
    x,
    y: index % 3 === 0 ? 478 : 350 + ((index * 37) % 100),
    w: widths[index],
    h: index % 3 === 0 ? 62 : 24,
  }));
  return {
    name,
    sky,
    width,
    platforms,
    buns: bunXs.map((x, index) => ({
      x,
      y: platforms[Math.min(index, platforms.length - 1)].y - 42,
    })),
    hazards: starts
      .slice(1, -1)
      .filter((x, index) => index % 2 === mapIndex % 2)
      .map((x, index) => ({
        x: x - 40,
        y: platforms[index + 1].y - 22,
        w: 60,
      })),
  };
});

maps[0].platforms = [
  { x: 0, y: 478, w: 430, h: 62 },
  { x: 510, y: 408, w: 210, h: 24 },
  { x: 800, y: 344, w: 190, h: 24 },
  { x: 1070, y: 414, w: 190, h: 24 },
  { x: 1340, y: 326, w: 190, h: 24 },
  { x: 1610, y: 396, w: 220, h: 24 },
  { x: 1880, y: 478, w: 40, h: 62 },
];
maps[0].buns = [
  { x: 330, y: 436 },
  { x: 620, y: 366 },
  { x: 900, y: 302 },
  { x: 1150, y: 372 },
  { x: 1435, y: 284 },
  { x: 1715, y: 354 },
  { x: 1895, y: 436 },
];

let mapIndex = 0;
let level = maps[mapIndex];
let player;
let camera = 0;
let collected = 0;
let running = true;
let lastTime = 0;
const mapLabel = document.querySelector("#mapLabel");
const briefingNumber = document.querySelector("#briefingNumber");
const briefingText = document.querySelector("#briefingText");
const mapNav = document.querySelector("#mapNav");
function buildMapNav() {
  mapNav.innerHTML = maps
    .map(
      (map, index) =>
        `<button type="button" data-map="${index}" class="${index === mapIndex ? "active" : ""}">${String(index + 1).padStart(2, "0")} ${map.name}</button>`,
    )
    .join("");
  mapNav.querySelectorAll("button").forEach((button) =>
    button.addEventListener("click", () => {
      mapIndex = Number(button.dataset.map);
      level = maps[mapIndex];
      reset();
    }),
  );
}
function reset() {
  level.buns.forEach((bun) => {
    bun.got = false;
  });
  player = {
    x: 70,
    y: 400,
    w: 28,
    h: 39,
    vx: 0,
    vy: 0,
    grounded: false,
    face: 1,
  };
  collected = 0;
  camera = 0;
  running = true;
  message.hidden = true;
  statusLabel.textContent = "KALLSTART";
  mapLabel.textContent = `${String(mapIndex + 1).padStart(2, "0")} / ${level.name}`;
  briefingNumber.textContent = String(mapIndex + 1).padStart(2, "0");
  briefingText.innerHTML = `Återför alla bullar<br />från ${level.name.toLowerCase()}.`;
  buildMapNav();
  updateScore();
}
function updateScore() {
  scoreLabel.textContent = String(collected * 150).padStart(4, "0");
}
function hit(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
function update(dt) {
  if (!running) return;
  const left = keys.ArrowLeft || keys.a;
  const right = keys.ArrowRight || keys.d;
  player.vx = (right ? 4.6 : 0) - (left ? 4.6 : 0);
  if (player.vx) player.face = Math.sign(player.vx);
  if ((keys.ArrowUp || keys.w || keys[" "]) && player.grounded) {
    player.vy = -11.5;
    player.grounded = false;
  }
  player.vy += 0.55;
  player.x += player.vx;
  player.y += player.vy;
  player.x = Math.max(0, Math.min(level.width - player.w, player.x));
  player.grounded = false;
  level.platforms.forEach((platform) => {
    if (
      player.vy >= 0 &&
      player.x + player.w > platform.x &&
      player.x < platform.x + platform.w &&
      player.y + player.h >= platform.y &&
      player.y + player.h - player.vy <= platform.y
    ) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.grounded = true;
    }
  });
  level.hazards.forEach((hazard) => {
    if (hit(player, { x: hazard.x, y: hazard.y, w: hazard.w, h: 22 })) fail();
  });
  level.buns.forEach((bun) => {
    if (
      !bun.got &&
      hit(player, { x: bun.x - 14, y: bun.y - 14, w: 28, h: 28 })
    ) {
      bun.got = true;
      collected++;
      updateScore();
      statusLabel.textContent = `${collected} / 7 SÄKRADE`;
    }
  });
  if (player.y > canvas.height + 80) fail();
  if (collected === level.buns.length && player.x > level.width - 100) win();
  camera +=
    (Math.max(
      0,
      Math.min(level.width - canvas.width, player.x - canvas.width * 0.38),
    ) -
      camera) *
    0.12;
}
function fail() {
  player.x = 70;
  player.y = 400;
  player.vy = 0;
  statusLabel.textContent = "FÖRSÖK IGEN";
}
function win() {
  running = false;
  finalScore.textContent = scoreLabel.textContent;
  message.hidden = false;
  statusLabel.textContent = "UPPDRAG KLART";
  document.querySelector("#playAgain").innerHTML =
    mapIndex < maps.length - 1
      ? "NÄSTA KARTA <span>→</span>"
      : "BÖRJA OM FRÅN KARTA 1 <span>↻</span>";
}
function nextMap() {
  mapIndex = (mapIndex + 1) % maps.length;
  level = maps[mapIndex];
  reset();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(-camera, 0);
  ctx.fillStyle = "#9bd1d1";
  ctx.fillRect(camera, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#b9dcdc";
  for (let x = -100; x < level.width + 100; x += 170) {
    ctx.beginPath();
    ctx.arc(x, 170 + (x % 100), 88, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#e8f0de";
  for (let x = -100; x < level.width + 100; x += 260) {
    ctx.beginPath();
    ctx.moveTo(x, 478);
    ctx.lineTo(x + 120, 280);
    ctx.lineTo(x + 280, 478);
    ctx.fill();
  }
  level.platforms.forEach((platform) => {
    ctx.fillStyle = "#174d7c";
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = "#f4c748";
    ctx.fillRect(platform.x, platform.y, platform.w, 6);
    ctx.fillStyle = "rgba(255,255,255,.12)";
    for (let x = platform.x + 10; x < platform.x + platform.w; x += 22)
      ctx.fillRect(x, platform.y + 13, 2, platform.h - 17);
  });
  level.hazards.forEach((hazard) => {
    ctx.fillStyle = "#e14a3b";
    for (let x = hazard.x; x < hazard.x + hazard.w; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, hazard.y + 22);
      ctx.lineTo(x + 7, hazard.y);
      ctx.lineTo(x + 14, hazard.y + 22);
      ctx.fill();
    }
  });
  level.buns.forEach((bun) => {
    if (bun.got) return;
    ctx.save();
    ctx.translate(bun.x, bun.y);
    ctx.rotate(-0.15);
    ctx.fillStyle = "#f4c748";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e59c33";
    ctx.fillRect(-8, -2, 16, 3);
    ctx.fillRect(-6, 5, 12, 3);
    ctx.restore();
  });
  drawPlayer();
  drawFinish();
  ctx.restore();
}
function drawPlayer() {
  ctx.save();
  ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
  ctx.scale(player.face, 1);
  ctx.fillStyle = "#e14a3b";
  ctx.fillRect(-13, -19, 26, 10);
  ctx.fillStyle = "#f4c748";
  ctx.fillRect(-11, -9, 22, 22);
  ctx.fillStyle = "#10283b";
  ctx.fillRect(-9, 13, 7, 8);
  ctx.fillRect(3, 13, 7, 8);
  ctx.fillRect(2, -5, 4, 4);
  ctx.fillRect(-8, -5, 4, 4);
  ctx.restore();
}
function drawFinish() {
  const finishX = level.width - 80;
  ctx.fillStyle = "#10283b";
  ctx.fillRect(finishX, 390, 7, 88);
  ctx.fillStyle = "#f4c748";
  ctx.beginPath();
  ctx.moveTo(finishX + 7, 394);
  ctx.lineTo(finishX + 60, 410);
  ctx.lineTo(finishX + 7, 426);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "11px DM Mono";
  ctx.fillText("FIKA", finishX + 17, 414);
}
function loop(time) {
  const dt = Math.min((time - lastTime) / 16.67 || 1, 2);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  keys[event.key] = true;
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)
  )
    event.preventDefault();
});
window.addEventListener("keyup", (event) => {
  keys[event.key] = false;
});
document.querySelector("#resetButton").addEventListener("click", reset);
document.querySelector("#playAgain").addEventListener("click", nextMap);
canvas.addEventListener("pointerdown", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  if (x < rect.width * 0.35) keys.ArrowLeft = true;
  else if (x < rect.width * 0.67) keys.ArrowRight = true;
  else keys.ArrowUp = true;
});
canvas.addEventListener("pointerup", () => {
  keys.ArrowLeft = false;
  keys.ArrowRight = false;
  keys.ArrowUp = false;
});
reset();
requestAnimationFrame(loop);
