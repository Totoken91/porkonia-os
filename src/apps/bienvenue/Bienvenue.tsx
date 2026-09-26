"use client";
/** Écran de bienvenue : raccourcis et « Le saviez-vous ? », tous tirés du pack. */
import { useState } from "react";
import { useOs, useWin } from "@/os/context";

export function Bienvenue() {
  const { pack, str, runAction } = useOs();
  const { close } = useWin();
  const w = pack.welcome;
  const [tip, setTip] = useState(0);
  return (
    <div className="app-col bienvenue">
      <div className="bienvenue-tete">
        <img src="/brand/embleme-64.png" alt="" width={48} height={48} />
        <div>
          <b>{w.title}</b>
          <span>
            {pack.os.name} {pack.os.version} · {pack.os.edition}
          </span>
        </div>
      </div>
      <div className="bienvenue-corps">
        <ul className="bienvenue-liens">
          {w.links.map((l) => (
            <li key={l.label}>
              <button className="pk-btn" onClick={() => runAction(l.action)}>
                {l.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="bienvenue-texte">
          <p>{w.intro}</p>
          <div className="pk-sunken astuce">
            <p>{w.tips[tip % w.tips.length]}</p>
          </div>
        </div>
      </div>
      <div className="bienvenue-pied">
        <label className="case-a-cocher">
          <input type="checkbox" checked disabled readOnly />
          {str("bureau.bienvenue.afficher")}
        </label>
        <button className="pk-btn" onClick={() => setTip((t) => t + 1)}>
          {str("bureau.bienvenue.suivante")}
        </button>
        <button className="pk-btn primary" onClick={close}>
          {str("bureau.bienvenue.fermer")}
        </button>
      </div>
    </div>
  );
}
