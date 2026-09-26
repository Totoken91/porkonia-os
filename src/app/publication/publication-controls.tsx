"use client";
import { useState } from "react";
import { publishAction, restorePublicationAction, verifyPublicationAction } from "@/app/actions";
import { ActionButton } from "@/components/client";
import type { PublicationVerification } from "@/domain/types";

export function PublishForm({ count, added, modified, removed, lastNumber }: { count: number; added: number; modified: number; removed: number; lastNumber: number }) {
  const [note, setNote] = useState("");
  const nothing = added + modified + removed === 0;
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="pk-label">Note de publication (motif, contenu, lot éditorial…)</span>
        <input className="pk-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. Lot éditorial n°4 — refonte des institutions" />
      </label>
      <ActionButton
        className="pk-btn primary"
        disabled={count === 0}
        action={publishAction.bind(null, note)}
        confirm={{
          title: "Créer une publication",
          message: (
            <>
              Une <b>publication n°{lastNumber + 1}</b> immuable va être créée avec <b>{count} article(s)</b> (+{added} / ~{modified} / −{removed}).
              {nothing && (
                <>
                  <br />
                  Aucun changement par rapport à la publication précédente.
                </>
              )}
              <br />
              Une sauvegarde complète est faite avant. <b>Porkopédia n&apos;est pas modifié</b> : l&apos;intégration sur le site reste une étape manuelle,
              à vérifier ensuite.
            </>
          ),
          confirmLabel: `Créer la publication n°${lastNumber + 1}`,
        }}
      >
        Créer la publication n°{lastNumber + 1}
      </ActionButton>
    </div>
  );
}

export function PublicationRowActions({ number, isLatest }: { number: number; isLatest: boolean }) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<PublicationVerification>("verifiee");
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1">
        <select className="pk-select !w-auto" value={status} onChange={(e) => setStatus(e.target.value as PublicationVerification)}>
          <option value="verifiee">Vérifiée sur le site</option>
          <option value="echec">Échec constaté</option>
          <option value="non-verifiee">Non vérifiée</option>
        </select>
        <input className="pk-input !w-48" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Constat (obligatoire)" />
        <ActionButton
          className="pk-btn small"
          disabled={!note.trim()}
          action={verifyPublicationAction.bind(null, number, status, note)}
          confirm={{
            title: "Déclarer la vérification",
            message: <>Confirmez-vous avoir contrôlé vous-même la publication n°{number} sur Porkopédia ? Porkonia OS ne peut pas le vérifier automatiquement.</>,
            confirmLabel: "Je confirme",
          }}
        >
          Déclarer
        </ActionButton>
      </div>
      {!isLatest && (
        <ActionButton
          className="pk-btn small amber"
          action={restorePublicationAction.bind(null, number, `Restauration de la publication n°${number}`)}
          confirm={{
            title: "Restaurer une publication antérieure",
            message: (
              <>
                Une <b>nouvelle</b> publication identique à la n°{number} sera créée. Les publications plus récentes restent conservées, et{" "}
                <b>les articles en cours d&apos;édition ne sont pas modifiés</b>.
              </>
            ),
            confirmLabel: `Republier le contenu de la n°${number}`,
            danger: true,
          }}
        >
          Restaurer (republier) la n°{number}…
        </ActionButton>
      )}
    </div>
  );
}
