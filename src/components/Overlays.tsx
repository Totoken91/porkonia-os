"use client";
/** Flash infos, boîtes de dialogue, publicités et mises à jour obligatoires. */
import { useEffect, useState } from "react";
import type { ActionRef, Ad, DialogSpec, ForcedUpdate, Toast } from "@/content/types";
import { useOs } from "@/os/context";
import { DialogIcon } from "./Icon";

export interface LiveToast extends Toast {
  key: number;
}

export function Toasts({ toasts, onClose }: { toasts: LiveToast[]; onClose(key: number): void }) {
  const { str } = useOs();
  return (
    <div className="flash-infos" aria-live="polite">
      {toasts.map((t) => (
        <ToastBox key={t.key} t={t} onClose={onClose} label={str("bandeau.flash")} />
      ))}
    </div>
  );
}

function ToastBox({ t, onClose, label }: { t: LiveToast; onClose(key: number): void; label: string }) {
  useEffect(() => {
    const id = setTimeout(() => onClose(t.key), 9000);
    return () => clearTimeout(id);
  }, [t.key, onClose]);
  return (
    <div className="flash" role="status" data-testid="toast">
      <header>
        <span className="etiquette">{label}</span>
        <span>{t.title}</span>
        <button aria-label="Fermer" onClick={() => onClose(t.key)}>
          <svg width="10" height="10" viewBox="0 0 8 8" aria-hidden="true"><path d="M0 0l8 8M8 0L0 8" stroke="currentColor" strokeWidth="1.8" /></svg>
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
    <div className="dialog-layer pub-layer" data-testid="ad">
      <div className="pub" role="dialog" aria-label={ad.headline}>
        <header>
          <span>{ad.sponsor}</span>
          <button className="pk-btn small" disabled={left > 0} onClick={onClose} data-testid="ad-close">
            {left > 0 ? str("pub.fermeture", { s: left }) : str("pub.fermer")}
          </button>
        </header>
        {ad.image && (
          <div className="pub-image">
            <img src={ad.image} alt="" referrerPolicy="no-referrer" />
          </div>
        )}
        <div className="pub-texte">
          <h2>{ad.headline}</h2>
          <p>{ad.body}</p>
          <p className="pub-slogan">{ad.slogan}</p>
          <button className="pub-cta" onClick={onCta}>
            {ad.cta}
          </button>
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
  const pct = Math.round((Math.min(step, update.steps.length) / update.steps.length) * 12);
  return (
    <div className="mise-a-jour" data-testid="update">
      <div className="maj-contenu">
        <small>{update.version}</small>
        <h1>{update.title}</h1>
        <div className="barre-segments">{Array.from({ length: 12 }, (_, i) => <i key={i} className={i < pct ? "on" : undefined} />)}</div>
        {done ? (
          <>
            <p className="maj-outro">{update.outro}</p>
            <button className="pub-cta" onClick={onDone} autoFocus data-testid="update-done">
              {str("maj.continuer")}
            </button>
          </>
        ) : (
          <>
            <p className="maj-etape">{update.steps[step]!.label}…</p>
            <p className="maj-note">{str("maj.patientez")}</p>
          </>
        )}
      </div>
    </div>
  );
}
