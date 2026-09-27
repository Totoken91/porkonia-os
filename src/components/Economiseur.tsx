"use client";
/** Écran de veille « Groins de l'espace » : champ d'étoiles et emblèmes qui foncent vers le citoyen. */
import { useEffect, useRef } from "react";

interface Etoile {
  x: number;
  y: number;
  z: number;
  embleme: boolean;
}

export function Economiseur({ onExit, w = 800, h = 600 }: { onExit(): void; w?: number; h?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current!;
    const g = c.getContext("2d")!;
    const img = new Image();
    img.src = "/brand/embleme-64.png";
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const neuve = (loin = true): Etoile => ({ x: (Math.random() * 2 - 1) * w, y: (Math.random() * 2 - 1) * h, z: loin ? w : Math.random() * w, embleme: Math.random() < 0.025 });
    const etoiles = Array.from({ length: 220 }, () => neuve(false));
    let raf = 0;
    const frame = () => {
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(0, 0, w, h);
      for (const s of etoiles) {
        s.z -= reduit ? 1.5 : 7;
        if (s.z <= 1) Object.assign(s, neuve());
        const k = 180 / s.z;
        const x = w / 2 + s.x * k * 0.5;
        const y = h / 2 + s.y * k * 0.5;
        if (x < -64 || y < -64 || x > w + 64 || y > h + 64) {
          Object.assign(s, neuve());
          continue;
        }
        if (s.embleme && img.complete) {
          const size = Math.min(96, 12 * k);
          g.drawImage(img, x - size / 2, y - size / 2, size, size);
        } else {
          const size = Math.max(1, Math.min(3, k * 1.2));
          g.fillStyle = s.z < 200 ? "#fff3d0" : s.z < 450 ? "#e0a526" : "#8a6a3a";
          g.fillRect(Math.round(x), Math.round(y), size, size);
        }
      }
      raf = requestAnimationFrame(frame);
    };
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
    raf = requestAnimationFrame(frame);

    const debut = Date.now();
    let origine: { x: number; y: number } | null = null;
    const sortir = () => Date.now() - debut > 400 && onExit();
    const bouge = (e: PointerEvent) => {
      origine ??= { x: e.clientX, y: e.clientY };
      if (Math.hypot(e.clientX - origine.x, e.clientY - origine.y) > 8) sortir();
    };
    window.addEventListener("pointermove", bouge);
    window.addEventListener("pointerdown", sortir);
    window.addEventListener("keydown", sortir);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", bouge);
      window.removeEventListener("pointerdown", sortir);
      window.removeEventListener("keydown", sortir);
    };
  }, [onExit, w, h]);

  return <canvas ref={canvas} className="economiseur" width={w} height={h} data-testid="economiseur" />;
}
