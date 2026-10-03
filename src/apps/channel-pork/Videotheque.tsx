"use client";
/**
 * Vidéothèque d'État du magnétoscope de PorkTV : toutes les émissions de Channel Pork en cassette, rangées par genre.
 * Un appui lance la bande depuis le début, hors du direct ; les chaînes reprennent la main dès qu'on zappe.
 */
import type { Program } from "@/content/types";
import { useOs } from "@/os/context";
import { minSec, programLength, videotheque } from "./timeline";

export function Videotheque({ enCours, onChoisir, onFermer }: { enCours: string | null; onChoisir(p: Program): void; onFermer(): void }) {
  const { pack, str } = useOs();
  return (
    <div className="vtq" data-testid="tv-videotheque" role="dialog" aria-label={str("tv.videotheque")}>
      <div className="vtq-entete">
        <b>{str("tv.videotheque")}</b>
        <button className="vtq-fermer" onClick={onFermer} aria-label={str("tv.videotheque.fermer")} data-testid="tv-videotheque-fermer">
          <svg width="10" height="10" viewBox="0 0 8 8" aria-hidden="true"><path d="M0 0l8 8M8 0L0 8" stroke="currentColor" strokeWidth="1.6" /></svg>
        </button>
      </div>
      <p className="vtq-sous">{str("tv.videotheque.sous")}</p>
      <div className="vtq-liste">
        {videotheque(pack.programs).map((g) => (
          <section key={g.kind}>
            <h4>{str(`tv.etiquette.${g.kind}`)}</h4>
            {g.programmes.map((p) => (
              <button key={p.id} className={`vtq-k7${p.id === enCours ? " actif" : ""}`} onClick={() => onChoisir(p)} data-testid={`vtq-${p.id}`}>
                <span>{p.title}</span>
                <i>{minSec(programLength(p))}</i>
              </button>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
