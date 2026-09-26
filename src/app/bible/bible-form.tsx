"use client";
import type { BibleEntry } from "@/domain/types";
import { saveBibleEntry, trashAction, type ActionResult } from "@/app/actions";
import { ActionButton, ResultMessage, useVersionedForm } from "@/components/client";
import { BIBLE_CATEGORIES } from "./categories";

export function BibleForm({ entry, characters, defaultCategory }: { entry?: BibleEntry; characters: { id: string; name: string }[]; defaultCategory?: string }) {
  const { state, formAction: action, pending, formKey, expectedRevision, onChange } = useVersionedForm(saveBibleEntry, entry?.revision);
  return (
    <>
    <ResultMessage result={state} />
    <form key={formKey} action={action} onChange={onChange} className="space-y-2">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      {entry && <input type="hidden" name="expectedRevision" value={expectedRevision ?? ""} />}
      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr]">
        <label>
          <span className="pk-label">Titre *</span>
          <input name="title" required defaultValue={entry?.title} className="pk-input" />
        </label>
        <label>
          <span className="pk-label">Catégorie</span>
          <select name="category" defaultValue={entry?.category ?? defaultCategory ?? "regles-visuelles"} className="pk-select">
            {Object.entries(BIBLE_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="pk-label">Statut</span>
          <select name="status" defaultValue={entry?.status ?? "proposition"} className="pk-select">
            <option value="canon">Canon</option>
            <option value="proposition">Proposition</option>
            <option value="archive">Archive</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="pk-label">Contenu (Markdown)</span>
        <textarea name="body" rows={8} defaultValue={entry?.body} className="pk-textarea" />
      </label>
      <div className="grid gap-2 md:grid-cols-2">
        <label>
          <span className="pk-label">Provenance — document source *</span>
          <input name="source" defaultValue={entry?.provenance.source ?? ""} placeholder="ex. bible-visuelle-v3.docx" className="pk-input" required />
        </label>
        <label>
          <span className="pk-label">Provenance — section / page</span>
          <input name="detail" defaultValue={entry?.provenance.detail ?? ""} placeholder="ex. §2.4 Palette, p. 12" className="pk-input" />
        </label>
      </div>
      <div>
        <span className="pk-label">Personnages concernés (vide = règle générale)</span>
        <div className="flex flex-wrap gap-x-4">
          {characters.map((c) => (
            <label key={c.id} className="inline-flex items-center gap-1">
              <input type="checkbox" name="characterIds" value={c.id} defaultChecked={entry?.characterIds.includes(c.id)} /> {c.name}
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="pk-btn primary" disabled={pending}>
          {pending ? "Enregistrement…" : entry ? `Enregistrer (révision ${entry.revision + 1})` : "Ajouter l'entrée"}
        </button>
        {entry && (
          <ActionButton
            className="pk-btn danger"
            action={trashAction.bind(null, "bible", entry.id)}
            confirm={{ title: "Corbeille", message: <>Placer <b>{entry.title}</b> dans la corbeille (récupérable) ?</>, confirmLabel: "Placer dans la corbeille", danger: true }}
          >
            Corbeille…
          </ActionButton>
        )}
      </div>
    </form>
    </>
  );
}
