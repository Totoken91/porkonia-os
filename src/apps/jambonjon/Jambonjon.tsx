"use client";
/**
 * Jambonjon : exploration des caves d'affinage en vue subjective, case par case. ZQSD pour marcher, A et E pour
 * tourner ; au doigt, une manette s'affiche sous la vue. La partie est sauvegardée à chaque tour dans ce navigateur.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Commandes } from "./commandes";
import {modifierVie} from '@/apps/navigateur/vieStore';
import {progression} from '@/apps/navigateur/vie-locale';
import { Inventaire } from "./Inventaire";
import { SpriteObjet } from "./SpriteObjet";
import { Chevaliers } from "./Chevaliers";
import { Competences } from "./Competences";
import { Refuge } from './Halte';
import { xpNiveauRpg } from "./equilibrage";
import { menaceSur } from "./boss";
import { coutCompetence, disponible, ligne, SLOTS_ACTIFS } from "./rpg";
import { actionRapide, cotesLibres, gainsNiveau, impactsCombat, statutCompetence, type ImpactVisuel } from './retours-combat';
import "./old-school.css";
import { useEcran, useMenuCommands, useOs, useWin } from "@/os/context";
import { convertirRpg, defMonstre, jouer, nouvellePartie, relirePartie, ROT_COUT, stats, xpPourNiveau, type Action, type Partie } from "./logic";
import { angleDe, dessinerCarte, HAUTEUR, LARGEUR, preparer, rendre, type Camera } from "./rendu";
import { cle } from "@/os/stockage";


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
      case "garde": osc("square", 680, 150, 0.12, 0.12); break;
      case "collision": souffle(0.15, 0.4, 550); osc("triangle", 100, 40, 0.13, 0.13); break;
      case "double": osc("square", 350, 90, 0.08, 0.1); osc("square", 420, 100, 0.08, 0.1, 0.09); break;
      case "sel": osc("sine", 900, 180, 0.18, 0.12); break;
      case "explosion": souffle(0.22, 0.4, 1500); osc("sawtooth", 130, 40, 0.2, 0.13); break;
      case "execution": osc("square", 600, 150, 0.14, 0.1); break;
      case "soin": osc("triangle", 400, 800, 0.15, 0.1); break;
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

type Panneau = null | "sac" | "carte" | "aide" | "competences" | "journal" | "fiche";

export function Jambonjon() {
  const { pack, str, settings, signal, user } = useOs();
  const CLE=cle('partieOrdreCochon',{profil:user.id});
  const CLE_CONSEILS=cle('conseilsOrdreCochon',{profil:user.id});
  const { focused } = useWin();
  const ecran = useEcran();
  const jeu = pack.jambonjon;
  const poche = ecran.mode === "poche";

  const [partie, setPartie] = useState<Partie | null>(null);
  const [sauvegarde, setSauvegarde] = useState<Partie | null>(null);
  const [panneau, setPanneau] = useState<Panneau>(null);
  const [choix, setChoix] = useState<Partie | null | undefined>(undefined);
  const [competence, setCompetence] = useState<number | null>(null);
  const [promotion, setPromotion] = useState<ReturnType<typeof gainsNiveau>>(null);
  const impacts = useRef<ImpactVisuel[]>([]);

  const vue = useRef<HTMLCanvasElement>(null);
  const carte = useRef<HTMLCanvasElement>(null);
  const cam = useRef<Camera>({ x: 0, y: 0, angle: 0, bob: 0, secousse: 0 });
  const anim = useRef<{ de: Camera; vers: Camera; debut: number; duree: number; marche: boolean } | null>(null);
  const fx = useRef({ touches: new Set<number>(), toucheJusqua: 0, eclair: 0, eclairCouleur: [180, 20, 20] as [number, number, number] });
  const file = useRef(new Commandes<Action>());
  const partieRef = useRef<Partie | null>(null);
  const preferenceConseils = useRef(true);

  // Sauvegarde existante.
  useEffect(() => {
    try {
      preferenceConseils.current = window.localStorage.getItem(CLE_CONSEILS) !== '0';
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
      impacts.current=[];setPromotion(null);
      partieRef.current = p;
      placerCamera(p);
      setPartie(p);
      modifierVie(user.id,v=>progression(v,p.etage,p.fin==='victoire'));
      try { window.localStorage.setItem(CLE, JSON.stringify(p)); } catch { /* sauvegarde impossible */ }
      setPanneau(null);
      setChoix(undefined); setCompetence(null);
      signal("jambonjon:partie");
    },
    [signal, user.id],
  );

  const nouvelle = useCallback(() => { file.current.vider(); setCompetence(null); setChoix(null); }, []);
  const reprendre = useCallback((p: Partie) => { if (p.joueur.rpg) commencer(p); else setChoix(p); }, [commencer]);
  const choisir = (id: string) => {
    const p=choix?convertirRpg(choix,jeu,id):nouvellePartie(jeu,(Date.now()^Math.floor(Math.random()*1e9))>>>0,id);
    if(!choix&&p.guide&&!preferenceConseils.current){p.guide.actif=false;p.journal=p.journal.filter(m=>!m.cle.startsWith('jbj.guide.'));}
    commencer(p);
  };

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
      const maintenant=performance.now(),nouveaux=impactsCombat(avant,apres,a,maintenant);
      impacts.current=[...impacts.current.filter(e=>maintenant-e.debut<950),...nouveaux].slice(-24);
      if(nouveaux.length){
        fx.current.touches=new Set(nouveaux.filter(e=>!e.mort).map(e=>e.uid));
        fx.current.toucheJusqua=maintenant+240;
        cam.current.secousse=Math.max(cam.current.secousse,a.type==='competence'?3:1.5);
      }
      if (apres.tour !== avant.tour || apres.fin) setCompetence(null);
      const son = settings.sons;
      for (const e of new Set(ev)) if (son) bruit(e);
      if (ev.includes("touche")) {
        fx.current.eclair = 0.45;
        fx.current.eclairCouleur = [170, 10, 10];
        cam.current.secousse = 4;
      }
      if (ev.includes("niveau")) {
        fx.current.eclair = 0.5;
        fx.current.eclairCouleur = [240, 200, 90];
        setPromotion(gainsNiveau(avant,apres));
      }
      if (ev.includes("rot") || ev.includes("explosion") || ev.includes("sel")) {
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
      if(apres.etage!==avant.etage||apres.fin)modifierVie(user.id,v=>progression(v,apres.etage,apres.fin==='victoire'));
      try {
        if (apres.fin) window.localStorage.removeItem(CLE);
        else window.localStorage.setItem(CLE, JSON.stringify(apres));
      } catch {
        /* sauvegarde impossible */
      }
    },
    [jeu, settings.sons, signal, user.id],
  );

  const lancer = useCallback((slot:number)=>{
    const p=partieRef.current;if(!p)return;
    const action=actionRapide(p,slot);
    setPanneau(null);
    if(action){setCompetence(null);agir(action);}else setCompetence(slot);
  },[agir]);

  useEffect(()=>{
    if(!promotion)return;
    const id=window.setTimeout(()=>setPromotion(null),8000);
    return ()=>window.clearTimeout(id);
  },[promotion]);

  // Boucle de rendu.
  useEffect(() => {
    if (!partie || partie.fin === 'victoire' || choix !== undefined) return;
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
        impacts.current=impacts.current.filter(e=>t-e.debut<950);
        rendre(image, partieRef.current ?? p, cam.current, { temps: t, touches: fx.current.touches, eclair: fx.current.eclair, eclairCouleur: fx.current.eclairCouleur, spriteDe, impacts:impacts.current });
        g.putImageData(image, 0, 0);
      }
      id = requestAnimationFrame(boucle);
    };
    id = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(id);
  }, [partie !== null, partie?.fin === 'victoire', choix !== undefined, jeu, agir]); // eslint-disable-line react-hooks/exhaustive-deps

  // Une fenêtre inactive ou un panneau ouvert ne garde pas de déplacements en attente.
  useEffect(() => {
    if (!focused || panneau || competence !== null || choix !== undefined) file.current.vider();
  }, [focused, panneau, competence, choix]);

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
      if (choix !== undefined) return;
      if (!partieRef.current) {
        if (k === "enter" || k === " ") {
          ev.preventDefault();
          if (sauvegarde) reprendre(sauvegarde);
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
      if(k==='h'&&!partieRef.current.fin){ev.preventDefault();setCompetence(null);setPanneau(x=>x==='journal'?null:'journal');return;}
      if (k === "escape") {
        setCompetence(null);
        setPanneau(null);
        return;
      }
      if (partieRef.current.fin && (k === "enter" || k === " ")) {
        ev.preventDefault();
        nouvelle();
        return;
      }
      if (panneau) return;
      if (partieRef.current.joueur.rpg) {
        if (["1", "2", "3"].includes(k)) { ev.preventDefault(); if (!ev.repeat) lancer(Number(k) - 1); return; }
        if (k === "k") { ev.preventDefault(); setCompetence(null); setPanneau("competences"); return; }
        if (competence !== null) {
          if(k==='q'||k==='d') {ev.preventDefault();const cote=k==='q'?'gauche':'droite';if(!ev.repeat&&cotesLibres(partieRef.current)[cote])agir({type:'competence',slot:competence,cote});}
          return;
        }
        if (k === "r") return;
      }
      const a = touches[k];
      if (a) {
        ev.preventDefault();
        agir(a, ev.repeat);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [focused, agir, lancer, nouvelle, reprendre, sauvegarde, panneau, choix, competence]);

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

  if (choix !== undefined) return <Chevaliers choisir={choisir} reprise={!!choix} annuler={() => setChoix(undefined)}/>;

  if (!partie)
    return (
      <div className="jbj jbj-titre" data-testid="jambonjon">
        <div className="jbj-titre-cadre">
          <h1>{str("jbj.titre")}</h1>
          <p className="jbj-sous-titre">{str("jbj.sousTitre")}</p>
          <p className="jbj-mission" data-testid="jbj-mission">{str('jbj.mission')}</p>
          <div className="jbj-titre-boutons">
            {sauvegarde && (
              <button className="pk-btn" onClick={() => reprendre(sauvegarde)} data-testid="jbj-continuer">
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
      <i style={cls === "pv" || cls === "mousse" ? {width:"100%", height:`${Math.max(0,Math.min(100,(v/max)*100))}%`} : { width: `${Math.max(0, Math.min(100, (v / max) * 100))}%` }} />
      <b>
        {Math.max(0, Math.round(v))}/{max}
      </b>
    </div>
  );
  const devant = j.rpg ? ligne(partie, j.rpg.classe === "jambonmancien" ? 2 : 1)[0] : partie.monstres.find((m) => m.x === j.x + [0, 1, 0, -1][j.dir]! && m.y === j.y + [-1, 0, 1, 0][j.dir]!);
  const escalier=partie.carte.cases[j.y*partie.carte.w+j.x]===2&&!partie.monstres.some(m=>m.x===j.x+[0,1,0,-1][j.dir]!&&m.y===j.y+[-1,0,1,0][j.dir]!);
  const chevalier = jeu.rpg?.chevaliers.find((c) => c.id === j.rpg?.chevalier);
  const cotes=cotesLibres(partie);
  const nomEtage = jeu.nomsEtages[(partie.etage - 1) % jeu.nomsEtages.length]!;
  const journal = partie.journal.slice(poche ? -2 : -1);
  const menace=partie.monstres.find(m=>m.rpg?.annonce&&menaceSur(m.rpg.annonce,j));
  const attaqueMenace=menace?defMonstre(jeu,menace.type).attaqueBoss:undefined;
  const attaqueOrdinaire=menace&&!menace.boss&&!menace.elite?defMonstre(jeu,menace.type).attaqueOrdinaire:undefined;
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

  const fiche = <>
        <div className="jbj-etage">
          <b title={str('jbj.etage',{n:partie.etage,max:jeu.etages})}>{str(jeu.campagne?'jbj.acteEtage':'jbj.etage', { acte:Math.ceil(partie.etage/3), n: partie.etage, max: jeu.etages })}</b>
          <span>{nomEtage}</span>
        </div>
        <div className="jbj-niveau">
          {chevalier && <b className="jbj-identite" title={`${chevalier.nom} · ${str(`jbj.rpg.${chevalier.classe}`)}`}>{chevalier.nom}</b>}
          {str("jbj.niveau", { n: j.niveau })} <small>{str("jbj.attdef", { att: s.att, def: s.def })}</small>
        </div>
        <div className="jbj-vitaux">
        {jauge(j.pv, s.pvMax, "pv", str("jbj.stat.pv"))}
        {jauge(j.mousse, s.mousseMax, "mousse", str("jbj.stat.mousse"))}
        {jauge(j.faim, 100, "faim", str("jbj.faim"))}
        {j.rpg && j.niveau === 20 ? <span>{str("jbj.rpg.maxNiveau")}</span> : jauge(j.xp, j.rpg ? xpNiveauRpg(j.niveau) : xpPourNiveau(j.niveau), "xp", str("jbj.xp"))}
        </div>
        {j.ivresse > 0 && <p className="jbj-ivre">{str("jbj.ivre")}</p>}
  </>;

  if(partie.fin==='victoire') return <div className={`jbj jbj-conclusion ${poche?'jbj-poche':''}`} data-testid="jambonjon">
    <section className="jbj-fin jbj-fin-victoire jbj-conclusion-corps" data-testid="jbj-fin" aria-labelledby="jbj-victoire-titre">
      <header className="jbj-conclusion-entete">
        {chevalier&&<img src={`/ordre-cochon/blasons/${chevalier.id}.png`} width={64} height={64} alt="" draggable={false}/>}
        <div><p className="jbj-conclusion-surtitre">{str('jbj.conclusion.surtitre')}</p><h2 id="jbj-victoire-titre">{str('jbj.finVictoire')}</h2>
          {chevalier&&<p data-testid="jbj-vainqueur">{chevalier.nom} · {str(`jbj.rpg.${chevalier.classe}`)}</p>}</div>
      </header>
      <p className="jbj-conclusion-texte">{str('jbj.conclusion.texte')}</p>
      <dl className="jbj-conclusion-bilan" data-testid="jbj-bilan-victoire">
        {(['etages','niveau','tues','tours'] as const).map((cle,i)=><div key={cle}><dt>{str(`jbj.conclusion.${cle}`)}</dt><dd>{[partie.etage,j.niveau,partie.tues,partie.tour][i]}</dd></div>)}
      </dl>
      {j.rpg&&<p className="jbj-conclusion-refuges">{str('jbj.conclusion.refuges',{n:new Set(partie.refugesVisites??[]).size})}</p>}
      <footer><p>{str('jbj.conclusion.retour')}</p><button className="pk-btn" onClick={nouvelle} data-testid="jbj-rejouer">{str('jbj.conclusion.rejouer')}</button></footer>
    </section>
  </div>;

  return (
    <div className={`jbj jbj-en-partie ${j.rpg ? "jbj-rpg" : ""} ${poche ? "jbj-poche" : ""} ${panneau === "sac" ? "jbj-sac-ouvert" : ""}`} data-testid="jambonjon">
      <div className="jbj-gauche">
        <div className="jbj-vue">
          <canvas ref={vue} width={LARGEUR} height={HAUTEUR} data-testid="jbj-vue" />
          {promotion&&!panneau&&<div className="jbj-promotion" data-testid="jbj-promotion" role="status" aria-live="polite">
            <strong>{str('jbj.rpg.promotion',{n:promotion.niveau})}</strong>
            <span>{str('jbj.rpg.gains',{pv:promotion.pv,mousse:promotion.mousse,att:promotion.att,def:promotion.def})}</span>
            {j.rpg&&<span>{str('jbj.rpg.pointsGagnes',{n:promotion.points})}</span>}
            {j.rpg&&promotion.debloquees.length>0&&<span>{str('jbj.rpg.debloque',{noms:promotion.debloquees.map(i=>jeu.rpg!.competences[j.rpg!.classe][i]!.nom).join(', ')})}</span>}
            <div>{j.rpg&&<button className="pk-btn" onClick={()=>{setPromotion(null);setPanneau('competences');}}>{str('jbj.rpg.depenser')}</button>}<button className="pk-btn" onClick={()=>setPromotion(null)} aria-label={str('jbj.rpg.fermerPromotion')}>×</button></div>
          </div>}
          {j.rpg && menace && <div className="jbj-menace" data-testid="jbj-menace">{str(attaqueMenace?`jbj.boss.alerte.${attaqueMenace}`:attaqueOrdinaire?`jbj.ennemi.alerte.${attaqueOrdinaire}`:"jbj.rpg.alerte")}</div>}
          {j.rpg && competence !== null && !panneau && <div className="jbj-rpg-apercu" data-testid="jbj-apercu-competence">
            <b>{jeu.rpg!.competences[j.rpg.classe][SLOTS_ACTIFS[competence]!]!.nom}</b>
            <p>{str('jbj.rpg.choisirPas')}</p>
            <div><button className="pk-btn" data-testid="jbj-pas-gauche" onClick={()=>agir({type:'competence',slot:competence,cote:'gauche'})} disabled={!cotes.gauche||!disponible(partie,competence)}>{str('jbj.rpg.gauche')}</button><button className="pk-btn" data-testid="jbj-pas-droite" onClick={()=>agir({type:'competence',slot:competence,cote:'droite'})} disabled={!cotes.droite||!disponible(partie,competence)}>{str('jbj.rpg.droite')}</button><button className="pk-btn" onClick={()=>setCompetence(null)}>{str('jbj.rpg.annuler')}</button></div>
          </div>}
          {devant && (
            <div className="jbj-cible" data-testid="jbj-cible">
              <b>
                {defMonstre(jeu, devant.type).nom}
                {devant.elite ? ` (${jeu.elite})` : ""}
              </b>{" "}
              {str("jbj.niv", { n: devant.niveau })}
              {devant.rpg?.malediction ? <span>{str("jbj.rpg.maudit", { n: devant.rpg.malediction })}</span> : null}
              {devant.rpg?.saignement ? <span>{str("jbj.rpg.saignement", { n: devant.rpg.saignement })}</span> : null}
              <i style={{ width: `${(devant.pv / devant.pvMax) * 100}%` }} />
            </div>
          )}
          {!poche && panneau === "carte" && (
            <div className="jbj-panneau jbj-panneau-carte" onClick={() => setPanneau(null)}>
              <h2>{nomEtage}</h2>
              <canvas ref={carte} width={256} height={256} />
            </div>
          )}
          {panneau === "aide" && (
            <div className="jbj-panneau jbj-panneau-aide" data-testid="jbj-aide-panneau" onClick={() => setPanneau(null)}>
              {poche&&<button className="pk-btn" data-testid="jbj-aide-fermer" onClick={()=>setPanneau(null)}>{str('jbj.fermer')}</button>}
              <h2>{str("jbj.commandes")}</h2>
              <p className="jbj-mission">{str('jbj.mission')}</p>
              <pre className="jbj-aide">{str(j.rpg ? "jbj.rpg.aide" : "jbj.aideTexte")}</pre>
              {j.rpg && partie.etage<=3 && <button className="pk-btn" data-testid="jbj-conseils" aria-pressed={partie.guide?.actif??false} onClick={e=>{
                e.stopPropagation();const actif=!partie.guide?.actif;preferenceConseils.current=actif;
                try{window.localStorage.setItem(CLE_CONSEILS,actif?'1':'0');}catch{/* préférence locale indisponible */}
                agir({type:'conseils',actif});
              }}>{str(partie.guide?.actif?'jbj.guide.masquer':'jbj.guide.afficher')}</button>}
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
        {!panneau&&<Refuge partie={partie} agir={agir} competences={()=>{setPromotion(null);setCompetence(null);setPanneau('competences');}}/>}
        <div className="jbj-journal" data-testid="jbj-journal"><ol>
          {journal.map((m, i) => (
            <li key={partie.journal.length - journal.length + i} title={str(m.cle,m.vars)} className={m.cle.startsWith('jbj.guide.')?'jbj-conseil':undefined}>{str(m.cle, m.vars)}</li>
          ))}
        </ol><button className="pk-btn" data-testid="jbj-ouvrir-journal" title={str('jbj.journal.raccourci')} onClick={()=>{setCompetence(null);setPanneau(x=>x==='journal'?null:'journal');}}>{str('jbj.journal.court')}</button></div>
      </div>
      <div className="jbj-droite">
        {poche ? <button className="pk-btn jbj-resume" data-testid="jbj-ouvrir-fiche" onClick={()=>setPanneau(x=>x==='fiche'?null:'fiche')} title={str('jbj.fiche')}>
          <span>{str('jbj.niv',{n:j.niveau})} · {str('jbj.ficheCourt')}</span>
          <span className="jbj-resume-pv">{str('jbj.stat.pv')} {Math.max(0,Math.round(j.pv))}/{s.pvMax}</span>
          <span>{str('jbj.stat.mousse')} {Math.max(0,Math.round(j.mousse))}/{s.mousseMax}</span>
        </button> : <>{fiche}
        <div className="jbj-provisions">
          <button onClick={() => agir({ type: "manger" })} title={str("jbj.manger")} data-testid="jbj-manger">
            <SpriteObjet base="jambon"/>
            {str("jbj.jambons", { n: j.jambons })}
          </button>
          <button onClick={() => agir({ type: "boire" })} title={str("jbj.boire")} data-testid="jbj-boire">
            <SpriteObjet base="biere"/>
            {str("jbj.bieres", { n: j.bieres })}
          </button>
        </div>
        </>}
        {j.rpg && <div className="jbj-rpg-barre" data-testid="jbj-barre-competences">
          {SLOTS_ACTIFS.map((i, slot) => {const statut=statutCompetence(partie,slot);const texte=str(statut.cle,{n:statut.n??0});return <button className={`pk-btn ${competence === slot ? "choisi" : ""}`} key={i} data-testid={`jbj-actif-${slot}`} onClick={() => lancer(slot)} disabled={statut.bloquee} title={`${texte} · ${jeu.rpg!.competences[j.rpg!.classe][i]!.effet} · ${str(coutCompetence(partie,slot)?'jbj.rpg.cout':'jbj.rpg.physique',{n:coutCompetence(partie,slot)})}`}>
            <span>{!poche&&`${slot + 1} · `}{jeu.rpg!.competences[j.rpg!.classe][i]!.nom}</span><small>{texte}</small>
          </button>;})}
          <button className="pk-btn" data-testid="jbj-ouvrir-competences" onClick={() => { setCompetence(null); setPanneau((p) => p === "competences" ? null : "competences"); }}>{str("jbj.rpg.competences")}{j.rpg.points > 0 ? ` (${j.rpg.points})` : ""}</button>
          {(j.rpg.riposte > 0 || j.rpg.ouverture || j.rpg.perce || j.rpg.reduction > 0) && <small className="jbj-preparation">{str(j.rpg.riposte > 0 ? "jbj.rpg.riposte" : j.rpg.ouverture ? "jbj.rpg.ouverture" : j.rpg.perce ? "jbj.rpg.perce" : "jbj.rpg.lie")}</small>}
        </div>}
        {!poche && <canvas ref={panneau === "carte" ? undefined : carte} className="jbj-minicarte" width={168} height={168} data-testid="jbj-carte" />}
        {poche && (
          <div className="jbj-pad" data-testid="jbj-pad">
            {btn({ type: "tournerG" }, "A ↺", "", "jbj-pad-a")}
            {btn({ type: "avancer" }, "Z ▲", "", "jbj-pad-z")}
            {btn({ type: "tournerD" }, "E ↻", "", "jbj-pad-e")}
            {btn({ type: "agir" }, str(escalier?'jbj.descendre':"jbj.frapper"), "large jbj-pad-frapper", "jbj-pad-frapper")}
            {btn({ type: "gauche" }, "Q ◀", "", "jbj-pad-q")}
            {btn({ type: "reculer" }, "S ▼", "", "jbj-pad-s")}
            {btn({ type: "droite" }, "D ▶", "", "jbj-pad-d")}
            {btn({type:'attendre'},str('jbj.attendre'),'','jbj-pad-w')}
            {!j.rpg && btn({ type: "rot" }, str("jbj.rot"), "jbj-pad-rot")}
            <button className="jbj-pad-b" data-testid="jbj-ouvrir-sac" onClick={() => setPanneau((x) => (x === "sac" ? null : "sac"))}>
              {str("jbj.sacCourt")}
            </button>
            <button className="jbj-pad-b" data-testid="jbj-ouvrir-carte" onClick={() => setPanneau((x) => (x === "carte" ? null : "carte"))}>
              {str("jbj.carteCourt")}
            </button>
            <button className="jbj-pad-b" data-testid="jbj-manger" onClick={()=>agir({type:'manger'})} title={str('jbj.manger')}>{str('jbj.mangerCourt')} ×{j.jambons}</button>
            <button className="jbj-pad-b" data-testid="jbj-boire" onClick={()=>agir({type:'boire'})} title={str('jbj.boire')}>{str('jbj.boireCourt')} ×{j.bieres}</button>
          </div>
        )}
        {!poche && (
          <><button className="pk-btn" data-testid="jbj-ouvrir-sac" onClick={() => setPanneau((x) => (x === "sac" ? null : "sac"))}>{str("jbj.inventaire")}</button><p className="jbj-raccourcis">
            {!j.rpg && str("jbj.raccourcis", { cout: ROT_COUT })}
          </p></>
        )}
      </div>
      {poche&&panneau==='carte'&&<section className="jbj-rpg-panel jbj-carte-mobile" aria-labelledby="jbj-carte-titre">
        <header><h2 id="jbj-carte-titre">{nomEtage}</h2><button className="pk-btn" data-testid="jbj-carte-fermer" onClick={()=>setPanneau(null)}>{str('jbj.fermer')}</button></header>
        <canvas ref={carte} width={256} height={256}/>
      </section>}
      {panneau==='fiche'&&<section className="jbj-rpg-panel jbj-fiche-mobile" data-testid="jbj-fiche" aria-labelledby="jbj-fiche-titre">
        <header><h2 id="jbj-fiche-titre">{str('jbj.fiche')}</h2><button className="pk-btn" data-testid="jbj-fiche-fermer" onClick={()=>setPanneau(null)}>{str('jbj.fermer')}</button></header>
        <div className="jbj-rpg-panel-corps">{fiche}
          <div className="jbj-fiche-actions">
            <button className="pk-btn" data-testid="jbj-fiche-aide" onClick={()=>setPanneau('aide')}>{str('jbj.commandes')}</button>
            <button className="pk-btn" data-testid="jbj-fiche-nouvelle" onClick={nouvelle}>{str('jbj.nouvelle')}</button>
          </div>
        </div>
      </section>}
      {panneau === "sac" && <Inventaire partie={partie} agir={agir} fermer={() => setPanneau(null)}/> }
      {panneau === "competences" && j.rpg && <Competences partie={partie} agir={agir} fermer={() => setPanneau(null)}/>}
      {panneau==='journal'&&<section className="jbj-rpg-panel jbj-journal-complet" data-testid="jbj-journal-complet" aria-labelledby="jbj-journal-titre">
        <header><h2 id="jbj-journal-titre">{str('jbj.journal.titre')}</h2><button className="pk-btn" data-testid="jbj-journal-fermer" onClick={()=>setPanneau(null)}>{str('jbj.fermer')}</button></header>
        <p>{str('jbj.journal.ordre')}</p><ol>{[...partie.journal].reverse().map((m,i)=><li key={i} className={m.cle.startsWith('jbj.guide.')?'jbj-conseil':undefined}>{str(m.cle,m.vars)}</li>)}</ol>
      </section>}
    </div>
  );
}
