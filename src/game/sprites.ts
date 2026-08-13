/**
 * sprites.ts — hand-pixeled game sprites.
 * The capybara NPC is stored as a literal pixel map (one character = one pixel).
 */
import { Ctx, PixelMap, Palette, px, rect, frame, dither, ellipse, mulberry32 } from "./pixel";

/* ============================ CAPYBARA ============================ */

export const CAPY_PAL: Palette = {
  K: "#3a2416", // outline
  D: "#7d4f26", // dark fur
  M: "#a8703a", // mid fur
  L: "#c99154", // light fur
  H: "#e2b578", // highlight
  E: "#241610", // eye
  W: "#fff3d6", // glint
  N: "#4a2c19", // nose
};

const d = (n: number) => ".".repeat(n);
const r = (ch: string, n: number) => ch.repeat(n);

// 30 x 20 pixel capybara, side view, facing right
export const CAPY_IDLE: PixelMap = [
  d(30),
  d(18) + "KK" + d(4) + "KK" + d(4),
  d(17) + "KDDK" + d(2) + "KDDK" + d(3),
  d(8) + r("K", 9) + "DLLKKKLLDK" + d(3),
  d(5) + "KKK" + r("L", 20) + "K" + d(1),
  d(3) + "KK" + r("L", 24) + "K",
  d(2) + "K" + r("L", 20) + "EW" + r("L", 4) + "K",
  d(2) + "KM" + r("L", 19) + "EE" + r("L", 4) + "K",
  d(2) + "K" + "MM" + r("L", 22) + "NN" + "K",
  d(2) + "K" + "MMM" + r("L", 22) + "N" + "K",
  d(2) + "K" + r("M", 5) + r("L", 19) + "KK" + d(1),
  d(2) + "K" + r("M", 7) + r("L", 16) + "KK" + d(2),
  d(2) + "KD" + r("M", 21) + "KK" + d(3),
  d(1) + "KDD" + r("M", 20) + "KK" + d(4),
  d(1) + "K" + r("D", 21) + "KK" + d(5),
  d(1) + "KK" + r("D", 19) + "KK" + d(6),
  d(2) + "K" + r("D", 4) + "K" + d(6) + "K" + r("D", 4) + "K" + d(10),
  d(2) + "K" + r("D", 4) + "K" + d(6) + "K" + r("D", 4) + "K" + d(10),
  d(2) + "K" + r("D", 4) + "K" + d(6) + "K" + r("D", 4) + "K" + d(10),
  d(2) + r("K", 6) + d(6) + r("K", 6) + d(10),
];

type Edit = [number, number, string];

function patch(map: PixelMap, edits: Edit[]): PixelMap {
  const out = map.map((row) => row.split(""));
  for (const [x, y, ch] of edits) {
    while (out[y].length <= x) out[y].push(".");
    out[y][x] = ch;
  }
  return out.map((row) => row.join(""));
}

// eyes closed
export const CAPY_BLINK = patch(CAPY_IDLE, [
  [23, 6, "L"],
  [24, 6, "L"],
  [23, 7, "K"],
  [24, 7, "K"],
]);

// mouth open — used while talking
export const CAPY_TALK = patch(CAPY_IDLE, [
  [26, 9, "N"],
  [25, 9, "N"],
  [26, 10, "K"],
  [25, 10, "K"],
  [23, 6, "E"],
  [24, 6, "E"],
]);

// happy squint + raised ears
export const CAPY_HAPPY = patch(CAPY_IDLE, [
  [23, 6, "L"],
  [24, 6, "K"],
  [23, 7, "K"],
  [24, 7, "L"],
  [25, 6, "K"],
  [26, 9, "N"],
  [25, 9, "N"],
]);

/* ============================ PROPS ============================ */

const WOOD_D = "#4a2d15";
const WOOD_M = "#7d5027";
const WOOD_L = "#a06c37";
const WOOD_H = "#c08c4d";
const OUT = "#241408";

