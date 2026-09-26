/** Configuration du générateur de contextes (sans dépendance Node : importable côté client). */
import type { BibleCategory } from "./types";

export const TASKS = {
  illustration: {
    label: "Créer une illustration",
    bible: ["regles-visuelles", "contraintes-generation", "personnages"] as BibleCategory[],
    wantsAppearance: true,
    wantsMedia: true,
  },
  "edition-article": {
    label: "Modifier / enrichir un article",
    bible: ["regles-narratives", "chronologie", "geographie", "organisations"] as BibleCategory[],
    wantsAppearance: false,
    wantsMedia: false,
  },
  "ecriture-scene": {
    label: "Écrire une scène narrative",
    bible: ["regles-narratives", "traditions", "geographie", "personnages"] as BibleCategory[],
    wantsAppearance: true,
    wantsMedia: false,
  },
  video: {
    label: "Préparer une vidéo / publicité",
    bible: ["regles-visuelles", "regles-narratives", "contraintes-generation", "personnages"] as BibleCategory[],
    wantsAppearance: true,
    wantsMedia: true,
  },
  libre: { label: "Tâche libre", bible: [] as BibleCategory[], wantsAppearance: true, wantsMedia: true },
} as const;

export type TaskKey = keyof typeof TASKS;

export const TARGETS = {
  generique: "Générique (tout modèle)",
  chatgpt: "ChatGPT / GPT Image",
  claude: "Claude",
  midjourney: "Midjourney / générateur d'images",
  video: "Générateur vidéo (Kling, Sora…)",
} as const;
export type TargetKey = keyof typeof TARGETS;

export interface ContextRequest {
  task: TaskKey;
  instruction: string;
  characterIds: string[];
  articleId?: string | null;
  /** Catégories de Bible supplémentaires (en plus de celles de la tâche). */
  extraBible: BibleCategory[];
  /** Entrées de Bible cochées individuellement (prioritaires sur les catégories). */
  bibleIds?: string[];
  style?: string;
  target: TargetKey;
  detail: "court" | "detaille";
  includeRelations: boolean;
}

