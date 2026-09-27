"use client";
/** Channel Pork : Canal 1, le seul. Diaporama d'archives + sous-titres + bandeau (ou vraie vidéo si fournie). */
import { useEffect, useState } from "react";
import { useMenuCommands, useOs } from "@/os/context";
import { at, programLength } from "./timeline";

export function ChannelPork() {
  const { pack, str, signal } = useOs();
  const programs = pack.programs;
  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [soustitres, setSoustitres] = useState(true);
  const [bandeau, setBandeau] = useState(true);
  const p = programs[idx]!;
  const len = programLength(p);

  useEffect(() => {
    if (!playing || p.videoSrc) return;
    const id = setInterval(() => setT((x) => x + 0.25), 250);
    return () => clearInterval(id);
  }, [playing, p.videoSrc]);
  useEffect(() => {
    if (t >= len) {
      setIdx((i) => (i + 1) % programs.length);
      setT(0);
    }
  }, [t, len, programs.length]);

  const { slide, subtitle } = at(p, t);
  const s = p.slides[slide]!;
  const zap = (d: number) => {
    setIdx((i) => (i + d + programs.length) % programs.length);
    setT(0);
  };
  useMenuCommands(
    {
      "tv.pause": () => setPlaying((x) => !x),
      "tv.precedent": () => zap(-1),
      "tv.suivant": () => zap(1),
      "tv.zapper": () => signal("tv:zapper"),
      "tv.soustitres": () => setSoustitres((x) => !x),
      "tv.bandeau": () => setBandeau((x) => !x),
    },
    { "tv.soustitres": { checked: soustitres }, "tv.bandeau": { checked: bandeau } },
  );

  return (
    <div className="app-col tv">
      <div className="tv-ecran" data-testid="tv-screen">
        {p.videoSrc ? (
          <video src={p.videoSrc} autoPlay={playing} controls={false} onEnded={() => zap(1)} />
        ) : (
          <img key={`${idx}-${slide}`} src={s.image} alt="" className="tv-image" referrerPolicy="no-referrer" style={{ animationDuration: `${s.seconds + 1}s` }} />
        )}
        <div className="tv-logo">
          <span>{p.channel}</span>
          <i>Direct</i>
        </div>
        {bandeau && s.chyron && (
          <div className="tv-chyron">
            <b>{p.kind === "publicite" ? "Pub" : "Info"}</b>
            <span>{s.chyron}</span>
          </div>
        )}
        {s.caption && <div className="tv-mention">{s.caption}</div>}
        {soustitres && subtitle && <p className="tv-soustitre">{subtitle}</p>}
        {!playing && <div className="tv-pause">Pause</div>}
      </div>
      <div className="pk-toolbar tv-commandes">
        <button className="pk-btn small" onClick={() => zap(-1)}>◂ Programme précédent</button>
        <button className="pk-btn small" onClick={() => setPlaying((x) => !x)}>{playing ? "Pause" : "Lecture"}</button>
        <button className="pk-btn small" onClick={() => zap(1)}>Programme suivant ▸</button>
        <button className="pk-btn small" onClick={() => signal("tv:zapper")} data-testid="tv-zapper">Zapper</button>
        <div className="tv-progression pk-sunken" aria-hidden="true">
          <i style={{ width: `${Math.min(100, (t / len) * 100)}%` }} />
        </div>
      </div>
      <div className="tv-guide">
        <b>{str("tv.canal")}</b>
        <ol>
          {programs.map((x, i) => (
            <li key={x.id}>
              <button aria-current={i === idx} onClick={() => { setIdx(i); setT(0); }}>
                {x.title}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
