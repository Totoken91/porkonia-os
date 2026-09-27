"use client";
/**
 * Mes documents : explorateur du disque du poste (créer, renommer, couper, copier, coller, supprimer,
 * glisser-déposer entre fenêtres et vers le bureau), vue de la Poubelle d'État, et les visionneuses.
 */
import { useEffect, useRef, useState } from "react";
import type { FsNode } from "@/content/types";
import type { MenuItem } from "@/components/Menu";
import { Icon } from "@/components/Icon";
import { Renommage, iconOf } from "@/components/Fichier";
import { ListeDeroulante } from "@/components/ListeDeroulante";
import { useMenuCommands, useOs, useWin } from "@/os/context";
import { childPath, parentPath, resolve, splitPath } from "@/os/fs";
import { lireFichiers, porteFichiers, porter } from "@/os/glisser";
import { BUREAU, POUBELLE, creer, dossiersEcrivables, ecrire, renommer, restaurer, vider } from "@/os/vfs";

export function Fichiers() {
  const { pack, str, fs, showMenu, runAction, settings, setSettings, signal } = useOs();
  const { win, setTitle } = useWin();
  const [path, setPath] = useState(win.args.path ?? "");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [renomme, setRenomme] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const [clignote, setClignote] = useState(false);
  const liste = useRef<HTMLDivElement>(null);
  const poubelle = path === POUBELLE;
  const node = poubelle ? null : resolve(fs.disque.racine, path);
  const folder = node?.type === "dossier" ? node : null;
  const racine = fs.disque.racine.name;

  useEffect(() => setTitle(`${poubelle ? str("poubelle.titre") : (folder?.name ?? racine)} — ${str("fichiers.titre")}`), [poubelle, folder?.name, racine, setTitle, str]);
  // Un dossier supprimé ou déplacé pendant qu'on le regarde : on remonte au premier parent existant.
  useEffect(() => {
    if (poubelle || folder) return;
    let p = parentPath(path);
    while (p && resolve(fs.disque.racine, p)?.type !== "dossier") p = parentPath(p);
    setPath(p);
  }, [poubelle, folder, path, fs.disque.racine]);

  const aller = (p: string) => {
    setPath(p);
    setSel(new Set());
    setRenomme(null);
    setConfirmer(false);
  };
  const chemins = (noms: Iterable<string>) => [...noms].map((n) => childPath(path, n));
  const selection = () => chemins(sel);

  const ouvrir = (n: FsNode) => {
    const p = childPath(path, n.name);
    if (n.type === "dossier" && !n.locked) aller(p);
    else fs.ouvrir(p);
  };
  const nouveau = (type: "dossier" | "texte") => {
    const r = fs.appliquer((d) =>
      creer(d, path, type === "dossier" ? { type: "dossier", name: str("fichiers.nouveauDossier"), children: [] } : { type: "texte", name: str("fichiers.nouveauTexte"), content: "", date: new Date().toLocaleDateString("fr-FR") }),
    );
    const nom = r?.[0] && splitPath(r[0]).pop();
    if (nom) {
      setSel(new Set([nom]));
      setRenomme(nom);
    }
  };
  const finRenommage = (ancien: string, nouveau: string | null) => {
    setRenomme(null);
    if (nouveau === null || nouveau.trim() === ancien) return;
    const r = fs.appliquer((d) => renommer(d, childPath(path, ancien), nouveau));
    const nom = r?.[0] && splitPath(r[0]).pop();
    if (nom) setSel(new Set([nom]));
  };
  const supprimerSel = () => {
    if (!sel.size) return;
    if (fs.deposer(selection(), POUBELLE)) setSel(new Set());
  };
  const coller = () => {
    const pp = fs.pressePapiers;
    if (!pp || !folder) return;
    const r = fs.deposer(pp.chemins, path, !pp.couper);
    if (r) {
      setSel(new Set(r.map((c) => splitPath(c).pop()!)));
      if (pp.couper) fs.setPressePapiers(null);
    }
  };
  const proprietes = (n: FsNode | null) => {
    const cible = n ?? node;
    if (!cible) return;
    const TYPES = { dossier: "fichiers.type.dossier", texte: "fichiers.type.texte", image: "fichiers.type.image", lien: "fichiers.type.lien" } as const;
    runAction({
      type: "dialog",
      dialog: {
        title: str("prop.titre", { nom: cible.name }),
        icon: "info",
        body: str("fichiers.prop", {
          nom: cible.name,
          type: str(TYPES[cible.type]),
          lieu: [racine, ...splitPath(n ? path : parentPath(path))].join(" › "),
          date: ("date" in cible && cible.date) || "12/12/2012",
        }),
        buttons: [{ label: "OK" }],
      },
    });
  };

  // Les fichiers cachés ne se montrent qu'à qui les demande (menu Affichage).
  const enfants = (folder?.children ?? []).filter((c) => settings.fichiersCaches || !c.cache);
  const choisi = enfants.find((c) => sel.has(c.name)) ?? null;
  const basculerCaches = () => {
    if (!settings.fichiersCaches) {
      runAction({ type: "dialog", dialog: { title: str("fichiers.caches.titre"), icon: "info", body: str("fichiers.caches.corps"), buttons: [{ label: "OK" }] } });
      signal("fichiers:caches");
    }
    setSettings({ fichiersCaches: !settings.fichiersCaches });
  };
  useMenuCommands(
    {
      "fichiers.ouvrir": () => choisi && ouvrir(choisi),
      "fichiers.parent": () => aller(parentPath(path)),
      "fichiers.actualiser": () => {
        setClignote(true);
        setTimeout(() => setClignote(false), 150);
      },
      "fichiers.aller": (p) => {
        if (p === undefined) return;
        if (p === POUBELLE) return aller(p);
        const n = resolve(fs.disque.racine, p);
        if (n?.type === "dossier" && !n.locked) aller(p);
      },
      "fichiers.proprietes": () => proprietes(choisi),
      "fichiers.nouveauDossier": () => nouveau("dossier"),
      "fichiers.nouveauTexte": () => nouveau("texte"),
      "fichiers.supprimer": supprimerSel,
      "fichiers.renommer": () => choisi && setRenomme(choisi.name),
      "fichiers.couper": () => sel.size && fs.setPressePapiers({ chemins: selection(), couper: true }),
      "fichiers.copier": () => sel.size && fs.setPressePapiers({ chemins: selection(), couper: false }),
      "fichiers.coller": coller,
      "fichiers.tout": () => folder && setSel(new Set(enfants.map((c) => c.name))),
      "fichiers.caches": basculerCaches,
    },
    {
      "fichiers.ouvrir": { disabled: !choisi },
      "fichiers.parent": { disabled: !path },
      "fichiers.nouveauDossier": { disabled: !folder },
      "fichiers.nouveauTexte": { disabled: !folder },
      "fichiers.supprimer": { disabled: !sel.size || poubelle },
      "fichiers.renommer": { disabled: sel.size !== 1 || poubelle },
      "fichiers.couper": { disabled: !sel.size || poubelle },
      "fichiers.copier": { disabled: !sel.size || poubelle },
      "fichiers.coller": { disabled: !fs.pressePapiers || !folder },
      "fichiers.caches": { checked: settings.fichiersCaches },
    },
  );

  const clavier = (e: React.KeyboardEvent) => {
    if (renomme) return;
    const k = e.key.toLowerCase();
    if (e.key === "Delete") supprimerSel();
    else if (e.key === "F2" && choisi) setRenomme(choisi.name);
    else if (e.key === "Enter" && choisi) ouvrir(choisi);
    else if (e.key === "Backspace" && path && !poubelle) aller(parentPath(path));
    else if (e.ctrlKey && k === "a" && folder) setSel(new Set(enfants.map((c) => c.name)));
    else if (e.ctrlKey && k === "c" && sel.size) fs.setPressePapiers({ chemins: selection(), couper: false });
    else if (e.ctrlKey && k === "x" && sel.size) fs.setPressePapiers({ chemins: selection(), couper: true });
    else if (e.ctrlKey && k === "v") coller();
    else return;
    e.preventDefault();
  };

  const menuElement = (n: FsNode, at: { clientX: number; clientY: number }) => {
    const items: MenuItem[] = [
      { label: str("ctx.ouvrir"), bold: true, onSelect: () => ouvrir(n) },
      { separator: true },
      { label: str("ctx.couper"), onSelect: () => fs.setPressePapiers({ chemins: selection().length ? selection() : chemins([n.name]), couper: true }) },
      { label: str("ctx.copier"), onSelect: () => fs.setPressePapiers({ chemins: selection().length ? selection() : chemins([n.name]), couper: false }) },
      { separator: true },
      { label: str("ctx.supprimer"), onSelect: supprimerSel },
      { label: str("ctx.renommer"), onSelect: () => setRenomme(n.name) },
      { separator: true },
      { label: str("ctx.proprietes"), onSelect: () => proprietes(n) },
    ];
    showMenu(at, items);
  };
  const menuFond = (at: { clientX: number; clientY: number }) =>
    showMenu(at, [
      { label: str("ctx.nouveauDossier"), onSelect: () => nouveau("dossier") },
      { label: str("ctx.nouveauTexte"), onSelect: () => nouveau("texte") },
      { separator: true },
      { label: str("ctx.coller"), disabled: !fs.pressePapiers, onSelect: coller },
      { separator: true },
      { label: str("ctx.actualiser"), onSelect: () => setClignote(true) },
      { label: str("ctx.proprietes"), onSelect: () => proprietes(null) },
    ]);

  /** Zone qui accepte un dépôt de fichiers (glisser-déposer du navigateur). */
  const depot = (cible: string) => ({
    "data-depot": cible,
    onDragOver: (e: React.DragEvent) => {
      if (!porteFichiers(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move";
      setSurvol(cible);
    },
    onDragLeave: () => setSurvol((s) => (s === cible ? null : s)),
    onDrop: (e: React.DragEvent) => {
      if (!porteFichiers(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      setSurvol(null);
      const r = fs.deposer(lireFichiers(e.dataTransfer), cible, e.ctrlKey);
      if (r && cible === path) setSel(new Set(r.map((c) => splitPath(c).pop()!)));
    },
  });

  if (poubelle) return <VuePoubelle confirmer={confirmer} setConfirmer={setConfirmer} depot={depot(POUBELLE)} survol={survol === POUBELLE} aller={aller} />;

  const coupes = new Set(fs.pressePapiers?.couper ? fs.pressePapiers.chemins : []);
  return (
    <div className="app-col">
      <div className="pk-toolbar">
        <button className="pk-btn small" disabled={!path} onClick={() => aller(parentPath(path))}>
          Dossier parent
        </button>
        <button className="pk-btn small" disabled={!folder} onClick={() => nouveau("dossier")} data-testid="fichiers-nouveau-dossier">
          {str("ctx.nouveauDossier")}
        </button>
        <span className="chemin pk-sunken">{[racine, ...splitPath(path)].join(" › ")}</span>
      </div>
      <div
        ref={liste}
        className={`pk-body fichiers-liste${survol === path ? " depot-survol" : ""}`}
        tabIndex={0}
        onKeyDown={clavier}
        onClick={(e) => e.target === e.currentTarget && setSel(new Set())}
        onContextMenu={(e) => {
          if (e.target !== e.currentTarget) return;
          e.preventDefault();
          setSel(new Set());
          menuFond(e);
        }}
        data-testid="fichiers-liste"
        {...depot(path)}
      >
        {folder && enfants.length === 0 && <p className="note">{str("fichiers.vide")}</p>}
        {!clignote &&
          enfants.map((n) => {
            const p = childPath(path, n.name);
            const estDossier = n.type === "dossier" && !n.locked;
            return (
              <div
                key={n.name}
                role="button"
                tabIndex={-1}
                className={`fichier${coupes.has(p) ? " coupe" : ""}${n.cache ? " cache" : ""}${survol === p ? " depot-survol" : ""}`}
                aria-selected={sel.has(n.name)}
                draggable={renomme !== n.name}
                onDragStart={(e) => {
                  const lot = sel.has(n.name) ? selection() : [p];
                  if (!sel.has(n.name)) setSel(new Set([n.name]));
                  porter(e.dataTransfer, lot);
                }}
                onClick={(e) => {
                  liste.current?.focus({ preventScroll: true });
                  if (e.ctrlKey) {
                    const s2 = new Set(sel);
                    if (s2.has(n.name)) s2.delete(n.name);
                    else s2.add(n.name);
                    setSel(s2);
                  } else setSel(new Set([n.name]));
                }}
                onDoubleClick={() => renomme !== n.name && ouvrir(n)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!sel.has(n.name)) setSel(new Set([n.name]));
                  menuElement(n, e);
                }}
                data-testid={`fichier-${n.name}`}
                {...(estDossier ? depot(p) : {})}
              >
                <Icon name={iconOf(n, pack.apps)} size={32} selected={sel.has(n.name)} />
                {renomme === n.name ? <Renommage nom={n.name} onFin={(v) => finRenommage(n.name, v)} /> : <span>{n.name}</span>}
              </div>
            );
          })}
      </div>
      <div className="pk-statusbar">
        <span style={{ flex: 1 }}>{folder ? str("fichiers.elements", { n: enfants.length }) : ""}</span>
        <span>{sel.size ? str("fichiers.selection", { n: sel.size }) : "Poste homologué"}</span>
      </div>
    </div>
  );
}

function VuePoubelle({
  confirmer,
  setConfirmer,
  depot,
  survol,
  aller,
}: {
  confirmer: boolean;
  setConfirmer(v: boolean): void;
  depot: Record<string, unknown>;
  survol: boolean;
  aller(p: string): void;
}) {
  const { pack, str, fs, runAction } = useOs();
  const [sel, setSel] = useState<number | null>(null);
  const jetes = fs.disque.poubelle;
  const toast = (body: string) => runAction({ type: "toast", toast: { title: str("poubelle.titre"), body } });
  return (
    <div className="app-col">
      <div className="pk-toolbar">
        <button className="pk-btn small" onClick={() => aller("")}>
          {fs.disque.racine.name}
        </button>
        <button
          className="pk-btn small"
          disabled={sel === null}
          onClick={() => {
            if (sel === null) return;
            if (fs.appliquer((d) => restaurer(d, sel))) setSel(null);
          }}
          data-testid="poubelle-restaurer"
        >
          {str("poubelle.restaurer")}
        </button>
        {confirmer ? (
          <>
            <span className="note">{str("poubelle.confirmer")}</span>
            <button
              className="pk-btn small"
              onClick={() => {
                fs.appliquer((d) => ({ ok: true, disque: vider(d), chemins: [] }));
                setConfirmer(false);
                setSel(null);
                toast(str("poubelle.videe"));
              }}
              data-testid="poubelle-oui"
            >
              {str("poubelle.oui")}
            </button>
            <button className="pk-btn small" onClick={() => setConfirmer(false)}>
              {str("poubelle.non")}
            </button>
          </>
        ) : (
          <button className="pk-btn small" disabled={!jetes.length} onClick={() => setConfirmer(true)} data-testid="poubelle-vider">
            {str("poubelle.vider")}
          </button>
        )}
      </div>
      <div className={`pk-body fichiers-liste poubelle-liste${survol ? " depot-survol" : ""}`} data-testid="poubelle-liste" {...depot}>
        {!jetes.length && <p className="note">{str("poubelle.vide")}</p>}
        {jetes.map((j, i) => (
          <div
            key={`${j.node.name}-${i}`}
            role="button"
            tabIndex={-1}
            className="fichier"
            aria-selected={sel === i}
            title={str("poubelle.origine", { lieu: [fs.disque.racine.name, ...splitPath(j.origine)].join(" › "), date: j.date })}
            onClick={() => setSel(i)}
            onDoubleClick={() => fs.appliquer((d) => restaurer(d, i)) && setSel(null)}
            data-testid={`jete-${j.node.name}`}
          >
            <Icon name={iconOf(j.node, pack.apps)} size={32} selected={sel === i} />
            <span>{j.node.name}</span>
          </div>
        ))}
      </div>
      <div className="pk-statusbar">
        <span style={{ flex: 1 }}>{str("fichiers.elements", { n: jetes.length })}</span>
      </div>
    </div>
  );
}

const avecTxt = (nom: string) => (/\.[a-z0-9]{1,4}$/i.test(nom) ? nom : `${nom}.txt`);

export function Texte() {
  const { signal, str, fs } = useOs();
  const { win, setTitle, focused } = useWin();
  const [chemin, setChemin] = useState<string | null>(win.args.path ?? null);
  const node = chemin ? resolve(fs.disque.racine, chemin) : null;
  const [text, setText] = useState(node?.type === "texte" ? node.content : "");
  const [modifie, setModifie] = useState(false);
  const [sous, setSous] = useState<{ nom: string; dossier: string } | null>(null);
  const [retour, setRetour] = useState(true);
  const [statut, setStatut] = useState("");
  const zone = useRef<HTMLTextAreaElement>(null);
  const nom = node?.name ?? str("texte.sansTitre");
  useEffect(() => setTitle(`${modifie ? "*" : ""}${nom} — Bloc-notes d'État`), [nom, modifie, setTitle]);

  const enregistrerSous = () => setSous({ nom: node?.name ?? `${str("texte.sansTitre")}.txt`, dossier: chemin ? parentPath(chemin) : BUREAU });
  const enregistrer = () => {
    signal("texte:enregistrer");
    if (!chemin || node?.type !== "texte") return enregistrerSous();
    if (fs.appliquer((d) => ecrire(d, chemin, text, new Date().toLocaleDateString("fr-FR")))) {
      setModifie(false);
      setStatut(str("texte.enregistre", { lieu: [fs.disque.racine.name, ...splitPath(parentPath(chemin))].join(" › ") }));
    }
  };
  const validerSous = () => {
    if (!sous) return;
    const r = fs.appliquer((d) => creer(d, sous.dossier, { type: "texte", name: avecTxt(sous.nom.trim() || str("texte.sansTitre")), content: text, date: new Date().toLocaleDateString("fr-FR") }));
    if (!r?.[0]) return;
    signal("texte:enregistrer");
    setChemin(r[0]);
    setSous(null);
    setModifie(false);
    setStatut(str("texte.enregistre", { lieu: [fs.disque.racine.name, ...splitPath(sous.dossier)].join(" › ") }));
  };

  // Ctrl+S, quand le Bloc-notes est au premier plan.
  const raccourci = useRef(enregistrer);
  raccourci.current = enregistrer;
  useEffect(() => {
    if (!focused) return;
    const f = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        raccourci.current();
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [focused]);

  useMenuCommands(
    {
      "texte.nouveau": () => {
        setText("");
        setChemin(null);
        setModifie(false);
        setStatut("");
      },
      "texte.enregistrer": enregistrer,
      "texte.enregistrerSous": enregistrerSous,
      "texte.tout": () => zone.current?.select(),
      "texte.date": () => {
        const el = zone.current;
        const stamp = new Date().toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
        const at = el ? el.selectionStart : text.length;
        const end = el ? el.selectionEnd : text.length;
        setText(text.slice(0, at) + stamp + text.slice(end));
        setModifie(true);
        requestAnimationFrame(() => el?.setSelectionRange(at + stamp.length, at + stamp.length));
      },
      "texte.retour": () => setRetour((r) => !r),
    },
    { "texte.retour": { checked: retour } },
  );
  const dossiers = dossiersEcrivables(fs.disque);
  return (
    <div className="app-col">
      <div className="pk-toolbar">
        <button className="pk-btn small" onClick={enregistrer} data-testid="texte-enregistrer">
          {str("texte.enregistrer")}
        </button>
        <button className="pk-btn small" onClick={enregistrerSous}>
          {str("texte.enregistrerSous")}…
        </button>
        {node?.type === "texte" && node.date && <span className="note">Document du {node.date}</span>}
      </div>
      {sous && (
        <div className="pk-toolbar enregistrer-sous">
          <label>
            {str("texte.nom")}{" "}
            <input className="pk-input" value={sous.nom} onChange={(e) => setSous({ ...sous, nom: e.target.value })} onKeyDown={(e) => e.key === "Enter" && validerSous()} autoFocus data-testid="texte-nom" />
          </label>
          <span>{str("texte.dans")}</span>
          <ListeDeroulante value={sous.dossier} options={dossiers.map((d) => ({ value: d, label: [fs.disque.racine.name, ...splitPath(d)].join(" › ") }))} onChange={(d) => setSous({ ...sous, dossier: d })} aria-label={str("texte.dans")} />
          <button className="pk-btn small" onClick={validerSous} data-testid="texte-valider">
            {str("texte.enregistrer")}
          </button>
          <button className="pk-btn small" onClick={() => setSous(null)}>
            {str("texte.annuler")}
          </button>
        </div>
      )}
      <textarea
        ref={zone}
        className={`bloc-notes pk-body${retour ? "" : " sans-retour"}`}
        wrap={retour ? "soft" : "off"}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setModifie(true);
        }}
        spellCheck={false}
        data-testid="texte-zone"
      />
      <div className="pk-statusbar">
        <span style={{ flex: 1 }}>{modifie ? str("texte.modifie") : statut || (node?.protege ? str("texte.lectureSeule") : str("texte.aJour"))}</span>
        <span>{text.split("\n").length} lignes</span>
      </div>
    </div>
  );
}

export function Visionneuse() {
  const { fs } = useOs();
  const { win, setTitle } = useWin();
  const [path, setPath] = useState(win.args.path ?? "");
  const node = resolve(fs.disque.racine, path);
  const parent = resolve(fs.disque.racine, parentPath(path));
  const siblings = parent?.type === "dossier" ? parent.children.filter((c) => c.type === "image") : [];
  const i = siblings.findIndex((s) => s.name === node?.name);
  useEffect(() => setTitle(`${node?.name ?? "Image"} — Visionneuse`), [node?.name, setTitle]);
  const step = (d: number) => {
    const n = siblings[(i + d + siblings.length) % siblings.length];
    if (n) setPath(childPath(parentPath(path), n.name));
  };
  useMenuCommands(
    { "vis.precedente": () => step(-1), "vis.suivante": () => step(1) },
    { "vis.precedente": { disabled: siblings.length < 2 }, "vis.suivante": { disabled: siblings.length < 2 } },
  );
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
