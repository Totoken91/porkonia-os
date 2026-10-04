/** Coefficients RPG utilisés par le combat et la progression de la campagne. */
export type ClasseRpg = "tank" | "dps" | "jambonmancien";
export type Rangs = [number, number, number, number, number, number];
export const NIVEAU_MAX_RPG = 20;
export const DEBLOCAGES = [1, 2, 3, 7, 11, 17] as const;
export const SEUILS_RANGS = [1, 4, 8, 12, 16] as const;
export const RARETES_RPG = { commun: 1, garde: 1.08, cru: 1.16, etat: 1.25 } as const;
export const NIVEAUX_FIN_ETAGE = [2, 4, 6, 7, 9, 11, 12, 14, 16, 17, 19, 20] as const;
/** Combats + objectif : progression viable sans exiger toutes les salles annexes. */
export const PART_XP_COMBAT = 0.72;
export function xpAccomplissement(etage:number) {
  if(!Number.isInteger(etage)||etage<1||etage>=12)return 0;
  return etage===1?xpNiveauRpg(1):Math.round(budgetsXpEtages()[etage-1]!*0.4);
}

const profils = {
  tank: { pv: 42, croissancePv: 8, puissance: 5, croissancePuissance: 1.55, defense: 3, croissanceDefense: 0.65, mousse: 30 },
  dps: { pv: 32, croissancePv: 7, puissance: 5, croissancePuissance: 1.8, defense: 1, croissanceDefense: 0.4, mousse: 30 },
  jambonmancien: { pv: 30, croissancePv: 7, puissance: 5, croissancePuissance: 1.65, defense: 1, croissanceDefense: 0.4, mousse: 40 },
} satisfies Record<ClasseRpg, object>;

export function verifierNiveau(niveau: number) {
  if (!Number.isInteger(niveau) || niveau < 1 || niveau > NIVEAU_MAX_RPG) throw new RangeError("niveau RPG hors limites");
}

/** Ensemble courant de référence ; indépendant du tirage du butin, sans objet rare. */
export function statsRpg(classe: ClasseRpg, niveau: number, etage: number, rarete: keyof typeof RARETES_RPG = "commun") {
  verifierNiveau(niveau);
  if (!Number.isInteger(etage) || etage < 1 || etage > 12) throw new RangeError("étage RPG hors limites");
  const p = profils[classe];
  const k = niveau - 1;
  const mult = RARETES_RPG[rarete];
  const arme = Math.round((2 + 0.55 * (etage - 1)) * mult);
  const defenseEquipement = Math.round((2 + 0.4 * (etage - 1)) * mult);
  const pvEquipement = Math.round(2 * (etage - 1) * mult);
  return {
    puissance: Math.round(p.puissance + p.croissancePuissance * k) + arme,
    defense: Math.round(p.defense + p.croissanceDefense * k) + defenseEquipement,
    pvMax: Math.round(p.pv + p.croissancePv * k) + pvEquipement,
    mousseMax: p.mousse + 3 * k,
  };
}

/** Résultat déterministe moyen : les simulations peuvent faire varier la puissance de ±10 %. */
export function degatsRpg(puissance: number, defense: number, coefficient = 1, penetration = 0) {
  return Math.max(1, Math.round(puissance * coefficient - Math.max(0, defense) * 0.55 * (1 - Math.min(1, Math.max(0, penetration)))));
}

export function rangMaximum(niveau: number, competence: number) {
  verifierNiveau(niveau);
  if (!Number.isInteger(competence) || competence < 0 || competence > 5) throw new RangeError("compétence inconnue");
  if (niveau < DEBLOCAGES[competence]!) return 0;
  return SEUILS_RANGS.filter((n) => n <= niveau).length;
}

export function buildValide(niveau: number, rangs: Rangs) {
  return rangs[0] >= 1 && rangs.reduce((a, n) => a + n, 0) <= niveau && rangs.every((n, i) => Number.isInteger(n) && n >= 0 && n <= rangMaximum(niveau, i));
}

/** Débloque les fonctions avant de renforcer les rangs : le point offert est compté. */
export function buildReference(niveau: number): Rangs {
  verifierNiveau(niveau);
  const r: Rangs = [1, 0, 0, 0, 0, 0];
  let disponibles = niveau - 1;
  for (let n = 2; n <= niveau; n++) {
    const nouveau = DEBLOCAGES.indexOf(n as typeof DEBLOCAGES[number]);
    if (nouveau >= 0) { r[nouveau] = 1; disponibles--; }
  }
  const priorites = [0, 3, 1, 2, 4, 5];
  while (disponibles > 0) {
    let ajoute = false;
    for (const i of priorites) {
      if (disponibles && r[i]! > 0 && r[i]! < rangMaximum(niveau, i)) { r[i]!++; disponibles--; ajoute = true; }
    }
    if (!ajoute) break;
  }
  return r;
}

