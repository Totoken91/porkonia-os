"""Pub Brasswagen Palou : voix et design sonore de vrais bruitages (route, moteur, portière, klaxon), sans musique
ni son synthétique. Voix : voix/pub-brasswagen/*.opus (pub-brasswagen-repliques.json). Bruitages CC0 :
sons/bruitages/ (LICENCES.md). Sortie : sortie/pub-brasswagen.wav, .mp3 et .json (plans, sous-titres)."""
import json
import os

import numpy as np
from scipy import signal
from scipy.io import wavfile

from commun import ICI, SORTIE, SR, encoder_mp3, lire


def filtre(x, k, f, o=2):
    return signal.sosfilt(signal.butter(o, f, k, fs=SR, output="sos"), x)


def env(n, a=0.005, r=0.05):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def bruitage(nom, niveau=0.4, hauteur=1.0):
    x = lire(os.path.join(ICI, "sons", "bruitages", nom + ".opus"))
    x = x / (np.abs(x).max() + 1e-9)
    if hauteur != 1.0:
        x = signal.resample(x, int(len(x) / hauteur))
    return x * niveau


def boucle(x, d, fondu=0.4):
    n, f = int(d * SR), int(fondu * SR)
    out = np.zeros(n + len(x))
    pos = 0
    while pos < n:
        m = x.copy()
        m[:f] *= np.linspace(0, 1, f)
        m[-f:] *= np.linspace(1, 0, f)
        out[pos : pos + len(m)] += m
        pos += len(x) - f
    return out[:n] * env(n, 0.8, 1.0)


def voix(nom):
    x = filtre(lire(os.path.join(ICI, "voix", "pub-brasswagen", nom + ".opus")), "high", 90)
    n = SR // 50
    e = np.array([np.sqrt((x[i : i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    idx = np.nonzero(e > max(0.012, e.max() * 0.06))[0]
    x = x[max(0, idx[0] * n - n) : (idx[-1] + 2) * n]
    x = x / (np.sqrt((x**2).mean()) + 1e-9) * 0.12
    return np.tanh(x * 1.5) / 1.5 * env(len(x), 0.004, 0.03)


# (plan, voix, texte, écart avant, [(bruitage, décalage depuis le début du plan, niveau)])
D = [
    ("route", "N1", "Il y a des routes qui ne mènent nulle part.", 1.4, []),
    ("mouvement", "N2", "La Brasswagen Palou, elle, y va quand même.", 1.2, [("acceleration", 0.0, 0.32)]),
    ("compteur", "N3", "Un milliard de porkomètres au compteur. Moteur d'origine.", 1.2, []),
    ("volant", "T1", "Elle a jamais calé. Une fois, elle a calé… euh, non. J'ai calé. Elle, jamais.", 1.0, []),
    ("temoignage", "T2", "Je l'ai achetée en 2012. Elle m'a acheté en… euh. Je l'ai achetée. Voilà.", 1.4, [("extinction", 0.0, 0.3), ("portiere-ferme", 0.9, 0.35)]),
    ("taverne", "N4", "Brasswagen Palou. Elle ne s'arrête pas. Elle se repose en roulant.", 1.0, [("demarrage", 0.1, 0.3)]),
    ("ciel", "N5", "Brasswagen. Et toujours plus de route.", 1.0, [("acceleration-2", 0.0, 0.3)]),
    ("logo", "N6", "Brasswagen, partenaire officiel de « Ferme ta gueule et réponds ». Kilométrage non contractuel. Route non fournie.", 1.6, [("ding-1", 0.0, 0.3)]),
]
voix_pistes, fx, sous, plans, t = [], [], [], [], 0.0
for plan, v, texte, ecart, sons in D:
    plans.append([plan, round(t, 2)])
    for nom, dec, niv in sons:
        fx.append((t + dec, bruitage(nom, niv)))
    d0 = t + ecart
    s = voix(v)
    voix_pistes.append((d0, s))
    sous.append({"at": round(d0, 2), "dur": round(len(s) / SR, 2), "text": texte})
    t = d0 + len(s) / SR + 0.5
duree = t + 1.6
n = int(duree * SR)
p = dict(plans)
mix = np.zeros(n + SR)
for d0, s in voix_pistes + fx:
    i = int(d0 * SR)
    mix[i : i + len(s)] += s[: len(mix) - i]
# La Palou roule : moteur au loin sur la route, plus présent en plan rapproché, étouffé dans l'habitacle.
mot = bruitage("moteur", 0.16)
for a, b, coupe, niv in (("route", "volant", 1400, 0.8), ("volant", "temoignage", 500, 1.0), ("taverne", "logo", 1400, 0.7)):
    m = filtre(boucle(mot, p[b] - p[a] + 0.6), "low", coupe) * niv
    i = int(p[a] * SR)
    mix[i : i + len(m)] += m[: len(mix) - i]
# Petit coup de klaxon de la Palou pour signer.
k = bruitage("klaxon", 0.22)[: int(0.25 * SR)] * env(int(0.25 * SR), 0.005, 0.08)
i = int((duree - 0.9) * SR)
mix[i : i + len(k)] += k[: len(mix) - i]
mix = mix[:n]
mix = mix / np.abs(mix).max() * 0.9
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "pub-brasswagen.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "pub-brasswagen.wav"), os.path.join(SORTIE, "pub-brasswagen.mp3"))
json.dump({"duree": round(duree, 2), "plans": plans, "sous_titres": sous}, open(os.path.join(SORTIE, "pub-brasswagen.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(duree, 1))
