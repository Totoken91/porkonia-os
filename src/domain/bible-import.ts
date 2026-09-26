/**
 * Import de la Bible visuelle (DOCX) — planification et application (logique pure).
 * Les fichiers (DOCX original, images) sont écrits AVANT par src/bible/docx-store.ts :
 * ce module ne crée que les enregistrements qui les référencent.
 *
 * Règles :
 * - Le document original est conservé intact ; chaque entrée garde sa provenance (document + section).
 * - Les images sont les originaux, octet pour octet ; nature « référence source » si placées dans le document.
 * - Un portrait est associé à un personnage uniquement selon la correspondance validée dans la prévisualisation.
 * - Un portrait existant n'est jamais remplacé sans décision explicite ; une référence source n'est jamais
 *   remplacée par une image générée (règle appliquée dans setPortrait).
 * - Rien n'est inventé : une catégorie absente du document reste vide.
 */
import type { DocxAnalysis } from "@/bible/docx-parse";
import type { BibleCategory, BibleEntry, Character, Database, ImportBatch, ImportChange, Media } from "./types";
import { commit, createBibleEntry, createCharacter, createMedia, findEntity, log, setPortrait, touch } from "./ops";
import { findCharacterByNames } from "./porkopedia-import";
import { DomainError, newId, nowIso } from "./util";

export const BIBLE_CATEGORY_KEYS: BibleCategory[] = ["regles-visuelles", "regles-narratives", "geographie", "chronologie", "organisations", "personnages", "traditions", "contraintes-generation"];

export const bibleMediaDir = (docSha: string) => `bible-visuelle/${docSha.slice(0, 12)}`;

export interface BibleSectionPlan {
  key: string;
  path: string;
  title: string;
  chars: number;
  images: number;
  suggestedCategory: BibleCategory | null;
  action: "creer" | "inchange" | "mettre-a-jour" | "conflit";
  existingId?: string;
  reason: string;
  defaultDecision: "importer" | "ignorer" | "garder-local";
}

export interface BibleImagePlan {
  key: string;
  file: string;
  name: string;
  role: DocxAnalysis["images"][number]["role"];
  context: string;
  width: number | null;
  height: number | null;
  bytes: number;
  sha256: string;
  action: "creer" | "existant";
  existingId?: string;
}

export interface BiblePortraitPlan {
  key: string;
  image: string;
  name: string;
  originalFilename: string | null;
  appearance: string;
  matchId?: string;
  matchName?: string;
  /** Portrait actuel du personnage associé, s'il diffère. */
  currentPortrait?: { id: string; name: string; nature?: string };
  currentAppearance?: string;
  defaultDecision: string; // "associer:<id>" | "creer" | "ignorer"
}

export interface BiblePlan {
  documentSha256: string;
  filename: string;
  alreadyRegistered: boolean;
  sections: BibleSectionPlan[];
  images: BibleImagePlan[];
  portraits: BiblePortraitPlan[];
  missingCategories: BibleCategory[];
  warnings: string[];
  counts: Record<string, number>;
}

