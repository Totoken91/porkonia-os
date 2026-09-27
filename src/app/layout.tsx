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

export const metadata: Metadata = {
  title: "PorkOS — Édition Citoyenne",
  description: "Le système d'exploitation officiel de la République de Porkonia. Le porc, la bière, toujours plus.",
  icons: { icon: "/brand/embleme-64.png" },
};

export const viewport: Viewport = { themeColor: "#15110d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${pixel.variable} ${pixelMono.variable} ${terminal.variable}`}>
      <body>{children}</body>
    </html>
  );
}
