"""Génériques d'ouverture des émissions de Channel Pork : jingle (synthétisé dans synthe.py) + annonce de la voix
d'antenne (voix/generiques/*.opus, ElevenLabs v4 : Bill, Patrick pour l'animé) + carton titre 800×600.

Émissions à voix séparées : le jingle va dans public/audio/channel-pork/generique-<id>.mp3 (joué comme une réplique).
Émissions à bande intégrale : le jingle est posé en tête du mixage nu (sortie/<bande>.wav) et la bande publique est
réécrite ; relancer ce script après tout nouveau mixage.
Cartons : public/tv/generiques/<id>.png. Durées : sortie/generiques.json (à reporter dans le pack, champ `generique`).
Polices des cartons : DejaVu, FreeFont et Liberation (paquets système), rendues dans l'image.
Usage : python3 generiques.py"""
import json
import os
import shutil

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.io import wavfile

import synthe
from commun import ICI, SORTIE, SR, encoder_mp3, lire

RACINE = os.path.abspath(os.path.join(ICI, "..", ".."))
CARTONS = os.path.join(RACINE, "public", "tv", "generiques")
AUDIO = os.path.join(RACINE, "public", "audio", "channel-pork")
EMBLEME = os.path.join(RACINE, "public", "brand", "embleme-original.png")
F = {
    "serif": "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    "serif2": "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf",
    "sans": "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    "sansi": "/usr/share/fonts/truetype/freefont/FreeSansBoldOblique.ttf",
    "lib": "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
}
W, H = 800, 600


def police(nom, taille):
    return ImageFont.truetype(F[nom], taille)


def degrade(haut, bas):
    a, b = np.array(haut, float), np.array(bas, float)
    y = np.linspace(0, 1, H)[:, None, None]
    return Image.fromarray(np.broadcast_to(a + (b - a) * y, (H, W, 3)).astype(np.uint8))


def texte(d, xy, t, f, couleur, ombre=None, ecart=0, ancre="mm"):
    if ecart:
        largeur = sum(d.textlength(c, font=f) for c in t) + ecart * (len(t) - 1)
        x = xy[0] - largeur / 2 if ancre[0] == "m" else xy[0]
        for c in t:
            if ombre:
                d.text((x + 3, xy[1] + 3), c, font=f, fill=ombre, anchor="l" + ancre[1])
            d.text((x, xy[1]), c, font=f, fill=couleur, anchor="l" + ancre[1])
            x += d.textlength(c, font=f) + ecart
        return
    if ombre:
        d.text((xy[0] + 3, xy[1] + 3), t, font=f, fill=ombre, anchor=ancre)
    d.text(xy, t, font=f, fill=couleur, anchor=ancre)


def ajuster(d, t, nom, taille, largeur):
    while d.textlength(t, font=police(nom, taille)) > largeur and taille > 12:
        taille -= 2
    return police(nom, taille)


