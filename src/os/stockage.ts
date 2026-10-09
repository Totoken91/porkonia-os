/**
 * Registre de tout ce que PorkOS conserve dans le navigateur (`localStorage`). Aucune clé `porkos.*` ne s'écrit
 * ailleurs : un test parcourt les sources et refuse toute clé tapée à la main. Ajouter une donnée conservée, c'est
 * ajouter une ligne ici ; la séparation par profil et la reprise des anciennes sauvegardes en découlent.
 *
 * Forme d'une clé : `base[.hote][.pack][.profil]`. Ces formes reproduisent exactement les clés historiques : ne pas
 * les changer sans migration, sinon les sauvegardes existantes ne sont plus relues.
 */

/** « poste » : commun à tous les profils de ce navigateur. « profil » : une copie par compte. */
export type Portee = "poste" | "profil";

/**
 * Situation avant les comptes locaux (octobre 2026) :
 * - « partagee » : une seule clé pour tout le poste, copiée vers le premier compte qui reprend les sauvegardes ;
 * - « citoyen » : la clé portait déjà l'identifiant historique `citoyen`, que le premier compte reprend tel quel ;
 * - « aucune » : rien à reprendre.
 */
export type Heritage = "partagee" | "citoyen" | "aucune";

export interface DefStockage {
  base: string;
  portee: Portee;
  heritage: Heritage;
  /** La clé porte l'identifiant du pack de contenu. */
  parPack?: boolean;
  /** La clé porte l'hôte d'un site PigNet (livres d'or). */
  parHote?: boolean;
  role: string;
}

export const STOCKAGE = {
  enMarche: { base: "porkos.en-marche", portee: "poste", heritage: "aucune", role: "Marqueur « le système tourne » : survit à une coupure et déclenche ScanDisque." },
  comptes: { base: "porkos.comptes.v1", portee: "poste", heritage: "aucune", role: "Registre des comptes locaux (empreintes de mot de passe, jamais le mot de passe)." },
  selection: { base: "porkos.compte.selection", portee: "poste", heritage: "aucune", role: "Dernier profil choisi à l'écran de connexion." },
  reglages: { base: "porkos.reglages", portee: "profil", heritage: "partagee", role: "Réglages d'État ; la clé sans profil sert avant la connexion." },
  courrier: { base: "porkos.courrier", portee: "profil", parPack: true, heritage: "partagee", role: "Boîte aux lettres et brouillons." },
  fenetres: { base: "porkos.fenetres", portee: "profil", parPack: true, heritage: "partagee", role: "Fenêtres ouvertes, rouvertes après un arrêt propre." },
  bureau: { base: "porkos.bureau", portee: "profil", parPack: true, heritage: "partagee", role: "Positions des icônes du bureau." },
  disque: { base: "porkos.disque", portee: "profil", parPack: true, heritage: "citoyen", role: "Disque virtuel : documents, dessins, programmes installés." },
  distinctions: { base: "porkos.distinctions", portee: "profil", parPack: true, heritage: "citoyen", role: "Distinctions obtenues et compteurs de signaux." },
  sessions: { base: "porkos.sessions", portee: "profil", parPack: true, heritage: "citoyen", role: "Nombre de sessions ouvertes." },
  banque: { base: "porkos.banque", portee: "profil", heritage: "citoyen", role: "Compte à la Caisse Nationale d'Épargne du Porc (Pork$ fictifs)." },
  vieLocale: { base: "porkos.pignet.vie", portee: "profil", heritage: "citoyen", role: "Annonces, courrier des lecteurs et horoscope du citoyen sur PigNet." },
  livreDor: { base: "porkos.livredor", portee: "profil", parHote: true, heritage: "partagee", role: "Messages signés dans les livres d'or PigNet." },
  executer: { base: "porkos.executer.historique", portee: "profil", heritage: "partagee", role: "Historique de la boîte Exécuter." },
  partieOrdreCochon: { base: "porkos.jambonjon.partie", portee: "profil", heritage: "partagee", role: "Partie en cours de L'Ordre Cochon." },
  conseilsOrdreCochon: { base: "porkos.jambonjon.conseils", portee: "profil", heritage: "partagee", role: "Conseils de jeu activés ou non." },
  biere: { base: "porkos.biere", portee: "profil", heritage: "partagee", role: "Bières en route et livrées (Porkomazon)." },
  saucisson: { base: "porkos.saucisson", portee: "profil", heritage: "partagee", role: "Saucissons en route et livrés (Porkomazon)." },
  ivresse: { base: "porkos.ivresse", portee: "profil", heritage: "partagee", role: "Niveau d'ébriété (l'écran tangue)." },
} as const satisfies Record<string, DefStockage>;

