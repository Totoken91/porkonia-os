"""Initial P, épisode 1 « Le drift du verre plein » : voix, musique (Night Highway Heartbreak), moteur, pneus.
Voix : voix/initial-p-ep1/*.opus (initial-p-ep1-repliques.json). Sortie : sortie/initial-p-ep1.wav, .mp3 et .json (plans, sous-titres)."""
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


def t_(d):
    return np.arange(int(d * SR)) / SR


def voix(nom):
    x = filtre(lire(os.path.join(ICI, "voix", "initial-p-ep1", nom + ".opus")), "high", 90)
    n = SR // 50
    e = np.array([np.sqrt((x[i : i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    idx = np.nonzero(e > max(0.012, e.max() * 0.06))[0]
    x = x[max(0, idx[0] * n - n) : (idx[-1] + 2) * n]
    x = x / (np.sqrt((x**2).mean()) + 1e-9) * 0.11
    return np.tanh(x * 1.5) / 1.5 * env(len(x), 0.004, 0.03)


def moteur(d, regime=38, niveau=0.05, monte=False):
    t = t_(d)
    f = regime * (1 + (0.6 * t / d if monte else 0) + 0.03 * np.sin(2 * np.pi * 0.4 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = sum(np.sin(k * ph) / k for k in range(1, 8)) + 0.4 * filtre(rng.standard_normal(len(t)), "band", [80, 700])
    return filtre(s, "low", 1200) * env(len(t), 0.3, 0.6) * niveau


def pneus(d=1.6):
    t = t_(d)
    crisse = filtre(rng.standard_normal(len(t)), "band", [1800, 4200], 4) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
    return crisse * env(len(t), 0.05, 0.5) * 0.09


def souffle(d=1.0):
    t = t_(d)
    s = filtre(rng.standard_normal(len(t)), "band", [300, 3000]) * np.sin(np.pi * t / d) ** 2
    return s * 0.12


# (plan, [(voix, texte, écart avant)], bruitages au début du plan)
D = [
    ("route", [("N1", "Mont Porcin. Deux heures du matin ! Sur ces routes, un seul nom fait trembler les glissières… Tonio ! Le livreur de bière !", 2.2),
               ("T1", "Douze caisses de Douzi avant l'aube ! Euh… douze aubes avant la caisse. Non. Bref, on y va !", 0.5)], ["moteur"]),
    ("volant", [("T2", "Hein ?! Des phares dans mon rétro ? À cette heure-ci ?!", 0.6)], []),
    ("rival", [("J1", "Bonsoir, livreur. Je suis John Pork. Et cette montagne… m'appartient.", 0.9),
               ("T3", "Ah. Moi c'est Tonio. Et la bière, elle appartient à la taverne.", 0.5),
               ("J2", "Course jusqu'au sommet. Le perdant… paie sa tournée.", 0.5),
               ("T4", "Ça marche ! Euh… ça roule !", 0.4)], ["souffle"]),
    ("compteur", [("N2", "Quarante kilomètres-heure ! L'aiguille tremble ! La Palou donne tout ce qu'elle a !", 0.7),
                  ("T5", "Allez ma belle ! Allez !", 0.3)], ["accelere"]),
    ("drift", [("J3", "Impossible… Il drifte… à quarante ?!", 1.4),
               ("N3", "Le drift du verre plein ! Pas une goutte renversée !", 0.3),
               ("T6", "Attention les caisses ! Euh… les caisses, attention !", 0.3)], ["pneus"]),
    ("arrete", [("J4", "Il roulait si lentement… que j'ai dû m'arrêter pour ne pas le dépasser. Personne… ne m'avait jamais fait ça.", 1.0)], []),
    ("sommet", [("T7", "Douze caisses. Pile à l'heure ! Enfin… à une heure près.", 1.2),
                ("J5", "Tonio… Tu m'as battu. Ce soir, la tournée est pour moi.", 0.6),
                ("T8", "C'est moi qui livre la bière, en fait.", 0.5),
                ("N4", "Prochain épisode : la Palou contre le tracteur ! Ne le manquez pas !", 1.0)], []),
]
pistes, sous, plans, t = [], [], [], 0.0
for plan, lignes, sons in D:
    plans.append([plan, round(t, 2)])
    debut_plan = t
    for v, texte, ecart in lignes:
        d0 = t + ecart
        s = voix(v)
        pistes.append((d0, s))
        sous.append({"at": round(d0, 2), "dur": round(len(s) / SR, 2), "text": texte})
        t = d0 + len(s) / SR
    t += 0.7
    for son in sons:
        d = t - debut_plan
        x = {"moteur": lambda: moteur(d), "accelere": lambda: moteur(d, 34, 0.07, True), "pneus": lambda: pneus(), "souffle": lambda: souffle()}[son]()
        pistes.append((debut_plan + (0.8 if son == "pneus" else 0.0), x))
duree = t + 2.5
n = int(duree * SR)
mix = np.zeros(n + SR)
voixseule = np.zeros(n + SR)
for d0, s in pistes:
    i = int(d0 * SR)
    mix[i : i + len(s)] += s[: len(mix) - i]
    voixseule[i : i + len(s)] += np.abs(s[: len(mix) - i])
# musique : de la 2e seconde du morceau, baissée sous la parole, fondu final
mus = lire(os.path.join(ICI, "sons", "night-highway-heartbreak.opus"))[int(2 * SR) :][: len(mix)]
mus = np.pad(mus, (0, len(mix) - len(mus)))
cache = filtre(voixseule, "low", 2.5, 1)
duck = 1 - 0.72 * np.clip(cache / (cache.max() + 1e-9) * 8, 0, 1)
fin = np.ones(len(mix)); f0 = int((duree - 3.0) * SR); fin[f0:] = np.linspace(1, 0, len(mix) - f0).clip(0, 1)
mix += mus * duck * fin * 0.22
mix = mix[:n]
mix = np.tanh(filtre(mix, "low", 12000) * 1.2) / 1.2
mix = mix / np.abs(mix).max() * 0.9
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "initial-p-ep1.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "initial-p-ep1.wav"), os.path.join(SORTIE, "initial-p-ep1.mp3"))
json.dump({"duree": round(duree, 2), "plans": plans, "sous_titres": sous}, open(os.path.join(SORTIE, "initial-p-ep1.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(duree, 1), plans)
