import Link from "next/link";
import type { Metadata } from "next";
import { getDb } from "@/server/page-data";
import { Alert, CanonBadge, DemoBadge, Window, fmtDate } from "@/components/ui";
import { IconBook } from "@/components/icons";
import { MarkdownView } from "@/components/markdown-view";
import { buildLinkIndex } from "@/domain/markdown";
import type { BibleCategory } from "@/domain/types";
import { BIBLE_CATEGORIES } from "./categories";
import { BibleForm } from "./bible-form";

export const metadata: Metadata = { title: "Bible canonique" };

export default async function BiblePage({ searchParams }: { searchParams: Promise<{ cat?: string; edit?: string; nouveau?: string }> }) {
  const sp = await searchParams;
  const db = await getDb();
  const live = db.bible.filter((b) => !b.deletedAt);
  const cat = (sp.cat && sp.cat in BIBLE_CATEGORIES ? sp.cat : "") as BibleCategory | "";
  const entries = live.filter((b) => !cat || b.category === cat).sort((a, b) => a.title.localeCompare(b.title, "fr"));
  const editing = sp.edit ? live.find((b) => b.id === sp.edit) : undefined;
  const characters = db.characters.filter((c) => !c.deletedAt).map((c) => ({ id: c.id, name: c.canonicalName }));
  const index = buildLinkIndex(db);

  return (
    <Window
      title="Bible canonique — Direction des Règles"
      code="PK-401"
      icon={<IconBook size={18} />}
      menu={<Link href={`/bible?nouveau=1${cat ? `&cat=${cat}` : ""}`}>Nouvelle entrée</Link>}
      status={[`${entries.length} entrée(s) affichée(s)`, `${live.length} au total`]}
    >
      <Alert kind="info">
        <b>Import de la Bible visuelle DOCX : pas encore disponible (phase 3).</b> L&apos;original DOCX devra être fourni ; l&apos;import extraira les
        sections en prévisualisation avant validation, en conservant le fichier original et la provenance de chaque passage. Aucun contenu canonique
        n&apos;est inventé : en attendant, les entrées se saisissent à la main avec leur source.
      </Alert>
      <div className="grid gap-3 md:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="pk-nav self-start">
          <div className="pk-nav-head">Chapitres</div>
          <ul>
            <li>
              <Link href="/bible" aria-current={!cat ? "page" : undefined}>
                Tous <span className="num">{live.length}</span>
              </Link>
            </li>
            {Object.entries(BIBLE_CATEGORIES).map(([k, v]) => (
              <li key={k}>
                <Link href={`/bible?cat=${k}`} aria-current={cat === k ? "page" : undefined}>
                  {v} <span className="num">{live.filter((b) => b.category === k).length}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-2">
          {(sp.nouveau || editing) && (
            <fieldset className="pk-fieldset">
              <legend>{editing ? `Modifier : ${editing.title}` : "Nouvelle entrée"}</legend>
              <BibleForm key={editing ? editing.id : "new"} entry={editing} characters={characters} defaultCategory={cat || undefined} />
            </fieldset>
          )}
          {entries.length === 0 && <p className="italic">Aucune entrée dans ce chapitre.</p>}
          {entries.map((b) => (
            <article key={b.id} className="pk-window !p-0">
              <div className="flex flex-wrap items-center gap-2 border-b border-[#8a867c] px-2 py-1">
                <b>{b.title}</b>
                <span className="badge grey">{BIBLE_CATEGORIES[b.category]}</span>
                <CanonBadge status={b.status} />
                <DemoBadge show={b.isDemo} />
                <Link href={`/bible?edit=${b.id}${cat ? `&cat=${cat}` : ""}`} className="pk-btn small ml-auto">
                  Modifier
                </Link>
              </div>
              <div className="bg-white px-3 py-1">
                <MarkdownView body={b.body} index={index} />
              </div>
              <div className="px-2 py-1 text-[11px]">
                Source : <b>{b.provenance.source}</b>
                {b.provenance.detail ? ` — ${b.provenance.detail}` : ""} · rév. {b.revision} · {fmtDate(b.updatedAt)}
                {b.characterIds.length > 0 && ` · concerne : ${b.characterIds.map((id) => db.characters.find((c) => c.id === id)?.canonicalName ?? id).join(", ")}`}
              </div>
            </article>
          ))}
        </div>
      </div>
    </Window>
  );
}
