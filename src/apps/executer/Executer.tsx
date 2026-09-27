"use client";
/** Boîte « Exécuter… » : ouvre un programme par son nom (alias du pack), sinon refuse poliment. */
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { useOs, useWin } from "@/os/context";

export function resolveCommand(cmd: string, aliases: Record<string, { app: string; args?: Record<string, string> }>, apps: { id: string; title: string }[]) {
  const k = cmd.trim().toLowerCase().replace(/\.exe$/, "").replace(/\s+/g, "");
  if (!k) return null;
  if (aliases[k]) return aliases[k];
  const app = apps.find((a) => a.id === k || a.title.toLowerCase().replace(/\s+/g, "") === k);
  return app ? { app: app.id } : null;
}

export function Executer() {
  const { pack, str, openApp, runAction } = useOs();
  const { close } = useWin();
  const [cmd, setCmd] = useState("");
  const ok = () => {
    const hit = resolveCommand(cmd, pack.run.aliases, pack.apps);
    if (hit) {
      close();
      openApp(hit.app, hit.args);
    } else if (cmd.trim())
      runAction({ type: "dialog", dialog: { title: str("executer.introuvable"), icon: "erreur", body: pack.run.notFound.replace("{cmd}", cmd.trim()), buttons: [{ label: "OK" }] } });
  };
  return (
    <form
      className="app-col executer"
      onSubmit={(e) => {
        e.preventDefault();
        ok();
      }}
    >
      <div className="executer-haut">
        <Icon name="executer" size={32} />
        <p>{pack.run.prompt}</p>
      </div>
      <label className="executer-champ">
        <span>{str("executer.ouvrir")}</span>
        <input className="pk-input" value={cmd} onChange={(e) => setCmd(e.target.value)} autoFocus list="executer-historique" data-testid="executer-champ" spellCheck={false} />
        <datalist id="executer-historique">
          {Object.keys(pack.run.aliases).map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </label>
      <div className="executer-boutons">
        <button type="submit" className="pk-btn primary">{str("executer.ok")}</button>
        <button type="button" className="pk-btn" onClick={close}>{str("executer.annuler")}</button>
        <button type="button" className="pk-btn" disabled>{str("executer.parcourir")}</button>
      </div>
    </form>
  );
}
