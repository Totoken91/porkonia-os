# Comptes et sessions PorkOS

Au premier démarrage, créer un profil avec un nom, un mot de passe et sa confirmation. Aux démarrages suivants, choisir un profil enregistré et saisir son vrai mot de passe. Le dernier profil choisi reste sélectionné, sans connexion automatique. Le menu « Fermer la session… » permet de changer d'utilisateur sans recharger la page. L'accès invité est supprimé.

Les comptes vivent dans `localStorage`, sur ce navigateur et cette origine. Ils ne sont pas des comptes serveur et ne se synchronisent pas entre appareils. Effacer les données du site efface aussi comptes et sauvegardes. Le registre contient un identifiant stable, le nom, la date de création, un sel aléatoire et une empreinte PBKDF2 SHA-256 (210 000 itérations, 256 bits), jamais le mot de passe en clair. Le calcul utilise [Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveBits), disponible en HTTPS et sur localhost. Le stockage local reste modifiable par le propriétaire du navigateur ; ce dispositif ne remplace pas une authentification serveur.

## Sauvegardes par profil

Chaque profil possède son disque virtuel (documents, dessins, logiciels installés), sa banque, ses distinctions, son nombre de sessions, son courrier et ses brouillons, les fenêtres et positions d'icônes, ses réglages, sa partie Donjonbon et ses conseils, les stocks et livraisons de bière et saucisson, son ivresse, l'historique d'Exécuter, les signatures de livres d'or et ses publications/carnets sur PigNet.

La majorité des clés se terminent par l'identifiant du compte. Les stocks extérieurs au bureau sont réinitialisés et relus lors d'un changement de session. Fermer une session ou éteindre la machine retire le profil actif de la mémoire. Le marqueur d'arrêt brutal reste propre à la machine.

## Passage de l'ancienne démo aux comptes

Si des sauvegardes antérieures existent, la création du premier compte propose de les récupérer (case cochée par défaut). Ce compte conserve l'identifiant historique `citoyen`, avec sa banque et son disque ; les anciennes données partagées sont copiées vers ses nouvelles clés individuelles. Les originaux sont conservés. En cas d'échec d'enregistrement, les copies sont annulées et le compte n'est pas créé.

Décocher cette récupération crée un profil neuf avec un autre identifiant. Les profils suivants commencent toujours avec leurs propres données. La récupération n'est proposée qu'avant la création du premier compte.

## Validation

`npm test` couvre vérification du mot de passe, absence de stockage en clair, doublons, confirmation, migration, refus de migration, annulation sur quota insuffisant et isolation des provisions/ivresse. Après `npm run build`, `node tests/e2e/comptes.mjs` vérifie création, connexion refusée, changement de profil, banque, provisions et persistance au rechargement sur bureau, paysage, portrait et largeur 360 px ; il vérifie aussi une partie Donjonbon et la récupération d'un ancien stock.
