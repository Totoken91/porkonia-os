"use client";
/**
 * Channel Pork : trois chaînes en direct (toutes « Canal 1 »). Chaque grille tourne sur l'horloge réelle :
 * on arrive en cours d'émission, on regarde ou on zappe. Voix off et musique suivent le direct.
 */
import { useEffect, useRef, useState } from "react";
import { useMenuCommands, useOs } from "@/os/context";
import { EcranVhs } from "./EcranVhs";
import { useSonTv } from "./sonTv";
import { DECALAGE, at, live, sousTitre, voiceAt } from "./timeline";

export function ChannelPork() {
  const { pack, str, signal, settings, playSound } = useOs();
  const chaines = pack.channels;
  const [ci, setCi] = useState(0);
  const [maintenant, setMaintenant] = useState(() => Date.now() / 1000);
  const [soustitres, setSoustitres] = useState(true);
  const [bandeau, setBandeau] = useState(true);
  const [son, setSon] = useState(true);
  const zaps = useRef(0);

  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now() / 1000), 250);
    return () => clearInterval(id);
  }, []);

  const ch = chaines[ci]!;
  const direct = live(ch, pack.programs, maintenant, ci * DECALAGE);
  const p = direct.program;
  const t = direct.t;
  const { slide } = at(p, t);
  const subtitle = sousTitre(p, t);
  const s = p.slides[slide]!;
  const debut = p.slides.slice(0, slide).reduce((acc, x) => acc + x.seconds, 0);
  const cleProgramme = `${ci}-${direct.slot}-${Math.round(maintenant + ci * DECALAGE - t)}`;
  const voix = voiceAt(p, t);

  const son_ = useSonTv({
    actif: son && settings.sons,
    lecture: true,
    musique: p.music,
    voix: voix ? { cle: `${cleProgramme}-${voix.index}`, src: voix.src, offset: voix.offset } : null,
    precharge: [...p.subtitles, ...direct.suivant.subtitles].flatMap((x) => (x.voice ? [x.voice] : [])),
  });

  const zap = (d: number) => {
    const n = chaines.length;
    setCi((i) => (i + d + n) % n);
    playSound("neige");
    zaps.current++;
    if (zaps.current % n === 0) signal("tv:tour");
  };
  const auHasard = () => zap(1 + Math.floor(Math.random() * Math.max(1, chaines.length - 1)));

  useMenuCommands(
    {
      "tv.precedent": () => zap(-1),
      "tv.suivant": () => zap(1),
      "tv.zapper": auHasard,
      "tv.soustitres": () => setSoustitres((x) => !x),
      "tv.bandeau": () => setBandeau((x) => !x),
      "tv.son": () => setSon((x) => !x),
    },
    { "tv.soustitres": { checked: soustitres }, "tv.bandeau": { checked: bandeau }, "tv.son": { checked: son && settings.sons, disabled: !settings.sons } },
  );

  const etiquette = p.etiquette ?? str(`tv.etiquette.${p.kind}`);
  const suivants = chaines.map((c, i) => live(c, pack.programs, maintenant, i * DECALAGE));

  // Images des émissions en cours sur les autres chaînes : chargées d'avance pour zapper sans attendre.
  const aPrecharger = suivants.flatMap((x) => [...x.program.slides, ...x.suivant.slides.slice(0, 1)].map((d) => d.image)).join("|");
  useEffect(() => {
    for (const src of aPrecharger.split("|")) {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.src = src;
    }
  }, [aPrecharger]);

  return (
    <div className="app-col tv" onPointerDown={() => son_.bloque && son_.debloquer()}>
      <EcranVhs
        image={p.videoSrc ? null : s.image}
        video={p.videoSrc}
        cadrage={s.focus}
        fixe={s.fixe}
        zoom={s.zoom}
        fond={s.fond}
        bulletin={
          s.meteo
            ? {
                titre: s.meteo.titre,
                points: s.meteo.points.flatMap((pt) => {
                  const pos = pack.carteMeteo.lieux[pt.lieu];
                  return pos ? [{ x: pos[0], y: pos[1], nom: pt.lieu, icone: pt.icone, temp: pt.temp, texte: pt.texte, vent: pt.vent }] : [];
                }),
              }
            : null
        }
        progression={Math.min(1, (t - debut) / s.seconds)}
        cle={`${cleProgramme}-${slide}`}
        programme={cleProgramme}
        lecture
        chaine={ch.name}
        numero={ci + 1}
        bandeau={bandeau && s.chyron ? { etiquette, texte: s.chyron } : null}
        mention={s.caption}
        soustitre={soustitres && !s.meteo && !s.fond ? subtitle : null}
      />
      {son_.bloque && (
        <button className="pk-btn tv-activer-son" onClick={son_.debloquer} data-testid="tv-activer-son">
          {str("tv.activerSon")}
        </button>
      )}
      <div className="pk-toolbar tv-commandes">
        <button className="pk-btn small" onClick={() => zap(-1)} data-testid="tv-precedente">◂ Chaîne</button>
        <span className="tv-numero pk-sunken" aria-live="polite">
          {String(ci + 1).padStart(2, "0")} · {ch.name}
        </span>
        <button className="pk-btn small" onClick={() => zap(1)} data-testid="tv-zapper">Chaîne ▸</button>
        <button className="pk-btn small" aria-pressed={son && settings.sons} disabled={!settings.sons} onClick={() => setSon((x) => !x)} data-testid="tv-son">
          {son && settings.sons ? "Son" : "Muet"}
        </button>
        <div className="tv-progression pk-sunken" aria-hidden="true">
          <i style={{ width: `${Math.min(100, (t / p.slides.reduce((a, x) => a + x.seconds, 0)) * 100)}%` }} />
        </div>
      </div>
      <div className="tv-guide">
        <b>{str("tv.canal")}</b>
        <ol>
          {chaines.map((c, i) => (
            <li key={c.id}>
              <button aria-current={i === ci} onClick={() => i !== ci && zap(i - ci)}>
                <span className="tv-guide-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="tv-guide-chaine">{c.name}</span>
                <span className="tv-guide-prog">{suivants[i]!.program.title}</span>
                <span className="tv-guide-suite">
                  {str("tv.aSuivre")} : {suivants[i]!.suivant.title}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
