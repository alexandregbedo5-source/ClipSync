# 📋 ClipSync — Presse-Papier Partagé Local (Texte, Liens & Images)

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-black.svg?logo=node.js)](https://nodejs.org)

**ClipSync** synchronise instantanément votre presse-papier (**texte, liens, captures d'écran, photos et images**) en temps réel entre **PC (Windows / Mac / Linux)** et **Smartphone (iOS / Android)** sur votre réseau Wi-Fi local ou point d'accès mobile.

- **Support complet des images** :
  - Collez directement vos captures d'écran (`Ctrl+V` ou capture d'écran Windows).
  - Cliquez sur **`[Copier l'image]`** pour l'écrire directement dans le presse-papier de votre système et la coller immédiatement dans Word, Photoshop, Discord, Paint ou WhatsApp !
  - Joignez des photos depuis la galerie mobile ou l'appareil photo via le bouton `[🖼️ Image]`.
- **Zéro Cloud** : Tout reste strictement sur votre réseau local sans transiter par Internet.
- **Zéro Application à installer** : S'ouvre directement dans le navigateur du smartphone via un QR Code.
- **Synchronisation bidirectionnelle instantanée** via WebSocket (< 5 ms de latence).
- **Détection intelligente des URLs** avec bouton d'ouverture directe.
- **Sélecteur d'adresse IP automatique** (support du Point d'accès Hotspot `192.168.137.1` et Wi-Fi local).

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
3. Copiez, collez ou joignez du texte et des images : ils apparaissent instantanément sur l'autre appareil !

---

## 📄 Licence
Distribué sous licence MIT.
