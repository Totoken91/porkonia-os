/**
 * Icônes d'époque en pixel art (grilles de pixel.ts) et pictogrammes des boîtes de dialogue.
 * Aucun emoji, aucune image externe.
 */
import type { DialogSpec, IconKey } from "@/content/types";
import { gridPaths, iconGrid } from "./pixel";

const R = "#b3121b";
const N = "#15110d";
const C = "#efe3c6";

/** Icône pixel : grille 16×16 pour les petites tailles, 32×32 au-delà (voir pixel.ts). */
export function Icon({ name, size = 32 }: { name: IconKey; size?: number }) {
  if (name === "embleme") return <img src="/brand/embleme-64.png" alt="" width={size} height={size} />;
  const n = size <= 20 ? 16 : 32;
  const paths = gridPaths(iconGrid(name, n));
  return (
    <svg className="pixel" width={size} height={size} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      {paths.map((p) => (
        <path key={p.color} d={p.d} fill={p.color} />
      ))}
    </svg>
  );
}

export function DialogIcon({ kind, small }: { kind: DialogSpec["icon"]; small?: boolean }) {
  const px = small ? 16 : 36;
  if (kind === "sceau") return <img src="/brand/embleme-64.png" alt="" width={px + 4} height={px + 4} />;
  return (
    <svg width={px} height={px} viewBox="0 0 40 40" aria-hidden="true">
      {kind === "info" && (
        <>
          <circle cx="20" cy="20" r="16" fill={N} />
          <circle cx="20" cy="12" r="2.6" fill={C} />
          <path d="M20 18v12" stroke={C} strokeWidth={4} />
        </>
      )}
      {kind === "attention" && (
        <>
          <path d="M20 4l17 31H3z" fill={R} stroke={N} strokeWidth={2.4} strokeLinejoin="round" />
          <path d="M20 14v11" stroke={C} strokeWidth={4} />
          <circle cx="20" cy="30" r="2.4" fill={C} />
        </>
      )}
      {kind === "erreur" && (
        <>
          <circle cx="20" cy="20" r="16" fill={R} stroke={N} strokeWidth={2.4} />
          <path d="M13 13l14 14M27 13L13 27" stroke={C} strokeWidth={4} />
        </>
      )}
    </svg>
  );
}

/** Visage du groin pour Nappe Vide (neutre, inquiet, catastrophé, couronné). */
export function Groin({ mood }: { mood: "attente" | "service" | "incident" | "conforme" }) {
  return (
    <svg width={26} height={26} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M8 10l-2-7 9 4M32 10l2-7-9 4" fill={R} stroke={N} strokeWidth={2} strokeLinejoin="round" />
      <circle cx="20" cy="22" r="15" fill={mood === "incident" ? "#e9a39b" : "#f2b5a8"} stroke={N} strokeWidth={2.4} />
      <ellipse cx="20" cy="26" rx="7" ry="5" fill={R} stroke={N} strokeWidth={2} />
      <circle cx="17.5" cy="26" r="1.4" fill={N} />
      <circle cx="22.5" cy="26" r="1.4" fill={N} />
      {mood === "incident" ? (
        <path d="M11 14l4 4M15 14l-4 4M25 14l4 4M29 14l-4 4" stroke={N} strokeWidth={2} />
      ) : (
        <>
          <circle cx="13.5" cy="17" r="2" fill={N} />
          <circle cx="26.5" cy="17" r="2" fill={N} />
        </>
      )}
      {mood === "service" && <path d="M10 12l6 2M30 12l-6 2" stroke={N} strokeWidth={2} />}
      {mood === "conforme" && <path d="M11 9l3-6 3 4 3-5 3 5 3-4 3 6z" fill="#c98a1c" stroke={N} strokeWidth={1.6} strokeLinejoin="round" />}
    </svg>
  );
}