/** wooden announcement board — 52 x 44 */
export const BOARD_SIZE = { w: 52, h: 44 };
export function drawBoard(c: Ctx) {
  // posts
  for (const px0 of [8, 40]) {
    rect(c, px0, 14, 4, 30, WOOD_D);
    rect(c, px0 + 1, 14, 2, 30, WOOD_M);
    rect(c, px0 + 1, 14, 1, 30, WOOD_L);
  }
  // roof planks
  rect(c, 2, 2, 48, 5, WOOD_D);
  rect(c, 3, 3, 46, 3, WOOD_L);
  rect(c, 3, 3, 46, 1, WOOD_H);
  for (let x = 5; x < 48; x += 6) rect(c, x, 3, 1, 3, WOOD_M);
  // board face
  rect(c, 4, 7, 44, 24, OUT);
  rect(c, 5, 8, 42, 22, WOOD_M);
  for (let y = 8; y < 30; y += 5) rect(c, 5, y, 42, 1, WOOD_D);
  rect(c, 5, 8, 42, 1, WOOD_H);
  // pinned notes
  rect(c, 8, 11, 15, 12, "#e9dab4");
  rect(c, 8, 11, 15, 1, "#fff6dd");
  rect(c, 8, 22, 15, 1, "#c3ae83");
  for (let y = 14; y < 22; y += 3) rect(c, 10, y, 11, 1, "#7a6440");
  rect(c, 26, 13, 16, 14, "#e9dab4");
  rect(c, 26, 13, 16, 1, "#fff6dd");
  rect(c, 26, 26, 16, 1, "#c3ae83");
  for (let y = 16; y < 26; y += 3) rect(c, 28, y, 12, 1, "#7a6440");
  // star seal
  px(c, 34, 20, "#d94f3d");
  rect(c, 33, 21, 3, 1, "#d94f3d");
  px(c, 34, 22, "#d94f3d");
  // nails
  for (const [nx, ny] of [
    [9, 12],
    [21, 12],
    [27, 14],
    [40, 14],
  ])
    px(c, nx, ny, "#cfd6de");
  // base grass shadow
  dither(c, 4, 41, 44, 3, "#2f5b25", "sparse");
}

/** treasure chest — 26 x 20 */
export const CHEST_SIZE = { w: 26, h: 20 };
export function drawChest(c: Ctx) {
  rect(c, 1, 6, 24, 13, OUT);
  rect(c, 2, 7, 22, 11, WOOD_M);
  rect(c, 2, 7, 22, 1, WOOD_L);
  rect(c, 2, 16, 22, 2, WOOD_D);
  // lid
  rect(c, 1, 1, 24, 6, OUT);
  rect(c, 2, 2, 22, 4, WOOD_L);
  rect(c, 2, 2, 22, 1, WOOD_H);
  // metal bands
  for (const bx of [5, 19]) {
    rect(c, bx, 1, 2, 18, "#8a8f99");
    rect(c, bx, 1, 1, 18, "#c3c9d2");
  }
  // lock
  rect(c, 11, 5, 4, 5, "#c9a227");
  rect(c, 11, 5, 4, 1, "#f0d97a");
  px(c, 13, 7, "#4a3b0d");
}

/** lantern post — 11 x 34 */
export const LANTERN_SIZE = { w: 11, h: 34 };
export function drawLantern(c: Ctx) {
  rect(c, 4, 10, 3, 24, WOOD_D);
  rect(c, 5, 10, 1, 24, WOOD_M);
  rect(c, 2, 30, 7, 2, WOOD_D);
  // lamp housing
  rect(c, 1, 2, 9, 9, OUT);
  rect(c, 2, 3, 7, 7, "#3f3527");
  rect(c, 3, 4, 5, 5, "#ffd679");
  rect(c, 4, 5, 3, 3, "#fff3c0");
  rect(c, 2, 0, 7, 2, WOOD_D);
  rect(c, 3, 0, 5, 1, WOOD_L);
}

/** dithered pixel glow used at night — size x size */
export function drawGlow(c: Ctx, size: number, col = "#ffd679") {
  const cx = size / 2;
  const cy = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - cx, y - cy) / (size / 2);
      if (dist > 1) continue;
      let on: boolean;
      if (dist < 0.35) on = true;
      else if (dist < 0.6) on = (x + y) % 2 === 0;
      else if (dist < 0.8) on = x % 2 === 0 && y % 2 === 0;
      else on = (x + y) % 4 === 0 && x % 2 === 0;
      if (on) px(c, x, y, col);
    }
  }
}

