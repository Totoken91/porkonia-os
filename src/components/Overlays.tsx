"use client";
/** Flash infos, boîtes de dialogue, publicités et mises à jour obligatoires. */
import { useEffect, useState } from "react";
import type { ActionRef, Ad, DialogSpec, ForcedUpdate, Toast } from "@/content/types";
import { useOs } from "@/os/context";
import { DialogIcon } from "./Icon";

export interface LiveToast extends Toast {
  key: number;
}

/** Bulles de notification, au-dessus de la zone de notification. */
export function Toasts({ toasts, onClose }: { toasts: LiveToast[]; onClose(key: number): void }) {
  return (
    <div className="bulles" aria-live="polite">
      {toasts.map((t) => (
        <ToastBox key={t.key} t={t} onClose={onClose} />
      ))}
    </div>
  );
}

function ToastBox({ t, onClose }: { t: LiveToast; onClose(key: number): void }) {
  useEffect(() => {
    const id = setTimeout(() => onClose(t.key), 9000);
    return () => clearTimeout(id);
  }, [t.key, onClose]);
  return (
    <div className="bulle" role="status" data-testid="toast" onClick={() => onClose(t.key)}>
      <header>
        <DialogIcon kind="info" small />
        <b>{t.title}</b>
        <button className="pk-ctl" aria-label="Fermer" onClick={() => onClose(t.key)}>
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M0 0l8 8M8 0L0 8" stroke="currentColor" strokeWidth="1.8" /></svg>
        </button>
      </header>
      <p>{t.body}</p>
    </div>
  );
}

export function DialogBox({ dialog, onAnswer }: { dialog: DialogSpec; onAnswer(then?: ActionRef): void }) {
  return (
    <div className="dialog-layer" data-testid="dialog">
      <div className="pk-window focused" role="alertdialog" aria-label={dialog.title}>
        <header className="pk-titlebar">
          <h2>{dialog.title}</h2>
        </header>
        <div className="dialog-corps">
          <DialogIcon kind={dialog.icon} />
          <p>{dialog.body}</p>
        </div>
        <div className="dialog-boutons">
          {dialog.buttons.map((b, i) => (
            <button key={i} className={`pk-btn${i === 0 ? " primary" : ""}`} autoFocus={i === 0} onClick={() => onAnswer(b.then)}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdBox({ ad, onClose, onCta }: { ad: Ad; onClose(): void; onCta(): void }) {
  const { str } = useOs();
  const [left, setLeft] = useState(ad.closeAfter);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return (
    <div className="dialog-layer" data-testid="ad">
      <div className="pk-window focused pub" role="dialog" aria-label={ad.headline}>
        <header className="pk-titlebar">
          <h2>{str("pub.titre")} — {ad.sponsor}</h2>
          <div className="pk-controls">
            <button className="pk-ctl close" aria-label={str("pub.fermer")} disabled={left > 0} onClick={onClose} data-testid="ad-close">
              <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M0 0l8 8M8 0L0 8" stroke="currentColor" strokeWidth="1.8" /></svg>
            </button>
          </div>
        </header>
        <div className="pub-corps">
          {ad.image && <img src={ad.image} alt="" referrerPolicy="no-referrer" />}
          <div className="pub-texte">
            <h3>{ad.headline}</h3>
            <p>{ad.body}</p>
            <p className="pub-slogan">{ad.slogan}</p>
            <button className="pk-btn primary" onClick={onCta}>
              {ad.cta}
            </button>
          </div>
        </div>
        <div className="pk-statusbar">
          <span style={{ flex: 1 }}>{left > 0 ? str("pub.fermeture", { s: left }) : str("pub.fermer")}</span>
        </div>
      </div>
    </div>
  );
}

export function UpdateScreen({ update, onDone }: { update: ForcedUpdate; onDone(): void }) {
  const { str } = useOs();
  const [step, setStep] = useState(0);
  const done = step >= update.steps.length;
  useEffect(() => {
    if (done) return;
    const id = setTimeout(() => setStep((n) => n + 1), update.steps[step]!.ms);
    return () => clearTimeout(id);
  }, [step, done, update.steps]);
  const blocs = Math.round((Math.min(step, update.steps.length) / update.steps.length) * 24);
  return (
    <div className="dialog-layer mise-a-jour" data-testid="update">
      <div className="pk-window focused maj" role="dialog" aria-label={update.title}>
        <header className="pk-titlebar">
          <h2>{update.title}</h2>
        </header>
        <div className="maj-bandeau">
          <div>
            <b>{update.version}</b>
            <span>{str("maj.patientez")}</span>
          </div>
          <img src="/brand/embleme-64.png" alt="" width={40} height={40} />
        </div>
        <div className="maj-corps">
          {done ? (
            <p className="maj-outro">{update.outro}</p>
          ) : (
            <p className="maj-etape">{update.steps[step]!.label}…</p>
          )}
          <div className="progression pk-sunken">{Array.from({ length: blocs }, (_, i) => <i key={i} />)}</div>
          <ol className="maj-liste">
            {update.steps.map((s, i) => (
              <li key={i} className={i < step ? "fait" : i === step ? "encours" : undefined}>
                {s.label}
              </li>
            ))}
          </ol>
        </div>
        <div className="dialog-boutons">
          <button className="pk-btn primary" disabled={!done} onClick={onDone} data-testid="update-done">
            {str("maj.continuer")}
          </button>
        </div>
      </div>
    </div>
  );
}
