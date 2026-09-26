import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NavLink } from "@/components/nav";
import { Clock } from "@/components/client";
import { AppBar } from "@/components/app-chrome";
import { Emblem } from "@/components/ui";
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
  { href: "/", label: "Tableau de bord", icon: IconDashboard },
  { href: "/personnages", label: "Registre national des individus", icon: IconPerson },
  { href: "/articles", label: "Ministère du Lore", icon: IconScroll },
  { href: "/medias", label: "Bureau des illustrations homologuées", icon: IconCamera },
  { href: "/bible", label: "Bible canonique", icon: IconBook },
  { href: "/contextes", label: "Administration des Contextes IA", icon: IconRobot },
  { href: "/publication", label: "Préfecture des Publications", icon: IconStamp },
];
const TOOLS = [
  { href: "/integrite", label: "Contrôle national d'intégrité", icon: IconShield },
  { href: "/archives", label: "Direction des Archives", icon: IconArchive },
  { href: "/corbeille", label: "Corbeille", icon: IconTrash },
  { href: "/journal", label: "Journal des opérations", icon: IconLog },
];

function Nav() {
  return (
    <div className="space-y-2">
      <nav className="pk-nav" aria-label="Menu principal">
        <div className="pk-nav-head">Menu principal</div>
        <ul>
          {MODULES.map(({ href, label, icon: I }) => (
            <li key={href}>
              <NavLink href={href}>
                <I size={28} className="shrink-0" /> <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <nav className="pk-nav compact" aria-label="Outils et tâches">
        <div className="pk-nav-head">Outils et tâches</div>
        <ul>
          {TOOLS.map(({ href, label, icon: I }) => (
            <li key={href}>
              <NavLink href={href}>
                <I size={18} /> {label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="note">
          <Emblem size={48} className="mx-auto mb-1" />
          <b>PORKONIA OS</b> — Édition Administrative 2005
          <br />
          <i>Licence d&apos;État n°PK-1998-0012</i>
        </div>
      </nav>
    </div>
  );
}

const Republic = (
  <div className="pk-republic hidden lg:flex">
    <Emblem size={72} />
    <div>
      <div className="l1">République de</div>
      <div className="l2">PORKONIA</div>
      <div className="l3">Liberté · Porcité · Bière · Toujours plus</div>
    </div>
  </div>
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20">
          <div className="pk-apptitle">
            <Emblem size={22} />
            <span className="truncate">PORKONIA OS — Administration Centrale</span>
            <span className="right hidden sm:inline">République de Porkonia · Ministère du Lore</span>
          </div>
        </header>
        <div className="hidden md:block">
          <AppBar republic={Republic} />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-2 md:flex-row md:gap-2">
          <aside className="hidden w-60 shrink-0 md:block">
            <div className="sticky top-10">
              <Nav />
            </div>
          </aside>
          <details className="md:hidden">
            <summary className="pk-btn w-full cursor-pointer list-none">Menu principal ▾</summary>
            <div className="mt-1">
              <Nav />
            </div>
          </details>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
        <footer className="pk-footer sticky bottom-0 z-10">
          <span>Utilisateur : administrateur</span>
          <span className="hidden sm:inline">Service : Ministère du Lore</span>
          <span className="hidden flex-1 sm:inline">Base de données : fichier local (porkonia-db.json)</span>
          <span className="hidden md:inline">
            <i className="pk-led" /> Porkopédia : non connecté (publication manuelle)
          </span>
          <span>
            <Clock />
          </span>
        </footer>
      </body>
    </html>
  );
}
