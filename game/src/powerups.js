// powerups.js — drops that enemies leave behind and what they do.
// Six kinds: rapid fire, spread shot, shield, wingman drone, bomb, overdrive.
// Drops drift down, magnetise toward the player when close, and expire.

import { clamp, rand, choice } from './utils.js';

/** Power-up kinds: label, colour and duration (0 = instant). */
export const POWERUP_KINDS = {
  rapid: { label: 'RAPID FIRE', color: '#ffd166', dur: 12 },
  spread: { label: 'SPREAD SHOT', color: '#7ef0c1', dur: 12 },
  shield: { label: 'SHIELD', color: '#8ef6ff', dur: 0 },
  drone: { label: 'WINGMAN DRONE', color: '#c792ff', dur: 0 },
  bomb: { label: 'NOVA BOMB', color: '#ff8a5c', dur: 0 },
  overdrive: { label: 'OVERDRIVE', color: '#ff5d7a', dur: 8 },
};

const DROP_TABLE = [
  ['rapid', 0.22],
  ['spread', 0.2],
  ['shield', 0.18],
  ['bomb', 0.16],
  ['overdrive', 0.14],
  ['drone', 0.1],
];

/** Roll a drop kind (weighted). */
export function rollDropKind() {
  let r = Math.random();
  for (const [kind, w] of DROP_TABLE) {
    r -= w;
    if (r <= 0) return kind;
  }
  return 'rapid';
}

/** Spawn a power-up at (x, y); kind may be forced or rolled. */
export function spawnPowerup(G, x, y, kind = null) {
  const k = kind ?? rollDropKind();
  G.powerups.push({
    kind: k,
    x: clamp(x, 30, 1250),
    y: clamp(y, 30, 690),
    vy: 46,
    r: 13,
    life: 11,
    bob: rand(0, Math.PI * 2),
  });
}

/** Chance an enemy drops something, by enemy tier (0 = normal, 1 = elite). */
export function maybeDrop(G, enemy) {
  const chance = enemy.tier === 1 ? 0.55 : 0.12;
  if (Math.random() < chance) spawnPowerup(G, enemy.x, enemy.y);
}

/** Apply a collected power-up to the player. */
export function applyPowerup(G, player, kind) {
  const info = POWERUP_KINDS[kind];
  G.powerupsTaken++;
  switch (kind) {
    case 'rapid':
      player.timers.rapid = info.dur;
      break;
    case 'spread':
      player.timers.spread = info.dur;
      break;
    case 'shield':
      player.shield = Math.min(player.maxShield, player.shield + 50);
      break;
    case 'drone':
      if (player.drones.length < 2) {
        player.drones.push({ angle: player.drones.length === 0 ? Math.PI : 0, cooldown: 0 });
        G.drones = player.drones.length;
      } else {
        G.score += 500;
      }
      break;
    case 'bomb':
      player.bombs = Math.min(3, player.bombs + 1);
      break;
    case 'overdrive':
      player.timers.overdrive = info.dur;
      break;
    default:
      break;
  }
  return info.label;
}

/** Move drops, magnetise toward the player, expire old ones. */
export function updatePowerups(G, player, dt) {
  for (let i = G.powerups.length - 1; i >= 0; i--) {
    const p = G.powerups[i];
    p.life -= dt;
    p.bob += dt * 3;
    if (p.life <= 0) {
      G.powerups.splice(i, 1);
      continue;
    }
    const dx = player.x - p.x;
    const dy = player.y - p.y;
    const d2 = dx * dx + dy * dy;
    const magnetR = player.magnet * player.magnet;
    if (d2 < magnetR) {
      const d = Math.sqrt(d2) || 1;
      const pull = 420 * (1 - d / player.magnet);
      p.x += (dx / d) * pull * dt;
      p.y += (dy / d) * pull * dt;
    } else {
      p.y += p.vy * dt;
    }
  }
}

/** Draw drops as glowing hex badges with a letter. */
export function drawPowerups(ctx, G, time) {
  const letters = { rapid: 'R', spread: 'S', shield: 'H', drone: 'D', bomb: 'B', overdrive: 'O' };
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of G.powerups) {
    const info = POWERUP_KINDS[p.kind];
    const bobY = Math.sin(p.bob) * 3;
    const blink = p.life < 3 ? (Math.sin(time * 10) > 0 ? 1 : 0.35) : 1;
    ctx.globalAlpha = blink;
    ctx.save();
    ctx.translate(p.x, p.y + bobY);
    ctx.fillStyle = 'rgba(5,10,30,0.85)';
    ctx.strokeStyle = info.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * p.r;
      const py = Math.sin(a) * p.r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = info.color;
    ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(letters[p.kind], 0, 1);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
