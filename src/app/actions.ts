"use server";
/**
 * Actions serveur : unique point d'entrée des écritures depuis l'interface.
 * Chaque action passe par `transaction()` (atomique) et renvoie un résultat explicite.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as ops from "@/domain/ops";
import type { ArticleStatus, BibleCategory, CanonStatus, EntityType, MediaCanonStatus, MediaKind, MediaLocation, PublicationVerification } from "@/domain/types";
import { DomainError, splitList } from "@/domain/util";
import { buildContext, type ContextRequest } from "@/domain/context";
import { createBackup, readDb, transaction } from "@/data/store";
import { checkMediaLink } from "@/media/link-check";

export type ActionResult = { ok: true; message: string; id?: string; revision?: number } | { ok: false; error: string; code?: string };

async function run(fn: () => Promise<{ message: string; id?: string; revision?: number }>): Promise<ActionResult> {
  try {
    const r = await fn();
    revalidatePath("/", "layout");
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: e.message, code: e.code };
    console.error(e);
    return { ok: false, error: `Erreur inattendue : ${e instanceof Error ? e.message : String(e)}` };
  }
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "");
const rev = (f: FormData) => (f.get("expectedRevision") ? Number(f.get("expectedRevision")) : undefined);
type Crud = Exclude<EntityType, "publication">;

/* ------------------------------ Personnages ------------------------------ */

function characterFields(f: FormData) {
  return {
    canonicalName: str(f, "canonicalName").trim(),
    nicknames: splitList(str(f, "nicknames")),
    role: str(f, "role").trim(),
    description: str(f, "description"),
    appearance: str(f, "appearance"),
    biography: str(f, "biography"),
    affiliations: splitList(str(f, "affiliations")),
    events: splitList(str(f, "events")),
    narrativeRefs: splitList(str(f, "narrativeRefs")),
    status: (str(f, "status") || "proposition") as CanonStatus,
  };
}

export async function saveCharacter(_prev: ActionResult | null, f: FormData): Promise<ActionResult> {
  const id = str(f, "id");
  let createdId: string | undefined;
  const res = await run(async () => {
    const fields = characterFields(f);
    if (id) {
      const c = await transaction((db) => ops.updateCharacter(db, id, fields, rev(f)));
      return { message: `Fiche enregistrée (révision ${c.revision}).`, id: c.id };
    }
    const c = await transaction((db) => ops.createCharacter(db, fields));
    createdId = c.id;
    return { message: "Fiche créée.", id: c.id };
  });
  if (createdId) redirect(`/personnages/${createdId}`);
  return res;
}

export async function saveRelations(characterId: string, relations: { targetId: string; kind: string; note?: string }[], expectedRevision: number) {
  return run(async () => {
    const c = await transaction((db) => ops.updateCharacter(db, characterId, { relations: relations.filter((r) => r.targetId && r.kind.trim()) }, expectedRevision));
    return { message: `Relations enregistrées (révision ${c.revision}).` };
  });
}

export async function setPortraitAction(characterId: string, mediaId: string | null, confirmReplace: boolean) {
  return run(async () => {
    const c = await transaction((db) => ops.setPortrait(db, characterId, mediaId, { confirmReplace }));
    return { message: mediaId ? `Portrait officiel de ${c.canonicalName} défini.` : `Portrait officiel retiré.` };
  });
}

/* -------------------------------- Articles -------------------------------- */

export async function saveArticle(input: {
  id?: string;
  expectedRevision?: number;
  title: string;
  subtitle: string;
  slug: string;
  aliases: string;
  section: string;
  tags: string;
  lead: string;
  body: string;
  characterIds: string[];
}): Promise<ActionResult> {
  return run(async () => {
    const fields = {
      title: input.title.trim(),
      subtitle: input.subtitle.trim(),
      section: input.section.trim(),
      tags: splitList(input.tags),
      lead: input.lead,
      body: input.body,
      characterIds: input.characterIds,
      aliases: splitList(input.aliases),
      slug: input.slug.trim() || undefined,
    };
    if (input.id) {
      const a = await transaction((db) => ops.updateArticle(db, input.id!, fields, input.expectedRevision));
      return { message: `Article enregistré (révision ${a.revision}, statut ${a.status}).`, id: a.id, revision: a.revision };
    }
    const a = await transaction((db) => ops.createArticle(db, fields));
    return { message: "Article créé en brouillon.", id: a.id };
  });
}

