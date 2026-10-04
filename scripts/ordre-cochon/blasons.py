"""Blasons dessinés sur une grille native 32×32, sans réduction ni anticrénelage.
Python + Pillow ; sortie jeu : public/ordre-cochon/blasons/.
Le second argument facultatif reçoit la planche de présentation.
"""
from pathlib import Path
import sys
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/ordre-cochon/blasons'
OUT.mkdir(parents=True, exist_ok=True)
P = dict(ink='#171a19', rim='#584939', gold='#ad8d50', light='#dac187',
         ivory='#dfd3af', steel='#9ea8a5', shade='#536467', wood='#99623f',
         red='#8f403c', blood='#be6853', tank='#394b46', dps='#623432',
         mage='#363e55', darktank='#293833', darkdps='#432829', darkmage='#282d40')
NAMES = [('berthe','Berthe','tank'),('gaspard','Gaspard','tank'),('odette','Odette','tank'),('anselme','Anselme','tank'),
         ('roseline','Roseline','dps'),('colin','Colin','dps'),('agathe','Agathe','dps'),('marin','Marin','dps'),
         ('heloise','Heloise','mage'),('basile','Basile','mage'),('ysee','Ysee','mage'),('theobald','Theobald','mage')]

def crest(identifier, family):
    im = Image.new('RGBA', (32,32)); d = ImageDraw.Draw(im)
    def rect(box, color): d.rectangle(box, fill=P[color])
    def line(points, color, width=1): d.line(points, fill=P[color], width=width)
    def poly(points, color): d.polygon(points, fill=P[color])
    poly([(4,2),(27,2),(29,4),(29,18),(27,22),(23,26),(18,29),(13,29),(8,26),(4,22),(2,18),(2,4)], 'ink')
    poly([(5,3),(26,3),(28,5),(28,18),(26,22),(22,26),(17,28),(14,28),(9,25),(5,21),(3,17),(3,5)], 'rim')
    poly([(5,4),(26,4),(27,5),(27,18),(25,22),(21,25),(17,27),(14,27),(10,24),(6,21),(4,17),(4,5)], 'gold')
    line([(5,4),(26,4)], 'light'); line([(4,5),(4,16),(6,20),(10,24),(14,26)],'light')
    poly([(6,6),(25,6),(25,17),(23,21),(20,24),(16,25),(12,23),(8,20),(6,16)], family)
    poly([(16,6),(25,6),(25,17),(23,21),(20,24),(16,25)], 'dark'+family)
    # Four fastening studs, never random texture over the symbol.
    for x,y in [(5,5),(26,5),(7,21),(24,21)]: rect((x,y,x,y),'ivory')
    from blasons_charges import MOTIFS
    colors = dict(X='ink', S='shade', M='steel', I='ivory', G='gold', L='light', W='wood', R='red', B='blood')
    rows = MOTIFS[identifier]
    width = max(map(len, rows))
    assert width <= 20 and len(rows) <= 18
    motif = Image.new('RGBA', (32,32))
    pixels = motif.load()
    for y,row in enumerate(rows):
        for x,char in enumerate(row):
            if char != '.': pixels[(32-width)//2+x,7+y] = tuple(bytes.fromhex(P[colors[char]][1:]))+(255,)
    mask = Image.new('L',(32,32))
    ImageDraw.Draw(mask).polygon([(6,6),(25,6),(25,17),(23,21),(20,24),(16,25),(12,23),(8,20),(6,16)],fill=255)
    from PIL import ImageChops
    motif.putalpha(ImageChops.multiply(motif.getchannel('A'),mask))
    im.alpha_composite(motif)
    im.save(OUT / (identifier+'.png'))
    return im

sprites = [crest(i,f) for i,_,f in NAMES]
# Exact dimensions, alpha and bounded palette are properties of the files, not prompt promises.
for im in sprites:
    assert im.size == (32,32) and len(im.getcolors(1024)) <= len(P)+1
    assert {alpha for count,alpha in im.getchannel('A').getcolors()} <= {0,255}
if len(sys.argv)>1:
    target = Path(sys.argv[1]); target.mkdir(parents=True,exist_ok=True)
    sheet = Image.new('RGB',(704,534),'#292b28'); d=ImageDraw.Draw(sheet)
    for n,((identifier,name,family),im) in enumerate(zip(NAMES,sprites)):
        x=16+(n%4)*172; y=16+(n//4)*172
        sheet.paste(im.resize((128,128),Image.Resampling.NEAREST),(x,y),im.resize((128,128),Image.Resampling.NEAREST))
        sheet.paste(im,(x+132,y+96),im)
        d.text((x+24,y+140),name,fill=P['ivory'])
    sheet.save(target/'blasons-12.png')
print('12 blasons RGBA natifs 32x32 ; agrandissements uniquement nearest-neighbor.')
