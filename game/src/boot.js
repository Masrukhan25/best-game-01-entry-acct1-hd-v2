// boot.js — VOIDLIGHT v2 entry point: canvas, input, the main loop, wave
// flow, collisions, bombs, pause, the upgrade screen and the debug hooks
// (?shot=title|play|boss|victory, ?wave=N, ?auto=strong|weak) that the
// playtest and the screenshots drive. Everything else lives in its own file.

import { clamp, rand } from './utils.js';
import { newRun, MODES, addScore, bumpCombo, tickCombo, banner } from './state.js';
import { AudioEngine } from './audio.js';
import { Background } from './background.js';
import { Particles } from './particles.js';
import { updateBullets, enemyHitBy } from './bullets.js';
import { newPlayer, updatePlayer, hurtPlayer, drawPlayer } from './player.js';
import { makeEnemy, makeMiniBoss, makeVoidSovereign } from './enemies.js';
import { waveSpec, bossForWave, waveTitle, isUpgradeWave, TOTAL_WAVES } from './levels.js';
import { maybeDrop, applyPowerup, updatePowerups, POWERUP_KINDS } from './powerups.js';
import { rollUpgrades, applyUpgrade } from './upgrades.js';
import { drawGame, drawTitle, drawUpgrade, drawPause, drawGameOver, drawVictory } from './render.js';

const W = 1280;
const H = 720;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const audio = new AudioEngine();
const bg = new Background();
const particles = new Particles();

let G = newRun();
let player = newPlayer();
G.player = player;

const input = {
  keys: new Set(),
  mouseX: 640,
  mouseY: 300,
  mouseDown: false,
};

/** Fit the 1280x720 canvas into the window, preserving aspect. */
function fit() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}
window.addEventListener('resize', fit);
fit();

// ---------------------------------------------------------------- input

window.addEventListener('keydown', (ev) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(ev.code)) ev.preventDefault();
  if (ev.repeat) return;
  input.keys.add(ev.code);
  audio.ensure();
  if (ev.code === 'KeyM') {
    audio.setMuted(!audio.muted);
    G.muted = audio.muted;
  }
  if (ev.code === 'KeyP' && G.mode === MODES.PLAYING) {
    G.mode = MODES.PAUSED;
  } else if (ev.code === 'KeyP' && G.mode === MODES.PAUSED) {
    G.mode = MODES.PLAYING;
  }
  if (ev.code === 'KeyR' && (G.mode === MODES.PLAYING || G.mode === MODES.OVER || G.mode === MODES.VICTORY || G.mode === MODES.PAUSED)) {
    startRun();
  }
  if (ev.code === 'Enter') {
    if (G.mode === MODES.TITLE) startRun();
    else if (G.mode === MODES.OVER || G.mode === MODES.VICTORY) startRun();
  }
  if (ev.code === 'ShiftLeft' || ev.code === 'ShiftRight') useBomb();
  if (G.mode === MODES.UPGRADE) {
    if (ev.code === 'Digit1') chooseUpgrade(0);
    if (ev.code === 'Digit2') chooseUpgrade(1);
    if (ev.code === 'Digit3') chooseUpgrade(2);
  }
});
window.addEventListener('keyup', (ev) => input.keys.delete(ev.code));

canvas.addEventListener('mousemove', (ev) => {
  const r = canvas.getBoundingClientRect();
  input.mouseX = ((ev.clientX - r.left) / r.width) * W;
  input.mouseY = ((ev.clientY - r.top) / r.height) * H;
});
canvas.addEventListener('mousedown', (ev) => {
  audio.ensure();
  if (ev.button === 2) {
    useBomb();
    return;
  }
  input.mouseDown = true;
  if (G.mode === MODES.TITLE) startRun();
  else if (G.mode === MODES.OVER || G.mode === MODES.VICTORY) startRun();
  else if (G.mode === MODES.PAUSED) G.mode = MODES.PLAYING;
  else if (G.mode === MODES.UPGRADE) {
    const idx = upgradeCardAt(input.mouseX, input.mouseY);
    if (idx >= 0) chooseUpgrade(idx);
  }
});
window.addEventListener('mouseup', () => {
  input.mouseDown = false;
});
canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());

// ---------------------------------------------------------------- run flow

