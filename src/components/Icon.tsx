/**
 * Pictogrammes d'État : aplats trois couleurs (rouge, crème, noir), trait épais, comme sur une affiche.
 * Aucun emoji, aucune image externe.
 */
import type { DialogSpec, IconKey } from "@/content/types";

const R = "#b3121b";
const C = "#efe3c6";
const N = "#15110d";
const S = { stroke: N, strokeWidth: 2.4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

const PATHS: Record<IconKey, React.ReactNode> = {
  navigateur: (
    <>
      <circle cx="20" cy="20" r="15" fill={C} {...S} />
      <path d="M5 20h30M20 5c-6 5-6 25 0 30M20 5c6 5 6 25 0 30" fill="none" {...S} />
      <path d="M8 12h24M8 28h24" fill="none" {...S} strokeWidth={1.6} />
      <path d="M26 30l8 6 2-4-6-6z" fill={R} {...S} />
    </>
  ),
  tele: (
    <>
      <path d="M14 3l6 7 6-7" fill="none" {...S} />
      <rect x="3" y="10" width="34" height="25" rx="3" fill={N} {...S} />
      <rect x="6.5" y="13.5" width="21" height="18" rx="2" fill={R} stroke={C} strokeWidth={1.5} />
      <path d="M9 17h9M9 21h14" stroke={C} strokeWidth={1.5} />
      <circle cx="32" cy="17" r="2" fill={C} />
      <circle cx="32" cy="24" r="2" fill={C} />
    </>
  ),
  nappe: (
    <>
      <path d="M3 16h34l-3 12H6z" fill={C} {...S} />
      <path d="M6 28v7M34 28v7" {...S} />
      <path d="M9 16v6M15 16v8M21 16v6M27 16v8M33 16v6" stroke={R} strokeWidth={2} />
      <ellipse cx="20" cy="12" rx="10" ry="3.5" fill={C} {...S} />
      <ellipse cx="20" cy="11.4" rx="5" ry="1.6" fill={R} />
    </>
  ),
  config: (
    <>
      <rect x="4" y="4" width="32" height="32" fill={C} {...S} />
      <path d="M11 9v22M20 9v22M29 9v22" {...S} strokeWidth={1.8} />
      <rect x="7" y="12" width="8" height="5" fill={R} {...S} strokeWidth={1.8} />
      <rect x="16" y="22" width="8" height="5" fill={N} {...S} strokeWidth={1.8} />
      <rect x="25" y="15" width="8" height="5" fill={R} {...S} strokeWidth={1.8} />
    </>
  ),
  dossier: (
    <>
      <path d="M3 9h12l3 4h19v22H3z" fill={R} {...S} />
      <path d="M3 16h34v19H3z" fill={C} {...S} />
      <path d="M8 22h14" stroke={N} strokeWidth={2} />
    </>
  ),
  poubelle: (
    <>
      <path d="M8 11h24l-2.5 25h-19z" fill={C} {...S} />
      <path d="M5 11h30M15 11V6h10v5" fill="none" {...S} />
      <circle cx="20" cy="23" r="6" fill={R} {...S} strokeWidth={1.8} />
      <path d="M17.5 23h5M20 20.5v5" stroke={C} strokeWidth={1.6} />
    </>
  ),
  texte: (
    <>
      <path d="M8 3h17l7 7v27H8z" fill={C} {...S} />
      <path d="M25 3v7h7" fill="none" {...S} />
      <path d="M12 16h16M12 21h16M12 26h11" stroke={N} strokeWidth={2} />
      <rect x="12" y="30" width="9" height="3" fill={R} />
    </>
  ),
  image: (
    <>
      <rect x="4" y="6" width="32" height="28" fill={C} {...S} />
      <path d="M6 31l9-11 7 8 4-4 8 7z" fill={N} />
      <circle cx="27" cy="14" r="4" fill={R} />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="9" width="34" height="23" fill={C} {...S} />
      <path d="M3 9l17 14 17-14" fill="none" {...S} />
      <circle cx="30" cy="27" r="5" fill={R} {...S} strokeWidth={1.8} />
    </>
  ),
  carte: (
    <>
      <rect x="3" y="8" width="34" height="24" rx="2" fill={C} {...S} />
      <rect x="7" y="13" width="10" height="13" fill={R} {...S} strokeWidth={1.6} />
      <path d="M21 15h12M21 20h12M21 25h8" stroke={N} strokeWidth={2} />
    </>
  ),
  cadenas: (
    <>
      <path d="M12 18v-5a8 8 0 0 1 16 0v5" fill="none" {...S} strokeWidth={3} />
      <rect x="7" y="18" width="26" height="18" fill={R} {...S} />
      <circle cx="20" cy="26" r="2.6" fill={C} />
      <path d="M20 27v5" stroke={C} strokeWidth={2.4} />
    </>
  ),
};

export function Icon({ name, size = 40 }: { name: IconKey; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}

export function DialogIcon({ kind }: { kind: DialogSpec["icon"] }) {
  if (kind === "sceau") return <img src="/brand/embleme-64.png" alt="" width={48} height={48} />;
  return (
    <svg width={44} height={44} viewBox="0 0 40 40" aria-hidden="true">
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
