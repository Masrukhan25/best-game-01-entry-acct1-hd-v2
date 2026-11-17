// bullets.js — player and enemy projectiles.
// Two plain arrays on the run state; this file owns spawning, movement,
// culling and the circle tests the loop uses for hits.

import { circlesHit } from './utils.js';

/** Fire one player bullet from (x, y) along angle `a` (radians). */
export function firePlayerBullet(G, x, y, a, opts = {}) {
  const speed = opts.speed ?? 760;
  G.playerBullets.push({
    x, y,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    r: opts.r ?? 5,
    damage: opts.damage ?? 10,
    pierce: opts.pierce ?? 0,
    color: opts.color ?? '#8ef6ff',
    life: 1.6,
  });
}

/** Fire one enemy bullet from (x, y) along angle `a`. */
export function fireEnemyBullet(G, x, y, a, opts = {}) {
  const speed = opts.speed ?? 230;
  G.enemyBullets.push({
    x, y,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    r: opts.r ?? 6,
    damage: opts.damage ?? 8,
    color: opts.color ?? '#ff5d7a',
    life: 6,
    spin: opts.spin ?? 0, // radial drift for spiral patterns
  });
}

/** A ring of enemy bullets around (x, y). */
export function bulletRing(G, x, y, n, speed, offset = 0, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = offset + (i / n) * Math.PI * 2;
    fireEnemyBullet(G, x, y, a, { speed, ...opts });
  }
}

/** A fan of enemy bullets aimed at angle `a` (spread in radians). */
export function bulletFan(G, x, y, a, n, spread, speed, opts = {}) {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * spread;
    fireEnemyBullet(G, x, y, a + t, { speed, ...opts });
  }
}

/** Move all bullets, apply spiral drift, cull the dead and off-screen. */
export function updateBullets(G, dt) {
  const W = 1280;
  const H = 720;
  for (let i = G.playerBullets.length - 1; i >= 0; i--) {
    const b = G.playerBullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) {
      G.playerBullets.splice(i, 1);
    }
  }
  for (let i = G.enemyBullets.length - 1; i >= 0; i--) {
    const b = G.enemyBullets[i];
    b.life -= dt;
    if (b.spin !== 0) {
      const a = Math.atan2(b.vy, b.vx) + b.spin * dt;
      const s = Math.hypot(b.vx, b.vy);
      b.vx = Math.cos(a) * s;
      b.vy = Math.sin(a) * s;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
      G.enemyBullets.splice(i, 1);
    }
  }
}

/** Draw both bullet pools as glowing orbs. */
export function drawBullets(ctx, G) {
  ctx.globalCompositeOperation = 'lighter';
  for (const b of G.playerBullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const b of G.enemyBullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = 'source-over';
}

/** First enemy whose circle overlaps bullet b (or null). */
export function enemyHitBy(enemies, b) {
  for (const e of enemies) {
    if (e.dead) continue;
    if (circlesHit(b.x, b.y, b.r, e.x, e.y, e.r)) return e;
  }
  return null;
}
