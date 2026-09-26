import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/server/page-data";
import { Window, fmtDate } from "@/components/ui";
import { IconExport } from "@/components/icons";

const HREF = { article: "/articles/", media: "/medias/", character: "/personnages/", bible: "/bible?edit=" } as const;

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const b = db.imports.find((x) => x.id === id);
  if (!b) notFound();
  const groups = (["article", "character", "media", "bible"] as const).map((t) => [t, b.changes.filter((c) => c.entityType === t)] as const);
  return (
    <Window title={`Rapport d'importation ${b.id}`} code="PK-1102" icon={<IconExport size={18} />} menu={<Link href="/import">← Bureau des Importations</Link>} status={[`${b.changes.length} changement(s)`, b.status === "annulee" ? `Annulé le ${fmtDate(b.undoneAt)}` : "Appliqué"]}>
      <table className="mb-2 text-[12px]">
        <tbody>
          <tr><td className="pr-3 font-bold">Date</td><td>{fmtDate(b.at)}</td></tr>
          <tr><td className="pr-3 font-bold">Source</td><td className="font-mono">{b.kind} · {b.sourceId}</td></tr>
          <tr><td className="pr-3 font-bold">Résumé</td><td>{Object.entries(b.summary).map(([k, v]) => `${k} : ${v}`).join(" · ")}</td></tr>
        </tbody>
      </table>
      {Object.keys(b.decisions).length > 0 && (
        <details className="pk-fieldset">
          <summary>Décisions enregistrées ({Object.keys(b.decisions).length})</summary>
          <ul className="mt-1 max-h-60 overflow-auto font-mono text-[11px]">
            {Object.entries(b.decisions).map(([k, v]) => (
              <li key={k}>{k} → {v}</li>
            ))}
          </ul>
        </details>
      )}
      {b.undoReport && (
        <fieldset className="pk-fieldset">
          <legend>Rapport d&apos;annulation</legend>
          <ul className="max-h-60 list-disc overflow-auto pl-5 text-[11px]">
            {b.undoReport.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </fieldset>
      )}
      {groups.map(([t, list]) =>
        list.length ? (
          <details key={t} className="pk-fieldset" open={list.length < 40}>
            <summary>
              {{ article: "Articles", character: "Personnages", media: "Médias", bible: "Bible" }[t]} ({list.length})
            </summary>
            <ul className="mt-1 max-h-80 overflow-auto text-[12px]">
              {list.map((c) => (
                <li key={c.entityId}>
                  <span className={`badge ${c.action === "cree" ? "green" : "amber"}`}>{c.action}</span>{" "}
                  <Link className="text-[#1d3f8f] underline" href={`${HREF[t]}${c.entityId}`}>{c.label}</Link>{" "}
                  <span className="text-[10px] opacity-70">rév. {c.revisionBefore ? `${c.revisionBefore} → ` : ""}{c.revisionAfter}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null,
      )}
    </Window>
  );
}
