"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { backupAction } from "@/app/actions";
import { IconArchive, IconBook, IconCamera, IconExport, IconPerson, IconRobot, IconScroll, IconShield, IconStamp } from "./icons";

type Item = { label: string; href?: string; onClick?: () => void; sep?: boolean };

function Menu({ label, items }: { label: string; items: Item[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => ref.current?.removeAttribute("open");
  return (
    <details ref={ref} onMouseLeave={close}>
      <summary>{label}</summary>
      <div className="drop">
        {items.map((it, i) =>
          it.sep ? (
            <hr key={i} />
          ) : it.href ? (
            <Link key={i} href={it.href} onClick={close}>
              {it.label}
            </Link>
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => {
                close();
                it.onClick?.();
              }}
            >
              {it.label}
            </button>
          ),
        )}
      </div>
    </details>
  );
}

function BigTool({ icon, label, href, onClick, disabled }: { icon: ReactNode; label: string; href?: string; onClick?: () => void; disabled?: boolean }) {
  return href ? (
    <Link href={href} className="pk-bigtool">
      {icon}
      {label}
    </Link>
  ) : (
    <button type="button" className="pk-bigtool" onClick={onClick} disabled={disabled}>
      {icon}
      {label}
    </button>
  );
}

export function AppBar({ republic }: { republic: ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const backup = () =>
    start(async () => {
      const r = await backupAction();
      setMsg(r.ok ? "Sauvegarde vérifiée ✓" : `Échec : ${r.error}`);
      router.refresh();
      setTimeout(() => setMsg(null), 4000);
    });
  const download = (href: string) => () => {
    window.location.href = href;
  };
  return (
    <div className="pk-appbar">
      <div className="min-w-0 flex-1">
        <nav className="pk-menus" aria-label="Menus">
          <Menu
            label="Fichier"
            items={[
              { label: "Nouvel article", href: "/articles/nouveau" },
              { label: "Nouvelle fiche individuelle", href: "/personnages/nouveau" },
              { label: "Référencer un média", href: "/medias?nouveau=1" },
              { sep: true, label: "" },
              { label: "Créer une sauvegarde", onClick: backup },
              { label: "Exporter tout (JSON)", onClick: download("/api/export") },
            ]}
          />
          <Menu
            label="Registres"
            items={[
              { label: "Registre des individus", href: "/personnages" },
              { label: "Ministère du Lore (articles)", href: "/articles" },
              { label: "Archives audiovisuelles", href: "/medias" },
              { label: "Bible canonique", href: "/bible" },
            ]}
          />
          <Menu
            label="Publication"
            items={[
              { label: "Préfecture des Publications", href: "/publication" },
              { label: "Dernière publication (API publique)", onClick: download("/api/public/v1/publications/latest") },
            ]}
          />
          <Menu
            label="Outils"
            items={[
              { label: "Administration des Contextes IA", href: "/contextes" },
              { label: "Contrôle national d'intégrité", href: "/integrite" },
              { label: "Vérifier les liens médias", href: "/medias?lien=jamais" },
            ]}
          />
          <Menu
            label="Importations"
            items={[
              { label: "Bureau des Importations", href: "/import" },
              { label: "Importer la Bible visuelle (DOCX)", href: "/import#bible" },
            ]}
          />
          <Menu
            label="Archives"
            items={[
              { label: "Sauvegardes & exports", href: "/archives" },
              { label: "Corbeille", href: "/corbeille" },
              { label: "Journal des opérations", href: "/journal" },
            ]}
          />
          <Menu label="?" items={[{ label: "À propos de PORKONIA OS", href: "/a-propos" }]} />
        </nav>
        <div className="pk-bigtools">
          <BigTool icon={<IconScroll size={28} />} label="Article" href="/articles/nouveau" />
          <BigTool icon={<IconPerson size={28} />} label="Individu" href="/personnages/nouveau" />
          <BigTool icon={<IconCamera size={28} />} label="Médias" href="/medias" />
          <BigTool icon={<IconBook size={28} />} label="Bible" href="/bible" />
          <BigTool icon={<IconRobot size={28} />} label="Contexte IA" href="/contextes" />
          <BigTool icon={<IconStamp size={28} />} label="Publier" href="/publication" />
          <BigTool icon={<IconShield size={28} />} label="Intégrité" href="/integrite" />
          <BigTool icon={<IconArchive size={28} />} label={pending ? "…" : "Sauvegarder"} onClick={backup} disabled={pending} />
          <BigTool icon={<IconExport size={28} />} label="Exporter" onClick={download("/api/export")} />
          {msg && <span className="self-center px-2 text-[11px] font-bold text-[#1f4a1a]">{msg}</span>}
        </div>
      </div>
      {republic}
    </div>
  );
}
