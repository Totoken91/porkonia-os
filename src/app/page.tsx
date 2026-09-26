import Link from "next/link";
import type { ReactNode } from "react";
import { getDb } from "@/server/page-data";
import { dashboardStats } from "@/domain/integrity";
import { Alert, PublicationStages, Window, fmtDate } from "@/components/ui";
import { IconArchive, IconBook, IconCamera, IconDashboard, IconPerson, IconRobot, IconScroll, IconShield, IconStamp } from "@/components/icons";
import { ActionButton } from "@/components/client";
import { backupAction } from "./actions";
import type { Database } from "@/domain/types";

function Tile({ icon, n, label, sub, href }: { icon: ReactNode; n: number | string; label: string; sub: ReactNode; href: string }) {
  return (
    <Link href={href} className="stat-tile">
      {icon}
      <div className="min-w-0">
        <div className="l">{label}</div>
        <div className="n">{n}</div>
        <div className="s">{sub}</div>
      </div>
    </Link>
  );
}

function Panel({ title, icon, children, className = "" }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`pk-window ${className}`}>
      <header className="pk-titlebar !text-[14px]">
        {icon}
        <h2 className="font-normal">{title}</h2>
      </header>
      <div className="p-2">{children}</div>
    </section>
  );
}

export default async function Dashboard() {
  const db = (await getDb()) as Database;
  const s = dashboardStats(db);
  const pub = s.lastPublication;

  return (
    <Window
      title="Tableau de bord"
      code="PK-000"
      icon={<IconDashboard size={18} />}
      status={[
        `${db.revisions.length} révisions archivées`,
        `Journal : ${db.log.length} opérations`,
        s.lastBackup ? `Dernière sauvegarde : ${fmtDate(s.lastBackup.at)}` : "Aucune sauvegarde",
      ]}
    >
      {s.demoItems > 0 && (
        <Alert>
          <b>Données de démonstration présentes ({s.demoItems} éléments).</b> Elles sont marquées « DÉMO » et ne font pas partie du canon. Aucune donnée
          réelle de Porkopédia n&apos;a encore été importée.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <Tile icon={<IconPerson size={40} />} n={s.characters} label="Individus enregistrés" sub={`${db.characters.filter((c) => !c.deletedAt && c.status === "canon").length} canoniques`} href="/personnages" />
        <Tile icon={<IconScroll size={40} />} n={s.articles} label="Articles" sub={`${s.articlesPublished} publiés · ${s.articlesDraft} brouillons`} href="/articles" />
        <Tile icon={<IconCamera size={40} />} n={s.media} label="Médias référencés" sub={`${db.media.filter((m) => !m.deletedAt && m.canonStatus === "officiel").length} homologués`} href="/medias" />
        <Tile icon={<IconBook size={40} />} n={s.bible} label="Entrées de Bible" sub="règles et références" href="/bible" />
        <Tile
          icon={<IconShield size={40} />}
          n={s.errors}
          label="Erreurs d'intégrité"
          sub={s.errors === 0 ? `aucune erreur · ${s.warnings} avertissement(s)` : `${s.warnings} avertissement(s)`}
          href="/integrite"
        />
      </div>

      <div className="mt-2 grid gap-2 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Modifications récentes" icon={<IconArchive size={16} />}>
          <div className="pk-grid-wrap max-h-72">
            <table className="pk-grid">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opération</th>
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
          <Link href="/journal" className="mt-1 inline-block text-[#1d3f8f] underline">
            Journal complet des opérations
          </Link>
        </Panel>

        <div className="space-y-2">
          <Panel title="État des publications" icon={<IconStamp size={16} />}>
            <table className="w-full text-[12px]">
              <tbody>
                <tr><td><span className="badge green">Publiés</span></td><td className="text-right font-bold">{s.articlesPublished}</td></tr>
                <tr><td><span className="badge blue">Validés, en attente</span></td><td className="text-right font-bold">{s.articlesValidated}</td></tr>
                <tr><td><span className="badge amber">Brouillons</span></td><td className="text-right font-bold">{s.articlesDraft}</td></tr>
              </tbody>
            </table>
            <p className="mt-2">
              {pub ? (
                <>
                  Dernière publication : <b>n°{pub.number}</b> du {fmtDate(pub.createdAt)} ({pub.articles.length} articles) —{" "}
                  <PublicationStages p={pub} />
                </>
              ) : (
                <>Aucune publication. Porkopédia n&apos;est pas synchronisé automatiquement.</>
              )}
            </p>
          </Panel>
          <Panel title="Raccourcis administratifs" icon={<IconRobot size={16} />}>
            <ul className="grid gap-1 text-[13px] sm:grid-cols-2" style={{ fontFamily: "var(--font-serif)" }}>
              <li><Link className="hover:underline" href="/articles/nouveau">Rédiger un article</Link></li>
              <li><Link className="hover:underline" href="/personnages/nouveau">Enregistrer un individu</Link></li>
              <li><Link className="hover:underline" href="/medias?nouveau=1">Référencer une illustration</Link></li>
              <li><Link className="hover:underline" href="/contextes">Préparer un contexte IA</Link></li>
              <li><Link className="hover:underline" href="/integrite">Vérifier l&apos;intégrité</Link></li>
              <li><Link className="hover:underline" href="/archives">Consulter les archives</Link></li>
            </ul>
          </Panel>
          <Panel title="Conservation des données" icon={<IconArchive size={16} />}>
            <p>
              Dernière sauvegarde : <b>{s.lastBackup ? fmtDate(s.lastBackup.at) : "jamais"}</b>
              <br />
              Médias : {s.mediaExternal} externes · {s.media - s.mediaExternal} locaux · <b>{s.mediaBroken}</b> lien(s) mort(s) · {s.mediaUnchecked} non vérifié(s)
              <br />
              Éléments en corbeille : {s.trash}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <ActionButton action={backupAction} className="pk-btn primary">
                Sauvegarder maintenant
              </ActionButton>
              <a className="pk-btn" href="/api/export">Export complet (JSON)</a>
            </div>
          </Panel>
        </div>
      </div>
    </Window>
  );
}
