// levels.js — wave compositions for VOIDLIGHT v2.
// 21 waves. Mini-bosses on waves 7, 14 and 18; the VOID SOVEREIGN on 21.
// Normal waves mix the ten kinds with counts that grow with the wave, and
// a few elites appear from wave 6 on. Spawns are timed across the wave.

import { mulberry32, rand } from './utils.js';
import { ENEMY_KINDS } from './enemies.js';

export const TOTAL_WAVES = 21;

/** Which wave holds a boss (tier 1-3 mini-boss, 4 = the Sovereign). */
export function bossForWave(wave) {
  if (wave === 7) return 1;
  if (wave === 14) return 2;
  if (wave === 18) return 3;
  if (wave === 21) return 4;
  return 0;
}

/** Kinds unlocked by each wave (gates the harder kinds in gradually). */
function unlockedKinds(wave) {
  if (wave <= 1) return ['drifter', 'mite'];
  if (wave <= 2) return ['drifter', 'mite', 'darter'];
  if (wave <= 3) return ['drifter', 'mite', 'darter', 'weaver'];
  if (wave <= 4) return ['drifter', 'mite', 'darter', 'weaver', 'sniper'];
  if (wave <= 5) return ['drifter', 'mite', 'darter', 'weaver', 'sniper', 'charger'];
  if (wave <= 6) return ['drifter', 'mite', 'darter', 'weaver', 'sniper', 'charger', 'spinner'];
  if (wave <= 8) return ['drifter', 'mite', 'darter', 'weaver', 'sniper', 'charger', 'spinner', 'orbiter'];
  if (wave <= 10) return ['drifter', 'mite', 'darter', 'weaver', 'sniper', 'charger', 'spinner', 'orbiter', 'tank'];
  return ENEMY_KINDS;
}

/** Build the spawn queue for a wave: { kind, at, x, elite }. */
export function waveSpec(wave) {
  const rng = mulberry32(wave * 7919 + 13);
  const kinds = unlockedKinds(wave);
  const boss = bossForWave(wave);
  const count = boss ? 4 + wave : 8 + wave * 2;
  const span = boss ? 26 : 30 + wave;
  const queue = [];
  for (let i = 0; i < count; i++) {
    const kind = kinds[Math.floor(rng() * kinds.length)];
    const elite = wave >= 6 && rng() < 0.09;
    queue.push({
      kind,
      at: 1 + (i / count) * span + rng() * 1.5,
      x: 60 + rng() * 1160,
      elite,
    });
  }
  // Mites arrive in swarms of three.
  if (wave >= 3) {
    for (let s = 0; s < Math.floor(wave / 3); s++) {
      const at = 4 + s * 7 + rng() * 3;
      const x = 200 + rng() * 880;
      for (let j = 0; j < 3; j++) queue.push({ kind: 'mite', at: at + j * 0.4, x: x + j * 44 - 44, elite: false });
    }
  }
  queue.sort((a, b) => a.at - b.at);
  return queue;
}

/** Wave banner text. */
export function waveTitle(wave) {
  const boss = bossForWave(wave);
  if (boss === 4) return 'FINAL WAVE — VOID SOVEREIGN';
  if (boss > 0) return `WAVE ${wave} — MINI-BOSS`;
  return `WAVE ${wave}`;
}

/** Upgrade waves: after waves 3, 6, 9, 12, 15 and 18. */
export function isUpgradeWave(wave) {
  return [3, 6, 9, 12, 15, 18].includes(wave);
}
