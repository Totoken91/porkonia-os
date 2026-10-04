"""Charges héraldiques : chaque caractère est un pixel, / sépare les rangées.
Contours sélectifs et larges masses ; I argent clair, M argent, S ombre,
L or clair, G bronze, B vermillon, R lie-de-vin, X détails sombres.
"""
MOTIFS = {key: dessin.split('/') for key,dessin in {
    # Hure : crinière, oreille dressée, groin et défense.
    'berthe': '....L..LL........./..L.LLLIG........./..LLLLLIG..LLL..../.LLLLLLIGGLLLG..../.LLLLLLLLLLLL...../LLLLLLLLLLLGG...../.LLLLLILXLLLGGG.../LLLLLLIGGLLLLLLGG./.LLLLLGGGLLLLXLLG./..LLLGGGGLLLLLLGG./.LLLLGGGGLLLGGGG../..LLLGGGGLIGG...../...LLGGGGGII....../..LLLLGGG..I....../...LLGGG........../....LGG...........',
    # Couvercle ajouré, anneau de prise. Une charge dorée, sans gros contour noir.
    'gaspard': '.....LLLLLL......./...LLGGGGGGLL...../..LLG..II..GLL..../.LL..IIMMIIM..LL../.LG..IIIMMMI..GL../LLG..IIMMMMI..GLL./LG...IMXMMXI...GL./LG...IMMMMMI...GL./LG....ILLII....GL./LG..IILLXLLII..GL./LLG.IILLLLLII.GLL./.LG..IMMMMMI..GL../.LLG..IMMMI..GLL../..LLG..MM...GLL.../...LLGGGGGGLL...../.....LLLLLL.......',
    # Trois fûts disposés deux et un, cerclages en réserve.
    'odette': '.......LLL......../......LILLG......./.....LL...GG....../.....LLWGWGG....../.....LLWGWGG....../.....LL...GG....../......LGGGG......./.......GGG......../...LLL.....LLL..../..LILLG...LILLG.../.LL...GG.LL...GG../.LLWGWGG.LLWGWGG../.LLWGWGG.LLWGWGG../.LL...GG.LL...GG../..LGGGG...LGGGG.../...GGG.....GGG....',
    # Bouquet de clous : grandes pointes et base ferrée.
    'anselme': '..I.....I.....I.../.IIM...IIM...IIM../.IMMS..IMMS..IMMS./.IMM...IMM...IMM../..MM....MM....MM../..MM....MM....MM../..MM....MM....MM../...MM...MM...MM.../...MM...MM...MM.../....MM..MM..MM..../.....MMIMMIMM...../......MMMMMM....../.......MMMS......./.......MMMS......./......ILLILG....../.......LGGL.......',
    # Rose à cinq pétales sur une aiguille d'argent.
    'roseline': '.......BBB......../......BBLRB......./...BBBIBLRIBBB..../..BBLRRLLLRRLBB.../..BLRLLRLRLLRLB.../...RLRLLLLRLRR..../....RLLXXLLR....../...BLLLXXLLLB...../..BBLRLLLLRLBB..../..BLRRLLLRRLLB..../...BRRIMMRRRB...../....RRIMMRRR....../......IMM........./......IMM........./.......IM........./.......I..........',
    # Deux lames croisées, bords clairs continus et croisillons dorés.
    'colin': '.I..............I./.IIM..........MII./..IIMM......MMII../...IIMM....MMII.../....IIMM..MMII..../.....IIMMMMII...../......IIMMII....../.......IMMI......./......MMIIMM....../.....MMI..IMM...../...LLMI....IMLL.../..LLLG......GLLL../...LGLL....LLGL.../...LG.L....L.GL.../..LGG........GGL../...LL........LL...',
    # Dague au serpent.
    'agathe': '........I........./.......IIM......../.......IMMS......./...BBBBIMM......../..BBLRRIMM......../..BXR..IMM......../..BRR..IMM......../...BBRRIMM......../.....BBIMMRR....../......BIMMBRR...../.......IMMBRR...../....LLLIMMLLL...../.....LLGGLLR....../.......LGRR......./.....BBLGR......../......BLG........./.......LL.........',
    # Corbeau d'argent, bec de profil, aile ramassée, queue et deux serres.
    'marin': '.........IIII...../........IIXII...../........IIIIIILL../.......IIIIM....../.....IIIIIMM....../....IIIIIMMM....../...IIIIIMMMM....../..IIIIMXMMMM....../..IIIMXXMMMS....../.IIIMXMMMMS......./.IIMXMMMMS......../.IMMMSSSS........./..IMM...L.L......./..MM....L.L......./...M...LL.LL....../.....LLLLLLLL.....',
    # Trois cristaux de sel aux longues facettes.
    'heloise': '........I........./.......IIM......../......IIIMM......./......IIIMMS....../......IIIMMS....../..I...IIIMMS...I../.IIM..IIIMMS..MII./.IIM..IIIMMS..MMI./.IIMS.IIIMMS.SMMI./.IIMS.IIIMMS.SMMI./..IIMSIIMMS.SMMI../...IIMSIMMS.SMMI../....IIMSMSSMMI..../.....IIMSSMMI...../......MMMMMM....../.......LLLL......./........LL........',
    # Coupe rituelle à la lie sombre et pied large.
    'basile': '.....I..I..I....../......I.I.I......./...LLLLLLLLLLLL.../...LIIIIIIIIILG.../....LGRRRRRRLG..../....LLRRRRRLGG..../.....LLRRRLGG...../......LLLLGG....../.......LGGG......./........LG......../........LG......../.......LLGG......./......LLLLGG....../.....LLLLLGGG...../......GGGGGG......',
    # Serpent du boyau autour de l'os, tête séparée du cercle.
    'ysee': '.....BBBBBBB....../....BLRRRRRBB...../...BLR.....RBB..../..BLRR.....RRBB.../..BLRR......BRBB../..BLRR......BXLB../.IIBRRIIIIIIIBBII./.IIMMMMMMMMMMMMII./..BLRR.......RRB../..BLRR......RRBB../...BLRR....RRBB.../....BLRRRRRRBB..../.....BBBBBBBB...../.......BBR......../......BBR........./.......BB.........',
    # Aile d'argent et rafales, silhouettes ouvertes.
    'theobald': '...............I../..............IIM./............IIIMM./..........IIIIMMM./........IIIIMMM.../.......IIIMMMM..I./......IIIMMMMMIIM./.....IIIMMMMMMMM../.....IIMMMMMMM...I/.....IMMMMMMMIIIMM/......MMMMMMMMMM../.......MMMMMMM...I/.........MMMMIIMM./...LL.....MMMMM.../...L..L....MMM..../....LLL.....M.....',
}.items()}
