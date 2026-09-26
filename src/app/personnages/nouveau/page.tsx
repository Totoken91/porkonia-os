import type { Metadata } from "next";
import { Window } from "@/components/ui";
import { IconPerson } from "@/components/icons";
import { CharacterForm } from "../character-forms";

export const metadata: Metadata = { title: "Nouvelle fiche individuelle" };

export default function NewCharacterPage() {
  return (
    <Window title="Registre national des individus — Nouvelle fiche" code="PK-102" icon={<IconPerson size={18} />}>
      <p className="mb-2 text-[11px]">
        Une fiche créée ici reçoit un identifiant permanent. Par défaut, son statut est « proposition » : elle n&apos;entre au canon qu&apos;après
        validation explicite.
      </p>
      <CharacterForm />
    </Window>
  );
}
