"use client";
import { useActionState, useState } from "react";
import type { Media } from "@/domain/types";
import { createMediaAction, createVariantAction, updateMediaAction, updateMediaRefAction, trashAction, type ActionResult } from "@/app/actions";
import { ActionButton, ResultMessage, useVersionedForm } from "@/components/client";

const KINDS = [
  ["image", "Image"],
  ["illustration", "Illustration"],
  ["photo", "Photographie"],
  ["video", "Vidéo"],
  ["audio", "Audio"],
  ["logo", "Logo"],
  ["document", "Document"],
  ["autre", "Autre"],
] as const;

export function KindOptions() {
  return (
    <>
      {KINDS.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </>
  );
}

export function CanonOptions() {
  return (
    <>
      <option value="proposition">Proposition (non homologué)</option>
      <option value="officiel">Officiel (homologué)</option>
      <option value="variante">Variante non officielle</option>
      <option value="archive">Archive</option>
    </>
  );
}

export function NewMediaForm({
  characters,
  articles,
  preCharacter,
  preArticle,
}: {
  characters: { id: string; name: string }[];
  articles: { id: string; name: string }[];
  preCharacter?: string;
  preArticle?: string;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createMediaAction, null);
  const [location, setLocation] = useState<"externe" | "locale">("externe");
  return (
    <form action={action} className="space-y-2">
      <ResultMessage result={state} />
      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <span className="pk-label">Emplacement</span>
          <div className="flex gap-4">
            <label className="inline-flex items-center gap-1">
              <input type="radio" name="location" value="externe" checked={location === "externe"} onChange={() => setLocation("externe")} /> Externe (URL,
              ex. Porkopédia)
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="radio" name="location" value="locale" checked={location === "locale"} onChange={() => setLocation("locale")} /> Local (chemin
              relatif)
            </label>
          </div>
        </div>
        <label>
          <span className="pk-label">Nom (si un seul média)</span>
          <input name="name" className="pk-input" placeholder="déduit du nom de fichier sinon" />
        </label>
      </div>
      <label className="block">
        <span className="pk-label">
          {location === "externe" ? "URL(s) — une par ligne. Les fichiers ne sont PAS copiés : seule la référence est enregistrée." : "Chemin(s) relatif(s) sous PORKONIA_MEDIA_ROOT — un par ligne."}
        </span>
        <textarea
          name="refs"
          rows={4}
          required
          className="pk-textarea"
          placeholder={location === "externe" ? "https://porkopedia.totoken.chatgpt.site/assets/…" : "douzi-archives/scene-01.jpg"}
        />
      </label>
      <div className="grid gap-2 md:grid-cols-4">
        <label>
          <span className="pk-label">Type</span>
          <select name="kind" className="pk-select" defaultValue="illustration">
            <KindOptions />
          </select>
        </label>
        <label>
          <span className="pk-label">Statut canonique</span>
          <select name="canonStatus" className="pk-select" defaultValue="proposition">
            <CanonOptions />
          </select>
        </label>
        <label>
          <span className="pk-label">Associer au personnage</span>
          <select name="characterId" className="pk-select" defaultValue={preCharacter ?? ""}>
            <option value="">—</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="pk-label">Associer à l&apos;article</span>
          <select name="articleId" className="pk-select" defaultValue={preArticle ?? ""}>
            <option value="">—</option>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <label>
          <span className="pk-label">Description</span>
          <input name="description" className="pk-input" />
        </label>
        <label>
          <span className="pk-label">Provenance</span>
          <input name="source" className="pk-input" placeholder="ex. porkopedia:assets, génération 2026-09, bible DOCX…" />
        </label>
      </div>
      <button className="pk-btn primary" disabled={pending}>
        {pending ? "Référencement…" : "Référencer"}
      </button>
      <span className="ml-2 text-[11px]">Les doublons (même URL / même chemin) sont détectés et ignorés.</span>
    </form>
  );
}

export function EditMediaForm({ media }: { media: Media }) {
  const { state, formAction: action, pending, formKey, expectedRevision, onChange } = useVersionedForm(updateMediaAction, media?.revision);
  const [ref, setRef] = useState(media.ref);
  const [variantRef, setVariantRef] = useState("");
  const [variantName, setVariantName] = useState("");
  return (
    <div className="space-y-2">
      <ResultMessage result={state} />
      <form key={formKey} action={action} onChange={onChange} className="space-y-2">
        <input type="hidden" name="id" value={media.id} />
        <input type="hidden" name="expectedRevision" value={expectedRevision ?? ""} />
        <div className="grid gap-2 md:grid-cols-2">
          <label>
            <span className="pk-label">Nom</span>
            <input name="name" defaultValue={media.name} className="pk-input" required />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="pk-label">Type</span>
              <select name="kind" defaultValue={media.kind} className="pk-select">
                <KindOptions />
              </select>
            </label>
            <label>
              <span className="pk-label">Statut canonique</span>
              <select name="canonStatus" defaultValue={media.canonStatus} className="pk-select">
                <CanonOptions />
              </select>
            </label>
          </div>
        </div>
        <label className="block">
          <span className="pk-label">Description</span>
          <textarea name="description" defaultValue={media.description} rows={2} className="pk-textarea" />
        </label>
        <div className="grid gap-2 md:grid-cols-4">
          <label className="md:col-span-2">
            <span className="pk-label">Miniature (URL ou chemin, facultatif)</span>
            <input name="thumbnailRef" defaultValue={media.thumbnailRef ?? ""} className="pk-input" />
          </label>
          <label>
            <span className="pk-label">Largeur × hauteur (px)</span>
            <span className="flex gap-1">
              <input name="width" type="number" defaultValue={media.width ?? ""} className="pk-input" />
              <input name="height" type="number" defaultValue={media.height ?? ""} className="pk-input" />
            </span>
          </label>
          <label>
            <span className="pk-label">Format</span>
            <input name="format" defaultValue={media.format ?? ""} className="pk-input" />
          </label>
        </div>
        <button className="pk-btn primary" disabled={pending}>
          {pending ? "Enregistrement…" : `Enregistrer (révision ${media.revision + 1})`}
        </button>
      </form>

      <fieldset className="pk-fieldset">
        <legend>Chemin / URL (protégé)</legend>
        <p className="mb-1 text-[11px]">
          Modifier la référence ne déplace ni ne renomme aucun fichier : cela change seulement l&apos;adresse enregistrée. Confirmation obligatoire.
        </p>
        <div className="flex flex-wrap gap-2">
          <input className="pk-input flex-1 font-mono" value={ref} onChange={(e) => setRef(e.target.value)} />
          <ActionButton
            className="pk-btn amber"
            disabled={ref.trim() === media.ref}
            action={updateMediaRefAction.bind(null, media.id, ref, true)}
            confirm={{
              title: "Modifier le chemin d'un média",
              message: (
                <>
                  Ancien : <code className="break-all">{media.ref}</code>
                  <br />
                  Nouveau : <code className="break-all">{ref}</code>
                  <br />
                  Les articles et fiches qui utilisent ce média pointeront vers la nouvelle adresse. L&apos;ancienne reste dans l&apos;historique.
                </>
              ),
              confirmLabel: "Modifier le chemin",
              danger: true,
            }}
          >
            Modifier le chemin…
          </ActionButton>
        </div>
      </fieldset>

      <fieldset className="pk-fieldset">
        <legend>Nouvelle version / variante</legend>
        <p className="mb-1 text-[11px]">
          Une nouvelle version est enregistrée comme un média distinct, statut « proposition », lié à l&apos;original. L&apos;original n&apos;est jamais
          écrasé.
        </p>
        <div className="grid gap-2 md:grid-cols-[2fr_1fr_auto]">
          <input className="pk-input font-mono" placeholder={media.location === "externe" ? "URL de la nouvelle version" : "chemin relatif"} value={variantRef} onChange={(e) => setVariantRef(e.target.value)} />
          <input className="pk-input" placeholder="Nom (facultatif)" value={variantName} onChange={(e) => setVariantName(e.target.value)} />
          <ActionButton className="pk-btn" disabled={!variantRef.trim()} action={createVariantAction.bind(null, media.id, variantRef, variantName)} onDone={(r) => r.ok && setVariantRef("")}>
            Enregistrer la variante
          </ActionButton>
        </div>
      </fieldset>

      <ActionButton
        className="pk-btn danger"
        action={trashAction.bind(null, "media", media.id)}
        confirm={{
          title: "Placer le média dans la corbeille",
          message: (
            <>
              La référence <b>{media.name}</b> sera placée dans la corbeille. <b>Le fichier lui-même n&apos;est jamais supprimé</b> (ni sur Porkopédia, ni
              sur disque). Un portrait officiel ne peut pas être mis à la corbeille.
            </>
          ),
          confirmLabel: "Placer dans la corbeille",
          danger: true,
        }}
      >
        Corbeille…
      </ActionButton>
    </div>
  );
}
