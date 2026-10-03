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


# ----------------------------- Génériques d'émission -----------------------------

def _poser(sortie, x, t, g=1.0):
    i = int(t * SR)
    n = min(len(x), len(sortie) - i)
    if n > 0:
        sortie[i : i + n] += x[:n] * g


def timbale(f=70, d=1.2):
    t = np.arange(int(d * SR)) / SR
    return np.sin(2 * np.pi * (f + 40 * np.exp(-t * 18)) * t) * np.exp(-t * 3.5)


def cuivres(notes, d, coupure=2600):
    s = sum(scie(note(n), d, 0.005) for n in notes) / len(notes)
    return filtre(s, "low", coupure) * env(int(d * SR), 0.015, min(0.3, d * 0.4))


def cloche(n, d=1.6, g=1.0):
    t = np.arange(int(d * SR)) / SR
    f = note(n)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t)) * np.exp(-t * 3) * g


def xylo(n, d=0.5):
    t = np.arange(int(d * SR)) / SR
    f = note(n)
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 3.9 * t) * np.exp(-t * 30)) * np.exp(-t * 9)


def flute(n, d):
    t = np.arange(int(d * SR)) / SR
    f = note(n) * (1 + 0.006 * np.sin(2 * np.pi * 5 * t) * np.clip(t * 3, 0, 1))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.15 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    souffle = filtre(np.random.default_rng(5).standard_normal(len(t)), "band", [1500, 5000]) * 0.05
    return (s + souffle) * env(len(t), 0.06, min(0.2, d * 0.4))


def caisse_claire(d=0.18):
    n = int(d * SR)
    b = np.random.default_rng(9).standard_normal(n)
    return (filtre(b, "band", [1200, 7000]) + 0.6 * np.sin(2 * np.pi * 190 * np.arange(n) / SR)) * np.exp(-np.arange(n) / SR * 22)


def finir(x):
    x = np.tanh(x * 1.3) / 1.3
    return x / (np.abs(x).max() + 1e-9)


def jingle_ministere():
    """Message d'État : timbale, accord d'orgue solennel puis fanfare de trois cuivres très officiels."""
    s = np.zeros(int(6.5 * SR))
    _poser(s, timbale(55, 1.8), 0.0, 0.8)
    _poser(s, orgue([48], [5.8], 0.3) * 0.5, 0.05)
    _poser(s, orgue([55], [5.8], 0.3) * 0.4, 0.05)
    _poser(s, orgue([64], [5.8], 0.3) * 0.35, 0.05)
    for t0, notes, d in ((0.9, [60, 64, 67], 0.35), (1.3, [60, 64, 67], 0.35), (1.7, [65, 69, 72], 1.6)):
        _poser(s, cuivres(notes, d, 2200), t0, 0.55)
    _poser(s, timbale(55, 1.8), 1.7, 0.6)
    return finir(s * env(len(s), 0.02, 1.2))


def jingle_gras_capital():
    """Émission d'affaires années 90 : basse synthé qui monte, claquements de mains, accords brillants, tiroir-caisse."""
    bpm = 118
    b = 60 / bpm
    s = np.zeros(int(5.2 * SR))
    progression = [(45, [69, 72, 76]), (41, [69, 72, 77]), (43, [67, 71, 74]), (40, [67, 71, 76])]
    for k, (basse, acc) in enumerate(progression):
        t0 = k * 2 * b
        for c in range(4):
            x = filtre(scie(note(basse), b * 0.45, 0.002, 2), "low", 500) * env(int(b * 0.45 * SR), 0.003, 0.05)
            _poser(s, x, t0 + c * b / 2, 0.7)
        _poser(s, cuivres(acc, b * 1.6, 3800), t0, 0.5)
        _poser(s, caisse_claire(0.15), t0 + b, 0.45)
    _poser(s, cuivres([69, 73, 76, 81], 1.4, 4200), 8 * b, 0.6)
    _poser(s, cloche(93, 1.4, 0.25), 8 * b)
    return finir(s * env(len(s), 0.01, 0.6))


def jingle_porc_attache():
    """Magazine local : le générique de reportage, un ping de sonar, une corne de brume lointaine."""
    s = np.zeros(int(5.6 * SR))
    _poser(s, generique_reportage(), 0.0, 0.8)
    t = np.arange(int(1.8 * SR)) / SR
    corne = (scie(note(38), 1.8, 0.003, 3) * 0.6 + np.sin(2 * np.pi * note(50) * t) * 0.3)
    _poser(s, filtre(corne, "low", 700) * env(len(t), 0.25, 0.6), 3.4, 0.35)
    return finir(s)


