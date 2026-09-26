"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyBibleImportAction, type ActionResult } from "@/app/actions";
import type { BibleDecisions, BiblePlan } from "@/domain/bible-import";
import type { BibleCategory } from "@/domain/types";
import { ResultMessage, useConfirm } from "@/components/client";
import { Tabs } from "@/components/tabs";
import { BIBLE_CATEGORIES } from "@/app/bible/categories";
import { MarkdownView } from "@/components/markdown-view";

const ROLE: Record<string, [string, string]> = {
  portrait: ["green", "Portrait canonique"],
  identite: ["blue", "Identité / emblème"],
  reference: ["grey", "Référence"],
  "non-placee": ["amber", "Non placée dans le texte"],
  miniature: ["grey", "Miniature du fichier"],
};

export function BibleImportForm({
  sha,
  plan,
  sectionsMarkdown,
  characters,
}: {
  sha: string;
  plan: BiblePlan;
  sectionsMarkdown: Record<string, string>;
  characters: { id: string; name: string }[];
}) {
  const [dec, setDec] = useState<BibleDecisions>({ sections: {}, categories: {}, images: {}, portraits: {}, replacePortrait: {}, appearance: {} });
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const router = useRouter();
  const { ask, dialog } = useConfirm();
  const img = (file: string) => `/api/bible/${sha}/image?file=${encodeURIComponent(file)}`;
  const patch = <K extends keyof BibleDecisions>(k: K, key: string, v: string) => setDec((d) => ({ ...d, [k]: { ...d[k], [key]: v } }));
  const sectionDecision = (s: BiblePlan["sections"][number]) =>
    dec.sections[s.key] ?? (s.action === "creer" && !s.suggestedCategory && dec.categories[s.key] ? "importer" : s.defaultDecision);
  const category = (s: BiblePlan["sections"][number]) => dec.categories[s.key] ?? s.suggestedCategory ?? "";
  const toImport = plan.sections.filter((s) => sectionDecision(s) === "importer");
  const unclassified = toImport.filter((s) => !category(s));
  const previewMd = (md: string) => md.replace(/\(docx-img:([^)]+)\)/g, (_a, f: string) => `(${img(f)})`);

  const apply = async () => {
    const ok = await ask({
      title: "Importer la Bible visuelle",
      message: (
        <>
          Sections : <b>{toImport.length}</b> · images : <b>{plan.images.filter((i) => i.action === "creer" && (dec.images[i.key] ?? "importer") === "importer").length}</b>{" "}
          (copiées octet pour octet) · portraits : <b>{plan.portraits.filter((p) => (dec.portraits[p.key] ?? p.defaultDecision) !== "ignorer").length}</b>.
          <br />
          Le document original reste intact. Une sauvegarde est faite avant ; l&apos;import pourra être annulé. Aucune règle n&apos;est inventée pour les
          catégories absentes.
        </>
      ),
      confirmLabel: "Importer",
    });
    if (!ok) return;
    const final: BibleDecisions = { ...dec, sections: Object.fromEntries(plan.sections.map((s) => [s.key, sectionDecision(s)])), categories: Object.fromEntries(plan.sections.filter((s) => category(s)).map((s) => [s.key, category(s) as BibleCategory])) };
    start(async () => {
      const r = await applyBibleImportAction(sha, final);
      setResult(r);
      if (r.ok && r.id) router.push(`/import/lot/${r.id}`);
    });
  };

  return (
    <div className="space-y-2">
      <Tabs
        tabs={[
          {
            label: `Portraits (${plan.portraits.length})`,
            content: (
              <div className="space-y-2">
                <p className="text-[11px]">
                  Vérifiez chaque correspondance : un visage ne doit jamais être associé au mauvais personnage. Les portraits deviennent des{" "}
                  <b>références sources</b> : aucune image générée ne pourra les remplacer.
                </p>
                <div className="grid gap-2 lg:grid-cols-2">
                  {plan.portraits.map((p) => {
                    const choice = dec.portraits[p.key] ?? p.defaultDecision;
                    return (
                      <div key={p.key} className="pk-window flex gap-2 !p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img(p.image)} alt={p.name} className="thumb h-32 w-28 shrink-0" loading="lazy" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div>
                            <b>{p.name}</b> <span className="text-[10px] opacity-70">{p.image.split("/").pop()}</span>
                          </div>
                          {p.originalFilename && <div className="font-mono text-[10px]">source : {p.originalFilename}</div>}
                          <select className="pk-select" value={choice} onChange={(e) => patch("portraits", p.key, e.target.value)}>
                            {characters.map((c) => (
                              <option key={c.id} value={`associer:${c.id}`}>
                                Associer à : {c.name}
                                {`associer:${c.id}` === p.defaultDecision ? " (correspondance détectée)" : ""}
                              </option>
                            ))}
                            <option value="creer">Créer une nouvelle fiche « {p.name} »{p.defaultDecision === "creer" ? " (aucune correspondance)" : ""}</option>
                            <option value="ignorer">Ignorer ce portrait</option>
                          </select>
                          {p.appearance && <p className="line-clamp-3 text-[11px] italic">{p.appearance}</p>}
                          {p.currentPortrait && choice === p.defaultDecision && (
                            <label className="block text-[11px] text-[#7a0f0f]">
                              Portrait actuel différent : « {p.currentPortrait.name} » ({p.currentPortrait.nature ?? "nature inconnue"}){" "}
                              <select className="pk-select !w-auto" value={dec.replacePortrait[p.key] ?? "garder"} onChange={(e) => patch("replacePortrait", p.key, e.target.value)}>
                                <option value="garder">Garder le portrait actuel</option>
                                <option value="remplacer">Remplacer par cette référence source</option>
                              </select>
                            </label>
                          )}
                          {p.currentAppearance && p.appearance && p.currentAppearance.trim() !== p.appearance.trim() && choice === p.defaultDecision && (
                            <label className="block text-[11px]">
                              Apparence déjà renseignée et différente :{" "}
                              <select className="pk-select !w-auto" value={dec.appearance[p.key] ?? "garder"} onChange={(e) => patch("appearance", p.key, e.target.value)}>
                                <option value="garder">Garder l&apos;apparence actuelle</option>
                                <option value="remplacer">Remplacer par la Bible</option>
                                <option value="completer">Compléter avec la Bible</option>
                              </select>
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          },
          {
            label: `Sections (${plan.sections.length})`,
            content: (
              <div className="space-y-1">
                {plan.missingCategories.length > 0 && (
                  <div className="pk-alert">
                    Catégories sans aucune section dans le document : <b>{plan.missingCategories.map((c) => BIBLE_CATEGORIES[c]).join(", ")}</b>. Elles resteront
                    vides — rien n&apos;est inventé.
                  </div>
                )}
                <div className="pk-grid-wrap">
                  <table className="pk-grid">
                    <thead>
                      <tr>
                        <th>Section du document</th>
                        <th>État</th>
                        <th>Catégorie</th>
                        <th>Décision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.sections.map((s) => (
                        <tr key={s.key}>
                          <td>
                            <button type="button" className="text-left text-[#1d3f8f] underline" onClick={() => setOpenSection(openSection === s.key ? null : s.key)}>
                              {s.path}
                            </button>
                            <div className="text-[10px] opacity-70">
                              {s.chars} car. · {s.images} image(s)
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${s.action === "creer" ? "green" : s.action === "conflit" ? "red" : s.action === "mettre-a-jour" ? "blue" : "grey"}`}>{s.action}</span>
                            <div className="text-[10px]">{s.reason}</div>
                          </td>
                          <td>
                            <select className="pk-select" value={category(s)} onChange={(e) => patch("categories", s.key, e.target.value)} style={!category(s) ? { outline: "2px solid #c98a1c" } : undefined}>
                              <option value="">— à classer —</option>
                              {Object.entries(BIBLE_CATEGORIES).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                  {k === s.suggestedCategory ? " (suggérée)" : ""}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select className="pk-select" value={sectionDecision(s)} onChange={(e) => patch("sections", s.key, e.target.value)}>
                              {s.action === "inchange" ? <option value="ignorer">Rien à faire</option> : null}
                              {s.action !== "inchange" && <option value="importer">Importer</option>}
                              {s.action === "conflit" && <option value="garder-local">Garder la version locale</option>}
                              {s.action !== "inchange" && <option value="ignorer">Ignorer</option>}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {openSection && (
                  <div className="pk-grid-wrap max-h-[60vh] !p-3">
                    <MarkdownView body={previewMd(sectionsMarkdown[openSection] ?? "")} index={{ articles: [], media: [] }} />
                  </div>
                )}
              </div>
            ),
          },
          {
            label: `Images (${plan.images.length})`,
            content: (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {plan.images.map((im) => {
                  const [cls, label] = ROLE[im.role] ?? ["grey", im.role];
                  return (
                    <div key={im.key} className="pk-window !p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img(im.file)} alt={im.name} className="thumb h-28 w-full" loading="lazy" />
                      <div className="truncate font-bold">{im.name}</div>
                      <span className={`badge ${cls}`}>{label}</span> {im.action === "existant" && <span className="badge grey">déjà au catalogue</span>}
                      <div className="text-[10px]">
                        {im.width && `${im.width}×${im.height} px · `}
                        {(im.bytes / 1024).toFixed(0)} Ko
                      </div>
                      <div className="line-clamp-2 text-[10px] opacity-80" title={im.context}>
                        {im.context}
                      </div>
                      {im.action === "creer" && (
                        <label className="text-[11px]">
                          <input type="checkbox" checked={(dec.images[im.key] ?? "importer") === "importer"} onChange={(e) => patch("images", im.key, e.target.checked ? "importer" : "ignorer")} /> Importer
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            ),
          },
        ]}
      />
      <div className="pk-window !p-2">
        <ResultMessage result={result} />
        {unclassified.length > 0 && <div className="pk-alert">Choisissez une catégorie pour : {unclassified.map((s) => s.path).join(", ")} (ou ignorez ces sections).</div>}
        <button type="button" className="pk-btn primary" disabled={pending || unclassified.length > 0} onClick={apply}>
          {pending ? "Importation…" : "Appliquer l'importation…"}
        </button>
        {dialog}
      </div>
    </div>
  );
}
