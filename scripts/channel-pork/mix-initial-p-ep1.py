"""Initial P, épisode 1 « Le drift du verre plein » : voix, musique (Night Highway Heartbreak) et bruitages.
Voix : voix/initial-p-ep1/*.opus (initial-p-ep1-repliques.json). Bruitages CC0 : sons/bruitages/ (LICENCES.md).
Sortie : sortie/initial-p-ep1.wav, .mp3 et .json (plans, sous-titres)."""
import json
import os

import numpy as np
from scipy import signal
from scipy.io import wavfile

from commun import ICI, SORTIE, SR, encoder_mp3, lire

rng = np.random.default_rng(3)


def filtre(x, k, f, o=2):
    return signal.sosfilt(signal.butter(o, f, k, fs=SR, output="sos"), x)


def env(n, a=0.005, r=0.05):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def norm(x, pic=0.9):
    return x / (np.abs(x).max() + 1e-9) * pic


def bruitage(nom, niveau=0.5, hauteur=1.0):
    """Bruitage CC0 normalisé ; `hauteur` > 1 l'accélère et le rend plus aigu (rééchantillonnage)."""
    x = norm(lire(os.path.join(ICI, "sons", "bruitages", nom + ".opus")))
    if hauteur != 1.0:
        x = signal.resample(x, int(len(x) / hauteur))
    return x * niveau


