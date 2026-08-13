import { makeCanvas, drawMap, Ctx, rect, px } from "./pixel";
import { tintCanvas, Theme } from "./world";
import * as S from "./sprites";

const cache = new Map<string, string>();

function build(key: string, theme: Theme | null, w: number, h: number, fn: (c: Ctx) => void): string {
  const k = `${key}:${theme ?? "raw"}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const o = makeCanvas(w, h);
  fn(o.x);
  if (theme) tintCanvas(o, theme);
  const url = o.c.toDataURL();
  cache.set(k, url);
  return url;
}

export interface AssetSet {
  capyIdle: string;
  capyBlink: string;
  capyTalk: string;
  capyHappy: string;
  board: string;
  chest: string;
  lantern: string;
  sign: string;
  fire: [string, string];
  gem: [string, string, string];
  glow: string;
  bubbleTail: string;
  bang: string;
  sparkle: string;
}

export function getAssets(theme: Theme): AssetSet {
  return {
    capyIdle: build("capyIdle", theme, 30, 20, (c) => drawMap(c, S.CAPY_IDLE, S.CAPY_PAL)),
    capyBlink: build("capyBlink", theme, 30, 20, (c) => drawMap(c, S.CAPY_BLINK, S.CAPY_PAL)),
    capyTalk: build("capyTalk", theme, 30, 20, (c) => drawMap(c, S.CAPY_TALK, S.CAPY_PAL)),
    capyHappy: build("capyHappy", theme, 30, 20, (c) => drawMap(c, S.CAPY_HAPPY, S.CAPY_PAL)),
    board: build("board", theme, S.BOARD_SIZE.w, S.BOARD_SIZE.h, S.drawBoard),
    chest: build("chest", theme, S.CHEST_SIZE.w, S.CHEST_SIZE.h, S.drawChest),
    lantern: build("lantern", theme, S.LANTERN_SIZE.w, S.LANTERN_SIZE.h, S.drawLantern),
    sign: build("sign", theme, 18, 24, S.drawSign),
    fire: [
      build("fire0", theme, 20, 15, (c) => S.drawCampfire(c, 0)),
      build("fire1", theme, 20, 15, (c) => S.drawCampfire(c, 1)),
    ],
    gem: [
      build("gem0", theme, 16, 17, (c) => S.drawPortalGem(c, 0)),
      build("gem1", theme, 16, 17, (c) => S.drawPortalGem(c, 1)),
      build("gem2", theme, 16, 17, (c) => S.drawPortalGem(c, 2)),
    ],
    glow: build("glow", null, 44, 44, (c) => S.drawGlow(c, 44)),
    bubbleTail: build("tail", null, 9, 6, (c) => {
      // pixel speech-bubble tail: cream body, dark outline
      for (let y = 0; y < 5; y++) {
        const w = 9 - y * 2;
        rect(c, y, y, w, 1, "#f6e7c3");
        px(c, y, y, "#2b1a10");
        px(c, y + w - 1, y, "#2b1a10");
      }
      rect(c, 4, 5, 1, 1, "#2b1a10");
    }),
    bang: build("bang", null, 7, 14, (c) => {
      rect(c, 1, 0, 5, 10, "#2b1a10");
      rect(c, 1, 11, 5, 3, "#2b1a10");
      rect(c, 2, 1, 3, 8, "#ffd34a");
      rect(c, 2, 12, 3, 1, "#ffd34a");
      rect(c, 2, 1, 1, 7, "#fff0a8");
    }),
    sparkle: build("sparkle", null, 7, 7, (c) => {
      rect(c, 3, 0, 1, 7, "#fff6c9");
      rect(c, 0, 3, 7, 1, "#fff6c9");
      rect(c, 2, 2, 3, 3, "#ffffff");
    }),
  };
}
