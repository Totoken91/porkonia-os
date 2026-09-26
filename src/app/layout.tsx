import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { NavLink } from "@/components/nav";
import { Emblem } from "@/components/ui";
import { Clock } from "@/components/client";
import {
  IconArchive,
  IconBook,
  IconCamera,
  IconDashboard,
  IconLog,
  IconPerson,
  IconRobot,
  IconScroll,
  IconShield,
  IconStamp,
  IconTrash,
} from "@/components/icons";

export const metadata: Metadata = {
  title: { default: "PORKONIA OS", template: "%s — PORKONIA OS" },
  description: "PORKONIA OS — Édition Administrative 2005. Centre de commande éditorial privé de l'univers de Porkonia.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const MODULES = [
  { href: "/", label: "Tableau de bord", icon: IconDashboard, num: "00" },
  { href: "/personnages", label: "Registre des individus", icon: IconPerson, num: "01" },
  { href: "/articles", label: "Ministère du Lore", icon: IconScroll, num: "02" },
  { href: "/medias", label: "Archives audiovisuelles", icon: IconCamera, num: "03" },
  { href: "/bible", label: "Bible canonique", icon: IconBook, num: "04" },
  { href: "/contextes", label: "Contextes IA", icon: IconRobot, num: "05" },
  { href: "/publication", label: "Préfecture des Publications", icon: IconStamp, num: "06" },
];
const ADMIN = [
  { href: "/integrite", label: "Contrôle d'intégrité", icon: IconShield, num: "07" },
  { href: "/archives", label: "Sauvegardes & exports", icon: IconArchive, num: "08" },
  { href: "/corbeille", label: "Corbeille", icon: IconTrash, num: "09" },
  { href: "/journal", label: "Journal des opérations", icon: IconLog, num: "10" },
];

function Nav() {
  return (
    <nav className="pk-nav" aria-label="Modules">
      <div className="pk-nav-head">Classeur des modules</div>
      <ul>
        {MODULES.map(({ href, label, icon: I, num }) => (
          <li key={href}>
            <NavLink href={href}>
              <I size={16} /> {label} <span className="num">{num}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="pk-nav-head">Direction des Archives</div>
      <ul>
        {ADMIN.map(({ href, label, icon: I, num }) => (
          <li key={href}>
            <NavLink href={href}>
              <I size={16} /> {label} <span className="num">{num}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="note">
        <b>PORKONIA OS</b> v5.0.12
        <br />
        Édition Administrative 2005
        <br />
        <span className="text-[#7a1016]">Licence d&apos;État n°PK-1998-0012</span>
        <br />
        Stockage : fichier local (V1)
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col">
        <header className="pk-banner">
          <Link href="/" aria-label="Accueil">
            <Emblem size={40} />
          </Link>
          <div className="min-w-0">
            <div className="t1 truncate">République de Porkonia</div>
            <div className="t2 truncate">Ministère des Systèmes Informatiques — PORKONIA OS · Édition Administrative 2005</div>
          </div>
          <div className="well hidden sm:flex">
            <span>Terminal n°012</span>
            <span>Agent : Administrateur</span>
            <Clock />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-2 p-2 md:flex-row md:gap-3 md:p-3">
          <aside className="hidden w-56 shrink-0 md:block">
            <div className="sticky top-3">
              <Nav />
            </div>
          </aside>
          <details className="md:hidden">
            <summary className="pk-btn w-full cursor-pointer list-none">Classeur des modules ▾</summary>
            <div className="mt-1">
              <Nav />
            </div>
          </details>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
        <footer className="pk-footer sticky bottom-0 z-10">
          <span className="flex-1">Prêt. Toute modification est archivée, datée et réversible.</span>
          <span className="hidden sm:inline">Mode : local</span>
          <span className="hidden sm:inline">Porkopédia : non connecté</span>
        </footer>
      </body>
    </html>
  );
}
