"use client";
/**
 * Pages perso de PigNet : un site du pack rendu façon années 2000 (titres criards, texte défilant,
 * bandeau « en construction », compteur de visites, livre d'or signable, Anneau des pages perso).
 * Le livre d'or signé reste dans ce navigateur.
 */
import { useEffect, useState } from "react";
import type { BlocSite, SitePerso } from "@/content/types";
import { useOs } from "@/os/context";
import { compteur } from "./portail";
import { anneau, siteUrl } from "./url";

type Message = { nom: string; date: string; message: string };
const cleLivre = (hote: string) => `porkos.livredor.${hote}`;

function LivreDor({ site }: { site: SitePerso }) {
  const { str, signal } = useOs();
  const [ajouts, setAjouts] = useState<Message[]>([]);
  const [nom, setNom] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    try {
      const v = JSON.parse(window.localStorage.getItem(cleLivre(site.hote)) ?? "[]");
      if (Array.isArray(v)) setAjouts(v.filter((m) => m && typeof m.nom === "string" && typeof m.message === "string" && typeof m.date === "string").slice(-50));
    } catch {
      /* livre neuf */
    }
  }, [site.hote]);
  const signer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const m = { nom: nom.trim().slice(0, 40) || str("site.anonyme"), date: new Date().toLocaleDateString("fr-FR"), message: message.trim().slice(0, 400) };
    const tout = [...ajouts, m];
    setAjouts(tout);
    setMessage("");
    try {
      window.localStorage.setItem(cleLivre(site.hote), JSON.stringify(tout));
    } catch {
      /* livre d'or non retenu */
    }
    signal(`pignet:livredor:${site.hote}`);
  };
  return (
    <div className="site-livre" data-testid="site-livre">
      {[...(site.livreDor ?? []), ...ajouts].map((m, i) => (
        <div key={i} className="site-livre-message">
          <b>{m.nom}</b> <small>{m.date}</small>
          <p>{m.message}</p>
        </div>
      ))}
      <form className="site-livre-form" onSubmit={signer}>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder={str("site.nom")} aria-label={str("site.nom")} data-testid="site-livre-nom" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={str("site.message")} aria-label={str("site.message")} rows={3} data-testid="site-livre-message" />
        <button type="submit" data-testid="site-livre-signer">
          {str("site.signer")}
        </button>
      </form>
    </div>
  );
}

/** Lien de téléchargement : ouvre la boîte « Téléchargement de fichier » du système. */
function Telecharger({ id }: { id: string }) {
  const { pack, str, openApp } = useOs();
  const f = pack.telechargements.find((t) => t.id === id);
  if (!f) return null;
  return (
    <div className="site-telecharger">
      <button className="site-telecharger-b" onClick={() => openApp("telechargement", { id })} data-testid={`telecharger-${id}`}>
        {str("site.telecharger", { nom: f.nom })}
      </button>
      <small>
        {f.description} — {str("site.telechargerTaille", { taille: (f.taille / 1024).toFixed(2).replace(".", ","), duree: Math.ceil(f.taille / f.debit) })}
      </small>
    </div>
  );
}

function Bloc({ b, site, go }: { b: BlocSite; site: SitePerso; go(u: string): void }) {
  const { pack, str } = useOs();
  switch (b.t) {
    case "titre":
      return <h1 className="site-titre">{b.texte}</h1>;
    case "texte":
      return <p className="site-texte">{b.texte}</p>;
    case "defile":
      return (
        <div className="site-defile">
          <span>{b.texte}</span>
        </div>
      );
    case "clignote":
      return <p className="site-clignote">{b.texte}</p>;
    case "liste":
      return (
        <ul className="site-liste">
          {b.items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      );
    case "image":
      return (
        <figure className="site-image">
          <img src={b.src} alt={b.legende ?? ""} referrerPolicy="no-referrer" loading="lazy" />
          {b.legende && <figcaption>{b.legende}</figcaption>}
        </figure>
      );
    case "liens":
      return (
        <p className="site-liens">
          {b.liens.map((l) => (
            <button key={l.url} className="site-lien" onClick={() => go(l.url)}>
              {l.texte}
            </button>
          ))}
        </p>
      );
    case "construction":
      return (
        <div className="site-construction" role="note">
          <span>{str("site.construction")}</span>
        </div>
      );
    case "compteur": {
      const n = Math.floor(compteur({ base: b.base, parJour: b.parJour }, new Date()));
      return (
        <p className="site-compteur">
          {str("site.visiteurs")}{" "}
          <span>
            {String(n)
              .padStart(6, "0")
              .split("")
              .map((c, i) => (
                <i key={i}>{c}</i>
              ))}
          </span>
        </p>
      );
    }
    case "livreDor":
      return <LivreDor site={site} />;
    case "anneau": {
      const membres = pack.sites.filter((x) => x.anneau).map((x) => x.hote);
      const v = anneau(membres, site.hote);
      if (!v) return null;
      return (
        <div className="site-anneau" data-testid="site-anneau">
          <button className="site-lien" onClick={() => go(siteUrl(v.precedent))}>
            ◂ {str("site.precedent")}
          </button>
          <b>{str("site.anneau")}</b>
          <button className="site-lien" onClick={() => go(siteUrl(v.suivant))}>
            {str("site.suivant")} ▸
          </button>
        </div>
      );
    }
    case "telecharger":
      return <Telecharger id={b.fichier} />;
    case "annuaire": {
      const categories = [...new Set(pack.sites.filter((x) => x.hote !== site.hote && x.categorie !== "Retirés").map((x) => x.categorie))];
      return (
        <div className="site-annuaire">
          {categories.map((c) => (
            <section key={c}>
              <h2>{c}</h2>
              {pack.sites
                .filter((x) => x.categorie === c && x.hote !== site.hote)
                .map((x) => (
                  <p key={x.hote}>
                    <button className="site-lien" onClick={() => go(siteUrl(x.hote))} data-testid={`annuaire-${x.hote}`}>
                      {x.titre}
                    </button>{" "}
                    — {x.description}
                  </p>
                ))}
            </section>
          ))}
        </div>
      );
    }
  }
}

export function Site({ site, page, go, introuvable }: { site: SitePerso; page: string; go(u: string): void; introuvable: React.ReactNode }) {
  const p = site.pages[page];
  if (!p) return <>{introuvable}</>;
  return (
    <div className={`site site-${site.theme}`} data-testid={`site-${site.hote}`}>
      {p.blocs.map((b, i) => (
        <Bloc key={i} b={b} site={site} go={go} />
      ))}
      <p className="site-pied">{site.hote === "annuaire" ? null : `porko://${site.hote}`}</p>
    </div>
  );
}
