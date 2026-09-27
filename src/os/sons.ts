/**
 * Sons système : carillon de démarrage, alertes, arrêt, démagnétisation et neige du téléviseur sont synthétisés ;
 * la machine elle-même (interrupteur, ventilateur, disque dur, lecteur de disquette, tube, bip du POST) joue des
 * échantillons pré-calculés (`public/audio/pc/`), avec la synthèse en secours s'ils ne chargent pas. Le navigateur n'autorise le son qu'après un geste de l'utilisateur ;
 * avant cela, les appels sont silencieusement ignorés.
 */
export type Son = "demarrage" | "ding" | "erreur" | "arret" | "allumage" | "demagnetiser" | "hymne" | "bip" | "disque" | "neige" | "demarrage-pc" | "disquette";

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

/** Échantillons de la machine, téléchargés dès le chargement de la page et décodés au premier besoin. */
const PC = "/audio/pc/";
const ECHANTILLONS = ["demarrage-pc.mp3", "ecran-allumage.mp3", "bip-post.mp3", "disquette.mp3", "disque-0.mp3", "disque-1.mp3", "disque-2.mp3", "disque-3.mp3", "ambiance.wav"];
const octets = new Map<string, Promise<ArrayBuffer | null>>();
const decodes = new Map<string, Promise<AudioBuffer | null>>();

function telecharger(nom: string) {
  let p = octets.get(nom);
  if (!p) {
    p = fetch(PC + nom).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
    octets.set(nom, p);
  }
  return p;
}

if (typeof window !== "undefined" && typeof fetch === "function") setTimeout(() => ECHANTILLONS.forEach(telecharger), 300);

function echantillon(a: AudioContext, nom: string) {
  let p = decodes.get(nom);
  if (!p) {
    p = telecharger(nom).then((b) => (b ? a.decodeAudioData(b.slice(0)).catch(() => null) : null));
    decodes.set(nom, p);
  }
  return p;
}

/** Joue un échantillon vers `sortie` (ou les haut-parleurs) ; `secours` s'il est introuvable. Rend la source lancée. */
async function lire(nom: string, volume: number, secours?: () => void, sortie?: AudioNode, boucle = false) {
  const a = audio();
  if (!a) return null;
  const buf = await echantillon(a, nom);
  if (!buf) {
    secours?.();
    return null;
  }
  const src = a.createBufferSource();
  src.buffer = buf;
  src.loop = boucle;
  const g = a.createGain();
  g.gain.value = volume;
  src.connect(g).connect(sortie ?? a.destination);
  src.start();
  return src;
}

/** Une seule rafale de disque à la fois : la tête ne cherche pas deux secteurs en même temps. */
let disqueOccupeJusqua = 0;
function rafaleDisque(volume: number, sortie?: AudioNode) {
  const a = audio();
  if (!a || a.currentTime < disqueOccupeJusqua) return;
  disqueOccupeJusqua = a.currentTime + 0.5;
  void lire(`disque-${Math.floor(Math.random() * 4)}.mp3`, volume * (0.6 + Math.random() * 0.4), () => {
    for (let i = 0; i < 3; i++) setTimeout(() => bruit(0.018, volume * 0.9, 2600), i * (40 + Math.random() * 60));
  }, sortie);
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
 * Secours synthétique du démarrage du PC : le ventilateur prend de la vitesse, le disque dur monte en régime (sifflement qui grimpe),
 * puis quelques claquements de tête. Programmé même si le son n'est pas encore libéré : il part au premier geste.
 */
function demarragePcSynth(volume: number) {
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
 * Ambiance de fond tant que la machine est allumée : boucle enregistrée (ventilateur, ronflement du secteur,
 * sifflement du transformateur du tube) et, de temps en temps, le disque dur qui s'active tout seul comme il
 * le faisait toujours, sans raison connue. `volume` 0 ou machine éteinte : on arrête. `delai` (s) : juste après
 * l'allumage, la boucle attend la fin du démarrage et prend le relais pendant son fondu, au même niveau.
 */
export function ambiance(allumee: boolean, volume = 0.5, delai = 0) {
  if (!allumee || volume <= 0) {
    ambianceEnCours?.arreter();
    ambianceEnCours = null;
    return;
  }
  if (ambianceEnCours) return;
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + 0.05 + delai;
  const sortie = a.createGain();
  sortie.gain.setValueAtTime(0, a.currentTime);
  sortie.gain.setValueAtTime(0, t0);
  sortie.gain.linearRampToValueAtTime(volume, t0 + (delai ? 1 : 2.5));
  sortie.connect(a.destination);
  let arrete = false;
  let boucle: AudioBufferSourceNode | null = null;
  let secours: { arreter(): void } | null = null;
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  const grattement = () => {
    minuterie = setTimeout(() => {
      if (arrete) return;
      rafaleDisque(0.5, sortie);
      if (Math.random() < 0.35) setTimeout(() => !arrete && rafaleDisque(0.4, sortie), 600 + Math.random() * 500);
      grattement();
    }, (delai + 6 + Math.random() * 16) * 1000);
  };
  void lire("ambiance.wav", 1, () => {
    if (!arrete) secours = ambianceSynth(a, sortie);
  }, sortie, true).then((src) => {
    if (arrete) src?.stop();
    else boucle = src;
  });
  grattement();
  ambianceEnCours = {
    arreter() {
      arrete = true;
      clearTimeout(minuterie);
      const t = a.currentTime;
      sortie.gain.cancelScheduledValues(t);
      sortie.gain.setValueAtTime(sortie.gain.value, t);
      sortie.gain.linearRampToValueAtTime(0, t + 0.8);
      boucle?.stop(t + 0.9);
      secours?.arreter();
    },
  };
}

/** Secours synthétique de l'ambiance : souffle brun, 50 Hz et ses harmoniques, 15,7 kHz. */
function ambianceSynth(a: AudioContext, sortie: AudioNode) {
  const t0 = a.currentTime + 0.05;
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
  return {
    arreter() {
      for (const src of sources) src.stop(a.currentTime + 0.9);
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
      // Claquement du tube, crépitement de la haute tension et sifflement du transformateur ligne (15,7 kHz).
      return void lire("ecran-allumage.mp3", volume, () => {
        bruit(0.12, volume, 400);
        jouerNotes([{ f: 15734, t: 0.05, d: 1.6, g: 0.012, type: "sine" }, { f: 60, t: 0, d: 0.25, g: 0.2, type: "sine" }], volume);
      });
    case "bip":
      // Bip du POST par le haut-parleur de la carte mère : un seul, court, tout va bien (ou presque).
      return void lire("bip-post.mp3", volume, () => jouerNotes([{ f: 1000, t: 0, d: 0.16, g: 0.08, type: "square" }], volume));
    case "disquette":
      // Le lecteur A: vérifie qu'il n'y a pas de disquette, comme chaque fois depuis 1987.
      return void lire("disquette.mp3", volume);
    case "disque":
      // Tête de lecture qui cherche.
      return rafaleDisque(volume);
    case "demarrage-pc":
      // Interrupteur, relais de l'alimentation, ventilateur qui prend son régime, disque dur qui monte et cherche.
      return void lire("demarrage-pc.mp3", volume, () => demarragePcSynth(volume));
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
