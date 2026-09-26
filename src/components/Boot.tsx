"use client";
/** Démarrage : mire d'État → PorkBIOS → écran titre. Toute touche ou tout clic passe (et c'est consigné). */
import { useEffect, useState } from "react";
import type { ContentPack } from "@/content/types";
import { makeStr } from "@/os/context";

type Stage = "mire" | "bios" | "titre";

export function Boot({ pack, onDone }: { pack: ContentPack; onDone(skipped: boolean): void }) {
  const [stage, setStage] = useState<Stage>("mire");
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
    if (stage === "mire") t = setTimeout(() => setStage("bios"), 2200);
    else if (stage === "bios") {
      if (lines < pack.boot.bios.length) t = setTimeout(() => setLines((n) => n + 1), lines === 0 ? 300 : 170 + (lines % 3) * 90);
      else t = setTimeout(() => setStage("titre"), 900);
    } else t = setTimeout(() => onDone(false), 2600);
    return () => clearTimeout(t);
  }, [stage, lines, pack.boot.bios.length, onDone]);

  if (stage === "mire")
    return (
      <div className="ecran-noir mire-etat" data-testid="boot-mire">
        <div className="barres">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</div>
        <div className="cible">
          <img src="/brand/embleme-256.png" alt="" />
        </div>
        <div className="legende">
          <b>{str("boot.mire")}</b>
          <span>{str("boot.mire.sous")}</span>
        </div>
      </div>
    );

  if (stage === "bios")
    return (
      <div className="ecran-noir" data-testid="boot-bios">
        <pre className="bios">
          {pack.boot.bios.slice(0, lines).map((l, i) => (
            <div key={i}>{renderBiosLine(l)}</div>
          ))}
          <span className="curseur">_</span>
        </pre>
        <p className="skip">{pack.boot.skipHint}</p>
      </div>
    );

  return (
    <div className="ecran-noir titre-boot" data-testid="boot-titre">
      <img src="/brand/embleme-256.png" alt="" />
      <h1>{pack.boot.splash.title}</h1>
      <p>{pack.boot.splash.slogan}</p>
      <div className="barre-segments demarrage">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.18}s` }} />)}</div>
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
