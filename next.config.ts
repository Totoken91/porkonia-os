import type { NextConfig } from "next";

/**
 * PorkOS est un site statique. Sur Vercel (ou avec PORKOS_SERVEUR=1), il garde en plus un seul point d'entrée serveur :
 * le relais du Courrier d'État vers le modèle de langage (src/app/api/courrier/route.serveur.ts), qui tient la clé
 * GROQ_API_KEY loin du navigateur. Ailleurs (export statique, e2e), ce fichier est ignoré et les personnalités
 * répondent par leur lettre de secours.
 */
const serveur = process.env.VERCEL === "1" || process.env.PORKOS_SERVEUR === "1";

const nextConfig: NextConfig = {
  ...(serveur ? { pageExtensions: ["tsx", "ts", "serveur.ts"] } : { output: "export" }),
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
};

export default nextConfig;
