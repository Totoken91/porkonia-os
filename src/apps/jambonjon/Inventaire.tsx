"use client";
import { useEffect, useRef, useState } from "react";
import { SpriteObjet } from "./SpriteObjet";
import type { Emplacement } from "@/content/types";
import { useOs } from "@/os/context";
import { comparer, EMPLACEMENTS, emplacementDe, nomObjet, SAC_MAX, stats, type Action, type Objet, type Partie } from "./logic";

type Selection = { sac: number } | { equipe: Emplacement } | null;

/** Petits pictogrammes d’équipement, à taille native, sans fichier externe. */
function Picto({ type, porte = false }: { type: Emplacement; porte?: boolean }) {
  if (porte && type === "arme") return <svg className="jbj-icon-arme" width="24" height="48" viewBox="0 0 24 48" shapeRendering="crispEdges" aria-hidden="true">
    <path fill="#111415" d="M16 2h4v19h-2v8h-3v4h4v3h-6v9H8V34H5v-4h5V19h2V8h2V4h2z"/>
    <path fill="#5e6b6b" d="M17 3h2v17h-2v8h-3v4h-3V20h2V9h2V5h2z"/>
    <path fill="#b9c3bd" d="M17 4h1v15h-2v8h-2v3h-2V20h2V9h2V5h1z"/>
    <path fill="#e0ded0" d="M17 5h1v8h-1zM15 15h1v8h-1z"/>
    <path fill="#a18b4d" d="M6 31h12v2H6zM9 34h3v10H9z"/>
    <path fill="#55402b" d="M10 34h2v8h-2z"/><path fill="#d1b46b" d="M8 43h5v2H8z"/>
  </svg>;
  if (porte && type === "armure") return <svg className="jbj-icon-armure" width="24" height="32" viewBox="0 0 24 32" shapeRendering="crispEdges" aria-hidden="true">
    <path fill="#151817" d="M7 2h3v3h4V2h3l5 4v11h-5v12H7V17H2V6z"/>
    <path fill="#59452f" d="M7 3h2v3h6V3h2l4 4v9h-5v12H8V16H3V7z"/>
    <path fill="#8c7757" d="M7 5h2v5h2v16H8V15H4V8zM15 5h2v6h-2z"/>
    <path fill="#b4a47e" d="M7 6h1v6H5V9h2zM9 12h1v12H9z"/>
    <path fill="#302e26" d="M13 10h3v16h-3zM18 9h2v6h-2z"/>
    <path fill="#b69c58" d="M8 18h8v2H8z"/><path fill="#252a25" d="M11 18h3v2h-3z"/>
    <path fill="#4b4c40" d="M8 22h3v2H8zM14 14h2v2h-2zM5 10h2v2H5z"/>
  </svg>;
  return <svg width="24" height="24" viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true">
    {type === "arme" && <><path fill="#25232d" d="M15 2h6v7h-3v3h-3v3h-3v3H9v3H3v-6h3v-3h3V9h3V6h3z"/><path fill="#c9c9d0" d="M16 3h4v5h-3v3h-3v3h-3v3H8v-3h3v-3h3V8h2z"/><path fill="#f1e9d4" d="M18 3h2v3h-2z"/><path fill="#a0784d" d="M4 16h4v4H4z"/><path fill="#ceaa62" d="M7 13h3v3H7z"/></>}
    {type === "armure" && <><path fill="#25232d" d="M7 3h3v2h4V3h3l5 4v7h-5v8H7v-8H2V7z"/><path fill="#76523a" d="M7 4h2v2h6V4h2l4 4v5h-5v8H8v-8H3V8z"/><path fill="#b29a78" d="M8 7h3v11H8z"/><path fill="#513b30" d="M14 7h2v13h-2z"/><path fill="#ceaa62" d="M11 12h3v2h-3z"/></>}
    {type === "tete" && <><path fill="#25232d" d="M8 3h8v2h3v4h2v10H3V9h2V5h3z"/><path fill="#787986" d="M8 4h7v2h3v4h2v7H4v-7h2V6h2z"/><path fill="#b1b0b8" d="M8 6h3v8H6v-4h2z"/><path fill="#555463" d="M14 6h3v11h-3z"/><path fill="#ceaa62" d="M4 16h16v2H4z"/></>}
    {type === "breloque" && <><path fill="#787986" d="M7 2h10v2h2v7h-2V4H7v7H5V4h2z"/><path fill="#25232d" d="M8 10h8v2h3v7h-3v3H8v-3H5v-7h3z"/><path fill="#ceaa62" d="M9 11h6v2h3v5h-3v3H9v-3H6v-5h3z"/><path fill="#f3d2aa" d="M9 12h2v6H8v-4h1z"/><path fill="#76523a" d="M13 14h3v4h-3z"/></>}
  </svg>;
}

