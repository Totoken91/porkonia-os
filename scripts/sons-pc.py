# Génère les échantillons de la machine (public/audio/pc/) : python3 scripts/sons-pc.py dans un dossier de travail,
# puis encodage mp3 64k des sons ponctuels (ambiance.wav reste en WAV pour boucler sans blanc).
import numpy as np, wave
from scipy import signal
SR = 44100
rng = np.random.default_rng(12)

def t_(d): return np.arange(int(d * SR)) / SR
def bruit(n): return rng.standard_normal(n)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'high', fs=SR, output='sos'), x)
def reso(x, f, q):
    b, a = signal.iirpeak(f, q, fs=SR); return signal.lfilter(b, a, x)
def place(dst, src, t):
    i = int(t * SR); n = min(len(src), len(dst) - i)
    if n > 0: dst[i:i + n] += src[:n]
def env_exp(n, tau): return np.exp(-np.arange(n) / (tau * SR))
def osc_var(freq):  # oscillateur à fréquence variable
    return np.sin(2 * np.pi * np.cumsum(freq) / SR)

def piece(x, wet=0.16):
    """Petite réverbération de pièce (bureau) : réflexions précoces + queue courte."""
    n = int(0.35 * SR)
    ir = bruit(n) * env_exp(n, 0.07)
    ir = lp(ir, 5000)
    for d, g in [(0.007, 0.5), (0.013, 0.35), (0.021, 0.25)]:
        ir[int(d * SR)] += g * 8
    ir /= np.sqrt((ir ** 2).sum())
    w = signal.fftconvolve(x, ir)[:len(x)]
    return x + wet * w * (np.sqrt((x ** 2).mean()) / max(1e-9, np.sqrt((w ** 2).mean())))

def clic(amp=1.0, f1=2600, f2=4800, grave=180, d=0.06):
    """Impact mécanique court : impulsion + résonances + petit choc grave."""
    n = int(d * SR)
    imp = bruit(n) * env_exp(n, 0.0008)
    x = reso(imp, f1, 12) * 0.7 + reso(imp, f2, 18) * 0.5 + hp(imp, 6000) * 0.15
    x += np.sin(2 * np.pi * grave * t_(d)) * env_exp(n, 0.008) * 0.6
    return x * amp

def recherche_tete(amp=1.0):
    """Déplacement de la tête du disque dur : « tac » sec de la bobine + frottement bref."""
    x = clic(amp, rng.uniform(2800, 4200), rng.uniform(5000, 7000), rng.uniform(350, 700), 0.04)
    n = int(0.012 * SR)
    x[:n] += bp(bruit(n), 1500, 6000) * np.hanning(n) * 0.25 * amp
    return x

def rafale_disque(duree, densite=40, amp=0.6):
    out = np.zeros(int(duree * SR)); t = 0.0
    while t < duree - 0.05:
        place(out, recherche_tete(amp * rng.uniform(0.5, 1.0)), t)
        t += rng.exponential(1 / densite) + 0.004
    return out

def ventilateur(duree, rpm_final, pales, tau, depart=0.0, niveau=1.0, fluct=0.01):
    tt = t_(duree)
    rpm = rpm_final * np.clip(1 - np.exp(-(tt - depart) / tau), 0, None) * (1 + fluct * lp(bruit(len(tt)), 2) * 20)
    rpm = np.maximum(rpm, 0)
    v = rpm / rpm_final
    bpf = pales * rpm / 60
    ton = sum(osc_var(bpf * k) / k ** 1.3 for k in (1, 2, 3))
    ton *= 1 + 0.15 * osc_var(rpm / 60)  # balourd
    souffle = bp(bruit(len(tt)), 180, 5000) * (0.6 + 0.4 * lp(bruit(len(tt)), 8) * 5)
    souffle = lp(souffle, 1200) * (1 - v) + lp(souffle, 5000) * v
    return niveau * (v ** 2 * souffle * 0.5 + v ** 2 * ton * 0.08)

def disque_dur(duree, depart=0.2, montee=4.5, rpm_final=5400):
    tt = t_(duree)
    k = np.clip((tt - depart) / montee, 0, 1)
    rpm = rpm_final * (1 - (1 - k) ** 2.2)
    f = rpm / 60
    moteur = sum(osc_var(f * h) * (0.6 / h) for h in range(1, 9))
    commut = osc_var(f * 8) * 0.25 + osc_var(f * 16) * 0.12 + osc_var(f * 24) * 0.05
    air = bp(bruit(len(tt)), 2000, 9000) * (rpm / rpm_final) ** 2 * 0.08
    niv = np.clip((tt - depart) / 0.3, 0, 1)
    x = (lp(moteur, 1200) * 0.10 + commut * 0.05) * niv * (0.3 + 0.7 * rpm / rpm_final) + air
    # à-coups du moteur au décollage (frottement statique)
    for d in (0.02, 0.09, 0.2, 0.34):
        place(x, clic(0.25, 900, 2400, 140, 0.05), depart + d)
    return x

def disquette(duree=1.6):
    """Lecteur de disquettes au test du BIOS : moteur, tête qui va au fond et revient (moteur pas à pas), clac."""
    out = np.zeros(int(duree * SR))
    tt = t_(duree)
    moteur = (osc_var(np.full(len(tt), 300.0)) * 0.05 + bp(bruit(len(tt)), 200, 1800) * 0.06) * np.clip(tt / 0.1, 0, 1) * np.clip((duree - tt) / 0.15, 0, 1)
    out += moteur
    def pas_serie(t0, n, cadence):
        t = t0
        for i in range(n):
            place(out, clic(0.35, 1300 + 200 * rng.random(), 2900, 220, 0.03), t)
            t += 1 / cadence * rng.uniform(0.95, 1.05)
        return t
    t = pas_serie(0.18, 40, 140)
    t = pas_serie(t + 0.04, 40, 170)
    place(out, clic(0.9, 900, 2100, 110, 0.08), t + 0.03)  # tête en butée : clac
    return out

