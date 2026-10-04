"use client";
/**
 * Caisse Nationale d'Épargne du Porc, en ligne : ouverture du compte, connexion par code à quatre chiffres, solde,
 * historique, allocation quotidienne et courtage en Bourse du jambon. L'argent (le Pork$) est fictif et ne quitte
 * jamais ce navigateur ; la logique est dans `os/banque.ts`.
 */
import { useEffect, useState } from "react";
import { useOs } from "@/os/context";
import { useCompte, enregistrer, operer } from "@/os/banqueStore";
import { acheter, allocationDisponible, ALLOCATION_JOUR, coutAchat, formaterPork, ouvrir, produitVente, toucherAllocation, valoriser, vendre, verifier, PRIME_BIENVENUE } from "@/os/banque";
import { coursSeance, PAS_SEANCE } from "./portail";

export function Banque() {
  const { pack, user, str, signal, playSound } = useOs();
  const compte = useCompte(user.id);
  const [numero, setNumero] = useState(user.porkId?.numero ?? "");
  const [code, setCode] = useState("");
  const [connecte, setConnecte] = useState(false);
  const [message, setMessage] = useState("");
  const [onglet, setOnglet] = useState<"compte" | "bourse">("compte");
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const [qtes, setQtes] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), PAS_SEANCE / 4);
    return () => clearInterval(t);
  }, []);

  const erreur = (e: string) => setMessage(str(`banque.err.${e}`));

  if (!compte) {
    const ouvrirCompte = (e: React.FormEvent) => {
      e.preventDefault();
      const c = ouvrir(numero, user.displayName, code, new Date());
      if (!c) return setMessage(str("banque.err.code"));
      enregistrer(user.id, c);
      setConnecte(true);
      setCode("");
      setMessage(str("banque.ouvert", { prime: formaterPork(PRIME_BIENVENUE) }));
      signal("banque:ouverte");
    };
    return (
      <div className="banque" data-testid="banque">
        <h2>{str("banque.ouvrirTitre")}</h2>
        <p>{str("banque.ouvrirTexte", { prime: formaterPork(PRIME_BIENVENUE) })}</p>
        <form className="banque-form" onSubmit={ouvrirCompte}>
          <label>
            {str("banque.numero")}
            <input value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={30} data-testid="banque-numero" />
          </label>
          <label>
            {str("banque.codeNouveau")}
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" type="password" autoComplete="off" data-testid="banque-code" />
          </label>
          <button type="submit" data-testid="banque-ouvrir">
            {str("banque.ouvrir")}
          </button>
        </form>
        {message && <p className="banque-message">{message}</p>}
        <small>{str("banque.mentions")}</small>
      </div>
    );
  }

  if (!connecte) {
    const connecter = (e: React.FormEvent) => {
      e.preventDefault();
      if (!verifier(compte, code)) return erreur("mauvaisCode");
      setConnecte(true);
      setCode("");
      setMessage("");
    };
    return (
      <div className="banque" data-testid="banque">
        <h2>{str("banque.connexion")}</h2>
        <form className="banque-form" onSubmit={connecter}>
          <p>
            {str("banque.compteN", { numero: compte.numero })} — {compte.titulaire}
          </p>
          <label>
            {str("banque.code")}
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" type="password" autoComplete="off" data-testid="banque-code" />
          </label>
          <button type="submit" data-testid="banque-connexion">
            {str("banque.seConnecter")}
          </button>
        </form>
        {message && <p className="banque-message">{message}</p>}
        <small>{str("banque.mentions")}</small>
      </div>
    );
  }

  const titres = coursSeance(pack.portal.bourse, maintenant);
  const prix = Object.fromEntries(titres.map((t) => [t.nom, t.valeur]));
  const val = valoriser(compte, prix);
  const toucher = () => {
    const r = operer(user.id, (c) => toucherAllocation(c, new Date()));
    setMessage(r?.ok ? str("banque.allocationOk", { somme: formaterPork(ALLOCATION_JOUR) }) : str("banque.err.allocation"));
    if (r?.ok) playSound("ding");
  };
  const ordre = (nom: string, sens: "achat" | "vente") => {
    const qte = Math.floor(Number(qtes[nom] || "1"));
    const p = prix[nom]!;
    const r = operer(user.id, (c) => (sens === "achat" ? acheter(c, nom, qte, p, new Date()) : vendre(c, nom, qte, p, new Date())));
    if (!r) return;
    if (!r.ok) return erreur(r.erreur);
    setMessage(str(sens === "achat" ? "banque.achatOk" : "banque.venteOk", { qte, nom }));
    signal(sens === "achat" ? "banque:achat" : "banque:vente");
  };

  return (
    <div className="banque" data-testid="banque">
      <div className="banque-entete">
        <b>{str("banque.compteN", { numero: compte.numero })}</b>
        <span data-testid="banque-solde">{formaterPork(compte.solde)}</span>
        <button onClick={() => setConnecte(false)} data-testid="banque-deconnexion">
          {str("banque.deconnexion")}
        </button>
      </div>
      <div className="banque-onglets" role="tablist">
        <button role="tab" aria-selected={onglet === "compte"} onClick={() => setOnglet("compte")} data-testid="banque-onglet-compte">
          {str("banque.ongletCompte")}
        </button>
        <button role="tab" aria-selected={onglet === "bourse"} onClick={() => setOnglet("bourse")} data-testid="banque-onglet-bourse">
          {str("banque.ongletBourse")}
        </button>
      </div>
      {message && (
        <p className="banque-message" data-testid="banque-message">
          {message}
        </p>
      )}
      {onglet === "compte" ? (
        <>
          <p>
            <button onClick={toucher} disabled={!allocationDisponible(compte, new Date())} data-testid="banque-allocation">
              {str("banque.allocation", { somme: formaterPork(ALLOCATION_JOUR) })}
            </button>
          </p>
          <table className="banque-table">
            <tbody>
              {compte.historique.slice(0, 12).map((o) => (
                <tr key={o.id}>
                  <td>{new Date(o.date).toLocaleDateString("fr-FR")}</td>
                  <td>{o.libelle}</td>
                  <td className={o.montant < 0 ? "debit" : "credit"}>{o.montant > 0 ? "+" : ""}{formaterPork(o.montant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <>
          <p className="banque-portefeuille">
            {str("banque.portefeuille", { valeur: formaterPork(val.valeur), plus: `${val.plusValue >= 0 ? "+" : ""}${formaterPork(val.plusValue)}` })}
          </p>
          <table className="banque-table" data-testid="banque-cours">
            <thead>
              <tr>
                <th>{str("banque.titre")}</th>
                <th>{str("banque.cours")}</th>
                <th>{str("banque.detenus")}</th>
                <th>{str("banque.ordre")}</th>
              </tr>
            </thead>
            <tbody>
              {titres.map((t, i) => {
                const pos = compte.portefeuille[t.nom];
                const q = Math.max(1, Math.floor(Number(qtes[t.nom] || "1")));
                return (
                  <tr key={t.nom}>
                    <td>{t.nom}</td>
                    <td>
                      {t.valeur.toLocaleString("fr-FR")} <small className={t.variation < 0 ? "debit" : "credit"}>{t.variation > 0 ? "+" : ""}{t.variation}%</small>
                    </td>
                    <td>{pos?.qte ?? 0}</td>
                    <td className="banque-ordre">
                      <input value={qtes[t.nom] ?? "1"} onChange={(e) => setQtes({ ...qtes, [t.nom]: e.target.value.replace(/\D/g, "").slice(0, 5) })} inputMode="numeric" aria-label={str("banque.quantite")} />
                      <button onClick={() => ordre(t.nom, "achat")} title={str("banque.coutAchat", { somme: formaterPork(coutAchat(t.valeur, q)) })} data-testid={`banque-achat-${i}`}>
                        {str("banque.acheter")}
                      </button>
                      <button onClick={() => ordre(t.nom, "vente")} disabled={!pos} title={str("banque.produitVente", { somme: formaterPork(produitVente(t.valeur, q)) })} data-testid={`banque-vente-${i}`}>
                        {str("banque.vendre")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <small>{str("banque.commission")}</small>
        </>
      )}
      <small>{str("banque.mentions")}</small>
    </div>
  );
}
