// upgrades.js — the 1-of-3 weapon upgrade choices offered after waves.
// Each upgrade has a cap; maxed ones leave the pool. Choices are rolled
// fresh each time so no two upgrade screens are the same.

import { rand } from './utils.js';

/** The upgrade pool: id, name, description, cap, and how it changes the player. */
export const UPGRADE_POOL = [
  {
    id: 'damage', name: 'VOID ROUNDS', desc: '+35% bullet damage',
    max: 5,
    apply: (p) => { p.damageMul *= 1.35; },
  },
  {
    id: 'firerate', name: 'OVERDRIVE TRIGGER', desc: '+25% fire rate',
    max: 5,
    apply: (p) => { p.fireRateMul *= 1.25; },
  },
  {
    id: 'multishot', name: 'TRIPLE HELIX', desc: '+1 projectile per shot',
    max: 2,
    apply: (p) => { p.shots += 1; },
  },
  {
    id: 'pierce', name: 'PHASE ROUNDS', desc: 'Bullets pierce +1 enemy',
    max: 3,
    apply: (p) => { p.pierce += 1; },
  },
  {
    id: 'hull', name: 'AEGIS PLATING', desc: '+30 max hull, repair 30',
    max: 5,
    apply: (p) => { p.maxHp += 30; p.hp = Math.min(p.maxHp, p.hp + 30); },
  },
  {
    id: 'drone', name: 'WINGMAN DRONE', desc: 'Add an orbiting drone (max 2)',
    max: 2,
    apply: (p) => {
      if (p.drones.length < 2) p.drones.push({ angle: p.drones.length === 0 ? Math.PI : 0, cooldown: 0 });
    },
  },
  {
    id: 'magnet', name: 'TRACTOR WEB', desc: '+60% pickup magnet radius',
    max: 3,
    apply: (p) => { p.magnet *= 1.6; },
  },
  {
    id: 'bomb', name: 'NOVA RACK', desc: '+1 bomb slot, +1 bomb now',
    max: 2,
    apply: (p) => { p.bombs = Math.min(3, p.bombs + 1); },
  },
  {
    id: 'speed', name: 'ION THRUSTERS', desc: '+12% move speed',
    max: 3,
    apply: (p) => { p.speedMul *= 1.12; },
  },
  {
    id: 'regen', name: 'NANO WEAVE', desc: 'Regenerate 1.2 hull / second',
    max: 3,
    apply: (p) => { p.regen += 1.2; },
  },
];

/** Roll 3 distinct upgrades the player has not maxed yet. */
export function rollUpgrades(player) {
  const avail = UPGRADE_POOL.filter((u) => (player.upgrades[u.id] || 0) < u.max);
  const picks = [];
  const pool = [...avail];
  while (picks.length < 3 && pool.length > 0) {
    const i = Math.floor(rand(0, pool.length));
    picks.push(pool.splice(i, 1)[0]);
  }
  return picks;
}

/** Apply an upgrade by id and record it on the player. */
export function applyUpgrade(player, id) {
  const u = UPGRADE_POOL.find((x) => x.id === id);
  if (!u) return false;
  if ((player.upgrades[id] || 0) >= u.max) return false;
  u.apply(player);
  player.upgrades[id] = (player.upgrades[id] || 0) + 1;
  return true;
}
