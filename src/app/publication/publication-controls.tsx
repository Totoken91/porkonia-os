"use client";
import { useState } from "react";
import { declareDeploymentAction, markExportedAction, publishAction, restorePublicationAction, verifyPublicationAction, verifyPublicationAutoAction } from "@/app/actions";
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
              Une <b>publication LOCALE n°{lastNumber + 1}</b> immuable va être créée avec <b>{count} article(s)</b> (+{added} / ~{modified} / −{removed}).
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

export function PublicationRowActions({
  number,
  isLatest,
  exported,
  deployed,
  extractions,
}: {
  number: number;
  isLatest: boolean;
  exported: boolean;
  deployed: boolean;
  extractions: { id: string; label: string }[];
}) {
  const [note, setNote] = useState("");
  const [deployNote, setDeployNote] = useState("");
  const [status, setStatus] = useState<PublicationVerification>("verifiee");
  const [ext, setExt] = useState(extractions[0]?.id ?? "");
  return (
    <div className="flex min-w-72 flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        <span className="text-[11px] font-bold">① Exporter :</span>
        {(["json", "md"] as const).map((f) => (
          <ActionButton
            key={f}
            className="pk-btn small"
            action={markExportedAction.bind(null, number)}
            onDone={(r) => {
              if (r.ok) window.location.href = `/api/publications/${number}${f === "md" ? "?format=md" : ""}`;
            }}
          >
            {f === "json" ? "Paquet JSON" : "Markdown"}
          </ActionButton>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[11px] font-bold">② Déploiement :</span>
        <input className="pk-input !w-44" value={deployNote} onChange={(e) => setDeployNote(e.target.value)} placeholder="Comment / quand (obligatoire)" />
        <ActionButton
          className="pk-btn small"
          disabled={!deployNote.trim()}
          action={declareDeploymentAction.bind(null, number, deployNote)}
          confirm={{
            title: "Déclarer un déploiement",
            message: (
              <>
                Vous déclarez avoir intégré vous-même la publication n°{number} sur Porkopédia (ChatGPT Sites).
                {!exported && (
                  <>
                    <br />
                    <b>Attention :</b> cette publication n&apos;a jamais été exportée depuis Porkonia OS.
                  </>
                )}
                <br />
                Porkonia OS ne peut pas déployer lui-même : ce n&apos;est qu&apos;une déclaration, à vérifier ensuite.
              </>
            ),
            confirmLabel: "Déclarer",
          }}
        >
          Déclarer déployée
        </ActionButton>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[11px] font-bold">③ Vérif. automatique :</span>
        {extractions.length ? (
          <>
            <select className="pk-select !w-44" value={ext} onChange={(e) => setExt(e.target.value)}>
              {extractions.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
            <ActionButton className="pk-btn small" disabled={!deployed || !ext} title={!deployed ? "Déclarez d'abord le déploiement" : undefined} action={verifyPublicationAutoAction.bind(null, number, ext)}>
              Comparer au site
            </ActionButton>
          </>
        ) : (
          <span className="text-[11px]">aucune extraction (npm run porkopedia:extract)</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[11px] font-bold">③ Vérif. manuelle :</span>
        <select className="pk-select !w-auto" value={status} onChange={(e) => setStatus(e.target.value as PublicationVerification)}>
          <option value="verifiee">Conforme</option>
          <option value="echec">Échec constaté</option>
        </select>
        <input className="pk-input !w-40" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Constat (obligatoire)" />
        <ActionButton
          className="pk-btn small"
          disabled={!note.trim() || !deployed}
          action={verifyPublicationAction.bind(null, number, status, note)}
          confirm={{
            title: "Vérification manuelle",
            message: <>Confirmez-vous avoir contrôlé vous-même la publication n°{number} sur le site public ?</>,
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
                Une <b>nouvelle</b> publication locale identique à la n°{number} sera créée. Les publications plus récentes restent conservées, et{" "}
                <b>les articles en cours d&apos;édition ne sont pas modifiés</b>. Le site public n&apos;est pas touché.
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
