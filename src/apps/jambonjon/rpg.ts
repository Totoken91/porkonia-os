/** Combat RPG sur la carte réelle. Les récompenses et le journal passent par le moteur hôte. */
import { ligneEntre, menaceSur, preparerAttaqueBoss, type AnnonceBoss } from "./boss";
import type { Action, Monstre, Partie } from "./logic";
import { estRefuge, reposDisponible } from './refuge';
import type { JeuJambonjon } from "@/content/types";
import { buildValide, coefficients, DEBLOCAGES, degatsRpg, rangMaximum, statsRpg, type ClasseRpg, type Rangs } from "./equilibrage";

export interface EtatRpg {
  chevalier: string; classe: ClasseRpg; rangs: Rangs; points: number; delais: [number, number, number];
  protection: number; riposte: number; ouverture?: { uid: number; coefficient: number };
  bouclier: number; perce: boolean; saigne: number; encore: boolean; reduction: number; utilisee: number;
}
export interface EtatMonstreRpg {
  malediction: number; puissanceMal: number; saignement: number; puissanceSang: number;
  pousse: boolean; soigne: boolean; renvoi: boolean; reflux: boolean; sale: boolean; contact: number;
  annonce?: AnnonceBoss; recuperation?: number; prochainSpecial: number; interrompu?: boolean;
}
export interface HoteRpg {
  alea: (p: Partie) => number;
  tue: (p: Partie, jeu: JeuJambonjon, m: Monstre) => void;
  log: (p: Partie, cle: string, vars?: Record<string, string | number>) => void;
  stats: (p: Partie["joueur"]) => { att: number; def: number; pvMax: number; mousseMax: number };
  libre: (p: Partie, x: number, y: number) => boolean;
  marcher: (p: Partie, jeu: JeuJambonjon, dir: number) => boolean;
}
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
export const SLOTS_ACTIFS = [0, 2, 3] as const;
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const palierInnee = (niveau: number) => Number(niveau >= 5) + Number(niveau >= 10) + Number(niveau >= 15);
const effetInnee = (p: Partie, debut: number, pas: number) => debut + pas * palierInnee(p.joueur.niveau);
export function etatMonstre(m: Monstre): EtatMonstreRpg {
  return m.rpg ??= { malediction: 0, puissanceMal: 0, saignement: 0, puissanceSang: 0, pousse: false, soigne: false, renvoi: false, reflux: false, sale: false, contact: -1, prochainSpecial: 0 };
}

export function initialiserRpg(p: Partie, jeu: JeuJambonjon, id: string): boolean {
  const chevalier = jeu.rpg?.chevaliers.find((c) => c.id === id);
  if (!chevalier) return false;
  const j = p.joueur;
  j.niveau = Math.min(20, Math.max(1, Math.trunc(j.niveau)));
  j.rpg = { chevalier: id, classe: chevalier.classe, rangs: [1, 0, 0, 0, 0, 0], points: j.niveau - 1, delais: [0, 0, 0], protection: 0, riposte: 0, bouclier: 0, perce: false, saigne: -1, encore: false, reduction: 0, utilisee: -1 };
  return true;
}

export function statsClasse(j: Partie["joueur"]) {
  const r = j.rpg!;
  const ref = statsRpg(r.classe, j.niveau, 1);
  const eq = Object.values(j.equipe);
  const somme = (k: "att" | "def" | "pv" | "mousse") => eq.reduce((a, o) => a + (o?.[k] ?? 0), 0);
  return { att: ref.puissance - 2 + somme("att") + (j.ivresse > 0 ? 2 : 0), def: ref.defense - 2 + somme("def"), pvMax: ref.pvMax + somme("pv"), mousseMax: ref.mousseMax + somme("mousse") };
}

