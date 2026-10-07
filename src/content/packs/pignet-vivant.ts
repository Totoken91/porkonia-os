import type {SitePerso} from '../types';
export const rubriquesVivantes=[
  {titre:'Petites annonces',detail:'Vendre, chercher, regretter.',url:'porko://petites-annonces'},
  {titre:'Horoscope porcin',detail:'Les astres ont signé le formulaire.',url:'porko://horoscope-porcin'},
  {titre:'Courrier des lecteurs',detail:'La rédaction vous répond.',url:'porko://courrier-lecteurs'},
];
export const annoncesPigNet=[
  {id:'a1',categorie:'À vendre',auteur:'Marcel',date:'Archive PigNet',texte:'Fauteuil de bureau. Descend tout seul. Idéal pour quelqu’un qui manque d’ambition.'},
  {id:'a2',categorie:'Recherche',auteur:'La buvette',date:'Archive PigNet',texte:'Recherche décapsuleur. Le précédent est parti avec la caisse.'},
  {id:'a3',categorie:'Échange',auteur:'RatDuModem',date:'Archive PigNet',texte:'Échange douze disquettes contre une qui marche. Répondre avant que ma mère utilise le téléphone.'},
];
export const lettresPigNet=[
  {id:'l1',categorie:'',auteur:'Un abonné humide',date:'Archive PigNet',texte:'Depuis que j’ai commandé de la bière, il y a une bouteille devant mon écran. Est-ce un virus ?'},
];
export const categoriesAnnonces=['À vendre','Recherche','Échange'];
export const signesPorcins=['Groin','Sabot','Soie','Défense','Queue','Oreille','Jambon','Échine','Travers','Jarret','Couenne','Boudin'];
export const predictionsPorcines=[
  'Travail : une réunion sera évitée. Amour : votre chaise vous soutient. Conseil : faites un tour à la salle d’arcade.',
  'Argent : vérifiez votre allocation à la banque avant d’investir dans une oreille. Amour : votre chaise vous soutient.',
  'Votre ascendant est en cave. Descendez dans Donjonbon ; remontez avant le dîner. Nombre favorable : 12.',
  'Un colis approche. Les astres conseillent de libérer le bas de votre moniteur. Santé : le saucisson ne remplace pas une chaise.',
  'Mercure encombre votre boîte aux lettres. Répondez à un copain. Votre destin ne s’améliorera pas en cliquant Actualiser.',
  'Une rencontre importante aura lieu près d’un modem. N’éteignez pas votre enthousiasme. Éteignez le modem si ça sent le brûlé.',
];
export const reponsesRedaction=[
  'La rédaction a examiné votre lettre. Votre problème est recevable ; sa résolution dépend d’un service qui n’existe plus. En attendant, restez assis.',
  'Cher lecteur, nous conseillons de fermer la fenêtre concernée et de regarder par une vraie fenêtre. Si le problème persiste, revenez : nous serons toujours ici.',
  'Nous avons transmis votre observation au comité. Le comité nous l’a rendue, avec une tache de café. Nous la publions donc en l’état.',
];
export const textesVivants:Record<string,string>={
  'vie.rubriques':'Le coin des citoyens','vie.nouvelles':'Ça se passe sur votre poste','vie.calme':'Aucune nouvelle du poste. Lancez une partie, commandez un colis ou relevez votre courrier.',
  'vie.etage':'Donjonbon : un chevalier a atteint l’étage {n}. La rédaction préfère attendre en surface.',
  'vie.victoire':'Les douze étages sont vaincus. Le chevalier remonte ; le service des caves cherche un nouveau gardien.',
  'vie.colis':'{n} colis en livraison. Le service de circulation demande de dégager le bureau.',
  'vie.stock':'{n} provisions attendent devant votre écran. Le comité d’accueil a soif.',
  'vie.banque':'La banque a enregistré une opération : {libelle}.','vie.mail':'{n} courrier(s) non lu(s). Le facteur refuse de repartir.',
  'vie.poste':'Ces publications restent sur ce poste. Elles ne sont pas envoyées à d’autres joueurs.',
  'vie.categorie':'Catégorie','vie.tout':'Toutes','vie.texte':'Votre texte','vie.publier':'Publier mon annonce','vie.ecrire':'Écrire à la rédaction','vie.repondre':'Répondre','vie.retirer':'Retirer mon annonce','vie.sujet':'À propos de votre annonce','vie.brouillon':'Bonjour, votre annonce m’intéresse : {texte}',
  'vie.signe':'Votre signe porcin','vie.garder':'Garder cette prédiction','vie.garde':'Prédiction conservée sur ce poste.','vie.carnet':'Votre carnet astral','vie.redaction':'Réponse de la rédaction','vie.publie':'Publication enregistrée sur ce poste.',
  'vie.secretIndice':'Service technique : le central de la place répond encore.','vie.secretBouton':'Prise de diagnostic du portail',
};
const site=(hote:string,titre:string,description:string,theme:SitePerso['theme'],blocs:SitePerso['pages'][string]['blocs'],cache=false):SitePerso=>({hote,titre,description,categorie:cache?'Retirés':'Vie locale',theme,pages:{'':{blocs:[{t:'entete',titre,sousTitre:description,badge:cache?'PAGE PERSONNELLE · ARCHIVES':'PIGNET · LE COIN DES CITOYENS',navigation:[{texte:'Accueil PigNet',url:'porko://accueil'},...(!cache?rubriquesVivantes.map(r=>({texte:r.titre,url:r.url})):[])]},...blocs]}}});
export const sitesVivants:SitePerso[]=[
  site('petites-annonces','LE BON GROIN','Les occasions ne manquent pas. Les garanties, si.','papier',[{t:'vieLocale',mode:'annonces'}]),
  site('horoscope-porcin','LES ASTRES DU SALOIR','Prédictions quotidiennes, sans engagement des planètes.','nuit',[{t:'vieLocale',mode:'horoscope'}]),
  site('courrier-lecteurs','LA RÉDACTION VOUS LIT','Écrivez. Nous avons le temps de mal comprendre.','papier',[{t:'vieLocale',mode:'courrier'}]),
  site('modem-libre','MODEM LIBRE / CANAL 12','Vous avez trouvé la prise de service. Fermez la porte en entrant.','nuit',[{t:'texte',texte:'Pas de crack miraculeux ici. Juste les jeux du poste, des liens qui fonctionnent et une page que le webmaster a oublié de ranger.'},{t:'liens',liens:[{texte:'Le forum du modem',url:'porko://forum-56k'},{texte:'La page oubliée de RatDuModem',url:'porko://chez-rat'}]},{t:'programme',id:'jambonjon'},{t:'telecharger',fichier:'jambonjon'}],true),
  {...site('forum-56k','FORUM 56K — FIL ENCORE OUVERT','Sujet : est-ce que quelqu’un reçoit encore ce message ?','ciel',[{t:'livreDor'},{t:'liens',liens:[{texte:'La page perso de l’administrateur',url:'porko://chez-rat'}]}],true),livreDor:[{nom:'RatDuModem',date:'23/08/1999',message:'Si vous lisez ça, la prise de diagnostic fonctionne encore.'},{nom:'Marcel',date:'24/08/1999',message:'Oui. Par contre je ne sais plus pourquoi je suis venu.'}]},
  {...site('chez-rat','~ BIENVENUE CHEZ RAT ~','Optimisé pour mon ordinateur. Ça compte.','bois',[{t:'clignote',texte:'DERNIÈRE MISE À JOUR : QUAND J’AURAI LE TEMPS'},{t:'texte',texte:'Mon hobby : retrouver des câbles. Mon projet : savoir à quoi ils servent. Mon ennemi : le téléphone du salon.'},{t:'action',texte:'Écouter ma musique',action:{type:'open',app:'porkamp'}},{t:'livreDor'},{t:'liens',liens:[{texte:'Retour au canal libre',url:'porko://modem-libre'}]}],true),livreDor:[{nom:'Maman',date:'25/08/1999',message:'Déconnecte, j’attends un appel.'}]},
];
