import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { Window, fmtDate } from "@/components/ui";
import { IconLog } from "@/components/icons";

export const metadata: Metadata = { title: "Journal des opérations" };

export default async function LogPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q = "", page = "1" } = await searchParams;
  const db = await getDb();
  const needle = q.toLowerCase();
  const all = [...db.log].reverse().filter((l) => !needle || `${l.action} ${l.summary} ${l.entityId ?? ""}`.toLowerCase().includes(needle));
  const p = Math.max(1, Number(page) || 1);
  const rows = all.slice((p - 1) * 200, p * 200);
  return (
    <Window
      title="Journal des opérations"
      code="PK-1001"
      icon={<IconLog size={18} />}
      toolbar={
        <form className="flex gap-2">
          <input name="q" defaultValue={q} className="pk-input w-64" placeholder="Filtrer (action, texte, ID)…" />
          <button className="pk-btn">Filtrer</button>
        </form>
      }
      status={[`${all.length} opération(s)`, `Page ${p}`]}
    >
      <div className="pk-grid-wrap">
        <table className="pk-grid">
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Détail</th>
              <th className="hidden md:table-cell">Élément</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{fmtDate(l.at)}</td>
                <td className="whitespace-nowrap">{l.action}</td>
                <td>{l.summary}</td>
                <td className="hidden font-mono text-[10px] md:table-cell">{l.entityId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {all.length > p * 200 && (
        <a className="pk-btn mt-2" href={`?q=${encodeURIComponent(q)}&page=${p + 1}`}>
          Page suivante
        </a>
      )}
    </Window>
  );
}
