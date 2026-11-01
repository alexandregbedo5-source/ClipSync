# 📋 ClipSync — Presse-Papier Partagé Local (100% Hors-Ligne)

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-black.svg?logo=node.js)](https://nodejs.org)

**ClipSync** synchronise instantanément votre presse-papier (texte, liens, codes, snippets) en temps réel entre **PC (Windows / Mac / Linux)** et **Smartphone (iOS / Android)** sur votre réseau Wi-Fi local ou point d'accès mobile.

- **Zéro Cloud** : Tout reste strictement sur votre réseau local.
- **Zéro Application à installer** : S'ouvre directement dans le navigateur du smartphone via un QR Code.
- **Synchronisation bidirectionnelle instantanée** via WebSocket (< 5 ms de latence).
- **Détection intelligente des URLs** avec bouton d'ouverture directe.
- **Historique complet** avec copie en 1 clic.

---

## 🚀 Démarrage Rapide

### Prérequis
- [Node.js](https://nodejs.org) (v18 ou supérieur)

### 1. Installation
```bash
git clone https://github.com/alexandregbedo5-source/clipsync.git
cd clipsync
npm install
```

### 2. Lancement
- **Sous Windows** : Double-cliquez sur `start.bat`
- **Ou en ligne de commande** :
  ```bash
  npm start
  ```

L'application démarre sur `http://localhost:6060`.

---

## 📱 Utilisation

1. Connectez votre PC et votre smartphone au même réseau Wi-Fi ou au partage de connexion.
2. Cliquez sur **"Scanner"** sur votre PC et flashez le QR Code avec votre smartphone.
3. Copiez ou tapez du texte sur l'un des appareils : il apparaît instantanément sur l'autre avec un bouton **"Copier"** !

---

## 📄 Licence
Distribué sous licence MIT.
