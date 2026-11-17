// enemies.js — the ten enemy kinds, the three mini-bosses and the final boss.
// Every enemy is an object with update(dt, G) and draw(ctx); the loop in
// boot.js owns spawning, bullets and death. Bosses cycle attack patterns
// and change phase as their hull falls.

import { clamp, rand, TAU, angleTo, angleDelta } from './utils.js';
import { fireEnemyBullet, bulletRing, bulletFan } from './bullets.js';

/** Base stats per kind: hull, radius, score, elite multiplier. */
export const ENEMY_STATS = {
  drifter: { hp: 20, r: 16, score: 50 },
  darter: { hp: 14, r: 13, score: 60 },
  weaver: { hp: 26, r: 15, score: 80 },
  spinner: { hp: 40, r: 18, score: 120 },
  tank: { hp: 90, r: 24, score: 150 },
  splitter: { hp: 30, r: 17, score: 100 },
  mite: { hp: 8, r: 9, score: 30 },
  sniper: { hp: 30, r: 15, score: 110 },
  charger: { hp: 34, r: 16, score: 110 },
  orbiter: { hp: 36, r: 16, score: 120 },
};

/** The ten kinds, in unlock order. */
export const ENEMY_KINDS = Object.keys(ENEMY_STATS);

/** Make one enemy of `kind` at (x, y). `elite` doubles hull and score. */
export function makeEnemy(kind, x, y, elite = false) {
  const s = ENEMY_STATS[kind];
  const e = {
    kind,
    x, y,
    vx: 0, vy: 0,
    hp: s.hp * (elite ? 2.2 : 1),
    maxHp: s.hp * (elite ? 2.2 : 1),
    r: s.r * (elite ? 1.15 : 1),
    score: s.score * (elite ? 2 : 1),
    tier: elite ? 1 : 0,
    t: 0,
    fireTimer: rand(1.2, 2.4),
    seed: rand(0, TAU),
    flash: 0, // white hit flash
    dead: false,
    anchorX: x,
    anchorY: y,
    chargeState: 0, // charger: 0 drift, 1 telegraph, 2 charging
    chargeTimer: 0,
  };
  e.update = (dt, G) => updateEnemy(e, dt, G);
  e.draw = (ctx) => drawEnemy(ctx, e);
  return e;
}

/** Per-kind movement and firing. */
function updateEnemy(e, dt, G) {
  e.t += dt;
  e.flash = Math.max(0, e.flash - dt * 6);
  const p = G.player;
  const speedScale = 1 + G.wave * 0.02;
  switch (e.kind) {
    case 'drifter':
      e.y += 66 * speedScale * dt;
      e.x += Math.sin(e.t * 2.1 + e.seed) * 46 * dt;
      break;
    case 'darter': {
      const targetX = p ? p.x : e.x;
      if (e.y < 130) {
        e.y += 120 * dt;
        e.x += clamp(targetX - e.x, -160 * dt, 160 * dt);
      } else {
        e.y += 330 * speedScale * dt;
      }
      break;
    }
    case 'weaver':
      e.y += 84 * speedScale * dt;
      e.x = e.anchorX + Math.sin(e.t * 2.6 + e.seed) * 150;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && p && p.alive && e.y < 480) {
        e.fireTimer = 2.3;
        fireEnemyBullet(G, e.x, e.y + 10, angleTo(e.x, e.y, p.x, p.y), { speed: 250 });
      }
      break;
    case 'spinner':
      e.y += 52 * speedScale * dt;
      e.x = e.anchorX + Math.sin(e.t * 1.1 + e.seed) * 60;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.y > 40 && e.y < 460) {
        e.fireTimer = 2.8;
        bulletRing(G, e.x, e.y, 8, 150, e.t);
      }
      break;
    case 'tank':
      e.y += 34 * speedScale * dt;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && p && p.alive && e.y < 420) {
        e.fireTimer = 2.6;
        bulletFan(G, e.x, e.y + 14, angleTo(e.x, e.y, p.x, p.y), 3, 0.5, 210);
      }
      break;
    case 'splitter':
      e.y += 74 * speedScale * dt;
      e.x += Math.sin(e.t * 3.2 + e.seed) * 70 * dt;
      break;
    case 'mite':
      e.y += 210 * speedScale * dt;
      e.x += Math.sin(e.t * 6 + e.seed) * 130 * dt;
      break;
    case 'sniper':
      if (e.y < 90) e.y += 90 * dt;
      else {
        e.x += Math.sin(e.t * 0.9 + e.seed) * 40 * dt;
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && p && p.alive) {
          e.fireTimer = 3.1;
          fireEnemyBullet(G, e.x, e.y + 10, angleTo(e.x, e.y, p.x, p.y), { speed: 420, r: 5, color: '#ffe066' });
        }
      }
      break;
    case 'charger':
      if (e.chargeState === 0) {
        e.y += 60 * dt;
        if (e.y > 110) {
          e.chargeState = 1;
          e.chargeTimer = 0.7;
        }
      } else if (e.chargeState === 1) {
        e.chargeTimer -= dt;
        if (e.chargeTimer <= 0 && p) {
          e.chargeState = 2;
          const a = angleTo(e.x, e.y, p.x, p.y);
          e.vx = Math.cos(a) * 560;
          e.vy = Math.sin(a) * 560;
        }
      } else {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      }
      break;
    case 'orbiter': {
      e.t += dt * 0; // t already advanced
      const cx = e.anchorX;
      const cy = Math.min(200, e.anchorY + e.t * 26);
      e.x = cx + Math.cos(e.t * 1.4 + e.seed) * 120;
      e.y = cy + Math.sin(e.t * 1.4 + e.seed) * 46;
      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.y > 40) {
        e.fireTimer = 2.4;
        bulletRing(G, e.x, e.y, 6, 140, e.t * 0.5);
      }
      break;
    }
    default:
      e.y += 60 * dt;
      break;
  }
  if (e.y > 760 || e.x < -60 || e.x > 1340) e.dead = true; // left the arena
}

