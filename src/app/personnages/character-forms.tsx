"use client";
import { useState } from "react";
import type { Character, MediaCanonStatus } from "@/domain/types";
import { linkMediaAction, saveCharacter, saveRelations, setPortraitAction, trashAction, type ActionResult } from "@/app/actions";
import { ActionButton, ResultMessage, useVersionedForm } from "@/components/client";
import { MediaCanonBadge } from "@/components/ui";

function Row({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`grid items-start gap-1 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-2 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="pk-label pt-1 sm:text-right">{label}</span>
      {children}
    </label>
  );
}

export function CharacterForm({ character }: { character?: Character }) {
  const { state, formAction: action, pending, formKey, expectedRevision, onChange } = useVersionedForm(saveCharacter, character?.revision);
  const c = character;
  return (
    <>
    <ResultMessage result={state} />
    <form key={formKey} action={action} onChange={onChange} className="space-y-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      {c && <input type="hidden" name="expectedRevision" value={expectedRevision ?? ""} />}
      <fieldset className="pk-fieldset">
        <legend>Identité</legend>
        <div className="grid gap-2 lg:grid-cols-2">
          <Row label="Nom canonique *">
            <input name="canonicalName" required defaultValue={c?.canonicalName} className="pk-input" />
          </Row>
          <Row label="Statut">
            <select name="status" defaultValue={c?.status ?? "proposition"} className="pk-select">
              <option value="canon">Canon (validé)</option>
              <option value="proposition">Proposition non validée</option>
              <option value="archive">Archive (ancienne version)</option>
            </select>
          </Row>
          <Row label="Surnoms">
            <input name="nicknames" defaultValue={c?.nicknames.join(", ")} className="pk-input" placeholder="séparés par des virgules" />
          </Row>
          <Row label="Fonction">
            <input name="role" defaultValue={c?.role} className="pk-input" />
          </Row>
          <Row label="Affiliations">
            <input name="affiliations" defaultValue={c?.affiliations.join(", ")} className="pk-input" placeholder="séparées par des virgules" />
          </Row>
          <Row label="Événements">
            <input name="events" defaultValue={c?.events.join(", ")} className="pk-input" placeholder="séparés par des virgules" />
          </Row>
        </div>
      </fieldset>
      <fieldset className="pk-fieldset">
        <legend>Apparence canonique</legend>
        <p className="mb-1 text-[11px] text-[#4a463d]">
          Référence pour toute génération d&apos;image. Elle n&apos;est jamais remplacée automatiquement : chaque modification crée une révision.
        </p>
        <textarea name="appearance" rows={4} defaultValue={c?.appearance} className="pk-textarea" />
      </fieldset>
      <fieldset className="pk-fieldset">
        <legend>Description et biographie</legend>
        <div className="grid gap-2 lg:grid-cols-2">
          <div>
            <span className="pk-label">Description</span>
            <textarea name="description" rows={6} defaultValue={c?.description} className="pk-textarea" />
          </div>
          <div>
            <span className="pk-label">Biographie</span>
            <textarea name="biography" rows={6} defaultValue={c?.biography} className="pk-textarea" />
          </div>
        </div>
        <div className="mt-2">
          <span className="pk-label">Références narratives (articles, scènes, vidéos… une par ligne)</span>
          <textarea name="narrativeRefs" rows={2} defaultValue={c?.narrativeRefs.join("\n")} className="pk-textarea" />
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button className="pk-btn primary" disabled={pending}>
          {pending ? "Enregistrement…" : c ? `Enregistrer (nouvelle révision ${c.revision + 1})` : "Créer la fiche"}
        </button>
        {c && (
          <ActionButton
            className="pk-btn danger"
            action={trashAction.bind(null, "character", c.id)}
            confirm={{
              title: "Placer dans la corbeille",
              message: (
                <>
                  La fiche <b>{c.canonicalName}</b> sera placée dans la corbeille. Elle ne sera <b>pas</b> supprimée physiquement et pourra être restaurée depuis
                  le module Corbeille.
                </>
              ),
              confirmLabel: "Placer dans la corbeille",
              danger: true,
            }}
          >
            Corbeille…
          </ActionButton>
        )}
      </div>
    </form>
    </>
  );
}

type MediaLite = {
  id: string;
  name: string;
  thumb: string | null;
  canonStatus: MediaCanonStatus;
  ref: string;
  linkedTo: string[];
  nature?: string;
  usage?: string | null;
  role?: { kind: string; confirmed: boolean; basis: string } | null;
};
const ROLE_LABEL: Record<string, [string, string]> = {
  "portrait-source": ["green", "Portrait source"],
  apparait: ["blue", "Apparaît"],
  "lien-article": ["grey", "Illustration de son article"],
  "lien-indirect": ["grey", "Lien indirect"],
};
const ROLE_ORDER = ["portrait-source", "apparait", "lien-article", "lien-indirect"];

export function GalleryPanel({
  character,
  gallery,
  others,
}: {
  character: Pick<Character, "id" | "canonicalName" | "portraitMediaId">;
  gallery: MediaLite[];
  others: MediaLite[];
}) {
  const [pick, setPick] = useState("");
  const portrait = gallery.find((m) => m.id === character.portraitMediaId);
  const picked = others.find((m) => m.id === pick);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <div className="w-44 shrink-0 text-center">
          <div className="pk-label font-bold">Portrait officiel</div>
          {portrait?.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portrait.thumb} alt={portrait.name} className="thumb mx-auto h-56 w-44" />
          ) : (
            <div className="thumb grid h-56 w-44 place-items-center text-[#555]">Aucun portrait homologué</div>
          )}
          {portrait && <div className="mt-1 text-[11px]">{portrait.name}</div>}
        </div>
        <div className="min-w-0 flex-1 text-[11px] leading-relaxed">
          <b>Règles du Bureau des illustrations homologuées :</b>
          <ul className="list-disc pl-5">
            <li>Seul un média au statut « officiel » ET associé à ce personnage peut devenir portrait.</li>
            <li>Un média ne peut être le portrait que d&apos;un seul personnage.</li>
            <li>Remplacer un portrait existant exige une confirmation explicite ; l&apos;ancien reste dans la galerie et l&apos;historique.</li>
            <li>Une génération récente ne remplace jamais automatiquement l&apos;apparence canonique.</li>
          </ul>
        </div>
      </div>

      <fieldset className="pk-fieldset">
        <legend>Galerie ({gallery.length})</legend>
        <p className="mb-1 text-[11px]">
          Chaque image indique son rôle pour ce personnage. Un média peut représenter plusieurs personnages sans devenir leur portrait.{" "}
          <a className="text-[#1d3f8f] underline" href={`/medias/audit?personnage=${character.id}`}>
            Auditer cette galerie…
          </a>
        </p>
        {gallery.length === 0 && <p className="italic">Aucun média associé.</p>}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {[...gallery].sort((a, b) => (a.role ? ROLE_ORDER.indexOf(a.role.kind) : 9) - (b.role ? ROLE_ORDER.indexOf(b.role.kind) : 9)).map((m) => {
            const isPortrait = m.id === character.portraitMediaId;
            return (
              <div key={m.id} className="pk-window !p-2">
                {m.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.thumb} alt={m.name} className="thumb h-32 w-full" loading="lazy" />
                ) : (
                  <div className="thumb grid h-32 place-items-center">Pas d&apos;aperçu</div>
                )}
                <div className="mt-1 truncate font-bold" title={m.name}>
                  <a href={`/medias/${m.id}`} className="text-[#1d3f8f]">{m.name}</a>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <MediaCanonBadge status={m.canonStatus} /> {isPortrait && <span className="badge green">Portrait</span>}
                  {m.nature === "reference-source" && <span className="badge blue">Référence source</span>}
                  {m.role ? (
                    <span className={`badge ${ROLE_LABEL[m.role.kind]?.[0] ?? "grey"}`} title={m.role.basis}>
                      {ROLE_LABEL[m.role.kind]?.[1] ?? m.role.kind}
                      {m.role.kind === "apparait" && !m.role.confirmed ? " ?" : ""}
                    </span>
                  ) : (
                    <span className="badge amber" title="Association importée non auditée">Non audité</span>
                  )}
                  {m.usage === "scene-collective" && <span className="badge grey">Scène collective</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {!isPortrait && (
                    <ActionButton
                      className="pk-btn small"
                      disabled={m.canonStatus !== "officiel" || (portrait?.nature === "reference-source" && m.nature !== "reference-source")}
                      title={
                        m.canonStatus !== "officiel"
                          ? "Média non homologué : passez-le d'abord au statut « officiel »."
                          : portrait?.nature === "reference-source" && m.nature !== "reference-source"
                            ? "Le portrait actuel est une référence source canonique : il ne peut pas être remplacé par une image générée ou de nature inconnue."
                            : undefined
                      }
                      action={setPortraitAction.bind(null, character.id, m.id, !!character.portraitMediaId)}
                      confirm={{
                        title: character.portraitMediaId ? "Remplacer le portrait officiel" : "Définir le portrait officiel",
                        message: character.portraitMediaId ? (
                          <>
                            <b>{character.canonicalName}</b> possède déjà un portrait officiel (<b>{portrait?.name ?? character.portraitMediaId}</b>).
                            <br />
                            Il sera remplacé par <b>{m.name}</b>. L&apos;ancien portrait reste dans la galerie et dans l&apos;historique des révisions.
                          </>
                        ) : (
                          <>
                            <b>{m.name}</b> deviendra le portrait officiel de <b>{character.canonicalName}</b>.
                          </>
                        ),
                        confirmLabel: character.portraitMediaId ? "Remplacer le portrait" : "Homologuer comme portrait",
                        danger: !!character.portraitMediaId,
                      }}
                    >
                      Définir comme portrait
                    </ActionButton>
                  )}
                  {isPortrait ? (
                    <ActionButton
                      className="pk-btn small"
                      action={setPortraitAction.bind(null, character.id, null, true)}
                      confirm={{
                        title: "Retirer le portrait officiel",
                        message: <>Le personnage n&apos;aura plus de portrait officiel. Le média reste dans la galerie.</>,
                        confirmLabel: "Retirer le portrait",
                        danger: true,
                      }}
                    >
                      Retirer le portrait
                    </ActionButton>
                  ) : (
                    <ActionButton
                      className="pk-btn small"
                      action={linkMediaAction.bind(null, m.id, { characterId: character.id }, true)}
                      confirm={{
                        title: "Dissocier le média",
                        message: (
                          <>
                            <b>{m.name}</b> ne sera plus associé à <b>{character.canonicalName}</b>. Le média lui-même n&apos;est pas supprimé.
                          </>
                        ),
                        confirmLabel: "Dissocier",
                      }}
                    >
                      Dissocier
                    </ActionButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="pk-fieldset">
        <legend>Associer un média existant</legend>
        <div className="flex flex-wrap items-center gap-2">
          <select className="pk-select max-w-md" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">— Choisir un média du catalogue —</option>
            {others.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} [{m.canonStatus}] {m.linkedTo.length ? `— déjà associé à : ${m.linkedTo.join(", ")}` : ""}
              </option>
            ))}
          </select>
          {picked && (
            <ActionButton
              className="pk-btn"
              action={linkMediaAction.bind(null, picked.id, { characterId: character.id }, false)}
              onDone={(r) => r.ok && setPick("")}
              confirm={{
                title: "Vérification d'identité du média",
                message: (
                  <>
                    Associer <b>{picked.name}</b> à <b>{character.canonicalName}</b> ?
                    {picked.linkedTo.length > 0 && (
                      <>
                        <br />
                        <b>Attention :</b> ce média est déjà associé à {picked.linkedTo.join(", ")}. Vérifiez qu&apos;il représente bien {character.canonicalName}.
                      </>
                    )}
                    <br />
                    L&apos;association n&apos;en fait pas un portrait officiel.
                  </>
                ),
                confirmLabel: "Associer",
              }}
            >
              Associer à {character.canonicalName}
            </ActionButton>
          )}
          <a href={`/medias?associer=${character.id}`} className="pk-btn">
            Référencer un nouveau média…
          </a>
        </div>
      </fieldset>
    </div>
  );
}

export function RelationsEditor({
  character,
  candidates,
}: {
  character: Pick<Character, "id" | "relations" | "revision">;
  candidates: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState(character.relations.length ? character.relations : [{ targetId: "", kind: "", note: "" }]);
  const update = (i: number, patch: Partial<(typeof rows)[number]>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      <div className="pk-grid-wrap">
        <table className="pk-grid">
          <thead>
            <tr>
              <th>Personnage lié</th>
              <th>Nature de la relation</th>
              <th>Note</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <select className="pk-select" value={r.targetId} onChange={(e) => update(i, { targetId: e.target.value })}>
                    <option value="">—</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    {r.targetId && !candidates.some((c) => c.id === r.targetId) && <option value={r.targetId}>Inconnu ({r.targetId})</option>}
                  </select>
                </td>
                <td>
                  <input className="pk-input" value={r.kind} onChange={(e) => update(i, { kind: e.target.value })} placeholder="ex. rival, mentor…" />
                </td>
                <td>
                  <input className="pk-input" value={r.note ?? ""} onChange={(e) => update(i, { note: e.target.value })} />
                </td>
                <td>
                  <button type="button" className="pk-btn small" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                    Retirer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="pk-btn" onClick={() => setRows([...rows, { targetId: "", kind: "", note: "" }])}>
          + Ajouter une relation
        </button>
        <ActionButton className="pk-btn primary" action={saveRelations.bind(null, character.id, rows, character.revision)}>
          Enregistrer les relations
        </ActionButton>
      </div>
    </div>
  );
}