/** Start a fresh run from the title screen. */
function startRun() {
  const best = G.best;
  const muted = G.muted;
  const auto = G.auto;
  const shot = G.shot;
  G = newRun();
  G.best = best;
  G.muted = muted;
  G.auto = auto;
  G.shot = shot;
  player = newPlayer();
  G.player = player;
  particles.clear();
  audio.ensure();
  audio.startMusic();
  G.mode = MODES.PLAYING;
  startWave(1);
}

/** Begin wave n: banner, spawn queue, and the boss if it is a boss wave. */
function startWave(n) {
  G.wave = n;
  G.waveState = 'spawning';
  G.spawnClock = 0;
  G.spawnQueue = waveSpec(n);
  banner(G, waveTitle(n), 2.4);
  const bossTier = bossForWave(n);
  if (bossTier === 4) {
    G.boss = makeVoidSovereign();
    G.bossIntro = 2.5;
    audio.sfx('boss');
  } else if (bossTier > 0) {
    G.boss = makeMiniBoss(bossTier, n);
    G.bossIntro = 2.5;
    audio.sfx('boss');
  } else {
    G.boss = null;
  }
}

/** The wave is clear when nothing is left to spawn or fight. */
function waveCleared() {
  return G.spawnQueue.length === 0 && G.enemies.length === 0 && !G.boss;
}

/** Handle a cleared wave: upgrade screen, next wave, or victory. */
function onWaveClear() {
  G.waveState = 'clear';
  G.waveTimer = 1.4;
  audio.sfx('waveClear');
  addScore(G, 250 * G.wave);
}

/** Pick an upgrade card (click or key). */
function chooseUpgrade(i) {
  const u = G.upgradeChoices[i];
  if (!u) return;
  if (applyUpgrade(player, u.id)) {
    G.upgradesTaken++;
    audio.sfx('upgrade');
    particles.text(player.x, player.y - 40, u.name, '#ffd166', 17);
  }
  G.upgradeChoices = [];
  G.mode = MODES.PLAYING;
  startWave(G.wave + 1);
}

/** Which upgrade card (if any) is under point (x, y). */
function upgradeCardAt(x, y) {
  const cards = G.upgradeChoices;
  if (cards.length === 0) return -1;
  const cw = 300;
  const ch = 210;
  const gap = 28;
  const total = cards.length * cw + (cards.length - 1) * gap;
  let cx = 640 - total / 2;
  const cy = 210;
  for (let i = 0; i < cards.length; i++) {
    if (x >= cx && x <= cx + cw && y >= cy && y <= cy + ch) return i;
    cx += cw + gap;
  }
  return -1;
}

/** Detonate a nova bomb: clears bullets, hurts everything on screen. */
function useBomb() {
  if (G.mode !== MODES.PLAYING || !player.alive || player.bombs <= 0) return;
  player.bombs--;
  G.bombsUsed++;
  for (const b of G.enemyBullets) particles.burst(b.x, b.y, '#ff8a5c', 2, 120, 2);
  G.enemyBullets.length = 0;
  for (const e of G.enemies) damageEnemy(e, 130);
  if (G.boss) damageEnemy(G.boss, 130);
  particles.shake(0.8);
  particles.burst(player.x, player.y, '#ff8a5c', 40, 500, 4);
  audio.sfx('bigExplode');
}

// ---------------------------------------------------------------- combat

/** Damage an enemy (or boss); handles death, score, drops and splitting. */
function damageEnemy(e, dmg) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flash = 1;
  G.damageDealt += dmg;
  if (e.hp > 0) return;
  e.dead = true;
  G.kills++;
  addScore(G, e.score);
  bumpCombo(G);
  particles.burst(e.x, e.y, '#ff5d7a', e.isBoss ? 60 : 16, e.isBoss ? 480 : 260, e.isBoss ? 4 : 3);
  particles.text(e.x, e.y - 10, `+${Math.round(e.score * G.combo)}`, '#9ff3ff', 14);
  audio.sfx(e.isBoss ? 'bigExplode' : 'explode');
  if (e.isBoss) {
    particles.shake(1);
    if (e.bossTier === 4) {
      // The Sovereign is dead: victory after a beat.
      G.boss = null;
      G.waveState = 'clear';
      G.waveTimer = 1.8;
      G.victoryPending = true;
    } else {
      G.boss = null;
    }
    return;
  }
  particles.shake(0.12);
  maybeDrop(G, e);
  if (e.kind === 'splitter') {
    for (let i = 0; i < 3; i++) {
      const m = makeEnemy('mite', e.x + rand(-24, 24), e.y + rand(-10, 10));
      G.enemies.push(m);
    }
  }
}

