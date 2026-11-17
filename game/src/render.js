// render.js — everything VOIDLIGHT v2 draws: the playfield, the HUD and
// every screen (title, upgrade, pause, game over, victory). All text is
// drawn on the canvas so the screenshots show the whole game at a glance.

import { TOTAL_WAVES } from './levels.js';
import { drawPlayer } from './player.js';
import { drawBullets } from './bullets.js';
import { drawPowerups } from './powerups.js';

/** Draw the playing field: background, entities, HUD, banners. */
export function drawGame(ctx, G, bg, particles, player, time) {
  bg.draw(ctx, time);
  // Entities.
  for (const e of G.enemies) e.draw(ctx);
  if (G.boss) G.boss.draw(ctx);
  drawPowerups(ctx, G, time);
  drawBullets(ctx, G);
  drawPlayer(ctx, player, time);
  particles.draw(ctx);
  drawHud(ctx, G, player);
  // Boss health bar.
  if (G.boss) drawBossBar(ctx, G.boss);
  // Centre banner.
  if (G.messageTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, G.messageTimer);
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px "Segoe UI", system-ui, sans-serif';
    ctx.shadowColor = '#37c8ff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#eafcff';
    ctx.fillText(G.message, 640, 300);
    ctx.restore();
  }
}

/** The HUD: score, wave, hull, shield, bombs, combo, timers, mute. */
export function drawHud(ctx, G, player) {
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // Top-left: score + best.
  ctx.textAlign = 'left';
  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#eafcff';
  ctx.shadowColor = '#37c8ff';
  ctx.shadowBlur = 8;
  ctx.fillText(`SCORE ${Math.floor(G.displayScore).toLocaleString('en-US')}`, 18, 36);
  ctx.shadowBlur = 0;
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(180,220,255,0.75)';
  ctx.fillText(`BEST ${Math.floor(G.best).toLocaleString('en-US')}   KILLS ${G.kills}`, 18, 56);
  // Top-centre: wave.
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#eafcff';
  ctx.fillText(`WAVE ${Math.max(1, G.wave)} / ${TOTAL_WAVES}`, 640, 34);
  const remaining = G.enemies.length + G.spawnQueue.length + (G.boss ? 1 : 0);
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(180,220,255,0.75)';
  ctx.fillText(G.boss ? 'BOSS' : `${remaining} HOSTILES`, 640, 54);
  // Top-right: combo.
  ctx.textAlign = 'right';
  if (G.combo > 1) {
    ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = '#ffb347';
    ctx.shadowBlur = 10;
    ctx.fillText(`COMBO x${G.combo}`, 1262, 36);
    ctx.shadowBlur = 0;
  }
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(180,220,255,0.75)';
  ctx.fillText(player.muted ? 'MUTED (M)' : 'M: MUTE   P: PAUSE', 1262, 56);
  // Bottom-left: hull + shield bars.
  drawBar(ctx, 18, 668, 220, 14, player.hp / player.maxHp, '#37c8ff', 'HULL');
  if (player.maxShield > 0) {
    drawBar(ctx, 18, 690, 220, 8, player.shield / player.maxShield, '#8ef6ff', '');
  }
  // Bottom-right: bombs + active timers.
  ctx.textAlign = 'right';
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ff8a5c';
  ctx.fillText(`BOMBS ${'●'.repeat(player.bombs)}${'○'.repeat(Math.max(0, 3 - player.bombs))}  [SPACE]`, 1262, 682);
  const active = [];
  if (player.timers.rapid > 0) active.push(`RAPID ${Math.ceil(player.timers.rapid)}s`);
  if (player.timers.spread > 0) active.push(`SPREAD ${Math.ceil(player.timers.spread)}s`);
  if (player.timers.overdrive > 0) active.push(`OVERDRIVE ${Math.ceil(player.timers.overdrive)}s`);
  if (player.drones.length > 0) active.push(`DRONE x${player.drones.length}`);
  if (active.length > 0) {
    ctx.font = '13px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#9ff3ff';
    ctx.fillText(active.join('   '), 1262, 704);
  }
  ctx.restore();
}

function drawBar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, frac), h);
  ctx.strokeStyle = 'rgba(180,220,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  if (label) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(220,240,255,0.9)';
    ctx.fillText(label, x + 4, y - 5);
  }
}

