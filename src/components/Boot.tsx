"use client";
/** Démarrage : PorkBIOS (texte) → écran de chargement. Toute touche ou tout clic passe (et c'est consigné). */
import { useEffect, useState } from "react";
import type { ContentPack } from "@/content/types";
import { makeStr } from "@/os/context";

type Stage = "scandisk" | "bios" | "chargement";
const MEMOIRE = 640;

export function Boot({ pack, brutal, onDone }: { pack: ContentPack; brutal: boolean; onDone(skipped: boolean): void }) {
  const [stage, setStage] = useState<Stage>(brutal ? "scandisk" : "bios");
  const [scan, setScan] = useState(0);
  const [mem, setMem] = useState(0);
  const [lines, setLines] = useState(0);
  const str = makeStr(pack);

  useEffect(() => {
    const skip = (e: Event) => {
      if (e instanceof KeyboardEvent && ["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
      if ((e.target as Element | null)?.closest?.(".facade, .bouton-marche")) return;
      onDone(true);
    };
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [onDone]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (stage === "scandisk") {
      if (scan < 100) t = setTimeout(() => setScan((n) => Math.min(100, n + 3 + Math.floor(Math.random() * 6))), 90);
      else t = setTimeout(() => setStage("bios"), 1600);
    } else if (stage === "bios") {
      if (mem < MEMOIRE) t = setTimeout(() => setMem((m) => Math.min(MEMOIRE, m + 32)), 40);
      else if (lines < pack.boot.bios.length) t = setTimeout(() => setLines((n) => n + 1), 150 + (lines % 3) * 80);
      else t = setTimeout(() => setStage("chargement"), 900);
    } else t = setTimeout(() => onDone(false), 3200);
    return () => clearTimeout(t);
  }, [stage, mem, lines, scan, pack.boot.bios.length, onDone]);

  if (stage === "scandisk") {
    const sd = pack.boot.scandisk;
    const blocs = Math.round(scan / 2.5);
    return (
      <div className="scandisk" data-testid="boot-scandisk">
        <div className="scandisk-titre">{sd.title}</div>
        <div className="scandisk-corps">
          {sd.lines.map((l, i) => (
            <div key={i}>{renderBiosLine(l.replace(/en cours$/, scan >= 100 ? "OK" : "en cours"))}</div>
          ))}
          <div className="scandisk-barre">
            <span>{"█".repeat(blocs)}</span>
            <span className="vide">{"░".repeat(40 - blocs)}</span> {scan} %
          </div>
          {scan >= 100 && <p className="scandisk-outro">{sd.outro}</p>}
        </div>
        <div className="scandisk-pied">Échap = Passer · F1 = Aide (indisponible) · F12 = Contrôle de loyauté</div>
      </div>
    );
  }

  if (stage === "bios")
    return (
      <div className="ecran-noir bios" data-testid="boot-bios">
        <img className="bios-logo" src="/brand/embleme-64.png" alt="" width={64} height={64} />
        <div>{str("boot.memoire", { n: String(mem).padStart(4, " ") })}</div>
        <div>&nbsp;</div>
        {pack.boot.bios.slice(0, lines).map((l, i) => (
          <div key={i}>{renderBiosLine(l)}</div>
        ))}
        <span className="curseur">_</span>
        <p className="skip">{pack.boot.skipHint}</p>
      </div>
    );

  return (
    <div className="chargement" data-testid="boot-chargement">
      <div className="chargement-centre">
        <img src="/brand/embleme-256.png" alt="" width={150} height={150} />
        <div className="chargement-titre">
          <b>{pack.boot.splash.title}</b>
          <span>{pack.os.edition}</span>
        </div>
        <p>{pack.boot.splash.slogan}</p>
      </div>
      <div className="chargement-barre" aria-label={str("boot.chargement")} />
    </div>
  );
}

/** Le statut final d'une ligne « ....... STATUT » est mis en évidence. */
function renderBiosLine(l: string) {
  const m = /^(.*\.{4,}\s)(.+)$/.exec(l);
  if (!m) return l || " ";
  return (
    <>
      {m[1]}
      <span className="ok">{m[2]}</span>
    </>
  );
}
