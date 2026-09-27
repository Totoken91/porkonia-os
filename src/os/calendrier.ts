/** Calendrier de la zone de notification : grille du mois, semaines commençant le lundi. Logique pure. */

/** Semaines du mois (`mois` de 0 à 11) : chaque case est un jour du mois, ou null hors du mois. */
export function grilleMois(annee: number, mois: number): (number | null)[][] {
  const premier = (new Date(annee, mois, 1).getDay() + 6) % 7; // lundi = 0
  const jours = new Date(annee, mois + 1, 0).getDate();
  const cases: (number | null)[] = [...Array<null>(premier).fill(null), ...Array.from({ length: jours }, (_, i) => i + 1)];
  while (cases.length % 7) cases.push(null);
  const semaines: (number | null)[][] = [];
  for (let i = 0; i < cases.length; i += 7) semaines.push(cases.slice(i, i + 7));
  return semaines;
}

/** Mois voisin : { annee, mois } décalé de `pas` mois. */
export function decaler(annee: number, mois: number, pas: number): { annee: number; mois: number } {
  const n = annee * 12 + mois + pas;
  return { annee: Math.floor(n / 12), mois: ((n % 12) + 12) % 12 };
}

/** Angles des aiguilles (degrés, 0 = midi, sens horaire). */
export function aiguilles(d: Date): { h: number; m: number; s: number } {
  const s = d.getSeconds();
  const m = d.getMinutes() + s / 60;
  const h = (d.getHours() % 12) + m / 60;
  return { h: h * 30, m: m * 6, s: s * 6 };
}
