"use client";
/**
 * Bureau : icônes du système et fichiers du dossier « Bureau », sur grille magnétique. Icônes déplaçables
 * (seules ou en groupe), sélection au lasso ou au clavier, menus contextuels, renommage sur place.
 * Glisser-déposer : une icône lâchée sur la Poubelle, sur un dossier ou dans une fenêtre de Mes documents
 * y est rangée ; un fichier glissé depuis Mes documents atterrit sur le bureau, à l'endroit du lâcher.
 * La disposition est retenue dans le navigateur.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DesktopIcon, FsNode, IconKey } from "@/content/types";
import { useOs } from "@/os/context";
import { GRID, cellAt, cellKey, cellPos, defaultLayout, dimsFor, inRect, moveIcons, nearestFree, neighbor, sanitizeLayout, type Cell, type Layout } from "@/os/desktop";
import { childPath, splitPath } from "@/os/fs";
import { depotSous, lireFichiers, porteFichiers } from "@/os/glisser";
import { BUREAU, POUBELLE, creer, renommer } from "@/os/vfs";
import { Icon } from "./Icon";
import { Renommage, iconOf } from "./Fichier";
import { ContextMenu, type MenuItem, type MenuState } from "./Menu";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  area: { w: number; h: number };
  onLaunch(icon: DesktopIcon, from: Rect): void;
}

/** Une icône du bureau : raccourci du système (pack) ou élément du dossier Bureau. */
interface Element {
  id: string;
  label: string;
  icon: IconKey;
  systeme?: DesktopIcon;
  chemin?: string;
  node?: FsNode;
  /** Chemin de dossier si l'on peut y déposer des fichiers. */
  depot?: string;
}

const ICONE = { w: 74, h: 66 };
const idFichier = (nom: string) => `f:${nom}`;