def voix(nom):
    x = filtre(lire(os.path.join(ICI, "voix", "initial-p-ep1", nom + ".opus")), "high", 90)
    n = SR // 50
    e = np.array([np.sqrt((x[i : i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    idx = np.nonzero(e > max(0.012, e.max() * 0.06))[0]
    x = x[max(0, idx[0] * n - n) : (idx[-1] + 2) * n]
    x = x / (np.sqrt((x**2).mean()) + 1e-9) * 0.12
    return np.tanh(x * 1.5) / 1.5 * env(len(x), 0.004, 0.03)


def boucle(x, d, fondu=0.4):
    """Répète `x` en fondu enchaîné jusqu'à durer `d` secondes."""
    n, f = int(d * SR), int(fondu * SR)
    out = np.zeros(n + len(x))
    pos = 0
    while pos < n:
        m = x.copy()
        m[:f] *= np.linspace(0, 1, f)
        m[-f:] *= np.linspace(1, 0, f)
        out[pos : pos + len(m)] += m
        pos += len(x) - f
    return out[:n] * env(n, 0.3, 0.8)


def pneus(d=2.4, niveau=0.32):
    """Crissement de pneus : frottement adhérence-glissement du caoutchouc, un sifflement vers 1 kHz qui tremble
    et décroche, avec le souffle de la gomme qui arrache le bitume."""
    n = int(d * SR)
    t = np.arange(n) / SR
    f0 = 1050 + np.cumsum(rng.normal(0, 6, n)) * 0.02
    f0 = np.clip(signal.savgol_filter(f0, 2001, 2), 850, 1350) * (1 - 0.12 * t / d)
    ph = 2 * np.pi * np.cumsum(f0) / SR
    rugueux = 0.6 + 0.4 * filtre(rng.standard_normal(n), "low", 45) * 4
    son = (np.sin(ph) + 0.45 * np.sin(2 * ph + 0.3) + 0.2 * np.sin(3 * ph)) * np.clip(rugueux, 0, 1.4)
    son += 0.5 * filtre(rng.standard_normal(n), "band", [1800, 5500], 4)
    son = filtre(son, "band", [600, 7000], 2)
    return norm(son) * env(n, 0.06, 0.9) * niveau


def scintille(d=1.6, niveau=0.22):
    """Scintillement « divin » pour l'entrée de John Pork : cloches métalliques montées de deux octaves, en cascade."""
    out = np.zeros(int(d * SR) + SR)
    for k, h in enumerate((3.0, 4.0, 3.6, 4.8, 5.4)):
        x = bruitage("ding-4", niveau, h)
        i = int(k * 0.09 * SR)
        out[i : i + len(x)] += x[: len(out) - i]
    return out * 0.7


def tintements(n=5, niveau=0.14):
    """Bouteilles qui s'entrechoquent dans une caisse."""
    out = np.zeros(int(1.6 * SR))
    for k in range(n):
        x = bruitage("ding-2", niveau * (0.6 + 0.4 * rng.random()), 2.4 + rng.random() * 1.2)[: int(0.35 * SR)]
        x *= env(len(x), 0.001, 0.2)
        i = int((0.05 + k * 0.22 + rng.random() * 0.08) * SR)
        out[i : i + len(x)] += x[: len(out) - i]
    return out


# (plan, [(voix, texte, écart avant)], [(bruitage, décalage depuis le début du plan)])
D = [
    ("route", [("N1", "Mont Porcin. Deux heures du matin ! Sur ces routes, un seul nom fait trembler les glissières… Tonio ! Le livreur de bière !", 3.0),
               ("T1", "Douze caisses de Douzi avant l'aube ! Euh… douze aubes avant la caisse. Non. Bref, on y va !", 0.5)],
     [("demarrage", 0.3), ("acceleration", 1.9)]),
    ("volant", [("T2", "Hein ?! Des phares dans mon rétro ? À cette heure-ci ?!", 0.8)], [("swish", 0.0), ("klaxon-double", 0.25)]),
    ("rival", [("J1", "Bonsoir, livreur. Je suis John Pork. Et cette montagne… m'appartient.", 1.6),
               ("T3", "Ah. Moi c'est Tonio. Et la bière, elle appartient à la taverne.", 0.5),
               ("J2", "Course jusqu'au sommet. Le perdant… paie sa tournée.", 0.5),
               ("T4", "Ça marche ! Euh… ça roule !", 0.4)],
     [("acceleration-2", 0.0), ("scintille", 1.3)]),
    ("compteur", [("N2", "Quarante kilomètres-heure ! L'aiguille tremble ! La Palou donne tout ce qu'elle a !", 1.2),
                  ("T5", "Allez ma belle ! Allez !", 0.3)],
     [("swish", 0.0), ("acceleration", 0.1), ("acceleration-2", 2.6)]),
    ("drift", [("J3", "Impossible… Il drifte… à quarante ?!", 2.6),
               ("N3", "Le drift du verre plein ! Pas une goutte renversée !", 0.3),
               ("T6", "Attention les caisses ! Euh… les caisses, attention !", 0.3)],
     [("swish", 0.0), ("pneus", 0.15), ("tintements", 1.9)]),
    ("arrete", [("J4", "Il roulait si lentement… que j'ai dû m'arrêter pour ne pas le dépasser. Personne… ne m'avait jamais fait ça.", 2.6)],
     [("extinction", 0.0), ("frein-a-main", 1.9)]),
    ("sommet", [("T7", "Douze caisses. Pile à l'heure ! Enfin… à une heure près.", 2.2),
                ("J5", "Tonio… Tu m'as battu. Ce soir, la tournée est pour moi.", 0.6),
                ("T8", "C'est moi qui livre la bière, en fait.", 0.5),
                ("N4", "Prochain épisode : la Palou contre le tracteur ! Ne le manquez pas !", 1.0)],
     [("portiere-ouvre", 0.2), ("portiere-ferme", 0.9), ("coffre", 1.5), ("tintements", 1.8)]),
]
FX = {
    "pneus": pneus,
    "scintille": scintille,
    "tintements": tintements,
    "klaxon-double": lambda: np.concatenate([bruitage("klaxon", 0.35)[: int(0.22 * SR)], np.zeros(int(0.08 * SR)), bruitage("klaxon", 0.35)]),
    "acceleration": lambda: bruitage("acceleration", 0.42),
    "acceleration-2": lambda: bruitage("acceleration-2", 0.42),
    "swish": lambda: bruitage("swish", 0.3, 0.75),
}

voix_pistes, fx_pistes, sous, plans, t = [], [], [], [], 0.0
for plan, lignes, sons in D:
    plans.append([plan, round(t, 2)])
    debut_plan = t
    for nom, dec in sons:
        x = FX[nom]() if nom in FX else bruitage(nom, 0.4)
        fx_pistes.append((debut_plan + dec, x))
    for v, texte, ecart in lignes:
        d0 = t + ecart
        s = voix(v)
        voix_pistes.append((d0, s))
        sous.append({"at": round(d0, 2), "dur": round(len(s) / SR, 2), "text": texte})
        t = d0 + len(s) / SR
    t += 0.8
duree = t + 4.5
n = int(duree * SR)
p = dict(plans)


def poser(dest, pistes):
    for d0, s in pistes:
        i = int(d0 * SR)
        dest[i : i + len(s)] += s[: max(0, len(dest) - i)]


voixseule = np.zeros(n + SR)
poser(voixseule, voix_pistes)
bruit = np.zeros(n + SR)
poser(bruit, fx_pistes)
# Moteur de la Palou en continu jusqu'à l'arrêt de John Pork (étouffé dans l'habitacle sur le gros plan de Tonio).
mot = boucle(bruitage("moteur", 0.22), p["arrete"] + 0.5)
mot[int(p["volant"] * SR) : int(p["rival"] * SR)] = filtre(mot[int(p["volant"] * SR) : int(p["rival"] * SR)], "low", 600)
bruit[int(1.6 * SR) : int(1.6 * SR) + len(mot)] += mot[: len(bruit) - int(1.6 * SR)]
# Fanfare de fin sur « Prochain épisode », klaxon de la Palou pour conclure.
fan = bruitage("fanfare", 0.45)
d_fan = sous[-1]["at"] - 0.3
poser(bruit, [(d_fan, fan), (d_fan + len(fan) / SR - 0.6, bruitage("klaxon", 0.3))])

# Musique : présente d'un bout à l'autre, elle se retire doucement (6 dB au plus) sous la parole, sans pomper.
mus = lire(os.path.join(ICI, "sons", "night-highway-heartbreak.opus"))[int(2 * SR) :][: len(voixseule)]
mus = np.pad(mus, (0, len(voixseule) - len(mus)))
cache = filtre(np.abs(voixseule), "low", 0.6, 1)
cache = np.clip(cache / (np.percentile(cache[cache > 1e-4], 90) + 1e-9), 0, 1)
duck = 1 - 0.5 * cache
fin = np.ones(len(voixseule))
f0 = int((duree - 4.0) * SR)
fin[f0:] = np.clip(np.linspace(1, 0, len(voixseule) - f0), 0, 1)
# Les bruitages passent devant la musique, la voix devant tout.
mix = voixseule + bruit * (1 - 0.35 * cache) + mus * duck * fin * 0.34
mix = mix[:n]
mix = np.tanh(filtre(mix, "low", 14000) * 1.15) / 1.15
mix = mix / np.abs(mix).max() * 0.9
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "initial-p-ep1.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "initial-p-ep1.wav"), os.path.join(SORTIE, "initial-p-ep1.mp3"))
json.dump({"duree": round(duree, 2), "plans": plans, "sous_titres": sous}, open(os.path.join(SORTIE, "initial-p-ep1.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(duree, 1), plans)
