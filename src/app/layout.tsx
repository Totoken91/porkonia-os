import type { Metadata, Viewport } from "next";
import { VT323 } from "next/font/google";
import "./globals.css";

const terminal = VT323({ subsets: ["latin"], weight: "400", variable: "--font-terminal", display: "swap" });

export const metadata: Metadata = {
  title: "PorkOS — Édition Citoyenne",
  description: "Le système d'exploitation officiel de la République de Porkonia. Le porc, la bière, toujours plus.",
  icons: { icon: "/brand/embleme-64.png" },
};

export const viewport: Viewport = { themeColor: "#15110d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={terminal.variable}>
      <body>{children}</body>
    </html>
  );
}
