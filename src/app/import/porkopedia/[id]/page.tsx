import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/server/page-data";
import { Alert, Window, fmtDate } from "@/components/ui";
import { IconExport } from "@/components/icons";
import { Tabs } from "@/components/tabs";
import { loadExtraction } from "@/import/extractions";
import { DEFAULT_OPTIONS, planPorkopediaImport, type ImportOptions } from "@/domain/porkopedia-import";
import type { Database } from "@/domain/types";
import { ActionBadge, ApplyBar, ArticleTable, CharacterList, ConflictList, DecisionProvider, type ConflictDetail } from "../import-decisions";

export default async function PorkopediaPreview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const ex = await loadExtraction(id).catch(() => null);
  if (!ex) notFound();
  const db = (await getDb()) as Database;
  const options: ImportOptions = {
    nonDisplayedMedia: sp.nd !== "0" && DEFAULT_OPTIONS.nonDisplayedMedia,
    unavailableMedia: sp.ind !== "0" && DEFAULT_OPTIONS.unavailableMedia,
    characters: sp.pers !== "0" && DEFAULT_OPTIONS.characters,
  };
  const plan = planPorkopediaImport(db, ex, options);
  const c = plan.counts;
  const conflicts = plan.articles.filter((a) => a.action === "conflit" || a.action === "corbeille");
  const details: ConflictDetail[] = conflicts.map((it) => {
    const local = it.existingId ? db.articles.find((a) => a.id === it.existingId) : undefined;
    const inc = ex.articles.find((a) => a.id === it.porkopediaId)!;
    return {
      key: it.key,
      local: local ? `# ${local.title}\n${local.subtitle}\n\n${local.lead}\n\n${local.body}` : null,
      incoming: `# ${inc.title}\n${inc.sub}\n\n${inc.lead}\n\n${inc.html}`,
    };
  });
  const scriptStats = ex.scriptOrder.map((s) => ({
    script: s,
    created: ex.articles.filter((a) => a.origin.startsWith(s)).length,
    modified: ex.articles.filter((a) => a.modifiedBy.some((m) => m.startsWith(s))).length,
  }));
  const optLink = (k: string, on: boolean) => {
    const q = new URLSearchParams(Object.entries({ ...sp, [k]: on ? undefined : "0" }).filter(([, v]) => v !== undefined) as [string, string][]);
    return `?${q.toString()}`;
  };
  const unavailable = plan.media.filter((m) => m.unavailable);
  const nonDisplayed = plan.media.filter((m) => !m.displayed);
  const tile = (n: number, l: string, cls = "") => (
    <div className={`stat-tile !block !p-2 ${cls}`}>
      <div className="n !text-[22px]">{n}</div>
      <div className="s">{l}</div>
    </div>
  );

  return (
    <Window
      title={`Prévisualisation d'importation — Porkopédia`}
      code="PK-1110"
      icon={<IconExport size={18} />}
      menu={<Link href="/import">← Bureau des Importations</Link>}
      status={[`Extraction ${ex.extractionId}`, `Extracteur v${ex.extractorVersion}`, `Instantané : ${fmtDate(ex.source.snapshotTakenAt ?? ex.extractedAt)}`]}
    >
      <Alert kind="info">
        Source : <b>{ex.source.site}</b> — instantané figé <code>{ex.source.snapshotDir}</code>. Exécution isolée ({ex.isolation.browser}, origine{" "}
        <code>{ex.isolation.origin}</code>) : {ex.isolation.network.allowed} fichiers servis depuis l&apos;instantané, {ex.isolation.network.blocked} requêtes
        bloquées, <b>aucune requête vers le site public</b>. Contrôle de rendu : {ex.renderCheck}. <b>Rien n&apos;est écrit tant que vous n&apos;avez pas validé.</b>
      </Alert>
      {plan.warnings.map((w, i) => (
        <Alert key={i}>{w}</Alert>
      ))}
      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {tile(c.articlesDetectes!, "articles détectés")}
        {tile(c.articlesNouveaux!, "nouveaux")}
        {tile(c.articlesInchanges!, "déjà présents, inchangés")}
        {tile(c.articlesMisAJour!, "mis à jour sur le site")}
        {tile(c.articlesConflits! + c.articlesCorbeille!, "conflits / corbeille")}
        {tile(c.articlesModifiesParScripts!, "modifiés par des scripts")}
        {tile(c.mediasTotal!, `références médias (${c.mediasNouveaux} nouvelles)`)}
        {tile(c.liensCasses! + c.provenanceIncertaine!, "liens cassés + provenance incertaine")}
      </div>
      <div className="mb-2 flex flex-wrap gap-4 text-[12px]">
        <b>Options :</b>
        <Link href={optLink("nd", options.nonDisplayedMedia)}>
          <input type="checkbox" readOnly checked={options.nonDisplayedMedia} /> Références non affichées ({nonDisplayed.length || "—"}) en « archive »
        </Link>
        <Link href={optLink("ind", options.unavailableMedia)}>
          <input type="checkbox" readOnly checked={options.unavailableMedia} /> Garder les références indisponibles (signalées)
        </Link>
        <Link href={optLink("pers", options.characters)}>
          <input type="checkbox" readOnly checked={options.characters} /> Fiches des figures historiques
        </Link>
      </div>
      <DecisionProvider>
        <Tabs
          tabs={[
            { label: `Conflits (${conflicts.length})`, content: <ConflictList items={conflicts} details={details} /> },
            { label: `Articles (${plan.articles.length})`, content: <ArticleTable items={plan.articles} /> },
            {
              label: `Médias (${plan.media.length})`,
              content: (
                <div className="space-y-2">
                  <p>
                    Les images <b>restent hébergées sur Porkopédia</b> : seules leurs adresses sont enregistrées (chemin d&apos;origine conservé). Un catalogue
                    d&apos;URL <b>n&apos;est pas une sauvegarde physique</b> : pour une copie, utiliser <code>npm run media:backup</code>.
                  </p>
                  <table className="text-[12px]">
                    <tbody>
                      <tr><td className="pr-3">Nouvelles références</td><td><b>{c.mediasNouveaux}</b></td></tr>
                      <tr><td className="pr-3">Déjà au catalogue (liées seulement)</td><td><b>{c.mediasExistants}</b></td></tr>
                      <tr><td className="pr-3">Affichées sur le site → statut « officiel »</td><td><b>{plan.media.filter((m) => m.displayed).length}</b></td></tr>
                      <tr><td className="pr-3">Présentes dans le code, non affichées → « archive »</td><td><b>{nonDisplayed.length}</b></td></tr>
                      <tr><td className="pr-3">Chemins relatifs résolus / URL absolues</td><td><b>{plan.media.filter((m) => m.refKind === "chemin-relatif").length}</b> / <b>{plan.media.filter((m) => m.refKind === "url-absolue").length}</b></td></tr>
                      <tr><td className="pr-3">Images intégrées (data:) non importables</td><td><b>{plan.skippedEmbedded}</b></td></tr>
                      <tr><td className="pr-3">Indisponibles (vérification HEAD)</td><td><b>{unavailable.length}</b>{c.mediasNonVerifies ? ` — ${c.mediasNonVerifies} non vérifiées : relancer l'extraction avec --check-media` : ""}</td></tr>
                    </tbody>
                  </table>
                  {unavailable.length > 0 && (
                    <fieldset className="pk-fieldset">
                      <legend>Ressources indisponibles</legend>
                      <ul className="max-h-60 overflow-auto font-mono text-[11px]">
                        {unavailable.map((m) => (
                          <li key={m.key}>
                            {m.originalRef} — {m.check?.httpStatus ?? m.check?.message}
                          </li>
                        ))}
                      </ul>
                    </fieldset>
                  )}
                  <details className="pk-fieldset">
                    <summary>Références non affichées ({nonDisplayed.length})</summary>
                    <ul className="mt-1 max-h-60 overflow-auto font-mono text-[11px]">
                      {nonDisplayed.map((m) => (
                        <li key={m.key}>
                          {m.originalRef} <span className="opacity-60">({m.foundIn.join(", ")})</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                  <details className="pk-fieldset">
                    <summary>Aperçu des 60 premières images</summary>
                    <div className="mt-1 grid grid-cols-4 gap-1 sm:grid-cols-6 lg:grid-cols-10">
                      {plan.media
                        .filter((m) => /\.(png|jpe?g|webp|gif)$/i.test(m.url))
                        .slice(0, 60)
                        .map((m) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={m.key} src={m.url} alt={m.originalRef} title={m.originalRef} loading="lazy" className="thumb h-20 w-full" />
                        ))}
                    </div>
                  </details>
                </div>
              ),
            },
            { label: `Personnages (${plan.characters.length})`, content: <CharacterList items={plan.characters} /> },
            {
              label: `Doublons (${plan.duplicates.identicalContent.length + plan.duplicates.identicalTitles.length})`,
              content: (
                <div className="space-y-2">
                  <p>Contenus identiques : {plan.duplicates.identicalContent.length ? plan.duplicates.identicalContent.map((g) => g.join(" = ")).join(" ; ") : "aucun"}.</p>
                  <p>Titres identiques : {plan.duplicates.identicalTitles.length ? plan.duplicates.identicalTitles.map((g) => `« ${g.title} » (${g.ids.join(", ")})`).join(" ; ") : "aucun"}.</p>
                  <details className="pk-fieldset">
                    <summary>Images partagées entre plusieurs articles ({plan.duplicates.sharedImages.length})</summary>
                    <ul className="mt-1 max-h-60 overflow-auto text-[11px]">
                      {plan.duplicates.sharedImages.map((s) => (
                        <li key={s.url}>
                          <code>{s.url.split("/").slice(-2).join("/")}</code> : {s.articles.join(", ")}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              ),
            },
            {
              label: `Liens & provenance (${plan.brokenLinks.length + plan.uncertain.length})`,
              content: (
                <div className="space-y-2">
                  <fieldset className="pk-fieldset">
                    <legend>Liens internes problématiques</legend>
                    {plan.brokenLinks.length === 0 ? (
                      <p>Aucun lien #article= vers un article inexistant.</p>
                    ) : (
                      <ul className="text-[12px]">
                        {plan.brokenLinks.map((l, i) => (
                          <li key={i}>
                            <code>{l.from}</code> → <code>{l.to}</code> {l.resolvedLocally ? <span className="badge blue">résolu localement</span> : <span className="badge red">introuvable</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </fieldset>
                  <fieldset className="pk-fieldset">
                    <legend>Provenance incertaine</legend>
                    {plan.uncertain.length === 0 ? (
                      <p>Aucune.</p>
                    ) : (
                      <ul className="text-[12px]">
                        {plan.uncertain.map((u) => (
                          <li key={u.id}>
                            <b>{u.title}</b> (<code>{u.id}</code>) — {u.why}
                          </li>
                        ))}
                      </ul>
                    )}
                  </fieldset>
                </div>
              ),
            },
            {
              label: `Scripts (${ex.scriptOrder.length})`,
              content: (
                <div className="pk-grid-wrap max-h-[60vh]">
                  <table className="pk-grid">
                    <thead>
                      <tr>
                        <th>Ordre</th>
                        <th>Script</th>
                        <th>Articles créés</th>
                        <th>Articles modifiés</th>
                        <th>Empreinte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scriptStats.map((s, i) => (
                        <tr key={s.script}>
                          <td>{i + 1}</td>
                          <td className="font-mono text-[11px]">{s.script}</td>
                          <td>{s.created || ""}</td>
                          <td>{s.modified || ""}</td>
                          <td className="font-mono text-[10px]">{ex.files.find((f) => f.file === s.script)?.sha256.slice(0, 12) ?? "(en ligne)"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            },
          ]}
        />
        <ApplyBar extractionId={ex.extractionId} options={options} counts={c} />
      </DecisionProvider>
      <p className="mt-2 text-[11px]">
        Légende : <ActionBadge action="creer" /> <ActionBadge action="inchange" /> <ActionBadge action="mettre-a-jour" /> <ActionBadge action="conflit" /> — les
        conflits sont résolus de façon conservatrice par défaut (version locale gardée, rien d&apos;importé en cas de doute).
      </p>
    </Window>
  );
}