export function planBibleImport(db: Database, an: DocxAnalysis): BiblePlan {
  const sections: BibleSectionPlan[] = an.sections.map((s) => {
    const key = `section:${s.path}`;
    const existing = db.bible.find((b) => b.external?.source === "bible-docx" && b.external.sectionPath === s.path && !b.deletedAt);
    const base = { key, path: s.path, title: s.title, chars: s.chars, images: s.images.length, suggestedCategory: s.suggestedCategory };
    if (!existing) return { ...base, action: "creer" as const, reason: s.suggestedCategory ? "Nouvelle section." : "Nouvelle section — catégorie à choisir.", defaultDecision: s.suggestedCategory ? ("importer" as const) : ("ignorer" as const) };
    if (existing.external!.textHash === s.textHash) return { ...base, existingId: existing.id, action: "inchange" as const, reason: "Déjà importée, texte identique.", defaultDecision: "ignorer" as const };
    const local = existing.revision > existing.external!.importedRevision;
    return local
      ? { ...base, existingId: existing.id, action: "conflit" as const, reason: "Modifiée dans Porkonia OS ET dans le document depuis le dernier import.", defaultDecision: "garder-local" as const }
      : { ...base, existingId: existing.id, action: "mettre-a-jour" as const, reason: "Texte modifié dans le document ; l'ancienne version reste dans l'historique.", defaultDecision: "importer" as const };
  });

  const images: BibleImagePlan[] = an.images.map((im) => {
    const existing = db.media.find((m) => m.sha256 === im.sha256 && !m.deletedAt);
    const pl = im.placements[0];
    return {
      key: `image:${im.file}`,
      file: im.file,
      name: im.name,
      role: im.role,
      context: pl ? `${pl.sectionPath}${pl.cellName ? ` — ${pl.cellName}` : ""}${pl.caption ? ` — « ${pl.caption} »` : ""}` : im.role === "miniature" ? "Miniature du document (docProps)" : "Non placée dans le corps du document",
      width: im.width,
      height: im.height,
      bytes: im.bytes,
      sha256: im.sha256,
      action: existing ? "existant" : "creer",
      existingId: existing?.id,
    };
  });

  const portraits: BiblePortraitPlan[] = an.portraits.map((p) => {
    const match = findCharacterByNames(db, p.names);
    const current = match?.portraitMediaId ? db.media.find((m) => m.id === match.portraitMediaId) : undefined;
    const imgSha = an.images.find((i) => i.file === p.image)?.sha256;
    const differs = current && current.sha256 !== imgSha;
    return {
      key: `portrait:${p.image}`,
      image: p.image,
      name: p.name,
      originalFilename: p.originalFilename,
      appearance: p.appearance,
      matchId: match?.id,
      matchName: match?.canonicalName,
      currentPortrait: differs ? { id: current!.id, name: current!.name, nature: current!.nature } : undefined,
      currentAppearance: match?.appearance?.trim() ? match.appearance : undefined,
      defaultDecision: match ? `associer:${match.id}` : "creer",
    };
  });

  const covered = new Set(an.sections.map((s) => s.suggestedCategory).filter(Boolean));
  return {
    documentSha256: an.sha256,
    filename: an.filename,
    alreadyRegistered: db.sources.some((s) => s.sha256 === an.sha256),
    sections,
    images,
    portraits,
    missingCategories: BIBLE_CATEGORY_KEYS.filter((c) => !covered.has(c)),
    warnings: an.warnings,
    counts: {
      sections: sections.length,
      sectionsNouvelles: sections.filter((s) => s.action === "creer").length,
      sectionsAClasser: sections.filter((s) => !s.suggestedCategory).length,
      sectionsInchangees: sections.filter((s) => s.action === "inchange").length,
      sectionsConflits: sections.filter((s) => s.action === "conflit").length,
      images: images.length,
      imagesNouvelles: images.filter((i) => i.action === "creer").length,
      portraits: portraits.length,
      portraitsAssocies: portraits.filter((p) => p.matchId).length,
      portraitsSansCorrespondance: portraits.filter((p) => !p.matchId).length,
      portraitsEnConflit: portraits.filter((p) => p.currentPortrait).length,
    },
  };
}

export interface BibleDecisions {
  /** section:<path> → importer | ignorer | garder-local */
  sections: Record<string, string>;
  /** section:<path> → catégorie choisie */
  categories: Record<string, BibleCategory>;
  /** image:<file> → importer | ignorer */
  images: Record<string, string>;
  /** portrait:<file> → associer:<charId> | creer | ignorer */
  portraits: Record<string, string>;
  /** portrait:<file> → garder | remplacer (si le personnage a déjà un autre portrait) */
  replacePortrait: Record<string, string>;
  /** portrait:<file> → garder | remplacer | completer (si l'apparence existe déjà) */
  appearance: Record<string, string>;
}

export const emptyBibleDecisions = (): BibleDecisions => ({ sections: {}, categories: {}, images: {}, portraits: {}, replacePortrait: {}, appearance: {} });

