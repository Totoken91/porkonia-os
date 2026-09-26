"use client";
/** Racine de PorkOS : démarrage → connexion → session (→ veille), dans le moniteur 4:3. */
import { useCallback, useEffect, useState } from "react";
import type { ContentPack, UserProfile } from "@/content/types";
import { makeStr } from "@/os/context";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "@/os/settings";
import { Boot } from "./Boot";
import { Login } from "./Login";
import { Monitor } from "./Monitor";
import { Session } from "./Session";

type Phase = { kind: "boot" } | { kind: "login"; impatient: boolean } | { kind: "session"; user: UserProfile; impatient: boolean; sleeping: boolean };

export function PorkOS({ pack }: { pack: ContentPack }) {
  const [phase, setPhase] = useState<Phase>({ kind: "boot" });
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const str = makeStr(pack);

  useEffect(() => setSettingsState(loadSettings()), []);
  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    saveSettings(s);
  }, []);

  const bootDone = useCallback((skipped: boolean) => setPhase({ kind: "login", impatient: skipped }), []);
  const lock = useCallback(() => setPhase({ kind: "login", impatient: false }), []);
  const sleep = useCallback(() => setPhase((p) => (p.kind === "session" ? { ...p, sleeping: true } : p)), []);

  return (
    <Monitor crt={settings.crt} marque={str("ecran.marque")} modele={str("ecran.modele")} rotation={str("ecran.rotation")} continuer={str("ecran.continuer")}>
      {phase.kind === "boot" && <Boot pack={pack} onDone={bootDone} />}
      {phase.kind === "login" && (
        <Login pack={pack} fond={settings.fond} onLogin={(user) => setPhase({ kind: "session", user, impatient: phase.impatient, sleeping: false })} />
      )}
      {phase.kind === "session" && (
        <>
          <Session pack={pack} user={phase.user} settings={settings} setSettings={setSettings} impatient={phase.impatient} onLock={lock} onSleep={sleep} />
          {phase.sleeping && (
            <button className="veille" onClick={() => setPhase({ ...phase, sleeping: false })} data-testid="veille">
              <img src="/brand/embleme-128.png" alt="" />
              <b>{str("veille.titre")}</b>
              <span>{str("veille.texte")}</span>
            </button>
          )}
        </>
      )}
      <div className="balayage" aria-hidden="true" />
    </Monitor>
  );
}
