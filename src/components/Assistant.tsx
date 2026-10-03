"use client";
/**
 * Gruik, l'Assistant Numérique d'État : au coin du bureau, il salue, commente la première ouverture des programmes,
 * réagit à quelques événements et glisse des conseils quand on ne fait rien. On le déplace à la souris ; un clic
 * ouvre son menu. Masqué, il revient par la commande « gruik » d'Exécuter (signal assistant:appel).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useEcran, useOs } from "@/os/context";
import { conseil, dureeLecture, reagir, type Bulle, type EvenementOs } from "@/os/assistant";
import { pick } from "@/os/rng";

type Affiche = (Bulle & { humeur?: "content" | "ouvert" | "surpris" }) | { cle: "menu"; texte: string; question: false; menu: true };

/** `calme` : l'écran de bienvenue est ouvert ; Gruik attend qu'on le ferme pour dire bonjour. */
export function Assistant({ ev, calme }: { ev: { n: number; ev: EvenementOs } | null; calme: boolean }) {
  const { pack, str, settings, setSettings, rng } = useOs();
  const ecran = useEcran();
  const spec = pack.assistant;
  const visible = settings.assistant;
  const [bulle, setBulle] = useState<Affiche | null>(null);
  const [salue, setSalue] = useState(false);
  const [parle, setParle] = useState(false);
  const [regard, setRegard] = useState(false);
  const [sortie, setSortie] = useState(false);
  const [decal, setDecal] = useState({ x: 0, y: 0 });
  const vus = useRef(new Set<string>());
  const derniere = useRef(Date.now());
  const dernierConseil = useRef<string | undefined>(undefined);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glisse = useRef<{ x: number; y: number; dx: number; dy: number; bouge: boolean } | null>(null);

  const dire = useCallback((b: Affiche, opts: { saluer?: boolean } = {}) => {
    if (minuteur.current) clearTimeout(minuteur.current);
    setBulle(b);
    derniere.current = Date.now();
    setParle(true);
    setTimeout(() => setParle(false), Math.min(2600, b.texte.length * 40));
    if (opts.saluer) {
      setSalue(true);
      setTimeout(() => setSalue(false), 2400);
    }
    if (!b.question && !("menu" in b)) minuteur.current = setTimeout(() => setBulle(null), dureeLecture(b.texte));
  }, []);

  // Bonjour, peu après l'ouverture de la session, une fois l'écran de bienvenue refermé.
  const aSalue = useRef(false);
  useEffect(() => {
    if (!visible || calme || aSalue.current) return;
    const t = setTimeout(() => {
      aSalue.current = true;
      dire({ cle: "accueil", texte: spec.accueil, question: false }, { saluer: true });
    }, 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, calme]);

  // Événements du système.
  useEffect(() => {
    if (!ev) return;
    if (ev.ev.kind === "signal" && ev.ev.name === "assistant:appel") {
      setSortie(false);
      if (!visible) setSettings({ assistant: true });
      dire({ cle: "retour", texte: spec.retour, question: false }, { saluer: true });
      return;
    }
    if (!visible || bulle?.question || (bulle && "menu" in bulle)) return;
    const b = reagir(spec, ev.ev, vus.current, rng);
    if (!b) return;
    vus.current.add(b.cle);
    dire({ ...b, humeur: b.question ? "ouvert" : "surpris" }, { saluer: b.question });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ev?.n]);

  // Conseils au repos, et coups d'œil de temps en temps.
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      if (Date.now() - derniere.current > 210000) {
        const c = conseil(spec, rng, dernierConseil.current);
        dernierConseil.current = c.texte;
        setBulle((b) => {
          if (b) return b;
          setTimeout(() => dire(c), 0);
          return b;
        });
      }
      if (rng() < 0.35) {
        setRegard(true);
        setTimeout(() => setRegard(false), 1400);
      }
    }, 9000);
    return () => clearInterval(id);
  }, [visible, spec, rng, dire]);

  if (!visible) return null;

  const fermer = () => setBulle(null);
  const repondre = (oui: boolean) => dire({ cle: oui ? "oui" : "non", texte: pick(rng, oui ? spec.oui : spec.non), question: false, humeur: oui ? "content" : "ouvert" });
  const masquer = () => {
    dire({ cle: "adieu", texte: spec.adieu, question: false });
    setTimeout(() => setSortie(true), 3800);
    setTimeout(() => {
      setBulle(null);
      setSortie(false);
      setSettings({ assistant: false });
    }, 4400);
  };

  const humeur = bulle && "humeur" in bulle && bulle.humeur ? bulle.humeur : regard ? "ouvert" : "content";
  const taille = ecran.mode === "poche" ? (ecran.h < 500 ? 60 : 70) : 96;

  const bas = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    glisse.current = { x: e.clientX, y: e.clientY, dx: decal.x, dy: decal.y, bouge: false };
  };
  const bouge = (e: React.PointerEvent) => {
    const g = glisse.current;
    if (!g) return;
    const k = ecran.mode === "poche" ? 1 : ((e.currentTarget as HTMLElement).getBoundingClientRect().height || taille) / taille;
    const mx = (e.clientX - g.x) / k;
    const my = (e.clientY - g.y) / k;
    if (Math.abs(mx) + Math.abs(my) > 4) g.bouge = true;
    if (g.bouge) setDecal({ x: Math.min(0, g.dx + mx), y: Math.min(0, g.dy + my) });
  };
  const haut = () => {
    const g = glisse.current;
    glisse.current = null;
    if (g && !g.bouge) {
      if (bulle && "menu" in bulle) fermer();
      else if (!bulle?.question) dire({ cle: "menu", texte: str("gruik.question", { nom: spec.nom }), question: false, menu: true });
    }
  };

  return (
    <div className={`gruik${sortie ? " sortie" : ""}`} style={{ transform: `translate(${decal.x}px, ${decal.y}px)` }} data-testid="gruik">
      {bulle && (
        <div className="gruik-bulle" role="status" data-testid="gruik-bulle">
          <b>{spec.nom}</b>
          <p>{bulle.texte}</p>
          {bulle.question && (
            <div className="gruik-boutons">
              <button className="pk-btn" onClick={() => repondre(true)} data-testid="gruik-oui">
                {str("gruik.oui")}
              </button>
              <button className="pk-btn" onClick={() => repondre(false)} data-testid="gruik-non">
                {str("gruik.non")}
              </button>
            </div>
          )}
          {"menu" in bulle && (
            <div className="gruik-menu">
              <button
                className="pk-btn"
                onClick={() => {
                  const c = conseil(spec, rng, dernierConseil.current);
                  dernierConseil.current = c.texte;
                  dire(c);
                }}
                data-testid="gruik-conseil"
              >
                {str("gruik.conseil")}
              </button>
              <button className="pk-btn" onClick={() => dire({ cle: "presentation", texte: spec.presentation, question: false, humeur: "content" }, { saluer: true })}>
                {str("gruik.quiEstu")}
              </button>
              <button className="pk-btn" onClick={masquer} data-testid="gruik-masquer">
                {str("gruik.masquer", { nom: spec.nom })}
              </button>
            </div>
          )}
          {!bulle.question && !("menu" in bulle) && (
            <div className="gruik-boutons">
              <button className="pk-btn" onClick={fermer}>
                {str("gruik.ok")}
              </button>
            </div>
          )}
        </div>
      )}
      <img
        className={`gruik-corps${salue ? " salue" : parle ? " parle" : ""}${humeur === "surpris" ? " surpris" : ""}${regard && !bulle ? " regarde" : ""}`}
        src={spec.image}
        srcSet={spec.image2x ? `${spec.image} 1x, ${spec.image2x} 2x` : undefined}
        style={{ height: taille }}
        alt={spec.nom}
        draggable={false}
        onPointerDown={bas}
        onPointerMove={bouge}
        onPointerUp={haut}
        onPointerCancel={() => (glisse.current = null)}
        role="button"
        data-testid="gruik-corps"
      />
    </div>
  );
}