export function applyBibleImport(db: Database, an: DocxAnalysis, plan: BiblePlan, dec: BibleDecisions, stored: { docPath: string; mediaDir: string }): ImportBatch {
  if (plan.documentSha256 !== an.sha256) throw new DomainError("Plan et document ne correspondent pas.", "INVALIDE");
  const at = nowIso();
  const changes: ImportChange[] = [];
  const src = `bible-visuelle:${an.filename}`;
  const shaShort = an.sha256.slice(0, 12);

  if (!db.sources.some((s) => s.sha256 === an.sha256)) {
    db.sources.push({ id: newId("log").replace("log_", "doc_"), kind: "docx", filename: an.filename, sha256: an.sha256, bytes: an.bytes, storedAt: stored.docPath, registeredAt: at });
    log(db, "Document source", `Document « ${an.filename} » enregistré (copie intacte ${stored.docPath}, SHA-256 ${an.sha256})`, "systeme");
  }

  // 1) Images (fichiers déjà copiés à l'identique dans stored.mediaDir).
  const mediaByFile = new Map<string, Media>();
  const portraitByImage = new Map(an.portraits.map((p) => [p.image, p]));
  for (const ip of plan.images) {
    const im = an.images.find((x) => x.file === ip.file)!;
    if (ip.action === "existant") {
      mediaByFile.set(im.file, db.media.find((m) => m.id === ip.existingId)!);
      continue;
    }
    if ((dec.images[ip.key] ?? "importer") !== "importer") continue;
    const portrait = portraitByImage.get(im.file);
    const placed = im.placed;
    const m = createMedia(db, {
      name: portrait ? `Visage canonique — ${portrait.name}` : `${an.filename.replace(/\.docx$/i, "")} — ${im.name}`,
      description: ip.context,
      kind: im.role === "identite" ? "logo" : im.role === "portrait" ? "photo" : "illustration",
      location: "locale",
      ref: `${stored.mediaDir}/${im.name}`,
      canonStatus: placed ? "officiel" : "archive",
      nature: placed ? "reference-source" : "indeterminee",
      width: im.width,
      height: im.height,
      format: im.format,
      sha256: im.sha256,
      external: { source: "bible-docx", originalRef: im.file, foundIn: im.placements.map((p) => p.sectionPath), displayed: placed, documentSha256: an.sha256, originalFilename: portrait?.originalFilename ?? undefined },
      source: src,
    });
    m.provenance.detail = `${im.file} · document SHA-256 ${shaShort}… · copie octet pour octet`;
    mediaByFile.set(im.file, m);
    changes.push({ entityType: "media", entityId: m.id, action: "cree", revisionAfter: m.revision, label: m.name });
  }
  const mdWithMedia = (md: string) =>
    md.replace(/!\[([^\]]*)\]\(docx-img:([^)]+)\)/g, (_all, alt: string, file: string) => {
      const m = mediaByFile.get(file);
      return m ? `![${alt}](media:${m.id})` : `*[image « ${file.split("/").pop()} » non importée]*`;
    });

  // 2) Portraits → personnages.
  const charByPortrait = new Map<string, Character>();
  for (const pp of plan.portraits) {
    const d = dec.portraits[pp.key] ?? pp.defaultDecision;
    if (d === "ignorer") continue;
    const cand = an.portraits.find((p) => p.image === pp.image)!;
    const media = mediaByFile.get(pp.image);
    let c: Character;
    let before: number | undefined;
    let appearancePatch: string | undefined;
    if (d === "creer") {
      c = createCharacter(db, {
        canonicalName: cand.name.split(/\s+alias\s+/i)[0]!.trim(),
        nicknames: cand.names.filter((n) => n !== cand.name.split(/\s+alias\s+/i)[0]!.trim()),
        role: "",
        description: "",
        appearance: cand.appearance,
        biography: "",
        affiliations: [],
        events: [],
        narrativeRefs: [],
        status: "proposition",
      });
      c.provenance = { source: src, detail: `${cand.sectionPath} — ${cand.name}`, importedAt: at };
    } else if (d.startsWith("associer:")) {
      c = findEntity(db, "character", d.slice("associer:".length)) as Character;
      before = c.revision;
      const ap = dec.appearance[pp.key] ?? "garder";
      if (cand.appearance && !c.appearance.trim()) appearancePatch = cand.appearance;
      else if (cand.appearance && c.appearance.trim() !== cand.appearance.trim()) {
        if (ap === "remplacer") appearancePatch = cand.appearance;
        else if (ap === "completer") appearancePatch = `${c.appearance.trim()}\n\n${cand.appearance}`;
      }
    } else throw new DomainError(`Décision inconnue « ${d} » pour ${pp.key}.`, "INVALIDE");

    if (media) {
      if (!media.characterIds.includes(c.id)) media.characterIds.push(c.id);
      touch(c, { external: { ...(c.external ?? {}), bibleName: cand.name }, galleryMediaIds: [...new Set([...c.galleryMediaIds, media.id])], appearance: appearancePatch });
      commit(db, "character", c, `Import Bible : « ${cand.name} » — référence canonique associée (${pp.image})`);
      const replace = (dec.replacePortrait[pp.key] ?? "garder") === "remplacer";
      if (!c.portraitMediaId) setPortrait(db, c.id, media.id);
      else if (c.portraitMediaId !== media.id && replace) setPortrait(db, c.id, media.id, { confirmReplace: true });
    } else {
      touch(c, { external: { ...(c.external ?? {}), bibleName: cand.name }, appearance: appearancePatch });
      commit(db, "character", c, `Import Bible : « ${cand.name} » (image non importée)`);
    }
    charByPortrait.set(pp.image, c);
    changes.push({ entityType: "character", entityId: c.id, action: d === "creer" ? "cree" : "modifie", revisionBefore: before, revisionAfter: c.revision, label: c.canonicalName });

    // Fiche « visage canonique » dans la Bible, rattachée au personnage (utilisée par les contextes IA).
    const faceBody = [media ? `![${cand.name}](media:${media.id})` : "", cand.appearance, cand.notes, cand.originalFilename ? `Source canonique non modifiée : \`${cand.originalFilename}\`` : ""].filter(Boolean).join("\n\n");
    const face = db.bible.find((b) => b.external?.source === "bible-docx" && b.external.sectionPath === `${cand.sectionPath} > ${cand.name}` && !b.deletedAt);
    if (!face) {
      const b = createBibleEntry(db, { category: "personnages", title: `Visage canonique — ${cand.name}`, body: faceBody, status: "canon", characterIds: [c.id], source: src, detail: `${cand.sectionPath} > ${cand.name}` });
      b.external = { source: "bible-docx", documentSha256: an.sha256, sectionPath: `${cand.sectionPath} > ${cand.name}`, textHash: an.sha256, importedRevision: b.revision };
      changes.push({ entityType: "bible", entityId: b.id, action: "cree", revisionAfter: b.revision, label: b.title });
    }
  }

  // 3) Sections → entrées de Bible.
  for (const sp of plan.sections) {
    const d = dec.sections[sp.key] ?? sp.defaultDecision;
    if (d !== "importer") continue;
    const s = an.sections.find((x) => x.path === sp.path)!;
    const category = dec.categories[sp.key] ?? s.suggestedCategory;
    if (!category) throw new DomainError(`Choisissez une catégorie pour la section « ${s.path} ».`, "INVALIDE");
    // Rattachement direct seulement si la section concerne UN personnage ; sinon les fiches « Visage canonique » font foi.
    const linked = [...new Set(s.images.map((f) => charByPortrait.get(f)?.id).filter((x): x is string => !!x))];
    const characterIds = linked.length === 1 ? linked : [];
    const body = mdWithMedia(s.markdown);
    if (sp.existingId) {
      const b = findEntity(db, "bible", sp.existingId) as BibleEntry;
      const before = b.revision;
      touch(b, { body, category, characterIds: [...new Set([...b.characterIds, ...characterIds])] });
      b.external = { source: "bible-docx", documentSha256: an.sha256, sectionPath: s.path, textHash: s.textHash, importedRevision: b.revision };
      commit(db, "bible", b, `Import Bible : section « ${s.path} » mise à jour depuis ${an.filename}`);
      changes.push({ entityType: "bible", entityId: b.id, action: "modifie", revisionBefore: before, revisionAfter: b.revision, label: b.title });
      continue;
    }
    const b = createBibleEntry(db, { category, title: s.title, body, status: "canon", characterIds, source: src, detail: `§ ${s.path} · SHA-256 ${shaShort}…` });
    b.external = { source: "bible-docx", documentSha256: an.sha256, sectionPath: s.path, textHash: s.textHash, importedRevision: b.revision };
    changes.push({ entityType: "bible", entityId: b.id, action: "cree", revisionAfter: b.revision, label: b.title });
  }

  const batch: ImportBatch = {
    id: newId("log").replace("log_", "imp_"),
    kind: "bible-docx",
    at,
    sourceId: an.sha256,
    sourceHash: an.sha256,
    summary: {
      entreesBible: changes.filter((c) => c.entityType === "bible").length,
      images: changes.filter((c) => c.entityType === "media").length,
      personnagesCrees: changes.filter((c) => c.entityType === "character" && c.action === "cree").length,
      personnagesAssocies: changes.filter((c) => c.entityType === "character" && c.action === "modifie").length,
    },
    decisions: Object.fromEntries([
      ...Object.entries(dec.sections),
      ...Object.entries(dec.categories).map(([k, v]) => [`categorie ${k}`, v]),
      ...Object.entries(dec.portraits),
      ...Object.entries(dec.replacePortrait).map(([k, v]) => [`remplacement ${k}`, v]),
      ...Object.entries(dec.appearance).map(([k, v]) => [`apparence ${k}`, v]),
    ]),
    changes,
    status: "appliquee",
  };
  db.imports.push(batch);
  log(db, "Import Bible visuelle", `Import ${batch.id} de « ${an.filename} » : ${Object.entries(batch.summary).map(([k, v]) => `${k}=${v}`).join(", ")}`, "systeme");
  return batch;
}