/** Neon shape per kind, with a hit flash and an elite gold ring. */
function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const flash = e.flash > 0.5;
  ctx.shadowBlur = 12;
  switch (e.kind) {
    case 'drifter':
      ctx.shadowColor = '#ff5d7a';
      ctx.strokeStyle = flash ? '#ffffff' : '#ff5d7a';
      ctx.fillStyle = '#3d0a1e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(13, -10);
      ctx.lineTo(0, -4);
      ctx.lineTo(-13, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'darter':
      ctx.shadowColor = '#ffb347';
      ctx.strokeStyle = flash ? '#ffffff' : '#ffb347';
      ctx.fillStyle = '#3d240a';
      ctx.lineWidth = 2;
      ctx.rotate(Math.atan2(e.vy, e.vx) + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(10, 10);
      ctx.lineTo(0, 4);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'weaver':
      ctx.shadowColor = '#c792ff';
      ctx.strokeStyle = flash ? '#ffffff' : '#c792ff';
      ctx.fillStyle = '#241040';
      ctx.lineWidth = 2;
      ctx.rotate(e.t * 1.5);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        const px = Math.cos(a) * 15;
        const py = Math.sin(a) * 15;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'spinner':
      ctx.shadowColor = '#ff8a5c';
      ctx.strokeStyle = flash ? '#ffffff' : '#ff8a5c';
      ctx.fillStyle = '#3d1a0a';
      ctx.lineWidth = 2;
      ctx.rotate(e.t * 2.2);
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
        ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
      }
      ctx.stroke();
      break;
    case 'tank':
      ctx.shadowColor = '#ff4d6d';
      ctx.strokeStyle = flash ? '#ffffff' : '#ff4d6d';
      ctx.fillStyle = '#2a0a14';
      ctx.lineWidth = 2.5;
      ctx.fillRect(-22, -16, 44, 32);
      ctx.strokeRect(-22, -16, 44, 32);
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, TAU);
      ctx.fill();
      break;
    case 'splitter':
      ctx.shadowColor = '#7ef0c1';
      ctx.strokeStyle = flash ? '#ffffff' : '#7ef0c1';
      ctx.fillStyle = '#0a2e22';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-6, -3, 4, 0, TAU);
      ctx.arc(6, -3, 4, 0, TAU);
      ctx.arc(0, 7, 4, 0, TAU);
      ctx.fillStyle = '#7ef0c1';
      ctx.fill();
      break;
    case 'mite':
      ctx.shadowColor = '#ffe066';
      ctx.fillStyle = flash ? '#ffffff' : '#ffe066';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, TAU);
      ctx.fill();
      break;
    case 'sniper':
      ctx.shadowColor = '#ffe066';
      ctx.strokeStyle = flash ? '#ffffff' : '#ffe066';
      ctx.fillStyle = '#33270a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 15);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, TAU);
      ctx.fill();
      break;
    case 'charger':
      ctx.shadowColor = '#ff5d7a';
      ctx.strokeStyle = e.chargeState === 1 ? '#ffffff' : '#ff5d7a';
      ctx.fillStyle = '#3d0a1e';
      ctx.lineWidth = e.chargeState === 1 ? 3.5 : 2;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(11, 0);
      ctx.lineTo(0, 16);
      ctx.lineTo(-11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'orbiter':
      ctx.shadowColor = '#37c8ff';
      ctx.strokeStyle = flash ? '#ffffff' : '#37c8ff';
      ctx.fillStyle = '#0a2038';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, TAU);
      ctx.stroke();
      break;
    default:
      ctx.fillStyle = '#ff5d7a';
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, TAU);
      ctx.fill();
      break;
  }
  ctx.restore();
  // Elite ring + mini hull bar for elites.
  if (e.tier === 1) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,209,102,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r + 5, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  if (e.maxHp > 45 && e.hp < e.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - 18, e.y - e.r - 10, 36, 4);
    ctx.fillStyle = '#ff5d7a';
    ctx.fillRect(e.x - 18, e.y - e.r - 10, 36 * (e.hp / e.maxHp), 4);
  }
}

