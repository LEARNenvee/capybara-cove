import { useEffect, useRef } from "react";
import { buildWorld, W, H, Theme } from "../game/world";
import { mulberry32 } from "../game/pixel";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
  size: number;
}

interface Bird {
  x: number;
  y: number;
  sp: number;
  ph: number;
}

export default function WorldCanvas({ theme }: { theme: Theme }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const world = buildWorld(theme);
    const rnd = mulberry32(1234);

    const particles: Particle[] = Array.from({ length: theme === "night" ? 26 : 40 }, () => ({
      x: rnd() * W,
      y: 60 + rnd() * (H - 70),
      vx: 2 + rnd() * 6,
      vy: -1 - rnd() * 2,
      ph: rnd() * Math.PI * 2,
      size: rnd() > 0.85 ? 2 : 1,
    }));

    const birds: Bird[] = Array.from({ length: theme === "night" ? 0 : 3 }, (_, i) => ({
      x: rnd() * W,
      y: 24 + rnd() * 70,
      sp: 9 + rnd() * 7,
      ph: i * 2,
    }));

    const pollenCol =
      theme === "night" ? "#ffe98a" : theme === "dusk" ? "#ffd9a0" : "#fdffd6";

    let t = 0;
    let last = performance.now();
    let raf = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(world.sky, 0, 0);

      // clouds (parallax layers)
      for (const cl of world.clouds) {
        const x = Math.round(cl.x);
        ctx.drawImage(cl.img, x, Math.round(cl.y));
        if (x > W - cl.img.width) ctx.drawImage(cl.img, x - (W + cl.img.width + 40), Math.round(cl.y));
      }

      // birds
      for (const b of birds) {
        const f = Math.floor(t * 6 + b.ph) % 2;
        const bx = Math.round(b.x);
        const by = Math.round(b.y + Math.sin(t * 0.8 + b.ph) * 2);
        ctx.fillStyle = theme === "dusk" ? "#5b3550" : "#3c4a63";
        const pts =
          f === 0
            ? [
                [0, 1],
                [1, 0],
                [2, 1],
                [3, 0],
                [4, 1],
              ]
            : [
                [0, 0],
                [1, 1],
                [2, 1],
                [3, 1],
                [4, 0],
              ];
        for (const [dx, dy] of pts) ctx.fillRect(bx + dx, by + dy, 1, 1);
      }

      ctx.drawImage(world.terrain, 0, 0);

      // trees: canopy sways with the wind, trunk stays put
      for (const tr of world.trees) {
        const img = tr.img;
        const sway = Math.round(Math.sin(t * 0.8 + tr.ph) * tr.sway + Math.sin(t * 2.3 + tr.ph) * 0.4);
        const canopyH = Math.round(img.height * 0.55);
        ctx.drawImage(img, 0, 0, img.width, canopyH, tr.x + sway, tr.y, img.width, canopyH);
        ctx.drawImage(
          img,
          0,
          canopyH,
          img.width,
          img.height - canopyH,
          tr.x,
          tr.y + canopyH,
          img.width,
          img.height - canopyH
        );
      }

      // grass blades
      for (const b of world.blades) {
        const off = Math.sin(t * 1.7 + b.ph) * 1.4;
        ctx.fillStyle = b.col;
        for (let k = 0; k < b.h; k++) {
          const x = Math.round(b.x + off * (k / b.h));
          ctx.fillRect(x, b.y - 1 - k, 1, 1);
        }
      }

      // ambient particles / fireflies
      for (const p of particles) {
        const blink = theme === "night" ? (Math.sin(t * 3 + p.ph) > 0.1 ? 1 : 0) : 1;
        if (blink) {
          ctx.fillStyle = pollenCol;
          ctx.fillRect(Math.round(p.x), Math.round(p.y + Math.sin(t * 1.2 + p.ph) * 3), p.size, p.size);
        }
      }

      ctx.drawImage(world.fg, 0, 0);
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      for (const cl of world.clouds) {
        cl.x += cl.speed * dt;
        if (cl.x > W + 20) cl.x = -cl.img.width - 20 - Math.random() * 60;
      }
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x > W) p.x = -2;
        if (p.y < 40) p.y = H - 10;
      }
      for (const b of birds) {
        b.x += b.sp * dt;
        if (b.x > W + 8) {
          b.x = -8;
          b.y = 24 + Math.random() * 70;
        }
      }
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [theme]);

  return <canvas ref={ref} width={W} height={H} className="world-canvas" />;
}