export function coefficients(classe: ClasseRpg, r: Rangs) {
  const a = r[0] - 1;
  const b = Math.max(0, r[2] - 1);
  const c = Math.max(0, r[3] - 1);
  const coutSel = 5;
  const coutRot = 7;
  const coutExplosion = 10;
  return {
    delais: [2, 3, 4] as const,
    garde: 0.4 + 0.025 * a,
    gardeFrappe: 0.95 + 0.055 * a,
    rancune: r[1] ? 0.18 + 0.035 * (r[1] - 1) : 0,
    butoir: 1.05 + 0.07 * b,
    collision: 0.25 + 0.05 * b,
    revers: 1.05 + 0.075 * c,
    penetration: 0.3 + 0.075 * c,
    soinPorte: r[4] ? 0.025 + 0.005 * (r[4] - 1) : 0,
    gardeConservee: r[5] ? 0.15 + 0.025 * (r[5] - 1) : 0,
    doubleFrappe: 0.72 + 0.035 * a,
    saignement: r[1] ? 0.13 + 0.025 * (r[1] - 1) : 0,
    pas: 0.85 + 0.05 * b,
    feinte: 0.35 + 0.025 * b,
    ouverture: r[4] ? 0.18 + 0.03 * (r[4] - 1) : 0,
    execution: 1.65 + 0.12 * c,
    seuilExecution: 0.35 + (r[3] >= 3 ? 0.05 : 0) + (r[3] >= 5 ? 0.05 : 0),
    simpleMage: 0.9,
    sel: 1.05 + 0.065 * a,
    malediction: 0.13 + 0.02 * a,
    dureeMalediction: r[0] >= 3 ? 3 : 2,
    fermentation: r[1] ? 2 + (r[1] >= 3 ? 1 : 0) + (r[1] >= 5 ? 1 : 0) : 0,
    rot: 0.9 + 0.07 * b,
    explosion: 1.1 + 0.075 * c,
    explosionMaudite: 0.65 + 0.075 * c,
    contamination: r[4] ? (r[4] >= 3 ? 2 : 1) : 0,
    remboursement: r[5] ? 0.2 + 0.035 * (r[5] - 1) : 0,
    couts: classe === "jambonmancien" ? [coutSel, coutRot, coutExplosion] as const : [0, 0, 0] as const,
  };
}

export type EnnemiCalibration = "courant" | "blinde" | "elite" | "boss";
export function ennemiReference(niveau: number, type: EnnemiCalibration) {
  verifierNiveau(niveau);
  const k = niveau - 1;
  const pv = 23 + 7.5 * k;
  return {
    pvMax: Math.round(pv * (type === "boss" ? (niveau <= 5 ? 4 : 4.4) : type === "elite" ? 1.9 : 1)),
    puissance: Math.round((6 + 0.95 * k) * (type === "boss" ? 1.05 : type === "elite" ? 1.1 : 1)),
    defense: Math.round((1 + 0.4 * k) * (type === "blinde" ? 2.2 : type === "boss" ? 1.3 : 1)),
    immobile: type === "boss",
  };
}

/** XP supplémentaire du niveau n au niveau n+1 ; 0 à la limite. */
export function xpNiveauRpg(niveau: number) {
  verifierNiveau(niveau);
  return niveau === NIVEAU_MAX_RPG ? 0 : 40 + 15 * niveau + 2 * niveau * niveau;
}

export function niveauDepuisXp(xp: number) {
  if (!Number.isFinite(xp) || xp < 0) throw new RangeError("XP invalide");
  let niveau = 1;
  while (niveau < NIVEAU_MAX_RPG && xp >= xpNiveauRpg(niveau)) { xp -= xpNiveauRpg(niveau); niveau++; }
  return { niveau, reste: niveau === NIVEAU_MAX_RPG ? 0 : xp };
}

/** Budget total de l'étage (combats, découverte, boss), pas une récompense forfaitaire par kill. */
export function budgetsXpEtages() {
  let precedent = 0;
  return NIVEAUX_FIN_ETAGE.map((niveau) => {
    let total = 0;
    for (let n = 1; n < niveau; n++) total += xpNiveauRpg(n);
    const budget = total - precedent;
    precedent = total;
    return budget;
  });
}
