import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WorldCanvas from "./components/WorldCanvas";
import DialogueBox, { DialogueState } from "./components/DialogueBox";
import AnnouncementPanel, { Announcement } from "./components/AnnouncementPanel";
import { getAssets } from "./game/assets";
import { ANCHORS, Theme, W, H } from "./game/world";
import { sfx } from "./game/sfx";

/* ------------------------------------------------------------------ */
/* data                                                                */
/* ------------------------------------------------------------------ */

import { ANNOUNCEMENTS } from "./data/announcements";

const FALLBACK: Announcement[] = ANNOUNCEMENTS;

const CAPY_LINES = [
  "Hey, buddy! You climbed all the way up here?",
  "Oh! You found me. I'm Yuzu — I look after this cliff.",
  "I have something to tell you... it's kind of important.",
  "See that wooden board over there? Check the announcement board!",
  "There's something new waiting for you. Go on, give it a click.",
  "While you're up here, poke anything you like. Rocks. Trees. Me.",
  "Twist a lantern if the daylight gets old. The sky listens.",
  "Come back anytime, buddy. The clouds are different every day.",
];

type Mood = "idle" | "talk" | "happy";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const pw = (v: number) => `${(v / W) * 100}%`;
const ph = (v: number) => `${(v / H) * 100}%`;

function Spr({
  url,
  x,
  y,
  w,
  h,
  cls = "",
  onClick,
  label,
  z,
}: {
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cls?: string;
  onClick?: () => void;
  label?: string;
  z?: number;
}) {
  const style = { left: pw(x), top: ph(y), width: pw(w), height: ph(h), zIndex: z };
  if (!onClick) return <img src={url} alt="" className={`sprite ${cls}`} style={style} />;
  return (
    <img
      src={url}
      alt={label ?? ""}
      role="button"
      tabIndex={0}
      aria-label={label}
      className={`sprite clickable ${cls}`}
      style={style}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    />
  );
}

function Hit({
  x,
  y,
  w,
  h,
  onClick,
  label,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className="hit"
      aria-label={label}
      title={label}
      style={{ left: pw(x), top: ph(y), width: pw(w), height: ph(h) }}
      onClick={onClick}
    />
  );
}

