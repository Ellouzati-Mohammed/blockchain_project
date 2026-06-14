# Projet Blockchain Truffle + React

Application de démonstration pour interagir avec des contrats intelligents Solidity via un frontend React et Web3.

Le projet contient :

- des contrats Solidity dans `contracts/`
- des migrations Truffle dans `migrations/`
- un frontend React dans `client/`
- les artefacts compilés dans `client/src/contracts/`

## Fonctionnalités

- affichage des contrats disponibles
- connexion à MetaMask ou au réseau local Ganache
- affichage du compte, du réseau, de la balance et du dernier bloc
- exécution des méthodes des contrats depuis l'interface
- gestion des événements émis par les contrats
- protection contre les appels sur une mauvaise adresse de déploiement

## Prérequis

- Node.js installé
- npm installé
- Truffle installé globalement ou utilisable via `npx`
- Ganache installé et lancé localement
- MetaMask installé dans le navigateur

## Arborescence utile

- `contracts/` : code Solidity
- `migrations/` : scripts de déploiement Truffle
- `client/` : application React
- `client/src/contracts/` : fichiers JSON générés par Truffle

## Installation

Depuis la racine du projet :

```bash
npm install
cd client
npm install
```

Si la racine n'a pas de `package.json`, installe seulement les dépendances dans `client/` et assure-toi d'avoir Truffle disponible.

## Démarrage complet

### 1. Lancer Ganache

Ouvre un terminal et démarre Ganache sur le port attendu par l'application :

```bash
npx ganache
```

L'application utilise l'URL locale suivante :

```text
http://127.0.0.1:7545
```

### 2. Compiler et déployer les contrats

Dans un autre terminal, depuis la racine du projet :

```bash
truffle compile
truffle migrate --reset
```

Cette étape est importante, car le frontend lit les adresses de déploiement dans les artefacts générés par Truffle.

### 3. Démarrer le frontend React

Dans le dossier `client/` :

```bash
cd client
npm start
```

Ouvre ensuite l'application dans le navigateur indiqué par React, généralement :

```text
http://localhost:3000
```

## Utilisation de l'application

### Écran d'accueil

Au chargement, l'interface affiche :

- le provider détecté
- le réseau courant
- le compte connecté
- la balance
- la liste des contrats disponibles

### Connexion MetaMask

Si MetaMask est installé :

1. Clique sur `Connecter MetaMask` ou `Autoriser MetaMask`.
2. Autorise le compte dans la fenêtre MetaMask.
3. Vérifie que le réseau MetaMask correspond au réseau Ganache utilisé pour le déploiement.

Si MetaMask n'est pas utilisé, l'application se connecte directement à Ganache en lecture locale.

### Ouvrir un contrat

1. Clique sur un contrat dans la liste.
2. Vérifie l'adresse affichée.
3. Vérifie le réseau de déploiement affiché par l'interface.
4. Si le réseau ne correspond pas, redeploie les contrats avec `truffle migrate --reset`.

### Exécuter une méthode

1. Renseigne les paramètres de la méthode.
2. Si la méthode est `payable`, renseigne aussi `value (wei)`.
3. Clique sur `Executer`.
4. Confirme la transaction dans MetaMask si nécessaire.

### Envoyer des fonds au contrat Payment

La méthode `receivePayment` est `payable` et reçoit de l'ETH envoyé au contrat.

- 1 ETH = `1000000000000000000` wei
- 15 ETH = `15000000000000000000` wei

Pour tester `receivePayment` :

1. Ouvre le contrat `Payment`.
2. Sélectionne `receivePayment`.
3. Mets la valeur en wei dans `value (wei)`.
4. Exécute la transaction.

La fonction `withdraw` sert ensuite à retirer tout le solde du contrat vers le `recipient` défini au déploiement.

## Rôle des contrats

- `Addition` : addition de deux nombres
- `Convertisseur` : conversion Ether / Wei
- `GestionChaines` : manipulation de chaînes de caractères
- `Positif` : test si un nombre est positif
- `Parite` : test si un nombre est pair
- `Tableau` : gestion d'un tableau dynamique
- `Forme` : contrat abstrait de base
- `Rectangle` : implémentation d'une forme avec longueur et largeur
- `Payment` : réception et retrait de paiements

## Commandes utiles

Depuis la racine du projet :

```bash
truffle compile
truffle migrate --reset
```

Depuis `client/` :

```bash
npm start
npm test
npm run build
```

## Dépannage

### Le contrat n'est pas présent à cette adresse sur le réseau courant

Cause probable : l'adresse de l'artefact Truffle ne correspond pas au réseau actif.

Solution :

1. Lancer Ganache.
2. Recompiler si besoin.
3. Relancer `truffle migrate --reset`.
4. Vérifier que MetaMask est sur le même réseau local.

### Parameter decoding error

Cause probable : appel vers une adresse de contrat invalide, mauvais réseau, ou paramètres manquants.

Solution :

1. Vérifier l'adresse de déploiement.
2. Vérifier les paramètres saisis dans l'interface.
3. Vérifier que le contrat existe bien sur le réseau courant.

### MetaMask n'est pas connecté

Solution :

1. Vérifier que l'extension est installée.
2. Autoriser le site dans MetaMask.
3. Recharger la page.

### `npm start` ne fonctionne pas

Vérifie que tu lances bien la commande dans le dossier `client/` et non à la racine si aucun script npm n'existe à la racine.

## Résumé rapide

```bash
npx ganache
truffle migrate --reset
cd client
npm start
```

Ensuite, ouvre l'application, connecte MetaMask si besoin, puis teste les contrats depuis l'interface.