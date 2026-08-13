/**
 * world.ts — procedural pixel-art scene builder.
 * Everything is rasterised at 480x270 "world pixels" and scaled up crisply.
 */
import {
  Off,
  Ctx,
  makeCanvas,
  px,
  rect,
  dither,
  ellipse,
  mulberry32,
} from "./pixel";
import { drawRock, drawBush, drawFlower, drawFence } from "./sprites";

export const W = 480;
export const H = 270;

export type Theme = "day" | "dusk" | "night";

export const THEME_TINT: Record<Theme, { col: string; amt: number; bri: number }> = {
  day: { col: "#fff3d0", amt: 0.04, bri: 1 },
  dusk: { col: "#ff8f42", amt: 0.26, bri: 0.9 },
  night: { col: "#2b3a80", amt: 0.45, bri: 0.55 },
};

const SKY_BANDS: Record<Theme, string[]> = {
  day: ["#2b73c6", "#3d88d8", "#5aa0e6", "#7bb8f0", "#9ed0f7", "#c3e4fb", "#e0f2fd"],
  dusk: ["#2d3070", "#5b3f8e", "#93507f", "#c76a6e", "#e8905c", "#f6b96f", "#fbdf9f"],
  night: ["#070c26", "#0c1233", "#121a42", "#182252", "#1f2c62", "#283872", "#334380"],
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function noise1(seed: number) {
  const rnd = mulberry32(seed);
  const arr = Array.from({ length: 256 }, () => rnd());
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = arr[((i % 256) + 256) % 256];
    const b = arr[((((i + 1) % 256) + 256) % 256)];
    const t = f * f * (3 - 2 * f);
    return a + (b - a) * t;
  };
}

/** apply the ambient time-of-day tint to any offscreen canvas */
export function tintCanvas(off: Off, theme: Theme) {
  const t = THEME_TINT[theme];
  if (theme === "day") return off;
  const img = off.x.getImageData(0, 0, off.w, off.h);
  const dcol = [
    parseInt(t.col.slice(1, 3), 16),
    parseInt(t.col.slice(3, 5), 16),
    parseInt(t.col.slice(5, 7), 16),
  ];
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    for (let k = 0; k < 3; k++) {
      const v = d[i + k] * t.bri;
      d[i + k] = v + (dcol[k] - v) * t.amt;
    }
  }
  off.x.putImageData(img, 0, 0);
  return off;
}

/* ------------------------------------------------------------------ */
/* sky                                                                 */
/* ------------------------------------------------------------------ */

function buildSky(theme: Theme): Off {
  const o = makeCanvas(W, H);
  const c = o.x;
  const bands = SKY_BANDS[theme];
  const bandH = H / (bands.length - 1);
  for (let i = 0; i < bands.length - 1; i++) {
    const y0 = Math.round(i * bandH);
    const y1 = Math.round((i + 1) * bandH);
    rect(c, 0, y0, W, y1 - y0, bands[i]);
    // dithered transition into the next band
    const fade = Math.round((y1 - y0) * 0.45);
    dither(c, 0, y1 - fade, W, Math.round(fade * 0.6), bands[i + 1], "sparse");
    dither(c, 0, y1 - Math.round(fade * 0.6), W, Math.round(fade * 0.6), bands[i + 1], "half");
  }
  rect(c, 0, H - Math.round(bandH), W, Math.round(bandH), bands[bands.length - 1]);

  if (theme === "night") {
    const rnd = mulberry32(11);
    for (let i = 0; i < 150; i++) {
      const x = Math.floor(rnd() * W);
      const y = Math.floor(rnd() * (H * 0.75));
      const b = rnd();
      px(c, x, y, b > 0.85 ? "#ffffff" : b > 0.5 ? "#cdd6ff" : "#8e9ad4");
    }
    // moon
    const mx = 388;
    const my = 44;
    ellipse(c, mx, my, 13, 13, "#e9eeff");
    ellipse(c, mx - 2, my - 2, 10, 10, "#fdfdff");
    ellipse(c, mx + 4, my + 3, 3, 3, "#d3dcf6");
    ellipse(c, mx - 4, my + 5, 2, 2, "#d3dcf6");
    ellipse(c, mx + 2, my - 6, 2, 2, "#d3dcf6");
  } else {
    // sun with a dithered halo
    const sx = theme === "dusk" ? 372 : 392;
    const sy = theme === "dusk" ? 168 : 40;
    const col = theme === "dusk" ? "#ffd06a" : "#fff6c9";
    for (let rr = 22; rr > 14; rr--) {
      const t = (22 - rr) / 8;
      dither(c, sx - rr, sy - rr, rr * 2, rr * 2, col, t > 0.5 ? "half" : "sparse");
    }
    ellipse(c, sx, sy, 14, 14, col);
    ellipse(c, sx, sy, 11, 11, "#fffdf0");
  }
  return o;
}

