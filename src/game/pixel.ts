/**
 * pixel.ts — tiny hand-rolled pixel-art drawing toolkit.
 * Everything in the world is drawn pixel-by-pixel on low-resolution canvases
 * and then scaled up with `image-rendering: pixelated`, so every edge stays crisp.
 */

export type Ctx = CanvasRenderingContext2D;

export interface Off {
  c: HTMLCanvasElement;
  x: Ctx;
  w: number;
  h: number;
}

export function makeCanvas(w: number, h: number): Off {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const x = c.getContext("2d")!;
  x.imageSmoothingEnabled = false;
  return { c, x, w: c.width, h: c.height };
}

export function px(ctx: Ctx, x: number, y: number, col: string) {
  ctx.fillStyle = col;
  ctx.fillRect(x | 0, y | 0, 1, 1);
}

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, col: string) {
  ctx.fillStyle = col;
  ctx.fillRect(x | 0, y | 0, Math.round(w), Math.round(h));
}

export function frame(ctx: Ctx, x: number, y: number, w: number, h: number, col: string) {
  rect(ctx, x, y, w, 1, col);
  rect(ctx, x, y + h - 1, w, 1, col);
  rect(ctx, x, y, 1, h, col);
  rect(ctx, x + w - 1, y, 1, h, col);
}

/** classic 50% / 25% / 75% ordered dithering, used for gradients & shading */
export function dither(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  col: string,
  mode: "half" | "sparse" | "dense" = "half",
  phase = 0
) {
  ctx.fillStyle = col;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const gx = (i + x + phase) | 0;
      const gy = (j + y) | 0;
      let on = false;
      if (mode === "half") on = (gx + gy) % 2 === 0;
      else if (mode === "sparse") on = gx % 2 === 0 && gy % 2 === 0;
      else on = !(gx % 2 === 1 && gy % 2 === 1);
      if (on) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
}

/** filled pixel ellipse (Bresenham-ish, no anti-aliasing) */
export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, col: string) {
  ctx.fillStyle = col;
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry);
    if (t < 0) continue;
    const w = Math.floor(Math.sqrt(t) * rx);
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- sprite maps ---------------- */

export type PixelMap = string[];
export type Palette = Record<string, string>;

export function drawMap(ctx: Ctx, map: PixelMap, pal: Palette, ox = 0, oy = 0) {
  for (let y = 0; y < map.length; y++) {
    const row = map[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === "." || ch === " ") continue;
      const col = pal[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

export function mapSize(map: PixelMap) {
  return { w: Math.max(...map.map((r) => r.length)), h: map.length };
}

export function mapToCanvas(map: PixelMap, pal: Palette): Off {
  const { w, h } = mapSize(map);
  const o = makeCanvas(w, h);
  drawMap(o.x, map, pal);
  return o;
}

export function mapToURL(map: PixelMap, pal: Palette): string {
  return mapToCanvas(map, pal).c.toDataURL();
}

export function drawToURL(w: number, h: number, draw: (ctx: Ctx) => void): string {
  const o = makeCanvas(w, h);
  draw(o.x);
  return o.c.toDataURL();
}

/* ---------------- color utils ---------------- */

export function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, "0")).join("");
}

export function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

export function shade(hex: string, amt: number) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + amt, g + amt, b + amt);
}
