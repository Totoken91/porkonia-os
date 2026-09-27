"use client";
/**
 * Bande son de Channel Pork : musique de fond bouclée (déjà dégradée « VHS » dans le fichier),
 * voix off calée sur le programme, musique baissée sous la voix. Muet si les sons sont coupés.
 * Chaque réplique a son propre lecteur, lancé aussitôt ; les fichiers de l'émission en cours et de la
 * suivante sont déjà dans le cache du navigateur, pour qu'elle parte sans délai. Une réplique qui commence
 * part du début ; seule une réplique prise en cours (arrivée sur la chaîne) reprend au milieu.
 * Si le navigateur refuse le son (aucun clic sur la page), `bloque` passe à vrai : `debloquer` est à
 * appeler depuis un clic.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const MUSIQUE = 0.55;
const MUSIQUE_SOUS_VOIX = 0.22;
const CLIP = 0.9;

const dejaCharges = new Set<string>();

export function useSonTv(o: {
  actif: boolean;
  lecture: boolean;
  musique?: string;
  /** Clip : la musique est le morceau de l'émission, repris à `t` (secondes) dans cette diffusion `cle`. */
  calage?: { cle: string; t: number };
  voix: { cle: string; src: string; offset: number } | null;
  precharge: string[];
}) {
  const musique = useRef<HTMLAudioElement | null>(null);
  const voix = useRef<HTMLAudioElement | null>(null);
  const cleVoix = useRef<string | null>(null);
  const [bloque, setBloque] = useState(false);
  const joue = o.actif && o.lecture;
  const voixDemandee = useRef(o.voix);
  voixDemandee.current = o.voix;
  const calage = useRef(o.calage);
  calage.current = o.calage;
  const cleCalage = o.calage?.cle ?? null;

  const lancer = useCallback((a: HTMLAudioElement) => {
    void a.play().then(
      () => setBloque(false),
      (e: unknown) => {
        if (e instanceof DOMException && e.name === "NotAllowedError") setBloque(true);
      },
    );
  }, []);

  // Musique : continue d'un programme à l'autre si c'est la même piste ;
  // un clip, lui, a son propre lecteur par diffusion, repris où en est le direct.
  useEffect(() => {
    if (!o.musique || !o.actif) return;
    const c = calage.current;
    const meme = !c && musique.current?.src.endsWith(o.musique) && musique.current.loop;
    const a = meme ? musique.current! : new Audio(o.musique);
    a.loop = !c;
    if (!meme) a.volume = c ? CLIP : MUSIQUE;
    if (c && c.t > 0.5) {
      const depuis = performance.now();
      a.addEventListener(
        "loadedmetadata",
        () => {
          const t = c.t + (performance.now() - depuis) / 1000;
          if (t < a.duration - 0.5) a.currentTime = t;
        },
        { once: true },
      );
    }
    musique.current = a;
    return () => {
      a.pause();
    };
  }, [o.musique, o.actif, cleCalage]);

  useEffect(() => {
    const a = musique.current;
    if (!a) return;
    if (joue) lancer(a);
    else a.pause();
  }, [joue, o.musique, cleCalage, lancer]);

  // Préchargement dans le cache HTTP (sans lecteur) : voix de l'émission en cours et de la suivante.
  const liste = o.precharge.join("|");
  useEffect(() => {
    if (!o.actif) return;
    for (const src of liste.split("|").filter(Boolean)) {
      if (dejaCharges.has(src)) continue;
      dejaCharges.add(src);
      void fetch(src).then((r) => r.blob()).catch(() => dejaCharges.delete(src));
    }
  }, [liste, o.actif]);

  // Voix : nouvelle réplique → nouveau lecteur, lancé tout de suite.
  const cle = o.voix?.cle ?? null;
  useEffect(() => {
    const v = voixDemandee.current;
    if (!joue || !v) {
      voix.current?.pause();
      if (!v) cleVoix.current = null;
      return;
    }
    let a = voix.current;
    if (!a || cleVoix.current !== v.cle) {
      a?.pause();
      a = new Audio(v.src);
      voix.current = a;
      cleVoix.current = v.cle;
      if (v.offset > 0.4) {
        // Arrivée en cours de réplique : on la reprend où en est le direct, une fois le fichier prêt.
        const depuis = performance.now();
        const lu = a;
        const offset = v.offset;
        lu.addEventListener(
          "loadedmetadata",
          () => {
            const t = offset + (performance.now() - depuis) / 1000;
            if (t < lu.duration - 0.2) lu.currentTime = t;
          },
          { once: true },
        );
      }
    }
    lancer(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joue, cle, lancer]);

  // Ducking : la musique baisse tant que la voix parle.
  useEffect(() => {
    if (!o.actif) return;
    const id = setInterval(() => {
      const m = musique.current;
      if (!m) return;
      const parle = !!voix.current && !voix.current.paused && !voix.current.ended;
      const cible = calage.current ? CLIP : parle ? MUSIQUE_SOUS_VOIX : MUSIQUE;
      m.volume = Math.max(0, Math.min(1, m.volume + (cible - m.volume) * 0.35));
    }, 60);
    return () => clearInterval(id);
  }, [o.actif]);

  useEffect(
    () => () => {
      musique.current?.pause();
      voix.current?.pause();
    },
    [],
  );

  /** À appeler depuis un clic : relance la musique et la réplique en cours. */
  const debloquer = useCallback(() => {
    if (musique.current) lancer(musique.current);
    if (voix.current && !voix.current.ended) lancer(voix.current);
  }, [lancer]);

  return { bloque: bloque && joue, debloquer };
}
