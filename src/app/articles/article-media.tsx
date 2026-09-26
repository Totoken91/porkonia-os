"use client";
import { useState } from "react";
import type { MediaCanonStatus } from "@/domain/types";
import { linkMediaAction, setCoverAction } from "@/app/actions";
import { ActionButton } from "@/components/client";
import { MediaCanonBadge } from "@/components/ui";

type M = { id: string; name: string; thumb: string | null; canonStatus: MediaCanonStatus };

export function ArticleMediaPanel({ article, linked, others }: { article: { id: string; title: string; coverMediaId?: string | null }; linked: M[]; others: M[] }) {
  const [pick, setPick] = useState("");
  const picked = others.find((m) => m.id === pick);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {linked.map((m) => (
          <div key={m.id} className="pk-window !p-2">
            {m.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.thumb} alt={m.name} className="thumb h-28 w-full" loading="lazy" />
            ) : (
              <div className="thumb grid h-28 place-items-center">Pas d&apos;aperçu</div>
            )}
            <div className="mt-1 truncate font-bold" title={m.name}>{m.name}</div>
            <div className="flex flex-wrap gap-1">
              <MediaCanonBadge status={m.canonStatus} />
              {article.coverMediaId === m.id && <span className="badge green">Illustration principale</span>}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              <code className="text-[10px]">media:{m.id}</code>
              {article.coverMediaId !== m.id && (
                <ActionButton className="pk-btn small" action={setCoverAction.bind(null, article.id, m.id)}>
                  Illustration principale
                </ActionButton>
              )}
              <ActionButton
                className="pk-btn small"
                action={linkMediaAction.bind(null, m.id, { articleId: article.id }, true)}
                confirm={{ title: "Dissocier", message: <>Retirer <b>{m.name}</b> des illustrations de cet article ? Le média n&apos;est pas supprimé.</>, confirmLabel: "Dissocier" }}
              >
                Dissocier
              </ActionButton>
            </div>
          </div>
        ))}
      </div>
      {linked.length === 0 && <p className="italic">Aucune illustration associée.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <select className="pk-select max-w-md" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">— Associer un média du catalogue —</option>
          {others.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} [{m.canonStatus}]
            </option>
          ))}
        </select>
        {picked && (
          <ActionButton className="pk-btn" action={linkMediaAction.bind(null, picked.id, { articleId: article.id }, false)} onDone={(r) => r.ok && setPick("")}>
            Associer à l&apos;article
          </ActionButton>
        )}
        <a className="pk-btn" href={`/medias?article=${article.id}`}>Référencer un nouveau média…</a>
      </div>
    </div>
  );
}
