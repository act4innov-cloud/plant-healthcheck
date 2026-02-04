# Plant HealthCheck - Windows PowerShell Setup Script
# Exécute ce script dans C:\plant-healthcheck

Write-Host "`n╔════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    🚀 PLANT HEALTHCHECK SETUP                            ║" -ForegroundColor Cyan
Write-Host "║                  Windows PowerShell - Auto Setup                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Vérifie qu'on est dans le bon répertoire
if (-not (Test-Path ".git")) {
    Write-Host "❌ Erreur: .git folder not found" -ForegroundColor Red
    Write-Host "📍 Assure-toi d'être dans C:\plant-healthcheck`n" -ForegroundColor Yellow
    exit
}

Write-Host "✅ Repository trouvé!`n" -ForegroundColor Green

# CRÉER LES DOSSIERS
Write-Host "📁 Création de la structure de dossiers...`n" -ForegroundColor Cyan

$folders = @(
    "backend\src\config",
    "backend\src\routes",
    "backend\src\middleware",
    "backend\src\controllers",
    "backend\src\services",
    "backend\src\utils",
    "backend\tests",
    "frontend\src\components\Auth",
    "frontend\src\components\Dashboard",
    "frontend\src\components\Checklists",
    "frontend\src\components\Documents",
    "frontend\src\components\Approvals",
    "frontend\src\components\Notifications",
    "frontend\src\components\Layout",
    "frontend\src\components\Common",
    "frontend\src\pages",
    "frontend\src\services",
    "frontend\src\context",
    "frontend\src\hooks",
    "frontend\src\utils",
    "frontend\src\styles",
    "frontend\src\assets",
    "frontend\public",
    "docs",
    ".github\workflows"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host "  ✓ $folder" -ForegroundColor Green
    }
}

Write-Host "`n✅ Dossiers créés!`n" -ForegroundColor Green

# CRÉER LES FICHIERS DE CONFIG
Write-Host "📝 Création des fichiers de configuration...`n" -ForegroundColor Cyan

# .gitignore
@"
node_modules/
.env
.env.local
.env.*.local
dist/
build/
*.log
.DS_Store
.vscode/
.idea/
serviceAccountKey.json
.next/
.vercel/
"@ | Set-Content ".gitignore"
Write-Host "  ✓ .gitignore" -ForegroundColor Green

# README.md
@"
# Plant HealthCheck

Industrial inspection and monitoring platform for OCP Morocco.

## Features

- ✅ Firebase Authentication
- ✅ Dashboard with KPI and Charts
- ✅ Checklists Management
- ✅ Documents Management
- ✅ Approval Workflow
- ✅ Email Notifications (SendGrid)
- ✅ SMS Notifications (Twilio)
- ✅ Admin Panel

## Stack

- Frontend: React 18 + Vite + Tailwind
- Backend: Node.js + Express + Firebase
- Database: Firebase Realtime Database
- Hosting: Render

## Quick Start

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run dev

# Frontend
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

## Documentation

- 00_START_HERE_GUIDE.md - Step-by-step guide
- COMPLETE_FULLSTACK_SETUP.md - Architecture
- RENDER_DEPLOYMENT_COMPLETE_GUIDE.md - Deployment
"@ | Set-Content "README.md"
Write-Host "  ✓ README.md" -ForegroundColor Green

# backend/.gitignore
@"
node_modules/
.env
.env.local
.DS_Store
*.log
serviceAccountKey.json
dist/
build/
"@ | Set-Content "backend\.gitignore"
Write-Host "  ✓ backend\.gitignore" -ForegroundColor Green

# backend/.env.example
@"
PORT=5000
NODE_ENV=development

FIREBASE_PROJECT_ID=plant-healthcheck-prod
FIREBASE_PRIVATE_KEY_ID=xxxxx
FIREBASE_PRIVATE_KEY=xxxxx
FIREBASE_CLIENT_EMAIL=xxxxx
FIREBASE_CLIENT_ID=xxxxx
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=xxxxx

DATABASE_URL=https://plant-healthcheck-prod.firebaseio.com
STORAGE_BUCKET=plant-healthcheck-prod.appspot.com

JWT_SECRET=generate_a_random_32_character_string
JWT_EXPIRE=7d

CORS_ORIGIN=http://localhost:5173,http://localhost:3000,https://plant-healthcheck-app.onrender.com

SENDGRID_API_KEY=SG.xxxxx
SENDER_EMAIL=noreply@plant-healthcheck.com
APP_URL=http://localhost:5173

TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

LOG_LEVEL=debug
"@ | Set-Content "backend\.env.example"
Write-Host "  ✓ backend\.env.example" -ForegroundColor Green

