"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Article } from "@/domain/types";
import type { LinkIndex } from "@/domain/markdown";
import { saveArticle, setArticleStatusAction, trashAction, type ActionResult } from "@/app/actions";
import { ActionButton, ResultMessage } from "@/components/client";
import { MarkdownView } from "@/components/markdown-view";

type Draft = {
  title: string;
  subtitle: string;
  slug: string;
  aliases: string;
  section: string;
  tags: string;
  lead: string;
  body: string;
  characterIds: string[];
};

const fromArticle = (a?: Article): Draft => ({
  title: a?.title ?? "",
  subtitle: a?.subtitle ?? "",
  slug: a?.slug ?? "",
  aliases: a?.aliases.join(", ") ?? "",
  section: a?.section ?? "",
  tags: a?.tags.join(", ") ?? "",
  lead: a?.lead ?? "",
  body: a?.body ?? "## Présentation\n\n",
  characterIds: a?.characterIds ?? [],
});

export function ArticleEditor({
  article,
  index,
  sections,
  characters,
  media,
}: {
  article?: Article;
  index: LinkIndex;
  sections: string[];
  characters: { id: string; name: string }[];
  media: { id: string; name: string }[];
}) {
  const [draft, setDraft] = useState<Draft>(() => fromArticle(article));
  const [result, setResult] = useState<ActionResult | null>(null);
  const [view, setView] = useState<"split" | "edit" | "preview">("split");
  const [pending, start] = useTransition();
  const router = useRouter();
  const ta = useRef<HTMLTextAreaElement>(null);
  const initial = useMemo(() => JSON.stringify(fromArticle(article)), [article]);
  const dirty = JSON.stringify(draft) !== initial;

  // Après enregistrement (nouvelle révision reçue du serveur), on resynchronise le brouillon local.
  // Sauf modifications locales en cours (dans ce cas, l'enregistrement détectera le conflit).
  const prevInitial = useRef(initial);
  const [baseRev, setBaseRev] = useState(article?.revision);
  const serverRev = article?.revision;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => {
    const unchanged = JSON.stringify(draftRef.current) === prevInitial.current;
    if (unchanged) {
      setDraft(JSON.parse(initial) as Draft);
      setBaseRev(serverRev);
    }
    prevInitial.current = initial;
  }, [initial, serverRev]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const insert = (before: string, after = "", placeholder = "") => {
    const el = ta.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const sel = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    set("body", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  };

  const save = () =>
    start(async () => {
      const r = await saveArticle({ ...draft, id: article?.id, expectedRevision: baseRev });
      setResult(r);
      if (r.ok && r.revision) setBaseRev(r.revision);
      if (r.ok && !article && r.id) router.push(`/articles/${r.id}`);
      else router.refresh();
    });

  const [linkKey, setLinkKey] = useState("");
  const [mediaKey, setMediaKey] = useState("");

  return (
    <div className="space-y-2">
      <ResultMessage result={result} />
      <fieldset className="pk-fieldset">
        <legend>En-tête de l&apos;article</legend>
        <div className="grid gap-2 md:grid-cols-2">
          <label>
            <span className="pk-label">Titre *</span>
            <input className="pk-input" value={draft.title} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label>
            <span className="pk-label">Sous-titre</span>
            <input className="pk-input" value={draft.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          </label>
          <label>
            <span className="pk-label">Section / catégorie</span>
            <input className="pk-input" list="sections" value={draft.section} onChange={(e) => set("section", e.target.value)} />
            <datalist id="sections">
              {sections.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label>
            <span className="pk-label">Étiquettes (virgules)</span>
            <input className="pk-input" value={draft.tags} onChange={(e) => set("tags", e.target.value)} />
          </label>
          <label>
            <span className="pk-label">Slug (adresse lisible — l&apos;ancien est conservé en alias s&apos;il change)</span>
            <input className="pk-input font-mono" value={draft.slug} placeholder="généré depuis le titre" onChange={(e) => set("slug", e.target.value)} />
          </label>
          <label>
            <span className="pk-label">Alias (anciens liens, ex. identifiants Porkopédia #article=…)</span>
            <input className="pk-input font-mono" value={draft.aliases} onChange={(e) => set("aliases", e.target.value)} />
          </label>
        </div>
        <label className="mt-2 block">
          <span className="pk-label">Chapeau (résumé introductif)</span>
          <textarea className="pk-textarea" rows={2} value={draft.lead} onChange={(e) => set("lead", e.target.value)} />
        </label>
        <div className="mt-2">
          <span className="pk-label">Personnages associés</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {characters.map((c) => (
              <label key={c.id} className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={draft.characterIds.includes(c.id)}
                  onChange={(e) =>
                    set("characterIds", e.target.checked ? [...draft.characterIds, c.id] : draft.characterIds.filter((x) => x !== c.id))
                  }
                />
                {c.name}
              </label>
            ))}
            {characters.length === 0 && <span className="italic">Aucun personnage au registre.</span>}
          </div>
        </div>
      </fieldset>

      <div className="pk-window !p-0">
        <div className="pk-toolbar">
          <button type="button" className="pk-btn small" onClick={() => insert("\n## ", "\n", "Titre de section")}>
            Titre
          </button>
          <button type="button" className="pk-btn small" onClick={() => insert("\n### ", "\n", "Sous-titre")}>
            Sous-titre
          </button>
          <button type="button" className="pk-btn small font-bold" onClick={() => insert("**", "**", "gras")}>
            G
          </button>
          <button type="button" className="pk-btn small italic" onClick={() => insert("*", "*", "italique")}>
            I
          </button>
          <button type="button" className="pk-btn small" onClick={() => insert("\n| Colonne | Colonne |\n|---|---|\n| ", " | … |\n", "valeur")}>
            Tableau
          </button>
          <button type="button" className="pk-btn small" onClick={() => insert("\n> ", "\n", "citation")}>
            Citation
          </button>
          <span className="mx-1 h-5 w-px bg-[#8a867c]" />
          <select className="pk-select !w-44" value={linkKey} onChange={(e) => setLinkKey(e.target.value)} aria-label="Lien interne">
            <option value="">Lien interne…</option>
            {index.articles
              .filter((a) => a.id !== article?.id)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
          </select>
          <button
            type="button"
            className="pk-btn small"
            disabled={!linkKey}
            onClick={() => {
              const a = index.articles.find((x) => x.id === linkKey);
              if (a) insert(`[[${a.id}|`, "]]", a.title);
              setLinkKey("");
            }}
          >
            Insérer le lien
          </button>
          <select className="pk-select !w-44" value={mediaKey} onChange={(e) => setMediaKey(e.target.value)} aria-label="Illustration">
            <option value="">Illustration…</option>
            {media.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="pk-btn small"
            disabled={!mediaKey}
            onClick={() => {
              const m = media.find((x) => x.id === mediaKey);
              if (m) insert("\n![", `](media:${m.id})\n`, m.name);
              setMediaKey("");
            }}
          >
            Insérer l&apos;image
          </button>
          <span className="ml-auto flex gap-1">
            {(["edit", "split", "preview"] as const).map((v) => (
              <button key={v} type="button" className="pk-btn small" aria-pressed={view === v} style={view === v ? { fontWeight: "bold" } : undefined} onClick={() => setView(v)}>
                {v === "edit" ? "Source" : v === "split" ? "Côte à côte" : "Aperçu"}
              </button>
            ))}
          </span>
        </div>
        <div className={`grid gap-1 p-1 ${view === "split" ? "lg:grid-cols-2" : ""}`}>
          {view !== "preview" && (
            <textarea
              ref={ta}
              className="pk-textarea min-h-[480px]"
              value={draft.body}
              onChange={(e) => set("body", e.target.value)}
              spellCheck
              aria-label="Corps de l'article (Markdown)"
            />
          )}
          {view !== "edit" && (
            <div className="pk-grid-wrap min-h-[480px] max-h-[75vh] !p-4">
              <h1 className="prose-porko !m-0 border-b border-[#a2a9b1] text-[1.9em]" style={{ fontFamily: "Georgia, serif" }}>
                {draft.title || "Sans titre"}
              </h1>
              {draft.subtitle && <div className="mb-2 text-[12px] text-[#54595d]">{draft.subtitle}</div>}
              {draft.lead && (
                <p className="prose-porko">
                  <b>{draft.lead}</b>
                </p>
              )}
              <MarkdownView body={draft.body} index={index} />
            </div>
          )}
        </div>
        <div className="pk-statusbar px-1 pb-1">
          <span className="flex-1">
            {dirty ? "● Modifications non enregistrées" : "Aucune modification en attente"} — syntaxe : [[id-ou-slug|texte]] · ![légende](media:med_…)
          </span>
          <span>{draft.body.length} caractères</span>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <button type="button" className="pk-btn primary" disabled={pending || !dirty} onClick={save}>
          {pending ? "Enregistrement…" : article ? `Enregistrer la révision ${article.revision + 1}` : "Créer le brouillon"}
        </button>
        {article && !dirty && article.status === "brouillon" && (
          <ActionButton
            className="pk-btn"
            action={setArticleStatusAction.bind(null, article.id, "valide")}
            confirm={{
              title: "Validation éditoriale",
              message: (
                <>
                  Valider la révision {article.revision} de <b>{article.title}</b> ? Elle sera incluse dans la prochaine publication. Rien n&apos;est envoyé à
                  Porkopédia à ce stade.
                </>
              ),
              confirmLabel: "Valider",
            }}
          >
            Valider pour publication
          </ActionButton>
        )}
        {article && article.status === "valide" && (
          <ActionButton className="pk-btn" action={setArticleStatusAction.bind(null, article.id, "brouillon")}>
            Retirer la validation
          </ActionButton>
        )}
        {article && (
          <ActionButton
            className="pk-btn danger"
            action={trashAction.bind(null, "article", article.id)}
            confirm={{
              title: "Placer dans la corbeille",
              message: (
                <>
                  <b>{article.title}</b> sera placé dans la corbeille (suppression logique, récupérable). Les publications déjà créées ne sont pas modifiées.
                </>
              ),
              confirmLabel: "Placer dans la corbeille",
              danger: true,
            }}
          >
            Corbeille…
          </ActionButton>
        )}
        {dirty && article && (
          <button type="button" className="pk-btn" onClick={() => setDraft(fromArticle(article))}>
            Annuler les modifications
          </button>
        )}
      </div>
    </div>
  );
}
