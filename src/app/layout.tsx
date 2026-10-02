import type { Metadata, Viewport } from "next";
import { VT323 } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

/** Pixel Operator (CC0, Jayvee Enaguas) : police bitmap d'interface, nette à 16 px. */
const pixel = localFont({
  src: [
    { path: "./fonts/PixelOperator.woff2", weight: "400", style: "normal" },
    { path: "./fonts/PixelOperator-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-pixel",
  display: "block",
  adjustFontFallback: false,
});
const pixelMono = localFont({ src: "./fonts/PixelOperatorMono.woff2", variable: "--font-pixel-mono", display: "block", adjustFontFallback: false });
const terminal = VT323({ subsets: ["latin"], weight: "400", variable: "--font-terminal", display: "swap" });

const TITRE = "PorkOS — Édition Citoyenne";
const DESCRIPTION = "Le système d'exploitation officiel de la République de Porkonia. Le porc, la bière, toujours plus.";

export const metadata: Metadata = {
  metadataBase: new URL("https://porkos.vercel.app"),
  title: TITRE,
  description: DESCRIPTION,
  icons: { icon: "/brand/embleme-64.png", apple: "/brand/apple-touch-icon.png" },
  // Carte de partage : le poste allumé (télétexte et PorkAmp, aucune image de Porkopédia).
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "PorkOS",
    title: TITRE,
    description: DESCRIPTION,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Le moniteur d'État allumé : PorkTV sur le télétexte et PorkAmp" }],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION, images: ["/og.jpg"] },
  // Sur l'écran d'accueil d'un téléphone : le PorkOS Poche s'ouvre en plein écran, sans barre de navigateur.
  appleWebApp: { capable: true, title: "PorkOS", statusBarStyle: "black-translucent" },
};

/** Téléphone : pas de zoom involontaire (double appui, pincement), contenu jusque sous l'encoche (zones sûres gérées). */
export const viewport: Viewport = { themeColor: "#15110d", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${pixel.variable} ${pixelMono.variable} ${terminal.variable}`}>
      <body>{children}</body>
    </html>
  );
}