export async function setArticleStatusAction(id: string, status: Exclude<ArticleStatus, "publie">) {
  return run(async () => {
    const a = await transaction((db) => ops.setArticleStatus(db, id, status));
    return { message: `« ${a.title} » : statut ${status}.` };
  });
}

export async function setCoverAction(articleId: string, mediaId: string | null) {
  return run(async () => {
    await transaction((db) => ops.setCover(db, articleId, mediaId));
    return { message: "Illustration principale mise à jour." };
  });
}

/* --------------------------------- Médias -------------------------------- */

export async function createMediaAction(_prev: ActionResult | null, f: FormData): Promise<ActionResult> {
  return run(async () => {
    const lines = str(f, "refs").split(/\n/).map((s) => s.trim()).filter(Boolean);
    if (!lines.length) throw new DomainError("Indiquez au moins une URL ou un chemin.", "INVALIDE");
    const location = (str(f, "location") || "externe") as MediaLocation;
    const base = {
      description: str(f, "description"),
      kind: (str(f, "kind") || "image") as MediaKind,
      location,
      canonStatus: (str(f, "canonStatus") || "proposition") as MediaCanonStatus,
      source: str(f, "source").trim() || "saisie-manuelle",
    };
    const characterId = str(f, "characterId");
    const articleId = str(f, "articleId");
    const report = await transaction((db) => {
      const created: string[] = [];
      const skipped: string[] = [];
      for (const ref of lines) {
        const dup = ops.findDuplicateMedia(db, location, ref);
        if (dup) {
          skipped.push(`${ref} (déjà « ${dup.name} »)`);
          continue;
        }
        const name = lines.length === 1 && str(f, "name").trim() ? str(f, "name").trim() : decodeURIComponent(ref.split("/").pop() || ref);
        const m = ops.createMedia(db, { ...base, name, ref });
        if (characterId) ops.linkMedia(db, m.id, { characterId });
        if (articleId) ops.linkMedia(db, m.id, { articleId });
        created.push(m.id);
      }
      return { created, skipped };
    });
    return {
      message: `${report.created.length} média(s) référencé(s).${report.skipped.length ? ` Doublons ignorés : ${report.skipped.join(" ; ")}` : ""}`,
      id: report.created[0],
    };
  });
}

export async function updateMediaAction(_prev: ActionResult | null, f: FormData): Promise<ActionResult> {
  return run(async () => {
    const id = str(f, "id");
    const num = (k: string) => (str(f, k) ? Number(str(f, k)) : null);
    const m = await transaction((db) =>
      ops.updateMedia(
        db,
        id,
        {
          name: str(f, "name").trim(),
          description: str(f, "description"),
          kind: str(f, "kind") as MediaKind,
          canonStatus: str(f, "canonStatus") as MediaCanonStatus,
          thumbnailRef: str(f, "thumbnailRef").trim() || null,
          width: num("width"),
          height: num("height"),
          format: str(f, "format").trim() || null,
        },
        rev(f),
      ),
    );
    return { message: `Média enregistré (révision ${m.revision}).` };
  });
}

export async function updateMediaRefAction(id: string, ref: string, confirm: boolean) {
  return run(async () => {
    const m = await transaction((db) => ops.updateMediaRef(db, id, ref, { confirm }));
    return { message: `Chemin modifié : ${m.ref}` };
  });
}

export async function createVariantAction(originalId: string, ref: string, name: string) {
  return run(async () => {
    const m = await transaction((db) => {
      const o = ops.findEntity(db, "media", originalId) as import("@/domain/types").Media;
      return ops.createMedia(db, {
        name: name.trim() || `${o.name} (nouvelle version)`,
        description: `Nouvelle version / variante de « ${o.name} ». L'original est conservé.`,
        kind: o.kind,
        location: o.location,
        ref,
        canonStatus: "proposition",
        variantOf: o.id,
        characterIds: [...o.characterIds],
        articleIds: [],
        source: "saisie-manuelle",
      });
    });
    return { message: "Variante enregistrée avec le statut « proposition ». L'original n'a pas été modifié.", id: m.id };
  });
}

