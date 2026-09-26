"use client";
/** PigNet Navigateur : l'internet national. Porkopédia y est consultable hors ligne (notices intégrées au build). */
import { useEffect, useMemo, useState } from "react";
import porkopedia from "@/content/porkopedia/porkopedia.json";
import { useOs, useWin } from "@/os/context";
import { HOME, articleUrl, parseUrl, search, searchUrl } from "./url";

interface Article {
  id: string;
  title: string;
  sub: string;
  section: string;
  lead: string;
  image: string | null;
  html: string;
}
const ARTICLES = porkopedia.articles as Article[];
const CATALOG = porkopedia.catalog as { id: string; title: string; section: string }[];
const byId = new Map(ARTICLES.map((a) => [a.id, a]));

export function Navigateur() {
  const { str, signal } = useOs();
  const { win, setTitle } = useWin();
  const [hist, setHist] = useState<{ list: string[]; i: number }>({ list: [win.args.url ?? HOME], i: 0 });
  const url = hist.list[hist.i]!;
  const [bar, setBar] = useState(url);
  const route = useMemo(() => parseUrl(url), [url]);

  const go = (u: string) => setHist((h) => ({ list: [...h.list.slice(0, h.i + 1), u], i: h.i + 1 }));
  // Réouverture avec une autre adresse (raccourci) : on navigue.
  useEffect(() => {
    if (win.args.url && win.args.url !== url) go(win.args.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.args.url]);
  useEffect(() => setBar(url), [url]);

  const pageTitle = route.kind === "article" ? (byId.get(route.id)?.title ?? CATALOG.find((c) => c.id === route.id)?.title ?? "412") : route.kind === "accueil" ? "PigNet" : route.kind === "index" ? "Porkopédia" : route.kind === "recherche" ? route.q : "PigNet";
  useEffect(() => setTitle(`${pageTitle} — PigNet Navigateur`), [pageTitle, setTitle]);

  const onLink = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a[data-article]");
    if (!a) return;
    e.preventDefault();
    go(articleUrl(a.getAttribute("data-article")!));
  };

  return (
    <div className="app-col">
      <div className="pk-toolbar">
        <button className="pk-btn small" disabled={hist.i === 0} onClick={() => setHist((h) => ({ ...h, i: h.i - 1 }))}>◂ Précédent</button>
        <button className="pk-btn small" disabled={hist.i >= hist.list.length - 1} onClick={() => setHist((h) => ({ ...h, i: h.i + 1 }))}>Suivant ▸</button>
        <button className="pk-btn small" onClick={() => signal("nav:actualiser")}>Actualiser</button>
        <button className="pk-btn small" onClick={() => go(HOME)}>Accueil</button>
        <form
          className="barre-adresse"
          onSubmit={(e) => {
            e.preventDefault();
            go(bar.trim() || HOME);
          }}
        >
          <label>Adresse</label>
          <input className="pk-input" value={bar} onChange={(e) => setBar(e.target.value)} spellCheck={false} data-testid="nav-url" />
          <button className="pk-btn small">Aller</button>
        </form>
      </div>
      <div className="pk-body page-web" onClick={onLink} data-testid="nav-page">
        {route.kind === "accueil" && <Accueil go={go} />}
        {route.kind === "index" && <Index go={go} />}
        {route.kind === "recherche" && <Recherche q={route.q} go={go} />}
        {route.kind === "article" && <Notice id={route.id} go={go} />}
        {route.kind === "etranger" && <Erreur titre="Internet étranger" texte={str("nav.etranger")} code="PK-012" />}
        {route.kind === "inconnu" && <Erreur titre="Adresse non homologuée" texte={str("nav.inconnu")} code="412" />}
      </div>
      <div className="pk-statusbar">
        <span style={{ flex: 1 }}>{str("nav.statut")}</span>
        <span>PigNet · zone nationale</span>
      </div>
    </div>
  );
}