/** Resolve all collisions for one frame. */
function collide() {
  // Player bullets vs enemies and boss.
  for (let i = G.playerBullets.length - 1; i >= 0; i--) {
    const b = G.playerBullets[i];
    let hit = false;
    const e = enemyHitBy(G.enemies, b);
    if (e) {
      if (!b.hitSet) b.hitSet = new Set();
      if (!b.hitSet.has(e)) {
        b.hitSet.add(e);
        damageEnemy(e, b.damage);
        G.shotsHit++;
        particles.burst(b.x, b.y, '#8ef6ff', 4, 140, 2);
        audio.sfx('hit');
        if (b.pierce > 0) {
          b.pierce--;
        } else {
          hit = true;
        }
      }
    }
    if (!hit && G.boss && !G.boss.dead) {
      const bo = G.boss;
      const dx = b.x - bo.x;
      const dy = b.y - bo.y;
      if (dx * dx + dy * dy < (b.r + bo.r) * (b.r + bo.r)) {
        if (!b.hitSet) b.hitSet = new Set();
        if (!b.hitSet.has(bo)) {
          b.hitSet.add(bo);
          damageEnemy(bo, b.damage);
          G.shotsHit++;
          particles.burst(b.x, b.y, '#c792ff', 5, 160, 2);
          if (b.pierce > 0) b.pierce--;
          else hit = true;
        }
      }
    }
    if (hit) G.playerBullets.splice(i, 1);
  }
  // Enemy bullets vs player.
  if (player.alive) {
    for (let i = G.enemyBullets.length - 1; i >= 0; i--) {
      const b = G.enemyBullets[i];
      const dx = b.x - player.x;
      const dy = b.y - player.y;
      if (dx * dx + dy * dy < (b.r + player.r - 2) * (b.r + player.r - 2)) {
        G.enemyBullets.splice(i, 1);
        if (hurtPlayer(G, player, b.damage, audio, particles)) endRun(false);
      }
    }
    // Enemies ramming the player.
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      if (dx * dx + dy * dy < (e.r + player.r - 2) * (e.r + player.r - 2)) {
        damageEnemy(e, 25);
        if (hurtPlayer(G, player, 12, audio, particles)) endRun(false);
      }
    }
    // Power-up pickups.
    for (let i = G.powerups.length - 1; i >= 0; i--) {
      const p = G.powerups[i];
      const dx = p.x - player.x;
      const dy = p.y - player.y;
      if (dx * dx + dy * dy < (p.r + player.r + 6) * (p.r + player.r + 6)) {
        G.powerups.splice(i, 1);
        const label = applyPowerup(G, player, p.kind);
        particles.text(player.x, player.y - 34, label, POWERUP_KINDS[p.kind].color, 16);
        audio.sfx('powerup');
      }
    }
  }
}

/** End the run: victory (stats) or game over. */
function endRun(won) {
  if (won) {
    const acc = G.shotsFired > 0 ? Math.round((100 * G.shotsHit) / G.shotsFired) : 0;
    G.victoryStats = {
      score: G.score,
      kills: G.kills,
      maxCombo: G.maxCombo,
      acc,
      time: G.time,
      powerups: G.powerupsTaken,
      upgrades: G.upgradesTaken,
      damageDealt: G.damageDealt,
      damageTaken: G.damageTaken,
    };
    if (G.score > G.best) G.best = G.score;
    G.mode = MODES.VICTORY;
    audio.sfx('victory');
  } else {
    if (G.score > G.best) G.best = G.score;
    G.mode = MODES.OVER;
    audio.sfx('gameOver');
  }
}

// ---------------------------------------------------------------- autopilot

