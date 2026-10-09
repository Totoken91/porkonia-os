"use client";
/**
 * Course de Grosses : l'hippodrome de PorkOS. On parie des Pork$ du compte en banque (ouvert sur le site de la Caisse
 * Nationale d'Épargne du Porc), on regarde la course, on touche ses gains et on commande des bières à la buvette,
 * qui tapent sur l'écran de tout le système. La course est calculée à l'avance (course.ts) puis rejouée ici.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOs } from "@/os/context";
import { useCompte, operer } from "@/os/banqueStore";
import { crediter, debiter, formaterPork } from "@/os/banque";
import { useIvresse } from "@/os/ivresseStore";
import { useCave } from "@/os/biereStore";
import { siteUrl } from "@/apps/navigateur/url";
import { composer, cotes as calculerCotes, etoiles, gain, IMAGES_PAR_SECONDE, LONGUEUR, MISES, simuler, type Pari, type TypePari } from "./course";

type Phase = "paris" | "course" | "resultat";

const LARGEUR = 320;
const COULOIR = 22;
const MARGE = 14;

export function Grosses() {
  const { pack, user, str, signal, rng, playSound, openApp } = useOs();
  const jeu = pack.grosses;
  const compte = useCompte(user.id);
  const verres = useIvresse();
  const cave = useCave();
  const [rebours, setRebours] = useState<number | null>(null);
  const [graine, setGraine] = useState(() => Math.floor(rng() * 1e9));
  const cochons = useMemo(() => composer(jeu.cochons, graine), [jeu.cochons, graine]);
  const cotes = useMemo(() => calculerCotes(cochons), [cochons]);
  const course = useMemo(() => simuler(cochons, graine), [cochons, graine]);
  const [phase, setPhase] = useState<Phase>("paris");
  const [type, setType] = useState<TypePari>("gagnant");
  const [choix, setChoix] = useState(0);
  const [mise, setMise] = useState(MISES[1]!);
  const [pari, setPari] = useState<Pari | null>(null);
  const [gagne, setGagne] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [message, setMessage] = useState("");
  const [courses, setCourses] = useState(0);
  const compteRef = useRef(compte);
  compteRef.current = compte;
  const toile = useRef<HTMLCanvasElement>(null);
  const image = useRef(0);

  const phrase = useCallback((liste: string[], vars: Record<string, string> = {}) => liste[Math.floor(rng() * liste.length)]!.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? ""), [rng]);

  const dessiner = useCallback(
    (i: number) => {
      const c = toile.current;
      const g = c?.getContext("2d");
      if (!c || !g) return;
      g.imageSmoothingEnabled = false;
      const pos = course.positions[Math.min(i, course.positions.length - 1)]!;
      g.fillStyle = "#4a7a3a";
      g.fillRect(0, 0, c.width, c.height);
      const piste = c.width - MARGE * 2 - 18;
      for (let k = 0; k < cochons.length; k++) {
        const y = k * COULOIR + 3;
        g.fillStyle = k % 2 ? "#8a6a3a" : "#9a7a46";
        g.fillRect(0, y, c.width, COULOIR - 2);
        // Ligne d'arrivée à damier.
        for (let d = 0; d < COULOIR - 2; d += 4) {
          g.fillStyle = (d / 4) % 2 ? "#f4ecd8" : "#1a1410";
          g.fillRect(MARGE + piste + 12, y + d, 4, 4);
        }
        const x = MARGE + (pos[k]! / LONGUEUR) * piste;
        const trot = Math.floor(i / 3) % 2;
        g.fillStyle = "#1a1410";
        g.fillRect(x - 1, y + 4, 16, 12);
        g.fillStyle = cochons[k]!.couleur;
        g.fillRect(x, y + 5, 14, 10);
        g.fillStyle = "#f0a0a0";
        g.fillRect(x + 12, y + 8, 5, 5);
        g.fillStyle = "#1a1410";
        g.fillRect(x + 10, y + 7, 2, 2);
        g.fillRect(x + 2 + trot * 2, y + 15, 2, 3);
        g.fillRect(x + 9 - trot * 2, y + 15, 2, 3);
        g.fillStyle = "#f4ecd8";
        g.font = "8px monospace";
        g.fillText(String(k + 1), 2, y + 12);
      }
    },
    [course, cochons],
  );

  // La piste n'existe qu'une fois le compte ouvert : on la redessine aussi à ce moment-là.
  const avecCompte = compte !== null;
  useEffect(() => {
    if (phase === "paris") dessiner(0);
  }, [phase, dessiner, avecCompte]);

  // Rejeu de la course, image par image, au rythme de la simulation.
  useEffect(() => {
    if (phase !== "course") return;
    const debut = performance.now();
    let id = 0;
    let milieu = false;
    const total = course.positions.length - 1;
    const pas = (t: number) => {
      // Le premier horodatage d'image peut précéder `debut` : sans plancher, l'indice négatif plantait la boucle (course jamais lancée).
      const i = Math.max(0, Math.min(total, Math.floor(((t - debut) / 1000) * IMAGES_PAR_SECONDE)));
      image.current = i;
      dessiner(i);
      if (!milieu && Math.max(...course.positions[i]!) >= LONGUEUR / 2) {
        milieu = true;
        setCommentaire(phrase(jeu.speaker.milieu));
      }
      if (i >= total) {
        const gagnante = cochons[course.classement[0]!]!;
        setCommentaire(phrase(jeu.speaker.arrivee, { nom: gagnante.nom }));
        const somme = pari ? gain(pari, course.classement, cotes) : 0;
        setGagne(somme);
        if (pari) {
          if (somme > 0) {
            operer(user.id, (c) => crediter(c, somme, `Course de Grosses : gain (${cochons[pari.cochon]!.nom})`, new Date()));
            signal("grosses:gagne");
            playSound("ding");
          } else {
            signal("grosses:perdu");
            if ((compteRef.current?.solde ?? 0) < Math.min(...MISES)) signal("grosses:ruine");
          }
        }
        setCourses((n) => n + 1);
        signal("grosses:course");
        setPhase("resultat");
        return;
      }
      id = requestAnimationFrame(pas);
    };
    id = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const parier = () => {
    const r = operer(user.id, (c) => debiter(c, mise, `Course de Grosses : pari sur ${cochons[choix]!.nom}`, new Date()));
    if (!r) return;
    if (!r.ok) return setMessage(str("grosses.pasAssez"));
    setPari({ type, cochon: choix, mise });
    setMessage("");
    setRebours(3);
  };

  const lancer = useCallback(() => {
    setRebours(null);
    setCommentaire(phrase(jeu.speaker.depart));
    setPhase("course");
  }, [phrase, jeu.speaker.depart]);

  // Après le pari : décompte, puis la course part toute seule.
  useEffect(() => {
    if (rebours === null) return;
    if (rebours <= 0) return lancer();
    setCommentaire(str("grosses.depart", { n: rebours }));
    const t = setTimeout(() => setRebours(rebours - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rebours]);

  const suivante = () => {
    setGraine(Math.floor(rng() * 1e9));
    setPari(null);
    setGagne(0);
    setCommentaire("");
    setPhase("paris");
  };

  if (!compte)
    return (
      <div className="grosses grosses-vide" data-testid="grosses">
        <h2>{str("grosses.titre")}</h2>
        <p>{str("grosses.sansCompte")}</p>
        <button className="pk-btn" onClick={() => openApp("navigateur", { url: siteUrl("banque-porc") })} data-testid="grosses-banque">
          {str("grosses.versBanque")}
        </button>
      </div>
    );

  const peutParier = phase === "paris" && !pari;
  return (
    <div className="grosses" data-testid="grosses">
      <div className="grosses-entete">
        <b>{str("grosses.titre")}</b>
        <span data-testid="grosses-solde">{formaterPork(compte.solde)}</span>
        <span className="grosses-verres" data-testid="grosses-verres">
          {str("grosses.verres", { n: Math.round(verres * 10) / 10 })}
        </span>
      </div>
      <canvas ref={toile} width={LARGEUR} height={cochons.length * COULOIR + 6} className="grosses-piste" data-testid="grosses-piste" />
      {commentaire && (
        <p className="grosses-speaker" data-testid="grosses-speaker">
          {commentaire}
        </p>
      )}
      {phase === "resultat" && (
        <div className="grosses-resultat" data-testid="grosses-resultat">
          <ol>
            {course.classement.map((k, r) => (
              <li key={k}>
                {r + 1}. {cochons[k]!.nom}
              </li>
            ))}
          </ol>
          <p>{pari ? (gagne > 0 ? str("grosses.gagne", { somme: formaterPork(gagne) }) : str("grosses.perdu", { somme: formaterPork(pari.mise) })) : str("grosses.sansPari")}</p>
          <button className="pk-btn" onClick={suivante} data-testid="grosses-suivante">
            {str("grosses.suivante")}
          </button>
        </div>
      )}
      {phase !== "resultat" && (
        <>
          <table className="grosses-paddock" data-testid="grosses-paddock">
            <tbody>
              {cochons.map((c, k) => (
                <tr key={c.id} className={choix === k ? "choisi" : ""} onClick={() => peutParier && setChoix(k)}>
                  <td>
                    <i style={{ background: c.couleur }} /> {k + 1}
                  </td>
                  <td>{c.nom}</td>
                  <td title={str("grosses.forme")}>{"*".repeat(etoiles(c))}</td>
                  <td>{cotes.gagnant[k]}</td>
                  <td>{cotes.place[k]}</td>
                </tr>
              ))}
            </tbody>
            <thead>
              <tr>
                <th />
                <th />
                <th>{str("grosses.forme")}</th>
                <th>{str("grosses.cote")}</th>
                <th>{str("grosses.place")}</th>
              </tr>
            </thead>
          </table>
          {phase === "paris" && (
            <div className="grosses-pari">
              {pari ? (
                <p data-testid="grosses-pari-pris">{str("grosses.pariPris", { type: str(`grosses.type.${pari.type}`), nom: cochons[pari.cochon]!.nom, mise: formaterPork(pari.mise) })}</p>
              ) : (
                <>
                  <span>
                    <button aria-pressed={type === "gagnant"} onClick={() => setType("gagnant")}>
                      {str("grosses.type.gagnant")}
                    </button>
                    <button aria-pressed={type === "place"} onClick={() => setType("place")}>
                      {str("grosses.type.place")}
                    </button>
                  </span>
                  <span>
                    {MISES.map((m) => (
                      <button key={m} aria-pressed={mise === m} onClick={() => setMise(m)}>
                        {m}
                      </button>
                    ))}
                  </span>
                  <button className="pk-btn" onClick={parier} disabled={!peutParier || mise > compte.solde} data-testid="grosses-parier">
                    {str("grosses.parier", { nom: cochons[choix]!.nom, mise })}
                  </button>
                </>
              )}
              {!pari && (
                <button className="pk-btn" onClick={lancer} data-testid="grosses-lancer">
                  {str("grosses.regarder")}
                </button>
              )}
            </div>
          )}
        </>
      )}
      <div className="grosses-buvette" data-testid="grosses-cave">
        <span>{str("grosses.stock", { n: cave.stock })}</span>
        <button onClick={() => openApp("navigateur", { url: siteUrl("porkomazon") })} data-testid="grosses-porkomazon">
          {str("grosses.commander")}
        </button>
        {cave.stock > 0 && <small>{str("grosses.choppe")}</small>}
      </div>
      {message && (
        <p className="grosses-message" data-testid="grosses-message">
          {message}
        </p>
      )}
      <small>{str("grosses.mentions", { n: courses })}</small>
    </div>
  );
}