export function ligne(p: Partie, portee: number): Monstre[] {
  const j = p.joueur;
  const resultat: Monstre[] = [];
  for (let k = 1; k <= portee; k++) {
    const x = j.x + DX[j.dir]! * k, y = j.y + DY[j.dir]! * k;
    if (x < 0 || y < 0 || x >= p.carte.w || y >= p.carte.h || p.carte.cases[y * p.carte.w + x] === 1) break;
    const m = p.monstres.find((n) => n.x === x && n.y === y);
    if (m) resultat.push(m);
  }
  return resultat;
}

export function voisins(p: Partie, m: { x: number; y: number }) { return p.monstres.filter((n) => distance(n, m) === 1); }
export function coutCompetence(p: Partie, slot: number) {
  const r = p.joueur.rpg!;
  const brut = coefficients(r.classe, r.rangs).couts[slot] ?? 0;
  return brut ? Math.max(1, Math.ceil(brut * (1 - r.reduction))) : 0;
}
export function cibleCompetence(p: Partie, slot: number) {
  const r = p.joueur.rpg!;
  return ligne(p, r.classe === "jambonmancien" ? (slot === 1 ? 3 : 2) : 1)[0];
}
export function disponible(p: Partie, slot: number) {
  const r = p.joueur.rpg;
  if (!r || !Number.isInteger(slot) || slot < 0 || slot > 2 || p.fin) return false;
  if (!r.rangs[SLOTS_ACTIFS[slot]!] || r.delais[slot]! > 0 || p.joueur.mousse < coutCompetence(p, slot)) return false;
  if (r.classe === "tank" && slot === 2) return p.monstres.some((m) => distance(m, p.joueur) === 1 && !(m.x === p.joueur.x - DX[p.joueur.dir]! && m.y === p.joueur.y - DY[p.joueur.dir]!));
  return !!cibleCompetence(p, slot);
}

export function impactCompetence(p: Partie, slot: number) {
  const r = p.joueur.rpg!, c = coefficients(r.classe, r.rangs), m = cibleCompetence(p, slot);
  if (!m) return null;
  let coups: number[];
  let penetration = r.perce ? effetInnee(p, 0.2, 0.1) : 0;
  if (r.classe === "tank") {
    coups = [slot === 0 ? c.gardeFrappe : slot === 1 ? c.butoir : c.revers];
    if (slot === 2) penetration = Math.max(penetration, c.penetration);
  } else if (r.classe === "dps") coups = slot === 0 ? [c.doubleFrappe, c.doubleFrappe] : [slot === 1 ? c.pas : m.pv <= m.pvMax * c.seuilExecution ? c.execution : 1.05];
  else coups = [slot === 0 ? c.sel : slot === 1 ? c.rot : c.explosion + (m.rpg?.malediction ? c.explosionMaudite : 0)];
  coups[0]! += r.riposte + (r.ouverture?.uid === m.uid ? r.ouverture.coefficient : 0);
  // Impact direct principal ; collision, dégâts différés et innées peuvent ajouter des effets.
  const puissance = statsClasse(p.joueur).att;
  return {
    min: coups.reduce((a, coef, i) => a + degatsRpg(puissance * 0.9, m.def, coef, i === 0 ? penetration : 0), 0),
    max: coups.reduce((a, coef, i) => a + degatsRpg(puissance * 1.1, m.def, coef, i === 0 ? penetration : 0), 0),
  };
}

export function mesureCompetence(p: Partie, i: number): { cle: string; n: number } {
  const r = p.joueur.rpg!, c = coefficients(r.classe, r.rangs);
  if (r.classe === "tank") {
    const valeurs = [c.garde, c.rancune, c.collision, c.penetration, c.soinPorte, c.gardeConservee];
    const cles = ["protection", "bonus", "collision", "penetration", "soin", "protection"];
    return { cle: `jbj.rpg.${cles[i]}`, n: Math.round(valeurs[i]! * 100) };
  }
  if (r.classe === "dps") {
    const valeurs = [c.doubleFrappe * 2, c.saignement, c.feinte, c.seuilExecution, c.ouverture, 1 + Number(r.rangs[5] >= 3) + Number(r.rangs[5] >= 5)];
    const cles = ["frappe", "saignementPuissance", "protection", "seuil", "bonus", "duree"];
    return { cle: `jbj.rpg.${cles[i]}`, n: i === 5 ? valeurs[i]! : Math.round(valeurs[i]! * 100) };
  }
  const valeurs = [c.dureeMalediction, c.fermentation, c.rot, c.explosion + c.explosionMaudite, c.contamination + Number(r.rangs[4] >= 5), c.remboursement];
  const cles = ["duree", "rendMousse", "frappe", "frappeMaudite", "duree", "remboursement"];
  return { cle: `jbj.rpg.${cles[i]}`, n: [0, 1, 4].includes(i) ? valeurs[i]! : Math.round(valeurs[i]! * 100) };
}

