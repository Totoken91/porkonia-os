"use client";
/**
 * Téléchargement de fichier, comme sur un vrai poste : Ouvrir ou Enregistrer, choix du dossier, progression au débit
 * de la ligne nationale, puis le fichier est réellement déposé sur le disque.
 */
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { ListeDeroulante } from "@/components/ListeDeroulante";
import { useOs, useWin } from "@/os/context";
import { BUREAU, creer, dossiersEcrivables } from "@/os/vfs";
import { formatDuree, formatTaille, recu } from "./logic";

type Phase = "question" | "enregistrer" | "progression" | "fini";

export function Telechargement() {
  const { pack, str, fs, openApp, playSound, signal } = useOs();
  const { win, close, setTitle } = useWin();
  const fichier = pack.telechargements.find((t) => t.id === win.args.id);
  const [phase, setPhase] = useState<Phase>("question");
  const [dossier, setDossier] = useState(BUREAU);
  const [nom, setNom] = useState(fichier?.nom ?? "");
  const [ouvrirApres, setOuvrirApres] = useState(false);
  const [fermerALaFin, setFermerALaFin] = useState(false);
  const [ms, setMs] = useState(0);
  const [chemin, setChemin] = useState<string | null>(null);
  const debut = useRef(0);

  const ko = fichier ? recu(fichier.taille, fichier.debit, ms) : 0;
  const fini = fichier ? ko >= fichier.taille : false;

  useEffect(() => {
    if (phase !== "progression") return;
    debut.current = performance.now();
    const id = setInterval(() => setMs(performance.now() - debut.current), 200);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "progression" || !fichier) return;
    setTitle(str("dl.titrePourcent", { p: Math.floor((ko / fichier.taille) * 100), nom: nom }));
  }, [ko, phase, fichier, nom, setTitle, str]);

  // Fin du téléchargement : le fichier arrive sur le disque.
  useEffect(() => {
    if (phase !== "progression" || !fini || !fichier) return;
    const r = fs.appliquer((d) => creer(d, dossier, { type: "lien", name: nom.trim() || fichier.nom, app: "installeur", args: { id: fichier.installeur } }));
    if (!r) {
      close();
      return;
    }
    const c = r[0]!;
    setChemin(c);
    playSound("ding");
    signal(`telechargement:${fichier.id}`);
    setTitle(str("dl.titreFini"));
    if (ouvrirApres) {
      fs.ouvrir(c);
      close();
      return;
    }
    if (fermerALaFin) {
      close();
      return;
    }
    setPhase("fini");
  }, [fini, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!fichier)
    return (
      <div className="dl">
        <p>{str("dl.introuvable")}</p>
        <div className="dl-boutons">
          <button className="pk-btn" onClick={close}>
            {str("dl.fermer")}
          </button>
        </div>
      </div>
    );

  const restant = fichier.taille - ko;
  const vitesse = ms > 500 ? ko / (ms / 1000) : fichier.debit;

  return (
    <div className="dl" data-testid="telechargement">
      <div className="dl-tete">
        <Icon name="telechargement" />
        <div>
          {phase === "question" && <p>{str("dl.question")}</p>}
          {phase === "enregistrer" && <p>{str("dl.ouEnregistrer")}</p>}
          {phase === "progression" && <p>{str("dl.enCours", { nom, origine: "porko://grenier-partagiciels" })}</p>}
          {phase === "fini" && <p>{str("dl.fini")}</p>}
        </div>
      </div>

      {phase === "question" && (
        <>
          <dl className="dl-infos">
            <dt>{str("dl.nom")}</dt>
            <dd>{fichier.nom}</dd>
            <dt>{str("dl.type")}</dt>
            <dd>
              {str("dl.typeApp")}, {formatTaille(fichier.taille)}
            </dd>
            <dt>{str("dl.de")}</dt>
            <dd>porko://grenier-partagiciels</dd>
          </dl>
          <p className="dl-avertissement">{str("dl.avertissement")}</p>
          <div className="dl-boutons">
            <button
              className="pk-btn"
              onClick={() => {
                setOuvrirApres(true);
                setPhase("progression");
              }}
              data-testid="dl-ouvrir"
            >
              {str("dl.ouvrir")}
            </button>
            <button className="pk-btn" onClick={() => setPhase("enregistrer")} data-testid="dl-enregistrer" autoFocus>
              {str("dl.enregistrer")}
            </button>
            <button className="pk-btn" onClick={close}>
              {str("dl.annuler")}
            </button>
          </div>
        </>
      )}

      {phase === "enregistrer" && (
        <>
          <div className="dl-champ">
            <label>{str("dl.dans")}</label>
            <ListeDeroulante value={dossier} options={dossiersEcrivables(fs.disque).map((d) => ({ value: d, label: d || fs.disque.racine.name }))} onChange={setDossier} aria-label={str("dl.dans")} testId="dl-dossier" />
          </div>
          <div className="dl-champ">
            <label htmlFor="dl-nom">{str("dl.nomFichier")}</label>
            <input id="dl-nom" className="pk-input" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <p className="dl-avertissement">{str("dl.telechargementsVerrouille")}</p>
          <div className="dl-boutons">
            <button className="pk-btn" onClick={() => setPhase("progression")} disabled={!nom.trim()} data-testid="dl-enregistrer-ici">
              {str("dl.enregistrer")}
            </button>
            <button className="pk-btn" onClick={close}>
              {str("dl.annuler")}
            </button>
          </div>
        </>
      )}

      {phase === "progression" && (
        <>
          <div className="dl-barre" role="progressbar" aria-valuenow={Math.floor((ko / fichier.taille) * 100)}>
            <i style={{ width: `${(ko / fichier.taille) * 100}%` }} />
          </div>
          <dl className="dl-infos">
            <dt>{str("dl.restant")}</dt>
            <dd>{str("dl.restantVal", { duree: formatDuree(restant / Math.max(1, vitesse)), recu: formatTaille(ko), total: formatTaille(fichier.taille) })}</dd>
            <dt>{str("dl.vers")}</dt>
            <dd>{dossier || fs.disque.racine.name}</dd>
            <dt>{str("dl.debit")}</dt>
            <dd>{str("dl.debitVal", { v: vitesse.toFixed(1).replace(".", ",") })}</dd>
          </dl>
          <label className="case-a-cocher">
            <input type="checkbox" checked={fermerALaFin} onChange={(e) => setFermerALaFin(e.target.checked)} />
            {str("dl.fermerFin")}
          </label>
          <div className="dl-boutons">
            <button className="pk-btn" disabled>
              {str("dl.ouvrir")}
            </button>
            <button className="pk-btn" disabled>
              {str("dl.ouvrirDossier")}
            </button>
            <button className="pk-btn" onClick={close}>
              {str("dl.annuler")}
            </button>
          </div>
        </>
      )}

      {phase === "fini" && (
        <>
          <div className="dl-barre plein">
            <i style={{ width: "100%" }} />
          </div>
          <dl className="dl-infos">
            <dt>{str("dl.telecharge")}</dt>
            <dd>{str("dl.telechargeVal", { taille: formatTaille(fichier.taille), duree: formatDuree(ms / 1000) })}</dd>
            <dt>{str("dl.vers")}</dt>
            <dd>{chemin}</dd>
          </dl>
          <div className="dl-boutons">
            <button
              className="pk-btn"
              onClick={() => {
                if (chemin) fs.ouvrir(chemin);
                close();
              }}
              data-testid="dl-ouvrir-fichier"
              autoFocus
            >
              {str("dl.ouvrir")}
            </button>
            <button
              className="pk-btn"
              onClick={() => {
                openApp("fichiers", { path: dossier });
                close();
              }}
            >
              {str("dl.ouvrirDossier")}
            </button>
            <button className="pk-btn" onClick={close}>
              {str("dl.fermer")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
