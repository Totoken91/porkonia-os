/** PorkAmp : petites règles du lecteur (temps, piste suivante, texte défilant). Logique pure. */

/** 83 → « 1:23 » ; inconnu → « -:-- ». */
export function formatTemps(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "-:--";
  const t = Math.floor(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

/** Piste suivante (`pas` = 1) ou précédente (-1), en boucle ; au hasard si `alea`, sans rejouer la même. */
export function autrePiste(i: number, n: number, pas: 1 | -1, alea: boolean, tirage: number): number {
  if (n <= 1) return 0;
  if (alea) return (i + 1 + Math.floor(tirage * (n - 1))) % n;
  return (i + pas + n) % n;
}

/** Texte de l'afficheur, prêt à défiler : « 1. DJ Viteau - Titre (3:12) *** ». */
export function titreDefilant(i: number, piste: { titre: string; artiste: string }, duree: number): string {
  return `${i + 1}. ${piste.artiste} - ${piste.titre} (${formatTemps(duree)})  ***  `;
}
