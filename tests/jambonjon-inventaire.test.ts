import { describe, expect, it } from "vitest";
import { porkosPack } from "@/content/packs/porkos";
import { comparer, jouer, nouvellePartie, relirePartie, SAC_MAX, stats, type Objet } from "@/apps/jambonjon/logic";

const jeu = porkosPack.jambonjon;
const objet = (uid:number, base="tablier", extra:Partial<Objet>={}):Objet => ({uid,base,niveau:1,rarete:"ordinaire",att:0,def:2,pv:0,mousse:0,...extra});
const partie = () => ({...nouvellePartie(jeu,87),monstres:[]});

describe("Sac et équipement", () => {
  it("échange une arme même avec un sac plein, sans perdre ni dupliquer d’objet", () => {
    const p=partie();
    p.joueur.sac=Array.from({length:SAC_MAX},(_,i)=>objet(100+i,i===0?"hachoir":"tablier",{att:i===0?12:0}));
    const avant=[p.joueur.equipe.arme!.uid,...p.joueur.sac.map(o=>o.uid)].sort();
    const q=jouer(p,jeu,{type:"equiper",uid:100});
    expect(q.joueur.sac).toHaveLength(SAC_MAX);
    expect(q.joueur.equipe.arme!.uid).toBe(100);
    expect([q.joueur.equipe.arme!.uid,...q.joueur.sac.map(o=>o.uid)].sort()).toEqual(avant);
    expect(q.tour).toBe(p.tour);
    expect(p.joueur.sac[0]!.uid).toBe(100);
  });
  it("refuse de retirer dans un sac plein avec un message explicite", () => {
    const p=partie();p.joueur.sac=Array.from({length:SAC_MAX},(_,i)=>objet(100+i));
    const q=jouer(p,jeu,{type:"retirer",emplacement:"arme"});
    expect(q.joueur.equipe).toEqual(p.joueur.equipe);
    expect(q.joueur.sac).toEqual(p.joueur.sac);
    expect(q.journal.at(-1)!.cle).toBe("jbj.msg.sacPlein");
    expect(q.tour).toBe(p.tour);
  });
  it("retire un bonus de PV sans soigner ni conserver des PV au-delà du maximum", () => {
    const p=partie();p.joueur.equipe.armure=objet(100,"gilet",{pv:20});p.joueur.pv=50;
    const q=jouer(p,jeu,{type:"retirer",emplacement:"armure"});
    expect(q.joueur.equipe.armure).toBeUndefined();expect(q.joueur.pv).toBe(stats(q.joueur).pvMax);
    expect(q.joueur.sac.map(o=>o.uid)).toContain(100);expect(q.tour).toBe(p.tour);
  });
  it("pose puis récupère un objet sur place sans déplacement ni perte", () => {
    const p=partie();p.sol=[];p.joueur.sac=[objet(100)];
    const pose=jouer(p,jeu,{type:"jeter",uid:100});
    expect(pose.joueur.sac).toHaveLength(0);expect(pose.sol).toHaveLength(1);
    const q=jouer(pose,jeu,{type:"ramasser"});
    expect(q.joueur.sac).toEqual(p.joueur.sac);expect(q.sol).toHaveLength(0);
    expect(q.tour).toBe(p.tour);expect(q.joueur.x).toBe(p.joueur.x);
  });
  it("un sac plein laisse l’équipement au sol mais ramasse les provisions empilées", () => {
    const p=partie();p.joueur.sac=Array.from({length:SAC_MAX},(_,i)=>objet(100+i));
    const position={x:p.joueur.x,y:p.joueur.y};
    p.sol=[{...position,butin:{type:"objet",objet:objet(200)}},{...position,butin:{type:"jambon"}},{...position,butin:{type:"biere"}}];
    const q=jouer(p,jeu,{type:"ramasser"});
    expect(q.joueur.sac).toHaveLength(SAC_MAX);expect(q.sol).toHaveLength(1);
    expect(q.joueur.jambons).toBe(p.joueur.jambons+1);expect(q.joueur.bieres).toBe(p.joueur.bieres+1);
    expect(q.tour).toBe(p.tour);
  });
  it("compare au bon emplacement avec gains et pertes séparés", () => {
    const p=partie();p.joueur.equipe.armure=objet(100,"gilet",{def:4,pv:10});
    expect(comparer(jeu,p.joueur,objet(101,"tablier",{def:6,pv:0,mousse:5}))).toEqual({att:0,def:2,pv:-10,mousse:5});
  });
  it("reprend une sauvegarde existante après équipement et conserve les provisions", () => {
    const p=partie();p.joueur.sac=[objet(100)];
    const q=jouer(p,jeu,{type:"equiper",uid:100});
    const r=relirePartie(JSON.parse(JSON.stringify(q)))!;
    expect(r.joueur.equipe).toEqual(q.joueur.equipe);expect(r.joueur.sac).toEqual(q.joueur.sac);
    expect(r.joueur.jambons).toBe(p.joueur.jambons);expect(r.joueur.bieres).toBe(p.joueur.bieres);
  });
});
