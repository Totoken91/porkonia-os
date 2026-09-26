import type { Metadata } from "next";
import { Emblem, Window } from "@/components/ui";

export const metadata: Metadata = { title: "À propos" };

export default function About() {
  return (
    <Window title="À propos de PORKONIA OS" code="PK-000-A">
      <div className="flex flex-wrap items-start gap-4">
        <Emblem size={128} />
        <div className="max-w-xl space-y-2 text-[13px] leading-relaxed">
          <p className="text-[18px]" style={{ fontFamily: "var(--font-serif)" }}>
            <b>PORKONIA OS</b> — Édition Administrative 2005
          </p>
          <p>
            Centre de commande éditorial privé de l&apos;univers de Porkonia : articles, personnages, médias référencés, Bible canonique, contextes IA
            et publications. Porkonia OS est la source de vérité éditoriale ; Porkopédia reste la vitrine publique.
          </p>
          <p>
            Développé par le Ministère porkoniais des Systèmes Informatiques en 1998, modernisé en 2005, jamais retouché depuis. Toute ressemblance
            avec un logiciel efficace serait fortuite.
          </p>
          <p className="text-[11px]">Documentation : README.md et dossier docs/ du dépôt.</p>
        </div>
      </div>
    </Window>
  );
}
