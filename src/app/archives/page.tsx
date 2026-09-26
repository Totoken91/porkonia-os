import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { Alert, Window, fmtDate } from "@/components/ui";
import { IconArchive } from "@/components/icons";
import { ActionButton } from "@/components/client";
import { backupAction, verifyBackupAction } from "@/app/actions";
import { dataDir, listBackupFiles } from "@/data/store";
import { mediaRoot } from "@/media/local";
import { readMediaBackupIndex } from "@/media/backup-index";

export const metadata: Metadata = { title: "Direction des Archives" };

export default async function ArchivesPage() {
  const db = await getDb();
  const files = await listBackupFiles();
  const mb = await readMediaBackupIndex();
  const liveMedia = db.media.filter((m) => !m.deletedAt);
  const backedUp = liveMedia.filter((m) => m.backupPath).length;
  return (
    <Window title="Direction des Archives — Sauvegardes & exports" code="PK-801" icon={<IconArchive size={18} />} status={[`Données : ${dataDir()}`, `Médias locaux : ${mediaRoot()}`]}>
      <div className="grid gap-3 lg:grid-cols-2">
        <fieldset className="pk-fieldset">
          <legend>Sauvegarde de la base</legend>
          <p className="mb-2">
            Copie intégrale horodatée dans <code>data/backups/</code>, relue et vérifiée par empreinte SHA-256. Une sauvegarde est aussi créée
            automatiquement avant chaque publication et chaque restauration de publication.
          </p>
          <ActionButton className="pk-btn primary" action={backupAction}>
            Créer une sauvegarde maintenant
          </ActionButton>
          <p className="mt-2 text-[11px]">
            Restauration : opération explicite en ligne de commande, jamais depuis un bouton —{" "}
            <code>npm run restore -- data/backups/&lt;fichier&gt;.json --confirm</code> (l&apos;état actuel est sauvegardé avant). Voir <code>docs/BACKUP.md</code>.
          </p>
        </fieldset>
        <fieldset className="pk-fieldset">
          <legend>Exports</legend>
          <ul className="space-y-2">
            <li>
              <a className="pk-btn" href="/api/export">Export complet (JSON)</a> — toutes les données, révisions et publications, lisible sans Porkonia OS.
            </li>
            <li>
              <a className="pk-btn" href="/api/medias/export?format=csv">Références médias (CSV)</a>{" "}
              <a className="pk-btn" href="/api/medias/export?format=json">(JSON)</a>
            </li>
          </ul>
          <Alert kind="info">
            Les médias restent hébergés à leur emplacement (Porkopédia) : le catalogue d&apos;URL n&apos;est pas une sauvegarde. Copie physique indépendante :{" "}
            <code>npm run media:backup</code>, contrôle : <code>npm run media:verify</code>.
          </Alert>
        </fieldset>
      </div>
      <fieldset className="pk-fieldset">
        <legend>Sauvegarde physique des médias</legend>
        {mb ? (
          <div className="space-y-1">
            <p>
              Dernière sauvegarde : <b>{fmtDate(mb.finishedAt)}</b> — {mb.summary.sauvegardes}/{mb.summary.total} médias ({(mb.summary.octets / 1e6).toFixed(1)} Mo),{" "}
              {mb.summary.erreurs ? <span className="badge red">{mb.summary.erreurs} erreur(s)</span> : <span className="badge green">aucune erreur</span>}{" "}
              {mb.summary.ecartsEmpreinte ? <span className="badge red">{mb.summary.ecartsEmpreinte} écart(s) d&apos;empreinte</span> : null}
            </p>
            <p>
              Base : {backedUp}/{liveMedia.length} médias ont une copie physique enregistrée{liveMedia.length - backedUp ? ` — ${liveMedia.length - backedUp} sans copie (relancer npm run media:backup)` : ""}.
              Stockage par empreinte (<code>fichiers/&lt;sha256&gt;</code>) et miroir des chemins d&apos;origine (<code>par-chemin/assets/…</code>) dans <code>{mb.dest}</code>.
            </p>
            {mb.identical.length > 0 && (
              <details>
                <summary>{mb.identical.length} fichier(s) identique(s) sous plusieurs chemins</summary>
                <ul className="font-mono text-[11px]">
                  {mb.identical.map((g, i) => (
                    <li key={i}>{g.join(" = ")}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ) : (
          <p className="italic">Aucune sauvegarde physique des médias. Lancer <code>npm run media:backup</code>.</p>
        )}
      </fieldset>
      <fieldset className="pk-fieldset">
        <legend>Fichiers de sauvegarde sur disque ({files.length})</legend>
        <p className="mb-1 text-[11px]">« Tester » lit la sauvegarde, la migre à blanc et la restaure dans un dossier temporaire : aucune donnée n&apos;est modifiée.</p>
        <div className="pk-grid-wrap max-h-80">
          <table className="pk-grid">
            <thead>
              <tr>
                <th>Fichier</th>
                <th>Test de restauration</th>
              </tr>
            </thead>
            <tbody>
              {files.slice(0, 40).map((f) => (
                <tr key={f}>
                  <td className="font-mono text-[11px]">
                    {f} {f.startsWith("pre-migration") && <span className="badge amber">avant migration</span>}
                  </td>
                  <td>
                    <ActionButton className="pk-btn small" action={verifyBackupAction.bind(null, f)}>
                      Tester la restauration
                    </ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>
      <fieldset className="pk-fieldset">
        <legend>Sauvegardes enregistrées ({db.backups.length})</legend>
        <div className="pk-grid-wrap max-h-80">
          <table className="pk-grid">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fichier</th>
                <th>Taille</th>
                <th>SHA-256</th>
                <th>Présent sur disque</th>
              </tr>
            </thead>
            <tbody>
              {[...db.backups].reverse().map((b) => (
                <tr key={b.id}>
                  <td className="whitespace-nowrap">{fmtDate(b.at)}</td>
                  <td className="font-mono text-[11px]">{b.file}</td>
                  <td>{(b.bytes / 1024).toFixed(1)} Ko</td>
                  <td className="font-mono text-[10px]">{b.sha256.slice(0, 16)}…</td>
                  <td>{files.includes(b.file.split("/").pop()!) ? <span className="badge green">Oui</span> : <span className="badge red">Absent</span>}</td>
                </tr>
              ))}
              {db.backups.length === 0 && (
                <tr>
                  <td colSpan={5} className="italic">
                    Aucune sauvegarde.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </fieldset>
    </Window>
  );
}