export function Inventaire({ partie, agir, fermer }: { partie: Partie; agir: (a: Action) => void; fermer: () => void }) {
  const { pack, str } = useOs();
  const jeu = pack.jambonjon;
  const j = partie.joueur;
  const s = stats(j);
  const [selection, choisir] = useState<Selection>(null);
  const fiche = useRef<HTMLElement>(null);
  const corps = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selection || !fiche.current || !corps.current) return;
    const cible = fiche.current.getBoundingClientRect();
    const zone = corps.current.getBoundingClientRect();
    if (cible.bottom > zone.bottom) corps.current.scrollTop += cible.bottom - zone.bottom;
    else if (cible.top < zone.top) corps.current.scrollTop += cible.top - zone.top;
  }, [selection]);
  const o = selection && ("sac" in selection ? j.sac.find((o) => o.uid === selection.sac) : j.equipe[selection.equipe]);
  const estPorte = !!selection && "equipe" in selection;
  const couleur = (o: Objet) => jeu.raretes.find((r) => r.id === o.rarete)?.couleur ?? "#e8dcc0";
  const rarete = (o: Objet) => jeu.raretes.find((r) => r.id === o.rarete)?.suffixe || str("jbj.ordinaire");
  const ici = partie.sol.filter((o) => o.x === j.x && o.y === j.y);
  const cmp = o && !estPorte ? comparer(jeu, j, o) : null;
  const porte = o ? j.equipe[emplacementDe(jeu, o)] : null;
  const profil = o && j.rpg ? jeu.objets.find(d => d.id === o.base)?.profilRpg : undefined;
  const action = (a: Action) => { agir(a); choisir(null); };

  return <section className="jbj-inventaire" data-testid="jbj-sac" aria-label={str("jbj.inventaire")}>
    <header className="jbj-inv-entete"><h2>{str("jbj.inventaire")}</h2><button className="pk-btn" onClick={fermer} data-testid="jbj-sac-fermer">{str("jbj.fermer")}</button></header>
    <div ref={corps} className="jbj-inv-corps">
      <div className="jbj-inv-contenu">
        <section className="jbj-inv-equipement"><h3>{str("jbj.equipement")}</h3>
          <div className="jbj-inv-ports">
            {EMPLACEMENTS.map((e) => {
            const item = j.equipe[e];
            const actif = selection && "equipe" in selection && selection.equipe === e;
            return <button key={e} className={`jbj-inv-port jbj-port-${e} ${item ? "occupe" : ""} ${actif ? "choisi" : ""}`} aria-label={`${str(`jbj.emplacement.${e}`)} : ${item ? nomObjet(jeu,item) : str("jbj.vide")}`} aria-pressed={!!actif} title={item ? nomObjet(jeu,item) : str(`jbj.emplacement.${e}`)} data-testid={`jbj-equipe-${e}`} onClick={() => choisir({ equipe: e })}>
              {item ? <SpriteObjet base={item.base} equipe/> : <Picto type={e} porte/>}<span><small>{str(`jbj.emplacement.${e}`)}</small><b style={item ? { color: couleur(item) } : undefined}>{item ? nomObjet(jeu, item) : str("jbj.vide")}</b></span>
            </button>;
          })}
            <div className="jbj-inv-totaux" data-testid="jbj-stats-equipement">{(["att","def","pv","mousse"] as const).map(k => <span key={k}><span>{str(`jbj.stat.${k}`)}</span><b>{k === "pv" ? s.pvMax : k === "mousse" ? s.mousseMax : s[k]}</b></span>)}</div>
          </div>
        </section>
        <section className="jbj-inv-sac"><h3>{str("jbj.sac", { n:j.sac.length, max:SAC_MAX })}</h3>
          <div className="jbj-inv-grille">{Array.from({length:SAC_MAX}, (_,i) => {
            const item = j.sac[i];
            const actif = item && selection && "sac" in selection && selection.sac === item.uid;
            return item ? <button key={item.uid} className={`jbj-inv-case ${actif ? "choisi" : ""}`} aria-label={nomObjet(jeu,item)} aria-pressed={!!actif} style={{ color:couleur(item) }} title={nomObjet(jeu,item)} data-testid={`jbj-objet-${item.uid}`} onClick={() => choisir({sac:item.uid})}>
              <SpriteObjet base={item.base}/><span>{nomObjet(jeu,item)}</span>
            </button> : <div key={`vide-${i}`} className="jbj-inv-case vide" aria-hidden="true"/>;
          })}</div>
          <p className="jbj-inv-conseil">{str("jbj.sacConseil")}</p>
        </section>
      </div>
      <section ref={fiche} className="jbj-inv-fiche" data-testid="jbj-objet-fiche" aria-live="polite">
        {o ? <>
          <h3 style={{color:couleur(o)}}>{nomObjet(jeu,o)}</h3>
          <p>{str(`jbj.emplacement.${emplacementDe(jeu,o)}`)} · {str("jbj.niv",{n:o.niveau})} · {rarete(o)}{estPorte ? ` · ${str("jbj.porte")}` : ""}</p>
          {profil && <p data-testid="jbj-objet-usage">{profil.description}</p>}
          {cmp && <p className="jbj-inv-comparaison">{str("jbj.compareAvec",{nom:porte ? nomObjet(jeu,porte) : str("jbj.vide")})}</p>}
          <div className="jbj-inv-bonus">{(["att","def","pv","mousse"] as const).map(k => <span key={k}>
            <span>{str(`jbj.stat.${k}`)}</span><b>{o[k] > 0 ? "+" : ""}{o[k]}</b>
            {cmp && <em className={cmp[k] > 0 ? "gain" : cmp[k] < 0 ? "perte" : "egal"}>{cmp[k] > 0 ? "+" : ""}{cmp[k]}</em>}
          </span>)}</div>
          <div className="jbj-inv-actions">
            {estPorte && selection && "equipe" in selection ? <button className="pk-btn" disabled={j.sac.length>=SAC_MAX} onClick={() => action({type:"retirer",emplacement:selection.equipe})} data-testid="jbj-retirer">{str("jbj.retirer")}</button> : <>
              <button className="pk-btn" onClick={() => action({type:"equiper",uid:o.uid})} data-testid="jbj-equiper">{str("jbj.equiper")}</button>
              <button className="pk-btn" onClick={() => action({type:"jeter",uid:o.uid})} data-testid="jbj-jeter">{str("jbj.poser")}</button>
            </>}
            {estPorte && j.sac.length>=SAC_MAX && <span>{str("jbj.placeNecessaire")}</span>}
          </div>
        </> : <p>{selection && "equipe" in selection ? str("jbj.emplacementVide") : str("jbj.choisirObjet")}</p>}
      </section>
      <section className="jbj-inv-provisions"><h3>{str("jbj.provisions")}</h3><p>{str("jbj.provisionsConseil")}</p><div>
        <button className="pk-btn" disabled={!j.jambons} onClick={() => agir({type:"manger"})} data-testid="jbj-sac-manger"><SpriteObjet base="jambon"/>{str("jbj.jambons",{n:j.jambons})} — {str("jbj.mangerCourt")}</button>
        <button className="pk-btn" disabled={!j.bieres} onClick={() => agir({type:"boire"})} data-testid="jbj-sac-boire"><SpriteObjet base="biere"/>{str("jbj.bieres",{n:j.bieres})} — {str("jbj.boireCourt")}</button>
      </div></section>
      <section className="jbj-inv-sol"><h3>{str("jbj.auSol")}</h3>
        {ici.length ? <><ul>{ici.map((item,i) => <li key={i}>{item.butin.type === "objet" ? nomObjet(jeu,item.butin.objet) : str(item.butin.type === "jambon" ? "jbj.jambons" : "jbj.bieres",{n:1})}</li>)}</ul>
          <button className="pk-btn" onClick={() => agir({type:"ramasser"})} data-testid="jbj-ramasser">{str("jbj.ramasser")}</button>
          {j.sac.length>=SAC_MAX && <p>{str("jbj.placeNecessaire")}</p>}
        </> : <p>{str("jbj.solVide")}</p>}
      </section>
      <p className="jbj-inv-message" data-testid="jbj-inv-message">{partie.journal.at(-1) && str(partie.journal.at(-1)!.cle,partie.journal.at(-1)!.vars)}</p>
    </div>
  </section>;
}
