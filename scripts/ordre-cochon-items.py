"""Bespoke native item sprites. Integer drawing, limited material palettes, no resampling."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
import math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/ordre-cochon/items'
OUT.mkdir(parents=True, exist_ok=True)
P = dict(ink='#141918', dark='#303a35', steel='#687c7b', silver='#aebbb1', light='#dddaca',
         wood='#574030', brown='#8c6744', ochre='#b39862', gold='#c5ae6c',
         cloth='#6d7260', clothlight='#a6aa8b', cream='#c9bca0', white='#e1d6ba',
         red='#813b3d', pink='#bb7967', flesh='#d79d7e', burgundy='#512e35', green='#425d43')

# Discrete material ramps; every value remains an authored native pixel.
RAMPS = {
 'metal':['#202628','#303b3f','#48585c','#687a7b','#8d9c99','#b2b9ae','#d4d3bd'],
 'leather':['#211d1b','#36291f','#4b3527','#644833','#826245','#a58a61','#c2ae82'],
 'bone':['#353026','#574936','#7b6a4c','#a18f6b','#c0b392','#d8d1b1','#e9e2c5'],
 'cloth':['#242a25','#354032','#4e5b43','#6a7756','#8a9572','#b0b895','#ccd0ac'],
 'meat':['#291a20','#482429','#683139','#884c4c','#a87363','#c3987c','#dfb59b'],
 'brass':['#312c22','#4b402b','#6c5937','#8d7446','#af935c','#ccba80','#e1d2a2'],
}

def model_native(im):
    """Shade material planes on the native grid; sharp light clusters, no noise/blur."""
    pixels=im.copy()
    mapping={'wood':'leather','brown':'leather','ochre':'brass','gold':'brass','cream':'bone','white':'bone',
             'steel':'metal','silver':'metal','light':'metal','cloth':'cloth','clothlight':'cloth','green':'cloth',
             'red':'meat','pink':'meat','flesh':'meat','burgundy':'meat'}
    materials={P[k]:v for k,v in mapping.items()}
    ranks={'wood':1,'brown':2,'ochre':3,'gold':4,'cream':3,'white':5,'steel':2,'silver':4,'light':6,
           'cloth':2,'clothlight':4,'green':2,'red':1,'pink':3,'flesh':5,'burgundy':0}
    values={P[k]:v for k,v in ranks.items()}
    w,h=im.size
    for y in range(h):
        for x in range(w):
            rgba=pixels.getpixel((x,y))
            if not rgba[3]:continue
            color='#%02x%02x%02x'%rgba[:3]
            material=materials.get(color)
            if not material:continue
            def inside(xx,yy):
                if not(0<=xx<w and 0<=yy<h):return False
                p=pixels.getpixel((xx,yy));return p[3] and '#%02x%02x%02x'%p[:3]!=P['ink']
            # Narrow bevels illuminate the upper/left edge; right/bottom faces recede.
            light=(1 if not inside(x-1,y) else 0)+(1 if not inside(x,y-1) else 0)
            shadow=(1 if not inside(x+1,y) else 0)+(1 if not inside(x,y+1) else 0)
            plane=1 if x<w*.42 else -1 if x>w*.68 else 0
            shade=max(0,min(6,values[color]+light-shadow+plane))
            im.putpixel((x,y),tuple(bytes.fromhex(RAMPS[material][shade][1:]))+(255,))
    return im
SIZES = {**dict.fromkeys(['couteau','os','tranchoir','crochet','louche','hachoir'],(32,48)),
         **dict.fromkeys(['tablier','gilet','couennes','manteau'],(32,40)),
         **dict.fromkeys(['charlotte','bob','casque','couronne'],(32,24)),
         **dict.fromkeys(['decapsuleur','pork-id','nappe','appeau','jambon','biere'],(24,24))}

def crafted_garment(name):
    """Hand-placed silhouette and fold planes. No automatic bevels on fabric."""
    im=Image.new('RGBA',(32,40)); d=ImageDraw.Draw(im)
    def area(points,color): d.polygon(points,fill=color)
    def stroke(points,color,width=1):d.line(points,fill=color,width=width)
    def dot(box,color):d.rectangle(box,fill=color)
    if name=='gilet':
        area([(9,3),(13,2),(16,7),(19,3),(24,4),(25,9),(22,17),(25,34),(22,37),(9,36),(7,34),(10,17),(7,10)],'#241f1b')
        area([(10,4),(13,4),(16,10),(20,5),(23,5),(23,10),(21,17),(23,34),(20,35),(10,34),(9,32),(12,17),(9,10)],'#665039')
        area([(10,7),(13,9),(14,15),(13,29),(11,33),(10,32),(12,18),(10,13)],'#8a7050')
        area([(19,10),(21,8),(20,18),(22,32),(19,34),(16,33),(16,15)],'#4e3c2d')
        area([(11,4),(13,5),(16,10),(13,14),(10,9)],'#a38a60')
        area([(20,5),(21,7),(18,12),(16,14),(18,8)],'#735b3f')
        stroke([(15,13),(16,34)],'#382c25'); stroke([(10,6),(9,10),(11,15)],'#ab956b')
        area([(10,25),(22,24),(22,27),(10,28)],'#42332a');stroke([(11,25),(21,24)],'#9a8055')
        dot((15,24,18,27),'#baa06a');dot((16,25,17,26),'#443a2b')
        stroke([(11,29),(10,32)],'#735a40');stroke([(20,29),(21,32)],'#382c25')
        dot((15,18,15,19),'#baa47b');dot((16,31,16,32),'#a28d69')
    elif name=='manteau':
        area([(9,2),(13,3),(16,6),(20,2),(24,4),(28,9),(29,22),(25,25),(23,20),(26,37),(18,39),(7,37),(9,21),(5,25),(2,22),(3,10),(6,5)],'#242b25')
        area([(9,4),(13,5),(16,10),(20,4),(23,5),(26,10),(27,21),(25,22),(22,16),(23,27),(24,36),(18,37),(9,35),(11,18),(8,13),(6,23),(4,21),(5,11)],'#5b654f')
        area([(9,6),(13,8),(14,20),(12,34),(9,34),(11,18),(8,11)],'#899078')
        area([(18,10),(21,7),(22,19),(24,35),(18,37),(16,35),(16,16)],'#424c3b')
        area([(9,4),(12,4),(15,10),(13,14),(8,8)],'#a5a18a')
        area([(20,4),(22,5),(20,11),(17,14),(18,8)],'#737964')
        stroke([(15,14),(16,36)],'#30392e');stroke([(10,22),(9,32)],'#a0a58a');stroke([(21,25),(22,34)],'#313b2f')
        stroke([(6,12),(5,19)],'#889178');stroke([(25,13),(26,19)],'#3a4535')
        for y in (17,23,29):dot((15,y,16,y+1),'#b3a078')
        stroke([(10,35),(13,36)],'#757e62');stroke([(18,37),(22,36)],'#5b654f')
    elif name=='tablier':
        stroke([(12,10),(11,4),(15,2),(20,4),(20,11)],'#524d3f',3)
        stroke([(12,9),(12,4),(15,3),(19,4),(19,10)],'#b8b099')
        area([(10,9),(21,8),(23,13),(27,36),(23,38),(5,36),(8,16)],'#5e5b4b')
        area([(11,10),(20,10),(21,15),(25,35),(21,36),(7,34),(10,17)],'#bcb69c')
        area([(11,12),(15,11),(14,25),(11,33),(8,33),(10,18)],'#dfd7bc')
        area([(20,14),(23,23),(25,34),(21,35),(19,24)],'#8c896f')
        stroke([(9,21),(22,20)],'#83765a',2)
        area([(13,24),(22,23),(23,30),(14,31)],'#9c9478')
        stroke([(13,24),(22,23)],'#e0d5b6');stroke([(14,30),(22,29)],'#746f58')
        stroke([(11,29),(10,33)],'#b0a58b');dot((20,15,21,17),'#875754');dot((24,32,24,33),'#916c60')
    else:
        area([(9,3),(14,4),(17,3),(22,4),(28,8),(29,15),(25,18),(24,34),(19,37),(8,35),(7,18),(3,16),(3,9)],'#3b2a26')
        area([(9,5),(14,7),(18,5),(22,6),(26,10),(26,15),(22,16),(22,33),(17,35),(10,33),(9,17),(5,15),(5,10)],'#885c47')
        area([(9,7),(13,9),(12,31),(10,31),(10,17),(6,14),(7,10)],'#b08b6a')
        area([(18,7),(22,8),(24,12),(21,17),(21,31),(17,34),(16,20)],'#684337')
        # Overlapping rind plates form a solid breastplate, not floating ribs.
        for y in (12,19,26):
            area([(10,y),(16,y-1),(21,y),(20,y+5),(15,y+6),(10,y+4)],'#a07155')
            stroke([(11,y),(16,y-1),(20,y)],'#c09a74')
            stroke([(11,y+5),(16,y+6),(20,y+4)],'#744c3b')
        stroke([(8,7),(10,15),(10,32)],'#55412c',2);stroke([(22,8),(20,16),(21,31)],'#423026',2)
        dot((9,22,11,24),'#b69b65');dot((20,22,22,24),'#92784f')
    return im

def crafted_charlotte():
    im=Image.new('RGBA',(32,24));d=ImageDraw.Draw(im)
    d.polygon([(4,8),(7,4),(12,3),(16,2),(22,3),(27,6),(29,11),(27,17),(23,20),(9,20),(4,16),(2,12)],fill='#7d8278')
    d.polygon([(5,8),(8,5),(13,4),(17,3),(23,5),(26,7),(27,12),(25,16),(22,18),(10,18),(6,15),(4,11)],fill='#b7baaa')
    d.polygon([(7,7),(11,5),(16,4),(20,6),(18,11),(12,14),(6,12)],fill='#e1e0ce')
    d.polygon([(23,7),(25,10),(24,14),(20,17),(16,16),(19,12)],fill='#929a8c')
    d.line([(8,7),(9,10),(7,13)],fill='#c1c4b1');d.line([(16,6),(18,9),(15,13)],fill='#acb3a1')
    d.line([(6,16),(11,19),(17,18),(22,19),(26,16)],fill='#d0d2bd',width=2)
    return im

def crafted_cleaver(heavy):
    im=Image.new('RGBA',(32,48));d=ImageDraw.Draw(im)
    def area(points,color):d.polygon(points,fill=color)
    def stroke(points,color,width=1):d.line(points,fill=color,width=width)
    def dot(box,color):d.rectangle(box,fill=color)
    if heavy:
        area([(7,6),(24,3),(28,7),(29,15),(27,23),(22,28),(7,29),(4,24),(4,11)],'#263536')
        area([(7,8),(24,5),(26,8),(27,15),(25,22),(20,26),(8,27),(6,23),(6,12)],'#788d8d')
        area([(8,10),(19,8),(19,20),(15,24),(8,24)],'#b1c0b9')
        area([(22,8),(25,9),(26,17),(23,23),(19,26),(18,24),(21,18)],'#4d676a')
        stroke([(8,27),(19,27),(24,23),(27,17)],'#d0d6c8')
        stroke([(8,9),(19,7)],'#d7d9c9')
        area([(20,12),(23,15),(20,19),(17,16)],'#af9564')
        stroke([(20,14),(20,17),(22,15)],'#5c6557')
        dot((9,27,14,31),'#74654b');dot((10,29,13,43),'#48362b');stroke([(10,31),(10,41)],'#9b7952')
        dot((9,43,14,45),'#b39964');dot((11,34,12,35),'#c4c0a5')
    else:
        area([(4,11),(24,7),(27,9),(28,23),(23,29),(7,31),(5,27)],'#2a3839')
        area([(6,12),(24,9),(25,11),(26,22),(22,27),(8,28)],'#819896')
        area([(7,14),(18,12),(19,23),(10,26),(8,26)],'#b6c5ba')
        area([(23,11),(25,12),(26,22),(22,27),(20,27),(22,20)],'#526d70')
        stroke([(8,29),(21,27),(25,23)],'#d2d9c9')
        dot((20,12,22,14),'#293a3c');dot((20,12,21,12),'#acbdb4')
        stroke([(9,20),(12,19)],'#738b86');stroke([(14,24),(17,23)],'#81958d')
        area([(10,30),(14,29),(15,42),(11,45),(9,42)],'#382c24')
        stroke([(11,31),(12,42)],'#997957',2);stroke([(14,31),(14,40)],'#62503b')
        dot((11,34,12,35),'#c3bda2');dot((12,40,13,41),'#c3bda2')
    return im

def crafted_head(name):
    im=Image.new('RGBA',(32,24));d=ImageDraw.Draw(im)
    def area(points,color):d.polygon(points,fill=color)
    def stroke(points,color,width=1):d.line(points,fill=color,width=width)
    def dot(box,color):d.rectangle(box,fill=color)
    if name=='bob':
        area([(10,3),(21,3),(23,8),(24,14),(28,17),(26,21),(6,22),(3,18),(7,14),(8,8)],'#293a3f')
        area([(10,5),(20,4),(21,9),(22,15),(26,18),(24,20),(7,20),(5,18),(9,14),(9,8)],'#63757a')
        area([(11,5),(16,5),(15,13),(10,15),(9,12)],'#8d9894')
        area([(19,6),(21,10),(21,15),(24,18),(20,19),(18,13)],'#455b63')
        stroke([(9,13),(15,14),(22,13)],'#7d4f52',2)
        stroke([(7,17),(12,18),(21,17)],'#9aa19a');stroke([(8,20),(23,20)],'#4d6369')
        dot((14,13,16,14),'#b68b77')
    elif name=='casque':
        area([(3,13),(5,8),(8,4),(13,2),(21,3),(25,7),(27,13),(30,16),(29,20),(3,20),(1,17)],'#514d31')
        area([(5,13),(6,9),(9,5),(14,3),(20,4),(24,8),(25,14),(28,17),(27,18),(4,18),(3,16)],'#ab914d')
        area([(7,10),(10,6),(14,5),(16,6),(14,15),(5,15)],'#d4bd70')
        area([(21,6),(23,9),(24,15),(20,16),(19,9)],'#7f703e')
        area([(15,3),(18,3),(18,16),(14,16)],'#9b8241')
        stroke([(15,4),(15,14)],'#ded09a');stroke([(4,17),(27,17)],'#dec78c',2)
        dot((21,11,22,12),'#625d36');dot((24,12,25,13),'#625d36')
        stroke([(9,7),(11,6),(13,6)],'#e7dba7');stroke([(5,20),(27,20)],'#383d2a')
    else:
        # A linked sausage wreath has depth and a visible opening, rather than four bottles.
        d.ellipse((5,4,27,18),fill='#653c38');d.ellipse((10,7,22,15),fill=(0,0,0,0))
        for points in [[(4,10),(8,8),(11,11),(9,17),(5,18),(2,15)],[(10,15),(16,13),(21,16),(19,21),(12,22),(9,19)],[(23,10),(27,9),(30,12),(28,18),(24,19),(21,16)]]:
            area(points,'#9b5e51')
        stroke([(4,12),(6,11),(8,11)],'#c18d73',2)
        stroke([(12,17),(16,16),(19,17)],'#ca9476',2)
        stroke([(24,12),(27,12)],'#bc8068',2)
        stroke([(5,18),(8,18)],'#57352f');stroke([(12,21),(17,21)],'#653a30');stroke([(25,18),(27,17)],'#57352f')
        stroke([(9,13),(11,15)],'#ab9a74');stroke([(21,15),(23,14)],'#ab9a74')
        dot((10,5,14,6),'#a97961');dot((19,6,23,7),'#976c58')
    return im

def sprite(name):
    im = Image.new('RGBA', SIZES[name]); d = ImageDraw.Draw(im)
    # Rasterize geometry on the final native grid, with no intermediate image.
    sx=im.width/24; sy=im.height/(32 if name in ('tablier','gilet','couennes','manteau') else im.height)
    angle={'tranchoir':-.12,'hachoir':.10,'crochet':.13,'louche':-.13,'pork-id':-.09,'nappe':.08,'appeau':-.12}.get(name,0)
    def point(p):
        x,y=p; cy=24 if name in ('tranchoir','hachoir','crochet','louche') else 12
        xx=x-12; yy=y-cy
        return(round((12+xx*math.cos(angle)-yy*math.sin(angle))*sx),round((cy+xx*math.sin(angle)+yy*math.cos(angle))*sy))
    polygons=0
    def poly(points,c,edge=None):
        nonlocal polygons
        # Internal planes must join instead of being separated by black outlines.
        outline = polygons==0 if edge is None else edge
        d.polygon([point(p) for p in points],fill=P[c],outline=P['ink'] if outline else None)
        polygons+=1
    def rect(box,c):
        x0,y0,x1,y1=box; poly([(x0,y0),(x1,y0),(x1,y1),(x0,y1)],c,False)
    def line(points,c,w=1): d.line([point(p) for p in points],fill=P[c],width=w)
    def oval(box,c,edge=True):
        x0,y0,x1,y1=box; cx=(x0+x1)/2; cy=(y0+y1)/2
        poly([(cx+(x1-x0)/2*math.cos(i*math.pi/12),cy+(y1-y0)/2*math.sin(i*math.pi/12)) for i in range(24)],c,edge)
    def handle(x,y,h):
        rect((x-1,y,x+3,y+h),'ink'); rect((x,y,x+2,y+h-1),'wood'); line([(x,y),(x,y+h-1)],'brown')
        for yy in range(y+2,y+h-1,3): line([(x,yy),(x+2,yy)],'ochre')
    if name == 'couteau':
        poly([(19,2),(19,9),(17,23),(14,33),(10,32),(12,23),(17,6)],'steel')
        poly([(18,5),(18,10),(16,23),(13,31),(11,31),(13,23)],'silver',False)
        line([(18,7),(15,24),(12,30)],'light')
        poly([(9,31),(13,33),(9,45),(5,43)],'wood')
        line([(9,33),(6,42)],'brown',2); line([(12,34),(9,43)],'dark')
        line([(9,32),(13,34)],'silver'); rect((8,35,9,36),'silver'); rect((6,41,7,42),'silver')
    elif name == 'os':
        poly([(6,9),(10,8),(16,33),(12,37)],'cream')
        line([(7,10),(12,29),(13,34)],'white',2); line([(10,14),(14,32)],'ochre')
        poly([(2,4),(4,2),(7,2),(8,5),(10,3),(13,4),(14,7),(12,10),(9,11),(5,10),(3,8)],'cream')
        poly([(11,34),(13,32),(16,33),(17,36),(20,35),(22,37),(21,42),(18,44),(16,42),(13,43),(10,41)],'cream')
        line([(3,5),(5,4),(6,5)],'white'); line([(10,5),(12,6)],'white'); line([(12,37),(12,40),(15,41)],'white')
        line([(17,38),(19,39),(18,41)],'brown'); line([(8,7),(9,9)],'brown'); rect((14,24,14,26),'brown')
    elif name == 'crochet':
        handle(8,28,16)
        poly([(8,29),(8,13),(10,7),(14,4),(19,5),(22,9),(22,17),(19,20),(15,19),(14,16),(18,16),(19,13),(18,10),(15,9),(12,12),(12,29)],'steel')
        line([(9,27),(9,13),(11,8),(15,6),(19,7)],'silver',2); line([(20,9),(20,15),(18,18)],'ochre')
        rect((7,28,12,30),'gold')
    elif name == 'louche':
        handle(9,3,13); rect((10,16,12,34),'ink'); rect((10,16,11,34),'silver')
        oval((3,29,21,44),'steel'); oval((5,31,19,41),'dark'); line([(6,32),(10,31),(15,31)],'silver',2)
        line([(6,40),(10,42),(16,41),(19,38)],'silver'); rect((16,34,18,36),'ochre')
    elif name == 'decapsuleur':
        oval((5,2,18,12),'silver'); oval((8,4,15,9),'ink',False); rect((7,9,16,11),'steel')
        poly([(9,10),(14,10),(16,21),(8,21)],'steel'); line([(10,12),(10,19)],'silver',2); rect((10,18,13,19),'ink')
    elif name == 'pork-id':
        poly([(2,5),(21,3),(22,19),(3,21)],'silver'); poly([(4,7),(19,5),(20,17),(5,19)],'cream',False)
        rect((5,9,10,16),'dark'); rect((6,10,9,12),'pink'); rect((7,13,9,15),'cloth')
        line([(12,9),(17,9)],'brown'); line([(12,12),(18,12)],'cloth'); rect((13,15,17,16),'red'); rect((3,6,4,17),'light')
    elif name == 'nappe':
        poly([(3,3),(17,3),(21,7),(21,20),(3,20)],'cream'); poly([(17,3),(17,7),(21,7)],'clothlight')
        for x in (6,12,18): rect((x,5,x+1,18),'red')
        for y in (7,13,18): line([(4,y),(20,y)],'pink',2)
        for x in (6,12,18):
            for y in (7,13,18): rect((x,y,x+1,y+1),'burgundy')
        line([(4,4),(15,4)],'white'); line([(4,19),(19,19)],'white')
    elif name == 'appeau':
        poly([(2,9),(5,5),(16,7),(21,12),(21,17),(17,20),(5,18),(2,15)],'brown')
        poly([(4,9),(6,7),(16,9),(17,12),(4,12)],'ochre',False); oval((15,11,22,18),'wood')
        rect((18,13,19,15),'ink'); rect((6,12,9,14),'ink'); line([(5,16),(13,18)],'wood'); rect((11,9,13,10),'cream')
    elif name == 'jambon':
        poly([(13,10),(18,3),(21,4),(17,13)],'cream'); oval((17,1,22,6),'white')
        poly([(3,10),(8,6),(14,8),(18,13),(16,19),(10,22),(4,19),(1,15)],'wood')
        oval((2,10,15,21),'pink'); oval((4,12,13,19),'red'); oval((8,14,11,17),'cream')
        line([(4,11),(7,10),(11,11)],'flesh'); rect((6,18,8,19),'flesh'); line([(13,9),(16,12)],'ochre')
    elif name == 'biere':
        poly([(9,2),(14,2),(14,7),(18,11),(18,22),(5,22),(5,11),(9,7)],'green')
        rect((9,1,14,3),'gold'); rect((7,11,9,20),'cloth'); line([(10,5),(10,8),(7,12)],'clothlight')
        rect((6,13,17,19),'cream'); rect((8,14,15,15),'brown'); rect((10,16,13,18),'red'); line([(7,21),(16,21)],'wood')
    if name in ('tablier','gilet','couennes','manteau'): im=crafted_garment(name)
    elif name=='charlotte':im=crafted_charlotte()
    elif name in ('bob','casque','couronne'):im=crafted_head(name)
    elif name in ('tranchoir','hachoir'):im=crafted_cleaver(name=='hachoir')
    else:im=model_native(im)
    im.save(OUT / f'{name}.png')
    return im

if __name__ == '__main__':
    images = {name:sprite(name) for name in SIZES}
    # The raycaster consumes the same native pixels without asynchronous image loading.
    palette = ['transparent'] + list(dict.fromkeys(list(P.values()) + [color for ramp in RAMPS.values() for color in ramp]))
    provisions = {}
    for name in ('jambon','biere'):
        pixels = images[name]
        provisions[name] = [[0 if pixels.getpixel((x,y))[3] == 0 else palette.index('#%02x%02x%02x' % pixels.getpixel((x,y))[:3]) for x in range(24)] for y in range(24)]
    (ROOT / 'src/apps/jambonjon/provisions-pixels.ts').write_text('// Generated by scripts/ordre-cochon-items.py; shared native inventory/world pixels.\nexport const PALETTE_PROVISIONS = '+json.dumps(palette)+';\nexport const PIXELS_PROVISIONS = '+json.dumps(provisions)+';\n',encoding='utf-8')
    gallery = Image.new('RGB',(800,880),'#202822'); gd = ImageDraw.Draw(gallery)
    for i,(name,im) in enumerate(images.items()):
        x,y=(i%5)*160,(i//5)*220
        gd.rectangle((x+5,y+5,x+154,y+210),fill='#101816',outline='#a29d81',width=2)
        large=im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST)
        gallery.paste(large,(x+(160-large.width)//2,y+10+(192-large.height)//2),large)
        gd.text((x+12,y+196),name,fill='#ddd3af')
    preview=ROOT.parents[1] / 'outputs/ordre-cochon-items.png'
    gallery.save(preview)
