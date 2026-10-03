"use client";
/**
 * Assistant d'installation : bienvenue, licence à accepter, dossier, composants, options, récapitulatif, copie des
 * fichiers, fin. Le programme est réellement installé sur le disque (dossier, raccourcis), et se désinstalle de même.
 */
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { useOs, useWin } from "@/os/context";
import { childPath } from "@/os/fs";
import { choixParDefaut, desinstaller, dossierInstalle, espaceRequis, estInstalle, ETAPES, installer, normaliserDossier, type Choix, type Etape } from "./logic";

type Vue = Etape | "deja" | "desinstaller" | "suppression" | "supprime" | "quitter";

export function Installeur() {
  const { pack, str, fs, openApp, signal } = useOs();
  const { win, close, setTitle } = useWin();
  const inst = pack.installeurs.find((i) => i.id === win.args.id);
  const desinstallation = win.args.mode === "desinstaller";
  const [vue, setVue] = useState<Vue>(() => (desinstallation ? "desinstaller" : "accueil"));
  const [avantQuitter, setAvantQuitter] = useState<Vue>("accueil");
  const [accepte, setAccepte] = useState(false);
  const [choix, setChoix] = useState<Choix | null>(() => (inst ? choixParDefaut(inst) : null));
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(0);
  const [lancer, setLancer] = useState(true);
  const [lisezmoi, setLisezmoi] = useState(false);
  const [reinstaller, setReinstaller] = useState(false);

  useEffect(() => {
    if (!inst) return;
    setTitle(str(desinstallation ? "inst.titreDes" : "inst.titre", { nom: inst.nom, version: inst.version }));
    if (!desinstallation && estInstalle(fs.disque, inst.programme)) setVue("deja");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Copie des fichiers : un fichier toutes les 400 ms, puis installation réelle.
  useEffect(() => {
    if (vue !== "copie" || !inst || !choix) return;
    if (copie < inst.copie.length) {
      const t = setTimeout(() => setCopie((c) => c + 1), 380);
      return () => clearTimeout(t);
    }
    const r = fs.appliquer((d) => {
      const base = reinstaller ? desinstaller(d, inst) : ({ ok: true, disque: d, chemins: [] } as const);
      return base.ok ? installer(base.disque, inst, choix) : base;
    });
    if (!r) {
      setVue("dossier");
      setCopie(0);
      return;
    }
    signal(`installeur:installe:${inst.id}`);
    setVue("fin");
  }, [vue, copie]); // eslint-disable-line react-hooks/exhaustive-deps

  // Suppression.
  useEffect(() => {
    if (vue !== "suppression" || !inst) return;
    const t = setTimeout(() => {
      fs.appliquer((d) => desinstaller(d, inst));
      signal(`installeur:desinstalle:${inst.id}`);
      setVue("supprime");
    }, 1600);
    return () => clearTimeout(t);
  }, [vue]); // eslint-disable-line react-hooks/exhaustive-deps

  const requis = useMemo(() => (inst && choix ? espaceRequis(inst, choix.composants) : 0), [inst, choix]);

  if (!inst || !choix)
    return (
      <div className="inst">
        <p>{str("inst.introuvable")}</p>
        <button className="pk-btn" onClick={close}>
          {str("inst.fermer")}
        </button>
      </div>
    );

  const i = ETAPES.indexOf(vue as Etape);
  const suivant = () => {
    setErreur(null);
    if (vue === "dossier") {
      const d = normaliserDossier(choix.dossier);
      const essai = installer(fs.disque, inst, { ...choix, dossier: d, raccourciBureau: false });
      if (!d || !essai.ok) {
        setErreur(essai.ok ? str("inst.err.dossier") : str(essai.erreur, essai.vars));
        return;
      }
      setChoix({ ...choix, dossier: d });
    }
    setVue(ETAPES[i + 1]!);
  };
  const precedent = () => {
    setErreur(null);
    setVue(ETAPES[i - 1]!);
  };
  const quitter = () => {
    setAvantQuitter(vue);
    setVue("quitter");
  };
  const terminer = () => {
    close();
    if (lancer) openApp(inst.programme);
    if (lisezmoi) {
      const d = dossierInstalle(fs.disque, inst);
      if (d) fs.ouvrir(childPath(d, "LISEZMOI.TXT"));
    }
  };

  const bandeau = (
    <div className="inst-bandeau">
      <Icon name="installeur" />
      <b>{inst.nom}</b>
      <span>{str("inst.version", { version: inst.version })}</span>
    </div>
  );

  const pied = (opts: { precedent?: boolean; suivant?: string | false; suivantOff?: boolean; annuler?: boolean; onSuivant?: () => void }) => (
    <div className="inst-pied">
      <span className="inst-marque">{str("inst.marque")}</span>
      {opts.precedent !== false && (
        <button className="pk-btn" onClick={precedent} disabled={i <= 0}>
          {str("inst.precedent")}
        </button>
      )}
      {opts.suivant !== false && (
        <button className="pk-btn" onClick={opts.onSuivant ?? suivant} disabled={opts.suivantOff} data-testid="inst-suivant" autoFocus>
          {opts.suivant ?? str("inst.suivant")}
        </button>
      )}
      {opts.annuler !== false && (
        <button className="pk-btn" onClick={quitter}>
          {str("inst.annuler")}
        </button>
      )}
    </div>
  );

  const page = (titre: string, sous: string, corps: React.ReactNode) => (
    <div className="inst-page">
      <div className="inst-entete">
        <div>
          <b>{titre}</b>
          <span>{sous}</span>
        </div>
        <Icon name="installeur" />
      </div>
      <div className="inst-corps">{corps}</div>
    </div>
  );

  let contenu: React.ReactNode;
  switch (vue) {
    case "accueil":
      contenu = (
        <>
          <div className="inst-accueil">
            {bandeau}
            <div className="inst-texte">
              <h2>{str("inst.bienvenue", { nom: inst.nom })}</h2>
              <p>{inst.accueil}</p>
              <p className="inst-editeur">{str("inst.editeur", { editeur: inst.editeur })}</p>
            </div>
          </div>
          {pied({ precedent: false })}
        </>
      );
      break;
    case "licence":
      contenu = (
        <>
          {page(
            str("inst.licence"),
            str("inst.licenceSous"),
            <>
              <textarea className="inst-licence" readOnly value={inst.licence} />
              <label className="case-a-cocher">
                <input type="radio" name="licence" checked={accepte} onChange={() => setAccepte(true)} data-testid="inst-accepte" />
                {str("inst.accepte")}
              </label>
              <label className="case-a-cocher">
                <input type="radio" name="licence" checked={!accepte} onChange={() => setAccepte(false)} />
                {str("inst.refuse")}
              </label>
            </>,
          )}
          {pied({ suivantOff: !accepte })}
        </>
      );
      break;
    case "dossier":
      contenu = (
        <>
          {page(
            str("inst.dossier"),
            str("inst.dossierSous", { nom: inst.nom }),
            <>
              <p>{str("inst.dossierTexte")}</p>
              <input className="pk-input inst-champ" value={choix.dossier} onChange={(e) => setChoix({ ...choix, dossier: e.target.value })} aria-label={str("inst.dossier")} data-testid="inst-dossier" />
              {erreur && (
                <p className="inst-erreur" role="alert">
                  {erreur}
                </p>
              )}
              <p className="inst-espace">{str("inst.espace", { requis: requis.toLocaleString("fr-FR") })}</p>
            </>,
          )}
          {pied({})}
        </>
      );
      break;
    case "composants":
      contenu = (
        <>
          {page(
            str("inst.composants"),
            str("inst.composantsSous"),
            <>
              <ul className="inst-composants">
                {inst.composants.map((c) => (
                  <li key={c.id}>
                    <label className="case-a-cocher">
                      <input
                        type="checkbox"
                        checked={c.obligatoire || choix.composants.includes(c.id)}
                        disabled={c.obligatoire}
                        onChange={(e) => setChoix({ ...choix, composants: e.target.checked ? [...choix.composants, c.id] : choix.composants.filter((x) => x !== c.id) })}
                      />
                      {c.label}
                    </label>
                    <span>{c.taille.toLocaleString("fr-FR")} Ko</span>
                    <small>{c.description}</small>
                  </li>
                ))}
              </ul>
              <p className="inst-espace">{str("inst.espace", { requis: requis.toLocaleString("fr-FR") })}</p>
            </>,
          )}
          {pied({})}
        </>
      );
      break;
    case "options":
      contenu = (
        <>
          {page(
            str("inst.options"),
            str("inst.optionsSous"),
            <>
              <label className="case-a-cocher">
                <input type="checkbox" checked={choix.raccourciBureau} onChange={(e) => setChoix({ ...choix, raccourciBureau: e.target.checked })} data-testid="inst-raccourci" />
                {str("inst.raccourciBureau")}
              </label>
              {inst.options.map((o) => (
                <div key={o.id} className="inst-option">
                  <label className="case-a-cocher">
                    <input type="checkbox" checked={!!o.imposee || choix.options.includes(o.id)} disabled={!!o.imposee} onChange={(e) => setChoix({ ...choix, options: e.target.checked ? [...choix.options, o.id] : choix.options.filter((x) => x !== o.id) })} />
                    {o.label}
                  </label>
                  {o.imposee && <small>{o.imposee}</small>}
                </div>
              ))}
            </>,
          )}
          {pied({})}
        </>
      );
      break;
    case "pret":
      contenu = (
        <>
          {page(
            str("inst.pret"),
            str("inst.pretSous"),
            <pre className="inst-recap">
              {str("inst.recap", {
                dossier: choix.dossier,
                composants: inst.composants
                  .filter((c) => c.obligatoire || choix.composants.includes(c.id))
                  .map((c) => `  ${c.label}`)
                  .join("\n"),
                options: [choix.raccourciBureau ? str("inst.raccourciBureau") : null, ...inst.options.filter((o) => o.imposee || choix.options.includes(o.id)).map((o) => o.label)]
                  .filter(Boolean)
                  .map((x) => `  ${x}`)
                  .join("\n"),
                requis: requis.toLocaleString("fr-FR"),
              })}
            </pre>,
          )}
          {pied({ suivant: str("inst.installer") })}
        </>
      );
      break;
    case "copie":
      contenu = (
        <>
          {page(
            str("inst.copie"),
            str("inst.copieSous", { nom: inst.nom }),
            <>
              <p className="inst-fichier">{str("inst.copieFichier", { fichier: inst.copie[Math.min(copie, inst.copie.length - 1)]!, dossier: choix.dossier })}</p>
              <div className="dl-barre">
                <i style={{ width: `${(copie / inst.copie.length) * 100}%` }} />
              </div>
            </>,
          )}
          {pied({ precedent: false, suivant: false })}
        </>
      );
      break;
    case "fin":
      contenu = (
        <>
          <div className="inst-accueil">
            {bandeau}
            <div className="inst-texte" data-testid="inst-fin">
              <h2>{str("inst.finTitre")}</h2>
              <p>{inst.fin}</p>
              <label className="case-a-cocher">
                <input type="checkbox" checked={lancer} onChange={(e) => setLancer(e.target.checked)} data-testid="inst-lancer" />
                {str("inst.lancer", { nom: inst.nom })}
              </label>
              <label className="case-a-cocher">
                <input type="checkbox" checked={lisezmoi} onChange={(e) => setLisezmoi(e.target.checked)} />
                {str("inst.lisezmoi")}
              </label>
            </div>
          </div>
          {pied({ precedent: false, annuler: false, suivant: str("inst.terminer"), onSuivant: terminer })}
        </>
      );
      break;
    case "deja":
      contenu = (
        <>
          <div className="inst-accueil">
            {bandeau}
            <div className="inst-texte">
              <h2>{str("inst.dejaTitre", { nom: inst.nom })}</h2>
              <p>{str("inst.deja", { nom: inst.nom })}</p>
            </div>
          </div>
          <div className="inst-pied">
            <span className="inst-marque">{str("inst.marque")}</span>
            <button
              className="pk-btn"
              onClick={() => {
                setReinstaller(true);
                setVue("accueil");
              }}
            >
              {str("inst.reinstaller")}
            </button>
            <button className="pk-btn" onClick={() => setVue("desinstaller")}>
              {str("inst.supprimer")}
            </button>
            <button className="pk-btn" onClick={close}>
              {str("inst.annuler")}
            </button>
          </div>
        </>
      );
      break;
    case "desinstaller":
      contenu = (
        <>
          <div className="inst-accueil">
            {bandeau}
            <div className="inst-texte">
              <h2>{str("inst.desTitre", { nom: inst.nom })}</h2>
              <p>{inst.desinstallation.question}</p>
            </div>
          </div>
          <div className="inst-pied">
            <span className="inst-marque">{str("inst.marque")}</span>
            <button className="pk-btn" onClick={() => setVue("suppression")} data-testid="inst-des-oui">
              {str("inst.oui")}
            </button>
            <button className="pk-btn" onClick={close} autoFocus>
              {str("inst.non")}
            </button>
          </div>
        </>
      );
      break;
    case "suppression":
      contenu = (
        <>
          {page(
            str("inst.suppression"),
            str("inst.suppressionSous", { nom: inst.nom }),
            <div className="dl-barre defile">
              <i />
            </div>,
          )}
          <div className="inst-pied" />
        </>
      );
      break;
    case "supprime":
      contenu = (
        <>
          <div className="inst-accueil">
            {bandeau}
            <div className="inst-texte" data-testid="inst-supprime">
              <h2>{str("inst.supprimeTitre")}</h2>
              <p>{inst.desinstallation.fin}</p>
            </div>
          </div>
          <div className="inst-pied">
            <span className="inst-marque">{str("inst.marque")}</span>
            <button className="pk-btn" onClick={close} autoFocus>
              {str("inst.ok")}
            </button>
          </div>
        </>
      );
      break;
    case "quitter":
      contenu = (
        <>
          <div className="inst-accueil">
            {bandeau}
            <div className="inst-texte">
              <h2>{str("inst.quitterTitre")}</h2>
              <p>{str("inst.quitter", { nom: inst.nom })}</p>
            </div>
          </div>
          <div className="inst-pied">
            <span className="inst-marque">{str("inst.marque")}</span>
            <button className="pk-btn" onClick={close}>
              {str("inst.oui")}
            </button>
            <button className="pk-btn" onClick={() => setVue(avantQuitter)} autoFocus>
              {str("inst.non")}
            </button>
          </div>
        </>
      );
      break;
  }

  return (
    <div className="inst" data-testid="installeur">
      {contenu}
    </div>
  );
}
