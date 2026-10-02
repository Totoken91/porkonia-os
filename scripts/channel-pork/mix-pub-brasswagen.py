"""Pub Brasswagen Palou : voix, nappe synthé, moteur, compteur.
Voix : voix/pub-brasswagen/*.opus (pub-brasswagen-repliques.json). Sortie : sortie/pub-brasswagen.wav, .mp3 et .json (plans, sous-titres)."""
import json, os
import numpy as np
from scipy import signal
from scipy.io import wavfile
from commun import ICI, SORTIE, encoder_mp3, lire
SR = 44100
rng = np.random.default_rng(7)

def filtre(x, k, f, o=2): return signal.sosfilt(signal.butter(o, f, k, fs=SR, output="sos"), x)
def env(n, a=0.005, r=0.05):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR); e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e
def t_(d): return np.arange(int(d * SR)) / SR
def scie(f, t): return 2 * ((f * t) % 1) - 1

def voix(nom):
    x = filtre(lire(os.path.join(ICI, "voix", "pub-brasswagen", nom + ".opus")), "high", 90); n = SR // 50
    e = np.array([np.sqrt((x[i:i+n]**2).mean()) for i in range(0, len(x)-n, n)])
    idx = np.nonzero(e > max(0.012, e.max()*0.06))[0]
    x = x[max(0, idx[0]*n-n): (idx[-1]+2)*n]
    x = x / (np.sqrt((x**2).mean()) + 1e-9) * 0.11
    return np.tanh(x * 1.5) / 1.5 * env(len(x), 0.004, 0.03)

def nappe(d):
    """Nappe synthé de pub auto : la mineur, fa, do, sol, deux mesures chacun, arpège doux."""
    out = np.zeros(int(d * SR)); acc = [(220.0, 261.6, 329.6), (174.6, 220.0, 261.6), (196.0, 261.6, 329.6), (196.0, 246.9, 293.7)]
    dur = 4.0
    for k in range(int(d / dur) + 1):
        f3 = acc[k % 4]; t0 = k * dur; t = t_(dur + 1.0)
        vib = 1 + 0.004 * np.sin(2 * np.pi * 4.8 * t)
        s = sum(scie(f * vib, t) + 0.7 * scie(f * 1.005 * vib, t) for f in f3)
        s = filtre(s, "low", 1100) * env(len(t), 0.6, 1.0) * 0.05
        basse = np.sin(2 * np.pi * f3[0] / 2 * t) * env(len(t), 0.05, 0.8) * 0.12
        s = s + basse
        for j in range(8):  # arpège
            a = t_(0.45); f = f3[j % 3] * 2
            note = np.sin(2*np.pi*f*a) * np.exp(-a*6) * 0.05
            i = int((t0 + j * 0.5) * SR); out[i:i+len(note)] += note[:max(0, len(out)-i)]
        i = int(t0 * SR); out[i:i+len(s)] += s[:max(0, len(out)-i)]
    return np.tanh(out * 1.4) / 1.4

def moteur(d, regime=32, niveau=0.06):
    t = t_(d); f = regime * (1 + 0.03 * np.sin(2*np.pi*0.3*t))
    ph = 2*np.pi*np.cumsum(f)/SR
    s = sum(np.sin(k*ph)/k for k in range(1, 7)) + 0.5*filtre(rng.standard_normal(len(t)), "band", [60, 500])
    return filtre(s, "low", 900) * env(len(t), 0.8, 1.0) * niveau

def compteur():
    out = np.zeros(int(2.2 * SR))
    for i in range(10):
        c = t_(0.05); s = filtre(rng.standard_normal(len(c)), "band", [1500, 6000]) * np.exp(-c*120) * 0.25
        j = int((0.15 + i * 0.17) * SR); out[j:j+len(s)] += s
    return out

