"use client";
/** Démarrage : PorkBIOS (texte) → écran de chargement. Toute touche ou tout clic passe (et c'est consigné). */
import { useEffect, useState } from "react";
import type { ContentPack } from "@/content/types";
import { makeStr } from "@/os/context";

type Stage = "bios" | "chargement";
const MEMOIRE = 640;

export function Boot({ pack, onDone }: { pack: ContentPack; onDone(skipped: boolean): void }) {
  const [stage, setStage] = useState<Stage>("bios");
  const [mem, setMem] = useState(0);
  const [lines, setLines] = useState(0);
  const str = makeStr(pack);

  useEffect(() => {
    const skip = (e: Event) => {
      if (e instanceof KeyboardEvent && ["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
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
    if (stage === "bios") {
      if (mem < MEMOIRE) t = setTimeout(() => setMem((m) => Math.min(MEMOIRE, m + 32)), 40);
      else if (lines < pack.boot.bios.length) t = setTimeout(() => setLines((n) => n + 1), 150 + (lines % 3) * 80);
      else t = setTimeout(() => setStage("chargement"), 900);
    } else t = setTimeout(() => onDone(false), 3200);
    return () => clearTimeout(t);
  }, [stage, mem, lines, pack.boot.bios.length, onDone]);

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