/* ------------------------------------------------------------------ */
/* clouds                                                              */
/* ------------------------------------------------------------------ */

const CLOUD_PAL: Record<Theme, [string, string, string, string]> = {
  day: ["#ffffff", "#e2eefb", "#bcd6f2", "#9dbfe6"],
  dusk: ["#ffeacb", "#ffc79a", "#e39a86", "#b3737d"],
  night: ["#7c88bd", "#5f6ba0", "#454f80", "#333b66"],
};

function buildCloud(seed: number, w: number, h: number, theme: Theme): Off {
  const o = makeCanvas(w, h + 2);
  const c = o.x;
  const rnd = mulberry32(seed);
  const [hi, base, shade, deep] = CLOUD_PAL[theme];
  const lobes: [number, number, number, number][] = [];
  const n = 4 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const lx = (w / (n + 1)) * (i + 1) + (rnd() - 0.5) * 8;
    const ry = h * (0.3 + rnd() * 0.3);
    const rx = ry * (1.1 + rnd() * 0.9);
    const ly = h - ry - rnd() * h * 0.18;
    lobes.push([lx, ly, rx, ry]);
  }
  // base body
  for (const [lx, ly, rx, ry] of lobes) ellipse(c, lx, ly, rx, ry, shade);
  rect(c, lobes[0][0], h - Math.round(h * 0.32), lobes[n - 1][0] - lobes[0][0], Math.round(h * 0.3), shade);
  // lit body
  for (const [lx, ly, rx, ry] of lobes) ellipse(c, lx, ly - 1, rx - 1, ry - 1, base);
  // highlight tops
  for (const [lx, ly, rx, ry] of lobes) ellipse(c, lx - 1, ly - 2, rx - 3, ry - 2, hi);
  // shaded underside with dithering
  const img = c.getImageData(0, 0, o.w, o.h);
  for (let x = 0; x < o.w; x++) {
    let bottom = -1;
    for (let y = o.h - 1; y >= 0; y--) {
      if (img.data[(y * o.w + x) * 4 + 3] > 0) {
        bottom = y;
        break;
      }
    }
    if (bottom < 0) continue;
    for (let k = 0; k < 3; k++) {
      const y = bottom - k;
      if (y < 0) continue;
      if (k === 0) px(c, x, y, deep);
      else if ((x + y) % 2 === 0) px(c, x, y, shade);
    }
  }
  return o;
}

/* ------------------------------------------------------------------ */
/* terrain                                                             */
/* ------------------------------------------------------------------ */

const GRASS = ["#8fd455", "#69b53b", "#4a8f2b", "#356d21"];
const DIRT = ["#7a5430", "#5f4023", "#4a3019"];
const ROCK = ["#7a746a", "#615b53", "#4b4640", "#38332e", "#292522"];

function rockShade(x: number, y: number, nz: (n: number) => number, edge: number) {
  const n = nz(x * 0.16 + y * 0.06) * 0.6 + nz(y * 0.21) * 0.4;
  let i = n > 0.66 ? 0 : n > 0.5 ? 1 : n > 0.32 ? 2 : 3;
  if (edge < 3) i = Math.max(0, i - 1);
  if (edge > 26) i = Math.min(4, i + 1);
  return ROCK[i];
}

interface CliffOpts {
  topY: number;
  left: (y: number) => number;
  right: (y: number) => number;
  bottom: number;
  seed: number;
  surface?: (x: number) => number;
}

