/**
 * Compte en banque du citoyen (Caisse Nationale d'Épargne du Porc) : la monnaie est le Pork$ (celle de la Bourse du
 * jambon), en nombres entiers. Tout est fictif : l'argent n'existe que dans ce navigateur. Logique pure : chaque
 * opération rend un nouveau compte ou une erreur ; la date est fournie par l'appelant. Le compte porte aussi un
 * portefeuille de titres de la Bourse du jambon.
 */

export interface Operation {
  id: number;
  /** ISO. */
  date: string;
  libelle: string;
  /** Positif : crédit ; négatif : débit. */
  montant: number;
  /** Solde après l'opération. */
  solde: number;
}

export interface Compte {
  numero: string;
  titulaire: string;
  code: string;
  solde: number;
  historique: Operation[];
  prochainId: number;
  /** Jour (aaaa-mm-jj, heure locale) de la dernière allocation touchée. */
  derniereAllocation: string;
  /** Titres détenus, par nom : quantité, et total payé (pour le prix de revient). */
  portefeuille: Record<string, Position>;
  /** Primes et dividendes déjà touchés (voir `economie.ts`) : par identifiant, le jour et le nombre de fois. */
  compteurs?: Record<string, Compteur>;
  /** Abonnements en cours (prélèvements périodiques), par identifiant. */
  abonnements?: Record<string, AbonnementEnCours>;
}

export interface Compteur {
  /** Jour local (aaaa-mm-jj) du dernier passage. */
  jour: string;
  /** Passages ce jour-là. */
  jour_n: number;
  /** Passages depuis toujours. */
  total: number;
}

export interface AbonnementEnCours {
  /** ISO : souscription et dernier prélèvement (ou souscription s'il n'y en a pas encore). */
  depuis: string;
  dernier: string;
  /** Prélèvements effectués. */
  n: number;
}

export interface Position {
  qte: number;
  cout: number;
}

export const PRIME_BIENVENUE = 100;
export const ALLOCATION_JOUR = 25;
export const MAX_HISTORIQUE = 60;
export const PLAFOND = 1_000_000_000;

export type ErreurBanque = "solde" | "montant" | "code" | "plafond" | "titre" | "quantite";

/** Commission de l'État sur chaque ordre de bourse (en %, minimum 1 Pork$). */
export const COMMISSION = 0.02;
export const MAX_TITRES = 12;
export const MAX_PAR_TITRE = 100_000;
export type Resultat = { ok: true; compte: Compte } | { ok: false; erreur: ErreurBanque };

export const codeValide = (c: string) => /^\d{4}$/.test(c);
export const montantValide = (m: number) => Number.isInteger(m) && m > 0 && m <= PLAFOND;

/** « 1 250 Pork$ », avec espace insécable. */
export const formaterPork = (n: number) => `${n.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, "\u00a0")}\u00a0Pork$`;

export const jourLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function ecrire(c: Compte, libelle: string, montant: number, now: Date): Compte {
  const solde = c.solde + montant;
  const op: Operation = { id: c.prochainId, date: now.toISOString(), libelle, montant, solde };
  return { ...c, solde, prochainId: c.prochainId + 1, historique: [op, ...c.historique].slice(0, MAX_HISTORIQUE) };
}

/** Ouvre un compte, crédité de la prime de bienvenue. Rend null si le code n'est pas à quatre chiffres. */
export function ouvrir(numero: string, titulaire: string, code: string, now: Date): Compte | null {
  if (!codeValide(code) || !numero.trim()) return null;
  const vide: Compte = { numero: numero.trim(), titulaire: titulaire.trim() || "Citoyen", code, solde: 0, historique: [], prochainId: 1, derniereAllocation: "", portefeuille: {} };
  return ecrire(vide, "Prime de bienvenue de l'État", PRIME_BIENVENUE, now);
}

export const verifier = (c: Compte, code: string) => c.code === code;

