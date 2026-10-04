/** Banc abstrait : distances en cases, pas le moteur de carte ni la validation visuelle du jeu. */
import { buildReference, buildValide, coefficients, degatsRpg, ennemiReference, statsRpg, type ClasseRpg, type EnnemiCalibration, type Rangs } from "../../src/apps/jambonjon/equilibrage";

export type Situation = "duel" | "blinde" | "elite" | "groupe" | "couloir" | "boss";
export interface OptionsCombat {
  classe: ClasseRpg;
  niveau: number;
  etage: number;
  situation: Situation;
  graine: number;
  rangs?: Rangs;
  simpleSeulement?: boolean;
  mousseInitiale?: number;
  blessuresInitiales?: number;
  delaisSupplementaires?: number;
}
interface Cible {
  pv: number; pvMax: number; puissance: number; defense: number; immobile: boolean;
  distance: number; curse: number; bleed: number; pousse: boolean; soigne: boolean; marque?: number;
}
export interface ResultatCombat {
  victoire: boolean; tours: number; pvFin: number; pvMax: number; pvPerdus: number;
  mousseFin: number; mousseDepensee: number; soins: number; consommables: number;
  actions: Record<string, number>; delais: number[];
}

export function simulerCombat(o: OptionsCombat): ResultatCombat {
  const r = o.rangs ?? buildReference(o.niveau);
  if (!buildValide(o.niveau, r)) throw new RangeError("build illégal");
  const s = statsRpg(o.classe, o.niveau, o.etage);
  const c = coefficients(o.classe, r);
  const type: EnnemiCalibration = o.situation === "blinde" ? "blinde" : o.situation === "elite" ? "elite" : o.situation === "boss" ? "boss" : "courant";
  const groupe = o.situation === "groupe" || o.situation === "couloir";
  const ennemis: Cible[] = Array.from({ length: groupe ? (o.niveau < 7 ? 2 : 3) : 1 }, (_, i) => {
    const e = ennemiReference(o.niveau, type);
    return { ...e, pv: e.pvMax, distance: o.classe === "jambonmancien" ? 2 + i : 1 + i, curse: 0, bleed: 0, pousse: false, soigne: false };
  });
  let alea = o.graine >>> 0;
  const fluctuation = () => { alea = (Math.imul(alea, 1664525) + 1013904223) >>> 0; return 0.9 + (alea / 4294967296) * 0.2; };
  const delais = [0, 0, 0];
  const actions: Record<string, number> = {};
  let pv = Math.max(1, s.pvMax - (o.blessuresInitiales ?? 0));
  let mousse = Math.min(s.mousseMax, Math.max(0, o.mousseInitiale ?? s.mousseMax));
  let mousseDepensee = 0, pvPerdus = 0, soins = 0, rancune = 0, ouverture = 0, encore = false;
  let tours = 0;
  const noter = (action: string) => { actions[action] = (actions[action] ?? 0) + 1; };
  const survivants = () => ennemis.filter((e) => e.pv > 0);
  function frappe(e: Cible, coefficient: number, penetration = 0, bonus = true) {
    const charge = bonus ? rancune + ouverture : 0;
    const d = degatsRpg(s.puissance * fluctuation(), e.defense, coefficient + charge, penetration);
    e.pv = Math.max(0, e.pv - d);
    if (bonus) { rancune = 0; ouverture = 0; }
    if (o.classe === "tank" && e.pousse && !e.soigne && e.pv > 0 && c.soinPorte) {
      const soin = Math.min(s.pvMax - pv, Math.round(s.pvMax * c.soinPorte));
      pv += soin; soins += soin; e.soigne = true;
    }
    return d;
  }
  const appliquerMalediction = (e: Cible, duree: number) => { if (e.pv > 0) e.curse = duree; };
  function repousser(e: Cible) {
    // Le couloir sert ici de fixture de collision : la cible est adossée à un mur.
    if (e.immobile || o.situation === "couloir") frappe(e, c.collision, 0, false);
    else e.distance++;
    e.pousse = true;
  }
  const pret = (i: number) => !o.simpleSeulement && r[[0, 2, 3][i]!]! > 0 && delais[i] === 0 && mousse >= c.couts[i]!;
  function utiliser(i: number, nom: string) {
    noter(nom); delais[i] = c.delais[i]! + (o.delaisSupplementaires ?? 0);
    mousse -= c.couts[i]!; mousseDepensee += c.couts[i]!;
  }
  while (pv > 0 && survivants().length && tours < 80) {
    tours++;
    if (tours > 1) for (let i = 0; i < delais.length; i++) delais[i] = Math.max(0, delais[i]! - 1);
    const vivants = survivants();
    const portee = o.classe === "jambonmancien" ? 2 : 1;
    const cible = vivants.filter((e) => e.distance <= portee).sort((a, b) => a.pv - b.pv)[0];
    let protection = 0;
    const menace = vivants.some((e) => e.marque === tours);
    const riposteChargee = rancune > 0;
    if (menace && !o.simpleSeulement && (o.classe !== "tank" || !pret(0))) {
      // Éviter une zone annoncée : un vrai tour sans dégâts, pas une esquive gratuite.
      noter("esquive"); for (const e of vivants) { e.distance++; e.marque = undefined; }
    } else if (!cible) {
      noter("approche"); for (const e of vivants) e.distance = Math.max(1, e.distance - 1);
    } else if (o.classe === "tank") {
      const voisins = vivants.filter((e) => e.distance === 1);
      if (menace && pret(0)) {
        utiliser(0, "garde"); frappe(cible, c.gardeFrappe); protection = c.garde;
      } else if (pret(2) && (voisins.length > 1 || cible.defense >= s.puissance * 0.2 || !pret(0))) {
        utiliser(2, "revers"); voisins.forEach((e, i) => frappe(e, c.revers, c.penetration, i === 0));
      } else if (pret(0) && !(cible.immobile && tours % 3 === 1)) {
        utiliser(0, "garde"); frappe(cible, c.gardeFrappe); protection = c.garde;
      } else if (pret(1)) {
        utiliser(1, "butoir"); frappe(cible, c.butoir); if (cible.pv > 0) repousser(cible);
      } else { noter("simple"); frappe(cible, 1); }
      if (riposteChargee && c.gardeConservee) protection = Math.max(protection, c.gardeConservee);
    } else if (o.classe === "dps") {
      if (pret(2) && cible.pv <= cible.pvMax * c.seuilExecution) {
        utiliser(2, "execution"); frappe(cible, c.execution);
        if (!cible.pv) { delais[0] = Math.max(0, delais[0]! - 1); delais[1] = Math.max(0, delais[1]! - 1); encore = r[5] > 0; }
      } else if (pret(0)) {
        utiliser(0, "double"); frappe(cible, c.doubleFrappe); if (cible.pv > 0) frappe(cible, c.doubleFrappe, 0, false);
        if (cible.pv > 0 && c.saignement) cible.bleed = 2;
      } else if (pret(1)) {
        utiliser(1, "pas"); frappe(cible, c.pas); ouverture = c.ouverture;
        // Vue abstraite : la salle ouverte permet d'éviter un adversaire, la feinte protège dans le couloir.
        if (o.situation === "couloir") protection = c.feinte;
        else if (cible.pv > 0) cible.distance++;
      } else {
        noter("simple"); frappe(cible, 1);
        if (encore && cible.pv > 0) { cible.bleed = 2; encore = false; }
      }
    } else {
      if (cible.pv <= degatsRpg(s.puissance * 0.9, cible.defense, c.simpleMage)) {
        // Ne pas payer un sort pour terminer une cible que le projectile gratuit tue déjà.
        noter("simple"); const maudit = cible.curse > 0; frappe(cible, c.simpleMage);
        if (maudit) mousse = Math.min(s.mousseMax, mousse + c.fermentation);
      } else if (pret(2) && cible.curse > 0) {
        utiliser(2, "explosion"); cible.curse = 0;
        frappe(cible, c.explosion + c.explosionMaudite);
        // Les voisins d'une cible sont rapprochés dans cette fixture, mais une file n'offre qu'un voisin.
        const voisins = vivants.filter((e) => e !== cible && Math.abs(e.distance - cible.distance) <= 1).slice(0, o.situation === "couloir" ? 1 : 3);
        voisins.forEach((e) => frappe(e, c.explosion, 0, false));
        if (!cible.pv && c.contamination) { const voisin = voisins.find((e) => e.pv > 0); if (voisin) appliquerMalediction(voisin, c.contamination + 1); }
        mousse = Math.min(s.mousseMax, mousse + Math.floor(c.couts[2] * c.remboursement));
      } else if (pret(0) && !cible.curse) {
        utiliser(0, "sel"); frappe(cible, c.sel); appliquerMalediction(cible, c.dureeMalediction);
      } else if (pret(1) && cible.distance === 1 && mousse >= c.couts[1] + c.couts[0]) {
        utiliser(1, "rot"); vivants.filter((e) => e.distance <= 3).forEach((e, i) => { frappe(e, c.rot, 0, i === 0); if (e.pv > 0) repousser(e); });
      } else {
        noter("simple"); const maudit = cible.curse > 0; frappe(cible, c.simpleMage);
        if (maudit) mousse = Math.min(s.mousseMax, mousse + c.fermentation);
      }
    }
    for (const e of ennemis) {
      if (e.pv <= 0) continue;
      if (e.curse > 0) { e.pv = Math.max(0, e.pv - Math.max(1, Math.round(s.puissance * c.malediction))); e.curse--; }
      if (e.bleed > 0) { e.pv = Math.max(0, e.pv - Math.max(1, Math.round(s.puissance * c.saignement))); e.bleed--; }
    }
    const ordre = survivants().sort((a, b) => a.distance - b.distance);
    for (const [i, e] of ordre.entries()) {
      if (o.situation === "couloir" && i > 0) {
        // Une file dans un passage d'une case ne traverse pas son premier adversaire.
        e.distance = Math.max(ordre[i - 1]!.distance + 1, e.distance - 1);
        continue;
      }
      if (e.marque === tours) {
        e.marque = undefined;
        const brut = degatsRpg(e.puissance * fluctuation(), s.defense, 1.8);
        const recu = Math.max(1, Math.round(brut * (1 - protection)));
        pv -= recu; pvPerdus += recu;
        if (o.classe === "tank" && protection) rancune = Math.min(s.puissance * c.rancune, (brut - recu) * 0.65) / s.puissance;
        continue;
      }
      if (e.distance > 1) { e.distance--; continue; }
      if (e.immobile && tours % 3 === 1) { e.marque = tours + 1; continue; }
      const brut = degatsRpg(e.puissance * fluctuation(), s.defense);
      const recu = Math.max(1, Math.round(brut * (1 - protection)));
      pv -= recu; pvPerdus += recu;
      if (o.classe === "tank" && protection) rancune = Math.min(s.puissance * c.rancune, (brut - recu) * 0.65) / s.puissance;
    }
  }
  return { victoire: pv > 0 && !survivants().length, tours, pvFin: Math.max(0, pv), pvMax: s.pvMax, pvPerdus, mousseFin: mousse, mousseDepensee, soins, consommables: 0, actions, delais };
}
