"""Petits instruments de synthèse pour les mixages de Channel Pork : générique de reportage local, techno-zouk de sous-marin,
orgue d'État bon marché. Tout est calculé ici (aucun échantillon tiers)."""
import numpy as np
from scipy import signal

from commun import SR


def filtre(x, k, f, o=2):
    return signal.sosfilt(signal.butter(o, f, k, fs=SR, output="sos"), x)


def env(n, a=0.005, r=0.05):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def note(f):
    """Fréquence d'une note MIDI."""
    return 440.0 * 2 ** ((f - 69) / 12)


def scie(f, d, desaccord=0.004, voix=3):
    t = np.arange(int(d * SR)) / SR
    x = np.zeros_like(t)
    for k in range(voix):
        fk = f * (1 + desaccord * (k - (voix - 1) / 2))
        x += 2 * ((t * fk + k * 0.31) % 1) - 1
    return x / voix


def generique_reportage():
    """Générique de magazine régional : trois accords de cuivres synthétiques, un balayage, un coup de timbale. ~3,4 s."""
    sortie = np.zeros(int(3.6 * SR))
    accords = [(0.0, [60, 64, 67, 72], 0.32), (0.36, [62, 65, 69, 74], 0.32), (0.72, [64, 67, 71, 76], 0.22),
               (0.98, [65, 69, 72, 77], 1.9)]
    for t0, notes, d in accords:
        s = sum(scie(note(n), d) for n in notes) / len(notes)
        s = filtre(s, "low", 2600 if d < 1 else 3400)
        e = env(len(s), 0.012, 0.12 if d < 1 else 1.1) * (0.85 if d < 1 else 1.0)
        i = int(t0 * SR)
        sortie[i : i + len(s)] += s * e
    # cloche brillante sur l'accord final
    t = np.arange(int(1.8 * SR)) / SR
    cloche = (np.sin(2 * np.pi * note(89) * t) + 0.4 * np.sin(2 * np.pi * note(89) * 2.76 * t)) * np.exp(-t * 3.2)
    i = int(0.98 * SR)
    sortie[i : i + len(cloche)] += cloche * 0.18
    # balayage de bruit montant avant l'accord final
    n = int(0.9 * SR)
    b = np.random.default_rng(12).standard_normal(n)
    b = filtre(b, "band", [600, 6000]) * np.linspace(0, 1, n) ** 2 * 0.25
    sortie[int(0.1 * SR) : int(0.1 * SR) + n] += b
    # timbale
    t = np.arange(int(1.2 * SR)) / SR
    timb = np.sin(2 * np.pi * (70 + 40 * np.exp(-t * 18)) * t) * np.exp(-t * 4)
    sortie[i : i + len(timb)] += timb * 0.5
    sortie = np.tanh(sortie * 1.4) / 1.4
    return sortie / np.abs(sortie).max()


def techno_zouk(duree=3.0, bpm=126):
    """Extrait techno-zouk brut : grosse caisse en quatre, basse en tresillo (3-3-2), charleston à contretemps,
    rimshot zouk. Coupé net à `duree`."""
    noire = 60 / bpm
    n = int((duree + 1) * SR)
    x = np.zeros(n)
    rng = np.random.default_rng(3)
    t = np.arange(int(0.35 * SR)) / SR
    gc = np.sin(2 * np.pi * (48 + 110 * np.exp(-t * 32)) * t) * np.exp(-t * 9)
    hat = filtre(rng.standard_normal(int(0.05 * SR)), "high", 7000) * np.exp(-np.arange(int(0.05 * SR)) / SR * 70)
    rim = filtre(rng.standard_normal(int(0.08 * SR)), "band", [1500, 4500]) * np.exp(-np.arange(int(0.08 * SR)) / SR * 50)
    basse = [45, 45, 48, 43]  # la, la, do, sol : une mesure de deux temps chacun
    temps = int(duree / noire) + 2
    for k in range(temps):
        i = int(k * noire * SR)
        x[i : i + len(gc)] += gc[: n - i] * 0.9
        j = int((k + 0.5) * noire * SR)
        x[j : j + len(hat)] += hat[: n - j] * 0.25
        if k % 4 in (1, 3):
            j = int((k + 0.75) * noire * SR)
            x[j : j + len(rim)] += rim[: n - j] * 0.35
    for m in range(int(duree / (2 * noire)) + 1):
        racine = note(basse[m % len(basse)])
        for frac, d in ((0, 0.75), (0.75, 0.75), (1.5, 0.5)):
            i = int((m * 2 + frac) * noire * SR)
            s = filtre(scie(racine, d * noire, 0.002, 2), "low", 380) + 0.6 * np.sin(2 * np.pi * racine * np.arange(int(d * noire * SR)) / SR)
            s *= env(len(s), 0.004, 0.04)
            x[i : i + len(s)] += s[: n - i] * 0.75
    # nappe de clavier zouk, très bon marché
    acc = sum(scie(note(f), duree + 0.5, 0.006) for f in (69, 72, 76)) / 3
    acc = filtre(acc, "low", 1800) * (0.5 + 0.5 * (np.sin(2 * np.pi * (bpm / 60) * np.arange(len(acc)) / SR) > 0))
    x[: len(acc)] += acc[:n] * 0.18
    x = np.tanh(x[: int(duree * SR)] * 1.8)
    return x / np.abs(x).max()


def orgue(notes, durees, attaque=0.03):
    """Orgue électronique bon marché : tirettes 16'-8'-4' en sinus, léger trémolo, souffle d'ampli."""
    morceaux = []
    for n, d in zip(notes, durees):
        t = np.arange(int(d * SR)) / SR
        f = note(n)
        s = 0.6 * np.sin(2 * np.pi * f * 0.5 * t) + np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * f * 2 * t) + 0.15 * np.sin(2 * np.pi * f * 3 * t)
        s *= 1 + 0.12 * np.sin(2 * np.pi * 5.6 * t)
        s *= env(len(s), attaque, min(0.25, d * 0.4))
        morceaux.append(s)
    x = np.concatenate(morceaux)
    x += np.random.default_rng(7).standard_normal(len(x)) * 0.01
    x = filtre(x, "low", 3200)
    return x / np.abs(x).max()
