"use client";
import { useState } from "react";
import type { EntityType, Revision } from "@/domain/types";
import { restoreRevisionAction } from "@/app/actions";
import { ActionButton } from "./client";

const HIDDEN = new Set(["revision", "updatedAt", "createdAt", "id"]);

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "∅";
  if (typeof v === "string") return v;
  return JSON.stringify(v, null, 1);
}

/** Historique générique : liste des révisions, comparaison champ par champ, restauration non destructive. */
export function RevisionHistory({
  type,
  entityId,
  current,
  revisions,
}: {
  type: Exclude<EntityType, "publication">;
  entityId: string;
  current: Record<string, unknown> & { revision: number };
  revisions: Revision[];
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const rev = revisions.find((r) => r.revision === selected);
  const snap = (rev?.snapshot ?? null) as Record<string, unknown> | null;
  const changed = snap
    ? [...new Set([...Object.keys(snap), ...Object.keys(current)])].filter(
        (k) => !HIDDEN.has(k) && JSON.stringify(snap[k]) !== JSON.stringify(current[k]),
      )
    : [];

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="pk-grid-wrap max-h-96">
        <table className="pk-grid">
          <thead>
            <tr>
              <th>Rév.</th>
              <th>Date</th>
              <th>Opération</th>
            </tr>
          </thead>
          <tbody>
            {revisions.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelected(r.revision)}
                className="cursor-pointer"
                style={r.revision === selected ? { outline: "2px solid #7a1016", outlineOffset: -2 } : undefined}
              >
                <td className="font-mono">{r.revision}</td>
                <td className="whitespace-nowrap">{new Date(r.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                <td>{r.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        {!rev ? (
          <p className="italic text-[#555]">Sélectionnez une révision pour la comparer à l&apos;état actuel (rév. {current.revision}).</p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <b>
                Révision {rev.revision} → actuelle ({current.revision}) : {changed.length} champ(s) différent(s)
              </b>
              {rev.revision !== current.revision && (
                <ActionButton
                  className="pk-btn amber"
                  action={restoreRevisionAction.bind(null, type, entityId, rev.revision, current.revision)}
                  confirm={{
                    title: "Restaurer une révision",
                    message: (
                      <>
                        Le contenu de la <b>révision {rev.revision}</b> va être recopié comme <b>nouvelle révision {current.revision + 1}</b>.
                        <br />
                        La révision actuelle ({current.revision}) et tout l&apos;historique restent conservés et consultables.
                        {type === "article" && (
                          <>
                            <br />
                            L&apos;article repassera en <b>brouillon</b>.
                          </>
                        )}
                      </>
                    ),
                    confirmLabel: `Restaurer la rév. ${rev.revision}`,
                  }}
                >
                  Restaurer cette révision…
                </ActionButton>
              )}
            </div>
            {changed.length === 0 ? (
              <p>Aucune différence de contenu.</p>
            ) : (
              <div className="pk-grid-wrap max-h-96">
                <table className="pk-grid">
                  <thead>
                    <tr>
                      <th>Champ</th>
                      <th>Révision {rev.revision}</th>
                      <th>Actuel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changed.map((k) => (
                      <tr key={k}>
                        <td className="font-mono">{k}</td>
                        <td className="diff-del whitespace-pre-wrap break-words">{show(snap![k]).slice(0, 1500)}</td>
                        <td className="diff-add whitespace-pre-wrap break-words">{show(current[k]).slice(0, 1500)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
