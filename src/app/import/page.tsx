import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { Alert, Window, fmtDate } from "@/components/ui";
import { IconArchive, IconExport } from "@/components/icons";
import { ActionButton } from "@/components/client";
import { listExtractions } from "@/import/extractions";
import { listDocuments } from "@/bible/docx-store";
import { undoImportAction } from "@/app/actions";

export const metadata: Metadata = { title: "Bureau des Importations" };

export default async function ImportHub() {
  const db = await getDb();
  const [extractions, docs] = await Promise.all([listExtractions(), listDocuments()]);
  const batches = [...db.imports].reverse();
  return (
    <Window title="Bureau des Importations" code="PK-1101" icon={<IconExport size={18} />} status={[`${extractions.length} extraction(s)`, `${docs.length} document(s) source`, `${batches.length} import(s) enregistré(s)`]}>
      <Alert kind="info">
        Toute importation passe par une <b>prévisualisation</b> : rien n&apos;est écrit avant validation. Chaque import est précédé d&apos;une sauvegarde
        vérifiée, n&apos;efface jamais rien et peut être <b>annulé</b>. Les images restent hébergées là où elles sont.
      </Alert>
      <div className="grid gap-2 xl:grid-cols-2">
        <fieldset className="pk-fieldset">
          <legend>1. Porkopédia (site public)</legend>
          <p className="mb-2">
            L&apos;extraction exécute les scripts du site dans un navigateur isolé, hors ligne, à partir d&apos;un instantané figé. Elle se lance en
            ligne de commande (le serveur de Porkonia OS n&apos;exécute jamais le code du site) :
          </p>
          <pre className="pk-grid-wrap !p-2 font-mono text-[11px]">npm run porkopedia:extract -- --check-media</pre>
          <p className="my-1 text-[11px]">Reproductible hors ligne : <code>npm run porkopedia:extract -- --from imports/porkopedia-&lt;date&gt;</code></p>
          {extractions.length === 0 ? (
            <p className="italic">Aucune extraction disponible.</p>
          ) : (
            <div className="pk-grid-wrap">
              <table className="pk-grid">
                <thead>
                  <tr>
                    <th>Extraction</th>
                    <th>Instantané du</th>
                    <th>Contenu</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {extractions.map((e) => (
                    <tr key={e.id}>
                      <td className="font-mono text-[11px]">{e.id}</td>
                      <td className="whitespace-nowrap">{fmtDate(e.snapshotTakenAt ?? e.extractedAt)}</td>
                      <td>
                        {e.articles} articles · {e.media} médias · {e.scripts} scripts {e.checked ? <span className="badge green">liens vérifiés</span> : <span className="badge grey">liens non vérifiés</span>}
                      </td>
                      <td>
                        <Link className="pk-btn small" href={`/import/porkopedia/${e.id}`}>
                          Prévisualiser…
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </fieldset>
        <fieldset className="pk-fieldset">
          <legend>2. Bible visuelle (DOCX)</legend>
          <p className="mb-2">
            Le fichier original est conservé intact (nommé par son empreinte, en lecture seule). Ses images sont extraites octet pour octet, sans
            recompression.
          </p>
          <form action="/api/bible/upload" method="post" encType="multipart/form-data" className="mb-2 flex flex-wrap items-center gap-2">
            <input type="file" name="file" accept=".docx" required className="pk-input max-w-sm" />
            <button className="pk-btn primary">Déposer et analyser</button>
          </form>
          {docs.length === 0 ? (
            <p className="italic">Aucun document source enregistré.</p>
          ) : (
            <div className="pk-grid-wrap">
              <table className="pk-grid">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Empreinte</th>
                    <th>Taille</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.sha256}>
                      <td>
                        {d.filename}
                        {db.sources.some((s) => s.sha256 === d.sha256) && <span className="badge green ml-1">déjà importé</span>}
                      </td>
                      <td className="font-mono text-[10px]">{d.sha256.slice(0, 16)}…</td>
                      <td>{(d.bytes / 1e6).toFixed(1)} Mo</td>
                      <td>
                        <Link className="pk-btn small" href={`/import/bible/${d.sha256}`}>
                          Prévisualiser…
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </fieldset>
      </div>
      <fieldset className="pk-fieldset">
        <legend>Registre des importations</legend>
        {batches.length === 0 ? (
          <p className="italic">Aucun import appliqué.</p>
        ) : (
          <div className="pk-grid-wrap">
            <table className="pk-grid">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Import</th>
                  <th>Source</th>
                  <th>Résultat</th>
                  <th>État</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="whitespace-nowrap">{fmtDate(b.at)}</td>
                    <td>
                      <Link href={`/import/lot/${b.id}`} className="font-mono text-[11px]">
                        {b.id}
                      </Link>
                    </td>
                    <td>{b.kind === "porkopedia" ? `Porkopédia ${b.sourceId}` : `Bible DOCX ${b.sourceId.slice(0, 12)}…`}</td>
                    <td className="text-[11px]">
                      {Object.entries(b.summary)
                        .filter(([, v]) => v)
                        .map(([k, v]) => `${k} ${v}`)
                        .join(" · ") || "aucun changement"}
                    </td>
                    <td>{b.status === "annulee" ? <span className="badge grey">Annulé {fmtDate(b.undoneAt)}</span> : <span className="badge green">Appliqué</span>}</td>
                    <td>
                      {b.status === "appliquee" && b.changes.length > 0 && (
                        <ActionButton
                          className="pk-btn small danger"
                          action={undoImportAction.bind(null, b.id)}
                          confirm={{
                            title: "Annuler une importation",
                            message: (
                              <>
                                Les {b.changes.filter((c) => c.action === "cree").length} élément(s) créés par l&apos;import <b>{b.id}</b> iront dans la corbeille ; les{" "}
                                {b.changes.filter((c) => c.action !== "cree").length} élément(s) modifiés retrouveront leur version antérieure (nouvelle révision).
                                <br />
                                Rien n&apos;est effacé. Les éléments modifiés depuis l&apos;import sont conservés et signalés. Une sauvegarde est faite avant.
                              </>
                            ),
                            confirmLabel: "Annuler l'import",
                            danger: true,
                          }}
                        >
                          Annuler…
                        </ActionButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </fieldset>
      <p className="flex items-center gap-1 text-[11px]">
        <IconArchive size={14} /> Avant une importation importante : <Link href="/archives" className="text-[#1d3f8f] underline">vérifier qu&apos;une sauvegarde est restaurable</Link>.
      </p>
    </Window>
  );
}