export function debiter(c: Compte, montant: number, libelle: string, now: Date): Resultat {
  if (!montantValide(montant)) return { ok: false, erreur: "montant" };
  if (montant > c.solde) return { ok: false, erreur: "solde" };
  return { ok: true, compte: ecrire(c, libelle, -montant, now) };
}

export function crediter(c: Compte, montant: number, libelle: string, now: Date): Resultat {
  if (!montantValide(montant)) return { ok: false, erreur: "montant" };
  if (c.solde + montant > PLAFOND) return { ok: false, erreur: "plafond" };
  return { ok: true, compte: ecrire(c, libelle, montant, now) };
}

/** L'allocation civique se touche une fois par jour. */
export const allocationDisponible = (c: Compte, now: Date) => c.derniereAllocation !== jourLocal(now);

export function toucherAllocation(c: Compte, now: Date): Resultat {
  if (!allocationDisponible(c, now)) return { ok: false, erreur: "montant" };
  const r = crediter(c, ALLOCATION_JOUR, "Allocation de loyauté civique", now);
  return r.ok ? { ok: true, compte: { ...r.compte, derniereAllocation: jourLocal(now) } } : r;
}

const commission = (brut: number) => Math.max(1, Math.round(brut * COMMISSION));

/** Coût total d'un achat (commission comprise), en Pork$ entiers. */
export const coutAchat = (prix: number, qte: number) => {
  const brut = Math.ceil(prix * qte);
  return brut + commission(brut);
};

/** Produit net d'une vente (commission déduite). */
export const produitVente = (prix: number, qte: number) => {
  const brut = Math.floor(prix * qte);
  return Math.max(0, brut - commission(brut));
};

/** Achète `qte` titres au prix unitaire donné ; le prix de revient suit. */
export function acheter(c: Compte, titre: string, qte: number, prix: number, now: Date): Resultat {
  if (!Number.isInteger(qte) || qte <= 0) return { ok: false, erreur: "quantite" };
  if (!(prix > 0) || !titre) return { ok: false, erreur: "titre" };
  const pos = c.portefeuille[titre] ?? { qte: 0, cout: 0 };
  if (pos.qte + qte > MAX_PAR_TITRE || (!c.portefeuille[titre] && Object.keys(c.portefeuille).length >= MAX_TITRES)) return { ok: false, erreur: "plafond" };
  const cout = coutAchat(prix, qte);
  const r = debiter(c, cout, `Achat de ${qte} × ${titre}`, now);
  if (!r.ok) return r;
  return { ok: true, compte: { ...r.compte, portefeuille: { ...r.compte.portefeuille, [titre]: { qte: pos.qte + qte, cout: pos.cout + cout } } } };
}

/** Vend `qte` titres : le prix de revient baisse au prorata. */
export function vendre(c: Compte, titre: string, qte: number, prix: number, now: Date): Resultat {
  const pos = c.portefeuille[titre];
  if (!Number.isInteger(qte) || qte <= 0 || !pos || qte > pos.qte) return { ok: false, erreur: "quantite" };
  if (!(prix > 0)) return { ok: false, erreur: "titre" };
  const net = produitVente(prix, qte);
  const credit = net > 0 ? crediter(c, net, `Vente de ${qte} × ${titre}`, now) : ({ ok: true, compte: c } as Resultat);
  if (!credit.ok) return credit;
  const reste = pos.qte - qte;
  const portefeuille = { ...credit.compte.portefeuille };
  if (reste === 0) delete portefeuille[titre];
  else portefeuille[titre] = { qte: reste, cout: Math.round((pos.cout * reste) / pos.qte) };
  return { ok: true, compte: { ...credit.compte, portefeuille } };
}

/** Valeur du portefeuille aux cours donnés (par nom de titre) et plus-value latente. */
export function valoriser(c: Compte, prix: Record<string, number>) {
  let valeur = 0;
  let cout = 0;
  for (const [t, p] of Object.entries(c.portefeuille)) {
    valeur += Math.floor((prix[t] ?? 0) * p.qte);
    cout += p.cout;
  }
  return { valeur, cout, plusValue: valeur - cout };
}

