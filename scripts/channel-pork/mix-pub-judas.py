"""Pub « Judas Qui c'est ? » : voix (vendeur, son double derrière la porte, voix off) et vrais bruitages CC0 (sonnette,
coups à la porte, poignée), sans musique sauf la fanfare finale. Voix : voix/pub-judas/*.opus (pub-judas-repliques.json).
Sortie : sortie/pub-judas.wav, .mp3 et .json (plans, sous-titres)."""
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


def bruitage(nom, niveau=0.4):
    x = lire(os.path.join(ICI, "sons", "bruitages", nom + ".opus"))
    return x / (np.abs(x).max() + 1e-9) * niveau


def voix(nom):
    x = filtre(lire(os.path.join(ICI, "voix", "pub-judas", nom + ".opus")), "high", 90)
    n = SR // 50
    e = np.array([np.sqrt((x[i : i + n] ** 2).mean()) for i in range(0, len(x) - n, n)])
    idx = np.nonzero(e > max(0.012, e.max() * 0.06))[0]
    x = x[max(0, idx[0] * n - n) : (idx[-1] + 2) * n]
    x = x / (np.sqrt((x**2).mean()) + 1e-9) * 0.12
    if nom.startswith("D"):
        # Le double crie depuis le palier : étouffé par la porte, un peu de résonance de cage d'escalier.
        x = filtre(filtre(x, "low", 2200, 4), "high", 250)
        x = x + 0.25 * np.concatenate([np.zeros(int(0.06 * SR)), x])[: len(x)] + 0.12 * np.concatenate([np.zeros(int(0.13 * SR)), x])[: len(x)]
        x = x / (np.sqrt((x**2).mean()) + 1e-9) * 0.09
    return np.tanh(x * 1.5) / 1.5 * env(len(x), 0.004, 0.03)


def toc(k, niveau=0.5):
    return filtre(bruitage(f"toc-{k}", niveau), "low", 3000)


# Plans (image) et ce qui s'y passe, dans l'ordre : ("v", réplique, texte, écart) ou ("b", bruitage, écart, avance?).
D = [
    ("01_presentateur_large", [("v", "V1", "Votre beau-frère, ce gros fils de pute, vient encore torcher vos bières avant de repeindre vos chiottes ? Avec le judas « Qui c'est ? », voyez sa sale gueule douze minutes à l'avance et laissez-le se branler sur la sonnette.", 0.8),
                               ("b", "sonnette", 0.1, True)]),
    ("02_presentateur_gros_plan", [("v", "V2", "Douze minutes pour planquer la picole, couper la lumière et faire le mort. Qu'il aille se faire foutre chez les voisins : vous avez payé votre tranquillité, bordel.", 0.5)]),
    ("03_produit", [("b", "ding-1", 0.1, False),
                    ("v", "V3", "Pas de piles. Pas d'abonnement. Pas d'application de merde qui veut accéder à votre trou du cul. Vous vissez ce petit machin dans la porte et vous savez quel connard arrive.", 0.6)]),
    ("04_demonstration", [("v", "V4", "Voyons quelle tête de bite vient me casser les couilles…", 0.5), ("silence", 2.0)]),
    ("05_vue_judas", [("v", "V5", "Ah. C'est moi.", 0.3),
                      ("v", "D1", "N'OUVRE PAS, PUTAIN ! J'ai ouvert ! Je suis toi et j'ai ouvert, espèce de grosse merde ! Éloigne ta main !", 0.4),
                      ("v", "V6", "Une netteté exceptionnelle. On voit même que je me suis chié dessus.", 0.6)]),
    ("06_sourire_crispe", [("v", "V7", "Grâce à ses douze minutes d'avance, finissez tranquillement votre assiette pendant que ce pauvre con se pisse dessus sur le palier !", 0.5),
                           ("v", "D2", "C'EST PAS MA PISSE, PUTAIN !", 0.15),
                           ("silence", 1.3),
                           ("v", "V8", "Le laiton se nettoie avec un chiffon humide.", 0.0)]),
    ("07_poignee", [("v", "V9", "Bien sûr… si la visite vous fait chier, vous n'ouvrez pas. Vous restez chez vous, comme un connard normal.", 0.5),
                    ("toc", 0.7),
                    ("v", "V10", "Ça fait pas douze minutes.", 0.6),
                    ("b", "poignee", 0.5, True), ("b", "grincement", 0.0, True),
                    ("v", "V11", "Putain, j'avais fermé à clé.", 0.3)]),
    ("08_final", [("b", "fanfare", 0.2, False),
                  ("v", "O1", "Le judas « Qui c'est ? » : voyez venir les emmerdes !", 0.5),
                  ("v", "V12", "Pour les remboursements, allez vous faire foutre.", 0.8),
                  ("b", "porte-coup", 0.5, True),
                  ("v", "V13", "Pardon. Envoyez un courrier.", 0.6)]),
    ("noir", [("silence", 1.6)]),
]
NIVEAUX = {"sonnette": 0.3, "ding-1": 0.25, "poignee": 0.45, "grincement": 0.3, "fanfare": 0.3, "porte-coup": 0.9}

pistes, sous, plans, t = [], [], [], 0.0
for plan, items in D:
    plans.append([plan, round(t, 2)])
    for it in items:
        if it[0] == "v":
            _, nom, texte, ecart = it
            s = voix(nom)
            t += ecart
            pistes.append((t, s))
            sous.append({"at": round(t, 2), "dur": round(len(s) / SR, 2), "voix": nom, "text": texte})
            t += len(s) / SR
        elif it[0] == "b":
            _, nom, ecart, avance = it
            s = bruitage(nom, NIVEAUX.get(nom, 0.4))
            if nom == "fanfare":
                s = s * env(len(s), 0.01, 1.5)
            if nom == "sonnette":
                s = s[: int(2.2 * SR)] * env(int(2.2 * SR), 0.005, 0.6)
            t += ecart
            pistes.append((t, s))
            if avance:
                t += len(s) / SR
        elif it[0] == "toc":
            # Trois coups à la porte, secs et polis.
            t += it[1]
            for k in range(3):
                pistes.append((t, toc(k + 1)))
                t += 0.38
            t += 0.2
        elif it[0] == "silence":
            t += it[1]
duree = t
n = int(duree * SR)
mix = np.zeros(n + 10 * SR)
for d0, s in pistes:
    i = int(d0 * SR)
    mix[i : i + len(s)] += s
mix = mix[:n]
mix = mix / np.abs(mix).max() * 0.9
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "pub-judas.wav"), SR, (mix * 32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "pub-judas.wav"), os.path.join(SORTIE, "pub-judas.mp3"))
json.dump({"duree": round(duree, 2), "plans": plans, "sous_titres": sous}, open(os.path.join(SORTIE, "pub-judas.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(duree, 1), plans)
