"use client";
/** Channel Pork : Canal 1, le seul. Diaporama d'archives + sous-titres + bandeau (ou vraie vidéo si fournie). */
import { useEffect, useState } from "react";
import { useMenuCommands, useOs } from "@/os/context";
import { EcranVhs } from "./EcranVhs";
import { useSonTv } from "./sonTv";
import { at, programLength, voiceAt } from "./timeline";

export function ChannelPork() {
  const { pack, str, signal, settings } = useOs();
  const programs = pack.programs;
  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [soustitres, setSoustitres] = useState(true);
  const [bandeau, setBandeau] = useState(true);
  const [son, setSon] = useState(true);
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
  const voix = voiceAt(p, t);
  useSonTv({
    actif: son && settings.sons,
    lecture: playing,
    musique: p.music,
    voix: voix ? { cle: `${idx}-${voix.index}`, src: voix.src, offset: voix.offset } : null,
  });
  const s = p.slides[slide]!;
  const debut = p.slides.slice(0, slide).reduce((acc, x) => acc + x.seconds, 0);
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
      "tv.son": () => setSon((x) => !x),
    },
    { "tv.soustitres": { checked: soustitres }, "tv.bandeau": { checked: bandeau }, "tv.son": { checked: son && settings.sons, disabled: !settings.sons } },
  );

  return (
    <div className="app-col tv">
      <EcranVhs
        image={p.videoSrc ? null : s.image}
        video={p.videoSrc}
        progression={Math.min(1, (t - debut) / s.seconds)}
        cle={`${idx}-${slide}`}
        programme={`${idx}-${p.id}`}
        temps={t}
        lecture={playing}
        chaine={p.channel}
        bandeau={bandeau && s.chyron ? { etiquette: p.kind === "publicite" ? "Pub" : "Info", texte: s.chyron } : null}
        mention={s.caption}
        soustitre={soustitres ? subtitle : null}
      />
      <div className="pk-toolbar tv-commandes">
        <button className="pk-btn small" onClick={() => zap(-1)}>◂ Programme précédent</button>
        <button className="pk-btn small" onClick={() => setPlaying((x) => !x)}>{playing ? "Pause" : "Lecture"}</button>
        <button className="pk-btn small" onClick={() => zap(1)}>Programme suivant ▸</button>
        <button className="pk-btn small" onClick={() => signal("tv:zapper")} data-testid="tv-zapper">Zapper</button>
        <button className="pk-btn small" aria-pressed={son && settings.sons} disabled={!settings.sons} onClick={() => setSon((x) => !x)} data-testid="tv-son">
          {son && settings.sons ? "Son" : "Muet"}
        </button>
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
