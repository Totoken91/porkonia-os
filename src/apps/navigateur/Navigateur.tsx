"use client";
/** PigNet Navigateur : l'internet national. Porkopédia y est consultable hors ligne (notices intégrées au build). */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import porkopedia from "@/content/porkopedia/porkopedia.json";
import { useMenuCommands, useOs, useWin } from "@/os/context";
import { DECALAGE, live } from "@/apps/channel-pork/timeline";
import { compteur, coursSeance, duJour, jour, meteo } from "./portail";
import { HOME, articleUrl, parseUrl, rubriqueUrl, search, searchUrl } from "./url";
import { Site } from "./Site";
import {CoinCitoyens,NouvellesLocales} from './VieLocale';

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
  const { str, signal, openApp, pack } = useOs();
  const { win, setTitle } = useWin();
  const adresse = useRef<HTMLInputElement>(null);
  const pageWeb = useRef<HTMLDivElement>(null);
  const [hist, setHist] = useState<{ list: string[]; i: number }>({ list: [win.args.url ?? HOME], i: 0 });
  const url = hist.list[hist.i]!;
  const [bar, setBar] = useState(url);
  const hotes = useMemo(() => pack.sites.map((x) => x.hote), [pack.sites]);
  const route = useMemo(() => parseUrl(url, hotes), [url, hotes]);
  const site = route.kind === "site" ? pack.sites.find((x) => x.hote === route.hote) : undefined;

  const go = (u: string) => setHist((h) => ({ list: [...h.list.slice(0, h.i + 1), u], i: h.i + 1 }));
  // Réouverture avec une autre adresse (raccourci) : on navigue.
  useEffect(() => {
    if (win.args.url && win.args.url !== url) go(win.args.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.args.url]);
  useEffect(() => {setBar(url);if(pageWeb.current)pageWeb.current.scrollTop=0;}, [url]);

  const pageTitle = route.kind === "article" ? (byId.get(route.id)?.title ?? CATALOG.find((c) => c.id === route.id)?.title ?? "412") : route.kind === "accueil" ? "PigNet" : route.kind === "index" ? "Porkopédia" : route.kind === "recherche" ? route.q : site ? (site.pages[route.kind === "site" ? route.page : ""]?.titre ?? site.titre) : "PigNet";
  useEffect(() => setTitle(`${pageTitle} — PigNet Navigateur`), [pageTitle, setTitle]);

  const precedent = () => setHist((h) => ({ ...h, i: Math.max(0, h.i - 1) }));
  const suivant = () => setHist((h) => ({ ...h, i: Math.min(h.list.length - 1, h.i + 1) }));
  useMenuCommands(
    {
      "nav.nouvelle": () => openApp("navigateur"),
      "nav.ouvrir": () => adresse.current?.select(),
      "nav.precedent": precedent,
      "nav.suivant": suivant,
      "nav.actualiser": () => signal("nav:actualiser"),
      "nav.aller": (u) => u && go(u),
    },
    { "nav.precedent": { disabled: hist.i === 0 }, "nav.suivant": { disabled: hist.i >= hist.list.length - 1 } },
  );

  const onLink = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a[data-article]");
    if (!a) return;
    e.preventDefault();
    go(articleUrl(a.getAttribute("data-article")!));
  };

  return (
    <div className="app-col">
      <div className="pk-toolbar">
        <button className="pk-btn small" disabled={hist.i === 0} onClick={precedent}>◂ Précédent</button>
        <button className="pk-btn small" disabled={hist.i >= hist.list.length - 1} onClick={suivant}>Suivant ▸</button>
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
          <input ref={adresse} className="pk-input" value={bar} onChange={(e) => setBar(e.target.value)} spellCheck={false} data-testid="nav-url" />
          <button className="pk-btn small">Aller</button>
        </form>
      </div>
      <div ref={pageWeb} className="pk-body page-web" onClick={onLink} data-testid="nav-page">
        {route.kind === "accueil" && <Accueil go={go} />}
        {route.kind === "index" && <Index go={go} section={route.section} />}
        {route.kind === "recherche" && <Recherche q={route.q} go={go} />}
        {route.kind === "article" && <Notice id={route.id} go={go} />}
        {route.kind === "etranger" && <Erreur titre="Internet étranger" texte={str("nav.etranger")} code="PK-012" />}
        {route.kind === "inconnu" && <Erreur titre="Adresse non homologuée" texte={str("nav.inconnu")} code="412" />}
        {route.kind === "site" && site && <Site site={site} page={route.page} go={go} introuvable={<Erreur titre="Page introuvable" texte={str("nav.inconnu")} code="412" />} />}
      </div>
      <div className="pk-statusbar">
        <span style={{ flex: 1 }}>{str("nav.statut")}</span>
        <span>PigNet · zone nationale</span>
      </div>
    </div>
  );
}

