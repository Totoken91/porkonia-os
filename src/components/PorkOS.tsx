"use client";
/**
 * Racine de PorkOS : alimentation du moniteur et cycle de vie du poste.
 * Allumage → (ScanDisque si arrêt brutal) → démarrage → connexion → session → fermeture → « vous pouvez éteindre ».
 */
import { useCallback, useEffect, useState } from "react";
import type { ContentPack, UserProfile } from "@/content/types";
import { makeStr, useEcran } from "@/os/context";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "@/os/settings";
import { jouer } from "@/os/sons";
import {activerProfil,profilActif} from '@/os/profilActif';
import { Boot } from "./Boot";
import { Login } from "./Login";
import { Monitor } from "./Monitor";
import { Session } from "./Session";
import { cle } from "@/os/stockage";

type Phase =
  | { kind: "boot" }
  | { kind: "login"; impatient: boolean }
  | { kind: "session"; user: UserProfile; impatient: boolean; sleeping: boolean }
  | { kind: "fermeture"; then: "arret" | "redemarrage" }
  | { kind: "securite" };

/** Marqueur « le système tourne » : s'il survit à une coupure, le prochain démarrage passe par ScanDisque. */
const EN_MARCHE = cle("enMarche");
const lireMarque = () => {
  try {
    return window.localStorage.getItem(EN_MARCHE) === "1";
  } catch {
    return false;
  }
};
const poserMarque = (on: boolean) => {
  try {
    if (on) window.localStorage.setItem(EN_MARCHE, "1");
    else window.localStorage.removeItem(EN_MARCHE);
  } catch {
    /* stockage indisponible : pas de ScanDisque, tant pis */
  }
};

export function PorkOS({ pack }: { pack: ContentPack }) {
  const [phase, setPhase] = useState<Phase>({ kind: "boot" });
  // La machine attend qu'on appuie sur le bouton : ce clic libère aussi le son du navigateur.
  const [power, setPower] = useState(false);
  const [bootId, setBootId] = useState(0);
  const [brutal, setBrutal] = useState<boolean | null>(null);
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const str = makeStr(pack);

  useEffect(() => {
    setSettingsState(loadSettings());
    setBrutal(lireMarque());
  }, []);
  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    saveSettings(s,profilActif()??undefined);
  }, []);

  const bootDone = useCallback((skipped: boolean) => {
    poserMarque(true);
    setPhase({ kind: "login", impatient: skipped });
  }, []);
  const lock = useCallback(() => {activerProfil(null);setPhase({ kind: "login", impatient: false });}, []);
  const sleep = useCallback(() => setPhase((p) => (p.kind === "session" ? { ...p, sleeping: true } : p)), []);
  const fermer = useCallback(
    (then: "arret" | "redemarrage") => {
      if (settings.sons) jouer("arret", settings.hymne / 100);
      activerProfil(null);
      setPhase({ kind: "fermeture", then });
    },
    [settings.sons, settings.hymne],
  );

  useEffect(() => {
    if (phase.kind !== "fermeture") return;
    const t = setTimeout(() => {
      poserMarque(false);
      if (phase.then === "arret") setPhase({ kind: "securite" });
      else {
        setBrutal(false);
        setBootId((n) => n + 1);
        setPhase({ kind: "boot" });
      }
    }, 3200);
    return () => clearTimeout(t);
  }, [phase]);

  const togglePower = () => {
    if (power) {activerProfil(null);setPower(false);setPhase({kind:'boot'});}
    else {
      setBrutal(lireMarque());
      setBootId((n) => n + 1);
      setPhase({ kind: "boot" });
      setPower(true);
    }
  };

  return (
    <Monitor crt={settings.crt} power={power} onPower={togglePower} sons={settings.sons} nette={settings.pixelsNets} affichage={settings.affichage} str={str}>
      {phase.kind === "boot" && brutal !== null && <Boot key={bootId} pack={pack} brutal={brutal} sons={settings.sons} onDone={bootDone} />}
      {phase.kind === "login" && (
        <Login pack={pack} fond={settings.fond} onLogin={(user) => {activerProfil(user.id);setSettingsState(loadSettings(user.id));setPhase({ kind: "session", user, impatient: phase.impatient, sleeping: false });}} />
      )}
      {phase.kind === "session" && (
        <>
          <Session
            key={phase.user.id}
            pack={pack}
            user={phase.user}
            settings={settings}
            setSettings={setSettings}
            impatient={phase.impatient}
            onLock={lock}
            onSleep={sleep}
            onShutdown={() => fermer("arret")}
            onRestart={() => fermer("redemarrage")}
            restaurer={brutal === false}
            veille={phase.sleeping}
          />
          {phase.sleeping && (
            <button className="veille" onClick={() => setPhase({ ...phase, sleeping: false })} data-testid="veille">
              <img src="/brand/embleme-128.png" alt="" />
              <b>{str("veille.titre")}</b>
              <span>{str("veille.texte")}</span>
            </button>
          )}
        </>
      )}
      {phase.kind === "fermeture" && (
        <div className="chargement fermeture" data-testid="fermeture">
          <div className="chargement-centre">
            <img src="/brand/embleme-256.png" alt="" width={120} height={120} />
            <div className="chargement-titre">
              <b>{pack.boot.splash.title}</b>
              <span>{pack.os.edition}</span>
            </div>
            <p className="fermeture-texte">{phase.then === "arret" ? pack.shutdown.closing : pack.shutdown.restarting}</p>
          </div>
        </div>
      )}
      {phase.kind === "securite" && (
        <div className="securite" data-testid="securite">
          <p>{pack.shutdown.safe}</p>
          <EteindrePoche onPower={togglePower} label={str("moniteur.alimentation")} />
        </div>
      )}
    </Monitor>
  );
}

/** Poche : pas de bouton d'alimentation sur un téléphone allumé ; l'écran « vous pouvez éteindre » en porte un. */
function EteindrePoche({ onPower, label }: { onPower(): void; label: string }) {
  const { mode } = useEcran();
  if (mode !== "poche") return null;
  return (
    <button className="bouton-allumer" onClick={onPower} aria-label={label} data-testid="power">
      <svg width="28" height="28" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M3.6 3.2a4 4 0 1 0 4.8 0M6 1.5v4.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </button>
  );
}
