"use client";
/**
 * Bande son de Channel Pork : musique de fond bouclée (déjà dégradée « VHS » dans le fichier),
 * voix off calée sur le programme, musique baissée sous la voix. Muet si les sons sont coupés.
 * Les voix de l'émission en cours et de la suivante sont préchargées : une réplique qui commence
 * part du début, tout de suite ; seule une réplique prise en cours (arrivée sur la chaîne) est reprise au milieu.
 */
import { useEffect, useRef } from "react";

const MUSIQUE = 0.55;
const MUSIQUE_SOUS_VOIX = 0.22;

export function useSonTv(o: { actif: boolean; lecture: boolean; musique?: string; voix: { cle: string; src: string; offset: number } | null; precharge: string[] }) {
  const musique = useRef<HTMLAudioElement | null>(null);
  const cache = useRef(new Map<string, HTMLAudioElement>());
  const element = (src: string) => {
    let a = cache.current.get(src);
    if (!a) {
      a = new Audio();
      a.preload = "auto";
      a.src = src;
      cache.current.set(src, a);
    }
    return a;
  };
  const voix = useRef<HTMLAudioElement | null>(null);
  const cleVoix = useRef<string | null>(null);
  const joue = o.actif && o.lecture;
  const voixDemandee = useRef(o.voix);
  voixDemandee.current = o.voix;

  // Musique : continue d'un programme à l'autre si c'est la même piste.
  useEffect(() => {
    if (!o.musique || !o.actif) return;
    const a = musique.current?.src.endsWith(o.musique) ? musique.current : new Audio(o.musique);
    a.loop = true;
    if (a !== musique.current) a.volume = MUSIQUE;
    musique.current = a;
    return () => {
      a.pause();
    };
  }, [o.musique, o.actif]);

  useEffect(() => {
    const a = musique.current;
    if (!a) return;
    if (joue) void a.play().catch(() => undefined);
    else a.pause();
  }, [joue, o.musique]);

  // Préchargement : voix de l'émission en cours et de la suivante ; le reste est libéré.
  const liste = o.precharge.join("|");
  useEffect(() => {
    if (!o.actif) return;
    const voulues = new Set(liste.split("|").filter(Boolean));
    for (const src of voulues) element(src);
    for (const [src, a] of cache.current)
      if (!voulues.has(src) && a !== voix.current) {
        a.pause();
        cache.current.delete(src);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liste, o.actif]);

  // Voix : nouvelle réplique → lecture depuis le début (ou depuis où en est le direct si on arrive en cours).
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
      const suivante = element(v.src);
      if (a && a !== suivante) a.pause();
      a = suivante;
      voix.current = a;
      cleVoix.current = v.cle;
      const depuis = performance.now();
      const enCours = v.offset > 0.4;
      const caler = () => {
        try {
          a!.currentTime = enCours ? v.offset + (performance.now() - depuis) / 1000 : 0;
        } catch {
          /* position refusée tant que le fichier n'est pas prêt */
        }
      };
      if (a.readyState >= 1) caler();
      else a.addEventListener("loadedmetadata", caler, { once: true });
    }
    void a.play().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joue, cle]);

  // Ducking : la musique baisse tant que la voix parle.
  useEffect(() => {
    if (!o.actif) return;
    const id = setInterval(() => {
      const m = musique.current;
      if (!m) return;
      const parle = !!voix.current && !voix.current.paused && !voix.current.ended;
      const cible = parle ? MUSIQUE_SOUS_VOIX : MUSIQUE;
      m.volume = Math.max(0, Math.min(1, m.volume + (cible - m.volume) * 0.35));
    }, 60);
    return () => clearInterval(id);
  }, [o.actif]);

  useEffect(
    () => () => {
      musique.current?.pause();
      for (const a of cache.current.values()) a.pause();
    },
    [],
  );
}
