"use client";
/** Panneau de configuration : tout se règle, puis s'ajuste. Les réglages agissent vraiment sur le système. */
import { useState } from "react";
import { useOs } from "@/os/context";
import type { Fond } from "@/os/settings";

const TABS = ["Affichage", "Son", "Citoyenneté", "Système"] as const;
type Tab = (typeof TABS)[number];

/** Hymne national (extrait réglementaire de douze notes), joué au synthétiseur d'État. */
function playHymne(volume: number) {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const notes = [392, 392, 523, 523, 587, 523, 494, 440, 392, 440, 494, 523];
  const dur = [0.3, 0.15, 0.45, 0.3, 0.3, 0.3, 0.3, 0.3, 0.45, 0.15, 0.3, 0.9];
  let t = ctx.currentTime + 0.05;
  notes.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12 * (volume / 100), t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur[i]! * 0.95);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur[i]!);
    t += dur[i]!;
  });
  setTimeout(() => void ctx.close(), (t - ctx.currentTime + 0.3) * 1000);
}

export function Config() {
  const { settings, setSettings, str, runAction, signal, user, pack } = useOs();
  const [tab, setTab] = useState<Tab>("Affichage");

  const fonds: { v: Fond | "aucun"; label: string }[] = [
    { v: "affiche", label: str("config.fond.affiche") },
    { v: "mire", label: str("config.fond.mire") },
    { v: "trame", label: str("config.fond.trame") },
    { v: "aucun", label: str("config.fond.aucun") },
  ];

  return (
    <div className="app-col config">
      <div className="pk-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" className="pk-tab" aria-selected={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="pk-tabpanel pk-body" role="tabpanel">
        {tab === "Affichage" && (
          <>
            <fieldset className="pk-fieldset">
              <legend>{str("config.luminosite")}</legend>
              <input
                type="range"
                min={0}
                max={100}
                value={100}
                aria-label={str("config.luminosite")}
                data-testid="config-luminosite"
                onChange={(e) => {
                  if (Number(e.target.value) < 100) runAction({ type: "dialog-ref", id: "fondateur-luminosite" });
                }}
              />
              <span className="valeur">100 %</span>
              <p className="note">{str("config.luminosite.note")}</p>
            </fieldset>
            <fieldset className="pk-fieldset">
              <legend>{str("config.crt")}</legend>
              <input type="range" min={12} max={100} value={settings.crt} onChange={(e) => setSettings({ crt: Number(e.target.value) })} aria-label={str("config.crt")} />
              <span className="valeur">{settings.crt} %</span>
              <p className="note">{str("config.crt.note")}</p>
            </fieldset>
            <fieldset className="pk-fieldset">
              <legend>{str("config.fond")}</legend>
              {fonds.map((f) => (
                <label key={f.v} className="case-a-cocher">
                  <input type="radio" name="fond" disabled={f.v === "aucun"} checked={settings.fond === f.v} onChange={() => f.v !== "aucun" && setSettings({ fond: f.v })} />
                  {f.label}
                </label>
              ))}
            </fieldset>
          </>
        )}
        {tab === "Son" && (
          <fieldset className="pk-fieldset">
            <legend>{str("config.hymne")}</legend>
            <input type="range" min={12} max={100} value={settings.hymne} onChange={(e) => setSettings({ hymne: Number(e.target.value) })} aria-label={str("config.hymne")} />
            <span className="valeur">{settings.hymne} %</span>
            <p className="note">{str("config.hymne.note")}</p>
            <button className="pk-btn" onClick={() => playHymne(settings.hymne)}>
              {str("config.hymne.ecouter")}
            </button>
          </fieldset>
        )}
        {tab === "Citoyenneté" && (
          <>
            {user.porkId ? (
              <fieldset className="pk-fieldset">
                <legend>Pork ID</legend>
                <dl className="fiche">
                  <dt>Titulaire</dt>
                  <dd>{user.displayName}</dd>
                  <dt>Numéro</dt>
                  <dd>{user.porkId.numero}</dd>
                  <dt>Niveau de banquet</dt>
                  <dd>{user.porkId.niveauBanquet}</dd>
                  <dt>Profession</dt>
                  <dd>{user.porkId.profession}</dd>
                  <dt>Délivrance</dt>
                  <dd>{user.porkId.delivrance}</dd>
                </dl>
                <button className="pk-btn" onClick={() => runAction({ type: "dialog-ref", id: "niveau-banquet" })}>
                  {str("config.niveau")}
                </button>
              </fieldset>
            ) : (
              <p className="note">{pack.login.guestNotice}</p>
            )}
            <fieldset className="pk-fieldset">
              <legend>{str("config.langue")}</legend>
              <select className="pk-select" defaultValue="fr" aria-label={str("config.langue")}>
                <option value="fr">{str("config.langue.fr")}</option>
                <option value="groinique" disabled>
                  {str("config.langue.groinique")}
                </option>
              </select>
            </fieldset>
            <fieldset className="pk-fieldset">
              <legend>Confidentialité</legend>
              <label className="case-a-cocher">
                <input type="checkbox" checked disabled readOnly />
                {str("config.confidentialite")}
              </label>
              <p className="note">{str("config.confidentialite.note")}</p>
            </fieldset>
          </>
        )}
        {tab === "Système" && (
          <>
            <fieldset className="pk-fieldset">
              <legend>Notifications</legend>
              <label className="case-a-cocher">
                <input
                  type="checkbox"
                  checked={settings.rappels}
                  data-testid="config-rappels"
                  onChange={(e) => {
                    setSettings({ rappels: e.target.checked });
                    if (!e.target.checked) signal("config:rappels-off");
                  }}
                />
                {str("config.rappels")}
              </label>
            </fieldset>
            <fieldset className="pk-fieldset">
              <legend>Mises à jour</legend>
              <button className="pk-btn" onClick={() => runAction({ type: "update", id: "maj-manuelle" })} data-testid="config-maj">
                {str("config.maj")}
              </button>
            </fieldset>
            <fieldset className="pk-fieldset apropos">
              <legend>À propos</legend>
              <img src="/brand/embleme-128.png" alt="" width={64} height={64} />
              <p>
                <b>
                  {pack.os.name} {pack.os.version} — {pack.os.edition}
                </b>
                <br />
                {pack.os.vendor}
                <br />
                <br />
                {str("config.apropos")}
              </p>
            </fieldset>
          </>
        )}
      </div>
    </div>
  );
}
