"use client";
/** Nappe Vide : découvrir la table sans révéler de nappe vide. Le résultat est signalé au système. */
import { useEffect, useRef, useState } from "react";
import { Groin } from "@/components/Icon";
import { useMenuCommands, useOs, useWin } from "@/os/context";
import { chord, LEVELS, newGame, remaining, reveal, toggleAssiette, type Game } from "./logic";

const CELL = 22;

export function NappeVide() {
  const { rng, signal, str } = useOs();
  const { resize } = useWin();
  const [levelId, setLevelId] = useState(LEVELS[0]!.id);
  const level = LEVELS.find((l) => l.id === levelId)!;
  const [game, setGame] = useState<Game>(() => newGame(level));
  const [modeAssiette, setModeAssiette] = useState(false);
  const [now, setNow] = useState(0);
  useMenuCommands(
    {
      "nappe.nouveau": () => setGame(newGame(level)),
      "nappe.niveau": (id) => id && setLevelId(id),
      "nappe.assiette": () => setModeAssiette((x) => !x),
    },
    { ...Object.fromEntries(LEVELS.map((l) => [`nappe.niveau:${l.id}`, { checked: l.id === levelId }])), "nappe.assiette": { checked: modeAssiette } },
  );
  const press = useRef<{ i: number; t: ReturnType<typeof setTimeout>; long: boolean } | null>(null);

  useEffect(() => {
    setGame(newGame(level));
    resize(Math.max(360, level.w * CELL + 40), level.h * CELL + 172);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);

  useEffect(() => {
    if (game.state !== "service") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [game.state]);

  const prev = useRef(game.state);
  useEffect(() => {
    if (prev.current !== game.state) {
      if (game.state === "incident") signal("nappe:incident");
      if (game.state === "conforme") signal("nappe:conforme");
      prev.current = game.state;
    }
  }, [game.state, signal]);

  const play = (i: number, assiette: boolean) => {
    setGame((g) => {
      const c = g.cells[i]!;
      if (assiette) return toggleAssiette(g, i);
      if (c.open) return chord(g, i, rng, Date.now());
      return reveal(g, i, rng, Date.now());
    });
  };

  const seconds = game.started ? Math.min(999, Math.floor(((game.ended ?? (now || Date.now())) - game.started) / 1000)) : 0;
  const lcd = (n: number) => (n < 0 ? "-" + String(-n).padStart(2, "0") : String(n).padStart(3, "0"));

  return (
    <div className="app-col nappe">
      <div className="pk-toolbar">
        <select className="pk-select" value={levelId} onChange={(e) => setLevelId(e.target.value)} aria-label="Niveau">
          {LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label} ({l.w}×{l.h})
            </option>
          ))}
        </select>
        <label className="case-a-cocher">
          <input type="checkbox" checked={modeAssiette} onChange={(e) => setModeAssiette(e.target.checked)} />
          {str("nappe.modeAssiette")}
        </label>
      </div>
      <div className="pk-body nappe-corps">
        <div className="nappe-tete pk-sunken">
          <span className="lcd" data-testid="nappe-restant">{lcd(remaining(game))}</span>
          <button className="pk-btn nappe-groin" onClick={() => setGame(newGame(level))} aria-label="Nouveau banquet" data-testid="nappe-nouveau">
            <Groin mood={game.state} />
          </button>
          <span className="lcd">{lcd(seconds)}</span>
        </div>
        {(game.state === "incident" || game.state === "conforme") && (
          <p className={`nappe-verdict ${game.state}`} data-testid="nappe-verdict">
            {str(game.state === "incident" ? "nappe.incident" : "nappe.conforme")}
          </p>
        )}
        <div
          className="nappe-grille"
          style={{ gridTemplateColumns: `repeat(${level.w}, ${CELL}px)` }}
          onContextMenu={(e) => e.preventDefault()}
          data-testid="nappe-grille"
        >
          {game.cells.map((c, i) => (
            <button
              key={i}
              className={`nv${c.open ? " ouverte" : ""}${c.open && c.vide ? " vide" : ""}${game.fatal === i ? " fatale" : ""}${c.assiette ? " assiette" : ""}`}
              data-adj={c.open && !c.vide && c.adj ? c.adj : undefined}
              aria-label={c.open ? (c.vide ? "nappe vide" : String(c.adj || "servie")) : c.assiette ? "assiette" : "case couverte"}
              onPointerDown={(e) => {
                if (e.pointerType !== "touch") return;
                const t = setTimeout(() => {
                  if (press.current) press.current.long = true;
                  play(i, true);
                }, 450);
                press.current = { i, t, long: false };
              }}
              onPointerUp={() => press.current && clearTimeout(press.current.t)}
              onClick={() => {
                if (press.current?.i === i && press.current.long) {
                  press.current = null;
                  return;
                }
                press.current = null;
                play(i, modeAssiette);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                play(i, true);
              }}
            >
              {c.open && !c.vide && c.adj > 0 ? c.adj : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
