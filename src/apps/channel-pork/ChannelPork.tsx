"use client";
/**
 * Channel Pork : un vrai téléviseur. Cinq chaînes en direct (toutes « Canal 1 »), chacune calée sur l'horloge
 * réelle : on arrive en cours d'émission, on regarde ou on zappe. En façade : chaîne ▲▼, volume − +,
 * afficheur du numéro de chaîne et bouton de marche (qui ferme la fenêtre). On déplace le poste par sa coque.
 * Clavier (fenêtre au premier plan) : flèches haut/bas pour les chaînes, + et − pour le volume.
 */
import { useEffect, useRef, useState } from "react";
import { useOs, useWin } from "@/os/context";
import { EcranVhs } from "./EcranVhs";
import { useSonTv } from "./sonTv";
import { DECALAGE, at, live, sousTitre, voiceAt } from "./timeline";

const VOLUME_DEFAUT = 7;

export function ChannelPork() {
  const { pack, str, signal, settings, playSound } = useOs();
  const { focused, close } = useWin();
  const chaines = pack.channels;
  const [ci, setCi] = useState(0);
  const [maintenant, setMaintenant] = useState(() => Date.now() / 1000);
  const [volume, setVolume] = useState(VOLUME_DEFAUT);
  const [osdVolume, setOsdVolume] = useState<number | null>(null);
  const zaps = useRef(0);
  const minuterieOsd = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const duree = p.slides.reduce((acc, x) => acc + x.seconds, 0);
  const debut = p.slides.slice(0, slide).reduce((acc, x) => acc + x.seconds, 0);
  const cleProgramme = `${ci}-${direct.slot}-${Math.round(maintenant + ci * DECALAGE - t)}`;
  const voix = voiceAt(p, t);

  const son = useSonTv({
    actif: settings.sons,
    lecture: true,
    musique: p.music,
    calage: p.clip ? { cle: cleProgramme, t } : undefined,
    voix: voix ? { cle: `${cleProgramme}-${voix.index}`, src: voix.src, offset: voix.offset } : null,
    precharge: [...p.subtitles, ...direct.suivant.subtitles].flatMap((x) => (x.voice ? [x.voice] : [])),
    volume: volume / 10,
  });

  const zap = (d: number) => {
    const n = chaines.length;
    setCi((i) => (i + d + n) % n);
    playSound("neige");
    zaps.current++;
    if (zaps.current % n === 0) signal("tv:tour");
  };
  const regler = (d: number) => {
    setVolume((v) => {
      const n = Math.max(0, Math.min(10, v + d));
      setOsdVolume(n);
      return n;
    });
    if (minuterieOsd.current) clearTimeout(minuterieOsd.current);
    minuterieOsd.current = setTimeout(() => setOsdVolume(null), 2200);
  };

  // Télécommande au clavier, seulement quand le poste est au premier plan.
  const commandes = useRef({ zap, regler });
  commandes.current = { zap, regler };
  useEffect(() => {
    if (!focused) return;
    const touche = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea") || document.querySelector(".dialog-layer")) return;
      const c = commandes.current;
      if (e.key === "ArrowUp" || e.key === "PageUp") c.zap(1);
      else if (e.key === "ArrowDown" || e.key === "PageDown") c.zap(-1);
      else if (e.key === "+" || e.key === "=") c.regler(1);
      else if (e.key === "-") c.regler(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [focused]);

  const etiquette = p.etiquette ?? str(`tv.etiquette.${p.kind}`);

  // Images des émissions en cours sur les autres chaînes : chargées d'avance pour zapper sans attendre.
  const aPrecharger = [...new Set(chaines.flatMap((c, i) => {
    const x = live(c, pack.programs, maintenant, i * DECALAGE);
    return [...x.program.slides, ...x.suivant.slides.slice(0, 1)].map((d) => d.image);
  }))].join("|");
  useEffect(() => {
    for (const src of aPrecharger.split("|")) {
      const img = new Image();
      img.referrerPolicy = "no-referrer";
      img.src = src;
    }
  }, [aPrecharger]);

  return (
    <div className="tele" data-poignee onPointerDown={() => son.bloque && son.debloquer()}>
      <div className="tele-tube" data-poignee>
        <EcranVhs
          image={p.videoSrc ? null : s.image}
          video={p.videoSrc}
          cadrage={s.focus}
          fixe={s.fixe}
          zoom={s.zoom}
          fond={s.fond}
          clip={p.clip && (t < 9 || t > duree - 9) ? p.clip : null}
          osdVolume={osdVolume}
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
          bandeau={s.chyron ? { etiquette, texte: s.chyron } : null}
          mention={s.caption}
          soustitre={!s.meteo && !s.fond ? subtitle : null}
        />
        {son.bloque && (
          <button className="pk-btn tv-activer-son" onClick={son.debloquer} data-testid="tv-activer-son">
            {str("tv.activerSon")}
          </button>
        )}
      </div>
      <div className="tele-facade" data-poignee>
        <div className="tele-marque" data-poignee>
          <b>{str("tv.marque")}</b>
          <span>{str("tv.modele")}</span>
        </div>
        <span className="tele-afficheur tv-numero" aria-live="polite" title={ch.name}>
          {String(ci + 1).padStart(2, "0")}
        </span>
        <div className="tele-groupe">
          <span className="tele-legende">{str("tv.chaine")}</span>
          <button className="tele-bouton" aria-label={str("tv.chaineMoins")} onClick={() => zap(-1)} data-testid="tv-precedente">
            ▼
          </button>
          <button className="tele-bouton" aria-label={str("tv.chainePlus")} onClick={() => zap(1)} data-testid="tv-zapper">
            ▲
          </button>
        </div>
        <div className="tele-groupe">
          <span className="tele-legende">{str("tv.volume")}</span>
          <button className="tele-bouton" aria-label={str("tv.volumeMoins")} onClick={() => regler(-1)} data-testid="tv-volume-moins">
            −
          </button>
          <button className="tele-bouton" aria-label={str("tv.volumePlus")} onClick={() => regler(1)} data-testid="tv-volume-plus">
            +
          </button>
        </div>
        <button className="tele-marche" aria-label={str("tv.eteindre")} onClick={close} data-testid="window-close">
          <i className="tele-voyant" />
        </button>
      </div>
    </div>
  );
}
