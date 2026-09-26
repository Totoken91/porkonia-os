import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { Alert, PublicationStages, Window, fmtDate } from "@/components/ui";
import { IconStamp } from "@/components/icons";
import { latestPublication, previewPublication } from "@/domain/ops";
import type { Database } from "@/domain/types";
import { PublicationRowActions, PublishForm } from "./publication-controls";
import { latestRealExtraction, listExtractions } from "@/import/extractions";
import { buildPorkopediaPackage } from "@/export/porkopedia-package";

export const metadata: Metadata = { title: "Préfecture des Publications" };

export default async function PublicationPage() {
  const db = (await getDb()) as Database;
  const preview = previewPublication(db);
  const last = latestPublication(db);
  const title = (id: string) => db.articles.find((a) => a.id === id)?.title ?? last?.articles.find((a) => a.id === id)?.title ?? id;
  const drafts = db.articles.filter((a) => !a.deletedAt && a.status === "brouillon");
  const pubs = [...db.publications].sort((a, b) => b.number - a.number);
  const extractions = (await listExtractions()).map((e) => ({ id: e.id, label: `${e.id.slice(4, 12)} — ${fmtDate(e.snapshotTakenAt ?? e.extractedAt)}` }));
  const baseline = await latestRealExtraction();
  const pkg = last ? buildPorkopediaPackage(db, last, baseline) : null;
  const onSite = preview.articles.filter((pa) => {
    const a = db.articles.find((x) => x.id === pa.id);
    return !!a?.external && a.revision === a.external.importedRevision && a.siteSeen?.contentHash === a.external.contentHash;
  }).length;
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
        Étapes strictement séparées : <b>Brouillon → Validé → Inclus dans une publication locale → Exportée pour Porkopédia → Déployée (déclaration
        humaine) → Vérifiée (manuellement ou automatiquement par extraction du site)</b>. Une publication locale <b>n&apos;est pas</b> une mise à jour du
        site public.
        Porkopédia (ChatGPT Sites) ne peut pas être modifié automatiquement depuis ici : voir <code>docs/CHATGPT_SITES_INTEGRATION.md</code>.
      </Alert>
      <div className="grid gap-3 lg:grid-cols-2">
        <fieldset className="pk-fieldset">
          <legend>Prévisualisation de la prochaine publication</legend>
          <p className="mb-1">
            {preview.articles.length} article(s) seront inclus (validés ou déjà publiés), dont <b>{onSite}</b> identiques à la version constatée sur
            Porkopédia et <b>{preview.articles.length - onSite}</b> à déployer. {drafts.length} brouillon(s) exclu(s)
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
      {last && pkg && (
        <fieldset className="pk-fieldset">
          <legend>Paquet Porkopédia — publication n°{last.number}</legend>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-1 text-[12px]">
              <p>
                Delta calculé contre l&apos;extraction réelle <code>{pkg.baselineExtractionId ?? "aucune"}</code> : <b>+{pkg.delta.nouveaux.length}</b> nouvel(s) article(s),{" "}
                <b>{pkg.delta.modifies.length}</b> modification(s), <b>{pkg.delta.inchanges}</b> déjà en ligne inchangés.
              </p>
              <ul className="list-disc pl-5">
                {pkg.delta.nouveaux.map((a) => (
                  <li key={a.id}>
                    + <Link className="text-[#1d3f8f] underline" href={`/articles/${a.localId}`}>{a.title}</Link> → <code>#article={a.id}</code>
                  </li>
                ))}
              </ul>
              <p>
                Fichier <code>{pkg.fileName}</code> · SHA-256 <code>{pkg.scriptSha256.slice(0, 16)}…</code> · à insérer après <code>{pkg.insertAfter}</code>
              </p>
              {pkg.blocking.length > 0 ? (
                <Alert kind="error">
                  <b>Export bloqué :</b>
                  <ul className="list-disc pl-5">
                    {pkg.blocking.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </Alert>
              ) : (
                <Alert kind="ok">Aucun blocage : le paquet peut être exporté.</Alert>
              )}
              {pkg.warnings.map((w, i) => (
                <Alert key={i}>{w}</Alert>
              ))}
            </div>
            <div className="space-y-1 text-[12px]">
              <p>
                <b>Simulation</b> (paquet appliqué à une copie locale du site, puis extrait dans le navigateur isolé) :{" "}
                {last.simulation ? (
                  <>
                    <span className={`badge ${last.simulation.ok ? "green" : "red"}`}>{last.simulation.ok ? "conforme" : "non conforme"}</span> le {fmtDate(last.simulation.at)}
                    {last.simulation.packageSha256 !== pkg.scriptSha256 && <span className="badge amber ml-1">paquet modifié depuis : relancer</span>}
                  </>
                ) : (
                  <span className="badge amber">pas encore simulée</span>
                )}
              </p>
              {last.simulation && (
                <ul className="list-disc pl-5 text-[11px]">
                  {last.simulation.messages.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              )}
              <pre className="pk-grid-wrap !p-2 font-mono text-[11px]">npm run publication:simulate -- {last.number}</pre>
              <details>
                <summary className="cursor-pointer text-[#1d3f8f] underline">Instructions ChatGPT Sites (aperçu)</summary>
                <pre className="pk-grid-wrap mt-1 max-h-80 whitespace-pre-wrap !p-2 font-mono text-[11px]">{pkg.instructions}</pre>
              </details>
            </div>
          </div>
        </fieldset>
      )}
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
                  <th>Étapes</th>
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

                      </div>
                    </td>
                    <td className="font-mono text-[10px]" title={p.contentHash}>
                      {p.contentHash.slice(0, 12)}…
                    </td>
                    <td>
                      <PublicationStages p={p} />
                      {p.verification.note && <div className="text-[11px]">{p.verification.note} ({fmtDate(p.verification.at)})</div>}
                      {p.deployment && <div className="text-[11px]">Intégration signalée (non probante) : {p.deployment.note}</div>}
                      {p.verification.details && p.verification.details.some((d) => !d.ok) && (
                        <details className="text-[11px]">
                          <summary>Écarts de la vérification automatique</summary>
                          <ul>
                            {p.verification.details
                              .filter((d) => !d.ok)
                              .map((d) => (
                                <li key={d.id}>
                                  {d.title} — {d.found ? `similarité ${Math.round(d.similarity * 100)} %` : "absent du site"}
                                </li>
                              ))}
                          </ul>
                        </details>
                      )}
                    </td>
                    <td>
                      <PublicationRowActions number={p.number} isLatest={p.number === last?.number} exported={!!p.exportedAt} deployed={!!p.deployment} extractions={extractions} />
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