# backend/package.json
@"
{
  "name": "plant-healthcheck-backend",
  "version": "1.0.0",
  "description": "Plant HealthCheck Backend API",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "lint": "eslint ."
  },
  "dependencies": {
    "express": "^4.18.2",
    "firebase-admin": "^12.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "multer": "^1.4.5-lts.1",
    "body-parser": "^1.20.2",
    "jsonwebtoken": "^9.1.2",
    "@sendgrid/mail": "^7.7.0",
    "twilio": "^4.0.0",
    "express-rate-limit": "^7.1.0",
    "joi": "^17.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "eslint": "^8.55.0"
  }
}
"@ | Set-Content "backend\package.json"
Write-Host "  ✓ backend\package.json" -ForegroundColor Green

# backend/server.js
@"
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(','),
  credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: '✅ API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ API running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
});
"@ | Set-Content "backend\server.js"
Write-Host "  ✓ backend\server.js" -ForegroundColor Green

# frontend/.gitignore
@"
node_modules/
dist/
.env
.env.local
.DS_Store
*.log
"@ | Set-Content "frontend\.gitignore"
Write-Host "  ✓ frontend\.gitignore" -ForegroundColor Green

# frontend/.env.example
@"
VITE_FIREBASE_API_KEY=AIzaSyxxxxx
VITE_FIREBASE_AUTH_DOMAIN=plant-healthcheck-prod.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://plant-healthcheck-prod.firebaseio.com
VITE_FIREBASE_PROJECT_ID=plant-healthcheck-prod
VITE_FIREBASE_STORAGE_BUCKET=plant-healthcheck-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxxx
VITE_FIREBASE_APP_ID=xxxxx

VITE_API_URL=http://localhost:5000/api
VITE_API_URL_PROD=https://plant-healthcheck-api.onrender.com/api

VITE_APP_NAME=Plant HealthCheck
VITE_APP_VERSION=1.0.0
"@ | Set-Content "frontend\.env.example"
Write-Host "  ✓ frontend\.env.example" -ForegroundColor Green

# frontend/package.json
@"
{
  "name": "plant-healthcheck-frontend",
  "version": "1.0.0",
  "description": "Plant HealthCheck Frontend",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint ."
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "firebase": "^10.7.0",
    "axios": "^1.6.2",
    "chart.js": "^4.4.1",
    "react-chartjs-2": "^5.2.0",
    "react-hot-toast": "^2.4.1",
    "tailwindcss": "^3.4.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    "eslint": "^8.55.0",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.32"
  }
}
"@ | Set-Content "frontend\package.json"
Write-Host "  ✓ frontend\package.json" -ForegroundColor Green

# frontend/vite.config.js
@"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  }
})
"@ | Set-Content "frontend\vite.config.js"
Write-Host "  ✓ frontend\vite.config.js" -ForegroundColor Green

# frontend/tailwind.config.js
@"
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
"@ | Set-Content "frontend\tailwind.config.js"
Write-Host "  ✓ frontend\tailwind.config.js" -ForegroundColor Green

# frontend/postcss.config.js
@"
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
"@ | Set-Content "frontend\postcss.config.js"
Write-Host "  ✓ frontend\postcss.config.js" -ForegroundColor Green

# frontend/index.html
@"
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Plant HealthCheck</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
"@ | Set-Content "frontend\index.html"
Write-Host "  ✓ frontend\index.html" -ForegroundColor Green

# frontend/src/main.jsx
@"
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
"@ | Set-Content "frontend\src\main.jsx"
Write-Host "  ✓ frontend\src\main.jsx" -ForegroundColor Green

# frontend/src/App.jsx
@"
export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold text-center text-gray-800">
          🏭 Plant HealthCheck
        </h1>
        <p className="text-center text-gray-600 mt-4">
          Industrial inspection platform
        </p>
      </div>
    </div>
  )
}
"@ | Set-Content "frontend\src\App.jsx"
Write-Host "  ✓ frontend\src\App.jsx" -ForegroundColor Green

# frontend/src/index.css
@"
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
}
"@ | Set-Content "frontend\src\index.css"
Write-Host "  ✓ frontend\src\index.css" -ForegroundColor Green

Write-Host "`n✅ Tous les fichiers créés!`n" -ForegroundColor Green

Write-Host "╔════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                         ✅ SETUP COMPLÉTÉ!                               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "📖 PROCHAINES ÉTAPES:`n" -ForegroundColor Yellow

Write-Host "1️⃣  Push sur GitHub:" -ForegroundColor White
Write-Host "   PS> git add .`n   PS> git commit -m 'feat: Initial project structure'`n   PS> git push origin main`n" -ForegroundColor Gray

Write-Host "2️⃣  Installer dépendances et tester:" -ForegroundColor White
Write-Host "   PS> cd backend`n   PS> npm install`n   PS> npm run dev`n" -ForegroundColor Gray

Write-Host "3️⃣  Lire le guide complet:" -ForegroundColor White
Write-Host "   Lire: 00_START_HERE_GUIDE.md dans les outputs`n" -ForegroundColor Gray

Write-Host "🎉 Structure créée avec succès!`n" -ForegroundColor Green