def carton_ministere():
    im = degrade((74, 14, 22), (34, 6, 10))
    d = ImageDraw.Draw(im)
    for m in (18, 26):
        d.rectangle([m, m, W - m, H - m], outline=(201, 160, 72), width=2 if m == 18 else 1)
    e = Image.open(EMBLEME).convert("RGBA").resize((210, 210), Image.LANCZOS)
    im.paste(e, ((W - 210) // 2, 70), e)
    texte(d, (W / 2, 330), "CE MESSAGE VOUS EST DIFFUSÉ PAR", police("sans", 20), (232, 214, 170), ecart=3)
    f = ajuster(d, "LE MINISTÈRE DES AFFAIRES", "serif", 40, 680)
    texte(d, (W / 2, 385), "LE MINISTÈRE DES AFFAIRES", f, (243, 213, 143), ombre=(20, 4, 6))
    texte(d, (W / 2, 435), "TROP COMPLIQUÉES", f, (243, 213, 143), ombre=(20, 4, 6))
    d.line([(W / 2 - 120, 478), (W / 2 + 120, 478)], fill=(201, 160, 72), width=2)
    texte(d, (W / 2, 505), "RÉPUBLIQUE DE PORKONIA", police("serif2", 22), (210, 190, 150), ecart=4)
    return im


def carton_gras_capital():
    im = degrade((14, 48, 30), (6, 22, 14))
    d = ImageDraw.Draw(im)
    for x in range(0, W, 40):
        d.line([(x, 0), (x, H)], fill=(20, 66, 42))
    for y in range(0, H, 40):
        d.line([(0, y), (W, y)], fill=(20, 66, 42))
    pts = [(60, 470), (160, 430), (240, 455), (330, 360), (420, 390), (520, 280), (610, 300), (740, 150)]
    d.line(pts, fill=(120, 230, 120), width=6, joint="curve")
    d.polygon([(740, 120), (770, 165), (712, 158)], fill=(120, 230, 120))
    texte(d, (W / 2, 250), "GRAS CAPITAL", ajuster(d, "GRAS CAPITAL", "serif", 96, 700), (240, 200, 90), ombre=(0, 0, 0))
    texte(d, (W / 2, 330), "L'ÉMISSION QUI INVESTIT DANS LE GRAS", police("sans", 24), (220, 235, 210), ecart=2)
    d.rectangle([0, 520, W, 560], fill=(0, 0, 0))
    texte(d, (20, 540), "LARD +12 %   ·   SAINDOUX +3 %   ·   JAMBON -1 %   ·   RILLETTES +24 %", police("sans", 22), (240, 200, 90), ancre="lm")
    return im


def carton_porc_attache():
    im = degrade((22, 58, 84), (8, 22, 36))
    d = ImageDraw.Draw(im)
    for k in range(8):
        y = 430 + k * 22
        d.arc([-200 + (k % 2) * 60, y - 30, W + 200, y + 60], 200, 340, fill=(60, 120, 150), width=3)
    cx, cy = W / 2, 170
    d.ellipse([cx - 70, cy - 70, cx + 70, cy + 70], outline=(230, 200, 120), width=10)
    d.line([(cx, cy - 110), (cx, cy + 90)], fill=(230, 200, 120), width=10)
    d.line([(cx - 60, cy - 85), (cx + 60, cy - 85)], fill=(230, 200, 120), width=10)
    d.arc([cx - 110, cy - 20, cx + 110, cy + 130], 20, 160, fill=(230, 200, 120), width=10)
    texte(d, (W / 2, 330), "PORC D'ATTACHE", ajuster(d, "PORC D'ATTACHE", "serif", 78, 700), (240, 230, 205), ombre=(0, 0, 0))
    texte(d, (W / 2, 395), "LE MAGAZINE DES GENS D'ICI", police("sans", 24), (180, 210, 225), ecart=3)
    return im


def carton_journal():
    im = degrade((150, 14, 22), (60, 6, 10))
    d = ImageDraw.Draw(im)
    cx, cy, r = W / 2, 190, 110
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(239, 227, 198), width=6)
    for k in (-60, 0, 60):
        d.ellipse([cx - r * (1 - abs(k) / 120), cy - r, cx + r * (1 - abs(k) / 120), cy + r], outline=(239, 227, 198), width=3)
    for dy in (-55, 0, 55):
        w = (r**2 - dy**2) ** 0.5
        d.line([(cx - w, cy + dy), (cx + w, cy + dy)], fill=(239, 227, 198), width=3)
    texte(d, (W / 2, 380), "LE JOURNAL", police("serif", 70), (239, 227, 198), ombre=(30, 0, 4))
    texte(d, (W / 2, 455), "DU GROIN", police("serif", 70), (239, 227, 198), ombre=(30, 0, 4))
    d.rectangle([0, 530, W, 538], fill=(239, 227, 198))
    return im


def carton_stade():
    im = degrade((34, 110, 44), (14, 60, 22))
    d = ImageDraw.Draw(im)
    for k in range(0, W, 80):
        d.rectangle([k, 0, k + 40, H], fill=(38, 120, 50))
    d.rectangle([40, 60, W - 40, H - 60], outline=(235, 245, 235), width=5)
    d.line([(W / 2, 60), (W / 2, H - 60)], fill=(235, 245, 235), width=5)
    d.ellipse([W / 2 - 80, H / 2 - 80, W / 2 + 80, H / 2 + 80], outline=(235, 245, 235), width=5)
    d.rectangle([90, 200, W - 90, 400], fill=(14, 40, 18))
    texte(d, (W / 2, 270), "STADE", police("sansi", 84), (255, 214, 60), ombre=(0, 0, 0))
    texte(d, (W / 2, 350), "DU GROIN", police("sansi", 64), (250, 250, 240), ombre=(0, 0, 0))
    return im


def carton_pork_id():
    im = degrade((40, 92, 150), (18, 44, 86))
    d = ImageDraw.Draw(im)
    for y in range(120, 520, 34):
        d.line([(80, y), (W - 80, y)], fill=(70, 120, 175), width=2)
    d.line([(140, 100), (140, 540)], fill=(200, 80, 80), width=3)
    d.rounded_rectangle([250, 90, 550, 280], radius=16, fill=(239, 230, 205), outline=(30, 30, 30), width=4)
    d.rectangle([272, 120, 362, 230], fill=(190, 170, 140))
    for k in range(4):
        d.rectangle([382, 128 + k * 26, 520 - k * 20, 140 + k * 26], fill=(120, 110, 90))
    texte(d, (W / 2, 360), "MA PORK ID", police("serif", 74), (255, 250, 235), ombre=(10, 20, 40))
    texte(d, (W / 2, 430), "ET MOI", police("serif", 60), (255, 250, 235), ombre=(10, 20, 40))
    texte(d, (W / 2, 490), "ÉDUCATION CIVIQUE", police("sans", 24), (255, 214, 90), ecart=4)
    return im


def carton_betes(petites):
    im = degrade((48, 92, 40) if petites else (20, 52, 50), (18, 40, 16) if petites else (6, 20, 22))
    d = ImageDraw.Draw(im)
    rng = np.random.default_rng(3 if petites else 8)
    for _ in range(26):
        x, y, r = rng.uniform(0, W), rng.uniform(0, H), rng.uniform(30, 90)
        a = rng.uniform(0, 3.14)
        pts = [(x + r * np.cos(a), y + r * np.sin(a)), (x + r * 0.3 * np.cos(a + 1.6), y + r * 0.3 * np.sin(a + 1.6)),
               (x - r * np.cos(a), y - r * np.sin(a)), (x + r * 0.3 * np.cos(a - 1.6), y + r * 0.3 * np.sin(a - 1.6))]
        d.polygon(pts, fill=(60, 110, 50) if petites else (28, 70, 66))
    im = im.filter(ImageFilter.GaussianBlur(2))
    d = ImageDraw.Draw(im)
    if petites:
        texte(d, (W / 2, 240), "PETITES BÊTES", police("serif", 72), (250, 240, 200), ombre=(10, 30, 8))
    else:
        texte(d, (W / 2, 240), "BÊTES", police("serif", 96), (220, 235, 225), ombre=(0, 0, 0))
    texte(d, (W / 2, 330), "DE LA RÉPUBLIQUE", police("serif", 44), (250, 240, 200) if petites else (220, 235, 225), ombre=(0, 0, 0))
    for k in range(5):
        x = W / 2 - 100 + k * 50
        d.ellipse([x - 9, 410, x + 9, 432], fill=(250, 240, 200) if petites else (160, 200, 190))
        d.ellipse([x - 16, 398, x - 8, 410], fill=(250, 240, 200) if petites else (160, 200, 190))
        d.ellipse([x + 8, 398, x + 16, 410], fill=(250, 240, 200) if petites else (160, 200, 190))
    return im


def carton_meteo():
    im = degrade((110, 170, 220), (210, 230, 245))
    d = ImageDraw.Draw(im)
    d.ellipse([560, 60, 700, 200], fill=(255, 215, 80))
    for cx, cy, s in ((180, 150, 1.0), (330, 120, 0.7)):
        for dx, dy, r in ((0, 0, 50), (45, -20, 45), (90, 0, 50), (45, 20, 50)):
            d.ellipse([cx + dx * s - r * s, cy + dy * s - r * s, cx + dx * s + r * s, cy + dy * s + r * s], fill=(255, 255, 255))
    d.rectangle([0, 440, W, H], fill=(230, 160, 40))
    for k in range(40):
        x = (k * 97) % W
        d.ellipse([x - 30, 410 + (k % 3) * 8, x + 30, 470], fill=(255, 250, 235))
    texte(d, (W / 2, 290), "LA MÉTÉO", police("serif", 78), (30, 60, 110), ombre=(255, 255, 255))
    texte(d, (W / 2, 370), "DE LA MOUSSE", police("serif", 58), (30, 60, 110), ombre=(255, 255, 255))
    return im


def carton_initial_p():
    im = Image.new("RGB", (W, H), (12, 12, 16))
    d = ImageDraw.Draw(im)
    rng = np.random.default_rng(2)
    for _ in range(90):
        y = rng.uniform(0, H)
        x = rng.uniform(-200, W)
        d.line([(x, y), (x + rng.uniform(150, 500), y)], fill=(int(rng.uniform(60, 140)),) * 3, width=int(rng.uniform(1, 4)))
    d.polygon([(0, 210), (W, 160), (W, 400), (0, 450)], fill=(196, 16, 24))
    texte(d, (W / 2, 300), "INITIAL P", police("sansi", 130), (255, 255, 255), ombre=(0, 0, 0))
    texte(d, (W / 2, 520), "LE LIVREUR DE BIÈRE DU MONT PORCIN", police("sansi", 26), (255, 214, 60), ecart=2)
    return im


def carton_ministere_porc():
    """Ministère du Porc : même cadre d'État que le ministère des affaires, vert campagne de santé."""
    im = degrade((38, 70, 34), (14, 32, 12))
    d = ImageDraw.Draw(im)
    for m in (18, 26):
        d.rectangle([m, m, W - m, H - m], outline=(222, 196, 120), width=2 if m == 18 else 1)
    e = Image.open(EMBLEME).convert("RGBA").resize((210, 210), Image.LANCZOS)
    im.paste(e, ((W - 210) // 2, 70), e)
    texte(d, (W / 2, 330), "CE MESSAGE VOUS EST DIFFUSÉ PAR", police("sans", 20), (232, 226, 190), ecart=3)
    texte(d, (W / 2, 395), "LE MINISTÈRE DU PORC", ajuster(d, "LE MINISTÈRE DU PORC", "serif", 46, 680), (246, 226, 160), ombre=(8, 20, 6))
    d.line([(W / 2 - 120, 448), (W / 2 + 120, 448)], fill=(222, 196, 120), width=2)
    texte(d, (W / 2, 482), "PRÉVENTION · ALIMENTATION · REPOS", police("sans", 20), (210, 220, 180), ecart=2)
    texte(d, (W / 2, 520), "RÉPUBLIQUE DE PORKONIA", police("serif2", 22), (210, 200, 160), ecart=4)
    return im


def carton_alvarez():
    """Les Dossiers d'Alvarez : le logo fourni par l'utilisateur, sur un noir de régie avec un léger balayage."""
    im = Image.new("RGB", (W, H), (6, 6, 8))
    logo = Image.open(os.path.join(ICI, "logo-dossiers-alvarez.png")).convert("RGBA")
    lw = 700
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    im.paste(logo, ((W - lw) // 2, (H - logo.height) // 2 - 20), logo)
    a = np.array(im).astype(float)
    a[::3] *= 0.82  # lignes de balayage
    im = Image.fromarray(a.astype(np.uint8))
    d = ImageDraw.Draw(im)
    texte(d, (W / 2, 520), "LE MAGAZINE QUI ROUVRE LES PORTES", police("sans", 20), (200, 196, 186), ecart=3)
    return im


def carton_taverne():
    """Cauchemar en Taverne : le logo fourni par l'utilisateur, sur un fond de cuisine sombre."""
    im = degrade((48, 30, 18), (14, 8, 4))
    d = ImageDraw.Draw(im)
    for y in range(0, H, 60):
        d.line([(0, y), (W, y)], fill=(58, 38, 22), width=2)
    logo = Image.open(os.path.join(ICI, "logo-cauchemar-taverne.png")).convert("RGBA")
    lw = 680
    logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
    im.paste(logo, ((W - lw) // 2, (H - logo.height) // 2 - 30), logo)
    d = ImageDraw.Draw(im)
    texte(d, (W / 2, 520), "ÉPISODE : « AU FOND DU FÛT »", police("sans", 22), (240, 214, 160), ecart=3)
    return im


# id : (carton, jingle, voix, début de la voix (s), gain voix, bande(s) intégrale(s) à préfixer ou None)
GENERIQUES = {
    "ministere": (carton_ministere, synthe.jingle_ministere, "ministere", 2.3, 1.0, "pub-repulsif"),
    "gras-capital": (carton_gras_capital, synthe.jingle_gras_capital, "gras-capital", 0.9, 1.0, "eric-saucissignal"),
    "porc-attache": (carton_porc_attache, synthe.jingle_porc_attache, "porc-attache", 1.2, 1.0, ("reportage-fatbass", "fred-sans-mentir")),
    "initial-p": (carton_initial_p, synthe.jingle_initial_p, "initial-p", 1.0, 1.5, "initial-p-ep1"),
    "journal": (carton_journal, synthe.jingle_journal, "journal", 2.0, 1.0, None),
    "stade": (carton_stade, synthe.jingle_stade, "stade", 1.95, 1.0, None),
    "pork-id": (carton_pork_id, synthe.jingle_education, "pork-id", 1.9, 1.0, None),
    "petites-betes": (carton_betes_petites := (lambda: carton_betes(True)), lambda: synthe.jingle_nature(False), "petites-betes", 1.9, 1.0, None),
    "betes": ((lambda: carton_betes(False)), lambda: synthe.jingle_nature(True), "betes", 1.9, 1.0, None),
    "meteo": (carton_meteo, synthe.jingle_meteo, "meteo", 1.6, 1.0, None),
    "ministere-porc": (carton_ministere_porc, synthe.jingle_ministere_porc, "ministere-porc", 2.3, 1.0, "pub-mangez-gras"),
    "taverne": (carton_taverne, synthe.jingle_taverne, "taverne", 1.7, 1.0, "cauchemar-taverne"),
    "alvarez": (carton_alvarez, synthe.jingle_alvarez, "alvarez", 2.4, 1.0, "dossiers-alvarez"),
}


def mixer(jingle, voix, debut, gain):
    v = lire(os.path.join(ICI, "voix", "generiques", voix + ".opus"))
    n = int(SR * 0.02)
    e = np.array([np.sqrt((v[i : i + n] ** 2).mean()) for i in range(0, len(v) - n, n)])
    idx = np.nonzero(e > e.max() * 0.05)[0]
    v = v[max(0, idx[0] * n - n) : (idx[-1] + 2) * n]
    v = v / (np.sqrt((v**2).mean()) + 1e-9) * 0.13 * gain
    total = max(len(jingle), int((debut + len(v) / SR + 0.5) * SR))
    x = np.zeros(total)
    x[: len(jingle)] += jingle * 0.32
    i = int(debut * SR)
    # La musique s'efface un peu sous l'annonce.
    g = np.ones(total)
    g[i : i + len(v)] = 0.55
    g = np.convolve(g, np.ones(int(0.15 * SR)) / int(0.15 * SR), mode="same")
    x *= g
    x[i : i + len(v)] += v
    fin = int(0.3 * SR)
    x[-fin:] *= np.linspace(1, 0, fin)
    return x


def main():
    os.makedirs(CARTONS, exist_ok=True)
    durees = {}
    for gid, (carton, jingle, voix, debut, gain, bande) in GENERIQUES.items():
        carton().save(os.path.join(CARTONS, f"{gid}.png"), optimize=True)
        x = mixer(jingle(), voix, debut, gain)
        durees[gid] = round(len(x) / SR, 2)
        for b in (bande if isinstance(bande, tuple) else (bande,) if bande else ()):
            nu = os.path.join(SORTIE, f"{b}.wav")
            sr, y = wavfile.read(nu)
            y = y.astype(float) / 32768
            if y.ndim > 1:
                y = y.mean(1)
            assert sr == SR, (nu, sr)
            z = np.concatenate([x / (np.abs(x).max() + 1e-9) * 0.9, np.zeros(int(0.15 * SR)), y])
            durees[gid] = round((len(x) + int(0.15 * SR)) / SR, 2)
            chemin = os.path.join(SORTIE, f"{b}-avec-generique.wav")
            wavfile.write(chemin, SR, (np.clip(z, -1, 1) * 32767).astype(np.int16))
            encoder_mp3(chemin, os.path.join(AUDIO, f"{b}.mp3"))
        if not bande:
            chemin = os.path.join(SORTIE, f"generique-{gid}.wav")
            wavfile.write(chemin, SR, (x / (np.abs(x).max() + 1e-9) * 0.9 * 32767).astype(np.int16))
            encoder_mp3(chemin, os.path.join(AUDIO, f"generique-{gid}.mp3"))
        print(gid, durees[gid])
    json.dump(durees, open(os.path.join(SORTIE, "generiques.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
