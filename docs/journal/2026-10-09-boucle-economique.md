# Boucle économique

**Problème.** Les Pork$ entraient (allocation, paris) et sortaient (Porkomazon, paris, bourse) sans boucle : jouer ne
rapportait rien, la bourse ne servait qu'à elle-même, le saucisson ne faisait rien, et Saucissignal avalait l'argent
sans suite.

**Choix.**
- Primes civiques sur des signaux déjà émis : Nappe Vide conforme (5 Pork$, 3 par jour), émission regardée jusqu'au
  bout (3 Pork$, 3 par jour), boss de L'Ordre Cochon (40 Pork$, une fois chacun : on les reconnaît à l'arrivée aux
  étages 4, 7 et 10, puisqu'un boss garde l'escalier), victoire (150 Pork$, une fois). Rien n'est modifié dans le jeu.
  Sans compte, la prime part au Trésor.
- Prix de Porkomazon indexés sur le cours du jour (bière sur la Mousse, saucisson sur la Saucisse de minuit).
- Dividende en nature : 20 parts de Mousse donnent une Douzi Ambrée par jour, réclamée à la banque.
- Le saucisson éponge 1,5 verre ; l'écran se redresse, Gruik le remarque.
- Saucissignal reste une arnaque, conformément à l'épisode « Éric présente Saucissignal » et à la fiche d'Éric : un
  versement abonne d'office (12 Pork$ par semaine, une échéance à la fois, reportée si le solde manque), Éric envoie un
  rapport par prélèvement et de rares « alertes ». Résiliation : un courrier à Éric contenant « résilier ».
- Le portail affiche désormais les cours de séance, les mêmes que ceux du guichet où l'on achète et vend.

**Inventé** (non canon) : montants, textes des primes, courriers de la Caisse et rapports d'Éric, alertes.

**Validation.** Typecheck, 327 tests unitaires (primes et plafonds, dividende, abonnement, résiliation, sauvegarde,
prix, éponge, cohérence du pack), build, parcours Course de Grosses étendu (prix indexés, saucisson qui éponge,
souscription Saucissignal et courrier d'Éric) sur ordinateur et Poche.
