import type { Portal, SitePerso } from '../types';

/** Extensions originales de PigNet pour PorkOS ; ces pages ne prétendent pas être des notices canoniques. */
const image = (id: string) => `/pignet/${id}-1999.png`;
const vitrine = (titre: string, sousTitre: string, _id: string, badge: string, navigation: {texte:string;url:string}[]) => ({t:'entete' as const,titre,sousTitre,badge,navigation});
const nav = (hote:string, pages: [string,string][]) => pages.map(([texte,page])=>({texte,url:`porko://${hote}${page?`/${page}`:''}`}));
const donjonNav=nav('donjonbon',[['Le jeu',''],['Les 12 chevaliers','chevaliers'],['Guide de survie','guide'],['Téléchargement','telechargement']]);
const douziNav=nav('douzi-ambree',[['La brasserie',''],['La livraison','livraison'],['Le comptoir','comptoir']]);
const signalNav=nav('saucissignal',[['La société',''],['Investir','investir'],['Notre vision','mode-emploi']]);
const viteauNav=nav('club-viteau',[['Le club',''],['Discothèque','disques']]);

export const accesPigNet: Portal['raccourcis'] = [
  {label:'DONJONBON',url:'porko://donjonbon'},
  {label:'TOUS LES JEUX',url:'porko://salle-arcade'},
  {label:'BOUTIQUE',url:'porko://porkomazon'},
  {label:'MA BANQUE',url:'porko://banque-porc'},
  {label:'MUSIQUE',url:'porko://club-viteau'},
  {label:'ANNUAIRE',url:'porko://annuaire'},
];
export const pubsPigNet: Portal['bannieres'] = [
  {id:'donjonbon',image:image('donjonbon'),titre:'Donjonbon — douze étages de dungeon crawler',cta:'Découvrir le jeu',url:'porko://donjonbon',cote:'gauche'},
  {id:'viteau',image:image('viteau'),titre:'DJ Viteau — le fan-club',cta:'Écouter les disques',url:'porko://club-viteau',cote:'gauche'},
  {id:'douzi',image:image('douzi'),titre:'Douzi Ambrée — la mousse conforme',cta:'La brasserie en ligne',url:'porko://douzi-ambree',cote:'droite'},
  {id:'saucissignal',image:image('saucissignal'),titre:'Saucissignal — la détection du futur',cta:'Investir dans la startup',url:'porko://saucissignal',cote:'droite'},
];
export const nouveauxSitesPigNet: SitePerso[] = [
  {hote:'donjonbon',titre:'Donjonbon — L’Ordre Cochon',description:'Le site du dungeon crawler : douze chevaliers, douze étages, trois classes.',categorie:'Jeux',theme:'donjon',pages:{
    '':{blocs:[vitrine('DONJONBON','L’Ordre Cochon : Les Entrailles du Royaume','donjonbon','PARTAGICIEL · PORKOS',donjonNav),
      {t:'texte',texte:'Douze étages sous le royaume. Choisissez l’un des douze chevaliers de l’Ordre Cochon, fouillez les caves et remontez avec autre chose qu’un certificat de décès. Donjonbon, c’est le petit nom de votre prochaine mauvaise idée.'},
      {t:'programme',id:'jambonjon'},
      {t:'image',src:'/pignet/donjonbon-capture.png',legende:'Une vraie vue du jeu sur PorkOS.'},
      {t:'titre',texte:'UNE DESCENTE QUI SE MÉRITE'},
      {t:'liste',items:['Tank, DPS ou Jambonmancien : trois manières de faire regretter une rencontre.','Chaque chevalier possède une compétence innée unique.','Équipement, butin, niveaux et compétences : choisissez votre façon de survivre.','Douze étages, des haltes pour souffler et le Grand Affineur tout au fond.']},
      {t:'liens',liens:[{texte:'Choisir mon chevalier',url:'porko://donjonbon/chevaliers'},{texte:'Lire le guide avant de mourir',url:'porko://donjonbon/guide'}]},
      {t:'compteur',base:2048,parJour:12}]},
    chevaliers:{titre:'Donjonbon — les 12 chevaliers',blocs:[vitrine('LES DOUZE','Un blason. Une classe. Une mauvaise habitude.','donjonbon','CHOISIR SA DESCENTE',donjonNav),{t:'chevaliers'},{t:'programme',id:'jambonjon'}]},
    guide:{titre:'Donjonbon — guide de survie',blocs:[vitrine('GUIDE DE SURVIE','La cave n’a pas de service après-vente.','donjonbon','À LIRE AVANT LE SALOIR',donjonNav),
      {t:'titre',texte:'1. BOUGER SANS S’EMMÊLER'},
      {t:'texte',texte:'Sur clavier : Z/S pour avancer ou reculer, Q/D pour le pas latéral, A/E pour tourner. Sur téléphone, utilisez les commandes sous la vue. Regardez la position de l’ennemi avant de déclencher une attaque.'},
      {t:'titre',texte:'2. FAIRE PARLER SA CLASSE'},
      {t:'liste',items:['Tank : protégez-vous, ripostez et poussez les ennemis contre les murs.','DPS : préparez vos ouvertures, esquivez et finissez les cibles affaiblies.','Jambonmancien : maudissez, contrôlez les positions et combinez vos sorts.']},
      {t:'titre',texte:'3. NE PAS TOUT GARDER POUR PLUS TARD'},
      {t:'texte',texte:'Équipez le butin utile, dépensez vos points de compétence quand vous montez de niveau et prenez les occasions de repos. Le jambon et la bière n’ont aucun intérêt dans les poches d’un chevalier mort.'},
      {t:'programme',id:'jambonjon'}]},
    telechargement:{titre:'Donjonbon — télécharger',blocs:[vitrine('TÉLÉCHARGEMENT','Votre cave tient sur votre disque.','donjonbon','VERSION PORKOS',donjonNav),{t:'programme',id:'jambonjon'},{t:'telecharger',fichier:'jambonjon'},{t:'texte',texte:'Le bouton Installer et jouer ouvre directement l’assistant PorkOS. Pour l’expérience modem complète, téléchargez le programme ci-dessus puis ouvrez le fichier. Une fois installé, le bouton devient Jouer.'},{t:'liste',items:['Clavier ou commandes tactiles.','Sauvegarde locale sur ce poste.','La fermeture de la fenêtre ne désinstalle pas le jeu.']}]},
  }},
  {hote:'salle-arcade',titre:'Salle d’arcade PigNet',description:'Tous les jeux, des boutons visibles et aucune chasse au petit lien.',categorie:'Jeux',theme:'portail',pages:{'':{blocs:[
    vitrine('LA SALLE D’ARCADE','Choisissez un jeu. Les dossiers attendront.','donjonbon','ACCÈS DIRECT AUX JEUX',[{texte:'Donjonbon',url:'porko://donjonbon'},{texte:'Accueil PigNet',url:'porko://accueil'}]),
    {t:'titre',texte:'DONJONBON — L’ORDRE COCHON'}, {t:'texte',texte:'Explorez douze étages avec un chevalier, trois classes et du butin.'},{t:'programme',id:'jambonjon'},{t:'liens',liens:[{texte:'Visiter le site de Donjonbon',url:'porko://donjonbon'}]},
    {t:'titre',texte:'COURSE DE GROSSES'},{t:'texte',texte:'Six cochonnes, vos Pork$ fictifs et un speaker qui parle plus vite qu’elles ne courent.'},{t:'programme',id:'grosses'},
    {t:'titre',texte:'NAPPE VIDE'},{t:'texte',texte:'Le démineur des banquets. Protégez la table, pas vos certitudes.'},{t:'action',texte:'Jouer à Nappe Vide',action:{type:'open',app:'nappe-vide'}},
    {t:'liens',liens:[{texte:'Astuces de Nappe Vide',url:'porko://nappe-vide-astuces'},{texte:'Ouvrir un compte pour la course',url:'porko://banque-porc'},{texte:'Le Grenier à Partagiciels',url:'porko://grenier-partagiciels'}]},
  ]}}},
  {hote:'douzi-ambree',titre:'Douzi Ambrée — la brasserie',description:'La mousse conforme, le comptoir et la livraison sur PorkOS.',categorie:'Commerce',theme:'brasserie',pages:{
    '':{blocs:[vitrine('DOUZI AMBRÉE','La mousse conforme. Le verre, lui, est à vous.','douzi','BRASSERIES NATIONALES RÉUNIES',douziNav),{t:'texte',texte:'Bienvenue à la brasserie sur PigNet. Ici, la mousse est inspectée ; chez vous, elle est surtout bue. Retrouvez le comptoir, la livraison et les programmes qui parlent de notre bière.'},{t:'liens',liens:[{texte:'Commander une bière sur Porkomazon',url:'porko://porkomazon'},{texte:'Comment arrive ma commande ?',url:'porko://douzi-ambree/livraison'},{texte:'La notice Douzi Ambrée',url:'porko://porkopedia/la-douzi-ambree'}]}]},
    livraison:{titre:'Douzi Ambrée — livraison',blocs:[vitrine('DU FÛT AU BUREAU','La bière traverse PigNet. Votre écran s’en souvient.','douzi','LE SERVICE DES COLIS',douziNav),{t:'liste',items:['Ouvrez un compte à la banque et réclamez votre allocation.','Choisissez votre bière et votre livraison sur Porkomazon.','Attendez l’arrivée du colis : la bouteille apparaît devant le moniteur.','Cliquez sur la bouteille pour boire. Plusieurs verres peuvent faire pencher l’écran.','Le saucisson est livré séparément et ne rend pas l’écran ivre.']},{t:'liens',liens:[{texte:'Ouvrir la boutique',url:'porko://porkomazon'},{texte:'Ouvrir la banque',url:'porko://banque-porc'}]}]},
    comptoir:{titre:'Douzi Ambrée — comptoir',blocs:[vitrine('LE COMPTOIR','Une bière et quelque chose à regarder.','douzi','PLACE LIBRE PRÈS DU TÉLÉVISEUR',douziNav),{t:'action',texte:'Allumer Channel Pork',action:{type:'open',app:'channel-pork'}},{t:'liens',liens:[{texte:'Le club de DJ Viteau',url:'porko://club-viteau'},{texte:'Commander bière et saucisson',url:'porko://porkomazon'}]}]},
  }},
  {hote:'saucissignal',titre:'Saucissignal — la détection du futur',description:'Technologie de détection, abonnement et levée de fonds.',categorie:'Commerce',theme:'signal',pages:{
    '':{blocs:[vitrine('SAUCISSIGNAL','Détecter. Alerter. Transformer le marché.','saucissignal','TECHNOLOGIE · CONNECTIVITÉ · CROISSANCE',signalNav),
      {t:'texte',texte:'Saucissignal développe une solution de détection du saucisson à distance. Notre fondateur Éric associe une oreille experte à un réseau téléphonique pour vous prévenir avant tout le monde. Une technologie propriétaire. Un marché qui ne dort jamais.'},
      {t:'liste',items:['Détection jusqu’à 325 porkomètres.','Alertes personnalisées, directement par téléphone.','Abonnement : douze porkos par mois.','Le service transmet le signal. Le saucisson reste sur place.']},
      {t:'liens',liens:[{texte:'PARTICIPER À LA LEVÉE DE FONDS',url:'porko://saucissignal/investir'},{texte:'Notre vision et notre technologie',url:'porko://saucissignal/mode-emploi'}]},
      {t:'texte',texte:'Contact investisseurs : eric@saucissignal.pork'},
      {t:'action',texte:'Contacter le fondateur',action:{type:'open',app:'mail'}},
      {t:'action',texte:'Voir la présentation sur Channel Pork',action:{type:'open',app:'channel-pork'}}]},
    investir:{titre:'Saucissignal — espace investisseurs',blocs:[vitrine('ESPACE INVESTISSEURS','Prenez part au prochain signal.','saucissignal','LEVÉE DE FONDS · PORK$',signalNav),
      {t:'texte',texte:'Saucissignal ouvre son capital à la communauté PigNet. Votre participation soutient notre recherche, notre infrastructure et le développement du fondateur. Choisissez votre ticket d’entrée. Le futur vous attend.'},
      {t:'leveeFonds',titre:'Votre participation',texte:'Un versement unique depuis votre compte PorkOS. Aucun prélèvement récurrent. Votre opération est enregistrée à la Caisse Nationale d’Épargne du Porc.',montants:[5,12,25],libelle:'Saucissignal : versement personnel à Éric'},
      {t:'texte',texte:'Les informations complémentaires sont fournies par le fondateur, qui assure également le support, la comptabilité et la détection.'}]},
    'mode-emploi':{titre:'Saucissignal — notre vision',blocs:[vitrine('NOTRE VISION','Une oreille d’avance sur le marché.','saucissignal','RECHERCHE & DÉVELOPPEMENT',signalNav),
      {t:'titre',texte:'UNE TECHNOLOGIE PROPRIÉTAIRE'},
      {t:'texte',texte:'Notre capteur repose sur une capacité d’écoute exclusive, entraînée quotidiennement par Éric. La couche réseau utilise le téléphone. Le matériel évolue au rythme des disponibilités du fondateur.'},
      {t:'titre',texte:'UNE ÉQUIPE INTÉGRÉE'},
      {t:'liste',items:['Direction générale : Éric.','Recherche & développement : Éric.','Relations investisseurs : Éric.','Support et déploiement : Éric.']},
      {t:'liens',liens:[{texte:'Devenir investisseur',url:'porko://saucissignal/investir'}]}]},
  }},
  {hote:'club-viteau',titre:'Le club de DJ Viteau',description:'Morceaux dans PorkAmp, clips sur Channel Pork et disque d’or de graisse.',categorie:'Musique',theme:'zouk',anneau:true,pages:{
    '':{blocs:[vitrine('LE CLUB VITEAU','Les basses font trembler la mousse.','viteau','PAGE DE FANS · NON OFFICIELLE',viteauNav),{t:'texte',texte:'Un club de fans sur PigNet, avec les morceaux déjà présents sur votre poste. Lancez PorkAmp pour les écouter ou Channel Pork pour les clips. On a mis les boutons assez gros pour les trouver après le banquet.'},{t:'action',texte:'Écouter dans PorkAmp',action:{type:'open',app:'porkamp'}},{t:'action',texte:'Regarder Channel Pork',action:{type:'open',app:'channel-pork'}},{t:'liens',liens:[{texte:'La discothèque',url:'porko://club-viteau/disques'},{texte:'Le comptoir Douzi Ambrée',url:'porko://douzi-ambree/comptoir'}]},{t:'livreDor'}]},
    disques:{titre:'Club Viteau — discothèque',blocs:[vitrine('DISCOTHÈQUE','Quatre pistes. Zéro silence obligatoire.','viteau','À ÉCOUTER SUR PORKAMP',viteauNav),{t:'liste',items:['Merci Copain (Remastered)','Sous la neige de Douzi City','Petit Question (Remastered)','Tchimbakala dort']},{t:'action',texte:'Ouvrir les morceaux dans PorkAmp',action:{type:'open',app:'porkamp'}}]},
  },livreDor:[{nom:'Le voisin du dessus',date:'12/06/2003',message:'Le site est très bien. Le volume est moins bien.'}]},
];
