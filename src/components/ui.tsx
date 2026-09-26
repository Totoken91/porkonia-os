/** Composants d'interface « Édition 2005 » (rendu serveur possible). */
import type { ReactNode } from "react";
import type { ArticleStatus, CanonStatus, MediaCanonStatus } from "@/domain/types";
import { IconError, IconInfo, IconWarning, IconShield } from "./icons";

export function Window({
  title,
  code,
  icon,
  menu,
  toolbar,
  status,
  children,
  className = "",
  bodyClassName = "pk-body",
}: {
  title: ReactNode;
  /** Numéro de formulaire administratif affiché dans la barre de titre (ex. « PK-012 »). */
  code?: string;
  icon?: ReactNode;
  menu?: ReactNode;
  toolbar?: ReactNode;
  status?: ReactNode[];
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`pk-window ${className}`}>
      <header className="pk-titlebar">
        {icon}
        <h1 className="truncate">{title}</h1>
        {code && <span className="code hidden sm:inline">Form. {code}</span>}
        <div className="pk-controls" aria-hidden="true">
          <span className="pk-ctl">⟳</span>
        </div>
      </header>
      {menu && <nav className="pk-menubar">{menu}</nav>}
      {toolbar && <div className="pk-toolbar">{toolbar}</div>}
      <div className={bodyClassName}>{children}</div>
      {status && status.length > 0 && (
        <footer className="pk-statusbar">
          {status.map((s, i) => (
            <span key={i} className={i === 0 ? "flex-1" : ""}>
              {s}
            </span>
          ))}
        </footer>
      )}
    </section>
  );
}

export function Alert({ kind = "warn", children }: { kind?: "warn" | "error" | "ok" | "info"; children: ReactNode }) {
  const Icon = kind === "error" ? IconError : kind === "ok" ? IconShield : kind === "info" ? IconInfo : IconWarning;
  return (
    <div className={`pk-alert ${kind === "warn" ? "" : kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon size={18} className="shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Fieldset({ legend, children, className = "" }: { legend: ReactNode; children: ReactNode; className?: string }) {
  return (
    <fieldset className={`pk-fieldset ${className}`}>
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}

export function DemoBadge({ show }: { show?: boolean }) {
  return show ? <span className="badge demo" title="Donnée de démonstration — non canonique">Démo</span> : null;
}

const ARTICLE_STATUS: Record<ArticleStatus, [string, string]> = {
  brouillon: ["amber", "Brouillon"],
  valide: ["blue", "Validé"],
  publie: ["green", "Publié"],
};
export function ArticleStatusBadge({ status }: { status: ArticleStatus }) {
  const [c, l] = ARTICLE_STATUS[status];
  return <span className={`badge ${c}`}>{l}</span>;
}

const CANON: Record<CanonStatus, [string, string]> = {
  canon: ["green", "Canon"],
  proposition: ["amber", "Proposition"],
  archive: ["grey", "Archive"],
};
export function CanonBadge({ status }: { status: CanonStatus }) {
  const [c, l] = CANON[status];
  return <span className={`badge ${c}`}>{l}</span>;
}

const MEDIA_CANON: Record<MediaCanonStatus, [string, string]> = {
  officiel: ["green", "Officiel"],
  variante: ["blue", "Variante"],
  proposition: ["amber", "Proposition"],
  archive: ["grey", "Archive"],
};
export function MediaCanonBadge({ status }: { status: MediaCanonStatus }) {
  const [c, l] = MEDIA_CANON[status];
  return <span className={`badge ${c}`}>{l}</span>;
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="p-4 text-center text-[#555] italic">{children}</p>;
}

/** Emblème officiel (logo fourni, fichier original conservé dans public/brand/). */
export function Emblem({ size = 32, className = "" }: { size?: number; className?: string }) {
  const src = size <= 32 ? "/brand/embleme-64.png" : size <= 64 ? "/brand/embleme-128.png" : "/brand/embleme-256.png";
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt="Emblème de la République de Porkonia" className={`shrink-0 ${className}`} />;
}

/**
 * Étapes d'une publication, jamais confondues : une publication locale n'est PAS une mise à jour du site.
 */
export function PublicationStages({ p }: { p: import("@/domain/types").Publication }) {
  const v = p.verification;
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className="badge grey" title="Instantané local immuable — le site public n'est pas modifié">Publication locale n°{p.number}</span>
      {p.exportedAt ? <span className="badge blue" title={`Paquet exporté le ${fmtDate(p.exportedAt)}`}>Exportée</span> : <span className="badge grey">Non exportée</span>}
      {p.deployment ? (
        <span className="badge amber" title={`${p.deployment.note} — ${fmtDate(p.deployment.declaredAt)}`}>Déployée (déclaration manuelle)</span>
      ) : (
        <span className="badge grey">Non déployée</span>
      )}
      {v.status === "verifiee" ? (
        <span className="badge green" title={v.note}>Vérifiée — {v.method === "automatique" ? "automatique" : "manuelle"}</span>
      ) : v.status === "echec" ? (
        <span className="badge red" title={v.note}>Échec — vérif. {v.method}</span>
      ) : (
        <span className="badge grey">Non vérifiée</span>
      )}
    </span>
  );
}
