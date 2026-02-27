# Guide d'utilisation - Introduction de devis générée par IA

## Vue d'ensemble

Le système génère automatiquement une introduction professionnelle et personnalisée pour vos devis en fonction des articles sélectionnés. Cette introduction apparaît dans :
- L'email envoyé au client
- La page de consultation du devis en ligne
- Le formulaire de création/modification de devis

## Fonctionnalités

### 1. Génération automatique
- Cliquez sur le bouton **"Générer"** après avoir ajouté des articles au devis
- L'IA analyse les articles et crée une introduction personnalisée en 5-10 lignes
- L'introduction est adaptée au type de client (particulier ou professionnel)

### 2. Modification manuelle
- Vous pouvez modifier le texte généré directement dans la zone de texte
- Un indicateur vous informe que le texte a été modifié manuellement
- Cliquez sur **"Régénérer"** pour créer une nouvelle version automatique

### 3. Mode Auto/Manuel
- **Mode Auto** : le système peut régénérer automatiquement l'intro si besoin
- **Mode Manuel** : préserve vos modifications personnelles

## Caractéristiques de l'introduction générée

L'IA crée des introductions qui :
- Utilisent le vouvoiement (ton professionnel)
- Mettent en avant la cohérence de la solution
- Soulignent les bénéfices concrets (prévention, continuité, sérénité)
- Ne mentionnent que les équipements présents dans le devis
- Évitent les superlatifs agressifs
- Font 120-180 mots (maximum 900 caractères)

## Exemple d'introduction générée

```
La solution proposée assure une protection cohérente de votre habitation, en
combinant détection en amont et supervision à distance. Les détecteurs
extérieurs permettent d'anticiper une tentative avant toute intrusion, tandis
que la transmission mobile garantit la continuité des alertes même en cas de
coupure internet. Le contrat d'entretien prévu permet de maintenir dans le
temps le même niveau de fiabilité, avec un suivi régulier du système et des
composants sensibles. Vous disposez ainsi d'un dispositif simple à utiliser,
pilotable à distance, et conçu pour rester opérationnel en toutes circonstances.
```

## Intégration

### Dans l'email
L'introduction apparaît dans un encadré élégant après le message de bienvenue,
avant les informations sur le lien de consultation en ligne.

### Dans le devis en ligne
L'introduction s'affiche dans un encadré avec bordure bleue sous le titre de
l'affaire, avant la liste des prestations.

### Dans le formulaire
Une section dédiée avec un fond dégradé violet/bleu apparaît dès qu'au moins
un article est ajouté au devis.

## Configuration technique

### Modèle IA utilisé
- OpenAI GPT-4o-mini
- Optimisé pour la rédaction professionnelle en français
- Température : 0.7 (équilibre entre créativité et cohérence)

### Base de données
Trois nouveaux champs dans la table `devis` :
- `intro_text` : le texte de l'introduction
- `intro_generated_at` : date/heure de génération
- `intro_manual_edit` : indicateur de modification manuelle

### Edge Function
- Endpoint : `/functions/v1/generate-devis-intro`
- Méthode : POST
- Authentification requise : Oui

## Cas particuliers

### Devis avec peu d'articles
Si le devis contient seulement 2-3 articles simples, l'IA génère un texte
plus générique mais toujours professionnel.

### Échec de génération
En cas d'erreur (API indisponible, etc.), un texte de secours générique est
automatiquement utilisé :

```
La solution proposée vise à sécuriser vos accès et à assurer une détection
fiable des événements, avec une gestion simple au quotidien. Les équipements
sélectionnés ont été dimensionnés pour répondre à votre configuration et
permettre un usage clair et efficace, sur site comme à distance.
```

## Bonnes pratiques

1. **Générez l'intro après avoir finalisé la liste des articles** pour un
   meilleur résultat

2. **Relisez toujours le texte généré** avant d'envoyer le devis

3. **Personnalisez si nécessaire** pour ajouter des détails spécifiques au
   contexte du client

4. **Régénérez si vous modifiez significativement les articles** pour avoir
   une intro cohérente

5. **Utilisez le champ "Message personnalisé"** dans l'email pour ajouter des
   informations complémentaires sans modifier l'intro

## Limitations

- L'IA ne peut mentionner que des éléments présents ou déductibles des articles
- Pas de garantie de délais ou de promesses absolues
- Pas d'invention de matériel non présent dans le devis
- Nécessite au moins un article dans le devis pour fonctionner

## Support

Pour toute question ou problème avec la génération d'introduction :
1. Vérifiez que des articles sont bien présents dans le devis
2. Consultez les logs de l'edge function en cas d'erreur
3. Utilisez le texte de secours en attendant une résolution