export async function linkMediaAction(mediaId: string, target: { characterId?: string; articleId?: string }, unlink = false) {
  return run(async () => {
    await transaction((db) => (unlink ? ops.unlinkMedia(db, mediaId, target) : ops.linkMedia(db, mediaId, target)));
    return { message: unlink ? "Association retirée." : "Association enregistrée." };
  });
}

export async function checkLinksAction(ids: string[]) {
  return run(async () => {
    const db = await readDb();
    const targets = db.media.filter((m) => ids.includes(m.id) && !m.deletedAt);
    const results = await Promise.all(targets.map(async (m) => [m.id, await checkMediaLink(m)] as const));
    await transaction((d) => results.forEach(([id, r]) => ops.recordLinkCheck(d, id, r)));
    const bad = results.filter(([, r]) => r.status !== "ok").length;
    return { message: `${results.length} lien(s) vérifié(s) : ${results.length - bad} OK, ${bad} en erreur.` };
  });
}

/* --------------------------------- Bible --------------------------------- */

export async function saveBibleEntry(_prev: ActionResult | null, f: FormData): Promise<ActionResult> {
  return run(async () => {
    const id = str(f, "id");
    const fields = {
      category: str(f, "category") as BibleCategory,
      title: str(f, "title").trim(),
      body: str(f, "body"),
      status: (str(f, "status") || "proposition") as CanonStatus,
      characterIds: f.getAll("characterIds").map(String).filter(Boolean),
      source: str(f, "source").trim() || "saisie-manuelle",
      detail: str(f, "detail").trim(),
    };
    const b = await transaction((db) => (id ? ops.updateBibleEntry(db, id, fields, rev(f)) : ops.createBibleEntry(db, fields)));
    return { message: `Entrée « ${b.title} » enregistrée (révision ${b.revision}).`, id: b.id };
  });
}

/* -------------------------- Corbeille & révisions ------------------------- */

export async function trashAction(type: Crud, id: string) {
  return run(async () => {
    await transaction((db) => ops.softDelete(db, type, id));
    return { message: "Élément placé dans la corbeille (récupérable)." };
  });
}

export async function untrashAction(type: Crud, id: string) {
  return run(async () => {
    await transaction((db) => ops.restoreFromTrash(db, type, id));
    return { message: "Élément restauré depuis la corbeille." };
  });
}

export async function restoreRevisionAction(type: Crud, id: string, revision: number, expectedRevision: number) {
  return run(async () => {
    const e = await transaction((db) => ops.restoreRevision(db, type, id, revision, expectedRevision));
    return { message: `Révision ${revision} recopiée comme nouvelle révision ${e.revision}. Rien n'a été supprimé.` };
  });
}

/* ------------------------------ Publication ------------------------------ */

export async function publishAction(note: string) {
  return run(async () => {
    await createBackup("avant publication");
    const p = await transaction((db) => ops.publish(db, note));
    return { message: `Publication n°${p.number} créée (${p.articles.length} articles). Statut : NON VÉRIFIÉE sur Porkopédia.` };
  });
}

export async function restorePublicationAction(number: number, note: string) {
  return run(async () => {
    await createBackup("avant restauration de publication");
    const p = await transaction((db) => ops.restorePublication(db, number, note));
    return { message: `Publication n°${p.number} créée à l'identique de la n°${number}. Brouillons intacts.` };
  });
}

export async function verifyPublicationAction(number: number, status: PublicationVerification, note: string) {
  return run(async () => {
    await transaction((db) => ops.setVerification(db, number, status, note));
    return { message: `Publication n°${number} : ${status}.` };
  });
}

/* ------------------------------- Sauvegarde ------------------------------ */

export async function backupAction() {
  return run(async () => {
    const r = await createBackup("manuelle");
    return { message: `Sauvegarde créée et vérifiée : ${r.file}` };
  });
}

/* ---------------------------- Contextes IA ------------------------------- */

export async function buildContextAction(req: ContextRequest) {
  const db = await readDb();
  return buildContext(db as import("@/domain/types").Database, req);
}