function drawCliff(c: Ctx, o: CliffOpts) {
  const nz = noise1(o.seed);
  const surf = o.surface ?? ((x: number) => o.topY + Math.round(nz(x * 0.07) * 3 - 1.5));
  for (let y = o.topY - 4; y <= o.bottom; y++) {
    const xl = Math.round(o.left(y));
    const xr = Math.round(o.right(y));
    for (let x = xl; x <= xr; x++) {
      if (x < -2 || x > W + 2) continue;
      const sy = surf(x);
      const dp = y - sy;
      if (dp < 0) continue;
      const edgeL = x - xl;
      const edgeR = xr - x;
      const edge = Math.min(edgeL, edgeR);
      let col: string;
      if (dp === 0) col = GRASS[0];
      else if (dp === 1) col = GRASS[1];
      else if (dp <= 3) col = (x + y) % 2 === 0 && dp === 3 ? GRASS[2] : GRASS[1];
      else if (dp <= 6) col = dp === 6 && (x + y) % 2 === 0 ? GRASS[3] : GRASS[2];
      else if (dp <= 8) col = (x + y) % 2 === 0 ? GRASS[3] : DIRT[0];
      else if (dp <= 13) col = dp > 11 && (x + y) % 2 === 0 ? DIRT[1] : DIRT[0];
      else if (dp <= 17) col = (x + y) % 2 === 0 ? DIRT[2] : DIRT[1];
      else col = rockShade(x, y, nz, edge);
      // silhouette outline
      if (edge === 0 && dp > 6) col = "#211d1a";
      px(c, x, y, col);
    }
    // rocky ledges with little grass patches on the cliff face
  }

  // ledges + cracks on the face
  const rnd = mulberry32(o.seed + 5);
  for (let i = 0; i < 9; i++) {
    const y = Math.round(o.topY + 26 + rnd() * (o.bottom - o.topY - 30));
    const xl = Math.round(o.left(y));
    const xr = Math.round(o.right(y));
    const span = xr - xl;
    if (span < 14) continue;
    const lx = Math.round(xl + 3 + rnd() * (span - 14));
    const lw = 6 + Math.round(rnd() * 16);
    rect(c, lx, y, Math.min(lw, xr - lx - 1), 1, ROCK[0]);
    rect(c, lx, y + 1, Math.min(lw, xr - lx - 1), 1, ROCK[3]);
    if (rnd() > 0.45) {
      rect(c, lx + 1, y - 1, Math.min(lw - 2, 12), 1, GRASS[2]);
      dither(c, lx + 1, y - 2, Math.min(lw - 2, 12), 1, GRASS[1], "half");
    }
    // crack
    let cx = lx + 2;
    let cy = y + 3;
    for (let k = 0; k < 6 + rnd() * 8; k++) {
      px(c, cx, cy, ROCK[4]);
      cy++;
      cx += rnd() > 0.6 ? 1 : rnd() > 0.4 ? -1 : 0;
      if (cx <= xl || cx >= xr) break;
    }
  }

  // hanging grass tufts along the top edges
  for (let i = 0; i < 26; i++) {
    const y = o.topY + 5;
    const side = i % 2 === 0 ? o.left(y) : o.right(y);
    const x = Math.round(side + (i % 2 === 0 ? 1 + rnd() * 10 : -1 - rnd() * 10));
    const len = 2 + Math.round(rnd() * 5);
    for (let k = 0; k < len; k++) px(c, x, y + k, k > len - 2 ? GRASS[3] : GRASS[2]);
  }
}

function drawFloatingIsland(c: Ctx, cx: number, topY: number, halfW: number, depth: number, seed: number) {
  const nz = noise1(seed);
  drawCliff(c, {
    topY,
    bottom: topY + depth,
    seed,
    left: (y) => cx - halfW * (1 - Math.pow((y - topY) / depth, 1.6)) - 0.5,
    right: (y) => cx + halfW * (1 - Math.pow((y - topY) / depth, 1.6)) + 0.5,
    surface: (x) => topY + Math.round(nz(x * 0.09) * 2),
  });
}

/* ------------------------------------------------------------------ */
/* trees                                                               */
/* ------------------------------------------------------------------ */

