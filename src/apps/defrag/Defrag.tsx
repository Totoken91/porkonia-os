"use client";
/** Défragmenteur de disque : la carte des blocs se range sous vos yeux, commentée par des messages du pack. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMenuCommands, useOs } from "@/os/context";
import { makeRng } from "@/os/rng";
import { avancement, cible, etape, fragmenter, type Bloc } from "./logic";

const BLOCS = 1080;
const COULEURS = ["#c01018", "#f5c542", "#2468d8", "#3c9a2c", "#f29a97"];

export function Defrag() {
  const { pack, str, signal } = useOs();
  const d = pack.accessoires.defrag;
  const [graine, setGraine] = useState(() => Date.now() & 0xffff);
  const depart = useMemo(() => fragmenter(BLOCS, makeRng(graine)), [graine]);
  const vise = useMemo(() => cible(depart), [depart]);
  const [blocs, setBlocs] = useState<Bloc[]>(depart);
  const [actif, setActif] = useState<{ lu: number; ecrit: number } | null>(null);
  const [marche, setMarche] = useState(false);
  const [message, setMessage] = useState(0);
  const [fini, setFini] = useState(false);
  useEffect(() => {
    setBlocs(depart);
    setFini(false);
    setMarche(false);
    setActif(null);
  }, [depart]);

  // Quelques échanges par image : assez vite pour qu'on voie le disque se ranger, assez lent pour qu'on y croie.
  const courant = useRef(blocs);
  courant.current = blocs;
  useEffect(() => {
    if (!marche) return;
    const id = setInterval(() => {
      let cur = courant.current;
      let dernier: { lu: number; ecrit: number } | null = null;
      for (let i = 0; i < 3; i++) {
        const e = etape(cur, vise);
        if (!e) {
          setBlocs(cur);
          setMarche(false);
          setFini(true);
          setActif(null);
          signal("defrag:fin");
          return;
        }
        cur = e.blocs;
        dernier = { lu: e.lu, ecrit: e.ecrit };
      }
      courant.current = cur;
      setBlocs(cur);
      setActif(dernier);
    }, 45);
    const msg = setInterval(() => setMessage((m) => (m + 1) % d.messages.length), 3200);
    return () => {
      clearInterval(id);
      clearInterval(msg);
    };
  }, [marche, vise, d.messages.length, signal]);

  const pct = Math.round(avancement(blocs, vise) * 100);
  const demarrer = () => (fini ? setGraine((g) => g + 1) : setMarche((m) => !m));
  useMenuCommands({ "defrag.demarrer": demarrer, "defrag.nouveau": () => setGraine((g) => g + 1) }, {});
  return (
    <div className="app-col defrag">
      <div className="defrag-carte pk-sunken" data-testid="defrag-carte" aria-label={str("defrag.avancement", { pct })}>
        {blocs.map((b, i) => (
          <i
            key={i}
            className={i === actif?.lu ? "lu" : i === actif?.ecrit ? "ecrit" : undefined}
            style={{ background: b === "libre" ? "#fffdf7" : b === "systeme" ? "#24201c" : COULEURS[b] }}
          />
        ))}
      </div>
      <div className="defrag-legende">
        {d.familles.map((f, i) => (
          <span key={f}>
            <i style={{ background: COULEURS[i] }} /> {f}
          </span>
        ))}
        <span>
          <i style={{ background: "#24201c" }} /> {str("defrag.systeme")}
        </span>
        <span>
          <i style={{ background: "#fffdf7" }} /> {str("defrag.libre")}
        </span>
      </div>
      <div className="defrag-pied">
        <div className="defrag-barre pk-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${pct}%` }} />
        </div>
        <p className="defrag-message" data-testid="defrag-message">
          {fini ? d.fin : marche ? d.messages[message] : str("defrag.pret", { pct: 100 - pct })}
        </p>
        <div className="defrag-boutons">
          <button className="pk-btn" onClick={demarrer} data-testid="defrag-demarrer">
            {fini ? str("defrag.nouveau") : marche ? str("defrag.pause") : pct > 0 && blocs !== depart ? str("defrag.reprendre") : str("defrag.demarrer")}
          </button>
          <span>{str("defrag.avancement", { pct })}</span>
        </div>
      </div>
    </div>
  );
}
