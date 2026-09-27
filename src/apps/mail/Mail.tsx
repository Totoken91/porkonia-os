"use client";
/**
 * Courrier d'État : client de messagerie d'époque. Dossiers à gauche, liste des messages, volet de lecture,
 * rédaction dans la même fenêtre. Le contenu (messages, réponses automatiques) vient du pack.
 */
import { useEffect, useRef, useState } from "react";
import type { Mail as Message } from "@/content/types";
import { Icon } from "@/components/Icon";
import { useMenuCommands, useOs, useWin } from "@/os/context";
import { resolve } from "@/os/fs";
import { DOSSIERS, displayName, forward, inFolder, reply, unread, type Brouillon, type Dossier } from "@/os/mailbox";

type Redaction = Brouillon & { draftId?: string };

export function Mail() {
  const { pack, str, mail, openApp, runAction } = useOs();
  const { setTitle } = useWin();
  const { boite } = mail;
  const [dossier, setDossier] = useState<Dossier>("reception");
  const [sel, setSel] = useState<string | null>(null);
  const [redac, setRedac] = useState<Redaction | null>(null);
  const [statut, setStatut] = useState<string | null>(null);
  const liste = inFolder(boite, dossier);
  const courant = liste.find((m) => m.id === sel) ?? null;
  const releve = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setTitle(redac ? `${redac.subject || "Nouveau message"} — Courrier d'État` : `${str(`courrier.dossier.${dossier}`)} — Courrier d'État`), [redac, dossier, str, setTitle]);
  useEffect(() => () => void (releve.current && clearTimeout(releve.current)), []);

  const choisir = (m: Message | null) => {
    setSel(m?.id ?? null);
    if (m && !m.read) mail.lire(m.id);
  };
  const ouvrirDossier = (d: Dossier) => {
    setDossier(d);
    setSel(null);
    setRedac(null);
  };
  const supprimer = () => {
    if (!courant) return;
    if (dossier === "corbeille") {
      runAction({ type: "dialog", dialog: { title: str("courrier.dossier.corbeille"), icon: "attention", body: str("courrier.corbeille.refus"), buttons: [{ label: "Bien sûr" }] } });
      return;
    }
    const i = liste.findIndex((m) => m.id === courant.id);
    const suivant = liste[i + 1] ?? liste[i - 1] ?? null;
    mail.deplacer(courant.id, "corbeille");
    choisir(suivant);
  };
  const rediger = (d: Redaction) => {
    setRedac(d);
    setStatut(null);
  };
  const relever = () => {
    const avant = unread(boite);
    setStatut(str("courrier.releve.encours"));
    mail.relever();
    releve.current = setTimeout(() => setStatut((s) => (s === str("courrier.releve.encours") ? (unread(boite) > avant ? null : str("courrier.releve.rien")) : s)), 1400);
  };
  const envoyer = () => {
    if (!redac) return;
    if (!redac.to.trim()) {
      runAction({ type: "dialog", dialog: { title: str("courrier.envoyer"), icon: "erreur", body: str("courrier.destinataire.vide"), buttons: [{ label: "OK" }] } });
      return;
    }
    mail.envoyer({ to: redac.to, subject: redac.subject, body: redac.body }, redac.draftId);
    setRedac(null);
    setStatut(str("courrier.envoye"));
    setDossier("envoyes");
    setSel(null);
  };
  const enregistrer = () => {
    if (!redac) return;
    const id = mail.brouillon({ to: redac.to, subject: redac.subject, body: redac.body }, redac.draftId);
    setRedac(null);
    setDossier("brouillons");
    setSel(id);
  };
  const ouvrirPJ = (chemin: string) => {
    const n = resolve(pack.filesystem, chemin);
    if (n?.type === "image") openApp("visionneuse", { path: chemin });
    else if (n?.type === "texte") openApp("texte", { path: chemin });
  };
  const peutRepondre = !!courant && dossier !== "brouillons";

  useMenuCommands(
    {
      "mail.nouveau": () => rediger({ to: "", subject: "", body: `\n\n${pack.mailbox.signature}` }),
      "mail.supprimer": supprimer,
      "mail.lu": () => courant && mail.lire(courant.id, true),
      "mail.nonlu": () => courant && mail.lire(courant.id, false),
      "mail.dossier": (d) => d && DOSSIERS.includes(d as Dossier) && ouvrirDossier(d as Dossier),
      "mail.repondre": () => courant && rediger(reply(courant, pack.mailbox.signature)),
      "mail.transferer": () => courant && rediger(forward(courant, pack.mailbox.signature)),
      "mail.relever": relever,
    },
    {
      ...Object.fromEntries(DOSSIERS.map((d) => [`mail.dossier:${d}`, { checked: d === dossier && !redac }])),
      "mail.supprimer": { disabled: !courant || !!redac },
      "mail.lu": { disabled: !courant || !!redac },
      "mail.nonlu": { disabled: !courant || !!redac },
      "mail.repondre": { disabled: !peutRepondre || !!redac },
      "mail.transferer": { disabled: !peutRepondre || !!redac },
    },
  );

  const colonneDe = dossier === "envoyes" || dossier === "brouillons" ? "courrier.a" : "courrier.de";

  return (
    <div className="app-col courrier">
      <div className="pk-toolbar courrier-outils">
        <button className="pk-btn outil" onClick={() => rediger({ to: "", subject: "", body: `\n\n${pack.mailbox.signature}` })} data-testid="courrier-nouveau">
          <Icon name="mail" size={16} />
          {str("courrier.nouveau")}
        </button>
        <button className="pk-btn outil" disabled={!peutRepondre || !!redac} onClick={() => courant && rediger(reply(courant, pack.mailbox.signature))} data-testid="courrier-repondre">
          {str("courrier.repondre")}
        </button>
        <button className="pk-btn outil" disabled={!peutRepondre || !!redac} onClick={() => courant && rediger(forward(courant, pack.mailbox.signature))}>
          {str("courrier.transferer")}
        </button>
        <button className="pk-btn outil" disabled={!courant || !!redac} onClick={supprimer}>
          <Icon name="poubelle" size={16} />
          {str("courrier.supprimer")}
        </button>
        <span className="separateur-outils" />
        <button className="pk-btn outil" onClick={relever} data-testid="courrier-relever">
          {str("courrier.relever")}
        </button>
      </div>

      <div className="courrier-corps">
        <ul className="courrier-dossiers pk-sunken" role="tree" aria-label="Dossiers">
          {DOSSIERS.map((d) => {
            const n = d === "brouillons" ? inFolder(boite, d).length : unread(boite, d);
            return (
              <li key={d}>
                <button role="treeitem" aria-selected={d === dossier && !redac} onClick={() => ouvrirDossier(d)} data-testid={`courrier-dossier-${d}`}>
                  <Icon name={d === "corbeille" ? "poubelle" : d === "reception" ? "mail" : "dossier"} size={16} />
                  <span className={n > 0 && d !== "brouillons" ? "gras" : undefined}>
                    {str(`courrier.dossier.${d}`)}
                    {n > 0 && ` (${n})`}
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <button role="treeitem" onClick={() => runAction({ type: "dialog", dialog: { title: str("courrier.surveille"), icon: "sceau", body: str("courrier.surveille.texte"), buttons: [{ label: "Évidemment" }] } })}>
              <Icon name="cadenas" size={16} />
              <span>{str("courrier.surveille")}</span>
            </button>
          </li>
        </ul>

        {redac ? (
          <form
            className="courrier-redaction"
            onSubmit={(e) => {
              e.preventDefault();
              envoyer();
            }}
          >
            <label>
              <span>{str("courrier.a")} :</span>
              <input className="pk-input" value={redac.to} onChange={(e) => setRedac({ ...redac, to: e.target.value })} autoFocus={!redac.to} data-testid="courrier-a" />
            </label>
            <label>
              <span>{str("courrier.objet")} :</span>
              <input className="pk-input" value={redac.subject} onChange={(e) => setRedac({ ...redac, subject: e.target.value })} data-testid="courrier-objet" />
            </label>
            <textarea className="pk-input courrier-texte" value={redac.body} onChange={(e) => setRedac({ ...redac, body: e.target.value })} autoFocus={!!redac.to} spellCheck={false} />
            <div className="courrier-actions">
              <button type="submit" className="pk-btn primary" data-testid="courrier-envoyer">
                {str("courrier.envoyer")}
              </button>
              <button type="button" className="pk-btn" onClick={enregistrer}>
                {str("courrier.brouillon")}
              </button>
              <button type="button" className="pk-btn" onClick={() => setRedac(null)}>
                {str("courrier.annuler")}
              </button>
            </div>
          </form>
        ) : (
          <div className="courrier-droite">
            <div
              className="courrier-liste pk-sunken"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                e.preventDefault();
                const i = liste.findIndex((m) => m.id === sel);
                const next = liste[e.key === "ArrowDown" ? Math.min(liste.length - 1, i + 1) : Math.max(0, i - 1)];
                if (next) choisir(next);
              }}
              data-testid="courrier-liste"
            >
              <table>
                <thead>
                  <tr>
                    <th className="col-icone" />
                    <th>{str(colonneDe)}</th>
                    <th>{str("courrier.objet")}</th>
                    <th className="col-date">{str("courrier.date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {liste.map((m) => (
                    <tr
                      key={m.id}
                      aria-selected={m.id === sel}
                      className={m.read ? undefined : "non-lu"}
                      onClick={() => choisir(m)}
                      onDoubleClick={() => dossier === "brouillons" && rediger({ to: m.to, subject: m.subject, body: m.body, draftId: m.id })}
                      data-testid={`courrier-message-${m.id}`}
                    >
                      <td className="col-icone">
                        <span className={`enveloppe${m.read ? " ouverte" : ""}`} aria-hidden="true" />
                        {m.attachments?.length ? <span className="trombone" title={str("courrier.pj")} aria-hidden="true" /> : null}
                      </td>
                      <td>{displayName(colonneDe === "courrier.a" ? m.to : m.from)}</td>
                      <td>{m.subject}</td>
                      <td className="col-date">{m.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {liste.length === 0 && <p className="note courrier-vide">{str("courrier.vide")}</p>}
            </div>

            <div className="courrier-apercu pk-sunken" data-testid="courrier-apercu">
              {courant ? (
                <>
                  <dl className="courrier-entete">
                    <dt>{str("courrier.de")} :</dt>
                    <dd>{courant.from}</dd>
                    <dt>{str("courrier.a")} :</dt>
                    <dd>{courant.to}</dd>
                    <dt>{str("courrier.objet")} :</dt>
                    <dd className="gras">{courant.subject}</dd>
                  </dl>
                  {courant.attachments?.length ? (
                    <div className="courrier-pj">
                      <span>{str("courrier.pj")} :</span>
                      {courant.attachments.map((a) => {
                        const n = resolve(pack.filesystem, a);
                        const ok = n?.type === "image" || n?.type === "texte";
                        const nomFichier = a.split("/").pop()!;
                        return (
                          <button key={a} className="pj" disabled={!ok} onClick={() => ouvrirPJ(a)} title={ok ? a : str("courrier.pj.confisquee")}>
                            <Icon name={n?.type === "image" ? "image" : "texte"} size={16} />
                            {nomFichier}
                            {!ok && ` ${str("courrier.pj.confisquee")}`}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="courrier-message selectionnable">{courant.body}</div>
                </>
              ) : (
                <p className="note courrier-vide">{str("courrier.aucun")}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pk-statusbar">
        <span style={{ flex: 1 }}>{statut ?? str("courrier.statut", { n: liste.length, nl: unread(boite, dossier) })}</span>
        <span>{pack.mailbox.address.replace(/.*<|>.*/g, "")}</span>
      </div>
    </div>
  );
}
