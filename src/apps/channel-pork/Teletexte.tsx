"use client";
/**
 * Écran du télétexte (PorkTexte) : 40 colonnes, couleurs franches sur fond noir, titre en double hauteur,
 * sous-pages qui tournent toutes les douze secondes et barre de liens colorés. Une page absente fait
 * d'abord tourner le compteur de recherche, comme sur les vrais postes, avant d'avouer qu'elle n'existe pas.
 */
import { useEffect, useState } from "react";
import { useOs } from "@/os/context";
import { couper, entete, pageTeletexte, type Couleur, type Ligne } from "./teletexte";

const PAR_SOUS_PAGE = 16;
const COULEURS_FASTEXT: Couleur[] = ["r", "g", "y", "c"];

export function Teletexte({ page, saisie, maintenant, onPage }: { page: number; saisie: string; maintenant: number; onPage(n: number): void }) {
  const { pack } = useOs();
  const t = pack.teletexte;
  const d = new Date(maintenant * 1000);
  const rendue = pageTeletexte(pack, page, d);

  // Recherche d'une page : le compteur défile un moment, qu'elle existe ou non.
  const [cherche, setCherche] = useState(true);
  const [compteur, setCompteur] = useState(page);
  useEffect(() => {
    setCherche(true);
    let n = Math.floor(page / 100) * 100;
    const pas = setInterval(() => setCompteur((n = n + 7 > 899 ? 100 : n + 7)), 45);
    const fin = setTimeout(() => setCherche(false), rendue ? 350 : 1400);
    return () => {
      clearInterval(pas);
      clearTimeout(fin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const corps: Ligne[] = rendue ? rendue.lignes : couper(t.introuvable).map((texte) => ({ texte, couleur: "w" as const }));
  const sousPages = Math.max(1, Math.ceil(corps.length / PAR_SOUS_PAGE));
  const sous = Math.floor(maintenant / 12) % sousPages;
  const visibles = corps.slice(sous * PAR_SOUS_PAGE, (sous + 1) * PAR_SOUS_PAGE);
  const numeroAffiche = saisie ? saisie.padEnd(3, "-") : cherche ? compteur : page;

  return (
    <div className="ttx" data-testid="tv-teletexte" role="document" aria-label={`${t.nom} ${page}`}>
      <div className="ttx-ligne ttx-entete">
        <span className={cherche || saisie ? "ttx-cherche" : undefined}>{entete(t.nom, numeroAffiche, d)}</span>
      </div>
      {cherche ? (
        <div className="ttx-ligne ttx-y">{t.recherche}…</div>
      ) : (
        <>
          <div className="ttx-titre">
            <span>{rendue ? rendue.titre : `P${page}`}</span>
            {sousPages > 1 && <small>{`${sous + 1}/${sousPages}`}</small>}
          </div>
          <div className="ttx-corps">
            {visibles.map((l, i) =>
              l.page !== undefined ? (
                <button key={i} className={`ttx-ligne ttx-lien ttx-${l.couleur ?? "w"}`} onClick={() => onPage(l.page!)}>
                  {l.texte}
                </button>
              ) : (
                <div key={i} className={`ttx-ligne ttx-${l.couleur ?? "w"}`}>
                  {l.texte || " "}
                </div>
              ),
            )}
          </div>
        </>
      )}
      <div className="ttx-fastext">
        {t.fastext.map((f, i) => (
          <button key={f.page} className={`ttx-${COULEURS_FASTEXT[i] ?? "w"}`} onClick={() => onPage(f.page)}>
            {f.texte}
          </button>
        ))}
      </div>
    </div>
  );
}
