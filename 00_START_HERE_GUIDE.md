# 🚀 PLANT HEALTHCHECK - GUIDE COMPLET ÉTAPE PAR ÉTAPE

**De la création à la mise en production en 85 minutes**

---

## 📋 TABLE DES MATIÈRES

1. [Préparation (15 min)](#préparation)
2. [Firebase Setup (10 min)](#firebase-setup)
3. [Email & SMS Setup (5 min)](#email--sms-setup)
4. [Backend Setup Local (20 min)](#backend-setup-local)
5. [Frontend Setup Local (15 min)](#frontend-setup-local)
6. [Tests Locaux (10 min)](#tests-locaux)
7. [Déploiement Render (15 min)](#déploiement-render)
8. [Tests Production (10 min)](#tests-production)

**Temps total: ~100 minutes**

---

## PRÉPARATION

### Durée: 15 minutes

### Étape 1.1: Créer les comptes (si nécessaire)

- [ ] GitHub: https://github.com/signup
- [ ] Firebase: https://firebase.google.com
- [ ] SendGrid: https://sendgrid.com
- [ ] Twilio: https://twilio.com
- [ ] Render: https://render.com

### Étape 1.2: Installer les outils

```bash
# Vérifier que vous avez:
node --version      # Should be v18+
npm --version       # Should be 9+
git --version       # Should be 2.x+
```

Si vous n'avez pas les outils:

```bash
# macOS (Homebrew)
brew install node git

# Windows (Chocolatey)
choco install nodejs git

# Ubuntu/Debian
sudo apt update && sudo apt install nodejs git
```

### Étape 1.3: Cloner votre repository

```bash
# Clone le repo
git clone https://github.com/act4innov-cloud/plant-healthcheck.git
cd plant-healthcheck

# Vérifier la structure
ls -la
# Vous devriez voir: frontend/ backend/ docs/ README.md etc.
```

---

## FIREBASE SETUP

### Durée: 10 minutes

### Étape 2.1: Créer le projet Firebase

1. Aller à https://console.firebase.google.com
2. Cliquer **"Create a project"** (ou **"Add project"**)
3. Remplir:
   - **Project name**: `plant-healthcheck-prod`
   - **Google Analytics**: Désactiver
4. Cliquer **"Create project"**
5. Attendre 2-3 minutes

### Étape 2.2: Activer Authentication

1. Aller à **Authentication** (menu de gauche)
2. Cliquer **"Get started"**
3. Cliquer **"Email/Password"**
4. Toggler **"Enable"**
5. Cliquer **"Save"**

### Étape 2.3: Créer Realtime Database

1. Aller à **Realtime Database**
2. Cliquer **"Create Database"**
3. Choisir **"Start in test mode"**
4. Choisir région: **"eur3"** (Europe)
5. Cliquer **"Enable"**
6. Ajouter cette structure JSON:

```json
{
  "users": {},
  "checklists": {},
  "documents": {},
  "approvals": {},
  "notifications": {}
}
```

7. Cliquer **"Publish"**

### Étape 2.4: Activer Cloud Storage

1. Aller à **Cloud Storage**
2. Cliquer **"Get started"**
3. Choisir **"Start in test mode"**
4. Région: **"eur3"**
5. Cliquer **"Create bucket"**

### Étape 2.5: Télécharger les clés

1. Aller à **Project Settings** (⚙️ en haut à droite)
2. Onglet **"Service Accounts"**
3. Cliquer **"Generate new private key"**
4. Sauvegarder le fichier **`serviceAccountKey.json`**
5. Mettre ce fichier dans: **`backend/serviceAccountKey.json`**

### Étape 2.6: Copier la configuration

1. Toujours dans **Project Settings**
2. Onglet **"General"**
3. Copier et noter:
   - **Project ID** (ex: `plant-healthcheck-prod`)
   - **Web API Key** (commence par `AIza...`)
   - **Auth Domain** (ex: `plant-healthcheck-prod.firebaseapp.com`)
   - **Database URL** (ex: `https://plant-healthcheck-prod.firebaseio.com`)
   - **Storage Bucket** (ex: `plant-healthcheck-prod.appspot.com`)
   - **Messaging Sender ID**
   - **App ID**

> 💡 Vous allez utiliser ces valeurs dans les fichiers `.env`

---

## EMAIL & SMS SETUP

### Durée: 5 minutes

### Option 1: SendGrid (Email)

1. Aller à https://sendgrid.com
2. Créer un compte gratuit
3. Aller à **Settings** → **API Keys**
4. Cliquer **"Create API Key"**
5. Nommer: `Plant HealthCheck`
6. Copier la clé (commence par `SG.`)
7. Sauvegarder dans un fichier texte

### Option 2: Twilio (SMS)

1. Aller à https://twilio.com
2. Créer un compte (inclut crédits gratuits)
3. Aller à **Console** → **Account Info**
4. Copier:
   - **Account SID**
   - **Auth Token**
5. Aller à **Phone Numbers** → **Buy a Number**
6. Acheter un numéro (ex: +1234567890)
7. Sauvegarder le numéro

> 💡 Gardez ces valeurs à proximité pour l'étape suivante

---

## BACKEND SETUP LOCAL

### Durée: 20 minutes

### Étape 4.1: Installer les dépendances

```bash
cd plant-healthcheck/backend
npm install
```

### Étape 4.2: Créer le fichier `.env`

```bash
cp .env.example .env
```

### Étape 4.3: Remplir le `.env`

Ouvrir `backend/.env` et remplir avec vos valeurs Firebase:

```env
# Server
PORT=5000
NODE_ENV=development

# Firebase (de Project Settings)
FIREBASE_PROJECT_ID=plant-healthcheck-prod
FIREBASE_PRIVATE_KEY_ID=xxxxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxxx\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@plant-healthcheck-prod.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=xxxxx
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx@plant-healthcheck-prod.iam.gserviceaccount.com/xxxxx

DATABASE_URL=https://plant-healthcheck-prod.firebaseio.com
STORAGE_BUCKET=plant-healthcheck-prod.appspot.com

# JWT
JWT_SECRET=generate_a_random_32_char_string_here_change_in_production
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,https://plant-healthcheck-app.onrender.com

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxxxx
SENDER_EMAIL=noreply@plant-healthcheck.com
APP_URL=http://localhost:5173

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Logging
LOG_LEVEL=debug
```

> 💡 Pour FIREBASE_PRIVATE_KEY, copier la valeur exactement depuis serviceAccountKey.json

### Étape 4.4: Copier serviceAccountKey.json

```bash
# Copier le fichier téléchargé depuis Firebase
cp /path/to/serviceAccountKey.json backend/serviceAccountKey.json
```

### Étape 4.5: Tester le backend

```bash
npm run dev
```

Vous devriez voir:

```
✅ API running on port 5000
📡 API URL: http://localhost:5000
```

### Étape 4.6: Tester l'API

Ouvrir un autre terminal:

```bash
curl http://localhost:5000/api/health
```

Vous devriez voir:

```json
{
  "status": "✅ API is running",
  "timestamp": "2025-01-04T12:00:00.000Z",
  "environment": "development"
}
```

> ✅ Backend fonctionne!

---

## FRONTEND SETUP LOCAL

### Durée: 15 minutes

### Étape 5.1: Installer les dépendances

```bash
cd ../frontend
npm install
```

### Étape 5.2: Créer le fichier `.env`

```bash
cp .env.example .env
```

### Étape 5.3: Remplir le `.env`

Ouvrir `frontend/.env` et remplir avec vos valeurs Firebase:

```env
# Firebase (de Project Settings → General)
VITE_FIREBASE_API_KEY=AIzaSyxxxxx
VITE_FIREBASE_AUTH_DOMAIN=plant-healthcheck-prod.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://plant-healthcheck-prod.firebaseio.com
VITE_FIREBASE_PROJECT_ID=plant-healthcheck-prod
VITE_FIREBASE_STORAGE_BUCKET=plant-healthcheck-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxxx
VITE_FIREBASE_APP_ID=xxxxx

# API
VITE_API_URL=http://localhost:5000/api
VITE_API_URL_PROD=https://plant-healthcheck-api.onrender.com/api

# App Config
VITE_APP_NAME=Plant HealthCheck
VITE_APP_VERSION=1.0.0
```

### Étape 5.4: Tester le frontend

```bash
npm run dev
```

Vous devriez voir:

```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

### Étape 5.5: Ouvrir le navigateur

Ouvrir http://localhost:5173

Vous devriez voir la **page de login** 🎉

---

## TESTS LOCAUX

### Durée: 10 minutes

### Test 1: Créer un compte

1. Aller à http://localhost:5173
2. Cliquer **"Create one"**
3. Remplir:
   - **Full Name**: John Doe
   - **Email**: john@example.com
   - **Phone**: +1234567890 (optionnel)
   - **Password**: test1234
   - **Confirm Password**: test1234
4. Cliquer **"Create Account"**

Vous devriez voir: ✅ "Account created successfully!"

### Test 2: Se connecter

1. Remplir email et password
2. Cliquer **"Login"**
3. Vous devriez arriver au **Dashboard** 📊

### Test 3: Créer un Checklist

1. Cliquer **"Checklists"** (menu latéral)
2. Cliquer **"New Checklist"**
3. Choisir template: **"Electrical Inspection"**
4. Remplir:
   - **Location**: Jorf Lasfar
   - **Inspector**: Your Name
5. Cliquer **"Create Checklist"**

Vous devriez voir le checklist créé ✅

### Test 4: Uploader un document

1. Cliquer **"Documents"**
2. Drag & drop un fichier PDF ou image
3. Le fichier devrait être uploadé ✅

### Test 5: Soumettre pour approbation

1. Aller au checklist créé
2. Cliquer **"Submit for Approval"**
3. Vous devriez recevoir une **notification** ✅

> ✅ Tous les tests locaux passent!

---

## DÉPLOIEMENT RENDER

### Durée: 15 minutes

### Étape 7.1: Préparer pour GitHub

```bash
# Aller à la racine du projet
cd ../..

# Initialiser git si nécessaire
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Ajouter tous les fichiers
git add .

# Commit
git commit -m "feat: Add complete fullstack application with Firebase auth and email/SMS notifications"

# Push
git push origin main
```

### Étape 7.2: Déployer le Backend

1. Aller à https://dashboard.render.com
2. Cliquer **"New +"** → **"Web Service"**
3. Connecter votre **GitHub** si nécessaire
4. Sélectionner le repo **`plant-healthcheck`**
5. Remplir:
   - **Name**: `plant-healthcheck-api`
   - **Environment**: `Node`
   - **Region**: `Frankfurt (eur)` (ou votre région)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

6. Cliquer **"Advanced"** et ajouter les variables d'environnement:

```
PORT=5000
NODE_ENV=production
FIREBASE_PROJECT_ID=plant-healthcheck-prod
FIREBASE_PRIVATE_KEY_ID=xxxxx
FIREBASE_PRIVATE_KEY=xxxxx (copier depuis serviceAccountKey.json)
FIREBASE_CLIENT_EMAIL=xxxxx
FIREBASE_CLIENT_ID=xxxxx
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=xxxxx
DATABASE_URL=https://plant-healthcheck-prod.firebaseio.com
STORAGE_BUCKET=plant-healthcheck-prod.appspot.com
JWT_SECRET=generate_a_random_32_char_string
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:5173,https://plant-healthcheck-app.onrender.com
SENDGRID_API_KEY=SG.xxxxx
SENDER_EMAIL=noreply@plant-healthcheck.com
APP_URL=https://plant-healthcheck-app.onrender.com
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
LOG_LEVEL=info
```

7. Cliquer **"Create Web Service"**
8. Attendre le déploiement (~5 minutes)
9. **Copier l'URL** générée (ex: `https://plant-healthcheck-api.onrender.com`)

### Étape 7.3: Déployer le Frontend

1. Cliquer **"New +"** → **"Static Site"**
2. Sélectionner le repo **`plant-healthcheck`**
3. Remplir:
   - **Name**: `plant-healthcheck-app`
   - **Region**: `Frankfurt (eur)`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `frontend/dist`

4. Cliquer **"Advanced"** et ajouter les variables d'environnement:

```
VITE_FIREBASE_API_KEY=AIzaSyxxxxx
VITE_FIREBASE_AUTH_DOMAIN=plant-healthcheck-prod.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://plant-healthcheck-prod.firebaseio.com
VITE_FIREBASE_PROJECT_ID=plant-healthcheck-prod
VITE_FIREBASE_STORAGE_BUCKET=plant-healthcheck-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxxx
VITE_FIREBASE_APP_ID=xxxxx
VITE_API_URL_PROD=https://plant-healthcheck-api.onrender.com/api
VITE_APP_NAME=Plant HealthCheck
VITE_APP_VERSION=1.0.0
```

5. Cliquer **"Create Static Site"**
6. Attendre le déploiement (~5 minutes)
7. **Copier l'URL** générée (ex: `https://plant-healthcheck-app.onrender.com`)

---

## TESTS PRODUCTION

### Durée: 10 minutes

### Test 1: Vérifier l'API

```bash
curl https://plant-healthcheck-api.onrender.com/api/health
```

Vous devriez voir:

```json
{
  "status": "✅ API is running",
  "environment": "production"
}
```

### Test 2: Ouvrir le Frontend

1. Aller à: `https://plant-healthcheck-app.onrender.com`
2. Vous devriez voir la **page de login** 🎉

### Test 3: Créer un compte (production)

1. Créer un nouveau compte
2. Vous devriez recevoir un **email de bienvenue** ✅

### Test 4: Tester les notifications

1. Créer un checklist
2. Le soumettre pour approbation
3. Un **admin** (autre compte) devrait recevoir:
   - **Email**: Approval request
   - **SMS**: Approval request (si configuré)

### Test 5: Vérifier les logs

Render Dashboard → Select service → Logs

Vous devriez voir les logs de l'API ✅

---

## ✅ FÉLICITATIONS!

Vous avez une **application fullstack complète** en production! 🚀

### Résumé:

- **Frontend**: https://plant-healthcheck-app.onrender.com
- **Backend API**: https://plant-healthcheck-api.onrender.com
- **Database**: Firebase Realtime Database
- **Auth**: Firebase Email/Password
- **Emails**: SendGrid
- **SMS**: Twilio
- **Hosting**: Render (Free Tier)
- **Total Cost**: $0 USD

### Prochaines étapes:

1. Ajouter plus d'utilisateurs
2. Configurer les métiers OCP
3. Intégrer signatures digitales
4. Analytics & Reporting
5. Mobile app (optionnel)

---

## 📞 SUPPORT

Si vous avez des problèmes:

1. Vérifier les **logs Render**
2. Vérifier **Firebase Console** → Logs
3. Consulter **TROUBLESHOOTING.md**
4. Lire la documentation fournie

---

**Status**: ✅ Production Ready  
**Durée Totale**: ~100 minutes  
**Version**: 1.0.0

🎉 **BON COURAGE!**