function Accueil({ go }: { go(u: string): void }) {
  const { str, pack } = useOs();
  const [q, setQ] = useState("");
  return (
    <div className="portail">
      <header>
        <img src="/brand/embleme-128.png" alt="" width={72} height={72} />
        <div>
          <h1>{str("nav.accueil.titre")}</h1>
          <p>{str("nav.accueil.sousTitre")}</p>
        </div>
      </header>
      <form className="portail-recherche" onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(searchUrl(q)); }}>
        <input className="pk-input" placeholder={str("nav.recherche")} value={q} onChange={(e) => setQ(e.target.value)} data-testid="nav-search" />
        <button className="pk-btn primary">Rechercher</button>
      </form>
      <div className="depeches">
        <b>{str("nav.depeches")}</b>
        <ul>
          {pack.news.slice(0, 6).map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
      <h2>Porkopédia — notices synchronisées sur votre poste</h2>
      <ul className="vignettes">
        {ARTICLES.map((a) => (
          <li key={a.id}>
            <a data-article={a.id} href="#">
              {a.image && <img src={a.image} alt="" loading="lazy" referrerPolicy="no-referrer" />}
              <b>{a.title}</b>
              <span>{a.sub}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="portail-pied">
        <button className="lien" onClick={() => go("porko://porkopedia")}>{str("nav.index")}</button> · {CATALOG.length} notices recensées · Source : {porkopedia.source}
      </p>
    </div>
  );
}

function Index({ go }: { go(u: string): void }) {
  const { str } = useOs();
  const sections = useMemo(() => {
    const m = new Map<string, typeof CATALOG>();
    for (const c of CATALOG) m.set(c.section || "Divers", [...(m.get(c.section || "Divers") ?? []), c]);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, []);
  return (
    <div className="notice index">
      <h1>{str("nav.index")}</h1>
      <p>Les notices en gras sont consultables sur votre poste. Les autres font l'objet d'une demande de synchronisation.</p>
      {sections.map(([s, items]) => (
        <section key={s}>
          <h2>{s}</h2>
          <p className="index-liste">
            {items.map((c, i) => (
              <span key={c.id}>
                <a data-article={c.id} href="#" className={byId.has(c.id) ? "synchro" : undefined} onClick={(e) => { e.preventDefault(); go(articleUrl(c.id)); }}>
                  {c.title}
                </a>
                {i < items.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </section>
      ))}
    </div>
  );
}

function Recherche({ q, go }: { q: string; go(u: string): void }) {
  const { str } = useOs();
  const hits = search(CATALOG, q);
  return (
    <div className="notice">
      <h1>{str("nav.resultats")} : « {q} »</h1>
      {hits.length === 0 ? (
        <p>{str("nav.aucun")}</p>
      ) : (
        <ul>
          {hits.slice(0, 60).map((h) => (
            <li key={h.id}>
              <a data-article={h.id} href="#" className={byId.has(h.id) ? "synchro" : undefined} onClick={(e) => { e.preventDefault(); go(articleUrl(h.id)); }}>
                {h.title}
              </a>{" "}
              <small>— {h.section}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Notice({ id, go }: { id: string; go(u: string): void }) {
  const { str } = useOs();
  const a = byId.get(id);
  if (!a) {
    const c = CATALOG.find((x) => x.id === id);
    if (!c) return <Erreur titre="Notice introuvable" texte={str("nav.inconnu")} code="412" />;
    return (
      <div className="notice">
        <h1>{c.title}</h1>
        <p className="sous">{c.section}</p>
        <div className="notice">
          <b>{str("nav.hors-ligne.titre")}</b> — {str("nav.hors-ligne")}
        </div>
        <p>
          <button className="lien" onClick={() => go("porko://porkopedia")}>{str("nav.index")}</button>
        </p>
      </div>
    );
  }
  return (
    <article className="notice">
      <p className="bandeau-porkopedia">Porkopédia · {a.section || "Notice"}</p>
      <h1>{a.title}</h1>
      <p className="sous">{a.sub}</p>
      {a.image && (
        <figure className="vignette-notice">
          <img src={a.image} alt="" referrerPolicy="no-referrer" />
        </figure>
      )}
      <div dangerouslySetInnerHTML={{ __html: a.html }} />
    </article>
  );
}

function Erreur({ titre, texte, code }: { titre: string; texte: string; code: string }) {
  return (
    <div className="page-erreur">
      <b className="code">{code}</b>
      <h1>{titre}</h1>
      <p>{texte}</p>
    </div>
  );
}
