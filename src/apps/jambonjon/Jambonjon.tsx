"use client";
/**
 * Jambonjon : exploration des caves d'affinage en vue subjective, case par case. ZQSD pour marcher, A et E pour
 * tourner ; au doigt, une manette s'affiche sous la vue. La partie est sauvegardée à chaque tour dans ce navigateur.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Commandes } from "./commandes";
import type { Emplacement } from "@/content/types";
import { useEcran, useMenuCommands, useOs, useWin } from "@/os/context";
import { comparer, defMonstre, EMPLACEMENTS, emplacementDe, jouer, nomObjet, nouvellePartie, relirePartie, ROT_COUT, SAC_MAX, stats, xpPourNiveau, type Action, type Objet, type Partie } from "./logic";
import { angleDe, dessinerCarte, HAUTEUR, LARGEUR, preparer, rendre, type Camera } from "./rendu";

const CLE = "porkos.jambonjon.partie";

/* ----------------------------- Petits bruits ------------------------------ */

let audio: AudioContext | null = null;
function bruit(kind: string) {
  try {
    audio ??= new AudioContext();
    const a = audio;
    if (a.state === "suspended") void a.resume();
    const t = a.currentTime;
    const gain = a.createGain();
    gain.connect(a.destination);
    const osc = (type: OscillatorType, f0: number, f1: number, d: number, v: number, debut = 0) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t + debut);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + debut + d);
      g.gain.setValueAtTime(v, t + debut);
      g.gain.exponentialRampToValueAtTime(0.001, t + debut + d);
      o.connect(g).connect(gain);
      o.start(t + debut);
      o.stop(t + debut + d + 0.02);
    };
    const souffle = (d: number, v: number, f: number) => {
      const n = Math.floor(a.sampleRate * d);
      const b = a.createBuffer(1, n, a.sampleRate);
      const x = b.getChannelData(0);
      for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = a.createBufferSource();
      s.buffer = b;
      const fl = a.createBiquadFilter();
      fl.type = "lowpass";
      fl.frequency.value = f;
      const g = a.createGain();
      g.gain.value = v;
      s.connect(fl).connect(g).connect(gain);
      s.start(t);
    };
    switch (kind) {
      case "pas":
        souffle(0.09, 0.25, 500);
        break;
      case "mur":
        osc("square", 90, 60, 0.12, 0.12);
        break;
      case "frappe":
        souffle(0.12, 0.5, 2200);
        osc("square", 220, 80, 0.1, 0.1);
        break;
      case "touche":
        osc("sawtooth", 160, 50, 0.25, 0.18);
        break;
      case "tue":
        osc("square", 300, 40, 0.3, 0.12);
        break;
      case "ramasse":
        osc("square", 660, 990, 0.08, 0.08);
        osc("square", 990, 1320, 0.08, 0.08, 0.08);
        break;
      case "mange":
        souffle(0.25, 0.3, 900);
        break;
      case "boit":
        for (let k = 0; k < 4; k++) osc("sine", 300 + k * 60, 200, 0.07, 0.12, k * 0.09);
        break;
      case "rot":
        osc("sawtooth", 95, 55, 0.7, 0.3);
        osc("square", 70, 45, 0.7, 0.12);
        break;
      case "niveau":
        [523, 659, 784, 1046].forEach((f, k) => osc("square", f, f, 0.12, 0.08, k * 0.1));
        break;
      case "descente":
        osc("triangle", 300, 60, 0.8, 0.2);
        break;
      case "mort":
        osc("sawtooth", 200, 30, 1.4, 0.2);
        break;
      case "victoire":
        [392, 523, 659, 784, 1046, 784, 1046].forEach((f, k) => osc("square", f, f, 0.15, 0.08, k * 0.13));
        break;
    }
  } catch {
    /* pas de son */
  }
}

/* ------------------------------- Composant -------------------------------- */

type Panneau = null | "sac" | "carte" | "aide";

