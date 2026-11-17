// player.js — the player's ship, its weapons and its wingman drones.
// Movement is WASD/arrows plus mouse aim; firing is mouse hold or Space.
// The ship banks into turns, flashes when hurt, and leaves an engine trail.

import { clamp, TAU, angleTo } from './utils.js';
import { firePlayerBullet } from './bullets.js';

/** A fresh player at the bottom centre of the arena. */
export function newPlayer() {
  return {
    x: 640,
    y: 600,
    vx: 0,
    vy: 0,
    r: 16,
    hp: 100,
    maxHp: 100,
    shield: 0,
    maxShield: 50,
    regen: 0,
    bombs: 1,
    speed: 420,
    speedMul: 1,
    damageMul: 1,
    fireRateMul: 1,
    shots: 1,
    pierce: 0,
    magnet: 110,
    fireCooldown: 0,
    invuln: 0, // seconds of post-hit invulnerability
    hurtFlash: 0,
    bank: 0, // visual banking angle
    drones: [], // { angle, cooldown }
    timers: { rapid: 0, spread: 0, overdrive: 0 },
    upgrades: {},
    trailTimer: 0,
    alive: true,
  };
}

/** Read the current input into a move vector (WASD + arrows). */
function moveInput(input) {
  let mx = 0;
  let my = 0;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) mx -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) mx += 1;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) my -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) my += 1;
  if (mx !== 0 && my !== 0) {
    mx *= 0.7071;
    my *= 0.7071;
  }
  return { mx, my };
}

/** Update the player: move, fire, drones, timers, regen. */
export function updatePlayer(G, player, input, dt, audio, particles) {
  const { mx, my } = moveInput(input);
  const speed = player.speed * player.speedMul;
  player.vx = mx * speed;
  player.vy = my * speed;
  player.x = clamp(player.x + player.vx * dt, 24, 1256);
  player.y = clamp(player.y + player.vy * dt, 24, 696);
  player.bank = clamp(mx * 0.45, -0.45, 0.45);

  player.invuln = Math.max(0, player.invuln - dt);
  player.hurtFlash = Math.max(0, player.hurtFlash - dt * 3);
  player.fireCooldown -= dt;
  if (player.regen > 0) player.hp = Math.min(player.maxHp, player.hp + player.regen * dt);
  for (const k of ['rapid', 'spread', 'overdrive']) {
    player.timers[k] = Math.max(0, player.timers[k] - dt);
  }

  // Engine trail.
  player.trailTimer -= dt;
  if (player.trailTimer <= 0 && (mx !== 0 || my !== 0)) {
    player.trailTimer = 0.05;
    particles.trail(player.x, player.y + 16, '#37c8ff');
  }

  // Fire toward the mouse (or straight up when the mouse never moved).
  const firing = input.mouseDown || input.keys.has('Space');
  const aimX = input.mouseX ?? player.x;
  const aimY = input.mouseY ?? player.y - 200;
  if (firing && player.fireCooldown <= 0) {
    firePlayerWeapon(G, player, aimX, aimY, audio);
  }

  // Wingman drones orbit and auto-fire at the nearest enemy.
  for (const d of player.drones) {
    d.angle += dt * 2.4;
    d.cooldown -= dt;
    const dx = player.x + Math.cos(d.angle) * 46;
    const dy = player.y + Math.sin(d.angle) * 46;
    d.x = dx;
    d.y = dy;
    if (d.cooldown <= 0 && G.enemies.length > 0) {
      let best = null;
      let bestD = Infinity;
      for (const e of G.enemies) {
        if (e.dead) continue;
        const dd = (e.x - dx) * (e.x - dx) + (e.y - dy) * (e.y - dy);
        if (dd < bestD) {
          bestD = dd;
          best = e;
        }
      }
      if (best && bestD < 520 * 520) {
        d.cooldown = 0.42;
        const a = angleTo(dx, dy, best.x, best.y);
        firePlayerBullet(G, dx, dy, a, { damage: 7 * player.damageMul, speed: 700, r: 4, color: '#c792ff' });
        G.shotsFired++;
      }
    }
  }
}

/** One volley from the player's weapons. */
export function firePlayerWeapon(G, player, aimX, aimY, audio) {
  const rapid = player.timers.rapid > 0 ? 0.55 : 1;
  const over = player.timers.overdrive > 0;
  player.fireCooldown = (0.16 / player.fireRateMul) * rapid * (over ? 0.7 : 1);
  const baseAngle = angleTo(player.x, player.y, aimX, aimY);
  const shots = player.shots + (player.timers.spread > 0 ? 2 : 0);
  const spreadStep = 0.14;
  for (let i = 0; i < shots; i++) {
    const off = (i - (shots - 1) / 2) * spreadStep;
    firePlayerBullet(G, player.x, player.y - 12, baseAngle + off, {
      damage: 10 * player.damageMul * (over ? 2 : 1),
      pierce: player.pierce,
      speed: 780,
      color: over ? '#ff9d5c' : '#8ef6ff',
    });
  }
  G.shotsFired += shots;
  if (audio) audio.sfx('shoot');
}

/** Damage the player (shield absorbs first); returns true if the ship died. */
export function hurtPlayer(G, player, dmg, audio, particles) {
  if (player.invuln > 0 || !player.alive) return false;
  let rest = dmg;
  if (player.shield > 0) {
    const absorbed = Math.min(player.shield, rest);
    player.shield -= absorbed;
    rest -= absorbed;
  }
  player.hp -= rest;
  G.damageTaken += dmg;
  player.invuln = 0.9;
  player.hurtFlash = 1;
  particles.shake(0.45);
  particles.burst(player.x, player.y, '#ff5d7a', 14, 220);
  if (audio) audio.sfx('hurt');
  if (player.hp <= 0) {
    player.hp = 0;
    player.alive = false;
    particles.burst(player.x, player.y, '#8ef6ff', 46, 420, 4);
    particles.burst(player.x, player.y, '#ff5d7a', 30, 300, 3);
    particles.shake(1);
    if (audio) audio.sfx('bigExplode');
    return true;
  }
  return false;
}

/** Draw the ship, its shield ring, drones and engine glow. */
export function drawPlayer(ctx, player, time) {
  if (!player.alive) return;
  const blink = player.invuln > 0 && Math.floor(time * 14) % 2 === 0;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.bank);
  if (blink) ctx.globalAlpha = 0.35;
  // Engine glow.
  ctx.globalCompositeOperation = 'lighter';
  const flick = 10 + Math.sin(time * 31) * 4;
  const eg = ctx.createRadialGradient(0, 18, 0, 0, 18, flick + 8);
  eg.addColorStop(0, 'rgba(120,220,255,0.9)');
  eg.addColorStop(1, 'rgba(120,220,255,0)');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.arc(0, 18, flick + 8, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // Hull: neon dart.
  ctx.shadowColor = '#37c8ff';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#0e2a4a';
  ctx.strokeStyle = '#8ef6ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(13, 12);
  ctx.lineTo(5, 8);
  ctx.lineTo(0, 13);
  ctx.lineTo(-5, 8);
  ctx.lineTo(-13, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Cockpit.
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#bff3ff';
  ctx.beginPath();
  ctx.arc(0, -6, 4, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Shield ring.
  if (player.shield > 0) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.2 * Math.sin(time * 5);
    ctx.strokeStyle = '#8ef6ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 26, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // Drones.
  for (const d of player.drones) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.shadowColor = '#c792ff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#2a1650';
    ctx.strokeStyle = '#c792ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}
