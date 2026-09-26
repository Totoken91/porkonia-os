"use client";
import { useMemo, useState } from "react";
import { diffWords } from "diff";

type Version = { revision: number; label: string; text: string };

/** Comparaison mot à mot entre deux versions d'un article (révisions ou publications). */
export function ArticleDiff({ versions }: { versions: Version[] }) {
  const [a, setA] = useState(versions[1]?.revision ?? versions[0]?.revision ?? 0);
  const [b, setB] = useState(versions[0]?.revision ?? 0);
  const va = versions.find((v) => v.revision === a);
  const vb = versions.find((v) => v.revision === b);
  const parts = useMemo(() => (va && vb ? diffWords(va.text, vb.text) : []), [va, vb]);
  const added = parts.filter((p) => p.added).reduce((n, p) => n + p.value.length, 0);
  const removed = parts.filter((p) => p.removed).reduce((n, p) => n + p.value.length, 0);
  if (versions.length < 2) return <p className="italic">Une seule version existe : rien à comparer.</p>;
  const pick = (value: number, on: (n: number) => void) => (
    <select className="pk-select !w-auto" value={value} onChange={(e) => on(Number(e.target.value))}>
      {versions.map((v) => (
        <option key={v.revision} value={v.revision}>
          {v.label}
        </option>
      ))}
    </select>
  );
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        Comparer {pick(a, setA)} avec {pick(b, setB)}
        <span className="badge green">+{added} car.</span>
        <span className="badge red">−{removed} car.</span>
      </div>
      <div className="pk-grid-wrap max-h-[60vh] whitespace-pre-wrap !p-3 font-mono text-[12px] leading-relaxed">
        {parts.map((p, i) => (
          <span key={i} className={p.added ? "diff-add" : p.removed ? "diff-del" : ""}>
            {p.value}
          </span>
        ))}
      </div>
    </div>
  );
}
