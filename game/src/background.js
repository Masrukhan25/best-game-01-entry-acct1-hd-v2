// background.js — the deep-space backdrop of VOIDLIGHT v2.
// Three parallax star layers, soft nebula clouds (pre-rendered once to
// offscreen canvases) and one ringed planet. Pure canvas, no image files.

import { rand } from './utils.js';

const W = 1280;
const H = 720;

/** Build a soft radial-gradient sprite canvas of one colour. */
function glowSprite(r, g, b, size = 256) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const x = c.getContext('2d');
  const grad = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.85)`);
  grad.addColorStop(0.35, `rgba(${r},${g},${b},0.32)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = grad;
  x.fillRect(0, 0, size, size);
  return c;
}

export class Background {
  constructor() {
    // Three star layers: far (slow, dim), mid, near (fast, bright).
    this.layers = [];
    const counts = [90, 60, 36];
    const speeds = [6, 16, 34];
    for (let l = 0; l < 3; l++) {
      const stars = [];
      for (let i = 0; i < counts[l]; i++) {
        stars.push({
          x: rand(0, W),
          y: rand(0, H),
          r: rand(0.6, 1.4 + l * 0.5),
          tw: rand(0, Math.PI * 2),
          twSpeed: rand(0.5, 2.2),
        });
      }
      this.layers.push({ stars, speed: speeds[l], alpha: 0.35 + l * 0.25 });
    }
    // Nebula clouds: big soft sprites drifting slowly.
    this.nebulae = [
      { sprite: glowSprite(88, 40, 160), x: 180, y: 150, s: 620, drift: 3, hue: 0 },
      { sprite: glowSprite(16, 120, 180), x: 1050, y: 480, s: 560, drift: -2, hue: 0 },
      { sprite: glowSprite(190, 40, 110), x: 820, y: 110, s: 420, drift: 2, hue: 0 },
      { sprite: glowSprite(30, 80, 200), x: 320, y: 600, s: 480, drift: -3, hue: 0 },
    ];
    // Ringed planet, upper right, drawn with gradients.
    this.planet = { x: 1060, y: 128, r: 74 };
  }

  /** Advance the parallax scroll (scroll is pixels of downward drift). */
  update(dt, scroll) {
    for (const layer of this.layers) {
      for (const s of layer.stars) {
        s.y += layer.speed * dt * (0.4 + scroll * 0.02);
        if (s.y > H + 4) {
          s.y = -4;
          s.x = rand(0, W);
        }
        s.tw += s.twSpeed * dt;
      }
    }
    for (const n of this.nebulae) {
      n.x += n.drift * dt;
      if (n.x < -320) n.x = W + 320;
      if (n.x > W + 320) n.x = -320;
    }
  }

  /** Draw the whole backdrop. */
  draw(ctx, time) {
    // Deep space gradient.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#05010f');
    g.addColorStop(0.55, '#0a0624');
    g.addColorStop(1, '#12082e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Nebulae (additive).
    ctx.globalCompositeOperation = 'lighter';
    for (const n of this.nebulae) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(n.sprite, n.x - n.s / 2, n.y - n.s / 2, n.s, n.s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Ringed planet.
    const p = this.planet;
    const pg = ctx.createRadialGradient(p.x - 22, p.y - 26, 6, p.x, p.y, p.r);
    pg.addColorStop(0, '#7fe7ff');
    pg.addColorStop(0.45, '#2f7fd0');
    pg.addColorStop(1, '#0d1c4d');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    // Planet ring.
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-0.42);
    ctx.strokeStyle = 'rgba(150,220,255,0.55)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r + 34, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150,220,255,0.22)';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r + 46, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Stars with twinkle.
    for (const layer of this.layers) {
      for (const s of layer.stars) {
        const a = layer.alpha * (0.65 + 0.35 * Math.sin(s.tw));
        ctx.globalAlpha = a;
        ctx.fillStyle = '#dff4ff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