/** Relit un compte conservé ; ce qui est mal formé est écarté (null : pas de compte). */
export function sanitize(v: unknown): Compte | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.numero !== "string" || typeof o.code !== "string" || !codeValide(o.code) || typeof o.solde !== "number" || !Number.isInteger(o.solde) || o.solde < 0 || o.solde > PLAFOND) return null;
  const hist = Array.isArray(o.historique) ? o.historique : [];
  const historique: Operation[] = hist
    .filter((x): x is Operation => !!x && typeof x === "object" && typeof (x as Operation).id === "number" && typeof (x as Operation).libelle === "string" && typeof (x as Operation).montant === "number" && typeof (x as Operation).solde === "number" && typeof (x as Operation).date === "string")
    .slice(0, MAX_HISTORIQUE)
    .map((x) => ({ id: x.id, date: x.date.slice(0, 40), libelle: x.libelle.slice(0, 120), montant: x.montant, solde: x.solde }));
  return {
    numero: o.numero.slice(0, 40),
    titulaire: typeof o.titulaire === "string" ? o.titulaire.slice(0, 60) : "Citoyen",
    code: o.code,
    solde: o.solde,
    historique,
    prochainId: typeof o.prochainId === "number" && Number.isFinite(o.prochainId) ? Math.max(o.prochainId, historique.reduce((a, x) => Math.max(a, x.id + 1), 1)) : historique.reduce((a, x) => Math.max(a, x.id + 1), 1),
    derniereAllocation: typeof o.derniereAllocation === "string" ? o.derniereAllocation.slice(0, 10) : "",
    portefeuille: sanitizePortefeuille(o.portefeuille),
    ...optionnel("compteurs", sanitizeCompteurs(o.compteurs)),
    ...optionnel("abonnements", sanitizeAbonnements(o.abonnements)),
  };
}

function sanitizePortefeuille(v: unknown): Record<string, Position> {
  const out: Record<string, Position> = {};
  if (!v || typeof v !== "object") return out;
  for (const [nom, p] of Object.entries(v as Record<string, unknown>).slice(0, MAX_TITRES)) {
    const q = p as Position;
    if (nom.length > 0 && nom.length <= 60 && q && Number.isInteger(q.qte) && q.qte > 0 && q.qte <= MAX_PAR_TITRE && Number.isInteger(q.cout) && q.cout >= 0) out[nom] = { qte: q.qte, cout: q.cout };
  }
  return out;
}

/** Champ facultatif : absent plutôt que vide, pour que les comptes anciens se relisent à l'identique. */
const optionnel = <K extends string, V extends object>(k: K, v: V) => (Object.keys(v).length ? ({ [k]: v } as Record<K, V>) : {});

const entier = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 1_000_000;
const date = (v: unknown) => typeof v === "string" && v.length <= 40 && Number.isFinite(Date.parse(v));

function sanitizeCompteurs(v: unknown): Record<string, Compteur> {
  const out: Record<string, Compteur> = {};
  if (!v || typeof v !== "object") return out;
  for (const [id, x] of Object.entries(v as Record<string, unknown>).slice(0, 200)) {
    const q = x as Compteur;
    if (id.length <= 60 && q && typeof q.jour === "string" && /^\d{4}-\d{2}-\d{2}$/.test(q.jour) && entier(q.jour_n) && entier(q.total)) out[id] = { jour: q.jour, jour_n: q.jour_n, total: q.total };
  }
  return out;
}

function sanitizeAbonnements(v: unknown): Record<string, AbonnementEnCours> {
  const out: Record<string, AbonnementEnCours> = {};
  if (!v || typeof v !== "object") return out;
  for (const [id, x] of Object.entries(v as Record<string, unknown>).slice(0, 20)) {
    const a = x as AbonnementEnCours;
    if (id.length <= 60 && a && date(a.depuis) && date(a.dernier) && entier(a.n)) out[id] = { depuis: a.depuis, dernier: a.dernier, n: a.n };
  }
  return out;
}
