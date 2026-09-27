"use client";
/**
 * PorkPaint : crayon, pinceau, gomme, pot de peinture et tampons, sur une feuille de 320 × 200 pixels
 * en couleurs de palette. « Enregistrer sous » range le dessin (PNG) sur le disque du poste.
 */
import { useEffect, useRef, useState } from "react";
import { ListeDeroulante } from "@/components/ListeDeroulante";
import { useMenuCommands, useOs, useWin } from "@/os/context";
import { splitPath } from "@/os/fs";
import { BUREAU, creer, dossiersEcrivables } from "@/os/vfs";
import { imageVide, remplir, tamponner, trait, type Image } from "./logic";

const W = 320;
const H = 200;
type Outil = "crayon" | "pinceau" | "gomme" | "seau" | "tampon";
const TAILLES: Record<Outil, number> = { crayon: 1, pinceau: 3, gomme: 7, seau: 1, tampon: 1 };

/** Pictogrammes 16 × 16 de la boîte à outils. */
const PICTOS: Record<Outil, string> = {
  crayon: "M3 13l1-3 7-7 2 2-7 7zM3 13l3-1",
  pinceau: "M9 2h2v6H9zM8 8h4v2H8zM8 10h4l-1 4H9z",
  gomme: "M2 10l6-6 5 5-4 4H5zM5 13h9",
  seau: "M3 6l5-4 5 5-5 5zM13 9v4h1V9z",
  tampon: "M6 2h4v5H6zM3 7h10v3H3zM2 12h12v2H2z",
};

export function Paint() {
  const { pack, str, fs, signal } = useOs();
  const { setTitle } = useWin();
  const { palette, tampons } = pack.accessoires.paint;
  const [outil, setOutil] = useState<Outil>("crayon");
  const [couleur, setCouleur] = useState(1);
  const [tampon, setTampon] = useState(0);
  const [nom, setNom] = useState<string | null>(null);
  const [sous, setSous] = useState<{ nom: string; dossier: string } | null>(null);
  const image = useRef<Image>(imageVide(W, H));
  const toile = useRef<HTMLCanvasElement>(null);
  const dernier = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => setTitle(`${nom ?? str("paint.nom")} — PorkPaint`), [nom, setTitle, str]);

  const couleursRgb = palette.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as const);
  const peindre = () => {
    const g = toile.current?.getContext("2d");
    if (!g) return;
    const data = g.createImageData(W, H);
    const px = image.current.px;
    for (let i = 0; i < px.length; i++) {
      const [r, v, b] = couleursRgb[px[i]!] ?? [0, 0, 0];
      data.data[i * 4] = r;
      data.data[i * 4 + 1] = v;
      data.data[i * 4 + 2] = b;
      data.data[i * 4 + 3] = 255;
    }
    g.putImageData(data, 0, 0);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(peindre, []);

  const point = (e: React.PointerEvent) => {
    const r = toile.current!.getBoundingClientRect();
    return { x: Math.floor(((e.clientX - r.left) * W) / r.width), y: Math.floor(((e.clientY - r.top) * H) / r.height) };
  };
  const appliquer = (p: { x: number; y: number }, de?: { x: number; y: number }) => {
    const im = image.current;
    if (outil === "seau") remplir(im, p.x, p.y, couleur);
    else if (outil === "tampon") tamponner(im, tampons[tampon]!.motif, p.x, p.y, 2);
    else trait(im, de?.x ?? p.x, de?.y ?? p.y, p.x, p.y, outil === "gomme" ? 0 : couleur, TAILLES[outil]);
    peindre();
  };

  const nouveau = () => {
    image.current = imageVide(W, H);
    setNom(null);
    peindre();
  };
  const enregistrerSous = () => setSous({ nom: nom ?? str("paint.nom"), dossier: BUREAU });
  const valider = () => {
    if (!sous || !toile.current) return;
    const brut = sous.nom.trim() || str("paint.nom");
    const n = /\.png$/i.test(brut) ? brut : `${brut}.png`;
    const r = fs.appliquer((d) => creer(d, sous.dossier, { type: "image", name: n, src: toile.current!.toDataURL("image/png"), date: new Date().toLocaleDateString("fr-FR") }));
    if (!r?.[0]) return;
    setNom(splitPath(r[0]).pop()!);
    setSous(null);
    signal("paint:enregistrer");
  };
  useMenuCommands({ "paint.nouveau": nouveau, "paint.enregistrer": enregistrerSous }, {});

  return (
    <div className="app-col paint">
      {sous && (
        <div className="pk-toolbar enregistrer-sous">
          <label>
            {str("texte.nom")} <input className="pk-input" value={sous.nom} onChange={(e) => setSous({ ...sous, nom: e.target.value })} onKeyDown={(e) => e.key === "Enter" && valider()} autoFocus data-testid="paint-nom" />
          </label>
          <span>{str("texte.dans")}</span>
          <ListeDeroulante value={sous.dossier} options={dossiersEcrivables(fs.disque).map((d) => ({ value: d, label: [fs.disque.racine.name, ...splitPath(d)].join(" › ") }))} onChange={(d) => setSous({ ...sous, dossier: d })} aria-label={str("texte.dans")} />
          <button className="pk-btn small" onClick={valider} data-testid="paint-valider">
            {str("texte.enregistrer")}
          </button>
          <button className="pk-btn small" onClick={() => setSous(null)}>
            {str("texte.annuler")}
          </button>
        </div>
      )}
      <div className="paint-corps">
        <div className="paint-outils" role="toolbar" aria-label="Outils">
          {(Object.keys(PICTOS) as Outil[]).map((o) => (
            <button key={o} className={`pk-btn paint-outil${outil === o ? " actif" : ""}`} aria-pressed={outil === o} title={str(`paint.${o}`)} onClick={() => setOutil(o)} data-testid={`paint-${o}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d={PICTOS[o]} fill="currentColor" stroke="currentColor" strokeWidth="0.6" />
              </svg>
            </button>
          ))}
          {outil === "tampon" && (
            <div className="paint-tampons">
              {tampons.map((t, i) => (
                <button key={t.nom} className={`pk-btn small${tampon === i ? " actif" : ""}`} onClick={() => setTampon(i)} title={t.nom}>
                  {t.nom}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="paint-feuille pk-sunken">
          <canvas
            ref={toile}
            width={W}
            height={H}
            className={`paint-toile outil-${outil}`}
            data-testid="paint-toile"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              const p = point(e);
              dernier.current = p;
              appliquer(p);
            }}
            onPointerMove={(e) => {
              if (!dernier.current || outil === "seau" || outil === "tampon") return;
              const p = point(e);
              appliquer(p, dernier.current);
              dernier.current = p;
            }}
            onPointerUp={() => (dernier.current = null)}
            onPointerCancel={() => (dernier.current = null)}
          />
        </div>
      </div>
      <div className="paint-palette">
        <span className="paint-courante" style={{ background: palette[couleur] }} aria-label="Couleur choisie" />
        {palette.map((c, i) => (
          <button key={c} className={`paint-couleur${couleur === i ? " actif" : ""}`} style={{ background: c }} aria-label={c} onClick={() => setCouleur(i)} data-testid={`paint-couleur-${i}`} />
        ))}
        <button className="pk-btn small paint-enregistrer" onClick={enregistrerSous} data-testid="paint-enregistrer">
          {str("texte.enregistrerSous")}…
        </button>
      </div>
    </div>
  );
}
