"use client";
/** Mes documents : explorateur du système de fichiers du pack, et ses visionneuses. */
import { useEffect, useState } from "react";
import type { FsNode, IconKey } from "@/content/types";
import { Icon } from "@/components/Icon";
import { useOs, useWin } from "@/os/context";
import { childPath, parentPath, resolve, splitPath } from "@/os/fs";

const iconOf = (n: FsNode): IconKey => (n.type === "dossier" ? (n.locked ? "cadenas" : "dossier") : n.type === "texte" ? "texte" : n.type === "image" ? "image" : "navigateur");

export function Fichiers() {
  const { pack, openApp, runAction, str } = useOs();
  const { win, setTitle } = useWin();
  const [path, setPath] = useState(win.args.path ?? "");
  const [sel, setSel] = useState<string | null>(null);
  const node = resolve(pack.filesystem, path);
  const folder = node?.type === "dossier" ? node : null;

  useEffect(() => setTitle(`${folder?.name ?? pack.filesystem.name} — Mes documents`), [folder?.name, pack.filesystem.name, setTitle]);

  const open = (n: FsNode) => {
    const p = childPath(path, n.name);
    if (n.type === "dossier") {
      if (n.locked) runAction({ type: "dialog", dialog: { title: str("fichiers.verrouille"), icon: "erreur", body: n.locked, buttons: [{ label: str("fichiers.verrouille.ok") }] } });
      else {
        setPath(p);
        setSel(null);
      }
    } else if (n.type === "texte") openApp("texte", { path: p });
    else if (n.type === "image") openApp("visionneuse", { path: p });
    else openApp(n.app, n.args);
  };

  return (
    <div className="app-col">
      <div className="pk-toolbar">
        <button className="pk-btn small" disabled={!path} onClick={() => setPath(parentPath(path))}>Dossier parent</button>
        <span className="chemin pk-sunken">
          {[pack.filesystem.name, ...splitPath(path)].join(" › ")}
        </span>
      </div>
      <div className="pk-body fichiers-liste" onClick={(e) => e.target === e.currentTarget && setSel(null)}>
        {folder && folder.children.length === 0 && <p className="note">{str("fichiers.vide")}</p>}
        {folder?.children.map((n) => (
          <button key={n.name} className="fichier" aria-selected={sel === n.name} onClick={(e) => { setSel(n.name); if ((e.nativeEvent as PointerEvent).pointerType === "touch") open(n); }} onDoubleClick={() => open(n)} onKeyDown={(e) => e.key === "Enter" && open(n)} data-testid={`fichier-${n.name}`}>
            <Icon name={iconOf(n)} size={36} />
            <span>{n.name}</span>
          </button>
        ))}
      </div>
      <div className="pk-statusbar">
        <span style={{ flex: 1 }}>{folder ? `${folder.children.length} élément(s)` : ""}</span>
        <span>Poste homologué</span>
      </div>
    </div>
  );
}

export function Texte() {
  const { pack, signal, str } = useOs();
  const { win, setTitle } = useWin();
  const node = resolve(pack.filesystem, win.args.path ?? "");
  const [text, setText] = useState(node?.type === "texte" ? node.content : "");
  useEffect(() => setTitle(`${node?.name ?? "Sans titre"} — Bloc-notes d'État`), [node?.name, setTitle]);
  return (
    <div className="app-col">
      <div className="pk-toolbar">
        <button className="pk-btn small" onClick={() => signal("texte:enregistrer")}>Enregistrer</button>
        {node?.type === "texte" && node.date && <span className="note">Document du {node.date}</span>}
      </div>
      <textarea className="bloc-notes pk-body" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
      <div className="pk-statusbar">
        <span style={{ flex: 1 }}>{str("texte.lectureSeule")}</span>
        <span>{text.split("\n").length} lignes</span>
      </div>
    </div>
  );
}

export function Visionneuse() {
  const { pack } = useOs();
  const { win, setTitle } = useWin();
  const [path, setPath] = useState(win.args.path ?? "");
  const node = resolve(pack.filesystem, path);
  const parent = resolve(pack.filesystem, parentPath(path));
  const siblings = parent?.type === "dossier" ? parent.children.filter((c) => c.type === "image") : [];
  const i = siblings.findIndex((s) => s.name === node?.name);
  useEffect(() => setTitle(`${node?.name ?? "Image"} — Visionneuse`), [node?.name, setTitle]);
  const step = (d: number) => {
    const n = siblings[(i + d + siblings.length) % siblings.length];
    if (n) setPath(childPath(parentPath(path), n.name));
  };
  return (
    <div className="app-col">
      <div className="pk-toolbar">
        <button className="pk-btn small" disabled={siblings.length < 2} onClick={() => step(-1)}>◂ Précédente</button>
        <button className="pk-btn small" disabled={siblings.length < 2} onClick={() => step(1)}>Suivante ▸</button>
        <span className="note">{siblings.length ? `${i + 1} / ${siblings.length}` : ""}</span>
      </div>
      <div className="pk-body visionneuse">
        {node?.type === "image" ? (
          <figure>
            <img src={node.src} alt={node.caption ?? node.name} referrerPolicy="no-referrer" />
            {node.caption && <figcaption>{node.caption}</figcaption>}
          </figure>
        ) : (
          <p className="note">Image introuvable.</p>
        )}
      </div>
    </div>
  );
}