/** Boss health bar across the top (below the HUD wave line). */
function drawBossBar(ctx, boss) {
  const w = 560;
  const x = 640 - w / 2;
  const y = 88;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ffd7e0';
  ctx.shadowColor = '#ff5d7a';
  ctx.shadowBlur = 10;
  ctx.fillText(boss.name, 640, y - 6);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x, y, w, 12);
  ctx.fillStyle = '#ff5d7a';
  ctx.fillRect(x, y, w * Math.max(0, boss.hp / boss.maxHp), 12);
  ctx.strokeStyle = 'rgba(255,93,122,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, 12);
  if (boss.phase) {
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,215,224,0.85)';
    ctx.fillText(`PHASE ${boss.phase} / 3`, 640, y + 28);
  }
  ctx.restore();
}

/** Title screen: logo, tagline, controls, best score, start prompt. */
export function drawTitle(ctx, G, time) {
  ctx.save();
  ctx.textAlign = 'center';
  const pulse = 0.75 + 0.25 * Math.sin(time * 2.4);
  // Logo.
  ctx.font = 'bold 84px "Segoe UI", system-ui, sans-serif';
  ctx.shadowColor = '#37c8ff';
  ctx.shadowBlur = 34;
  ctx.fillStyle = '#eafcff';
  ctx.fillText('VOIDLIGHT', 640, 218);
  ctx.shadowBlur = 0;
  ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#8ef6ff';
  ctx.fillText('— NEON SPACE DEFENSE —', 640, 252);
  // Tagline.
  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(200,230,255,0.9)';
  ctx.fillText('21 waves. 10 enemy kinds. 3 mini-bosses. One VOID SOVEREIGN.', 640, 296);
  ctx.fillText('Fight with a wingman drone, chain combos to x8, and take the crown.', 640, 320);
  // Controls panel.
  ctx.fillStyle = 'rgba(4,10,28,0.72)';
  ctx.strokeStyle = 'rgba(140,220,255,0.45)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 400, 352, 480, 132, 12);
  ctx.fill();
  ctx.stroke();
  ctx.font = '15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#dff4ff';
  ctx.fillText('WASD / ARROWS — fly', 640, 382);
  ctx.fillText('MOUSE — aim      CLICK / SPACE — fire', 640, 408);
  ctx.fillText('BOMB — right-click or SHIFT      P — pause      M — mute', 640, 434);
  ctx.fillText('Clear a wave, then pick 1 of 3 upgrades. Survive all 21 waves.', 640, 460);
  // Start prompt.
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.shadowColor = '#ffb347';
  ctx.shadowBlur = 14;
  ctx.fillText('CLICK OR PRESS ENTER TO LAUNCH', 640, 548);
  ctx.restore();
  ctx.globalAlpha = 1;
  if (G.best > 0) {
    ctx.textAlign = 'center';
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(180,220,255,0.8)';
    ctx.fillText(`BEST SCORE ${Math.floor(G.best).toLocaleString('en-US')}`, 640, 592);
  }
  ctx.textAlign = 'center';
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(150,190,230,0.6)';
  ctx.fillText('An original game. All art and sound are generated in code — no files, no network.', 640, 692);
}

/** Upgrade screen: 1 of 3 cards, clickable or keys 1/2/3. */
export function drawUpgrade(ctx, G) {
  ctx.save();
  ctx.fillStyle = 'rgba(3,6,20,0.72)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.font = 'bold 38px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#eafcff';
  ctx.shadowColor = '#37c8ff';
  ctx.shadowBlur = 16;
  ctx.fillText(`WAVE ${G.wave} CLEAR`, 640, 128);
  ctx.shadowBlur = 0;
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#8ef6ff';
  ctx.fillText('CHOOSE ONE UPGRADE', 640, 162);
  const cards = G.upgradeChoices;
  const cw = 300;
  const ch = 210;
  const gap = 28;
  const total = cards.length * cw + (cards.length - 1) * gap;
  let x = 640 - total / 2;
  const y = 210;
  cards.forEach((u, i) => {
    const hover = G.upgradeCursor === i;
    ctx.fillStyle = hover ? 'rgba(20,60,110,0.95)' : 'rgba(8,18,44,0.92)';
    ctx.strokeStyle = hover ? '#ffd166' : 'rgba(140,220,255,0.55)';
    ctx.lineWidth = hover ? 3 : 1.5;
    roundRect(ctx, x, y, cw, ch, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`[${i + 1}]`, x + cw / 2, y + 34);
    ctx.fillStyle = '#eafcff';
    ctx.font = 'bold 21px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(u.name, x + cw / 2, y + 76);
    ctx.fillStyle = 'rgba(200,230,255,0.9)';
    ctx.font = '15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(u.desc, x + cw / 2, y + 112);
    const owned = G.player && (G.player.upgrades[u.id] || 0);
    ctx.fillStyle = 'rgba(150,190,230,0.7)';
    ctx.font = '13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(owned > 0 ? `OWNED x${owned}  (max ${u.max})` : `NEW  (max ${u.max})`, x + cw / 2, y + 150);
    ctx.fillStyle = hover ? '#ffd166' : 'rgba(180,220,255,0.6)';
    ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(hover ? '▶ CLICK TO TAKE ◀' : 'click or press ' + (i + 1), x + cw / 2, y + 184);
    x += cw + gap;
  });
  ctx.fillStyle = 'rgba(180,220,255,0.75)';
  ctx.font = '14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Your hull and score carry on. The next wave is harder.', 640, 480);
  ctx.restore();
}

