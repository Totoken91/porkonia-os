/**
 * DONNÉES DE DÉMONSTRATION — NON CANONIQUES.
 * Personnages, articles et règles inventés uniquement pour tester l'interface.
 * Ils portent `isDemo: true` et sont signalés partout dans l'application.
 * Seules exceptions « réelles » : deux URL publiques de médias existants de Porkopédia,
 * référencées (jamais copiées) pour démontrer le catalogage de médias externes.
 */
import type { Database } from "@/domain/types";
import { SCHEMA_VERSION } from "@/domain/types";
import {
  createArticle,
  createBibleEntry,
  createCharacter,
  createMedia,
  linkMedia,
  setArticleStatus,
  setPortrait,
  updateCharacter,
} from "@/domain/ops";

const PORKOPEDIA = "https://porkopedia.totoken.chatgpt.site/";

export function demoDatabase(): Database {
  const db: Database = {
    schemaVersion: SCHEMA_VERSION,
    characters: [],
    articles: [],
    media: [],
    bible: [],
    revisions: [],
    publications: [],
    log: [],
    backups: [],
  };

  const groinard = createCharacter(db, {
    canonicalName: "Agent Groinard (démo)",
    nicknames: ["Le Tamponneur", "Dossier 012"],
    role: "Sous-chef adjoint du Bureau des illustrations homologuées",
    description: "Fonctionnaire fictif créé pour tester le Registre national des individus. Il n'appartient pas au canon de Porkonia.",
    appearance: "Homme de taille moyenne, moustache administrative réglementaire, costume gris trop grand, tampon encreur toujours à la main.",
    biography: "Entré au ministère en 2005, il attend depuis la validation de sa propre fiche. Donnée de démonstration.",
    affiliations: ["Bureau des illustrations homologuées (démo)"],
    events: ["Inauguration du guichet n°4 (démo)"],
    narrativeRefs: [],
    status: "canon",
  });

  const paperasse = createCharacter(db, {
    canonicalName: "Madame Paperasse (démo)",
    nicknames: ["La Préfète"],
    role: "Préfète des Publications (fiction de test)",
    description: "Personnage de démonstration chargé de refuser les formulaires incomplets.",
    appearance: "Chignon strict, lunettes à double foyer, gilet bordeaux, trois stylos attachés à une chaînette.",
    biography: "",
    affiliations: ["Préfecture des Publications (démo)"],
    events: [],
    narrativeRefs: [],
    status: "proposition",
  });

  updateCharacter(db, groinard.id, {
    relations: [{ targetId: paperasse.id, kind: "Supérieure hiérarchique", note: "Relation de démonstration." }],
  });

  const embleme = createMedia(db, {
    name: "Emblème-insigne de Porkopédia",
    description: "Référence externe vers un média EXISTANT de Porkopédia (non copié). Utilisé ici comme exemple de catalogage.",
    kind: "logo",
    location: "externe",
    ref: `${PORKOPEDIA}assets/embleme-insigne.png`,
    canonStatus: "officiel",
    source: "porkopedia:index.html (référence d'exemple)",
  });
  const carte = createMedia(db, {
    name: "Carte canonique de Porkonia",
    description: "Référence externe vers la carte publiée sur Porkopédia (non copiée).",
    kind: "illustration",
    location: "externe",
    ref: `${PORKOPEDIA}assets/carte-porkonia-canonique.jpg`,
    canonStatus: "officiel",
    source: "porkopedia:index.html (référence d'exemple)",
  });
  const portraitDemo = createMedia(db, {
    name: "Portrait officiel — Agent Groinard (démo)",
    description: "Fichier LOCAL de démonstration (medias-locales/demo/). Remplaçable par un vrai média.",
    kind: "illustration",
    location: "locale",
    ref: "demo/portrait-groinard.svg",
    canonStatus: "officiel",
    source: "demo",
  });
  const varianteDemo = createMedia(db, {
    name: "Variante non officielle — Agent Groinard (démo)",
    description: "Exemple de génération non homologuée : ne peut pas devenir portrait sans validation.",
    kind: "illustration",
    location: "locale",
    ref: "demo/variante-groinard.svg",
    canonStatus: "proposition",
    variantOf: null,
    source: "demo",
  });

  linkMedia(db, portraitDemo.id, { characterId: groinard.id });
  linkMedia(db, varianteDemo.id, { characterId: groinard.id });
  setPortrait(db, groinard.id, portraitDemo.id);

  const guichet = createArticle(db, {
    title: "Le Guichet n°4 (article de démonstration)",
    subtitle: "Institution fictive servant à tester le Ministère du Lore",
    section: "Institutions et droit",
    tags: ["démo", "administration"],
    lead: "Le Guichet n°4 est un article d'exemple : il n'appartient pas au canon de Porkonia.",
    body: [
      "## Présentation",
      "",
      "Le **Guichet n°4** est ouvert du mardi au mardi. Il est tenu par [[agent-groinard|l'Agent Groinard]] — *lien volontairement cassé pour tester le contrôle d'intégrité*.",
      "",
      "Voir aussi : [[la-prefecture-des-publications-article-de-demonstration]].",
      "",
      `![Carte de Porkonia](media:${carte.id})`,
      "",
      "| Formulaire | Délai |",
      "|---|---|",
      "| Cerfa 12-A | 3 à 400 jours |",
      "| Cerfa 12-B | variable |",
    ].join("\n"),
    characterIds: [groinard.id],
    aliases: ["guichet-4"],
  });
  linkMedia(db, carte.id, { articleId: guichet.id });

  const prefecture = createArticle(db, {
    title: "La Préfecture des Publications (article de démonstration)",
    subtitle: "Exemple de brouillon",
    section: "Institutions et droit",
    tags: ["démo"],
    lead: "Brouillon d'exemple.",
    body: "## Mission\n\nLa Préfecture refuse les formulaires incomplets. Elle est dirigée par Madame Paperasse (démo).\n\nRetour vers [[guichet-4|le Guichet n°4]] (via un alias).",
    characterIds: [paperasse.id],
  });
  setArticleStatus(db, guichet.id, "valide");
  void prefecture;

  createBibleEntry(db, {
    category: "regles-visuelles",
    title: "Exemple — Rendu photographique (démo)",
    body: "Règle de démonstration : les images « archives » imitent un appareil photo numérique des années 2000 (flash direct, balance des blancs hésitante). À remplacer par l'import de la Bible visuelle DOCX.",
    status: "canon",
    characterIds: [],
    source: "demo",
  });
  createBibleEntry(db, {
    category: "contraintes-generation",
    title: "Exemple — Ne jamais modifier l'apparence canonique (démo)",
    body: "Règle de démonstration : une génération ne remplace jamais une apparence canonique sans validation explicite.",
    status: "canon",
    characterIds: [],
    source: "demo",
  });
  createBibleEntry(db, {
    category: "regles-narratives",
    title: "Exemple — Humour administratif (démo)",
    body: "Règle de démonstration : l'humour naît de la disproportion entre la solennité administrative et l'absurdité du sujet.",
    status: "canon",
    characterIds: [],
    source: "demo",
  });
  void embleme;

  // Marquage explicite « démo » de tout le contenu, y compris les instantanés de révision.
  for (const coll of [db.characters, db.articles, db.media, db.bible]) {
    for (const e of coll) {
      e.isDemo = true;
      if (e.provenance.source === "saisie-manuelle") e.provenance.source = "demo";
    }
  }
  for (const r of db.revisions) {
    const snap = r.snapshot as { isDemo?: boolean; provenance?: { source: string } };
    snap.isDemo = true;
    if (snap.provenance?.source === "saisie-manuelle") snap.provenance.source = "demo";
  }
  db.log.push({
    id: "log_init",
    at: new Date().toISOString(),
    action: "Initialisation",
    summary: "Base initialisée avec des DONNÉES DE DÉMONSTRATION (non canoniques).",
    entityType: "systeme",
  });
  return db;
}
