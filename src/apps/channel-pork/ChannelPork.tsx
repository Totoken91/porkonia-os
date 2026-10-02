"use client";
/**
 * Channel Pork, vu par PorkTV, le logiciel de la carte tuner d'État : cinq chaînes en direct (toutes
 * « Canal 1 »), chacune calée sur l'horloge réelle : on arrive en cours d'émission, on regarde ou on zappe.
 * Habillage façon logiciel des années 90 : barre de titre dessinée, image plate, afficheur à cristaux
 * liquides (chaîne, émission qui défile, volume), boutons CH − + et VOL − +. On déplace la fenêtre par
 * son panneau. Clavier (fenêtre au premier plan) : flèches haut/bas pour les chaînes, + et − pour le volume.
 * Plein écran (bouton du titre, double appui ou touche F) : l'image seule occupe tout l'appareil, en paysage si
 * le navigateur le permet ; une télécommande apparaît au toucher puis s'efface.
 */
import { useEffect, useRef, useState } from "react";
import { useOs, useWin } from "@/os/context";
import { EcranVhs } from "./EcranVhs";
import { Teletexte } from "./Teletexte";
import { voisine } from "./teletexte";
import { useSonTv } from "./sonTv";
import { DECALAGE, at, live, sousTitre, voiceAt } from "./timeline";

const VOLUME_DEFAUT = 7;

