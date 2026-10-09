"use client";
/** Porkomazon : bière et saucisson, payés en Pork$ fictifs et livrés après un délai réel.
 * Les provisions livrées se consomment devant l'écran. */
import { useEffect, useId, useState } from "react";
import { useOs } from "@/os/context";
import { useCompte, operer } from "@/os/banqueStore";
import { debiter, formaterPork } from "@/os/banque";
import { secondesRestantes } from "@/os/biere";
import { commanderBieres, useCave } from "@/os/biereStore";
import { commanderSaucissons, useGardeManger } from "@/os/saucissonStore";
import { prixIndexe } from "@/os/economie";
import { cours } from "./portail";
import { siteUrl } from "./url";

export function Porkomazon({ go }: { go?(u: string): void }) {
  const { pack, user, str, signal, playSound } = useOs();
  const p = pack.porkomazon;
  const ids=useId();
  const compte = useCompte(user.id);
  const cave = useCave();
  const gardeManger=useGardeManger();
  const [produit, setProduit] = useState(p.produits[0]!.id);
  const [mode, setMode] = useState(p.livraisons[0]!.id);
  const [message, setMessage] = useState("");
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const article = p.produits.find((x) => x.id === produit)!;
  const livraison = p.livraisons.find((x) => x.id === mode)!;
  const stock=article.type==="saucisson"?gardeManger:cave;
  const colis=[...cave.enRoute.map(k=>({...k,type:"biere" as const})),...gardeManger.enRoute.map(k=>({...k,type:"saucisson" as const}))];
  // Prix du jour : un article indexé suit le cours de son titre à la Bourse du jambon (cours du jour, pas de séance).
  const coursDuJour = cours(pack.portal.bourse, new Date(maintenant));
  const prix = (x: (typeof p.produits)[number]) => {
    const t = x.indexe ? coursDuJour.find((c) => c.nom === x.indexe) : undefined;
    const ref = x.indexe ? pack.portal.bourse.find((b) => b.nom === x.indexe) : undefined;
    return t && ref ? prixIndexe(x.prix, t.valeur, ref.base) : x.prix;
  };
  const indexes = [...new Set(p.produits.flatMap((x) => (x.indexe ? [x.indexe] : [])))];
  const total = prix(article) + livraison.supplement;

  const commander = () => {
    if (!compte) return setMessage(str("porkomazon.err.compte"));
    if (stock.enRoute.length >= 20) return setMessage(str("porkomazon.err.plein"));
    const r = operer(user.id, (c) => debiter(c, total, `Porkomazon : ${article.nom} (${livraison.nom})`, new Date()));
    if (!r) return setMessage(str("porkomazon.err.compte"));
    if (!r.ok) return setMessage(str("porkomazon.err.solde"));
    const expedier=article.type==="saucisson"?commanderSaucissons:commanderBieres;
    expedier(article.qte, livraison.id, livraison.delaiS * 1000);
    playSound("ding");
    signal("porkomazon:commande");
    setMessage(str("porkomazon.commande", { id: stock.prochainId, delai: livraison.delaiS }));
  };

  return (
    <div className="pkz" data-testid="porkomazon">
      <header className="pkz-tete">
        <div className="pkz-enseigne"><img src="/brand/porkomazon-logo.webp" alt="" width={48} height={48}/><div><h1>{p.nom}</h1><b>{str('porkomazon.catalogueWeb')}</b></div></div>
        <p>{p.slogan}</p>
        <span className="pkz-compte">
          {compte ? `${str("banque.compteN", { numero: compte.numero })} · ${formaterPork(compte.solde)}` : str("porkomazon.sansCompte")}
        </span>
      </header>
      <nav className="pkz-navigation" aria-label={str('porkomazon.rubriques')}>
        <a href={`#${ids}-catalogue`}>{str('porkomazon.catalogue')}</a><span>|</span>
        <a href={`#${ids}-bon`}>{str('porkomazon.bon')}</a><span>|</span>
        <a href={`#${ids}-suivi`}>{str('porkomazon.enRoute')}</a><span>|</span>
        <a href={`#${ids}-avis`}>{str('porkomazon.avis')}</a>
      </nav>
      {!compte && (
        <p className="pkz-alerte">
          <button className="pkz-lien" onClick={() => go?.(siteUrl("banque-porc"))}>
            {str("porkomazon.err.compte")}
          </button>
        </p>
      )}
      <div className="pkz-corps">
        <section className="pkz-produits" id={`${ids}-catalogue`}>
          <h2>{str('porkomazon.catalogue')}</h2>
          <table className="pkz-table">
            <caption>{str('porkomazon.selection')}</caption>
            <thead><tr><th scope="col" className="pkz-col-choix"><span className="pkz-sr">{str('porkomazon.choix')}</span></th><th scope="col" className="pkz-col-image"><span className="pkz-sr">{str('porkomazon.apercu')}</span></th><th scope="col">{str('porkomazon.article')}</th><th scope="col" className="pkz-col-prix">{str('porkomazon.prix')}</th></tr></thead>
            <tbody>{p.produits.map(x=><tr key={x.id} className={`pkz-produit${produit===x.id?' choisi':''}`}>
              <td><input id={`${ids}-${x.id}`} type="radio" name={`${ids}-produit`} checked={produit===x.id} onChange={()=>setProduit(x.id)} aria-label={x.nom} data-testid={`pkz-produit-${x.id}`}/></td>
              <td className="pkz-col-image"><label htmlFor={`${ids}-${x.id}`}><img src={x.type==='saucisson'?'/brand/saucisson-planche.webp':'/brand/biere-douzi.png'} alt="" width={40} height={44}/></label></td>
              <td><label htmlFor={`${ids}-${x.id}`}><b>{x.nom}</b><em>{x.description}</em></label></td>
              <td className="pkz-col-prix"><label htmlFor={`${ids}-${x.id}`}><strong>{formaterPork(prix(x))}</strong></label></td>
            </tr>)}</tbody>
          </table>
          {indexes.map((t) => <p key={t} className="pkz-indexe">{str("porkomazon.prixIndexe", { titre: t })}</p>)}
        </section>
        <section className="pkz-livraison" id={`${ids}-bon`}>
          <h2>{str("porkomazon.bon")}</h2>
          <p className="pkz-article-choisi">{article.nom}</p>
          <h3>{str("porkomazon.livraison")}</h3>
          {p.livraisons.map((x) => (
            <label key={x.id} className={`pkz-mode${mode === x.id ? " choisi" : ""}`}>
              <input type="radio" name={`${ids}-livraison`} checked={mode === x.id} onChange={() => setMode(x.id)} data-testid={`pkz-livraison-${x.id}`} />
              <span>
                <b>{x.nom}</b> — {x.delaiS} s{x.supplement ? ` (+${formaterPork(x.supplement)})` : ""}
                <em>{x.description}</em>
              </span>
            </label>
          ))}
          <p className="pkz-total">{str("porkomazon.total", { somme: formaterPork(total) })}</p>
          <button className="pkz-commander" onClick={commander} data-testid="pkz-commander">
            {str("porkomazon.panier")}
          </button>
          {message && (
            <p className="pkz-message" data-testid="pkz-message">
              {message}
            </p>
          )}
        </section>
      </div>
      <section className="pkz-suivi" id={`${ids}-suivi`}>
        <h3>{str("porkomazon.enRoute")}</h3>
        {colis.length ? (
          <ul data-testid="pkz-colis">
            {colis.map((k) => (
              <li key={`${k.type}-${k.id}`}>
                <b>n° {k.id}</b> — {k.qte} × {str(k.type==="saucisson"?"porkomazon.saucisson":"porkomazon.bouteille")} — {p.livraisons.find((l) => l.id === k.mode)?.nom ?? k.mode} — {str("porkomazon.arrive", { s: secondesRestantes(k, maintenant) })}
              </li>
            ))}
          </ul>
        ) : (
          <p>{str("porkomazon.aucun")}</p>
        )}
        <p data-testid="pkz-garde-manger">{str("porkomazon.gardeManger", { n: gardeManger.stock })}</p>
        <p data-testid="pkz-cave">{str("porkomazon.cave", { n: cave.stock })}</p>
      </section>
      <section className="pkz-avis" id={`${ids}-avis`}>
        <h3>{str("porkomazon.avis")}</h3>
        {p.avis.map((a) => (
          <blockquote key={a.nom}>
            <span className="pkz-etoiles">{"*".repeat(a.note)}</span> {a.texte}
            <cite>{a.nom}</cite>
          </blockquote>
        ))}
      </section>
      <footer className="pkz-pied"><b>{str("porkomazon.optimise")}</b><p>{str("porkomazon.mentions")}</p></footer>
    </div>
  );
}