// ---------------------------------------------------------------- bosses

/** Mini-boss names by tier. */
export const MINI_BOSS_NAMES = {
  1: 'HELIX WARDEN',
  2: 'NOVA HERALD',
  3: 'GRAVITY MAW',
};

/** Make a mini-boss (tier 1-3). Hull scales with the wave. */
export function makeMiniBoss(tier, wave) {
  const hp = 420 + wave * 55 + tier * 160;
  const b = {
    isBoss: true,
    bossTier: tier,
    name: MINI_BOSS_NAMES[tier],
    x: 640,
    y: -60,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    r: 46,
    score: 1500 + tier * 500,
    t: 0,
    fireTimer: 2,
    pattern: 0,
    patternTimer: 4,
    flash: 0,
    dead: false,
    kind: 'miniboss',
    tier: 1,
  };
  b.update = (dt, G) => updateMiniBoss(b, dt, G);
  b.draw = (ctx) => drawMiniBoss(ctx, b);
  return b;
}

function updateMiniBoss(b, dt, G) {
  b.t += dt;
  b.flash = Math.max(0, b.flash - dt * 6);
  const p = G.player;
  // Drift into place, then hover with a slow sine.
  if (b.y < 130) {
    b.y += 90 * dt;
    return;
  }
  b.x = 640 + Math.sin(b.t * 0.55) * 320;
  b.y = 130 + Math.sin(b.t * 0.9) * 26;
  b.patternTimer -= dt;
  if (b.patternTimer <= 0) {
    b.pattern++;
    b.patternTimer = 4.2;
  }
  b.fireTimer -= dt;
  if (b.fireTimer > 0 || !p || !p.alive) return;
  if (b.bossTier === 1) {
    // Helix Warden: spiral rings.
    b.fireTimer = 0.55;
    bulletRing(G, b.x, b.y + 20, 10, 165, b.t * 0.9, { spin: 0.35 });
  } else if (b.bossTier === 2) {
    // Nova Herald: radial bursts + mite summons.
    if (b.pattern % 2 === 0) {
      b.fireTimer = 1.1;
      bulletRing(G, b.x, b.y + 20, 14, 175, b.t);
    } else {
      b.fireTimer = 1.6;
      for (let i = 0; i < 3; i++) {
        const m = makeEnemy('mite', b.x + rand(-70, 70), b.y + 30);
        G.enemies.push(m);
      }
    }
  } else {
    // Gravity Maw: pull the player, then aimed fans.
    if (b.pattern % 2 === 0) {
      b.fireTimer = 0.9;
      bulletFan(G, b.x, b.y + 20, angleTo(b.x, b.y, p.x, p.y), 5, 0.7, 240);
      p.x += clamp((b.x - p.x) * 0.12, -90, 90) * dt * 4;
      p.y += clamp((b.y - p.y) * 0.12, -90, 90) * dt * 4;
    } else {
      b.fireTimer = 1.4;
      bulletRing(G, b.x, b.y + 20, 8, 150, b.t * 0.6);
    }
  }
}

