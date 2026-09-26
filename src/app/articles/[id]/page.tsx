import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/server/page-data";
import { Alert, ArticleStatusBadge, DemoBadge, Window, fmtDate } from "@/components/ui";
import { IconScroll } from "@/components/icons";
import { Tabs } from "@/components/tabs";
import { RevisionHistory } from "@/components/revisions";
import { ActionButton } from "@/components/client";
import { buildLinkIndex, mediaThumbUrl } from "@/domain/markdown";
import { resolveArticle, revisionsOf } from "@/domain/ops";
import type { Article, Database, Media } from "@/domain/types";
import { untrashAction } from "@/app/actions";
import { ArticleEditor } from "../article-editor";
import { ArticleDiff } from "../article-diff";
import { ArticleMediaPanel } from "../article-media";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = (await getDb()) as Database;
  const a = db.articles.find((x) => x.id === id);
  if (!a) {
    const alias = resolveArticle(db, id);
    if (alias) redirect(`/articles/${alias.id}`);
    notFound();
  }
  const revs = revisionsOf(db, "article", a.id);
  const text = (x: Pick<Article, "title" | "subtitle" | "lead" | "body">) => `# ${x.title}\n${x.subtitle}\n\n${x.lead}\n\n${x.body}`;
  const versions = revs.map((r) => {
    const s = r.snapshot as Article;
    return { revision: r.revision, label: `Rév. ${r.revision} — ${s.status} — ${fmtDate(r.createdAt)}`, text: text(s) };
  });
  const lite = (m: Media) => ({ id: m.id, name: m.name, thumb: mediaThumbUrl(m), canonStatus: m.canonStatus });
  const liveMedia = db.media.filter((m) => !m.deletedAt);
  const published = db.publications.filter((p) => p.articles.some((x) => x.id === a.id)).map((p) => p.number);

  return (
    <Window
      title={`Article — ${a.title}`}
      code={`PK-2${String(db.articles.indexOf(a) + 10).padStart(2, "0")}`}
      icon={<IconScroll size={18} />}
      menu={
        <>
          <Link href="/articles">← Articles</Link>
          <Link href={`/contextes?article=${a.id}`}>Préparer un contexte IA</Link>
          <Link href="/publication">Préfecture des Publications</Link>
        </>
      }
      status={[
        `ID permanent : ${a.id}`,
        `Révision ${a.revision}`,
        published.length ? `Présent dans les publications n°${published.join(", ")}` : "Jamais publié",
        `Source : ${a.provenance.source}`,
      ]}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-bold text-[#7a1016]">{a.title}</span>
        <ArticleStatusBadge status={a.status} />
        <DemoBadge show={a.isDemo} />
        <span className="font-mono text-[11px]">lien Porkopédia : #article={a.slug}</span>
      </div>
      {a.protection && (
        <Alert kind="error">
          <b>Article protégé.</b> {a.protection.reason} Toute mise à jour par importation exige une validation humaine explicite ; l&apos;historique conserve
          toutes les versions.
        </Alert>
      )}
      {a.external && (
        <Alert kind="info">
          Importé de Porkopédia (<code>#article={a.external.id}</code>) le {fmtDate(a.external.importedAt)} — extraction <code>{a.external.extractionId}</code>. Créé
          par <b>{a.external.origin}</b>
          {a.external.modifiedBy.length > 0 && (
            <>
              , puis modifié par : <b>{a.external.modifiedBy.join(" → ")}</b>
            </>
          )}
          . {a.revision > a.external.importedRevision ? (
            <span className="badge amber">Modifié localement depuis l&apos;import</span>
          ) : (
            <span className="badge green">Identique à la version constatée sur le site le {fmtDate(a.siteSeen?.at)}</span>
          )}
        </Alert>
      )}
      {a.deletedAt && (
        <Alert kind="error">
          Article dans la corbeille depuis le {fmtDate(a.deletedAt)}.{" "}
          <ActionButton className="pk-btn small" action={untrashAction.bind(null, "article", a.id)}>
            Restaurer
          </ActionButton>
        </Alert>
      )}
      <Tabs
        tabs={[
          {
            label: "Édition",
            content: (
              <ArticleEditor
                article={a}
                index={buildLinkIndex(db)}
                sections={[...new Set(db.articles.map((x) => x.section).filter(Boolean))]}
                characters={db.characters.filter((c) => !c.deletedAt).map((c) => ({ id: c.id, name: c.canonicalName }))}
                media={liveMedia.map((m) => ({ id: m.id, name: m.name }))}
              />
            ),
          },
          {
            label: `Illustrations (${a.mediaIds.length})`,
            content: (
              <ArticleMediaPanel
                article={a}
                linked={liveMedia.filter((m) => a.mediaIds.includes(m.id)).map(lite)}
                others={liveMedia.filter((m) => !a.mediaIds.includes(m.id)).map(lite)}
              />
            ),
          },
          { label: "Comparer les versions", content: <ArticleDiff versions={versions} /> },
          { label: `Historique (${revs.length})`, content: <RevisionHistory type="article" entityId={a.id} current={a as never} revisions={revs} /> },
        ]}
      />
    </Window>
  );
}
