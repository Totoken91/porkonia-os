import type { MetadataRoute } from "next";

/** Installable sur l'écran d'accueil : le PorkOS Poche s'ouvre alors en plein écran, comme un vrai appareil d'État. */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PorkOS — Édition Citoyenne",
    short_name: "PorkOS",
    description: "Le système d'exploitation officiel de la République de Porkonia. Le porc, la bière, toujours plus.",
    start_url: "/",
    display: "fullscreen",
    orientation: "any",
    background_color: "#15110d",
    theme_color: "#15110d",
    icons: [
      { src: "/brand/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
