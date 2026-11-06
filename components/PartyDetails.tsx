"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./PartyDetails.module.css";

const details = [
  { label: "dress code", image: "/dress-code-2.jpg", alt: "Cozy white pajamas", caption: <>cute pajamas</> },
  { label: "food & drinks", image: "/ice-cream-cake.png", alt: "An ice cream cake with candles", caption: <>ice cream cake<br />(food is TBD)</> },
  { label: "activities", image: "/birthday-crowns.jpg", alt: "Colorful decorated paper birthday crowns", caption: <>paper crown decorating</> },
];

const activities = [
  details[2],
  { image: "/scary-movie.jpg", alt: "Scary movie activity", caption: <>&amp; scary movie watch like tradition</> },
];

export default function PartyDetails() {
  const [selected, setSelected] = useState(0);
  const [activityIndex, setActivityIndex] = useState(0);
  const [activityPaused, setActivityPaused] = useState(false);
  const activityTrack = useRef<HTMLDivElement>(null);
  const detail = details[selected];
  const partifulUrl = "https://partiful.com/e/xc0xmlgfA3qKagnkze7P?c=qxWmyJi8";

  useEffect(() => {
    if (selected !== 2 || activityPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const track = activityTrack.current;
      if (!track || document.hidden) return;
      track.scrollTo({ left: ((activityIndex + 1) % activities.length) * track.clientWidth, behavior: "smooth" });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [selected, activityIndex, activityPaused]);

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
              <button key={item.label} id={`detail-tab-${index}`} type="button" role="tab" aria-selected={selected === index} aria-controls="party-detail" className={styles.tab} onClick={() => {
                if (selected !== index) {
                  setActivityIndex(0);
                  setActivityPaused(false);
                }
                setSelected(index);
              }} onKeyDown={(event) => {
                if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const next = event.key === "Home" ? 0 : event.key === "End" ? details.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + details.length) % details.length;
                setSelected(next);
                setActivityIndex(0);
                setActivityPaused(false);
                document.getElementById(`detail-tab-${next}`)?.focus();
              }} tabIndex={selected === index ? 0 : -1}>
                <span>{item.label}</span><span className={styles.dots} aria-hidden="true" />
              </button>
            ))}
          </div>
          <div id="party-detail" role="tabpanel" aria-labelledby={`detail-tab-${selected}`} className={styles.panel}
            onPointerDown={() => setActivityPaused(true)} onFocusCapture={() => setActivityPaused(true)}>
            {selected === 2 ? (
              <>
                <div ref={activityTrack} className={styles.activityTrack} role="region" aria-label="Activities — swipe for more" tabIndex={0}
                  onScroll={(event) => {
                    const track = event.currentTarget;
                    setActivityIndex(Math.round(track.scrollLeft / track.clientWidth));
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                    event.preventDefault();
                    const track = event.currentTarget;
                    track.scrollTo({ left: (event.key === "ArrowLeft" ? 0 : 1) * track.clientWidth, behavior: "smooth" });
                  }}>
                  {activities.map((activity, index) => (
                    <div key={activity.image} className={styles.activitySlide} role="group" aria-label={`Activity ${index + 1} of ${activities.length}`}>
                      <img src={activity.image} alt={activity.alt} className={styles.detailImage} draggable={false} />
                    </div>
                  ))}
                </div>
                <p className={`${styles.caption} ${styles.activityCaption}`}>{activities[activityIndex].caption}</p>
                <div className={styles.activityDots} aria-label="Choose activity">
                  {activities.map((activity, index) => (
                    <button key={activity.image} type="button" aria-label={`Show ${index === 0 ? "crown decorating" : "scary movie"}`} aria-pressed={activityIndex === index} onClick={() => {
                      const track = activityTrack.current;
                      track?.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
                    }}><span /></button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <img src={detail.image} alt={detail.alt} className={styles.detailImage} />
                <p className={styles.caption}>{detail.caption}</p>
              </>
            )}
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
