"use client";
/** Boîte « Exécuter… » : ouvre un programme par son nom (alias du pack), sinon refuse poliment. */
import { useState } from "react";
import type { ActionRef } from "@/content/types";
import { Icon } from "@/components/Icon";
import { useOs, useWin } from "@/os/context";

type Cible = { app: string; args?: Record<string, string> } | { action: ActionRef };

export function resolveCommand(cmd: string, aliases: Record<string, Cible>, apps: { id: string; title: string }[]): Cible | null {
  const brut = cmd.trim().toLowerCase().replace(/\s+/g, " ").replace(/\.exe$/, "");
  const k = brut.replace(/\s+/g, "");
  if (!k) return null;
  if (aliases[brut]) return aliases[brut];
  if (aliases[k]) return aliases[k];
  const app = apps.find((a) => a.id === k || a.title.toLowerCase().replace(/\s+/g, "") === k);
  return app ? { app: app.id } : null;
}

const CLE_HISTORIQUE = "porkos.executer.historique";

export function Executer() {
  const { pack, str, openApp, runAction, signal } = useOs();
  const { close } = useWin();
  const [cmd, setCmd] = useState("");
  // Historique des commandes tapées (comme la liste d'Exécuter d'époque) : c'est là que réapparaissent les secrets trouvés.
  const [historique, setHistorique] = useState<string[]>(() => {
    try {
      const v = JSON.parse(window.localStorage.getItem(CLE_HISTORIQUE) ?? "[]");
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 12) : [];
    } catch {
      return [];
    }
  });
  const ok = () => {
    const hit = resolveCommand(cmd, pack.run.aliases, pack.apps);
    if (hit) {
      close();
      const c = cmd.trim().toLowerCase();
      const h = [c, ...historique.filter((x) => x !== c)].slice(0, 12);
      setHistorique(h);
      try {
        window.localStorage.setItem(CLE_HISTORIQUE, JSON.stringify(h));
      } catch {
        /* historique non retenu */
      }
      signal(`executer:${c}`);
      if (pack.run.secretes.includes(c)) signal("executer:secret");
      if ("action" in hit) runAction(hit.action);
      else openApp(hit.app, hit.args);
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
          {[...historique, ...Object.keys(pack.run.aliases).filter((a) => !pack.run.secretes.includes(a) && !historique.includes(a))].map((a) => (
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