function Accueil({ go }: { go(u: string): void }) {
  const { str, pack, runAction, openApp } = useOs();
  const ids=useId();
  const portail = pack.portal;
  const [q, setQ] = useState("");
  const [portee, setPortee] = useState<"tout" | "porkopedia" | "etranger">("tout");
  const [vote, setVote] = useState<number | null>(null);
  const [choix, setChoix] = useState(0);
  const [maintenant, setMaintenant] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setMaintenant(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  const une = ARTICLES[jour(maintenant) % ARTICLES.length]!;
  const rubriques = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of CATALOG) if (c.section) m.set(c.section, (m.get(c.section) ?? 0) + 1);
    return [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 12);
  }, []);
  const direct = pack.channels.map((c, i) => ({ c, d: live(c, pack.programs, maintenant.getTime() / 1000, i * DECALAGE) }));
  const date = maintenant.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const rechercher = (e: React.FormEvent) => {
    e.preventDefault();
    if (portee === "etranger") return go(`https://${q.trim() || "ailleurs"}.etranger`);
    if (q.trim()) go(searchUrl(q));
  };

  return (
    <div className="portail">
      <header className="portail-tete">
        <img src="/brand/embleme-128.png" alt="" width={40} height={40} />
        <div className="portail-titre">
          <h1>{str("nav.accueil.titre")}</h1>
          <p>{str("nav.accueil.sousTitre")}</p>
        </div>
        <div className="portail-date">
          <b>{date}</b>
          <span>{str("portail.saint", { saint: duJour(portail.saints, maintenant) })}</span>
        </div>
      </header>

      <nav className="portail-raccourcis" aria-label={str('portail.acces')}>
        {portail.raccourcis.map(r=><button key={r.url} onClick={()=>go(r.url)} data-testid={`portail-acces-${r.url.split('://')[1]}`}>{r.label}</button>)}
      </nav>
      <div className="portail-flash" aria-label="Dernière minute">
        <span>{portail.flash.repeat(2)}</span>
      </div>

      <form className="portail-recherche" onSubmit={rechercher}>
        <input className="pk-input" placeholder={str("nav.recherche")} value={q} onChange={(e) => setQ(e.target.value)} data-testid="nav-search" />
        <button className="pk-btn primary">Rechercher</button>
        <span className="portail-portee">
          {(["tout", "porkopedia", "etranger"] as const).map((k) => (
            <label key={k}>
              <input type="radio" name={`${ids}-portee`} checked={portee === k} onChange={() => setPortee(k)} /> {str(`portail.portee.${k}`)}
            </label>
          ))}
        </span>
      </form>

      <div className="portail-grille">
        <aside className="portail-gauche">
          <Bannieres cote="gauche" go={go}/>
          <section className="cadre">
            <h3>{str("portail.rubriques")}</h3>
            <ul className="rubriques">
              {rubriques.map(([s, n]) => (
                <li key={s}>
                  <button className="lien" onClick={() => go(rubriqueUrl(s))}>{s}</button> <small>({n})</small>
                </li>
              ))}
            </ul>
            <button className="lien plus" onClick={() => go("porko://porkopedia")}>{str("nav.index")}…</button>
          </section>
          <section className="cadre">
            <h3>{str("portail.services")}</h3>
            <ul className="services">
              {portail.services.map((sv) => (
                <li key={sv.label}>
                  <button className="lien" onClick={() => (sv.url ? go(sv.url) : sv.action && runAction(sv.action))}>{sv.label}</button>
                  <small>{sv.note}</small>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <main>
          <CoinCitoyens go={go}/>
          <NouvellesLocales go={go}/>
          <section className="cadre portail-jeux">
            <h3>{str('portail.siteJeu')}</h3>
            <button className="portail-jeu-vedette" onClick={()=>go('porko://donjonbon')}>
              <img src="/ordre-cochon/blasons/berthe.png" alt="" width={48} height={48}/>
              <span><b>{pack.sites.find(x=>x.hote==='donjonbon')?.titre}</b><u>{str('portail.decouvrirJeu')} ▸</u></span>
            </button>
            <button className="lien plus" onClick={()=>go('porko://salle-arcade')}>{portail.raccourcis[1]?.label} ▸</button>
          </section>
          <section className="cadre une" data-testid="portail-une">
            <h3>{str("portail.une")}</h3>
            <div className="une-corps">
              {une.image && <img src={une.image} alt="" referrerPolicy="no-referrer" />}
              <div>
                <h2>{une.title}</h2>
                <p className="une-sous">{une.sub}</p>
                <p>{une.lead}</p>
                <button className="pk-btn small" onClick={() => go(articleUrl(une.id))}>{str("portail.lire")} ▸</button>
              </div>
            </div>
          </section>
          <section className="cadre depeches">
            <h3>{str("nav.depeches")}</h3>
            <ul>
              {pack.news.map((n) => {
                const [rub, ...reste] = n.split(" — ");
                return (
                  <li key={n}>{reste.length ? <><b>{rub}</b> — {reste.join(" — ")}</> : n}</li>
                );
              })}
            </ul>
          </section>
          <section className="cadre">
            <h3>{str("portail.notices")}</h3>
            <ul className="vignettes">
              {ARTICLES.slice(0, 8).map((a) => (
                <li key={a.id}>
                  <a data-article={a.id} href="#">
                    {a.image ? <img src={a.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="sans-image" />}
                    <b>{a.title}</b>
                    <span>{a.sub}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </main>

        <aside className="portail-droite">
          <Bannieres cote="droite" go={go}/>
          <section className="cadre direct">
            <h3>{str("portail.direct")}</h3>
            <ul>
              {direct.map(({ c, d }, i) => (
                <li key={c.id}>
                  <button className="lien" onClick={() => openApp("channel-pork")}>
                    <span className="direct-num">{String(i + 1).padStart(2, "0")}</span> {d.program.title}
                  </button>
                  <small>{c.name} · {str("tv.aSuivre").toLowerCase()} : {d.suivant.title}</small>
                </li>
              ))}
            </ul>
          </section>
          <section className="cadre sondage">
            <h3>{str("portail.sondage")}</h3>
            <p><b>{portail.sondage.question}</b></p>
            {vote === null ? (
              <form onSubmit={(e) => { e.preventDefault(); setVote(choix); }}>
                {portail.sondage.options.map((o, i) => (
                  <label key={o}>
                    <input type="radio" name={`${ids}-sondage`} checked={choix === i} onChange={() => setChoix(i)} /> {o}
                  </label>
                ))}
                <button className="pk-btn small" data-testid="portail-voter">{str("portail.voter")}</button>
              </form>
            ) : (
              <div className="resultats" data-testid="portail-resultats">
                {portail.sondage.options.map((o, i) => (
                  <div key={o}>
                    <span>{o}</span>
                    <i style={{ width: `${Math.min(100, portail.sondage.resultats[i]!)}%` }} />
                    <em>{portail.sondage.resultats[i]} %</em>
                  </div>
                ))}
                <small>{portail.sondage.merci}</small>
              </div>
            )}
          </section>
          <section className="cadre bourse">
            <h3>{str("portail.bourse")}</h3>
            <table>
              <tbody>
                {/* Cours de séance : les mêmes que ceux du guichet de la Caisse, où l'on achète et vend. */}
                {coursSeance(portail.bourse, maintenant.getTime()).map((x) => (
                  <tr key={x.nom}>
                    <td>{x.nom}</td>
                    <td className="n">{x.valeur.toLocaleString("fr-FR")} {x.unite}</td>
                    <td className={`n ${x.variation >= 0 ? "hausse" : "baisse"}`}>{x.variation >= 0 ? "▲" : "▼"} {Math.abs(x.variation).toLocaleString("fr-FR")} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="cadre meteo">
            <h3>{str("portail.meteo")}</h3>
            <ul>
              {meteo(portail.meteo, maintenant).map((m) => (
                <li key={m.ville}>
                  <b>{m.ville}</b> · {m.ciel}, mousse {m.mousse}
                </li>
              ))}
            </ul>
          </section>

        </aside>
      </div>

      <section className="cadre annonces">
        <h3>{str("portail.annonces")}</h3>
        <ul>
          {portail.annonces.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>

      <footer className="portail-pied">
        <p className="construction">
          <span>{portail.construction}</span>
        </p>
        <p className="badges">
          {portail.badges.map((b) => (
            <span key={b}>{b}</span>
          ))}
        </p>
        <p className="compteur" data-testid="portail-compteur">
          {str("portail.compteur.avant")}{" "}
          <span className="chiffres">
            {String(compteur(portail.compteur, maintenant))
              .padStart(9, "0")
              .split("")
              .map((c, i) => (
                <i key={i}>{c}</i>
              ))}
          </span>
          {str("portail.compteur.apres")}
        </p>
        <p>
          {str("portail.maj")} · <button className="lien" onClick={() => go("porko://porkopedia")}>{str("nav.index")}</button> · {CATALOG.length} notices recensées · Source : {porkopedia.source}
        </p>
        <p>{portail.pied}</p>
        <p className="portail-diagnostic"><span>{str('vie.secretIndice')}</span> <button className="lien" aria-label={str('vie.secretBouton')} title={str('vie.secretBouton')} onClick={()=>go('porko://modem-libre')}>[ : : ]</button></p>
      </footer>
    </div>
  );
}

function Bannieres({ cote, go }: { cote:"gauche"|"droite"; go(u:string):void }) {
  const { pack, str }=useOs();
  return <div className="portail-bannieres" aria-label={str('portail.partenaires')}>
    {pack.portal.bannieres.filter(b=>b.cote===cote).map(b=><button key={b.id} className={`portail-banniere pub-${b.id}`} aria-label={`${b.titre} — ${b.cta}`} onClick={()=>go(b.url)} data-testid={`pub-${b.id}`}>
      <img src={b.image} alt="" width={120} height={240}/><span>{b.cta} ▸</span>
    </button>)}
  </div>;
}

function Index({ go, section }: { go(u: string): void; section?: string }) {
  const { str } = useOs();
  const racine = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!section) return;
    const h = [...(racine.current?.querySelectorAll("h2") ?? [])].find((x) => x.textContent === section);
    // Défilement de la page seule (jamais de l'écran autour).
    const page = h?.closest(".page-web");
    if (h && page) page.scrollTop += h.getBoundingClientRect().top - page.getBoundingClientRect().top - 6;
  }, [section]);
  const sections = useMemo(() => {
    const m = new Map<string, typeof CATALOG>();
    for (const c of CATALOG) m.set(c.section || "Divers", [...(m.get(c.section || "Divers") ?? []), c]);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "fr"));
  }, []);
  return (
    <div className="notice index" ref={racine}>
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
