import { useEffect, useRef, useState } from "react";
import { W, H } from "../game/world";

export interface DialogueState {
  name: string;
  text: string;
  x: number; // world-x of the speaker (center)
  y: number; // world-y of the speaker's head
  more: boolean;
}

const BOX_W = 152;

export default function DialogueBox({
  d,
  tail,
  arrow,
  onAdvance,
  onTick,
}: {
  d: DialogueState;
  tail: string;
  arrow: string;
  onAdvance: () => void;
  onTick: () => void;
}) {
  const [shown, setShown] = useState("");
  const doneRef = useRef(false);

  useEffect(() => {
    setShown("");
    doneRef.current = false;
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setShown(d.text.slice(0, i));
      if (i % 3 === 0) onTick();
      if (i >= d.text.length) {
        doneRef.current = true;
        window.clearInterval(id);
      }
    }, 26);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.text, d.name]);

  const complete = shown.length >= d.text.length;

  const left = Math.max(6, Math.min(W - BOX_W - 6, d.x - BOX_W / 2));
  const bottomWorld = H - (d.y - 12);
  const tailX = Math.max(8, Math.min(BOX_W - 18, d.x - left - 4));

  const handle = () => {
    if (!complete) {
      setShown(d.text);
      return;
    }
    onAdvance();
  };

  return (
    <div
      className="dialogue rpg"
      style={{ left: `${(left / W) * 100}%`, bottom: `${(bottomWorld / H) * 100}%` }}
      onClick={handle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handle();
      }}
    >
      <div className="dialogue__name">{d.name}</div>
      <div className="dialogue__text">
        {shown}
        {!complete && <span style={{ opacity: 0.4 }}>_</span>}
      </div>
      <img className="dialogue__tail" src={tail} alt="" style={{ left: `calc(var(--u) * ${tailX})` }} />
      {complete && <img className="dialogue__next" src={arrow} alt="" />}
    </div>
  );
}