/** Pause screen. */
export function drawPause(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(3,6,20,0.66)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.font = 'bold 52px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#eafcff';
  ctx.shadowColor = '#37c8ff';
  ctx.shadowBlur = 18;
  ctx.fillText('PAUSED', 640, 330);
  ctx.shadowBlur = 0;
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#8ef6ff';
  ctx.fillText('Press P or click to resume — R to restart the run', 640, 372);
  ctx.restore();
}

/** Game over screen with stats and restart. */
export function drawGameOver(ctx, G) {
  ctx.save();
  ctx.fillStyle = 'rgba(10,2,8,0.72)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.font = 'bold 58px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ff8fa8';
  ctx.shadowColor = '#ff5d7a';
  ctx.shadowBlur = 22;
  ctx.fillText('SHIP DESTROYED', 640, 210);
  ctx.shadowBlur = 0;
  ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#eafcff';
  ctx.fillText(`FINAL SCORE  ${Math.floor(G.score).toLocaleString('en-US')}`, 640, 268);
  ctx.font = '17px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(200,230,255,0.92)';
  const acc = G.shotsFired > 0 ? Math.round((100 * G.shotsHit) / G.shotsFired) : 0;
  ctx.fillText(`Reached wave ${G.wave} of ${TOTAL_WAVES}  •  ${G.kills} kills  •  max combo x${G.maxCombo}  •  accuracy ${acc}%`, 640, 310);
  ctx.fillText(`${G.powerupsTaken} power-ups taken  •  ${G.upgradesTaken} upgrades  •  ${G.bombsUsed} bombs used`, 640, 338);
  const pulse = 0.75 + 0.25 * Math.sin(G.titleTime * 2.4);
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.shadowColor = '#ffb347';
  ctx.shadowBlur = 14;
  ctx.fillText('PRESS ENTER OR CLICK — PLAY AGAIN', 640, 420);
  ctx.restore();
}

/** Victory screen with full run stats and restart. */
export function drawVictory(ctx, G) {
  const s = G.victoryStats || { score: G.score, kills: G.kills, maxCombo: G.maxCombo, acc: 0, time: 0 };
  ctx.save();
  ctx.fillStyle = 'rgba(2,10,8,0.66)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.font = 'bold 62px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 26;
  ctx.fillText('VOIDLIGHT TRIUMPHS', 640, 178);
  ctx.shadowBlur = 0;
  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#8ef6ff';
  ctx.fillText('All 21 waves cleared. The VOID SOVEREIGN is dust.', 640, 216);
  // Stats panel.
  ctx.fillStyle = 'rgba(4,12,30,0.85)';
  ctx.strokeStyle = 'rgba(140,220,255,0.5)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 390, 248, 500, 216, 12);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#eafcff';
  ctx.fillText(`FINAL SCORE  ${Math.floor(s.score).toLocaleString('en-US')}`, 640, 296);
  ctx.font = '17px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(200,230,255,0.92)';
  ctx.fillText(`${s.kills} kills   •   max combo x${s.maxCombo}   •   accuracy ${s.acc}%`, 640, 334);
  ctx.fillText(`run time ${Math.floor(s.time / 60)}:${String(Math.floor(s.time % 60)).padStart(2, '0')}   •   ${s.powerups} power-ups   •   ${s.upgrades} upgrades`, 640, 362);
  ctx.fillText(`damage dealt ${Math.floor(s.damageDealt).toLocaleString('en-US')}   •   damage taken ${Math.floor(s.damageTaken).toLocaleString('en-US')}`, 640, 390);
  ctx.fillStyle = 'rgba(180,220,255,0.75)';
  ctx.font = '14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('BEST ' + Math.floor(G.best).toLocaleString('en-US'), 640, 428);
  const pulse = 0.75 + 0.25 * Math.sin(G.titleTime * 2.4);
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ffd166';
  ctx.shadowColor = '#ffb347';
  ctx.shadowBlur = 14;
  ctx.fillText('PRESS ENTER OR CLICK — PLAY AGAIN', 640, 530);
  ctx.restore();
}

/** Rounded-rectangle path helper. */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