def bip_post():
    d = 0.22; tt = t_(d)
    x = signal.square(2 * np.pi * 988 * tt) * 0.5
    x = bp(x, 400, 5000) * np.clip(tt / 0.004, 0, 1) * np.clip((d - tt) / 0.01, 0, 1)
    x = np.tanh(x * 2.2) * 0.5  # petit haut-parleur qui sature
    return reso(x, 2600, 3) * 0.6 + x * 0.6

def allumage_ecran(duree=2.6):
    """Tube cathodique qui s'allume : claquement du relais, bourdonnement de démagnétisation, crépitements."""
    tt = t_(duree); out = np.zeros(len(tt))
    place(out, clic(1.0, 700, 1800, 90, 0.12), 0.0)
    env = np.exp(-tt / 0.45) * np.clip(tt / 0.01, 0, 1)
    bzz = sum(np.sin(2 * np.pi * 50 * h * tt + rng.random() * 6) / h for h in range(1, 14)) * env
    bzz = np.tanh(bzz * 1.6) * 0.45 + lp(bruit(len(tt)), 400) * env * 0.08
    out += bzz
    # crépitements de l'électricité statique sur la dalle
    for _ in range(38):
        t0 = rng.uniform(0.25, duree - 0.1)
        place(out, hp(clic(rng.uniform(0.04, 0.2), 5200, 8000, 3000, 0.01), 3000), t0)
    # sifflement du transformateur ligne qui s'établit (léger)
    out += np.sin(2 * np.pi * 15734 * tt) * 0.012 * np.clip((tt - 0.4) / 1.0, 0, 1)
    return out

def interrupteur():
    out = np.zeros(int(0.5 * SR))
    place(out, clic(0.9, 2100, 4300, 160, 0.05), 0.0)
    place(out, clic(0.7, 1700, 3900, 140, 0.05), 0.075)
    place(out, clic(0.5, 600, 1500, 70, 0.1), 0.19)  # relais de l'alimentation
    return out

def demarrage_pc(duree=7.5):
    out = np.zeros(int(duree * SR))
    place(out, interrupteur(), 0.0)
    out += ventilateur(duree, 2600, 7, 0.55, 0.2, 1.0) + ventilateur(duree, 3900, 11, 0.35, 0.22, 0.45)
    hdd = disque_dur(duree, 0.35, 4.3)
    out += hdd
    # déverrouillage de la tête puis calibrage : série de cliquetis
    place(out, clic(0.5, 1500, 3200, 200, 0.06), 4.8)
    place(out, rafale_disque(1.2, 25, 0.5), 5.0)
    place(out, rafale_disque(0.5, 45, 0.45), 6.5)
    # queue : fondu pour enchaîner avec l'ambiance
    fin = int(0.6 * SR); out[-fin:] *= np.linspace(1, 0, fin)
    return out

def ambiance(duree=10.0):
    x = ventilateur(duree + 2, 2600, 7, 0.001, -1, 1.0, 0.02) + ventilateur(duree + 2, 3900, 11, 0.001, -1, 0.45, 0.02)
    tt = t_(duree + 2); f = 90.0
    x += (sum(np.sin(2 * np.pi * f * h * tt) * (0.6 / h) for h in range(1, 7)) * 0.012 + np.sin(2 * np.pi * f * 8 * tt) * 0.006)
    x += sum(np.sin(2 * np.pi * 50 * h * tt) / h for h in (1, 2, 3)) * 0.006
    x += np.sin(2 * np.pi * 15734 * tt) * 0.004
    x = piece(x, 0.12)
    # boucle sans couture : fondu enchaîné des 2 dernières secondes sur le début
    n = int(duree * SR); c = int(2 * SR)
    y = x[:n].copy()
    fondu = np.linspace(0, 1, c)
    y[:c] = x[n:n + c] * (1 - fondu) + x[:c] * fondu
    return y

def ecrire(nom, x, crete=0.89, rms=None, sr=SR, fondu=True):
    x = x - x.mean()
    if fondu:
        a, b = int(0.004 * SR), int(0.12 * SR)
        x[:a] *= np.linspace(0, 1, a); x[-b:] *= np.linspace(1, 0, b) ** 2
    if rms: x = x * (rms / np.sqrt((x ** 2).mean()))
    else: x = x * (crete / np.abs(x).max())
    x = np.clip(x, -1, 1)
    if sr != SR: x = signal.resample_poly(x, sr, SR)
    with wave.open(nom, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((x * 32767).astype('<i2').tobytes())
    print(nom, round(len(x) / sr, 2), 's')

ecrire('demarrage-pc.wav', piece(demarrage_pc()), 0.85)
ecrire('ecran-allumage.wav', piece(allumage_ecran()), 0.8)
ecrire('bip-post.wav', piece(bip_post(), 0.1), 0.7)
ecrire('disquette.wav', piece(disquette()), 0.7)
for i in range(4):
    ecrire(f'disque-{i}.wav', piece(rafale_disque(rng.uniform(0.25, 0.9), rng.uniform(20, 55), 0.7)), 0.55)
ecrire('ambiance.wav', ambiance(), rms=0.05, sr=22050, fondu=False)