export function ChannelPork() {
  const { pack, str, signal, settings, playSound } = useOs();
  const { focused, close, minimize } = useWin();
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
    musique: p.bande ?? p.music,
    calage: p.clip || p.bande ? { cle: cleProgramme, t } : undefined,
    voix: voix ? { cle: `${cleProgramme}-${voix.index}`, src: voix.src, offset: voix.offset } : null,
    precharge: [...p.subtitles, ...direct.suivant.subtitles].flatMap((x) => (x.voice ? [x.voice] : [])),
    volume: volume / 10,
  });

  // Émission regardée en entier : prise dans ses premières secondes et quittée par sa fin, pas par un zapping.
  const suivi = useRef<{ cle: string; ci: number; id: string; depuis: number } | null>(null);
  useEffect(() => {
    const avant = suivi.current;
    if (avant?.cle === cleProgramme) return;
    if (avant && avant.ci === ci && avant.depuis <= 8) signal(`tv:integral:${avant.id}`);
    suivi.current = { cle: cleProgramme, ci, id: p.id, depuis: t };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleProgramme]);

  // Télétexte : page affichée (null = image), chiffres en cours de saisie.
  const [txt, setTxt] = useState<number | null>(null);
  const [saisie, setSaisie] = useState("");
  const allerPage = (n: number) => {
    setSaisie("");
    setTxt(n);
    signal(`tv:txt:${n}`);
  };
  const basculerTxt = () => {
    setSaisie("");
    if (txt === null) allerPage(100);
    else setTxt(null);
  };
  const chiffre = (c: string) => {
    const s2 = saisie + c;
    if (s2.length < 3) setSaisie(s2);
    else allerPage(Number(s2));
  };

  const zap = (d: number) => {
    if (txt !== null) return allerPage(voisine(pack, txt, d > 0 ? 1 : -1));
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

  // Plein écran : API du navigateur quand elle existe (elle ignore l'échelle du moniteur et permet de verrouiller le
  // paysage), sinon une couche fixe par-dessus tout (iPhone, qui ne met en plein écran que les vidéos).
  const image = useRef<HTMLDivElement>(null);
  const [plein, setPlein] = useState(false);
  const natif = useRef(false);
  const [telecommande, setTelecommande] = useState(true);
  const minuterieTel = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reveiller = () => {
    setTelecommande(true);
    if (minuterieTel.current) clearTimeout(minuterieTel.current);
    minuterieTel.current = setTimeout(() => setTelecommande(false), 3500);
  };
  const orientation = () => (typeof screen !== "undefined" ? (screen.orientation as unknown as { lock?(o: string): Promise<void>; unlock?(): void } | undefined) : undefined);
  const entrer = () => {
    setPlein(true);
    reveiller();
    signal("tv:plein-ecran");
    const el = image.current;
    if (!el?.requestFullscreen) return;
    el.requestFullscreen({ navigationUI: "hide" })
      .then(() => {
        natif.current = true;
        orientation()?.lock?.("landscape").catch(() => {});
      })
      .catch(() => {});
  };
  const sortir = () => {
    setPlein(false);
    if (natif.current && document.fullscreenElement === image.current) document.exitFullscreen().catch(() => {});
    natif.current = false;
    try {
      orientation()?.unlock?.();
    } catch {
      /* orientation non verrouillée */
    }
  };
  useEffect(() => {
    const on = () => {
      if (natif.current && document.fullscreenElement !== image.current) {
        natif.current = false;
        setPlein(false);
      }
    };
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  // Pendant le plein écran de secours, les barres du système s'effacent.
  useEffect(() => {
    if (!plein) return;
    document.body.dataset.tvPlein = "1";
    return () => {
      delete document.body.dataset.tvPlein;
    };
  }, [plein]);

  // Télécommande au clavier, seulement quand le poste est au premier plan.
  const commandes = useRef({ zap, regler, basculerTxt, chiffre, enTxt: txt !== null, plein, entrer, sortir });
  commandes.current = { zap, regler, basculerTxt, chiffre, enTxt: txt !== null, plein, entrer, sortir };
  useEffect(() => {
    if (!focused) return;
    const touche = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea") || document.querySelector(".dialog-layer")) return;
      const c = commandes.current;
      if (e.key === "ArrowUp" || e.key === "PageUp") c.zap(1);
      else if (e.key === "ArrowDown" || e.key === "PageDown") c.zap(-1);
      else if (e.key === "+" || e.key === "=") c.regler(1);
      else if (e.key === "-") c.regler(-1);
      else if (e.key === "t" || e.key === "T") c.basculerTxt();
      else if (e.key === "f" || e.key === "F") (c.plein ? c.sortir() : c.entrer());
      else if (c.plein && e.key === "Escape" && !c.enTxt) c.sortir();
      else if (c.enTxt && /^[0-9]$/.test(e.key)) c.chiffre(e.key);
      else if (c.enTxt && e.key === "Escape") c.basculerTxt();
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
    <div className="tuner" onPointerDown={() => son.bloque && son.debloquer()}>
      <div className="tuner-titre" data-poignee>
        <b className="tuner-logo">{str("tv.logiciel")}</b>
        <span className="tuner-sous">{str("tv.logiciel.sous")}</span>
        <button className="tuner-mini" aria-label={str("tv.plein-ecran")} title={str("tv.plein-ecran")} onClick={entrer} data-testid="tv-plein-ecran">
          <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true"><path d="M0.5 3V0.5H3M6 0.5h2.5V3M8.5 6v2.5H6M3 8.5H0.5V6" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
        </button>
        <button className="tuner-mini" aria-label={str("tv.reduire")} onClick={minimize}>
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M0 7h7" stroke="currentColor" strokeWidth="2" /></svg>
        </button>
        <button className="tuner-mini" aria-label={str("tv.fermer")} onClick={close} data-testid="window-close">
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M0 0l8 8M8 0L0 8" stroke="currentColor" strokeWidth="1.8" /></svg>
        </button>
      </div>
      <div
        className={`tuner-image${plein ? " plein" : ""}`}
        ref={image}
        onDoubleClick={() => (plein ? sortir() : entrer())}
        onPointerDown={() => plein && reveiller()}
        data-testid="tv-image"
      >
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
          habillage={p.sansHabillage ? null : ch.habillage}
          numero={ci + 1}
          bandeau={s.chyron ? { etiquette, texte: s.chyron } : null}
          mention={s.caption}
          soustitre={!s.meteo && !s.fond ? subtitle : null}
        />
        {txt !== null && <Teletexte page={txt} saisie={saisie} maintenant={maintenant} onPage={allerPage} />}
        {son.bloque && (
          <button className="pk-btn tv-activer-son" onClick={son.debloquer} data-testid="tv-activer-son">
            {str("tv.activerSon")}
          </button>
        )}
        {plein && (
          <>
            <p className="tv-paysage" aria-hidden="true">
              {str("tv.plein-ecran.paysage")}
            </p>
            <div className={`tv-telecommande${telecommande ? " visible" : ""}`} onPointerDown={(e) => (e.stopPropagation(), reveiller())} onDoubleClick={(e) => e.stopPropagation()}>
              <span className="tv-tel-numero">{String(ci + 1).padStart(2, "0")}</span>
              <button className="tuner-bouton" aria-label={str("tv.chaineMoins")} onClick={() => zap(-1)}>
                CH−
              </button>
              <button className="tuner-bouton" aria-label={str("tv.chainePlus")} onClick={() => zap(1)} data-testid="tv-plein-zapper">
                CH+
              </button>
              <button className="tuner-bouton" aria-label={str("tv.volumeMoins")} onClick={() => regler(-1)}>
                VOL−
              </button>
              <button className="tuner-bouton" aria-label={str("tv.volumePlus")} onClick={() => regler(1)}>
                VOL+
              </button>
              <button className={`tuner-bouton tuner-txt${txt !== null ? " actif" : ""}`} aria-label={str("tv.teletexte")} aria-pressed={txt !== null} onClick={basculerTxt}>
                {str("tv.txt")}
              </button>
              <button className="tuner-bouton" aria-label={str("tv.plein-ecran.quitter")} onClick={sortir} data-testid="tv-plein-sortir">
                <svg width="14" height="14" viewBox="0 0 9 9" aria-hidden="true"><path d="M3 0.5V3H0.5M6 0.5V3h2.5M8.5 6H6v2.5M3 8.5V6H0.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
              </button>
            </div>
          </>
        )}
      </div>
      <div className="tuner-pupitre" data-poignee>
        <div className="tuner-lcd" aria-live="polite">
          <div className="tuner-lcd-ligne">
            <span className="tv-numero">
              {str("tv.chaine")} {String(ci + 1).padStart(2, "0")}
            </span>
            <span className="tuner-lcd-chaine">{ch.name.toUpperCase()}</span>
          </div>
          <div className="tuner-lcd-defile" aria-label={p.title}>
            {/* Deux fois la même boucle : le défilement de -50 % retombe exactement sur ses pieds. */}
            <span>{`${p.title}  ·  ${str("tv.aSuivre")} : ${direct.suivant.title}  ·  `.repeat(2)}</span>
          </div>
          <div className="tuner-lcd-ligne">
            <span>{str("tv.volume")}</span>
            <span className="tuner-vu" aria-label={`${volume}/10`}>
              {Array.from({ length: 10 }, (_, i) => (
                <i key={i} className={i < volume ? "plein" : undefined} />
              ))}
            </span>
          </div>
        </div>
        <div className="tuner-commandes">
          <span className="tuner-legende">{str("tv.chaine")}</span>
          <button className="tuner-bouton" aria-label={str("tv.chaineMoins")} onClick={() => zap(-1)} data-testid="tv-precedente">
            −
          </button>
          <button className="tuner-bouton" aria-label={str("tv.chainePlus")} onClick={() => zap(1)} data-testid="tv-zapper">
            +
          </button>
          <span className="tuner-legende">{str("tv.volume")}</span>
          <button className="tuner-bouton" aria-label={str("tv.volumeMoins")} onClick={() => regler(-1)} data-testid="tv-volume-moins">
            −
          </button>
          <button className="tuner-bouton" aria-label={str("tv.volumePlus")} onClick={() => regler(1)} data-testid="tv-volume-plus">
            +
          </button>
          <button className={`tuner-bouton tuner-txt${txt !== null ? " actif" : ""}`} aria-label={str("tv.teletexte")} aria-pressed={txt !== null} onClick={basculerTxt} data-testid="tv-txt">
            {str("tv.txt")}
          </button>
        </div>
      </div>
    </div>
  );
}
