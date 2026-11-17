// state.js — the single run state for VOIDLIGHT v2.
// Every system reads and writes this one object, so the loop, the HUD and the
// screenshots always agree about what is happening.

import { clamp } from './utils.js';

/** The modes the game can be in. */
export const MODES = {
  TITLE: 'title',
  PLAYING: 'playing',
  UPGRADE: 'upgrade',
  PAUSED: 'paused',
  OVER: 'over',
  VICTORY: 'victory',
};

/** A fresh run: player, waves, score, combo, entity lists and run stats. */
export function newRun() {
  return {
    mode: MODES.TITLE,
    time: 0, // seconds since this run started (playing time only)
    titleTime: 0, // seconds spent on the title screen (for the animated backdrop)
    score: 0,
    displayScore: 0, // eases toward score so the HUD ticks up
    best: 0,
    wave: 0,
    waveState: 'idle', // idle | spawning | fighting | clear | boss
    waveTimer: 0,
    spawnQueue: [], // { kind, at, x, y } entries waiting to spawn
    spawnClock: 0,
    kills: 0,
    combo: 1, // multiplier, 1..8
    comboTimer: 0, // seconds left before the combo decays
    maxCombo: 1,
    shotsFired: 0,
    shotsHit: 0,
    damageDealt: 0,
    damageTaken: 0,
    powerupsTaken: 0,
    upgradesTaken: 0,
    bombsUsed: 0,
    drones: 0,
    enemies: [],
    playerBullets: [],
    enemyBullets: [],
    powerups: [],
    boss: null, // the live boss object, if any
    bossIntro: 0, // seconds of boss intro banner left
    upgradeChoices: [],
    upgradeCursor: 0,
    message: '', // centre-screen banner text
    messageTimer: 0,
    victoryStats: null,
    muted: false,
    auto: null, // null | 'strong' | 'weak' — debug autopilot from ?auto=
    shot: null, // null | 'title' | 'play' | 'boss' | 'victory' — debug state from ?shot=
  };
}

/** Add points, multiplied by the current combo. */
export function addScore(G, base) {
  G.score += Math.round(base * G.combo);
}

/** Raise the combo by one step (max x8) and refresh its timer. */
export function bumpCombo(G) {
  G.combo = clamp(G.combo + 1, 1, 8);
  G.comboTimer = 4;
  if (G.combo > G.maxCombo) G.maxCombo = G.combo;
}

/** Tick the combo timer; the combo falls back toward x1 when it runs out. */
export function tickCombo(G, dt) {
  if (G.comboTimer > 0) {
    G.comboTimer -= dt;
    if (G.comboTimer <= 0) G.combo = Math.max(1, G.combo - 2);
  }
}

/** Show a centre-screen banner for `secs` seconds. */
export function banner(G, text, secs = 2.2) {
  G.message = text;
  G.messageTimer = secs;
}
