/**
 * Générateur de contextes IA — 100 % déterministe, aucun appel réseau.
 * Principe : n'inclure QUE les informations sélectionnées, chacune avec sa provenance.
 */
import type { BibleCategory, Database, Provenance } from "./types";
import { mediaUrl } from "./markdown";
import { estimateTokens } from "./util";

export const TASKS = {
  illustration: {
    label: "Créer une illustration",
    bible: ["regles-visuelles", "contraintes-generation"] as BibleCategory[],
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
    bible: ["regles-narratives", "traditions", "geographie"] as BibleCategory[],
    wantsAppearance: true,
    wantsMedia: false,
  },
  video: {
    label: "Préparer une vidéo / publicité",
    bible: ["regles-visuelles", "regles-narratives", "contraintes-generation"] as BibleCategory[],
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

export interface ContextSource {
  kind: string;
  id: string;
  label: string;
  provenance?: Provenance;
  revision?: number;
}

export interface ContextPackage {
  markdown: string;
  tokens: number;
  sources: ContextSource[];
  files: { id: string; name: string; url: string; role: string }[];
  warnings: string[];
}

function clip(text: string, detail: ContextRequest["detail"], max = 600): string {
  const t = text.trim();
  if (detail === "detaille" || t.length <= max) return t;
  return t.slice(0, max).replace(/\s+\S*$/, "") + " […]";
}

function prov(p?: Provenance, revision?: number): string {
  if (!p) return "";
  return `_Source : ${p.source}${p.detail ? ` — ${p.detail}` : ""}${revision ? ` · rév. ${revision}` : ""}_`;
}

export function buildContext(db: Database, req: ContextRequest): ContextPackage {
  const task = TASKS[req.task];
  const out: string[] = [];
  const sources: ContextSource[] = [];
  const files: ContextPackage["files"] = [];
  const warnings: string[] = [];

  out.push(`# Contexte Porkonia — ${task.label}`);
  out.push(`Cible : ${TARGETS[req.target]} · Détail : ${req.detail === "court" ? "court" : "détaillé"}`);
  out.push("");
  out.push("## Consignes");
  out.push("- Utilise UNIQUEMENT les informations ci-dessous comme référence canonique de l'univers de Porkonia.");
  out.push("- N'invente pas d'élément canonique contradictoire ; signale toute information manquante.");
  out.push("- Les éléments marqués « proposition » ne sont pas validés.");
  if (req.style?.trim()) out.push(`- Style demandé : ${req.style.trim()}`);
  out.push("");
  out.push("## Tâche");
  out.push(req.instruction.trim() || "_(aucune instruction saisie)_");

  const characters = req.characterIds
    .map((id) => db.characters.find((c) => c.id === id && !c.deletedAt))
    .filter((c) => !!c);
  if (characters.length) {
    out.push("", "## Personnages");
    for (const c of characters) {
      sources.push({ kind: "personnage", id: c.id, label: c.canonicalName, provenance: c.provenance, revision: c.revision });
      if (c.isDemo) warnings.push(`« ${c.canonicalName} » est une donnée de DÉMONSTRATION, non canonique.`);
      if (c.status !== "canon") warnings.push(`« ${c.canonicalName} » a le statut « ${c.status} » (non canonique).`);
      out.push(`### ${c.canonicalName} (${c.id})${c.status !== "canon" ? ` — statut : ${c.status}` : ""}`);
      if (c.nicknames.length) out.push(`- Surnoms : ${c.nicknames.join(", ")}`);
      if (c.role) out.push(`- Fonction : ${c.role}`);
      if (c.affiliations.length) out.push(`- Affiliations : ${c.affiliations.join(", ")}`);
      if (task.wantsAppearance && c.appearance) out.push("", "**Apparence canonique :**", clip(c.appearance, "detaille"));
      else if (task.wantsAppearance) warnings.push(`Apparence de « ${c.canonicalName} » non renseignée.`);
      if (c.description) out.push("", "**Description :**", clip(c.description, req.detail));
      if (req.detail === "detaille" && c.biography) out.push("", "**Biographie :**", c.biography.trim());
      if (req.includeRelations && c.relations.length) {
        out.push("", "**Relations :**");
        for (const r of c.relations) {
          const t = db.characters.find((x) => x.id === r.targetId);
          out.push(`- ${r.kind} : ${t ? t.canonicalName : `inconnu (${r.targetId})`}${r.note ? ` — ${r.note}` : ""}`);
        }
      }
      if (task.wantsMedia) {
        const portrait = c.portraitMediaId ? db.media.find((m) => m.id === c.portraitMediaId && !m.deletedAt) : undefined;
        if (portrait) files.push({ id: portrait.id, name: portrait.name, url: mediaUrl(portrait), role: `Portrait officiel de ${c.canonicalName}` });
        else warnings.push(`Aucun portrait officiel pour « ${c.canonicalName} ».`);
        if (req.detail === "detaille") {
          for (const mid of c.galleryMediaIds) {
            const m = db.media.find((x) => x.id === mid && !x.deletedAt);
            if (m && m.id !== portrait?.id && m.canonStatus === "officiel")
              files.push({ id: m.id, name: m.name, url: mediaUrl(m), role: `Référence homologuée — ${c.canonicalName}` });
          }
        }
      }
      out.push("", prov(c.provenance, c.revision));
    }
  }

  const article = req.articleId ? db.articles.find((a) => a.id === req.articleId && !a.deletedAt) : undefined;
  if (req.articleId && !article) warnings.push(`Article ${req.articleId} introuvable.`);
  if (article) {
    sources.push({ kind: "article", id: article.id, label: article.title, provenance: article.provenance, revision: article.revision });
    if (article.isDemo) warnings.push(`L'article « ${article.title} » est une donnée de DÉMONSTRATION.`);
    out.push("", `## Article : ${article.title} (${article.id}, statut ${article.status})`);
    if (article.subtitle) out.push(`_${article.subtitle}_`);
    out.push(`Section : ${article.section || "—"} · Slug : ${article.slug}${article.aliases.length ? ` · Alias : ${article.aliases.join(", ")}` : ""}`);
    if (article.lead) out.push("", article.lead.trim());
    const body = req.task === "edition-article" || req.detail === "detaille" ? article.body.trim() : clip(article.body, "court", 1200);
    out.push("", body);
    out.push("", prov(article.provenance, article.revision));
  }

  const cats = new Set<BibleCategory>([...task.bible, ...req.extraBible]);
  const explicit = new Set(req.bibleIds ?? []);
  const bible = db.bible.filter(
    (b) =>
      !b.deletedAt &&
      b.status !== "archive" &&
      (explicit.has(b.id) ||
        (explicit.size === 0 &&
          cats.has(b.category) &&
          (b.characterIds.length === 0 || b.characterIds.some((id) => req.characterIds.includes(id))))),
  );
  if (bible.length) {
    out.push("", "## Extraits de la Bible canonique");
    for (const b of bible) {
      sources.push({ kind: "bible", id: b.id, label: b.title, provenance: b.provenance, revision: b.revision });
      if (b.isDemo) warnings.push(`L'entrée de Bible « ${b.title} » est une donnée de DÉMONSTRATION.`);
      out.push(`### ${b.title} [${b.category}]${b.status !== "canon" ? ` — ${b.status}` : ""}`, clip(b.body, req.detail), prov(b.provenance, b.revision));
    }
  } else if (cats.size || explicit.size) {
    warnings.push("Aucune entrée de Bible ne correspond : la Bible visuelle n'est peut-être pas encore importée.");
  }

  if (files.length) {
    out.push("", "## Fichiers de référence à joindre");
    for (const f of files) out.push(`- ${f.role} : ${f.name} — ${f.url}`);
  }

  out.push("", "---", `_Paquet généré par Porkonia OS le ${new Date().toISOString().slice(0, 10)} — ${sources.length} source(s)._`);
  const markdown = out.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
  return { markdown, tokens: estimateTokens(markdown), sources, files, warnings };
}
