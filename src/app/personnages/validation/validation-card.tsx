"use client";
import { useState } from "react";
import type { CanonStatus } from "@/domain/types";
import { rawOriginalAsPortraitAction, validateCharacterAction } from "@/app/actions";
import { ActionButton } from "@/components/client";

export function ValidationControls({
  id,
  name,
  revision,
  checks,
  initial,
  hasPortrait,
}: {
  id: string;
  name: string;
  revision: number;
  checks: Record<string, string>;
  initial: Record<string, boolean>;
  hasPortrait: boolean;
}) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>(initial);
  const [note, setNote] = useState("");
  const all = Object.keys(checks).every((k) => checklist[k]);
  const act = (decision: CanonStatus, label: string, cls: string, disabled: boolean, message: React.ReactNode) => (
    <ActionButton
      className={cls}
      disabled={disabled}
      action={validateCharacterAction.bind(null, id, decision, note, checklist, revision)}
      confirm={{ title: `Fiche « ${name} »`, message, confirmLabel: label }}
    >
      {label}
    </ActionButton>
  );
  return (
    <div className="space-y-1">
      {Object.entries(checks).map(([k, label]) => (
        <label key={k} className="flex items-start gap-1 text-[12px]">
          <input type="checkbox" checked={!!checklist[k]} onChange={(e) => setChecklist({ ...checklist, [k]: e.target.checked })} /> {label}
        </label>
      ))}
      <input className="pk-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note de validation (obligatoire pour laisser en proposition ou archiver)" />
      <div className="flex flex-wrap gap-1">
        {act("canon", "Valider (canon)", "pk-btn primary small", !all || !hasPortrait, <>La fiche <b>{name}</b> passera au statut <b>canon</b>. Les points de contrôle cochés sont enregistrés avec la date.</>)}
        {act("proposition", "Laisser en proposition", "pk-btn small", !note.trim(), <>La fiche reste « proposition » ; votre note est enregistrée.</>)}
        {act("archive", "Archiver", "pk-btn small danger", !note.trim(), <>La fiche passera au statut « archive » (rien n&apos;est supprimé).</>)}
      </div>
      {!hasPortrait && <p className="text-[11px] text-[#7a0f0f]">Pas de portrait source : validation « canon » impossible.</p>}
    </div>
  );
}

export function UseRawButton({ characterId, rawMediaId }: { characterId: string; rawMediaId: string }) {
  return (
    <ActionButton
      className="pk-btn small amber"
      action={rawOriginalAsPortraitAction.bind(null, characterId, rawMediaId)}
      confirm={{
        title: "Changer le portrait officiel",
        message: <>La photographie brute originale deviendra le portrait officiel. La copie extraite du DOCX reste conservée intacte dans la galerie et l&apos;historique.</>,
        confirmLabel: "Utiliser l'original brut",
        danger: true,
      }}
    >
      Utiliser l&apos;original brut comme portrait…
    </ActionButton>
  );
}