function blessure(p: Partie, jeu: JeuJambonjon, m: Monstre, d: number, h: HoteRpg) {
  if (!p.monstres.includes(m)) return;
  m.pv = Math.max(0, m.pv - d); m.eveille = true;
  h.log(p, "jbj.msg.frappe", { nom: (m.type === jeu.boss.id ? jeu.boss : jeu.bossIntermediaires?.find(n=>n.id===m.type) ?? jeu.monstres.find((n) => n.id === m.type))?.nom ?? m.type, degats: d });
  p.evenements.push("frappe");
  if (!m.pv) {
    const r = p.joueur.rpg!;
    if (r.chevalier === "marin") r.bouclier = Math.max(r.bouclier, Math.round(h.stats(p.joueur).pvMax * effetInnee(p, 0.04, 0.012)));
    h.tue(p, jeu, m);
  }
}
function maudire(p: Partie, m: Monstre, duree: number, puissance: number) {
  const e = etatMonstre(m); e.malediction = duree; e.puissanceMal = puissance;
  p.evenements.push("sel");
}

export function frappeRpg(p: Partie, jeu: JeuJambonjon, m: Monstre, h: HoteRpg, coefficient = 1, penetration = 0, secondaire = false) {
  const j = p.joueur, r = j.rpg!, c = coefficients(r.classe, r.rangs), e = etatMonstre(m);
  const puissance = h.stats(j).att;
  const riposte = !secondaire && r.riposte > 0;
  const etaitBlesse = m.pv < m.pvMax;
  if (!secondaire) {
    coefficient += r.riposte + (r.ouverture?.uid === m.uid ? r.ouverture.coefficient : 0);
    r.riposte = 0; r.ouverture = undefined;
    if (r.perce) penetration = Math.max(penetration, effetInnee(p, 0.2, 0.1));
    r.perce = false;
    if (r.classe === "tank" && riposte && c.gardeConservee) r.protection = Math.max(r.protection, c.gardeConservee);
  }
  if (r.chevalier === "berthe") {
    const dx = Math.sign(m.x - j.x), dy = Math.sign(m.y - j.y);
    if (m.boss || !h.libre(p, m.x + dx, m.y + dy)) coefficient += effetInnee(p, 0.12, 0.04);
  }
  const d = degatsRpg(puissance * (0.9 + h.alea(p) * 0.2), m.def, coefficient, penetration);
  blessure(p, jeu, m, d, h);
  if (!secondaire && (r.encore || r.saigne === p.tour)) {
    if (p.monstres.includes(m)) { e.saignement = r.encore ? 1 + Number(r.rangs[5] >= 3) + Number(r.rangs[5] >= 5) : 2; e.puissanceSang = Math.max(c.saignement, effetInnee(p, 0.1, 0.03)) * puissance; }
    r.encore = false; r.saigne = -1;
  }
  if (p.monstres.includes(m)) {
    if (r.classe === "tank" && e.pousse && !e.soigne && c.soinPorte) { j.pv = Math.min(h.stats(j).pvMax, j.pv + Math.round(h.stats(j).pvMax * c.soinPorte)); e.soigne = true; p.evenements.push("soin"); }
    if (r.chevalier === "heloise" && etaitBlesse && !e.malediction && !e.sale) { e.sale = true; maudire(p, m, 2, puissance * effetInnee(p, 0.08, 0.025)); }
    if (r.chevalier === "theobald" && !e.reflux && e.contact >= p.tour - 1 && distance(m, j) === 1) { e.reflux = true; repousser(p, jeu, m, h, effetInnee(p, 0.15, 0.05)); }
  }
  if (!secondaire && r.chevalier === "gaspard" && (riposte || e.contact === p.tour - 1)) {
    const voisin = voisins(p, j).find((n) => n.uid !== m.uid);
    if (voisin) frappeRpg(p, jeu, voisin, h, effetInnee(p, 0.2, 0.05), 0, true);
  }
  return d;
}