export function Jambonjon() {
  const { pack, str, settings, signal } = useOs();
  const { focused } = useWin();
  const ecran = useEcran();
  const jeu = pack.jambonjon;
  const poche = ecran.mode === "poche";

  const [partie, setPartie] = useState<Partie | null>(null);
  const [sauvegarde, setSauvegarde] = useState<Partie | null>(null);
  const [panneau, setPanneau] = useState<Panneau>(null);
  const [choisi, setChoisi] = useState<number | null>(null);

  const vue = useRef<HTMLCanvasElement>(null);
  const carte = useRef<HTMLCanvasElement>(null);
  const cam = useRef<Camera>({ x: 0, y: 0, angle: 0, bob: 0, secousse: 0 });
  const anim = useRef<{ de: Camera; vers: Camera; debut: number; duree: number; marche: boolean } | null>(null);
  const fx = useRef({ touches: new Set<number>(), toucheJusqua: 0, eclair: 0, eclairCouleur: [180, 20, 20] as [number, number, number] });
  const file = useRef(new Commandes<Action>());
  const partieRef = useRef<Partie | null>(null);

  // Sauvegarde existante.
  useEffect(() => {
    try {
      const p = relirePartie(JSON.parse(window.localStorage.getItem(CLE) ?? "null"));
      if (p && !p.fin) setSauvegarde(p);
    } catch {
      /* rien */
    }
  }, []);

  const placerCamera = (p: Partie) => {
    cam.current = { x: p.joueur.x + 0.5, y: p.joueur.y + 0.5, angle: angleDe(p.joueur.dir), bob: 0, secousse: 0 };
  };

  const commencer = useCallback(
    (p: Partie) => {
      preparer();
      anim.current = null;
      file.current.vider();
      fx.current = { touches: new Set(), toucheJusqua: 0, eclair: 0, eclairCouleur: [180, 20, 20] };
      partieRef.current = p;
      placerCamera(p);
      setPartie(p);
      try { window.localStorage.setItem(CLE, JSON.stringify(p)); } catch { /* sauvegarde impossible */ }
      setPanneau(null);
      signal("jambonjon:partie");
    },
    [signal],
  );

  const nouvelle = useCallback(() => commencer(nouvellePartie(jeu, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0)), [commencer, jeu]);

  /** Une action : nouvel état, animation de la caméra, sons, éclairs. */
  const agir = useCallback(
    (a: Action, repetition = false) => {
      const avant = partieRef.current;
      if (!avant || avant.fin) return;
      if (anim.current) {
        if (!repetition) file.current.ajouter(a);
        return;
      }
      const apres = jouer(avant, jeu, a);
      if (apres === avant) return;
      const ev = apres.evenements;
      const son = settings.sons;
      for (const e of ev) if (son) bruit(e);
      if (ev.includes("touche")) {
        fx.current.eclair = 0.45;
        fx.current.eclairCouleur = [170, 10, 10];
        cam.current.secousse = 4;
      }
      if (ev.includes("niveau")) {
        fx.current.eclair = 0.5;
        fx.current.eclairCouleur = [240, 200, 90];
      }
      if (ev.includes("rot")) {
        fx.current.eclair = 0.3;
        fx.current.eclairCouleur = [210, 170, 40];
      }
      if (ev.includes("frappe") || ev.includes("rot")) {
        fx.current.touches = new Set(avant.monstres.filter((m) => !apres.monstres.some((n) => n.uid === m.uid && n.pv === m.pv)).map((m) => m.uid));
        fx.current.toucheJusqua = performance.now() + 180;
      }
      if (ev.includes("descente")) {
        placerCamera(apres);
        fx.current.eclair = 1;
        fx.current.eclairCouleur = [0, 0, 0];
        signal(`jambonjon:etage:${apres.etage}`);
      } else {
        const de = { ...cam.current };
        const vers: Camera = { x: apres.joueur.x + 0.5, y: apres.joueur.y + 0.5, angle: angleDe(apres.joueur.dir), bob: 0, secousse: 0 };
        // Tourner par le plus court chemin.
        let da = vers.angle - de.angle;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        vers.angle = de.angle + da;
        const bouge = de.x !== vers.x || de.y !== vers.y;
        if (bouge || Math.abs(da) > 0.01) anim.current = { de, vers, debut: performance.now(), duree: bouge ? 170 : 140, marche: bouge };
      }
      partieRef.current = apres;
      if (apres.fin) file.current.vider();
      if (apres.fin === "victoire") signal("jambonjon:victoire");
      if (apres.fin === "mort") signal("jambonjon:mort");
      setPartie(apres);
      try {
        if (apres.fin) window.localStorage.removeItem(CLE);
        else window.localStorage.setItem(CLE, JSON.stringify(apres));
      } catch {
        /* sauvegarde impossible */
      }
    },
    [jeu, settings.sons, signal],
  );

  // Boucle de rendu.
  useEffect(() => {
    if (!partie) return;
    const c = vue.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const image = g.createImageData(LARGEUR, HAUTEUR);
    let id = 0;
    const spriteDe = (type: string) => defMonstre(jeu, type).sprite;
    const boucle = (t: number) => {
      const p = partieRef.current;
      if (p) {
        const an = anim.current;
        if (an) {
          const k = Math.min(1, (t - an.debut) / an.duree);
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          cam.current.x = an.de.x + (an.vers.x - an.de.x) * e;
          cam.current.y = an.de.y + (an.vers.y - an.de.y) * e;
          cam.current.angle = an.de.angle + (an.vers.angle - an.de.angle) * e;
          cam.current.bob = an.marche ? Math.sin(k * Math.PI) * 3 : 0;
          if (k >= 1) {
            anim.current = null;
            // La caméra termine exactement sur la case avant la commande suivante.
            cam.current = { ...an.vers };
            let suite = file.current.suivante();
            while (suite) {
              agir(suite);
              if (anim.current) break;
              suite = file.current.suivante();
            }
          }
        }
        cam.current.secousse *= 0.8;
        if (Math.abs(cam.current.secousse) < 0.2) cam.current.secousse = 0;
        else cam.current.secousse = -cam.current.secousse;
        fx.current.eclair = Math.max(0, fx.current.eclair - 0.06);
        if (t > fx.current.toucheJusqua) fx.current.touches = new Set();
        rendre(image, partieRef.current ?? p, cam.current, { temps: t, touches: fx.current.touches, eclair: fx.current.eclair, eclairCouleur: fx.current.eclairCouleur, spriteDe });
        g.putImageData(image, 0, 0);
      }
      id = requestAnimationFrame(boucle);
    };
    id = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(id);
  }, [partie !== null, jeu, agir]); // eslint-disable-line react-hooks/exhaustive-deps

  // Une fenêtre inactive ou un panneau ouvert ne garde pas de déplacements en attente.
  useEffect(() => {
    if (!focused || panneau) file.current.vider();
  }, [focused, panneau]);

  useEffect(() => {
    const vider = () => file.current.vider();
    window.addEventListener("blur", vider);
    document.addEventListener("visibilitychange", vider);
    return () => {
      window.removeEventListener("blur", vider);
      document.removeEventListener("visibilitychange", vider);
    };
  }, []);

  // Carte automatique.
  useEffect(() => {
    const c = carte.current;
    if (!c || !partie) return;
    dessinerCarte(c.getContext("2d")!, partie, c.width);
  }, [partie, panneau]);

  // Clavier.
  useEffect(() => {
    if (!focused) return;
    const touches: Record<string, Action> = {
      z: { type: "avancer" },
      arrowup: { type: "avancer" },
      s: { type: "reculer" },
      arrowdown: { type: "reculer" },
      q: { type: "gauche" },
      d: { type: "droite" },
      a: { type: "tournerG" },
      arrowleft: { type: "tournerG" },
      e: { type: "tournerD" },
      arrowright: { type: "tournerD" },
      " ": { type: "agir" },
      enter: { type: "agir" },
      j: { type: "manger" },
      b: { type: "boire" },
      r: { type: "rot" },
      w: { type: "attendre" },
    };
    const f = (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
      const t = (ev.target as HTMLElement | null)?.tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      const k = ev.key.toLowerCase();
      if (!partieRef.current) {
        if (k === "enter" || k === " ") {
          ev.preventDefault();
          if (sauvegarde) commencer(sauvegarde);
          else nouvelle();
        }
        return;
      }
      // I (sac) et C (carte) sont des raccourcis du menu Partie ; M ouvre aussi la carte.
      if (k === "m") {
        ev.preventDefault();
        setPanneau((x) => (x === "carte" ? null : "carte"));
        return;
      }
      if (k === "escape") {
        setPanneau(null);
        return;
      }
      if (partieRef.current.fin && (k === "enter" || k === " ")) {
        ev.preventDefault();
        nouvelle();
        return;
      }
      if (panneau) return;
      const a = touches[k];
      if (a) {
        ev.preventDefault();
        agir(a, ev.repeat);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [focused, agir, nouvelle, commencer, sauvegarde, panneau]);

  useMenuCommands(
    {
      "jbj.nouvelle": () => nouvelle(),
      "jbj.sac": () => partie && setPanneau((x) => (x === "sac" ? null : "sac")),
      "jbj.carte": () => partie && setPanneau((x) => (x === "carte" ? null : "carte")),
      "jbj.aide": () => setPanneau((x) => (x === "aide" ? null : "aide")),
    },
    { "jbj.sac": { disabled: !partie }, "jbj.carte": { disabled: !partie } },
  );

  /* ------------------------------ Écran titre ------------------------------ */

  if (!partie)
    return (
      <div className="jbj jbj-titre" data-testid="jambonjon">
        <div className="jbj-titre-cadre">
          <h1>{str("jbj.titre")}</h1>
          <p className="jbj-sous-titre">{str("jbj.sousTitre")}</p>
          <div className="jbj-titre-boutons">
            {sauvegarde && (
              <button className="pk-btn" onClick={() => commencer(sauvegarde)} data-testid="jbj-continuer">
                {str("jbj.continuer", { etage: sauvegarde.etage, niveau: sauvegarde.joueur.niveau })}
              </button>
            )}
            <button className="pk-btn" onClick={nouvelle} data-testid="jbj-nouvelle" autoFocus>
              {str("jbj.nouvelle")}
            </button>
          </div>
          <p className="jbj-titre-aide">{str(poche ? "jbj.titreAidePoche" : "jbj.titreAide")}</p>
        </div>
      </div>
    );

  /* --------------------------------- Partie --------------------------------- */

  const j = partie.joueur;
  const s = stats(j);
  const jauge = (v: number, max: number, cls: string, label: string) => (
    <div className={`jbj-jauge ${cls}`} title={`${label} ${Math.max(0, Math.round(v))}/${max}`}>
      <span>{label}</span>
      <i style={{ width: `${Math.max(0, Math.min(100, (v / max) * 100))}%` }} />
      <b>
        {Math.max(0, Math.round(v))}/{max}
      </b>
    </div>
  );
  const couleur = (o: Objet) => jeu.raretes.find((r) => r.id === o.rarete)?.couleur ?? "#e8dcc0";
  const bonus = (o: { att: number; def: number; pv: number; mousse: number }, signe = false) =>
    (["att", "def", "pv", "mousse"] as const)
      .filter((k) => o[k] !== 0)
      .map((k) => `${signe && o[k] > 0 ? "+" : ""}${o[k]} ${str(`jbj.stat.${k}`)}`)
      .join(" · ");
  const devant = partie.monstres.find((m) => m.x === j.x + [0, 1, 0, -1][j.dir]! && m.y === j.y + [-1, 0, 1, 0][j.dir]!);
  const nomEtage = jeu.nomsEtages[(partie.etage - 1) % jeu.nomsEtages.length]!;
  const journal = partie.journal.slice(poche ? -2 : -4);
  const btn = (a: Action, label: string, cls = "", testid?: string) => (
    <button
      className={`jbj-pad-b ${cls}`}
      onPointerDown={(e) => {
        e.preventDefault();
        agir(a);
      }}
      data-testid={testid}
    >
      {label}
    </button>
  );

  return (
    <div className={`jbj ${poche ? "jbj-poche" : ""}`} data-testid="jambonjon">
      <div className="jbj-gauche">
        <div className="jbj-vue">
          <canvas ref={vue} width={LARGEUR} height={HAUTEUR} data-testid="jbj-vue" />
          {devant && (
            <div className="jbj-cible" data-testid="jbj-cible">
              <b>
                {defMonstre(jeu, devant.type).nom}
                {devant.elite ? ` (${jeu.elite})` : ""}
              </b>{" "}
              {str("jbj.niv", { n: devant.niveau })}
              <i style={{ width: `${(devant.pv / devant.pvMax) * 100}%` }} />
            </div>
          )}
          {panneau === "sac" && (
            <div className="jbj-panneau" data-testid="jbj-sac">
              <h2>{str("jbj.equipement")}</h2>
              <ul className="jbj-equipe">
                {EMPLACEMENTS.map((e: Emplacement) => {
                  const o = j.equipe[e];
                  return (
                    <li key={e}>
                      <span className="jbj-emplacement">{str(`jbj.emplacement.${e}`)}</span>
                      {o ? (
                        <button className="jbj-objet" style={{ color: couleur(o) }} onClick={() => agir({ type: "retirer", emplacement: e })} title={str("jbj.retirer")}>
                          {nomObjet(jeu, o)} <small>{bonus(o)}</small>
                        </button>
                      ) : (
                        <em>{str("jbj.vide")}</em>
                      )}
                    </li>
                  );
                })}
              </ul>
              <h2>{str("jbj.sac", { n: j.sac.length, max: SAC_MAX })}</h2>
              {j.sac.length === 0 && <p className="jbj-vide">{str("jbj.sacVide")}</p>}
              <ul className="jbj-liste">
                {j.sac.map((o) => {
                  const cmp = comparer(jeu, j, o);
                  return (
                    <li key={o.uid} className={choisi === o.uid ? "choisi" : ""}>
                      <button className="jbj-objet" style={{ color: couleur(o) }} onClick={() => setChoisi(o.uid)} onDoubleClick={() => agir({ type: "equiper", uid: o.uid })} data-testid={`jbj-objet-${o.uid}`}>
                        {nomObjet(jeu, o)} <small>{str("jbj.niv", { n: o.niveau })} · {str(`jbj.emplacement.${emplacementDe(jeu, o)}`)}</small>
                      </button>
                      <small className="jbj-cmp">{bonus(cmp, true) || str("jbj.pareil")}</small>
                      {choisi === o.uid && (
                        <span className="jbj-actions">
                          <button className="pk-btn" onClick={() => agir({ type: "equiper", uid: o.uid })} data-testid="jbj-equiper">
                            {str("jbj.equiper")}
                          </button>
                          <button className="pk-btn" onClick={() => agir({ type: "jeter", uid: o.uid })}>
                            {str("jbj.jeter")}
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <button className="pk-btn jbj-fermer" onClick={() => setPanneau(null)}>
                {str("jbj.fermer")}
              </button>
            </div>
          )}
          {panneau === "carte" && (
            <div className="jbj-panneau jbj-panneau-carte" onClick={() => setPanneau(null)}>
              <h2>{nomEtage}</h2>
              <canvas ref={carte} width={256} height={256} />
            </div>
          )}
          {panneau === "aide" && (
            <div className="jbj-panneau" onClick={() => setPanneau(null)}>
              <h2>{str("jbj.commandes")}</h2>
              <pre className="jbj-aide">{str("jbj.aideTexte")}</pre>
            </div>
          )}
          {partie.fin && (
            <div className={`jbj-fin jbj-fin-${partie.fin}`} data-testid="jbj-fin">
              <h2>{str(partie.fin === "mort" ? "jbj.finMort" : "jbj.finVictoire")}</h2>
              <p>{str("jbj.bilan", { etage: partie.etage, niveau: j.niveau, tues: partie.tues, tours: partie.tour })}</p>
              <button className="pk-btn" onClick={nouvelle} data-testid="jbj-rejouer">
                {str("jbj.rejouer")}
              </button>
            </div>
          )}
        </div>
        <ol className="jbj-journal" data-testid="jbj-journal">
          {journal.map((m, i) => (
            <li key={partie.journal.length - journal.length + i}>{str(m.cle, m.vars)}</li>
          ))}
        </ol>
      </div>
      <div className="jbj-droite">
        <div className="jbj-etage">
          <b>{str("jbj.etage", { n: partie.etage, max: jeu.etages })}</b>
          <span>{nomEtage}</span>
        </div>
        <div className="jbj-niveau">
          {str("jbj.niveau", { n: j.niveau })} <small>{str("jbj.attdef", { att: s.att, def: s.def })}</small>
        </div>
        {jauge(j.pv, s.pvMax, "pv", str("jbj.stat.pv"))}
        {jauge(j.mousse, s.mousseMax, "mousse", str("jbj.stat.mousse"))}
        {jauge(j.faim, 100, "faim", str("jbj.faim"))}
        {jauge(j.xp, xpPourNiveau(j.niveau), "xp", str("jbj.xp"))}
        <div className="jbj-provisions">
          <button onClick={() => agir({ type: "manger" })} title={str("jbj.manger")} data-testid="jbj-manger">
            {str("jbj.jambons", { n: j.jambons })}
          </button>
          <button onClick={() => agir({ type: "boire" })} title={str("jbj.boire")} data-testid="jbj-boire">
            {str("jbj.bieres", { n: j.bieres })}
          </button>
        </div>
        {j.ivresse > 0 && <p className="jbj-ivre">{str("jbj.ivre")}</p>}
        {!poche && <canvas ref={panneau === "carte" ? undefined : carte} className="jbj-minicarte" width={168} height={168} data-testid="jbj-carte" />}
        {poche && (
          <div className="jbj-pad" data-testid="jbj-pad">
            {btn({ type: "tournerG" }, "A ↺", "", "jbj-pad-a")}
            {btn({ type: "avancer" }, "Z ▲", "", "jbj-pad-z")}
            {btn({ type: "tournerD" }, "E ↻", "", "jbj-pad-e")}
            {btn({ type: "agir" }, str("jbj.frapper"), "large jbj-pad-frapper")}
            {btn({ type: "gauche" }, "Q ◀")}
            {btn({ type: "reculer" }, "S ▼")}
            {btn({ type: "droite" }, "D ▶")}
            {btn({ type: "rot" }, str("jbj.rot"), "jbj-pad-rot")}
            <button className="jbj-pad-b" onClick={() => setPanneau((x) => (x === "sac" ? null : "sac"))}>
              {str("jbj.sacCourt")}
            </button>
            <button className="jbj-pad-b" onClick={() => setPanneau((x) => (x === "carte" ? null : "carte"))}>
              {str("jbj.carteCourt")}
            </button>
          </div>
        )}
        {!poche && (
          <p className="jbj-raccourcis">
            {str("jbj.raccourcis", { cout: ROT_COUT })}
          </p>
        )}
      </div>
    </div>
  );
}