export function Desktop({ area, onLaunch }: Props) {
  const { pack, str, signal, openApp, runAction, fs } = useOs();
  const bureau = fs.disque.racine.children.find((c) => c.name === BUREAU && c.type === "dossier") as Extract<FsNode, { type: "dossier" }> | undefined;
  const elements = useMemo<Element[]>(
    () => [
      ...pack.desktop.map((d) => ({
        id: d.id,
        label: d.label,
        icon: d.icon,
        systeme: d,
        depot: "app" in d.open && d.open.app === "fichiers" && d.open.args?.path === POUBELLE ? POUBELLE : undefined,
      })),
      ...(bureau?.children ?? []).map((n) => ({
        id: idFichier(n.name),
        label: n.name,
        icon: iconOf(n, pack.apps),
        chemin: childPath(BUREAU, n.name),
        node: n,
        depot: n.type === "dossier" && !n.locked ? childPath(BUREAU, n.name) : undefined,
      })),
    ],
    [pack.desktop, bureau],
  );
  const ids = useMemo(() => elements.map((d) => d.id), [elements]);
  const cleIds = ids.join("|");
  const parId = useMemo(() => new Map(elements.map((d) => [d.id, d])), [elements]);
  const dims = useMemo(() => dimsFor(area.w, area.h), [area.w, area.h]);
  const cle = `porkos.bureau.${pack.id}`;
  const zone = useRef<HTMLDivElement>(null);

  const [layout, setLayout] = useState<Layout>(() => defaultLayout(ids, dims));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ ids: string[]; dx: number; dy: number } | null>(null);
  const [lasso, setLasso] = useState<Rect | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [clignote, setClignote] = useState(false);
  const [renomme, setRenomme] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);
  const geste = useRef<{ kind: "icone" | "lasso"; x: number; y: number; ids: string[]; moved: boolean; base: Set<string> } | null>(null);

  // Disposition retenue, remise d'aplomb à chaque changement d'icônes (fichier créé, jeté, renommé).
  useEffect(() => {
    try {
      setLayout(sanitizeLayout(JSON.parse(window.localStorage.getItem(cle) ?? "null"), ids, dims));
    } catch {
      setLayout(sanitizeLayout(null, ids, dims));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, cleIds, dims]);
  const save = useCallback(
    (l: Layout) => {
      setLayout(l);
      try {
        window.localStorage.setItem(cle, JSON.stringify(l));
      } catch {
        /* disposition non retenue */
      }
    },
    [cle],
  );
  /** Place de nouvelles icônes au plus près d'une case (dépôt, création au clic droit). */
  const placer = (nouveaux: string[], pres: Cell) => {
    const l: Layout = { ...layout };
    for (const id of nouveaux) delete l[id];
    const pris = new Set(Object.entries(l).filter(([id]) => ids.includes(id)).map(([, c]) => cellKey(c)));
    for (const id of nouveaux) {
      const c = nearestFree(pres, pris, dims);
      l[id] = c;
      pris.add(cellKey(c));
    }
    save(l);
  };

  /** Coordonnées logiques (écran 800×600) d'un événement, quelle que soit l'échelle du moniteur. */
  const local = (e: { clientX: number; clientY: number }) => {
    const r = zone.current!.getBoundingClientRect();
    const k = area.w / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  };
  const iconRect = (id: string): Rect => {
    const p = cellPos(layout[id] ?? { c: 0, r: 0 });
    return { x: p.x + (GRID.cw - ICONE.w) / 2, y: p.y, w: ICONE.w, h: ICONE.h };
  };
  const launch = (d: Element) => {
    if (d.systeme) onLaunch(d.systeme, iconRect(d.id));
    else if (d.chemin) fs.ouvrir(d.chemin);
  };

  /** Range des icônes du bureau dans un dépôt (dossier, fenêtre, Poubelle). Rend vrai si elles ont été prises. */
  const ranger = (lot: string[], depot: string, copie: boolean): boolean => {
    const els = lot.map((id) => parId.get(id)).filter((d): d is Element => !!d);
    if (els.some((d) => d.chemin === depot || d.depot === depot)) return false;
    const fichiers = els.flatMap((d) => (d.chemin ? [d.chemin] : []));
    const systeme = els.filter((d) => d.systeme);
    if (depot === POUBELLE) {
      if (systeme.length) signal("bureau:supprimer");
      if (fichiers.length) fs.deposer(fichiers, POUBELLE);
      return true;
    }
    if (fichiers.length) fs.deposer(fichiers, depot, copie);
    // Une icône du système déposée dans un dossier y laisse un raccourci.
    for (const d of systeme) {
      const o = d.systeme!.open;
      if ("app" in o) fs.appliquer((disque) => creer(disque, depot, { type: "lien", name: d.label, app: o.app, ...(o.args ? { args: o.args } : {}) }));
    }
    return true;
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const g = geste.current;
      if (!g || !zone.current) return;
      const p = local(e);
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      if (!g.moved && Math.hypot(dx, dy) < 4) return;
      g.moved = true;
      if (g.kind === "icone") {
        setDrag({ ids: g.ids, dx, dy });
        const depot = depotSous(e.clientX, e.clientY);
        setSurvol(depot && !g.ids.some((id) => parId.get(id)?.depot === depot) ? depot : null);
      } else {
        const rect = { x: g.x, y: g.y, w: dx, h: dy };
        setLasso(rect);
        const hit = inRect(layout, rect, ICONE).filter((id) => parId.has(id));
        setSelected(new Set([...(e.ctrlKey ? g.base : []), ...hit]));
      }
    };
    const up = (e: PointerEvent) => {
      const g = geste.current;
      geste.current = null;
      setSurvol(null);
      if (!g) return;
      if (g.kind === "icone" && g.moved && zone.current) {
        const depot = depotSous(e.clientX, e.clientY);
        if (!(depot && ranger(g.ids, depot, e.ctrlKey))) {
          const p = local(e);
          const lead = g.ids[0]!;
          const from = cellPos(layout[lead]!);
          const target = cellAt(from.x + p.x - g.x, from.y + p.y - g.y, dims);
          save(moveIcons(layout, g.ids, target.c - layout[lead]!.c, target.r - layout[lead]!.r, dims));
        } else setSelected(new Set());
      }
      setDrag(null);
      setLasso(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, dims, save, parId]);

  const proprietes = (d: Element) =>
    runAction({
      type: "dialog",
      dialog: { title: str("prop.titre", { nom: d.label }), icon: "info", body: str("prop.corps", { nom: d.label }), buttons: [{ label: "OK" }] },
    });

  const actualiser = () => {
    setClignote(true);
    setTimeout(() => setClignote(false), 160);
    signal("bureau:actualiser");
  };

  const selectionFichiers = () => [...selected].flatMap((id) => (parId.get(id)?.chemin ? [parId.get(id)!.chemin!] : []));
  const supprimerSelection = () => {
    const lot = [...selected];
    if (!lot.length) return;
    ranger(lot, POUBELLE, false);
    setSelected(new Set());
  };
  const coller = (pres?: Cell) => {
    const pp = fs.pressePapiers;
    if (!pp) return;
    const r = fs.deposer(pp.chemins, BUREAU, !pp.couper);
    if (!r) return;
    if (pp.couper) fs.setPressePapiers(null);
    const nouveaux = r.map((c) => idFichier(splitPath(c).pop()!));
    if (pres) placer(nouveaux, pres);
    setSelected(new Set(nouveaux));
  };
  const nouveau = (type: "dossier" | "texte", pres: Cell) => {
    const r = fs.appliquer((d) =>
      creer(d, BUREAU, type === "dossier" ? { type: "dossier", name: str("fichiers.nouveauDossier"), children: [] } : { type: "texte", name: str("fichiers.nouveauTexte"), content: "", date: new Date().toLocaleDateString("fr-FR") }),
    );
    const nom = r?.[0] && splitPath(r[0]).pop();
    if (!nom) return;
    placer([idFichier(nom)], pres);
    setSelected(new Set([idFichier(nom)]));
    setRenomme(idFichier(nom));
  };
  const finRenommage = (d: Element, v: string | null) => {
    setRenomme(null);
    if (v === null || !d.chemin || v.trim() === d.label) return;
    const r = fs.appliquer((disque) => renommer(disque, d.chemin!, v));
    const nom = r?.[0] && splitPath(r[0]).pop();
    if (!nom) return;
    // L'icône renommée garde sa place.
    const id = idFichier(nom);
    const l = { ...layout, [id]: layout[d.id]! };
    delete l[d.id];
    save(l);
    setSelected(new Set([id]));
  };

  const menuIcone = (d: Element, x: number, y: number) => {
    const items: MenuItem[] = d.systeme
      ? [
          { label: str("ctx.ouvrir"), bold: true, onSelect: () => launch(d) },
          { separator: true },
          { label: str("ctx.couper"), disabled: true },
          { label: str("ctx.copier"), disabled: true },
          { separator: true },
          ...(d.depot === POUBELLE ? [{ label: str("ctx.vider"), disabled: !fs.disque.poubelle.length, onSelect: () => fs.ouvrir(POUBELLE) }] : [{ label: str("ctx.supprimer"), onSelect: () => signal("bureau:supprimer") }]),
          { label: str("ctx.renommer"), disabled: true },
          { separator: true },
          { label: str("ctx.proprietes"), onSelect: () => proprietes(d) },
        ]
      : [
          { label: str("ctx.ouvrir"), bold: true, onSelect: () => launch(d) },
          { separator: true },
          { label: str("ctx.couper"), onSelect: () => fs.setPressePapiers({ chemins: selectionFichiers(), couper: true }) },
          { label: str("ctx.copier"), onSelect: () => fs.setPressePapiers({ chemins: selectionFichiers(), couper: false }) },
          { separator: true },
          { label: str("ctx.supprimer"), onSelect: supprimerSelection },
          { label: str("ctx.renommer"), onSelect: () => setRenomme(d.id) },
        ];
    setMenu({ x, y, items });
  };

  const menuBureau = (x: number, y: number) => {
    const pres = cellAt(x - GRID.cw / 2, y - 16, dims);
    setMenu({
      x,
      y,
      items: [
        { label: str("ctx.reorganiser"), onSelect: () => save(defaultLayout(ids, dims)) },
        { label: str("ctx.aligner"), onSelect: () => save(sanitizeLayout(layout, ids, dims)) },
        { separator: true },
        { label: str("ctx.actualiser"), onSelect: actualiser },
        { label: str("ctx.coller"), disabled: !fs.pressePapiers, onSelect: () => coller(pres) },
        { separator: true },
        { label: str("ctx.nouveauDossier"), onSelect: () => nouveau("dossier", pres) },
        { label: str("ctx.nouveauTexte"), onSelect: () => nouveau("texte", pres) },
        { separator: true },
        { label: str("ctx.bureau.proprietes"), onSelect: () => openApp("config") },
      ],
    });
  };

  const clavier = (e: React.KeyboardEvent) => {
    if (renomme) return;
    const courant = focus ?? [...selected][0] ?? ids[0]!;
    const dirs: Record<string, "haut" | "bas" | "gauche" | "droite"> = { ArrowUp: "haut", ArrowDown: "bas", ArrowLeft: "gauche", ArrowRight: "droite" };
    const k = e.key.toLowerCase();
    if (dirs[e.key]) {
      e.preventDefault();
      const n = focus || selected.size ? neighbor(layout, courant, dirs[e.key]!) : courant;
      setFocus(n);
      setSelected(new Set([n]));
    } else if (e.key === "Enter") {
      elements.filter((d) => selected.has(d.id)).forEach(launch);
    } else if (e.key === "Delete" && selected.size) supprimerSelection();
    else if (e.key === "F2" && selected.size === 1 && parId.get([...selected][0]!)?.chemin) setRenomme([...selected][0]!);
    else if (e.ctrlKey && (k === "c" || k === "x") && selectionFichiers().length) fs.setPressePapiers({ chemins: selectionFichiers(), couper: k === "x" });
    else if (e.ctrlKey && k === "v") coller(nearestFree({ c: 1, r: 0 }, new Set(Object.values(layout).map(cellKey)), dims));
    else if (e.key === "F5") {
      e.preventDefault();
      actualiser();
    }
  };

  /** Dépôt de fichiers glissés depuis Mes documents (glisser-déposer du navigateur). */
  const depotFenetre = (cible: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!porteFichiers(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      setSurvol(cible);
    },
    onDragLeave: () => setSurvol((s) => (s === cible ? null : s)),
    onDrop: (e: React.DragEvent) => {
      if (!porteFichiers(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      setSurvol(null);
      fs.deposer(lireFichiers(e.dataTransfer), cible, e.ctrlKey);
    },
  });

  const coupes = new Set(fs.pressePapiers?.couper ? fs.pressePapiers.chemins : []);
  return (
    <div
      ref={zone}
      className="bureau-zone"
      tabIndex={0}
      role="listbox"
      aria-label="Bureau"
      aria-multiselectable="true"
      onKeyDown={clavier}
      onPointerDown={(e) => {
        if (e.button !== 0 || e.target !== e.currentTarget) return;
        const p = local(e);
        if (!e.ctrlKey) setSelected(new Set());
        setFocus(null);
        geste.current = { kind: "lasso", x: p.x, y: p.y, ids: [], moved: false, base: new Set(selected) };
      }}
      onContextMenu={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        setSelected(new Set());
        const p = local(e);
        menuBureau(p.x, p.y);
      }}
      onDragOver={(e) => {
        if (!porteFichiers(e.dataTransfer)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move";
      }}
      onDrop={(e) => {
        if (!porteFichiers(e.dataTransfer)) return;
        e.preventDefault();
        const r = fs.deposer(lireFichiers(e.dataTransfer), BUREAU, e.ctrlKey);
        if (!r) return;
        const p = local(e);
        const nouveaux = r.map((c) => idFichier(splitPath(c).pop()!));
        placer(nouveaux, cellAt(p.x - GRID.cw / 2, p.y - 16, dims));
        setSelected(new Set(nouveaux));
      }}
      data-testid="bureau"
    >
      {!clignote &&
        elements.map((d) => {
          const r = iconRect(d.id);
          const sel = selected.has(d.id);
          return (
            <button
              key={d.id}
              className={`desk-icon${focus === d.id ? " focus" : ""}${d.chemin && coupes.has(d.chemin) ? " coupe" : ""}${d.depot && survol === d.depot ? " depot-survol" : ""}`}
              style={{ left: r.x, top: r.y }}
              role="option"
              aria-selected={sel}
              tabIndex={-1}
              data-testid={`icon-${d.id}`}
              {...(d.depot ? { "data-depot": d.depot, ...depotFenetre(d.depot) } : {})}
              onPointerDown={(e) => {
                if (e.button !== 0 || renomme === d.id) return;
                const p = local(e);
                let next = selected;
                if (e.ctrlKey) {
                  next = new Set(selected);
                  if (next.has(d.id)) next.delete(d.id);
                  else next.add(d.id);
                } else if (!selected.has(d.id)) next = new Set([d.id]);
                setSelected(next);
                setFocus(d.id);
                zone.current?.focus({ preventScroll: true });
                geste.current = { kind: "icone", x: p.x, y: p.y, ids: [d.id, ...[...next].filter((i) => i !== d.id)], moved: false, base: next };
              }}
              onClick={(e) => {
                if ((e.nativeEvent as PointerEvent).pointerType === "touch" && !drag) launch(d);
              }}
              onDoubleClick={() => renomme !== d.id && launch(d)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!selected.has(d.id)) setSelected(new Set([d.id]));
                const p = local(e);
                menuIcone(d, p.x, p.y);
              }}
            >
              <Icon name={d.icon} size={32} selected={sel} />
              {renomme === d.id ? <Renommage nom={d.label} onFin={(v) => finRenommage(d, v)} /> : <span>{d.label}</span>}
            </button>
          );
        })}

      {drag &&
        drag.ids.map((id) => {
          const d = parId.get(id);
          if (!d) return null;
          const r = iconRect(id);
          return (
            <div key={`fantome-${id}`} className="desk-icon fantome" style={{ left: r.x + drag.dx, top: r.y + drag.dy }} aria-hidden="true">
              <Icon name={d.icon} size={32} selected />
              <span>{d.label}</span>
            </div>
          );
        })}

      {lasso && (
        <div
          className="lasso"
          style={{ left: Math.min(lasso.x, lasso.x + lasso.w), top: Math.min(lasso.y, lasso.y + lasso.h), width: Math.abs(lasso.w), height: Math.abs(lasso.h) }}
        />
      )}
      {menu && <ContextMenu menu={menu} onClose={() => setMenu(null)} bounds={area} />}
    </div>
  );
}
