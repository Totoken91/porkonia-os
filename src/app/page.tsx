import Link from "next/link";
import { getDb } from "@/server/page-data";
import { dashboardStats } from "@/domain/integrity";
import { Alert, Emblem, Window, fmtDate } from "@/components/ui";
import { IconDashboard } from "@/components/icons";
import { ActionButton } from "@/components/client";
import { backupAction } from "./actions";
import type { Database } from "@/domain/types";

export default async function Dashboard() {
  const db = (await getDb()) as Database;
  const s = dashboardStats(db);
  const tiles: [string, number | string, string][] = [
    ["Articles", s.articles, "/articles"],
    ["Brouillons", s.articlesDraft, "/articles?statut=brouillon"],
    ["Validés (en attente)", s.articlesValidated, "/publication"],
    ["Publiés", s.articlesPublished, "/articles?statut=publie"],
    ["Personnages", s.characters, "/personnages"],
    ["Médias référencés", s.media, "/medias"],
    ["Entrées de Bible", s.bible, "/bible"],
    ["Éléments en corbeille", s.trash, "/corbeille"],
  ];

  return (
    <Window
      title="Tableau de bord"
      code="PK-000"
      icon={<IconDashboard size={18} />}
      menu={
        <>
          <Link href="/articles/nouveau">Nouvel article</Link>
          <Link href="/personnages/nouveau">Nouvelle fiche</Link>
          <Link href="/medias">Référencer un média</Link>
          <Link href="/contextes">Préparer un contexte IA</Link>
        </>
      }
      status={[
        `Base locale · ${db.revisions.length} révisions archivées`,
        `Journal : ${db.log.length} opérations`,
        s.lastBackup ? `Sauvegarde : ${fmtDate(s.lastBackup.at)}` : "Aucune sauvegarde",
      ]}
    >
      <div className="mb-3 flex items-center gap-3 border-b border-[#8a867c] pb-3">
        <Emblem size={56} />
        <div>
          <div className="text-[16px] font-bold text-[#7a1016]">République de Porkonia — Ministère du Lore</div>
          <div className="text-[11px] text-[#555]">
            Poste de travail administratif. Toute modification est archivée, datée et réversible. Merci de ne pas lécher l&apos;écran.
          </div>
        </div>
      </div>

      {s.demoItems > 0 && (
        <Alert>
          <b>Données de démonstration présentes ({s.demoItems} éléments).</b> Elles sont marquées « DÉMO » et ne font pas partie du canon.
          Aucune donnée réelle de Porkopédia n&apos;a encore été importée.
        </Alert>
      )}
      {s.errors > 0 && (
        <Alert kind="error">
          <b>{s.errors} erreur(s) d&apos;intégrité</b> et {s.warnings} avertissement(s). <Link href="/integrite" className="underline">Consulter le contrôle national d&apos;intégrité</Link>.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map(([label, n, href]) => (
          <Link key={label} href={href} className="stat-tile block no-underline hover:border-[#316ac5]">
            <div className="n">{n}</div>
            <div className="l">{label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <fieldset className="pk-fieldset">
          <legend>Synchronisation avec Porkopédia</legend>
          {s.lastPublication ? (
            <ul className="space-y-1">
              <li>
                Dernière publication : <b>n°{s.lastPublication.number}</b> du {fmtDate(s.lastPublication.createdAt)} ({s.lastPublication.articles.length} articles)
              </li>
              <li>
                Vérification sur le site public :{" "}
                {s.lastPublication.verification === "verifiee" ? (
                  <span className="badge green">Vérifiée</span>
                ) : s.lastPublication.verification === "echec" ? (
                  <span className="badge red">Échec</span>
                ) : (
                  <span className="badge amber">Non vérifiée</span>
                )}
              </li>
            </ul>
          ) : (
            <p>Aucune publication créée. Porkopédia n&apos;est pas synchronisé automatiquement (voir docs/CHATGPT_SITES_INTEGRATION.md).</p>
          )}
          <p className="mt-1">
            Articles non publiés ou modifiés depuis : <b>{s.pendingForPublication}</b>.{" "}
            <Link href="/publication" className="text-[#1d3f8f] underline">Préfecture des Publications</Link>
          </p>
        </fieldset>

        <fieldset className="pk-fieldset">
          <legend>Conservation des données</legend>
          <ul className="space-y-1">
            <li>Dernière sauvegarde : <b>{s.lastBackup ? fmtDate(s.lastBackup.at) : "jamais"}</b></li>
            <li>
              Médias : {s.mediaExternal} externes · {s.media - s.mediaExternal} locaux · <b>{s.mediaBroken}</b> lien(s) mort(s) · {s.mediaUnchecked} non vérifié(s)
            </li>
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <ActionButton action={backupAction} className="pk-btn primary">
              Créer une sauvegarde maintenant
            </ActionButton>
            <a className="pk-btn" href="/api/export">Télécharger l&apos;export complet (JSON)</a>
          </div>
        </fieldset>
      </div>

      <fieldset className="pk-fieldset">
        <legend>Dernières opérations</legend>
        <div className="pk-grid-wrap max-h-72">
          <table className="pk-grid">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody>
              {s.recent.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap">{fmtDate(l.at)}</td>
                  <td className="whitespace-nowrap">{l.action}</td>
                  <td>{l.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>
    </Window>
  );
}