const LEAF = ["#a8dc5c", "#6cb63c", "#43892b", "#2c6320", "#1d4517"];

export function buildTree(seed: number, w: number, h: number, blossom = false): Off {
  const o = makeCanvas(w, h);
  const c = o.x;
  const rnd = mulberry32(seed);
  const trunkX = Math.round(w / 2) - 1;
  const trunkTop = Math.round(h * 0.42);
  // trunk
  for (let y = h - 1; y >= trunkTop; y--) {
    const t = (h - y) / (h - trunkTop);
    const tw = Math.max(2, Math.round(4 - t * 2 + Math.sin(y * 0.3) * 0.4));
    const bend = Math.round(Math.sin((y / h) * 2.2) * 2);
    rect(c, trunkX + bend, y, tw, 1, "#4a3120");
    px(c, trunkX + bend, y, "#33210f");
    px(c, trunkX + bend + tw - 1, y, "#6b4a2c");
  }
  // roots
  rect(c, trunkX - 3, h - 2, 9, 2, "#3d2818");
  // branches
  for (let i = 0; i < 3; i++) {
    const by = trunkTop + 2 + Math.round(rnd() * h * 0.15);
    const dir = i % 2 === 0 ? 1 : -1;
    for (let k = 0; k < 5 + rnd() * 4; k++) px(c, trunkX + 1 + dir * k, by - Math.round(k * 0.6), "#4a3120");
  }
  // canopy clusters
  const cy = Math.round(h * 0.3);
  const clusters: [number, number, number][] = [];
  const n = 5 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd();
    const rad = w * 0.22 * (0.5 + rnd() * 0.7);
    clusters.push([w / 2 + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.7, w * (0.14 + rnd() * 0.09)]);
  }
  clusters.push([w / 2, cy, w * 0.25]);
  const pal = blossom ? ["#ffd1e6", "#f8a8cd", "#e07bae", "#b85a8c", "#8e4269"] : LEAF;
  for (const [x, y, r0] of clusters) ellipse(c, x, y + 1, r0, r0 * 0.92, pal[3]);
  for (const [x, y, r0] of clusters) ellipse(c, x, y, r0 - 1, r0 * 0.85, pal[2]);
  for (const [x, y, r0] of clusters) ellipse(c, x - r0 * 0.2, y - r0 * 0.25, r0 * 0.7, r0 * 0.55, pal[1]);
  for (const [x, y, r0] of clusters) if (rnd() > 0.35) ellipse(c, x - r0 * 0.3, y - r0 * 0.45, r0 * 0.35, r0 * 0.25, pal[0]);
  // dithered underside shadow
  for (const [x, y, r0] of clusters) dither(c, x - r0, y + r0 * 0.3, r0 * 2, r0 * 0.6, pal[4], "sparse");
  return o;
}

/* ------------------------------------------------------------------ */
/* full world build                                                    */
/* ------------------------------------------------------------------ */

export interface Cloud {
  img: HTMLCanvasElement;
  x: number;
  y: number;
  speed: number;
}

export interface Blade {
  x: number;
  y: number;
  h: number;
  ph: number;
  col: string;
}

export interface TreeInst {
  img: HTMLCanvasElement;
  x: number;
  y: number;
  sway: number;
  ph: number;
}

export interface World {
  sky: HTMLCanvasElement;
  terrain: HTMLCanvasElement;
  fg: HTMLCanvasElement;
  clouds: Cloud[];
  trees: TreeInst[];
  blades: Blade[];
}

/** ground line + anchor points used by the DOM sprite layer */
export const GROUND = {
  leftTop: 158,
  rightTop: 196,
  islandTop: 128,
};

export const ANCHORS = {
  board: { x: 30, y: GROUND.leftTop + 3 },
  lanternA: { x: 86, y: GROUND.leftTop + 2 },
  capybara: { x: 102, y: GROUND.leftTop + 2 },
  sign: { x: 142, y: GROUND.leftTop + 2 },
  campfire: { x: 166, y: GROUND.leftTop + 3 },
  lanternB: { x: 190, y: GROUND.leftTop + 2 },
  chest: { x: 366, y: GROUND.rightTop + 3 },
  gem: { x: 268, y: GROUND.islandTop - 20 },
};

