"use client";
/**
 * Bande son de Channel Pork : musique de fond bouclée (déjà dégradée « VHS » dans le fichier),
 * voix off calée sur le programme, musique baissée sous la voix. Muet si les sons sont coupés.
 */
import { useEffect, useRef } from "react";

const MUSIQUE = 0.55;
const MUSIQUE_SOUS_VOIX = 0.22;

export function useSonTv(o: { actif: boolean; lecture: boolean; musique?: string; voix: { cle: string; src: string; offset: number } | null }) {
  const musique = useRef<HTMLAudioElement | null>(null);
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

  // Voix : nouvelle réplique → on charge et on lit depuis la bonne position.
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
      if (v.offset > 0.3) a.currentTime = v.offset;
    }
    void a.play().catch(() => undefined);
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
      voix.current?.pause();
    },
    [],
  );
}
