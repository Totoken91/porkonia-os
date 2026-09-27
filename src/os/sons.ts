/**
 * Sons système synthétisés (aucun fichier audio) : carillon de démarrage, alertes, arrêt,
 * claquement du tube, démagnétisation et neige du téléviseur entre deux chaînes. Le navigateur n'autorise le son qu'après un geste de l'utilisateur ;
 * avant cela, les appels sont silencieusement ignorés.
 */
export type Son = "demarrage" | "ding" | "erreur" | "arret" | "allumage" | "demagnetiser" | "hymne" | "bip" | "disque" | "neige";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx ??= new Ctx();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface Note {
  f: number;
  t: number;
  d: number;
  type?: OscillatorType;
  g?: number;
  glisse?: number;
}

function jouerNotes(notes: Note[], volume: number) {
  const a = audio();
  if (!a || a.state !== "running") return;
  const t0 = a.currentTime + 0.03;
  for (const n of notes) {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = n.type ?? "triangle";
    o.frequency.setValueAtTime(n.f, t0 + n.t);
    if (n.glisse) o.frequency.exponentialRampToValueAtTime(n.glisse, t0 + n.t + n.d);
    const peak = (n.g ?? 0.12) * volume;
    g.gain.setValueAtTime(0.0001, t0 + n.t);
    g.gain.exponentialRampToValueAtTime(peak, t0 + n.t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.t + n.d);
    o.connect(g).connect(a.destination);
    o.start(t0 + n.t);
    o.stop(t0 + n.t + n.d + 0.05);
  }
}

function bruit(duree: number, volume: number, filtre = 900) {
  const a = audio();
  if (!a || a.state !== "running") return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * duree), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = filtre;
  const g = a.createGain();
  g.gain.value = 0.25 * volume;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

const HYMNE: [number, number][] = [
  [392, 0.3], [392, 0.15], [523, 0.45], [523, 0.3], [587, 0.3], [523, 0.3],
  [494, 0.3], [440, 0.3], [392, 0.45], [440, 0.15], [494, 0.3], [523, 0.9],
];

/** Joue un son système ; `volume` de 0 à 1. */
export function jouer(son: Son, volume = 0.7) {
  switch (son) {
    case "demarrage":
      // Accord majeur qui s'ouvre, puis une quinte « solennelle » : le Grand Maître entre dans la pièce.
      return jouerNotes(
        [
          { f: 261.6, t: 0, d: 2.4, g: 0.07, type: "sine" },
          { f: 329.6, t: 0.18, d: 2.2, g: 0.06, type: "sine" },
          { f: 392, t: 0.36, d: 2.0, g: 0.06, type: "sine" },
          { f: 523.3, t: 0.62, d: 1.9, g: 0.07, type: "triangle" },
          { f: 784, t: 1.05, d: 1.6, g: 0.05, type: "triangle" },
          { f: 130.8, t: 0, d: 2.6, g: 0.05, type: "sine" },
        ],
        volume,
      );
    case "ding":
      return jouerNotes([{ f: 880, t: 0, d: 0.5, g: 0.1, type: "sine" }, { f: 1318.5, t: 0.08, d: 0.45, g: 0.05, type: "sine" }], volume);
    case "erreur":
      return jouerNotes([{ f: 220, t: 0, d: 0.35, g: 0.12, type: "square" }, { f: 207.7, t: 0.12, d: 0.35, g: 0.08, type: "square" }], volume * 0.6);
    case "arret":
      return jouerNotes(
        [
          { f: 784, t: 0, d: 0.9, g: 0.05, type: "triangle" },
          { f: 523.3, t: 0.25, d: 1.1, g: 0.06, type: "triangle" },
          { f: 392, t: 0.5, d: 1.4, g: 0.06, type: "sine" },
          { f: 261.6, t: 0.8, d: 1.8, g: 0.07, type: "sine" },
        ],
        volume,
      );
    case "allumage":
      bruit(0.12, volume, 400);
      // Sifflement du transformateur ligne (15,7 kHz) : les plus jeunes l'entendront.
      return jouerNotes([{ f: 15734, t: 0.05, d: 1.6, g: 0.012, type: "sine" }, { f: 60, t: 0, d: 0.25, g: 0.2, type: "sine" }], volume);
    case "bip":
      // Bip du POST : un seul, court, tout va bien (ou presque).
      return jouerNotes([{ f: 1000, t: 0, d: 0.16, g: 0.08, type: "square" }], volume);
    case "disque":
      // Tête de lecture qui cherche : quelques clics secs filtrés.
      for (let i = 0; i < 3; i++) setTimeout(() => bruit(0.018, volume * 0.9, 2600), i * (40 + Math.random() * 60));
      return;
    case "neige":
      // Souffle blanc entre deux chaînes, à peine filtré.
      return bruit(0.32, volume * 0.7, 5200);
    case "demagnetiser":
      bruit(0.5, volume * 0.6, 300);
      return jouerNotes([{ f: 50, t: 0, d: 0.9, g: 0.25, type: "sawtooth", glisse: 40 }], volume);
    case "hymne": {
      let t = 0;
      return jouerNotes(
        HYMNE.map(([f, d]) => {
          const n = { f, t, d: d * 0.95, type: "square" as OscillatorType, g: 0.09 };
          t += d;
          return n;
        }),
        volume,
      );
    }
  }
}