/** mossy rock */
export function drawRock(c: Ctx, w: number, h: number, seed = 3) {
  const rnd = mulberry32(seed);
  const base = "#6b6660";
  const dark = "#463f3a";
  const light = "#8d8a83";
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const half = Math.floor((w / 2) * Math.sqrt(1 - (1 - t) * (1 - t) * 0.85));
    const cx = w / 2;
    rect(c, cx - half, y, half * 2, 1, y < h * 0.35 ? light : base);
  }
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const half = Math.floor((w / 2) * Math.sqrt(1 - (1 - t) * (1 - t) * 0.85));
    const cx = w / 2;
    px(c, cx - half, y, "#2b2724");
    px(c, cx + half - 1, y, "#2b2724");
    if (y > h * 0.6) dither(c, cx - half + 1, y, half * 2 - 2, 1, dark, "sparse");
  }
  // moss on top
  for (let i = 0; i < w; i += 2) {
    if (rnd() > 0.45) px(c, i, Math.floor(h * 0.18) + (rnd() > 0.5 ? 1 : 0), "#4a7a2c");
  }
  rect(c, 0, h - 1, w, 1, "#2b2724");
}

/** small bush */
export function drawBush(c: Ctx, w: number, h: number, seed = 7) {
  const rnd = mulberry32(seed);
  const dk = "#1f4a1c";
  const md = "#2f6b24";
  const lt = "#4d9130";
  const hl = "#7bbd45";
  ellipse(c, w / 2, h - 3, w / 2 - 1, h / 2, dk);
  ellipse(c, w / 2 - 2, h - 4, w / 2 - 3, h / 2 - 1, md);
  ellipse(c, w / 2 + 2, h - 5, w / 2 - 4, h / 2 - 2, md);
  ellipse(c, w / 2 - 1, h - 6, w / 2 - 5, h / 2 - 3, lt);
  for (let i = 0; i < w; i++) if (rnd() > 0.7) px(c, i, h - 7 - Math.floor(rnd() * 2), hl);
}

/** tiny flower */
export function drawFlower(c: Ctx, col: string) {
  rect(c, 2, 3, 1, 4, "#2f6b24");
  px(c, 1, 5, "#4d9130");
  px(c, 2, 1, col);
  px(c, 1, 2, col);
  px(c, 3, 2, col);
  px(c, 2, 2, "#fff3c0");
  px(c, 2, 0, col);
}

/** campfire (frame 0/1 flicker) */
export function drawCampfire(c: Ctx, f: number) {
  rect(c, 2, 12, 16, 2, WOOD_D);
  rect(c, 1, 11, 7, 2, WOOD_M);
  rect(c, 11, 11, 7, 2, WOOD_L);
  const off = f ? 1 : 0;
  ellipse(c, 9, 9 - off, 4, 4, "#e0521f");
  ellipse(c, 9, 9 - off, 3, 3, "#f5943a");
  ellipse(c, 9, 9 - off, 1, 2, "#ffe27a");
  px(c, 9, 3 - off, "#ffd679");
  px(c, 7 + off, 5, "#f5943a");
}

/** wooden signpost with an arrow */
export function drawSign(c: Ctx) {
  rect(c, 7, 8, 3, 16, WOOD_D);
  rect(c, 8, 8, 1, 16, WOOD_M);
  rect(c, 0, 2, 18, 8, OUT);
  rect(c, 1, 3, 16, 6, WOOD_L);
  rect(c, 1, 3, 16, 1, WOOD_H);
  rect(c, 3, 5, 10, 1, "#4a2d15");
  rect(c, 3, 7, 7, 1, "#4a2d15");
}

/** wooden fence railing (repeatable, 24 wide) */
export function drawFence(c: Ctx, w: number) {
  rect(c, 0, 4, w, 3, WOOD_D);
  rect(c, 0, 4, w, 1, WOOD_L);
  rect(c, 0, 10, w, 3, WOOD_D);
  rect(c, 0, 10, w, 1, WOOD_M);
  for (let x = 2; x < w; x += 11) {
    rect(c, x, 0, 3, 18, WOOD_M);
    rect(c, x, 0, 1, 18, WOOD_H);
    rect(c, x + 2, 0, 1, 18, WOOD_D);
  }
}

export function drawPortalGem(c: Ctx, t: number) {
  const cols = ["#7ad7f0", "#39a7d8", "#2b6fb8"];
  const k = Math.floor(t) % 3;
  ellipse(c, 8, 8, 6, 7, cols[(k + 2) % 3]);
  ellipse(c, 8, 8, 4, 5, cols[(k + 1) % 3]);
  ellipse(c, 8, 8, 2, 3, "#dff8ff");
  frame(c, 1, 0, 14, 16, "#123a5c");
}