function repousser(p: Partie, jeu: JeuJambonjon, m: Monstre, h: HoteRpg, collision: number) {
  if (!p.monstres.includes(m)) return;
  const j = p.joueur, e = etatMonstre(m);
  const dx = m.x === j.x ? 0 : Math.sign(m.x - j.x), dy = dx ? 0 : Math.sign(m.y - j.y);
  if (!m.boss && h.libre(p, m.x + dx, m.y + dy)) { m.x += dx; m.y += dy; e.contact = -1; m.sonne = Math.max(m.sonne, 1); }
  else frappeRpg(p, jeu, m, h, collision, 0, true);
  e.pousse = true;
  if (e.annonce && (!m.boss || !e.interrompu)) { e.annonce = undefined; e.prochainSpecial = p.tour + 2; e.interrompu = true; }
  p.evenements.push("collision");
}

export function attaquerSimple(p: Partie, jeu: JeuJambonjon, h: HoteRpg) {
  const r = p.joueur.rpg!, c = coefficients(r.classe, r.rangs);
  const cibles = ligne(p, r.classe === "jambonmancien" ? 2 : 1);
  const m = cibles[0]; if (!m) return false;
  const maudit = etatMonstre(m).malediction > 0;
  frappeRpg(p, jeu, m, h, r.classe === "jambonmancien" ? c.simpleMage : 1);
  if (r.classe === "jambonmancien" && maudit) p.joueur.mousse = Math.min(h.stats(p.joueur).mousseMax, p.joueur.mousse + c.fermentation);
  if (r.chevalier === "ysee" && cibles[1]) frappeRpg(p, jeu, cibles[1], h, c.simpleMage * effetInnee(p, 0.35, 0.05), 0, true);
  return true;
}