function drawMiniBoss(ctx, b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.shadowBlur = 22;
  const colors = { 1: '#c792ff', 2: '#ff8a5c', 3: '#37c8ff' };
  const c = colors[b.bossTier] || '#ff5d7a';
  ctx.shadowColor = c;
  ctx.strokeStyle = b.flash > 0.5 ? '#ffffff' : c;
  ctx.fillStyle = '#160a2e';
  ctx.lineWidth = 3;
  ctx.rotate(Math.sin(b.t * 0.8) * 0.12);
  // Hex hull.
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const px = Math.cos(a) * b.r;
    const py = Math.sin(a) * b.r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Core.
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(0, 0, 13 + Math.sin(b.t * 4) * 2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** The final boss: VOID SOVEREIGN, three phases. */
export function makeVoidSovereign() {
  const hp = 2600;
  const b = {
    isBoss: true,
    bossTier: 4,
    name: 'VOID SOVEREIGN',
    x: 640,
    y: -140,
    vx: 0,
    vy: 0,
    hp,
    maxHp: hp,
    r: 56,
    score: 10000,
    t: 0,
    fireTimer: 2,
    pattern: 0,
    patternTimer: 5,
    phase: 1,
    flash: 0,
    dead: false,
    kind: 'sovereign',
    tier: 1,
  };
  b.update = (dt, G) => updateSovereign(b, dt, G);
  b.draw = (ctx) => drawSovereign(ctx, b);
  return b;
}

function updateSovereign(b, dt, G) {
  b.flash = Math.max(0, b.flash - dt * 6);
  const p = G.player;
  const frac = b.hp / b.maxHp;
  const newPhase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
  if (newPhase !== b.phase) {
    b.phase = newPhase;
    b.patternTimer = 2;
    // Phase change: clear enemy bullets, shockwave banner.
    G.enemyBullets.length = 0;
    G.message = `VOID SOVEREIGN — PHASE ${b.phase}`;
    G.messageTimer = 2;
  }
  if (b.y < 150) {
    b.y += 80 * dt;
    if (b.y >= 150) {
      // Arrived: start the roam clock at the centre, not mid-swing.
      b.y = 150;
      b.t = 0;
    }
    return;
  }
  b.t += dt;
  const speed = b.phase === 3 ? 1.5 : 1;
  b.x = 640 + Math.sin(b.t * 0.6 * speed) * 300;
  b.y = 150 + Math.sin(b.t * 1.1) * 30;
  b.patternTimer -= dt;
  if (b.patternTimer <= 0) {
    b.pattern++;
    b.patternTimer = b.phase === 3 ? 3.2 : 4.5;
  }
  b.fireTimer -= dt;
  if (b.fireTimer > 0 || !p || !p.alive) return;
  if (b.phase === 1) {
    // Spiral rings + aimed fans.
    if (b.pattern % 2 === 0) {
      b.fireTimer = 0.5;
      bulletRing(G, b.x, b.y + 24, 12, 170, b.t, { spin: 0.3 });
    } else {
      b.fireTimer = 1.0;
      bulletFan(G, b.x, b.y + 24, angleTo(b.x, b.y, p.x, p.y), 5, 0.6, 250);
    }
  } else if (b.phase === 2) {
    // Summons + dense radial bursts.
    if (b.pattern % 3 === 0) {
      b.fireTimer = 2.0;
      for (let i = 0; i < 4; i++) {
        G.enemies.push(makeEnemy('darter', b.x + rand(-160, 160), b.y + 40));
      }
    } else {
      b.fireTimer = 0.9;
      bulletRing(G, b.x, b.y + 24, 16, 185, b.t * 0.7);
    }
  } else {
    // Bullet hell: twin spirals + sweeping fans.
    if (b.pattern % 2 === 0) {
      b.fireTimer = 0.42;
      bulletRing(G, b.x - 30, b.y + 24, 9, 175, b.t, { spin: 0.45 });
      bulletRing(G, b.x + 30, b.y + 24, 9, 175, -b.t, { spin: -0.45 });
    } else {
      b.fireTimer = 0.8;
      const sweep = Math.sin(b.t * 1.8) * 0.9;
      bulletFan(G, b.x, b.y + 24, Math.PI / 2 + sweep, 7, 1.1, 230);
    }
  }
}

function drawSovereign(ctx, b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.shadowBlur = 30;
  const phaseColors = { 1: '#c792ff', 2: '#ff5d7a', 3: '#ff8a5c' };
  const c = phaseColors[b.phase];
  ctx.shadowColor = c;
  ctx.strokeStyle = b.flash > 0.5 ? '#ffffff' : c;
  ctx.fillStyle = '#1a0a2e';
  ctx.lineWidth = 4;
  ctx.rotate(Math.sin(b.t * 0.5) * 0.08);
  // Crowned hull: octagon with spikes.
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8;
    const rr = i % 2 === 0 ? b.r + 14 : b.r;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Eye.
  const pulse = 16 + Math.sin(b.t * 5) * 4;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(0, 0, pulse, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#0a0618';
  ctx.beginPath();
  ctx.arc(0, 0, pulse * 0.45, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, TAU);
  ctx.fill();
  ctx.restore();
}