export type NomStockage = keyof typeof STOCKAGE;

/** Identifiant de profil des sauvegardes antérieures aux comptes. */
export const PROFIL_HISTORIQUE = "citoyen";

const defDe = (nom: NomStockage): DefStockage => STOCKAGE[nom];

/**
 * Clé d'une donnée conservée. Une donnée de profil exige `profil` ; `pack` et `hote` sont exigés quand la définition
 * les porte. Les données du poste ignorent le profil.
 */
export function cle(nom: NomStockage, o: { profil?: string; pack?: string; hote?: string } = {}): string {
  const d = defDe(nom);
  const parts = [d.base];
  if (d.parHote) parts.push(exiger(o.hote, nom, "hote"));
  if (d.parPack) parts.push(exiger(o.pack, nom, "pack"));
  if (d.portee === "profil") parts.push(exiger(o.profil, nom, "profil"));
  return parts.join(".");
}

/** Clé partagée d'avant les comptes (sans profil), pour la reprise et, pour les réglages, avant la connexion. */
export function cleSansProfil(nom: NomStockage, o: { pack?: string; hote?: string } = {}): string {
  const d = defDe(nom);
  const parts = [d.base];
  if (d.parHote) parts.push(exiger(o.hote, nom, "hote"));
  if (d.parPack) parts.push(exiger(o.pack, nom, "pack"));
  return parts.join(".");
}

function exiger(v: string | undefined, nom: string, champ: string): string {
  if (!v) throw new Error(`Stockage « ${nom} » : ${champ} manquant`);
  if (v.includes(".")) throw new Error(`Stockage « ${nom} » : ${champ} sans point attendu (« ${v} »)`);
  return v;
}

/* ------------------------------ Reprise d'avant les comptes ------------------------------ */

/**
 * Couples (ancienne clé partagée → clé du profil historique) à copier quand le premier compte reprend les
 * sauvegardes. Les livres d'or, un par site, sont retrouvés en parcourant le stockage.
 */
export function clesHeritage(pack: string, stockage: Storage): [string, string][] {
  const out: [string, string][] = [];
  for (const nom of Object.keys(STOCKAGE) as NomStockage[]) {
    const d = defDe(nom);
    if (d.heritage !== "partagee" || d.portee !== "profil") continue;
    if (!d.parHote) {
      const avant = cleSansProfil(nom, { pack });
      out.push([avant, `${avant}.${PROFIL_HISTORIQUE}`]);
      continue;
    }
    // Ancienne forme : `base.hote`, un seul segment après la base (les hôtes ne contiennent pas de point).
    for (let i = 0; i < stockage.length; i++) {
      const k = stockage.key(i);
      if (!k?.startsWith(`${d.base}.`)) continue;
      const reste = k.slice(d.base.length + 1);
      if (reste && !reste.includes(".")) out.push([k, `${k}.${PROFIL_HISTORIQUE}`]);
    }
  }
  return out;
}

/** Clés qui portaient déjà le profil historique : leur présence suffit à proposer la reprise. */
export function clesHistoriques(pack: string): string[] {
  return (Object.keys(STOCKAGE) as NomStockage[])
    .filter((nom) => defDe(nom).heritage === "citoyen")
    .map((nom) => cle(nom, { pack, profil: PROFIL_HISTORIQUE }));
}
