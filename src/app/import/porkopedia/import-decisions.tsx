"use client";
import { createContext, useContext, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { diffWords } from "diff";
import { applyPorkopediaImportAction, type ActionResult } from "@/app/actions";
import type { ArticlePlanItem, CharacterPlanItem, ImportOptions } from "@/domain/porkopedia-import";
import { ResultMessage, useConfirm } from "@/components/client";

type Ctx = { decisions: Record<string, string>; set: (k: string, v: string) => void };
const DecisionCtx = createContext<Ctx>({ decisions: {}, set: () => undefined });

const LABEL: Record<string, string> = {
  importer: "Importer la version du site",
  "garder-local": "Garder la version locale",
  ignorer: "Ignorer",
  restaurer: "Restaurer depuis la corbeille",
  copie: "Importer en copie (autre adresse)",
  lier: "Lier à la fiche / l'article existant",
};
const ACTION_BADGE: Record<string, string> = { creer: "green", inchange: "grey", "mettre-a-jour": "blue", conflit: "red", corbeille: "amber", existant: "grey", lier: "blue" };
const ACTION_LABEL: Record<string, string> = { creer: "Nouveau", inchange: "Inchangé", "mettre-a-jour": "Mis à jour sur le site", conflit: "Conflit", corbeille: "Dans la corbeille", existant: "Existant", lier: "À lier" };

export function ActionBadge({ action }: { action: string }) {
  return <span className={`badge ${ACTION_BADGE[action] ?? "grey"}`}>{ACTION_LABEL[action] ?? action}</span>;
}

export function DecisionProvider({ children }: { children: ReactNode }) {
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  return <DecisionCtx.Provider value={{ decisions, set: (k, v) => setDecisions((d) => ({ ...d, [k]: v })) }}>{children}</DecisionCtx.Provider>;
}

function DecisionSelect({ item }: { item: { key: string; choices: string[]; defaultDecision: string } }) {
  const { decisions, set } = useContext(DecisionCtx);
  if (item.choices.length < 2) return <span className="text-[11px] opacity-70">{LABEL[item.defaultDecision] ?? item.defaultDecision}</span>;
  const value = decisions[item.key] ?? item.defaultDecision;
  return (
    <select className="pk-select !w-auto" value={value} onChange={(e) => set(item.key, e.target.value)} style={value !== item.defaultDecision ? { outline: "2px solid #c98a1c" } : undefined}>
      {item.choices.map((c) => (
        <option key={c} value={c}>
          {LABEL[c] ?? c}
          {c === item.defaultDecision ? " (par défaut)" : ""}
        </option>
      ))}
    </select>
  );
}

export interface ConflictDetail {
  key: string;
  local: string | null;
  incoming: string;
}

export function ConflictList({ items, details }: { items: ArticlePlanItem[]; details: ConflictDetail[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!items.length) return <p className="italic">Aucun conflit. Rien n&apos;exige de décision humaine.</p>;
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const d = details.find((x) => x.key === it.key);
        return (
          <div key={it.key} className="pk-window !p-2">
            <div className="flex flex-wrap items-center gap-2">
              <ActionBadge action={it.action} />
              {it.protection && <span className="badge red">Protégé</span>}
              <b>{it.title}</b> <code className="text-[11px]">#article={it.porkopediaId}</code>
              <span className="ml-auto">
                <DecisionSelect item={it} />
              </span>
            </div>
            <p className="mt-1">{it.reason}</p>
            {it.protection && <p className="text-[11px] text-[#7a0f0f]">Protection : {it.protection}</p>}
            {it.existingId && (
              <p className="text-[11px]">
                Élément local : <a className="text-[#1d3f8f] underline" href={`/articles/${it.existingId}`}>{it.existingTitle}</a>
              </p>
            )}
            {d && (
              <>
                <button type="button" className="pk-btn small mt-1" onClick={() => setOpen(open === it.key ? null : it.key)}>
                  {open === it.key ? "Masquer la comparaison" : "Comparer local ↔ site"}
                </button>
                {open === it.key && <DiffView a={d.local ?? ""} b={d.incoming} />}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DiffView({ a, b }: { a: string; b: string }) {
  const parts = useMemo(() => diffWords(a, b), [a, b]);
  return (
    <div className="mt-1">
      <div className="mb-1 flex gap-2 text-[11px]">
        <span className="diff-del px-1">version locale</span>
        <span className="diff-add px-1">version du site</span>
      </div>
      <div className="pk-grid-wrap max-h-80 whitespace-pre-wrap !p-2 font-mono text-[11px]">
        {parts.map((p, i) => (
          <span key={i} className={p.added ? "diff-add" : p.removed ? "diff-del" : ""}>
            {p.value}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ArticleTable({ items }: { items: ArticlePlanItem[] }) {
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(150);
  const rows = items.filter((i) => (!filter || i.action === filter || (filter === "scripts" && i.modifiedBy.length > 0)) && (!q || `${i.title} ${i.porkopediaId}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <select className="pk-select !w-56" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Tous les articles ({items.length})</option>
          {["creer", "inchange", "mettre-a-jour", "conflit", "corbeille"].map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a]} ({items.filter((i) => i.action === a).length})
            </option>
          ))}
          <option value="scripts">Modifiés par des scripts ({items.filter((i) => i.modifiedBy.length).length})</option>
        </select>
        <input className="pk-input !w-64" placeholder="Rechercher titre ou identifiant…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="pk-grid-wrap max-h-[60vh]">
        <table className="pk-grid">
          <thead>
            <tr>
              <th>Article</th>
              <th>État</th>
              <th>Origine → scripts de transformation</th>
              <th>Décision</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((i) => (
              <tr key={i.key}>
                <td>
                  <b>{i.title}</b>
                  <div className="font-mono text-[10px] opacity-70">#article={i.porkopediaId}</div>
                  {i.protection && <span className="badge red">Protégé</span>} {i.provenanceIncertaine && <span className="badge amber">Provenance incertaine</span>}
                </td>
                <td>
                  <ActionBadge action={i.action} />
                  {i.hasOriginalVersion && <div className="text-[10px]">+ version d&apos;origine archivée</div>}
                </td>
                <td className="text-[11px]">
                  <b>{i.origin}</b>
                  {i.modifiedBy.length > 0 && <> → {i.modifiedBy.join(" → ")}</>}
                </td>
                <td>
                  <DecisionSelect item={i} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <button type="button" className="pk-btn" onClick={() => setLimit(limit + 300)}>
          Afficher plus ({rows.length - limit} restants)
        </button>
      )}
    </div>
  );
}

export function CharacterList({ items }: { items: CharacterPlanItem[] }) {
  if (!items.length) return <p className="italic">Aucune figure historique détectée (ou option désactivée).</p>;
  return (
    <div className="space-y-1">
      <p className="text-[11px]">
        Fiches créées au statut « proposition », <b>sans portrait</b> : le portrait canonique d&apos;une figure vient exclusivement de la Bible visuelle
        (référence source). Les images de l&apos;article rejoignent la galerie.
      </p>
      <div className="pk-grid-wrap">
        <table className="pk-grid">
          <thead>
            <tr>
              <th>Figure</th>
              <th>Surnoms / alias</th>
              <th>État</th>
              <th>Décision</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.key}>
                <td>
                  <b>{c.name}</b> <span className="font-mono text-[10px] opacity-70">#article={c.porkopediaId}</span>
                </td>
                <td className="text-[11px]">{c.nicknames.join(", ") || "—"}</td>
                <td>
                  <ActionBadge action={c.action} /> {c.existingName && <span className="text-[11px]">→ {c.existingName}</span>}
                </td>
                <td>
                  <DecisionSelect item={c} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ApplyBar({ extractionId, options, counts }: { extractionId: string; options: ImportOptions; counts: Record<string, number> }) {
  const { decisions } = useContext(DecisionCtx);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const router = useRouter();
  const { ask, dialog } = useConfirm();
  const changed = Object.keys(decisions).length;
  return (
    <div className="pk-window mt-2 !p-2">
      <ResultMessage result={result} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="pk-btn primary"
          disabled={pending}
          onClick={async () => {
            const ok = await ask({
              title: "Appliquer l'importation",
              message: (
                <>
                  Nouveaux articles : <b>{counts.articlesNouveaux}</b> · mises à jour : <b>{counts.articlesMisAJour}</b> · conflits :{" "}
                  <b>{counts.articlesConflits}</b> (décisions modifiées : {changed}) · médias nouveaux : <b>{counts.mediasNouveaux}</b> · fiches :{" "}
                  <b>{counts.personnagesNouveaux}</b>.
                  <br />
                  Une sauvegarde vérifiée est faite avant. Aucune suppression, aucun média déplacé, Porkopédia n&apos;est pas modifié. L&apos;import pourra
                  être annulé.
                </>
              ),
              confirmLabel: "Importer",
            });
            if (!ok) return;
            start(async () => {
              const r = await applyPorkopediaImportAction(extractionId, decisions, options);
              setResult(r);
              if (r.ok && r.id) router.push(`/import/lot/${r.id}`);
            });
          }}
        >
          {pending ? "Importation…" : "Appliquer l'importation…"}
        </button>
        <span className="text-[11px]">{changed ? `${changed} décision(s) modifiée(s) par rapport aux choix par défaut.` : "Décisions par défaut (conservatrices)."}</span>
      </div>
      {dialog}
    </div>
  );
}
