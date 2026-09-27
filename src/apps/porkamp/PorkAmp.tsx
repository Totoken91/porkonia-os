"use client";
/**
 * PorkAmp : lecteur de musique d'époque, dans son boîtier (fenêtre habillée). Afficheur à cristaux liquides,
 * temps écoulé, titre défilant, analyseur de spectre branché sur la vraie sortie audio, liste de lecture.
 * Touches d'époque quand il est au premier plan : Z précédente, X lecture, C pause, V arrêt, B suivante.
 */
import { useEffect, useRef, useState } from "react";
import { useOs, useWin } from "@/os/context";
import { contexteAudio } from "@/os/sons";
import { autrePiste, formatTemps, titreDefilant } from "./logic";

type Etat = "arret" | "lecture" | "pause";

const BARRES = 19;

function Glyphe({ d }: { d: string }) {
  return (
    <svg width="11" height="9" viewBox="0 0 11 9" aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}
const G = {
  precedente: "M0 0h2v9H0zM2 4.5L7 0v9zM6 4.5L11 0v9z",
  lecture: "M2 0l8 4.5L2 9z",
  pause: "M2 0h3v9H2zM7 0h3v9H7z",
  stop: "M1 0h9v9H1z",
  suivante: "M0 0l5 4.5L0 9zM4 0l5 4.5L4 9zM9 0h2v9H9z",
};

export function PorkAmp() {
  const { pack, str, signal } = useOs();
  const { close, minimize, focused } = useWin();
  const pistes = pack.lecteur.pistes;
  const [i, setI] = useState(0);
  const [etat, setEtat] = useState<Etat>("arret");
  const [pos, setPos] = useState(0);
  const [durees, setDurees] = useState<number[]>(() => pistes.map(() => NaN));
  const [volume, setVolume] = useState(70);
  const [alea, setAlea] = useState(false);
  const [boucle, setBoucle] = useState(true);
  const audio = useRef<HTMLAudioElement | null>(null);
  const analyseur = useRef<AnalyserNode | null>(null);
  const toile = useRef<HTMLCanvasElement>(null);

  // Un seul élément audio pour tout le lecteur ; il se tait quand on ferme la fenêtre.
  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    audio.current = a;
    const temps = () => setPos(a.currentTime);
    const fin = () => finRef.current();
    a.addEventListener("timeupdate", temps);
    a.addEventListener("ended", fin);
    return () => {
      a.removeEventListener("timeupdate", temps);
      a.removeEventListener("ended", fin);
      a.pause();
      a.removeAttribute("src");
      a.load();
    };
  }, []);

  // Durées de la liste de lecture : on ne lit que l'en-tête de chaque fichier.
  useEffect(() => {
    const els = pistes.map((p, k) => {
      const x = new Audio();
      x.preload = "metadata";
      x.onloadedmetadata = () => setDurees((d) => d.map((v, j) => (j === k ? x.duration : v)));
      x.src = p.src;
      return x;
    });
    return () => els.forEach((x) => (x.onloadedmetadata = null));
  }, [pistes]);

  useEffect(() => {
    if (audio.current) audio.current.volume = volume / 100;
  }, [volume]);

  /** Branche la sortie sur un analyseur (une seule fois par élément, c'est la règle du navigateur). */
  const brancher = () => {
    const a = audio.current;
    const ctx = contexteAudio();
    if (!a || !ctx || analyseur.current) return;
    try {
      const an = ctx.createAnalyser();
      an.fftSize = 64;
      an.smoothingTimeConstant = 0.6;
      ctx.createMediaElementSource(a).connect(an).connect(ctx.destination);
      analyseur.current = an;
    } catch {
      /* pas de spectre : le son passe quand même */
    }
  };

  const lire = (k = i) => {
    const a = audio.current;
    if (!a) return;
    if (k !== i || !a.getAttribute("src")) {
      a.src = pistes[k]!.src;
      setI(k);
      setPos(0);
    }
    brancher();
    void a.play().then(
      () => setEtat("lecture"),
      () => setEtat("arret"),
    );
  };
  const pause = () => {
    const a = audio.current;
    if (!a) return;
    if (etat === "pause") return lire();
    if (etat !== "lecture") return;
    a.pause();
    setEtat("pause");
  };
  const arret = () => {
    const a = audio.current;
    if (!a) return;
    a.pause();
    if (a.getAttribute("src")) a.currentTime = 0;
    setPos(0);
    setEtat("arret");
  };
  const changer = (pas: 1 | -1) => {
    const k = autrePiste(i, pistes.length, pas, alea, Math.random());
    if (etat === "lecture") lire(k);
    else {
      const a = audio.current;
      if (a) a.src = pistes[k]!.src;
      setI(k);
      setPos(0);
      setEtat("arret");
    }
  };
  const finRef = useRef(() => {});
  finRef.current = () => {
    signal("porkamp:fin");
    if (boucle || alea || i < pistes.length - 1) lire(autrePiste(i, pistes.length, 1, alea, Math.random()));
    else arret();
  };

  // Touches d'époque, seulement au premier plan.
  const touches = useRef({ lire, pause, arret, changer });
  touches.current = { lire, pause, arret, changer };
  useEffect(() => {
    if (!focused) return;
    const f = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea") || document.querySelector(".dialog-layer")) return;
      const t = touches.current;
      const k = e.key.toLowerCase();
      if (k === "x") t.lire();
      else if (k === "c") t.pause();
      else if (k === "v") t.arret();
      else if (k === "b") t.changer(1);
      else if (k === "z") t.changer(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [focused]);

  // Analyseur de spectre : barres en pavés, vertes en bas, jaunes, puis rouges ; retombent à l'arrêt.
  const enLecture = useRef(false);
  enLecture.current = etat === "lecture";
  useEffect(() => {
    const c = toile.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const niveaux = new Array<number>(BARRES).fill(0);
    const donnees = new Uint8Array(32);
    let raf = 0;
    const dessiner = () => {
      raf = requestAnimationFrame(dessiner);
      const an = analyseur.current;
      if (an && enLecture.current) an.getByteFrequencyData(donnees);
      for (let b = 0; b < BARRES; b++) {
        const cible = an && enLecture.current ? (donnees[Math.min(31, 1 + Math.floor(b * 1.4))]! / 255) * 16 : 0;
        niveaux[b] = cible > niveaux[b]! ? cible : Math.max(0, niveaux[b]! - 0.5);
      }
      g.fillStyle = "#000";
      g.fillRect(0, 0, c.width, c.height);
      for (let b = 0; b < BARRES; b++) {
        const h = Math.round(niveaux[b]!);
        for (let y = 0; y < h; y++) {
          g.fillStyle = y > 12 ? "#ff4a3a" : y > 8 ? "#ffd23a" : "#5dff72";
          g.fillRect(b * 8, c.height - 2 - y * 2, 6, 1);
        }
      }
    };
    raf = requestAnimationFrame(dessiner);
    return () => cancelAnimationFrame(raf);
  }, []);

  const piste = pistes[i]!;
  const duree = durees[i] ?? NaN;
  const defile = etat === "arret" && pos === 0 ? str("amp.arrete", { slogan: pack.lecteur.slogan }) : titreDefilant(i, piste, duree);
  const total = durees.reduce((a, d) => a + (Number.isFinite(d) ? d : 0), 0);

  return (
    <div className="amp">
      <div className="amp-titre" data-poignee>
        <b className="amp-logo">PorkAmp</b>
        <span className="amp-sous">{pack.lecteur.slogan}</span>
        <button className="tuner-mini" aria-label={str("tv.reduire")} onClick={minimize}>
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M0 7h7" stroke="currentColor" strokeWidth="2" /></svg>
        </button>
        <button className="tuner-mini" aria-label={str("tv.fermer")} onClick={close} data-testid="window-close">
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M0 0l8 8M8 0L0 8" stroke="currentColor" strokeWidth="1.8" /></svg>
        </button>
      </div>
      <div className="amp-ecran" data-poignee>
        <div className="amp-gauche">
          <span className="amp-etat" aria-hidden="true">
            <Glyphe d={etat === "lecture" ? G.lecture : etat === "pause" ? G.pause : G.stop} />
          </span>
          <span className={`amp-temps${etat === "pause" ? " clignote" : ""}`} data-testid="amp-temps">
            {formatTemps(pos)}
          </span>
          <canvas ref={toile} className="amp-spectre" width={152} height={34} aria-hidden="true" />
        </div>
        <div className="amp-droite">
          <div className="amp-defile" aria-label={`${piste.artiste} - ${piste.titre}`}>
            <span data-testid="amp-titre">{defile.repeat(2)}</span>
          </div>
          <div className="amp-infos">{pack.lecteur.infos}</div>
        </div>
      </div>
      <input
        className="amp-position"
        type="range"
        min={0}
        max={Number.isFinite(duree) ? Math.floor(duree) : 0}
        value={Math.floor(pos)}
        onChange={(e) => {
          const a = audio.current;
          if (a && a.getAttribute("src")) a.currentTime = Number(e.target.value);
          setPos(Number(e.target.value));
        }}
        aria-label={str("amp.position")}
      />
      <div className="amp-commandes">
        <button className="tuner-bouton" aria-label={str("amp.precedente")} onClick={() => changer(-1)}>
          <Glyphe d={G.precedente} />
        </button>
        <button className="tuner-bouton" aria-label={str("amp.lecture")} onClick={() => lire()} data-testid="amp-lecture">
          <Glyphe d={G.lecture} />
        </button>
        <button className="tuner-bouton" aria-label={str("amp.pause")} onClick={pause} data-testid="amp-pause">
          <Glyphe d={G.pause} />
        </button>
        <button className="tuner-bouton" aria-label={str("amp.stop")} onClick={arret} data-testid="amp-stop">
          <Glyphe d={G.stop} />
        </button>
        <button className="tuner-bouton" aria-label={str("amp.suivante")} onClick={() => changer(1)} data-testid="amp-suivante">
          <Glyphe d={G.suivante} />
        </button>
        <button className={`tuner-bouton amp-bascule${alea ? " actif" : ""}`} aria-pressed={alea} onClick={() => setAlea((x) => !x)}>
          {str("amp.alea")}
        </button>
        <button className={`tuner-bouton amp-bascule${boucle ? " actif" : ""}`} aria-pressed={boucle} onClick={() => setBoucle((x) => !x)}>
          {str("amp.boucle")}
        </button>
        <input className="amp-volume" type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label={str("amp.volume")} />
      </div>
      <ol className="amp-liste" aria-label={str("amp.liste")} data-testid="amp-liste">
        {pistes.map((p, k) => (
          <li key={p.src} className={k === i ? "courante" : undefined} onDoubleClick={() => lire(k)}>
            <span>{`${k + 1}. ${p.artiste} - ${p.titre}`}</span>
            <span>{formatTemps(durees[k] ?? NaN)}</span>
          </li>
        ))}
      </ol>
      <div className="amp-pied" data-poignee>
        {str("amp.total", { n: pistes.length, duree: formatTemps(total) })}
      </div>
    </div>
  );
}
