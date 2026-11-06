"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./PartyDetails.module.css";

const details = [
  { label: "dress code", image: "/dress-code-2.jpg", alt: "Cozy white pajamas", caption: <>cute pajamas</> },
  { label: "food & drinks", image: "/ice-cream-cake.png", alt: "An ice cream cake with candles", caption: <>ice cream cake<br />(food is TBD)</> },
  { label: "activities", image: "/birthday-crowns.jpg", alt: "Colorful decorated paper birthday crowns", caption: <>paper crown decorating</> },
];

export default function PartyDetails() {
  const [selected, setSelected] = useState(0);
  const detail = details[selected];
  const partifulUrl = "https://partiful.com/e/xc0xmlgfA3qKagnkze7P?c=qxWmyJi8";

  return (
    <main className={styles.scene}>
      <div className={styles.cards}>
        <div className={`${styles.paper} ${styles.character}`} role="img" aria-label="Chloe’s 21 — a cat celebrating with a birthday cake">
          <img className={styles.cat} src="/cat-cake.png" alt="" />
          <img className={`${styles.cat} ${styles.catAlternate}`} src="/cat-cake-2.png" alt="" />
          <img className={styles.chloeText} src="/chloe-21-text.png" alt="" />
        </div>
        <section className={`${styles.paper} ${styles.details}`} aria-label="Party details">
          <div className={styles.tabs} role="tablist" aria-label="More party information" aria-orientation="vertical">
            <p className={styles.hint}>click for more info</p>
            {details.map((item, index) => (
              <button key={item.label} id={`detail-tab-${index}`} type="button" role="tab" aria-selected={selected === index} aria-controls="party-detail" className={styles.tab} onClick={() => setSelected(index)} onKeyDown={(event) => {
                if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home" ? 0 : event.key === "End" ? details.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + details.length) % details.length;
                setSelected(next);
                document.getElementById(`detail-tab-${next}`)?.focus();
              }} tabIndex={selected === index ? 0 : -1}>
                <span>{item.label}</span><span className={styles.dots} aria-hidden="true" />
              </button>
            ))}
          </div>
          <div id="party-detail" role="tabpanel" aria-labelledby={`detail-tab-${selected}`} className={styles.panel}>
            <img src={detail.image} alt={detail.alt} className={styles.detailImage} />
            <p className={styles.caption}>{detail.caption}</p>
          </div>
          <p className={styles.rsvp}>indicate your intended<br />plans in <a href={partifulUrl} target="_blank" rel="noreferrer">this partiful</a></p>
        </section>
        <Link href="/scene-2" className={styles.backLink}>
          <span aria-hidden="true">← </span>go back
        </Link>
      </div>
    </main>
  );
}