export function competenceRpg(p: Partie, jeu: JeuJambonjon, slot: number, cote: "gauche" | "droite" | undefined, h: HoteRpg): boolean {
  const r = p.joueur.rpg!;
  if (!disponible(p, slot)) { h.log(p, "jbj.rpg.indisponible"); return false; }
  const j = p.joueur, c = coefficients(r.classe, r.rangs), m = cibleCompetence(p, slot);
  // Le côté choisi doit rester libre après la préparation : jamais déplacer dans un ennemi ou un mur.
  const direction = (j.dir + (cote === "droite" ? 1 : 3)) % 4;
  const lateralLibre = h.libre(p, j.x + DX[direction]!, j.y + DY[direction]!);
  const autre = (direction + 2) % 4;
  const autreLibre = h.libre(p, j.x + DX[autre]!, j.y + DY[autre]!);
  if (r.classe === "dps" && slot === 1 && cote && !lateralLibre && autreLibre) { h.log(p, "jbj.rpg.coteBloque"); return false; }
  j.mousse -= coutCompetence(p, slot); r.reduction = 0;
  r.delais[slot] = c.delais[slot]! - 1; r.utilisee = slot;
  h.log(p, "jbj.rpg.utilise", { nom: jeu.rpg!.competences[r.classe][SLOTS_ACTIFS[slot]!]!.nom });
  if (r.classe === "tank") {
    if (slot === 0 && m) { frappeRpg(p, jeu, m, h, c.gardeFrappe); r.protection = Math.max(r.protection, c.garde); p.evenements.push("garde"); }
    if (slot === 1 && m) { frappeRpg(p, jeu, m, h, c.butoir); repousser(p, jeu, m, h, c.collision); }
    if (slot === 2) {
      const derriere = { x: j.x - DX[j.dir]!, y: j.y - DY[j.dir]! };
      voisins(p, j).filter((n) => n.x !== derriere.x || n.y !== derriere.y).forEach((n, i) => frappeRpg(p, jeu, n, h, c.revers, c.penetration, i > 0));
    }
  } else if (r.classe === "dps" && m) {
    if (slot === 0) {
      frappeRpg(p, jeu, m, h, c.doubleFrappe);
      if (p.monstres.includes(m)) frappeRpg(p, jeu, m, h, c.doubleFrappe, 0, true);
      else if (r.chevalier === "colin") { const voisin = voisins(p, j).find((n) => n.uid !== m.uid); if (voisin) frappeRpg(p, jeu, voisin, h, c.doubleFrappe * effetInnee(p, 0.7, 0.1), 0, true); }
      if (p.monstres.includes(m) && c.saignement) { const e = etatMonstre(m); e.saignement = 2; e.puissanceSang = h.stats(j).att * c.saignement; }
      p.evenements.push("double");
    }
    if (slot === 1) {
      frappeRpg(p, jeu, m, h, c.pas);
      if (lateralLibre) h.marcher(p, jeu, direction);
      else if (!cote && autreLibre) h.marcher(p, jeu, autre);
      else r.protection = Math.max(r.protection, c.feinte);
      if (p.monstres.includes(m)) r.ouverture = { uid: m.uid, coefficient: c.ouverture };
    }
    if (slot === 2) {
      const faible = m.pv <= m.pvMax * c.seuilExecution;
      frappeRpg(p, jeu, m, h, faible ? c.execution : 1.05);
      if (!p.monstres.includes(m)) { r.delais[0] = Math.max(0, r.delais[0] - 1); r.delais[1] = Math.max(0, r.delais[1] - 1); r.encore = r.rangs[5] > 0; p.evenements.push("execution"); }
    }
  } else if (m) {
    if (slot === 0) { frappeRpg(p, jeu, m, h, c.sel); if (p.monstres.includes(m)) maudire(p, m, c.dureeMalediction, h.stats(j).att * c.malediction); }
    if (slot === 1) { ligne(p, 3).forEach((n, i) => { frappeRpg(p, jeu, n, h, c.rot, 0, i > 0); repousser(p, jeu, n, h, c.collision); }); p.evenements.push("rot"); }
    if (slot === 2) {
      const e = etatMonstre(m), maudit = e.malediction > 0, proches = voisins(p, m);
      e.malediction = 0;
      frappeRpg(p, jeu, m, h, c.explosion + (maudit ? c.explosionMaudite : 0));
      proches.forEach((n) => frappeRpg(p, jeu, n, h, c.explosion, 0, true));
      if (!p.monstres.includes(m) && c.contamination) { const voisin = proches.find((n) => p.monstres.includes(n)); if (voisin) maudire(p, voisin, c.contamination + 1 + Number(r.rangs[4] >= 5), h.stats(j).att * c.malediction); }
      if (maudit) j.mousse = Math.min(h.stats(j).mousseMax, j.mousse + Math.floor(c.couts[2] * c.remboursement));
      p.evenements.push("explosion");
    }
  }
  return true;
}

