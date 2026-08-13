# Capybara Cove — a pixel-art announcement world

An announcement website disguised as a tiny 2D pixel-art adventure. Everything you
see is drawn pixel-by-pixel in code (no photos, no vector art, no emoji sprites):
the sky bands, the dithered clouds, the floating cliffs, the trees, the props and
Yuzu the capybara NPC.

## Stack

* **HTML** — page shell (`index.html`)
* **CSS** — pixel RPG UI, frames, animations (`src/index.css`)
* **JavaScript / TypeScript** — the whole world engine and interaction logic
* **Python** — *optional* local tooling only (`python/server.py`)
* **C#** — not required, so not used

## Structure

```
src/
  game/
    pixel.ts     low-level pixel toolkit (px, dither, ellipse, pixel maps, tinting)
    sprites.ts   hand-pixeled sprites: capybara pixel map, board, chest, lantern...
    world.ts     procedural scene: sky, clouds, cliffs, islands, trees, grass
    assets.ts    sprite -> data URL cache, tinted per time of day
    sfx.ts       tiny square-wave blips (muted by default)
  components/
    WorldCanvas.tsx        480x270 render loop (parallax, wind, particles, birds)
    DialogueBox.tsx        RPG speech box with typewriter + pointer tail
    AnnouncementPanel.tsx  RPG menu window listing the announcements
  data/announcements.ts    baked-in announcement data
public/data/announcements.json   runtime data (overrides the baked copy)
python/server.py                 optional: serve ./dist, or add/list announcements
```

## Interactions

* Click **Yuzu the capybara** — she reacts and the dialogue advances line by line.
* Click the **notice board** (or the crystal / NOTICES button) — the announcement
  window opens with prev / next navigation.
* Click **lanterns** — cycle day → dusk → night (lamps glow, fireflies appear).
* Click the **chest, signpost, campfire, trees, rocks, vines, ledges** — each one
  answers with its own little line.
* `Esc` closes windows, `Enter`/`Space` works on focused objects.

## Content management (optional)

```bash
python python/server.py list   # show the board
python python/server.py add    # append a notice to public/data/announcements.json
python python/server.py serve  # serve ./dist on http://localhost:8000
```