/** Debug autopilot for balance tests (?auto=strong plays well, ?auto=weak idles). */
function autopilot(dt) {
  if (G.auto === 'weak') {
    input.keys.clear();
    input.mouseDown = false;
    return;
  }
  if (G.auto !== 'strong') return;
  // Aim at the nearest enemy (or the boss).
  let target = G.boss;
  let bestD = target ? 0 : Infinity;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
    if (d < bestD) {
      bestD = d;
      target = e;
    }
  }
  if (target) {
    input.mouseX = target.x;
    input.mouseY = target.y;
  }
  input.mouseDown = true;
  // Dodge: find the closest threatening bullet and sidestep it.
  let mx = 0;
  let my = 0;
  let threat = null;
  let threatD = 170 * 170;
  for (const b of G.enemyBullets) {
    const d = (b.x - player.x) ** 2 + (b.y - player.y) ** 2;
    if (d < threatD && b.y > player.y - 160) {
      threatD = d;
      threat = b;
    }
  }
  if (threat) {
    mx = threat.x < player.x ? 1 : -1;
    my = threat.y < player.y ? 0.4 : -0.4;
    // Don't fly into the top wall while dodging.
    if (player.y < 140) my = 0.6;
  } else if (target) {
    // Drift under the target to line up shots, stay low-ish.
    mx = clamp((target.x - player.x) / 120, -1, 1);
    my = clamp((560 - player.y) / 120, -1, 1);
  }
  input.keys.clear();
  if (mx < -0.15) input.keys.add('KeyA');
  if (mx > 0.15) input.keys.add('KeyD');
  if (my < -0.15) input.keys.add('KeyW');
  if (my > 0.15) input.keys.add('KeyS');
  // Bomb out of a bullet storm at low hull.
  if (player.hp < 35 && G.enemyBullets.length > 24 && player.bombs > 0) useBomb();
}

// ---------------------------------------------------------------- debug states

/** Jump straight to a screenshot state (?shot=title|play|boss|victory). */
function applyShotState() {
  const shot = G.shot;
  if (!shot) return;
  if (shot === 'title') {
    G.mode = MODES.TITLE;
    return;
  }
  if (shot === 'play') {
    startRun();
    // Stage a busy mid-game: wave 5, score, combo, enemies, bullets.
    G.wave = 5;
    G.score = 45200;
    G.displayScore = 45200;
    G.combo = 6;
    G.maxCombo = 6;
    G.comboTimer = 3;
    G.kills = 87;
    player.hp = 78;
    player.shield = 30;
    player.bombs = 2;
    player.drones.push({ angle: 0, cooldown: 0, x: player.x + 46, y: player.y });
    G.drones = 1;
    const kinds = ['weaver', 'spinner', 'tank', 'darter', 'orbiter', 'drifter', 'sniper', 'charger'];
    kinds.forEach((k, i) => {
      const e = makeEnemy(k, 180 + i * 130, 120 + (i % 3) * 90);
      G.enemies.push(e);
    });
    G.enemies.push(makeEnemy('tank', 640, 180, true));
    G.message = '';
    G.messageTimer = 0;
    return;
  }
  if (shot === 'boss') {
    startRun();
    G.wave = 21;
    G.score = 128400;
    G.displayScore = 128400;
    G.combo = 8;
    G.maxCombo = 8;
    G.kills = 312;
    player.hp = 64;
    player.shield = 20;
    player.bombs = 1;
    G.boss = makeVoidSovereign();
    G.boss.y = -140;
    G.boss.hp = G.boss.maxHp * 0.55;
    G.boss.phase = 2;
    G.enemies.push(makeEnemy('darter', 300, 200));
    G.enemies.push(makeEnemy('weaver', 980, 220));
    G.message = 'VOID SOVEREIGN — PHASE 2';
    G.messageTimer = 5;
    return;
  }
  if (shot === 'victory') {
    startRun();
    G.victoryStats = {
      score: 214800, kills: 486, maxCombo: 8, acc: 71, time: 742,
      powerups: 23, upgrades: 6, damageDealt: 48210, damageTaken: 3120,
    };
    G.score = 214800;
    G.displayScore = 214800;
    G.best = 214800;
    G.wave = 21;
    G.kills = 486;
    G.mode = MODES.VICTORY;
  }
}

// ---------------------------------------------------------------- main loop