/* ------------------------------------------------------------------ */
/* app                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  const [theme, setTheme] = useState<Theme>("day");
  const A = useMemo(() => getAssets(theme), [theme]);

  const [items, setItems] = useState<Announcement[]>(FALLBACK);
  const [panel, setPanel] = useState(false);
  const [annIdx, setAnnIdx] = useState(0);
  const [seenBoard, setSeenBoard] = useState(false);

  const [d, setD] = useState<DialogueState | null>(null);
  const [capyStep, setCapyStep] = useState(0);
  const [mood, setMood] = useState<Mood>("idle");
  const [blink, setBlink] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [sound, setSound] = useState(false);
  const [tick, setTick] = useState(0);
  const [pop, setPop] = useState<{ k: number; x: number; y: number } | null>(null);

  const talkTimer = useRef<number | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const play = useCallback((fn: () => void) => {
    if (soundRef.current) fn();
  }, []);

  /* announcements ------------------------------------------------- */
  useEffect(() => {
    fetch("data/announcements.json")
      .then((r) => r.json())
      .then((j: Announcement[]) => Array.isArray(j) && j.length && setItems(j))
      .catch(() => undefined);
  }, []);

  /* sprite animation ticker --------------------------------------- */
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 170);
    return () => window.clearInterval(id);
  }, []);

  /* idle blinking -------------------------------------------------- */
  useEffect(() => {
    let to: number;
    const loop = () => {
      to = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 140);
        loop();
      }, 2200 + Math.random() * 3600);
    };
    loop();
    return () => window.clearTimeout(to);
  }, []);

  /* opening line --------------------------------------------------- */
  useEffect(() => {
    const to = window.setTimeout(() => {
      setD({
        name: "YUZU",
        text: CAPY_LINES[0],
        x: ANCHORS.capybara.x + 15,
        y: ANCHORS.capybara.y - 20,
        more: true,
      });
      setCapyStep(1);
    }, 700);
    return () => window.clearTimeout(to);
  }, []);

  /* ambient events: Yuzu mutters if you leave her alone ------------- */
  useEffect(() => {
    const id = window.setInterval(() => {
      if (panel || d) return;
      const lines = [
        "*yawn*",
        "Wind's picking up.",
        "Did you read the board yet?",
        "...nice clouds today.",
        "I could eat.",
      ];
      setD({
        name: "YUZU",
        text: lines[Math.floor(Math.random() * lines.length)],
        x: ANCHORS.capybara.x + 15,
        y: ANCHORS.capybara.y - 20,
        more: true,
      });
    }, 26000);
    return () => window.clearInterval(id);
  }, [panel, d]);

  /* esc closes ----------------------------------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (panel) {
          setPanel(false);
          play(sfx.close);
        } else setD(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, play]);

  /* ---------------------------------------------------------------- */

  const say = useCallback(
    (name: string, text: string, x: number, y: number, more = false) => {
      setD({ name, text, x, y, more });
      setPop({ k: Date.now(), x, y: y - 6 });
      play(sfx.select);
    },
    [play]
  );

  const talkTo = () => {
    const line = CAPY_LINES[capyStep % CAPY_LINES.length];
    setCapyStep((s) => s + 1);
    setReacting(true);
    window.setTimeout(() => setReacting(false), 480);
    setMood(capyStep % CAPY_LINES.length === 0 ? "happy" : "talk");
    setD({
      name: "YUZU",
      text: line,
      x: ANCHORS.capybara.x + 15,
      y: ANCHORS.capybara.y - 20,
      more: true,
    });
    play(capyStep % CAPY_LINES.length === 0 ? sfx.happy : sfx.select);
  };

  const onTick = useCallback(() => {
    setMood("talk");
    if (talkTimer.current) window.clearTimeout(talkTimer.current);
    talkTimer.current = window.setTimeout(() => setMood("idle"), 180);
    play(sfx.talk);
  }, [play]);

  const openBoard = (index = 0) => {
    setAnnIdx(index);
    setPanel(true);
    setSeenBoard(true);
    setD(null);
    play(sfx.open);
  };

  const cycleTheme = () => {
    setTheme((t) => (t === "day" ? "dusk" : t === "dusk" ? "night" : "day"));
    play(sfx.select);
  };

  /* capybara sprite ------------------------------------------------ */
  const capySrc = mood === "talk" ? A.capyTalk : mood === "happy" ? A.capyHappy : blink ? A.capyBlink : A.capyIdle;

  const night = theme === "night";
  const dusk = theme === "dusk";
  const lampsOn = night || dusk;

  const C = ANCHORS;

  return (
    <div className="stage">
      <div className="viewport">
        {/* ---------------- world ---------------- */}
        <div className="layer">
          <WorldCanvas theme={theme} />
        </div>

        {/* ---------------- actors ---------------- */}
        <div className="layer">
          {/* announcement board */}
          <Spr
            url={A.board}
            x={C.board.x}
            y={C.board.y - 44}
            w={52}
            h={44}
            cls="clickable"
            label="Announcement board"
            onClick={() => openBoard(0)}
            z={4}
          />
          {!seenBoard && (
            <img
              src={A.bang}
              alt=""
              className="sprite bob"
              style={{ left: pw(C.board.x + 23), top: ph(C.board.y - 62), width: pw(7), height: ph(14), zIndex: 5 }}
            />
          )}

          {/* lanterns */}
          <Spr
            url={A.lantern}
            x={C.lanternA.x}
            y={C.lanternA.y - 34}
            w={11}
            h={34}
            cls="clickable"
            label="Lantern"
            onClick={() => {
              cycleTheme();
              say("LANTERN", "You twist the little brass key. The sky answers.", C.lanternA.x + 6, C.lanternA.y - 34);
            }}
            z={3}
          />
          <Spr
            url={A.lantern}
            x={C.lanternB.x}
            y={C.lanternB.y - 34}
            w={11}
            h={34}
            cls="clickable"
            label="Lantern"
            onClick={() => {
              cycleTheme();
              say("LANTERN", "Click. The light shifts, and so does the hour.", C.lanternB.x + 6, C.lanternB.y - 34);
            }}
            z={3}
          />
          {lampsOn && (
            <>
              <img
                src={A.glow}
                alt=""
                className="glow"
                style={{ left: pw(C.lanternA.x - 16), top: ph(C.lanternA.y - 52), width: pw(44), height: ph(44) }}
              />
              <img
                src={A.glow}
                alt=""
                className="glow"
                style={{ left: pw(C.lanternB.x - 16), top: ph(C.lanternB.y - 52), width: pw(44), height: ph(44) }}
              />
              <img
                src={A.glow}
                alt=""
                className="glow"
                style={{ left: pw(C.campfire.x - 3), top: ph(C.campfire.y - 30), width: pw(30), height: ph(30) }}
              />
            </>
          )}

          {/* signpost */}
          <Spr
            url={A.sign}
            x={C.sign.x}
            y={C.sign.y - 24}
            w={18}
            h={24}
            cls="clickable"
            label="Signpost"
            onClick={() =>
              say(
                "SIGNPOST",
                "-> THIS WAY: nowhere in particular.\n<- THAT WAY: also nowhere. Enjoy the view.",
                C.sign.x + 9,
                C.sign.y - 24
              )
            }
            z={3}
          />

          {/* campfire */}
          <Spr
            url={A.fire[tick % 2]}
            x={C.campfire.x}
            y={C.campfire.y - 15}
            w={20}
            h={15}
            cls="clickable"
            label="Campfire"
            onClick={() => say("CAMPFIRE", "It crackles softly. Smells like toasted bread.", C.campfire.x + 10, C.campfire.y - 15)}
            z={3}
          />

          {/* capybara */}
          <Spr
            url={capySrc}
            x={C.capybara.x}
            y={C.capybara.y - 20}
            w={30}
            h={20}
            cls={`clickable ${reacting ? "capy-react" : "bob"}`}
            label="Talk to Yuzu the capybara"
            onClick={talkTo}
            z={6}
          />

          {/* chest */}
          <Spr
            url={A.chest}
            x={C.chest.x}
            y={C.chest.y - 20}
            w={26}
            h={20}
            cls="clickable"
            label="Chest"
            onClick={() =>
              say("CHEST", "Inside: three acorns, a damp map, and one left boot.", C.chest.x + 13, C.chest.y - 20)
            }
            z={3}
          />

          {/* floating crystal */}
          <Spr
            url={A.gem[tick % 3]}
            x={C.gem.x}
            y={C.gem.y}
            w={16}
            h={17}
            cls="clickable bob-slow"
            label="Humming crystal"
            onClick={() => {
              openBoard(Math.max(0, items.findIndex((i) => i.tag === "UPDATE")));
            }}
            z={3}
          />

          {/* invisible hotspots over painted scenery */}
          <Hit x={180} y={78} w={58} h={84} label="Tree" onClick={() => say("TREE", "It's a tree. A very committed one.", 208, 84)} />
          <Hit
            x={378}
            y={108}
            w={66}
            h={92}
            label="Tree"
            onClick={() => say("TREE", "The leaves whisper. Probably about you.", 410, 112)}
          />
          <Hit x={134} y={144} w={26} h={18} label="Rock" onClick={() => say("ROCK", "Just a rock. Mossy. Content.", 147, 146)} />
          <Hit
            x={216}
            y={126}
            w={40}
            h={40}
            label="Floating island"
            onClick={() => say("ISLAND", "A little island, drifting on nothing at all.", 236, 126)}
          />
          <Hit
            x={2}
            y={60}
            w={26}
            h={190}
            label="Vines"
            onClick={() => say("VINES", "Ancient vines. Older than the cliff, they claim.", 30, 120)}
          />
          <Hit
            x={330}
            y={200}
            w={40}
            h={40}
            label="Grass ledge"
            onClick={() => say("LEDGE", "Soft grass. A good spot for doing nothing.", 350, 200)}
          />

          {pop && (
            <img
              key={pop.k}
              src={A.sparkle}
              alt=""
              className="pop"
              style={{ left: pw(pop.x), top: ph(pop.y), width: pw(7), height: ph(7), zIndex: 8 }}
            />
          )}
        </div>

        {/* ---------------- UI ---------------- */}
        <div className="layer layer--ui">
          <div className="hud-top">
            <div className="plaque rpg rpg--wood">
              CAPYBARA COVE
              <small>~ notices from the floating cliffs ~</small>
            </div>
            <div className="hud-btns">
              <button className="btn btn--sm" onClick={() => openBoard(annIdx)}>
                NOTICES{!seenBoard && items.length ? ` (${items.length})` : ""}
              </button>
              <button className="btn btn--sm btn--ghost" onClick={cycleTheme}>
                {theme === "day" ? "\u2600 DAY" : theme === "dusk" ? "\u25D1 DUSK" : "\u263E NIGHT"}
              </button>
              <button
                className="btn btn--sm btn--ghost"
                onClick={() => {
                  setSound((s) => !s);
                  if (!sound) sfx.select();
                }}
              >
                {sound ? "\u266A ON" : "\u266A OFF"}
              </button>
            </div>
          </div>

          {d && (
            <DialogueBox
              d={d}
              tail={A.bubbleTail}
              arrow={A.bubbleTail}
              onTick={onTick}
              onAdvance={() => {
                if (d.name === "YUZU") talkTo();
                else setD(null);
              }}
            />
          )}

          <div className="hint">CLICK THE CAPYBARA &#8226; CLICK THE BOARD &#8226; CLICK ANYTHING</div>
          <div className="vignette" />
        </div>

        {panel && (
          <AnnouncementPanel
            items={items}
            index={annIdx}
            onIndex={(i) => {
              setAnnIdx(i);
              play(sfx.select);
            }}
            onClose={() => {
              setPanel(false);
              play(sfx.close);
              setD({
                name: "YUZU",
                text: "Told you there was something new, buddy.",
                x: ANCHORS.capybara.x + 15,
                y: ANCHORS.capybara.y - 20,
                more: true,
              });
            }}
          />
        )}
      </div>

      {/* screen-reader accessible copy of the announcements */}
      <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        <h1>Capybara Cove announcements</h1>
        {items.map((a) => (
          <article key={a.id}>
            <h2>{a.title}</h2>
            <p>{a.date}</p>
            <p>{a.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