export function actionGratuiteRpg(p: Partie, a: Action, h: HoteRpg): boolean | null {
  const r = p.joueur.rpg!;
  if(a.type==='reposer') {
    if(!reposDisponible(p))return false;
    const j=p.joueur,s=h.stats(j);
    j.pv=s.pvMax;j.mousse=s.mousseMax;j.faim=100;j.ivresse=0;
    r.delais=[0,0,0];r.protection=0;r.riposte=0;r.ouverture=undefined;r.bouclier=0;
    r.perce=false;r.saigne=0;r.encore=false;r.reduction=0;
    p.refugesVisites=[...(p.refugesVisites??[]),p.etage];
    h.log(p,'jbj.refuge.reposFait');p.evenements.push('repos');return true;
  }
  if (a.type === "apprendre") {
    const i = a.competence;
    if (!Number.isInteger(i) || i < 0 || i > 5 || !r.points || r.rangs[i]! >= rangMaximum(p.joueur.niveau, i)) return false;
    r.rangs[i]!++; r.points--; h.log(p, "jbj.rpg.appris"); return true;
  }
  if (a.type === "repartir") {
    if (!estRefuge(p)) return false;
    r.rangs = [1, 0, 0, 0, 0, 0]; r.points = p.joueur.niveau - 1; r.delais = [0, 0, 0];
    r.riposte = 0; r.ouverture = undefined; r.encore = false;
    h.log(p, "jbj.rpg.reparti"); return true;
  }
  return null;
}

export function apresBoire(p: Partie) {
  const r = p.joueur.rpg!;
  if (r.chevalier === "odette") r.protection = Math.max(r.protection, effetInnee(p, 0.3, 0.05));
  if (r.chevalier === "basile") r.reduction = effetInnee(p, 0.25, 0.05);
}
export function apresPas(p: Partie, dir: number) {
  const r = p.joueur.rpg!;
  if (r.chevalier === "roseline" && (dir - p.joueur.dir + 4) % 2 === 1 && voisins(p, p.joueur).length) r.perce = true;
}

export function effetsAvantEnnemis(p: Partie, jeu: JeuJambonjon, h: HoteRpg) {
  for (const m of [...p.monstres]) {
    const e = etatMonstre(m);
    const d = (e.malediction > 0 ? Math.max(1, Math.round(e.puissanceMal)) : 0) + (e.saignement > 0 ? Math.max(1, Math.round(e.puissanceSang)) : 0);
    if (e.malediction) e.malediction--; if (e.saignement) e.saignement--;
    if (d) blessure(p, jeu, m, d, h);
  }
}

/** Retour true lorsque l'attaque spéciale remplace le comportement ordinaire. */
export function specialEnnemi(p: Partie, jeu: JeuJambonjon, m: Monstre, h: HoteRpg): boolean {
  const e = etatMonstre(m);
  const attaque=jeu.bossIntermediaires?.find(b=>b.id===m.type)?.attaqueBoss;
  const def=jeu.monstres.find(n=>n.id===m.type);
  const ordinaire=!m.boss&&!m.elite?def?.attaqueOrdinaire:undefined;
  if(e.recuperation && p.tour<=e.recuperation)return true;
  if (e.annonce) {
    const touche = menaceSur(e.annonce,p.joueur);
    e.annonce = undefined; e.prochainSpecial = p.tour + 3;
    e.interrompu = false;
    if(attaque){e.recuperation=p.tour+1;h.log(p,"jbj.boss.reprise");}
    if(ordinaire){e.recuperation=p.tour+1;h.log(p,'jbj.ennemi.reprise',{nom:def!.nom});}
    if (touche) recevoir(p, jeu, m, h, ordinaire==='verdict'?1:ordinaire==='ecrasement'?1.35:1.8);
    else { h.log(p, "jbj.rpg.evitespecial"); if (p.joueur.rpg!.chevalier === "agathe") p.joueur.rpg!.saigne = p.tour + 1; }
    return true;
  }
  const portee=attaque === "sceau" ? 3 : attaque === "ligne" ? 4 : 1;
  const aligne=m.x===p.joueur.x||m.y===p.joueur.y;
  const visible=ligneEntre(p,m,p.joueur);
  // Le verdict vise une case fixe, pas le joueur après son déplacement.
  // L'écrasement engage le tonneau : il reste en place jusqu'à la riposte.
  const porteeOrdinaire=ordinaire==='verdict'?3:1;
  if(ordinaire&&distance(m,p.joueur)<=porteeOrdinaire&&visible&&
    (ordinaire!=='verdict'||aligne)&&p.tour>=e.prochainSpecial){
    const annonce=preparerAttaqueBoss(p,m,undefined);
    if(!annonce.cases?.length)return false;
    e.annonce=annonce;h.log(p,`jbj.ennemi.${ordinaire}`);return true;
  }
  if ((m.boss || m.elite) && distance(m, p.joueur) <= portee && (portee===1||visible) && (attaque!=="ligne"||aligne) && p.tour >= e.prochainSpecial) {
    e.annonce = attaque ? preparerAttaqueBoss(p,m,attaque) : { x: p.joueur.x, y: p.joueur.y };
    h.log(p, attaque ? `jbj.boss.${attaque}` : "jbj.rpg.annonce"); return true;
  }
  return false;
}

