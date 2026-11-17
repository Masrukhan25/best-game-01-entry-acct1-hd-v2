// particles.js — sparks, explosions, floating score text and screen shake.
// One pool for everything transient so the loop stays allocation-light.

import { rand, TAU } from './utils.js';

export class Particles {
  constructor() {
    this.parts = []; // {x,y,vx,vy,life,maxLife,size,color,drag,grav}
    this.texts = []; // {x,y,vy,life,maxLife,str,color,size}
    this.trauma = 0; // 0..1, screen shake strength
  }

  /** A radial burst of sparks. */
  burst(x, y, color, n = 18, speed = 260, size = 3) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const s = rand(speed * 0.25, speed);
      this.parts.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.3, 0.8),
        maxLife: 0.8,
        size: rand(size * 0.5, size * 1.4),
        color,
        drag: 2.2,
        grav: 0,
      });
    }
  }

  /** A short engine trail puff. */
  trail(x, y, color) {
    this.parts.push({
      x, y,
      vx: rand(-14, 14),
      vy: rand(60, 130),
      life: rand(0.2, 0.45),
      maxLife: 0.45,
      size: rand(2, 4.5),
      color,
      drag: 1.5,
      grav: 0,
    });
  }

  /** Floating score text that rises and fades. */
  text(x, y, str, color = '#9ff3ff', size = 15) {
    this.texts.push({ x, y, vy: -46, life: 0.9, maxLife: 0.9, str, color, size });
  }

  /** Add shake (trauma 0..1). */
  shake(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Current shake offset in pixels. */
  offset() {
    const s = this.trauma * this.trauma * 14;
    return { x: rand(-s, s), y: rand(-s, s) };
  }

  update(dt) {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.parts.splice(i, 1);
        continue;
      }
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.texts.splice(i, 1);
        continue;
      }
      t.y += t.vy * dt;
    }
  }

  draw(ctx) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * (p.life / p.maxLife)), 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.font = `bold ${t.size}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.parts.length = 0;
    this.texts.length = 0;
    this.trauma = 0;
  }
}
