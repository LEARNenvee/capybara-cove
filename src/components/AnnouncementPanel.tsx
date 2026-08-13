export interface Announcement {
  id: string;
  title: string;
  date: string;
  tag: string;
  body: string;
}

const tagClass = (t: string) =>
  t === "UPDATE" ? "panel__tag panel__tag--info" : t === "EVENT" ? "panel__tag panel__tag--event" : "panel__tag";

export default function AnnouncementPanel({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: Announcement[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const a = items[index];
  if (!a) return null;
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="panel rpg rpg--dark" onClick={(e) => e.stopPropagation()}>
        <div className="panel__title">&#9733; NOTICE BOARD &#9733;</div>
        <div className="panel__body">
          <div className="panel__list">
            {items.map((it, i) => (
              <button
                key={it.id}
                className={"panel__item" + (i === index ? " panel__item--on" : "")}
                onClick={() => onIndex(i)}
              >
                {i === index ? "> " : "  "}
                {it.title}
                <span>{it.date}</span>
              </button>
            ))}
          </div>
          <div className="panel__content">
            <div className={tagClass(a.tag)}>{a.tag}</div>
            <h2 className="panel__h">{a.title}</h2>
            <div className="panel__date">&#9670; {a.date}</div>
            <div className="panel__text">{a.body}</div>
          </div>
        </div>
        <div className="panel__foot">
          <button className="btn btn--sm btn--ghost" onClick={() => onIndex((index - 1 + items.length) % items.length)}>
            &#9664; PREV
          </button>
          <span style={{ fontSize: "var(--fs-sm)", color: "#9d8fbd" }}>
            {index + 1} / {items.length}
          </span>
          <button className="btn btn--sm btn--ghost" onClick={() => onIndex((index + 1) % items.length)}>
            NEXT &#9654;
          </button>
          <button className="btn btn--sm" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