export function recevoir(p: Partie, jeu: JeuJambonjon, m: Monstre, h: HoteRpg, coefficient = 1) {
  const j = p.joueur, r = j.rpg!, c = coefficients(r.classe, r.rangs), e = etatMonstre(m), s = h.stats(j);
  const brut = degatsRpg(m.att * (0.9 + h.alea(p) * 0.2), s.def, coefficient);
  let d = Math.max(1, Math.round(brut * (1 - Math.min(0.65, r.protection))));
  const absorbe = Math.min(r.bouclier, d); r.bouclier -= absorbe; d -= absorbe;
  j.pv = Math.max(0, j.pv - d); e.contact = p.tour;
  if (r.classe === "tank" && r.protection && c.rancune) r.riposte = Math.min(c.rancune, (brut - d) * 0.65 / s.att);
  h.log(p, "jbj.rpg.recu", { degats: d, absorbe: brut - d }); p.evenements.push(d ? "touche" : "garde");
  if (r.chevalier === "anselme" && !e.renvoi && distance(m, j) === 1) { e.renvoi = true; blessure(p, jeu, m, Math.max(1, Math.round(s.att * effetInnee(p, 0.12, 0.04))), h); }
  if (!j.pv) { p.fin = "mort"; h.log(p, "jbj.msg.mort", { nom: (m.type === jeu.boss.id ? jeu.boss : jeu.bossIntermediaires?.find(n=>n.id===m.type) ?? jeu.monstres.find((n) => n.id === m.type))?.nom ?? m.type }); p.evenements.push("mort"); }
}

export function finirTourRpg(p: Partie, combat: boolean) {
  const r = p.joueur.rpg!;
  if (combat) { for (let i = 0; i < 3; i++) if (i !== r.utilisee) r.delais[i] = Math.max(0, r.delais[i]! - 1); }
  else { r.delais = [0, 0, 0]; r.riposte = 0; r.ouverture = undefined; r.encore = false; }
  r.protection = 0; r.bouclier = 0; r.utilisee = -1;
}

export function etatRpgValide(j: Partie["joueur"]): boolean {
  const r = j.rpg;
  if (!r) return true;
  if (!["tank", "dps", "jambonmancien"].includes(r.classe) || j.niveau < 1 || j.niveau > 20 || !Number.isInteger(j.niveau)) return false;
  const ids = { tank: ["berthe", "gaspard", "odette", "anselme"], dps: ["roseline", "colin", "agathe", "marin"], jambonmancien: ["heloise", "basile", "ysee", "theobald"] };
  if (!ids[r.classe].includes(r.chevalier)) return false;
  if (![r.protection, r.riposte, r.bouclier, r.reduction, r.saigne, r.utilisee].every(Number.isFinite)) return false;
  if (!Array.isArray(r.rangs) || r.rangs.length !== 6 || !buildValide(j.niveau, r.rangs)) return false;
  if (!Number.isInteger(r.points) || r.points < 0 || r.points + r.rangs.reduce((a, n) => a + n, 0) !== j.niveau) return false;
  return Array.isArray(r.delais) && r.delais.length === 3 && r.delais.every((n) => Number.isInteger(n) && n >= 0 && n <= 4);
}
