"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Depiction, MediaUsage } from "@/domain/types";
import type { MediaAuditItem } from "@/domain/media-audit";
import { applyMediaAuditAction, type ActionResult } from "@/app/actions";
import { ResultMessage, useConfirm } from "@/components/client";

const USAGES: [MediaUsage, string][] = [
  ["portrait-source", "Portrait source canonique"],
  ["illustration-narrative", "Illustration narrative"],
  ["scene-collective", "Scène collective"],
  ["variante-generee", "Variante générée"],
  ["archive", "Média archivé"],
];
const KINDS: [Depiction["kind"], string][] = [
  ["apparait", "Apparaît"],
  ["lien-article", "Illustration de son article"],
  ["lien-indirect", "Lien indirect (galerie)"],
  ["portrait-source", "Portrait source"],
];

type Row = { selected: boolean; usage: MediaUsage | null; depictions: Depiction[] };

export function AuditTable({ items, names, thumbs, focus }: { items: MediaAuditItem[]; names: Record<string, string>; thumbs: Record<string, string | null>; focus?: string }) {
  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(items.map((i) => [i.mediaId, { selected: false, usage: i.suggestedUsage ?? i.currentUsage, depictions: i.suggested.map((d) => ({ ...d })) }])),
  );
  const [onlyChanged, setOnlyChanged] = useState(true);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const router = useRouter();
  const { ask, dialog } = useConfirm();
  const visible = useMemo(() => items.filter((i) => !onlyChanged || i.changed), [items, onlyChanged]);
  const set = (id: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id]!, ...patch } }));
  const setDep = (id: string, k: number, patch: Partial<Depiction>) => set(id, { depictions: rows[id]!.depictions.map((d, j) => (j === k ? { ...d, ...patch } : d)), selected: true });
  const selected = Object.entries(rows).filter(([, r]) => r.selected);
  const allChars = Object.entries(names);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <label>
          <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} /> Seulement les médias dont le classement diffère des suggestions
        </label>
        <button type="button" className="pk-btn small" onClick={() => visible.forEach((i) => set(i.mediaId, { selected: true }))}>
          Tout sélectionner ({visible.length})
        </button>
        <button type="button" className="pk-btn small" onClick={() => visible.forEach((i) => set(i.mediaId, { selected: false }))}>
          Tout désélectionner
        </button>
      </div>
      <div className="pk-grid-wrap max-h-[65vh]">
        <table className="pk-grid">
          <thead>
            <tr>
              <th />
              <th>Média</th>
              <th>Usage</th>
              <th>Personnages : rôle, base, confirmation</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((i) => {
              const r = rows[i.mediaId]!;
              return (
                <tr key={i.mediaId} style={r.selected ? { outline: "2px solid #c98a1c", outlineOffset: -2 } : undefined}>
                  <td>
                    <input type="checkbox" checked={r.selected} onChange={(e) => set(i.mediaId, { selected: e.target.checked })} aria-label={`Sélectionner ${i.name}`} />
                  </td>
                  <td className="w-44">
                    {thumbs[i.mediaId] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbs[i.mediaId]!} alt="" className="thumb h-20 w-40" loading="lazy" />
                    )}
                    <a href={`/medias/${i.mediaId}`} className="block truncate text-[11px] font-bold" title={i.name}>
                      {i.ref.split("/").pop()}
                    </a>
                    {i.isPortraitOf.length > 0 && <span className="badge green">Portrait officiel</span>}
                  </td>
                  <td className="w-52">
                    <select className="pk-select" value={r.usage ?? ""} disabled={i.isPortraitOf.length > 0} onChange={(e) => set(i.mediaId, { usage: (e.target.value || null) as MediaUsage | null, selected: true })}>
                      <option value="">— non classé —</option>
                      {USAGES.map(([k, l]) => (
                        <option key={k} value={k} disabled={k === "portrait-source" && i.isPortraitOf.length === 0}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] opacity-80">
                      Actuel : {i.currentUsage ?? "non classé"} · {i.usageReason}
                    </div>
                  </td>
                  <td>
                    {r.depictions.map((d, k) => {
                      const locked = d.kind === "portrait-source" && i.isPortraitOf.includes(d.characterId);
                      return (
                        <div key={d.characterId} className={`mb-1 flex flex-wrap items-center gap-1 ${d.characterId === focus ? "font-bold" : ""}`}>
                          <span className="min-w-36">{names[d.characterId] ?? d.characterId}</span>
                          <select className="pk-select !w-48" value={d.kind} disabled={locked} onChange={(e) => setDep(i.mediaId, k, { kind: e.target.value as Depiction["kind"] })}>
                            {KINDS.map(([kk, l]) => (
                              <option key={kk} value={kk} disabled={kk === "portrait-source" && !i.isPortraitOf.includes(d.characterId)}>
                                {l}
                              </option>
                            ))}
                          </select>
                          <label className="text-[11px]">
                            <input type="checkbox" checked={d.confirmed} disabled={locked} onChange={(e) => setDep(i.mediaId, k, { confirmed: e.target.checked })} /> confirmé
                          </label>
                          {!locked && (
                            <button type="button" className="pk-btn small" onClick={() => set(i.mediaId, { depictions: r.depictions.filter((_, j) => j !== k), selected: true })}>
                              Retirer
                            </button>
                          )}
                          <span className="w-full text-[10px] opacity-75">{d.basis}</span>
                        </div>
                      );
                    })}
                    <select
                      className="pk-select !w-60"
                      value=""
                      onChange={(e) => e.target.value && set(i.mediaId, { depictions: [...r.depictions, { characterId: e.target.value, kind: "apparait", basis: "Ajout manuel", confirmed: true }], selected: true })}
                    >
                      <option value="">+ Ajouter un personnage…</option>
                      {allChars
                        .filter(([id]) => !r.depictions.some((d) => d.characterId === id))
                        .map(([id, n]) => (
                          <option key={id} value={id}>
                            {n}
                          </option>
                        ))}
                    </select>
                    {i.unsupported.length > 0 && <div className="text-[10px] text-[#7a0f0f]">Associations actuelles sans justification : {i.unsupported.map((x) => names[x]).join(", ")}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pk-window !p-2">
        <ResultMessage result={result} />
        <button
          type="button"
          className="pk-btn primary"
          disabled={pending || selected.length === 0}
          onClick={async () => {
            const ok = await ask({
              title: "Appliquer la classification",
              message: (
                <>
                  {selected.length} média(s) seront classés selon vos choix. Les associations non confirmées restent marquées « à confirmer ».
                  <br />
                  Aucun portrait officiel, chemin ou fichier n&apos;est modifié. Une sauvegarde est faite avant.
                </>
              ),
              confirmLabel: "Appliquer",
            });
            if (!ok) return;
            start(async () => {
              const r = await applyMediaAuditAction(selected.map(([mediaId, row]) => ({ mediaId, usage: row.usage, depictions: row.depictions })));
              setResult(r);
              if (r.ok) {
                setRows((all) => Object.fromEntries(Object.entries(all).map(([k, v]) => [k, { ...v, selected: false }])));
                router.refresh();
              }
            });
          }}
        >
          {pending ? "Application…" : `Appliquer la sélection (${selected.length})`}
        </button>
        {dialog}
      </div>
    </div>
  );
}
