import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { Alert, PublicationStages, Window, fmtDate } from "@/components/ui";
import { IconStamp } from "@/components/icons";
import { latestPublication, previewPublication } from "@/domain/ops";
import type { Database } from "@/domain/types";
import { PublicationRowActions, PublishForm } from "./publication-controls";

export const metadata: Metadata = { title: "Préfecture des Publications" };

export default async function PublicationPage() {
  const db = (await getDb()) as Database;
  const preview = previewPublication(db);
  const last = latestPublication(db);
  const title = (id: string) => db.articles.find((a) => a.id === id)?.title ?? last?.articles.find((a) => a.id === id)?.title ?? id;
  const drafts = db.articles.filter((a) => !a.deletedAt && a.status === "brouillon");
  const pubs = [...db.publications].sort((a, b) => b.number - a.number);
  const Section = ({ label, ids, cls }: { label: string; ids: string[]; cls: string }) =>
    ids.length ? (
      <div>
        <span className={`badge ${cls}`}>{label} ({ids.length})</span>
        <ul className="list-disc pl-5">
          {ids.map((id) => (
            <li key={id}>
              <Link href={`/articles/${id}`} className="text-[#1d3f8f] underline">
                {title(id)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <Window
      title="Préfecture des Publications"
      code="PK-601"
      icon={<IconStamp size={18} />}
      status={[
        last ? `Dernière publication : n°${last.number} (${fmtDate(last.createdAt)})` : "Aucune publication",
        `API lecture seule : /api/public/v1/publications/latest`,
      ]}
    >
      <Alert kind="info">
        Circuit : <b>Brouillon → Validation → Prévisualisation → Publication (instantané immuable) → Intégration manuelle sur Porkopédia → Vérification</b>.
        Porkopédia (ChatGPT Sites) ne peut pas être modifié automatiquement depuis ici : voir <code>docs/CHATGPT_SITES_INTEGRATION.md</code>.
      </Alert>
      <div className="grid gap-3 lg:grid-cols-2">
        <fieldset className="pk-fieldset">
          <legend>Prévisualisation de la prochaine publication</legend>
          <p className="mb-1">
            {preview.articles.length} article(s) seront inclus (validés ou déjà publiés). {drafts.length} brouillon(s) exclu(s)
            {drafts.length > 0 && " — un article déjà publié puis remis en brouillon conserve sa version publiée"}.
          </p>
          <div className="space-y-1">
            <Section label="Nouveaux" ids={preview.manifest.added} cls="green" />
            <Section label="Modifiés" ids={preview.manifest.modified} cls="amber" />
            <Section label="Retirés" ids={preview.manifest.removed} cls="red" />
            {preview.manifest.unchanged.length > 0 && <span className="badge grey">Inchangés ({preview.manifest.unchanged.length})</span>}
          </div>
        </fieldset>
        <fieldset className="pk-fieldset">
          <legend>Tamponner</legend>
          <PublishForm
            count={preview.articles.length}
            added={preview.manifest.added.length}
            modified={preview.manifest.modified.length}
            removed={preview.manifest.removed.length}
            lastNumber={last?.number ?? 0}
          />
          {drafts.length > 0 && (
            <div className="mt-2">
              <b>Brouillons en attente de validation :</b>
              <ul className="list-disc pl-5">
                {drafts.map((a) => (
                  <li key={a.id}>
                    <Link href={`/articles/${a.id}`} className="text-[#1d3f8f] underline">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </fieldset>
      </div>
      <fieldset className="pk-fieldset">
        <legend>Registre des publications</legend>
        {pubs.length === 0 ? (
          <p className="italic">Aucune publication pour l&apos;instant.</p>
        ) : (
          <div className="pk-grid-wrap">
            <table className="pk-grid">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Date</th>
                  <th>Contenu</th>
                  <th>Empreinte</th>
                  <th>Vérification Porkopédia</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pubs.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono font-bold">{p.number}</td>
                    <td className="whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                    <td>
                      {p.articles.length} articles · +{p.manifest.added.length} ~{p.manifest.modified.length} −{p.manifest.removed.length}
                      {p.restoredFrom && <div className="badge amber">copie de la n°{p.restoredFrom}</div>}
                      {p.note && <div className="text-[11px] italic">{p.note}</div>}
                      <div className="mt-1 flex gap-1">
                        <a className="pk-btn small" href={`/api/publications/${p.number}`}>Paquet JSON</a>
                        <a className="pk-btn small" href={`/api/publications/${p.number}?format=md`}>Markdown</a>
                      </div>
                    </td>
                    <td className="font-mono text-[10px]" title={p.contentHash}>
                      {p.contentHash.slice(0, 12)}…
                    </td>
                    <td>
                      <PublicationStages p={p} />
                      {p.verification.note && <div className="text-[11px]">{p.verification.note} ({fmtDate(p.verification.at)})</div>}
                    </td>
                    <td>
                      <PublicationRowActions number={p.number} isLatest={p.number === last?.number} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </fieldset>
    </Window>
  );
}