export function buildWorld(theme: Theme): World {
  /* --- sky + clouds --- */
  const sky = buildSky(theme).c;

  const clouds: Cloud[] = [];
  const rnd = mulberry32(42);
  const layers = [
    { n: 5, w: [70, 120], h: [14, 22], y: [8, 70], sp: 0.9 },
    { n: 5, w: [90, 150], h: [20, 34], y: [40, 130], sp: 1.8 },
    { n: 4, w: [130, 200], h: [30, 52], y: [130, 215], sp: 3.1 },
  ];
  let cs = 100;
  layers.forEach((L) => {
    for (let i = 0; i < L.n; i++) {
      const w = L.w[0] + rnd() * (L.w[1] - L.w[0]);
      const h = L.h[0] + rnd() * (L.h[1] - L.h[0]);
      const cl = buildCloud(cs++, Math.round(w), Math.round(h), theme);
      clouds.push({
        img: cl.c,
        x: rnd() * (W + 200) - 100,
        y: L.y[0] + rnd() * (L.y[1] - L.y[0]),
        speed: L.sp * (0.7 + rnd() * 0.6),
      });
    }
  });

  /* --- terrain --- */
  const T = makeCanvas(W, H);
  const c = T.x;

  // distant hazy mesa in the gap
  const hz = makeCanvas(W, H);
  drawCliff(hz.x, {
    topY: 208,
    bottom: H,
    seed: 91,
    left: (y) => 232 + (y - 208) * 0.25,
    right: (y) => 372 - (y - 208) * 0.2,
  });
  hz.x.globalCompositeOperation = "source-atop";
  hz.x.fillStyle = "rgba(150,175,215,0.62)";
  hz.x.fillRect(0, 0, W, H);
  hz.x.globalCompositeOperation = "source-over";
  c.drawImage(hz.c, 0, 0);

  // mid floating island
  drawFloatingIsland(c, 258, GROUND.islandTop, 40, 46, 23);

  // small far island
  drawFloatingIsland(c, 340, 96, 16, 20, 77);

  // main left cliff
  drawCliff(c, {
    topY: GROUND.leftTop,
    bottom: H,
    seed: 7,
    left: () => -6,
    right: (y) => {
      const t = (y - GROUND.leftTop) / (H - GROUND.leftTop);
      return 214 - Math.pow(t, 1.35) * 52 + Math.sin(y * 0.35) * 1.5;
    },
    surface: (x) => GROUND.leftTop + (x > 196 ? Math.round((x - 196) * 0.35) : 0),
  });

  // right cliff
  drawCliff(c, {
    topY: GROUND.rightTop,
    bottom: H,
    seed: 31,
    left: (y) => {
      const t = (y - GROUND.rightTop) / (H - GROUND.rightTop);
      return 322 + Math.pow(t, 1.4) * 40 + Math.cos(y * 0.4) * 1.5;
    },
    right: () => W + 6,
    surface: (x) => GROUND.rightTop - (x > 430 ? Math.round((x - 430) * 0.22) : 0),
  });

  // scattered props baked into the terrain
  const stamp = (o: Off, x: number, y: number) => c.drawImage(o.c, Math.round(x), Math.round(y));
  const rock1 = makeCanvas(22, 13);
  drawRock(rock1.x, 22, 13, 3);
  stamp(rock1, 136, GROUND.leftTop - 11);
  const rock2 = makeCanvas(14, 9);
  drawRock(rock2.x, 14, 9, 9);
  stamp(rock2, 222, GROUND.islandTop - 8);
  const rock3 = makeCanvas(18, 11);
  drawRock(rock3.x, 18, 11, 13);
  stamp(rock3, 340, GROUND.rightTop - 9);

  // wooden railing along the cliff edge (behind the characters)
  const fence = makeCanvas(84, 18);
  drawFence(fence.x, 84);
  stamp(fence, 98, GROUND.leftTop - 17);

  const bush2 = makeCanvas(20, 12);
  drawBush(bush2.x, 20, 12, 17);
  stamp(bush2, 448, GROUND.rightTop - 12);
  const bush3 = makeCanvas(18, 11);
  drawBush(bush3.x, 18, 11, 29);
  stamp(bush3, 252, GROUND.islandTop - 10);

  const fcols = ["#ff6b8a", "#ffd94a", "#ffffff", "#c08cff"];
  const frnd = mulberry32(3);
  for (let i = 0; i < 22; i++) {
    const f = makeCanvas(5, 7);
    drawFlower(f.x, fcols[i % fcols.length]);
    const onLeft = i % 3 !== 2;
    const x = onLeft ? 4 + frnd() * 196 : 328 + frnd() * 146;
    const y = (onLeft ? GROUND.leftTop : GROUND.rightTop) - 5 + Math.round(frnd() * 2);
    stamp(f, x, y);
  }

  tintCanvas(T, theme);

  /* --- trees --- */
  const treeDefs: [number, number, number, number, number, boolean][] = [
    // seed, w, h, x(center), groundY, blossom
    [5, 62, 84, 208, GROUND.leftTop + 8, false],
    [12, 40, 54, 18, GROUND.leftTop + 2, true],
    [8, 70, 92, 410, GROUND.rightTop + 3, false],
    [21, 34, 46, 236, GROUND.islandTop + 2, false],
    [33, 26, 34, 340, 98, false],
  ];
  const trees: TreeInst[] = treeDefs.map(([seed, tw, th, x, gy, bl], i) => {
    const t = buildTree(seed, tw, th, bl);
    tintCanvas(t, theme);
    return { img: t.c, x: Math.round(x - tw / 2), y: Math.round(gy - th), sway: 0.6 + (i % 3) * 0.25, ph: i * 1.7 };
  });

  /* --- animated grass blades --- */
  const blades: Blade[] = [];
  const brnd = mulberry32(88);
  for (let i = 0; i < 120; i++) {
    const onLeft = i % 3 !== 2;
    const x = onLeft ? Math.round(brnd() * 210) : Math.round(326 + brnd() * 154);
    const gy = onLeft
      ? GROUND.leftTop + (x > 196 ? Math.round((x - 196) * 0.35) : 0)
      : GROUND.rightTop - (x > 430 ? Math.round((x - 430) * 0.22) : 0);
    blades.push({
      x,
      y: gy,
      h: 3 + Math.round(brnd() * 4),
      ph: brnd() * Math.PI * 2,
      col: brnd() > 0.5 ? "#7ac645" : "#5aa235",
    });
  }
  for (let i = 0; i < 22; i++) {
    const x = Math.round(222 + brnd() * 72);
    blades.push({ x, y: GROUND.islandTop, h: 2 + Math.round(brnd() * 3), ph: brnd() * 6.28, col: "#6cb63c" });
  }

  /* --- foreground: dark vine trunk + bottom grass --- */
  const FG = makeCanvas(W, H);
  const fc = FG.x;
  const vnz = noise1(55);
  for (let y = 0; y < H; y++) {
    const bend = Math.sin(y * 0.021) * 6;
    const x0 = -6 + bend;
    const wdt = 20 + vnz(y * 0.05) * 8;
    for (let x = Math.round(x0); x < x0 + wdt; x++) {
      if (x < 0) continue;
      const t = (x - x0) / wdt;
      const col = t < 0.18 ? "#12240f" : t < 0.5 ? "#1d3a17" : t < 0.78 ? "#2a5321" : "#16290f";
      px(fc, x, y, col);
      if (t > 0.3 && t < 0.55 && (x + y) % 7 === 0) px(fc, x, y, "#3d7229");
    }
  }
  // leaf clusters on the vine
  const lrnd = mulberry32(66);
  for (let i = 0; i < 16; i++) {
    const y = Math.round(lrnd() * H);
    const x = Math.round(10 + lrnd() * 14);
    ellipse(fc, x, y, 6 + lrnd() * 4, 3 + lrnd() * 2, "#16330f");
    ellipse(fc, x - 1, y - 1, 4 + lrnd() * 3, 2, "#255019");
  }
  tintCanvas(FG, theme);

  return { sky, terrain: T.c, fg: FG.c, clouds, trees, blades };
}