let last = performance.now();
let titleDecor = [];

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt <= 0) return;

  // Title backdrop drift.
  if (G.mode === MODES.TITLE) {
    G.titleTime += dt;
    bg.update(dt, 0.5);
    for (const d of titleDecor) {
      d.y += 26 * dt;
      d.x += Math.sin(d.t * 1.4) * 20 * dt;
      d.t += dt;
      if (d.y > 760) {
        d.y = -30;
        d.x = rand(40, 1240);
      }
    }
  }

  if (G.mode === MODES.PLAYING) {
    G.time += dt;
    G.titleTime += dt;
    autopilot(dt);
    // Spawning.
    if (G.waveState === 'spawning' || G.waveState === 'fighting') {
      G.spawnClock += dt;
      while (G.spawnQueue.length > 0 && G.spawnQueue[0].at <= G.spawnClock) {
        const s = G.spawnQueue.shift();
        G.enemies.push(makeEnemy(s.kind, s.x, -30, s.elite));
      }
      if (G.spawnQueue.length === 0) G.waveState = 'fighting';
    }
    // Wave clear.
    if ((G.waveState === 'fighting' || G.waveState === 'spawning') && waveCleared()) {
      onWaveClear();
    }
    if (G.waveState === 'clear') {
      G.waveTimer -= dt;
      if (G.waveTimer <= 0) {
        if (G.victoryPending) {
          G.victoryPending = false;
          endRun(true);
        } else if (G.wave >= TOTAL_WAVES) {
          endRun(true);
        } else if (isUpgradeWave(G.wave)) {
          G.upgradeChoices = rollUpgrades(player);
          G.upgradeCursor = 0;
          G.mode = MODES.UPGRADE;
        } else {
          startWave(G.wave + 1);
        }
      }
    }
    // Entities.
    if (player.alive) updatePlayer(G, player, input, dt, audio, particles);
    for (const e of G.enemies) e.update(dt, G);
    if (G.boss) G.boss.update(dt, G);
    updateBullets(G, dt);
    updatePowerups(G, player, dt);
    particles.update(dt);
    bg.update(dt, 1);
    collide();
    // Sweep the dead.
    for (let i = G.enemies.length - 1; i >= 0; i--) {
      if (G.enemies[i].dead) G.enemies.splice(i, 1);
    }
    tickCombo(G, dt);
    G.displayScore += (G.score - G.displayScore) * Math.min(1, dt * 8);
    if (G.messageTimer > 0) G.messageTimer -= dt;
    if (G.bossIntro > 0) G.bossIntro -= dt;
  } else if (G.mode === MODES.UPGRADE || G.mode === MODES.PAUSED || G.mode === MODES.OVER || G.mode === MODES.VICTORY) {
    G.titleTime += dt;
    particles.update(dt);
    bg.update(dt, 0.3);
  }

  // ---- draw ----
  ctx.save();
  const off = particles.offset();
  ctx.translate(off.x, off.y);
  if (G.mode === MODES.TITLE) {
    bg.draw(ctx, G.titleTime);
    for (const d of titleDecor) d.draw(ctx);
    particles.draw(ctx);
    drawTitle(ctx, G, G.titleTime);
  } else if (G.mode === MODES.UPGRADE) {
    drawGame(ctx, G, bg, particles, player, G.titleTime);
    drawUpgrade(ctx, G);
  } else if (G.mode === MODES.PAUSED) {
    drawGame(ctx, G, bg, particles, player, G.titleTime);
    drawPause(ctx);
  } else if (G.mode === MODES.OVER) {
    drawGame(ctx, G, bg, particles, player, G.titleTime);
    drawGameOver(ctx, G);
  } else if (G.mode === MODES.VICTORY) {
    drawGame(ctx, G, bg, particles, player, G.titleTime);
    drawVictory(ctx, G);
  } else {
    drawGame(ctx, G, bg, particles, player, G.titleTime);
  }
  ctx.restore();
}

// Title decorations: a few harmless drifters floating behind the logo.
for (let i = 0; i < 6; i++) {
  const d = makeEnemy(['drifter', 'weaver', 'mite'][i % 3], rand(60, 1220), rand(0, 700));
  titleDecor.push(d);
}

// Debug hooks from the URL: ?shot=, ?wave=N, ?auto=strong|weak.
const params = new URLSearchParams(window.location.search);
G.auto = params.get('auto');
G.shot = params.get('shot');
const startWaveParam = parseInt(params.get('wave') || '', 10);
if (G.shot) {
  applyShotState();
} else if (!Number.isNaN(startWaveParam) && startWaveParam >= 1 && startWaveParam <= TOTAL_WAVES) {
  startRun();
  G.wave = 0;
  startWave(startWaveParam);
}

// Expose the run for playtests and screenshots.
window.VL = { get G() { return G; }, get player() { return player; }, startRun, MODES };
requestAnimationFrame(frame);
