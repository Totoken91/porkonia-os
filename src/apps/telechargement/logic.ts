/** Téléchargement de fichier : débit qui fluctue, temps restant, tailles affichées comme en l'an 2000. Logique pure. */

/** Débit de la seconde `s` (Ko/s) : la ligne nationale oscille autour du débit moyen, avec des creux. */
export function debitA(debit: number, s: number): number {
  const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
  const f = x - Math.floor(x);
  return debit * (f < 0.12 ? 0.15 : 0.55 + f * 0.9);
}

/** Ko reçus après `ms` millisecondes. */
export function recu(taille: number, debit: number, ms: number): number {
  let total = 0;
  const secondes = ms / 1000;
  for (let s = 0; s < Math.floor(secondes); s++) total += debitA(debit, s);
  total += debitA(debit, Math.floor(secondes)) * (secondes - Math.floor(secondes));
  return Math.min(taille, total);
}

export function formatTaille(ko: number): string {
  if (ko >= 1024) return `${(ko / 1024).toFixed(2).replace(".", ",")} Mo`;
  return `${Math.round(ko)} Ko`;
}

export function formatDuree(s: number): string {
  const t = Math.max(0, Math.ceil(s));
  if (t < 60) return `${t} s`;
  return `${Math.floor(t / 60)} min ${String(t % 60).padStart(2, "0")} s`;
}
