"use client";
/** Panneau de configuration : tout se règle, puis s'ajuste. Les réglages agissent vraiment sur le système. */
import { useState } from "react";
import { useOs } from "@/os/context";
import { DELAIS_ECONOMISEUR, type Fond } from "@/os/settings";

const TABS = ["Affichage", "Son", "Citoyenneté", "Système"] as const;
type Tab = (typeof TABS)[number];

export function Config() {
  const { settings, setSettings, str, runAction, signal, user, pack, playSound, showScreensaver } = useOs();
  const [tab, setTab] = useState<Tab>("Affichage");

  const fonds: { v: Fond | "aucun"; label: string }[] = [
    { v: "bouteille", label: str("config.fond.bouteille") },
    { v: "lie", label: str("config.fond.lie") },
    { v: "fondateur", label: str("config.fond.fondateur") },
    { v: "emblemes", label: str("config.fond.emblemes") },
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
              <legend>{str("config.economiseur")}</legend>
              <div className="ligne">
                <span>{str("economiseur.nom")}</span>
                <select className="pk-select" value={settings.economiseur} onChange={(e) => setSettings({ economiseur: Number(e.target.value) })} aria-label={str("config.economiseur")}>
                  {DELAIS_ECONOMISEUR.map((d) => (
                    <option key={d} value={d}>
                      {d === 0 ? str("config.economiseur.jamais") : `${d / 60} min`}
                    </option>
                  ))}
                </select>
                <button className="pk-btn" onClick={showScreensaver} data-testid="config-apercu">
                  {str("config.economiseur.apercu")}
                </button>
              </div>
              <label className="case-a-cocher">
                <input type="checkbox" checked={settings.contenuFenetres} onChange={(e) => setSettings({ contenuFenetres: e.target.checked })} />
                {str("config.contenu")}
              </label>
            </fieldset>
            <fieldset className="pk-fieldset">
              <legend>{str("config.fond")}</legend>
              <div className={`apercu fond-${settings.fond}`} aria-hidden="true" />
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
            <button className="pk-btn" onClick={() => playSound("hymne")}>
              {str("config.hymne.ecouter")}
            </button>
          </fieldset>
        )}
        {tab === "Son" && (
          <fieldset className="pk-fieldset">
            <legend>{str("config.sons")}</legend>
            <label className="case-a-cocher">
              <input type="checkbox" checked={settings.sons} onChange={(e) => setSettings({ sons: e.target.checked })} />
              {str("config.sons")}
            </label>
            <button className="pk-btn" disabled={!settings.sons} onClick={() => playSound("demarrage")}>
              {str("config.sons.tester")}
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
