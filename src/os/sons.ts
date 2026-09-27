/**
 * Sons système synthétisés (aucun fichier audio) : carillon de démarrage, alertes, arrêt,
 * claquement du tube, démagnétisation et neige du téléviseur entre deux chaînes. Le navigateur n'autorise le son qu'après un geste de l'utilisateur ;
 * avant cela, les appels sont silencieusement ignorés.
 */
export type Son = "demarrage" | "ding" | "erreur" | "arret" | "allumage" | "demagnetiser" | "hymne" | "bip" | "disque" | "neige" | "demarrage-pc";

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

// Le navigateur ne libère le son qu'après un geste : on relance le contexte au premier clic ou à la première touche.
if (typeof window !== "undefined") {
  const liberer = () => {
    audio();
    window.removeEventListener("pointerdown", liberer, true);
    window.removeEventListener("keydown", liberer, true);
  };
  window.addEventListener("pointerdown", liberer, true);
  window.addEventListener("keydown", liberer, true);
}

/** Tampon de bruit (blanc ou brun) réutilisable, bouclé pour les sons continus. */
function tamponBruit(a: AudioContext, secondes: number, brun: boolean) {
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * secondes), a.sampleRate);
  const d = buf.getChannelData(0);
  let dernier = 0;
  for (let i = 0; i < d.length; i++) {
    const blanc = Math.random() * 2 - 1;
    dernier = brun ? (dernier + 0.02 * blanc) / 1.02 : blanc;
    d[i] = brun ? dernier * 3.5 : blanc;
  }
  return buf;
}

/**
 * Démarrage du PC : le ventilateur prend de la vitesse, le disque dur monte en régime (sifflement qui grimpe),
 * puis quelques claquements de tête. Programmé même si le son n'est pas encore libéré : il part au premier geste.
 */
function demarragePc(volume: number) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + 0.05;
  const sortie = a.createGain();
  sortie.gain.value = volume;
  sortie.connect(a.destination);
  // Ventilateur : souffle filtré dont la fréquence et le volume montent.
  const vent = a.createBufferSource();
  vent.buffer = tamponBruit(a, 3, false);
  const bande = a.createBiquadFilter();
  bande.type = "bandpass";
  bande.Q.value = 1.2;
  bande.frequency.setValueAtTime(120, t0);
  bande.frequency.exponentialRampToValueAtTime(520, t0 + 2.6);
  const gv = a.createGain();
  gv.gain.setValueAtTime(0.0001, t0);
  gv.gain.exponentialRampToValueAtTime(0.16, t0 + 1.8);
  gv.gain.exponentialRampToValueAtTime(0.05, t0 + 3);
  vent.connect(bande).connect(gv).connect(sortie);
  vent.start(t0);
  vent.stop(t0 + 3);
  // Disque dur : moteur qui grimpe en régime (fondamentale et harmonique).
  for (const [mult, niveau] of [[1, 0.035], [2.02, 0.018], [7.1, 0.006]] as const) {
    const o = a.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(18 * mult, t0 + 0.2);
    o.frequency.exponentialRampToValueAtTime(120 * mult, t0 + 2.8);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0 + 0.2);
    g.gain.exponentialRampToValueAtTime(niveau, t0 + 1.2);
    g.gain.exponentialRampToValueAtTime(niveau * 0.35, t0 + 3.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.2);
    const lp = a.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1400;
    o.connect(lp).connect(g).connect(sortie);
    o.start(t0 + 0.2);
    o.stop(t0 + 4.3);
  }
  // Tête de lecture : claquements secs une fois le disque lancé.
  const clic = tamponBruit(a, 0.02, false);
  for (const dt of [2.9, 3.05, 3.12, 3.4, 3.46, 3.8]) {
    const src = a.createBufferSource();
    src.buffer = clic;
    const hp = a.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2200;
    const g = a.createGain();
    g.gain.value = 0.22;
    src.connect(hp).connect(g).connect(sortie);
    src.start(t0 + dt + Math.random() * 0.04);
  }
}

let ambianceEnCours: { arreter(): void } | null = null;

/**
 * Ambiance de fond tant que la machine est allumée : souffle du ventilateur, ronflement du secteur (50 Hz)
 * et sifflement très aigu du transformateur du tube (15,7 kHz). `volume` 0 ou machine éteinte : on arrête.
 */
export function ambiance(allumee: boolean, volume = 0.5) {
  if (!allumee || volume <= 0) {
    ambianceEnCours?.arreter();
    ambianceEnCours = null;
    return;
  }
  if (ambianceEnCours) return;
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + 0.05;
  const sortie = a.createGain();
  sortie.gain.setValueAtTime(0.0001, t0);
  sortie.gain.exponentialRampToValueAtTime(volume, t0 + 2.5);
  sortie.connect(a.destination);
  const sources: AudioScheduledSourceNode[] = [];
  const vent = a.createBufferSource();
  vent.buffer = tamponBruit(a, 4, true);
  vent.loop = true;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 380;
  const gv = a.createGain();
  gv.gain.value = 0.05;
  vent.connect(lp).connect(gv).connect(sortie);
  sources.push(vent);
  for (const [f, niveau, type] of [[50, 0.012, "sine"], [100, 0.007, "sine"], [150, 0.0025, "triangle"], [15734, 0.0022, "sine"]] as const) {
    const o = a.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const g = a.createGain();
    g.gain.value = niveau;
    o.connect(g).connect(sortie);
    sources.push(o);
  }
  for (const src of sources) src.start(t0);
  ambianceEnCours = {
    arreter() {
      const t = a.currentTime;
      sortie.gain.cancelScheduledValues(t);
      sortie.gain.setValueAtTime(Math.max(0.0001, sortie.gain.value), t);
      sortie.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      for (const src of sources) src.stop(t + 0.9);
    },
  };
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
    case "demarrage-pc":
      return demarragePc(volume);
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