def sting():
    out = np.zeros(int(2.5 * SR))
    for t0, f in ((0, 392), (0.12, 523.3), (0.24, 659.3), (0.36, 784)):
        t = t_(2.0 - t0); s = sum(scie(f*m, t) for m in (1, 1.006)) ; s = filtre(s, "low", 2500) * np.exp(-t*2.2) * 0.07
        j = int(t0*SR); out[j:j+len(s)] += s[:len(out)-j]
    return out

# (plan, voix, texte, écart avant)
D = [
    ("route", "N1", "Il y a des routes qui ne mènent nulle part.", 1.2),
    ("mouvement", "N2", "La Brasswagen Palou, elle, y va quand même.", 0.9),
    ("compteur", "N3", "Un milliard de porkomètres au compteur. Moteur d'origine.", 1.4),
    ("volant", "T1", "Elle a jamais calé. Une fois, elle a calé… euh, non. J'ai calé. Elle, jamais.", 1.0),
    ("temoignage", "T2", "Je l'ai achetée en 2012. Elle m'a acheté en… euh. Je l'ai achetée. Voilà.", 0.9),
    ("taverne", "N4", "Brasswagen Palou. Elle ne s'arrête pas. Elle se repose en roulant.", 1.0),
    ("ciel", "N5", "Brasswagen. Et toujours plus de route.", 0.8),
    ("logo", "N6", "Brasswagen, partenaire officiel de « Ferme ta gueule et réponds ». Kilométrage non contractuel. Route non fournie.", 0.7),
]
pistes, ev, t = [], [], 0.0
plans = []
for plan, v, texte, ecart in D:
    debut_plan = t
    debut = t + ecart
    if plan == "compteur": pistes.append((t + 0.1, compteur()))
    if plan == "logo": pistes.append((t, sting()))
    s = voix(v); pistes.append((debut, s))
    ev.append({"at": round(debut, 2), "dur": round(len(s)/SR, 2), "text": texte})
    t = debut + len(s)/SR + 0.45
    plans.append([plan, round(debut_plan, 2)])
duree = t + 1.2
mix = np.zeros(int(duree*SR) + SR)
for d0, s in pistes: i = int(d0*SR); mix[i:i+len(s)] += s
# nappe sous les voix, baissée pendant la parole
bed = nappe(duree)[:len(mix)]; bed = np.pad(bed, (0, len(mix)-len(bed)))
voixseule = np.zeros(len(mix))
for d0, s in pistes: i = int(d0*SR); voixseule[i:i+len(s)] += np.abs(s)
cache = filtre(voixseule, "low", 3, 1); duck = 1 - 0.55*np.clip(cache/ (cache.max()+1e-9) * 6, 0, 1)
mix += bed * duck * 1.4
# moteur : route et mouvement (passage), ralenti pendant Tonio au volant
p = dict(plans)
for a, b, reg, niv in (("route", "compteur", 30, 0.07), ("volant", "temoignage", 22, 0.035)):
    d = p[b] - p[a] + 0.8; m = moteur(d, reg, niv); i = int(p[a]*SR); mix[i:i+len(m)] += m[:len(mix)-i]
mix += filtre(rng.standard_normal(len(mix)), "low", 900) * 0.003
mix = mix[:int(duree*SR)]; mix = np.tanh(filtre(mix, "low", 11000)*1.2)/1.2; mix = mix/np.abs(mix).max()*0.9
os.makedirs(SORTIE, exist_ok=True)
wavfile.write(os.path.join(SORTIE, "pub-brasswagen.wav"), SR, (mix*32767).astype(np.int16))
encoder_mp3(os.path.join(SORTIE, "pub-brasswagen.wav"), os.path.join(SORTIE, "pub-brasswagen.mp3"))
json.dump({"duree": round(duree, 2), "plans": plans, "sous_titres": ev}, open(os.path.join(SORTIE, "pub-brasswagen.json"), "w"), ensure_ascii=False, indent=1)
print("durée", round(duree, 1))