def jingle_journal():
    """Journal : roulement de timbale, quatre notes de cuivres qui annoncent les nouvelles, cloche finale."""
    s = np.zeros(int(4.6 * SR))
    for k in range(10):
        _poser(s, timbale(62, 0.4), k * 0.06, 0.12 + 0.03 * k)
    for t0, n in ((0.6, 67), (0.85, 67), (1.1, 72), (1.35, 76)):
        _poser(s, cuivres([n, n - 12], 0.22, 3000), t0, 0.6)
    _poser(s, cuivres([72, 76, 79, 84], 2.2, 3200), 1.65, 0.7)
    _poser(s, timbale(55, 1.5), 1.65, 0.8)
    _poser(s, cloche(96, 2.0, 0.2), 1.65)
    return finir(s * env(len(s), 0.01, 0.8))


def jingle_stade():
    """Sport : sifflet, roulement de caisse claire, fanfare de trompettes qui monte."""
    s = np.zeros(int(4.4 * SR))
    t = np.arange(int(0.6 * SR)) / SR
    sifflet = np.sin(2 * np.pi * (2900 + 120 * np.sign(np.sin(2 * np.pi * 28 * t))) * t) * env(len(t), 0.01, 0.08)
    _poser(s, sifflet, 0.0, 0.25)
    for k in range(14):
        _poser(s, caisse_claire(0.1), 0.55 + k * 0.045, 0.2 + 0.03 * k)
    for t0, n in ((1.2, 60), (1.38, 64), (1.56, 67), (1.74, 72)):
        _poser(s, cuivres([n, n + 7], 0.2, 3600), t0, 0.6)
    _poser(s, cuivres([72, 76, 79], 1.9, 3800), 1.95, 0.7)
    _poser(s, timbale(60, 1.2), 1.95, 0.7)
    return finir(s * env(len(s), 0.01, 0.6))


def jingle_education():
    """Éducation civique : xylophone d'école, une petite mélodie appliquée, un « ding » de bonne réponse."""
    s = np.zeros(int(4.4 * SR))
    for k, n in enumerate([72, 74, 76, 79, 76, 79, 84]):
        _poser(s, xylo(n, 0.6), 0.1 + k * 0.22, 0.6)
    _poser(s, xylo(60, 1.2) + xylo(64, 1.2) + xylo(67, 1.2), 1.7, 0.35)
    _poser(s, cloche(91, 1.8, 0.4), 1.75)
    return finir(s)


def jingle_nature(grave=False):
    """Documentaire animalier : flûte, marimba, petit gazouillis (plus grave et mystérieux pour les grandes bêtes)."""
    s = np.zeros(int(4.8 * SR))
    dec = -12 if grave else 0
    for t0, n, d in ((0.1, 74, 0.5), (0.6, 79, 0.5), (1.1, 81, 0.4), (1.5, 79, 0.4), (1.9, 86, 1.6)):
        _poser(s, flute(n + dec, d), t0, 0.5)
    for k, n in enumerate([62, 69, 74, 69, 62, 69, 74, 78]):
        _poser(s, xylo(n + dec, 0.5), 0.1 + k * 0.25, 0.3)
    if not grave:
        for k in range(4):
            t = np.arange(int(0.08 * SR)) / SR
            _poser(s, np.sin(2 * np.pi * (3200 + 1500 * t / 0.08) * t) * env(len(t), 0.005, 0.03), 2.6 + k * 0.13, 0.12)
    return finir(s * env(len(s), 0.01, 1.0))


def jingle_meteo():
    """Météo de la Mousse : vibraphone léger et bulles qui remontent."""
    s = np.zeros(int(4.4 * SR))
    for k, n in enumerate([76, 79, 83, 88, 86, 83]):
        _poser(s, cloche(n, 1.2, 0.35), 0.1 + k * 0.2)
    rng = np.random.default_rng(4)
    for k in range(14):
        d = 0.06
        t = np.arange(int(d * SR)) / SR
        f0 = rng.uniform(500, 1400)
        _poser(s, np.sin(2 * np.pi * (f0 + f0 * 2 * t / d) * t) * env(len(t), 0.004, 0.02), 1.4 + k * 0.12 + rng.uniform(0, 0.05), 0.18)
    _poser(s, cloche(76, 2.0, 0.3) + cloche(83, 2.0, 0.2), 1.6)
    return finir(s * env(len(s), 0.01, 0.8))


def jingle_initial_p():
    """Ouverture d'animé : eurobeat à fond, arpèges de synthé au double croche, grosse caisse en quatre, coup final."""
    bpm = 155
    b = 60 / bpm
    s = np.zeros(int(3.6 * SR))
    t = np.arange(int(0.25 * SR)) / SR
    gc = np.sin(2 * np.pi * (50 + 120 * np.exp(-t * 35)) * t) * np.exp(-t * 12)
    accords = [[69, 72, 76], [65, 69, 72], [67, 71, 74], [64, 68, 71]]
    for k in range(16):
        _poser(s, gc, k * b, 0.8)
    for k in range(64):
        acc = accords[(k // 16) % 4]
        n = acc[k % 3] + 12
        x = filtre(scie(note(n), b / 4 * 0.9, 0.004, 2), "low", 5000) * env(int(b / 4 * 0.9 * SR), 0.002, 0.02)
        _poser(s, x, k * b / 4, 0.35)
    return finir(s * env(len(s), 0.005, 0.25))
