"use client";
import { useState, useTransition } from "react";
import { buildContextAction } from "@/app/actions";
import { TASKS, TARGETS, type ContextRequest, type TaskKey, type TargetKey } from "@/domain/context-config";
import type { ContextPackage } from "@/domain/context";
import type { BibleCategory } from "@/domain/types";
import { CopyButton, DownloadButton } from "@/components/client";
import { BIBLE_CATEGORIES } from "@/app/bible/categories";

export function ContextBuilder({
  characters,
  articles,
  bible,
  preCharacter,
  preArticle,
}: {
  characters: { id: string; name: string; demo?: boolean }[];
  articles: { id: string; name: string }[];
  bible: { id: string; title: string; category: BibleCategory }[];
  preCharacter?: string;
  preArticle?: string;
}) {
  const [req, setReq] = useState<ContextRequest>({
    task: preArticle ? "edition-article" : "illustration",
    instruction: "",
    characterIds: preCharacter ? [preCharacter] : [],
    articleId: preArticle ?? null,
    extraBible: [],
    bibleIds: [],
    style: "",
    target: "generique",
    detail: "court",
    includeRelations: false,
  });
  const [pkg, setPkg] = useState<ContextPackage | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ContextRequest>(k: K, v: ContextRequest[K]) => setReq((r) => ({ ...r, [k]: v }));
  const toggle = (list: string[], id: string, on: boolean) => (on ? [...list, id] : list.filter((x) => x !== id));
  const autoCats = new Set(TASKS[req.task].bible);

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="space-y-2">
        <fieldset className="pk-fieldset">
          <legend>1. Tâche</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label>
              <span className="pk-label">Type de tâche</span>
              <select className="pk-select" value={req.task} onChange={(e) => set("task", e.target.value as TaskKey)}>
                {Object.entries(TASKS).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="pk-label">Modèle / service cible</span>
              <select className="pk-select" value={req.target} onChange={(e) => set("target", e.target.value as TargetKey)}>
                {Object.entries(TARGETS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-2 block">
            <span className="pk-label">Instruction</span>
            <textarea className="pk-textarea" rows={3} value={req.instruction} onChange={(e) => set("instruction", e.target.value)} placeholder="ex. Illustration du personnage au guichet, format paysage…" />
          </label>
          <label className="mt-2 block">
            <span className="pk-label">Style visuel / ton (facultatif)</span>
            <input className="pk-input" value={req.style} onChange={(e) => set("style", e.target.value)} />
          </label>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-1">
              <input type="radio" checked={req.detail === "court"} onChange={() => set("detail", "court")} /> Contexte court
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="radio" checked={req.detail === "detaille"} onChange={() => set("detail", "detaille")} /> Contexte détaillé
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" checked={req.includeRelations} onChange={(e) => set("includeRelations", e.target.checked)} /> Inclure les relations
            </label>
          </div>
        </fieldset>
        <fieldset className="pk-fieldset">
          <legend>2. Personnages ({req.characterIds.length})</legend>
          <div className="grid max-h-40 gap-1 overflow-auto sm:grid-cols-2">
            {characters.map((c) => (
              <label key={c.id} className="inline-flex items-center gap-1">
                <input type="checkbox" checked={req.characterIds.includes(c.id)} onChange={(e) => set("characterIds", toggle(req.characterIds, c.id, e.target.checked))} />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="pk-fieldset">
          <legend>3. Article</legend>
          <select className="pk-select" value={req.articleId ?? ""} onChange={(e) => set("articleId", e.target.value || null)}>
            <option value="">— Aucun —</option>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </fieldset>
        <fieldset className="pk-fieldset">
          <legend>4. Bible canonique</legend>
          <p className="mb-1 text-[11px]">
            Automatique pour cette tâche : {[...autoCats].map((c) => BIBLE_CATEGORIES[c]).join(", ") || "aucune catégorie"}. Cochez des entrées précises
            pour remplacer la sélection automatique.
          </p>
          <div className="mb-1 flex flex-wrap gap-x-3">
            {(Object.keys(BIBLE_CATEGORIES) as BibleCategory[])
              .filter((c) => !autoCats.has(c))
              .map((c) => (
                <label key={c} className="inline-flex items-center gap-1">
                  <input type="checkbox" checked={req.extraBible.includes(c)} onChange={(e) => set("extraBible", toggle(req.extraBible, c, e.target.checked) as BibleCategory[])} />+{" "}
                  {BIBLE_CATEGORIES[c]}
                </label>
              ))}
          </div>
          <div className="grid max-h-32 gap-1 overflow-auto">
            {bible.map((b) => (
              <label key={b.id} className="inline-flex items-center gap-1">
                <input type="checkbox" checked={req.bibleIds?.includes(b.id)} onChange={(e) => set("bibleIds", toggle(req.bibleIds ?? [], b.id, e.target.checked))} />
                {b.title} <span className="opacity-60">({BIBLE_CATEGORIES[b.category]})</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button type="button" className="pk-btn primary" disabled={pending} onClick={() => start(async () => setPkg(await buildContextAction(req)))}>
          {pending ? "Assemblage…" : "Assembler le paquet documentaire"}
        </button>
        <p className="text-[11px]">Génération locale et déterministe : aucune IA n&apos;est appelée, aucun coût.</p>
      </div>

      <div className="min-w-0 space-y-2">
        {!pkg ? (
          <div className="pk-grid-wrap grid min-h-60 place-items-center !p-6 text-center italic text-[#555]">
            Le paquet apparaîtra ici. L&apos;Administration des Contextes IA ne transmet que le strict nécessaire.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge blue">≈ {pkg.tokens.toLocaleString("fr-FR")} tokens (estimation)</span>
              <span className="badge grey">{pkg.markdown.length.toLocaleString("fr-FR")} caractères</span>
              <span className="badge grey">{pkg.sources.length} source(s)</span>
              <span className="ml-auto flex gap-2">
                <CopyButton text={pkg.markdown} label="Copier le prompt" />
                <DownloadButton content={pkg.markdown} filename={`contexte-porkonia-${new Date().toISOString().slice(0, 10)}.md`} label="Exporter .md" />
              </span>
            </div>
            {pkg.warnings.map((w, i) => (
              <div key={i} className="pk-alert">
                {w}
              </div>
            ))}
            {pkg.files.length > 0 && (
              <fieldset className="pk-fieldset">
                <legend>Fichiers à joindre</legend>
                <ul className="list-disc pl-5">
                  {pkg.files.map((f) => (
                    <li key={f.id}>
                      {f.role} :{" "}
                      <a href={f.url} target="_blank" rel="noreferrer" className="text-[#1d3f8f] underline">
                        {f.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}
            <textarea readOnly className="pk-textarea min-h-[480px]" value={pkg.markdown} aria-label="Contexte généré" />
            <fieldset className="pk-fieldset">
              <legend>Provenance</legend>
              <ul className="text-[11px]">
                {pkg.sources.map((s) => (
                  <li key={s.id}>
                    {s.kind} « {s.label} » ({s.id}) — {s.provenance?.source}
                    {s.revision ? `, rév. ${s.revision}` : ""}
                  </li>
                ))}
              </ul>
            </fieldset>
          </>
        )}
      </div>
    </div>
  );
}
