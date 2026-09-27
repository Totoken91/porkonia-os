"use client";
/**
 * Info-bulles d'époque : remplacent les bulles natives du navigateur (trop modernes).
 * Tout attribut `title` dans l'écran est converti en bulle jaune, affichée après une demi-seconde de survol.
 */
import { useEffect, useState } from "react";
import { SCREEN } from "./Monitor";

export function InfoBulles() {
  const [bulle, setBulle] = useState<{ x: number; y: number; texte: string; droite: boolean } | null>(null);

  useEffect(() => {
    const ecran = document.querySelector<HTMLElement>(".ecran");
    if (!ecran) return;
    let minuteur: ReturnType<typeof setTimeout> | undefined;
    let courant: Element | null = null;
    const cacher = () => {
      clearTimeout(minuteur);
      setBulle(null);
    };
    const survol = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.("[title], [data-bulle]") ?? null;
      if (el === courant) return;
      cacher();
      courant = el;
      if (!el || !ecran.contains(el)) return;
      const t = el.getAttribute("title");
      if (t) {
        el.setAttribute("data-bulle", t);
        el.removeAttribute("title");
      }
      const texte = el.getAttribute("data-bulle");
      if (!texte) return;
      const { clientX, clientY } = e;
      minuteur = setTimeout(() => {
        const r = ecran.getBoundingClientRect();
        const k = SCREEN.w / r.width;
        const x = (clientX - r.left) * k;
        const y = (clientY - r.top) * k;
        setBulle({ x, y: y + 20 > SCREEN.h - 40 ? y - 28 : y + 20, texte, droite: x > SCREEN.w - 260 });
        minuteur = setTimeout(cacher, 6000);
      }, 550);
    };
    ecran.addEventListener("pointerover", survol);
    ecran.addEventListener("pointerdown", cacher);
    ecran.addEventListener("pointerleave", cacher);
    window.addEventListener("keydown", cacher);
    return () => {
      clearTimeout(minuteur);
      ecran.removeEventListener("pointerover", survol);
      ecran.removeEventListener("pointerdown", cacher);
      ecran.removeEventListener("pointerleave", cacher);
      window.removeEventListener("keydown", cacher);
    };
  }, []);

  if (!bulle) return null;
  return (
    <div className="info-bulle" role="tooltip" style={{ left: bulle.x, top: bulle.y, transform: bulle.droite ? "translateX(-100%)" : undefined }}>
      {bulle.texte}
    </div>
  );
}
