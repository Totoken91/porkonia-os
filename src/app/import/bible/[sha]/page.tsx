import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/server/page-data";
import { Alert, Window, fmtDate } from "@/components/ui";
import { IconBook } from "@/components/icons";
import { loadAnalysis } from "@/bible/docx-store";
import { planBibleImport } from "@/domain/bible-import";
import type { Database } from "@/domain/types";
import { BibleImportForm } from "../bible-decisions";

export default async function BiblePreview({ params }: { params: Promise<{ sha: string }> }) {
  const { sha } = await params;
  const an = await loadAnalysis(sha).catch(() => null);
  if (!an) notFound();
  const db = (await getDb()) as Database;
  const plan = planBibleImport(db, an);
  const c = plan.counts;
  return (
    <Window
      title={`Prévisualisation d'importation — ${an.filename}`}
      code="PK-1120"
      icon={<IconBook size={18} />}
      menu={<Link href="/import">← Bureau des Importations</Link>}
      status={[`SHA-256 ${an.sha256.slice(0, 16)}…`, `${(an.bytes / 1e6).toFixed(1)} Mo`, `Analysé le ${fmtDate(an.analyzedAt)}`]}
    >
      <Alert kind="info">
        <b>{an.title ?? an.filename}</b> — copie intacte conservée (<code>data/originals/{an.sha256.slice(0, 12)}….docx</code>, lecture seule).
        {plan.alreadyRegistered && " Ce document a déjà été importé : seules les différences sont proposées."} {an.stats.paragraphs} paragraphes,{" "}
        {an.stats.tables} tableaux, {an.stats.headings} titres. Rien n&apos;est écrit avant validation.
      </Alert>
      {plan.warnings.map((w, i) => (
        <Alert key={i}>{w}</Alert>
      ))}
      <p className="mb-2">
        <b>{c.sections}</b> sections ({c.sectionsAClasser} à classer, {c.sectionsInchangees} inchangées, {c.sectionsConflits} en conflit) · <b>{c.images}</b> images (
        {c.imagesNouvelles} nouvelles) · <b>{c.portraits}</b> portraits canoniques ({c.portraitsAssocies} reconnus, {c.portraitsSansCorrespondance} sans fiche
        correspondante, {c.portraitsEnConflit} en conflit).
      </p>
      <BibleImportForm
        sha={sha}
        plan={plan}
        sectionsMarkdown={Object.fromEntries(an.sections.map((s) => [`section:${s.path}`, s.markdown]))}
        characters={db.characters.filter((x) => !x.deletedAt).map((x) => ({ id: x.id, name: x.canonicalName }))}
      />
    </Window>
  );
}
