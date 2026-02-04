# 🏭 Plant HealthCheck - Complete Fullstack Setup

**Firebase Authentication + Email/SMS Notifications + Backend + Frontend**

---

## 📋 Vue d'ensemble des features à intégrer

### ✅ Authentication
- Firebase Email/Password
- JWT tokens
- Role-based access (User/Admin)
- Session management
- Password reset

### ✅ Dashboard
- KPI cards (Total Checklists, Documents, etc.)
- Real-time charts (Chart.js)
- Status indicators
- User profile

### ✅ Checklists Management
- By trade (Electrical, Mechanical, Instrumentation, etc.)
- CRUD operations
- Status tracking (Draft → Pending → Approved)
- Comments & notes
- Photo attachments

### ✅ Document Management
- Upload (PDF, JPEG, PNG)
- Archive (long-term storage)
- Download & Preview
- Version control
- Metadata

### ✅ Approval Workflow
- Multi-step approval
- Comments on approval
- History tracking
- Rejection with reasons
- Digital signatures (future)

### ✅ Notifications
- Email (via SendGrid/NodeMailer)
- SMS (via Twilio)
- In-app notifications
- Notification preferences
- Real-time updates

### ✅ API REST
- All CRUD endpoints
- Pagination
- Filtering & sorting
- Error handling
- Rate limiting

### ✅ Security
- CORS enabled
- Helmet.js headers
- Input validation
- CSRF protection
- Rate limiting

---

## 🛠️ Stack Technique FINAL

### Frontend
```
React 18 + Vite + TypeScript
├── Tailwind CSS
├── Chart.js
├── Firebase SDK
├── React Router
├── Axios
└── React Hot Toast
```

### Backend
```
Node.js 18+ + Express.js
├── Firebase Admin SDK
├── Multer (uploads)
├── SendGrid/NodeMailer (emails)
├── Twilio (SMS)
├── JWT
├── Helmet
└── CORS
```

### Infrastructure
```
GitHub → Render
├── Frontend (Static Site)
├── Backend (Web Service)
└── Database (Firebase)
```

### External Services
```
Firebase (Auth + DB + Storage)
├── SendGrid (Emails)
├── Twilio (SMS)
└── (Optionnel) Lovable (No-code UI builder)
```

---

## 📁 Structure Détaillée du Projet

### Backend Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── firebase.js          # Firebase Admin SDK
│   │   ├── database.js          # Database initialization
│   │   ├── email.js             # SendGrid config
│   │   └── sms.js               # Twilio config
│   │
│   ├── routes/
│   │   ├── auth.js              # Login, Register, Password reset
│   │   ├── checklists.js        # CRUD checklists
│   │   ├── documents.js         # Upload, Download
│   │   ├── approvals.js         # Approval workflow
│   │   ├── notifications.js     # Email/SMS preferences
│   │   └── users.js             # User management
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT verification
│   │   ├── errorHandler.js      # Error handling
│   │   ├── upload.js            # Multer config
│   │   ├── validation.js        # Input validation
│   │   └── rateLimit.js         # Rate limiting
│   │
│   ├── controllers/
│   │   ├── authController.js    # Auth logic
│   │   ├── checklistController.js
│   │   ├── documentController.js
│   │   ├── approvalController.js
│   │   ├── notificationController.js
│   │   └── userController.js
│   │
│   ├── services/
│   │   ├── emailService.js      # Send emails
│   │   ├── smsService.js        # Send SMS
│   │   ├── checklistService.js
│   │   ├── documentService.js
│   │   └── userService.js
│   │
│   ├── utils/
│   │   ├── validators.js        # Validation helpers
│   │   ├── errorMessages.js
│   │   ├── logger.js
│   │   └── helpers.js
│   │
│   └── app.js                   # Express app setup
│
├── tests/
│   ├── auth.test.js
│   ├── checklists.test.js
│   └── api.test.js
│
├── .env.example
├── .env.production
├── server.js
├── package.json
└── .gitignore
```

### Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── PasswordReset.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   │
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── KPICards.jsx
│   │   │   ├── Charts.jsx
│   │   │   └── RecentActivity.jsx
│   │   │
│   │   ├── Checklists/
│   │   │   ├── ChecklistList.jsx
│   │   │   ├── ChecklistForm.jsx
│   │   │   ├── ChecklistDetail.jsx
│   │   │   ├── ItemEditor.jsx
│   │   │   └── StatusBadge.jsx
│   │   │
│   │   ├── Documents/
│   │   │   ├── DocumentUpload.jsx
│   │   │   ├── DocumentList.jsx
│   │   │   ├── DocumentViewer.jsx
│   │   │   ├── PDFArchive.jsx
│   │   │   └── FilePreview.jsx
│   │   │
│   │   ├── Approvals/
│   │   │   ├── ApprovalQueue.jsx
│   │   │   ├── ApprovalModal.jsx
│   │   │   ├── ApprovalHistory.jsx
│   │   │   └── CommentThread.jsx
│   │   │
│   │   ├── Notifications/
│   │   │   ├── NotificationCenter.jsx
│   │   │   ├── NotificationBell.jsx
│   │   │   ├── NotificationPreferences.jsx
│   │   │   └── ToastNotification.jsx
│   │   │
│   │   ├── Layout/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Footer.jsx
│   │   │   └── Layout.jsx
│   │   │
│   │   ├── Common/
│   │   │   ├── Button.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Loading.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   └── Pagination.jsx
│   │   │
│   │   └── Profile/
│   │       ├── ProfilePage.jsx
│   │       ├── UserSettings.jsx
│   │       └── ChangePassword.jsx
│   │
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── ChecklistsPage.jsx
│   │   ├── DocumentsPage.jsx
│   │   ├── ApprovalsPage.jsx
│   │   ├── NotificationsPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── NotFoundPage.jsx
│   │   └── ErrorPage.jsx
│   │
│   ├── services/
│   │   ├── authService.js
│   │   ├── checklistService.js
│   │   ├── documentService.js
│   │   ├── approvalService.js
│   │   ├── notificationService.js
│   │   ├── userService.js
│   │   └── api.js           # Axios instance
│   │
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   ├── NotificationContext.jsx
│   │   └── LoadingContext.jsx
│   │
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useChecklists.js
│   │   ├── useDocuments.js
│   │   ├── useApprovals.js
│   │   ├── useNotifications.js
│   │   └── useForm.js
│   │
│   ├── utils/
│   │   ├── validators.js
│   │   ├── formatters.js
│   │   ├── constants.js
│   │   ├── localStorage.js
│   │   └── errorHandler.js
│   │
│   ├── styles/
│   │   ├── index.css
│   │   ├── App.css
│   │   └── tailwind.css
│   │
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── firebaseConfig.js
│   ├── App.jsx
│   └── main.jsx
│
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── robots.txt
│
├── .env.example
├── .env.production
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── .gitignore
```

---

## 🔐 Configuration Firebase Complète

### 1. Authentication Setup

```javascript
// Frontend: firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
```

### 2. Realtime Database Schema

```json
{
  "users": {
    "$uid": {
      "email": "user@example.com",
      "displayName": "User Name",
      "role": "user", // "user" | "admin"
      "photoURL": "https://...",
      "status": "active", // "active" | "inactive"
      "createdAt": "2025-01-04T12:00:00Z",
      "updatedAt": "2025-01-04T12:00:00Z",
      "preferences": {
        "emailNotifications": true,
        "smsNotifications": false,
        "pushNotifications": true
      }
    }
  },
  "checklists": {
    "$checklistId": {
      "id": "checklist_123",
      "userId": "user_uid",
      "template": "ElecCheck",
      "title": "Electrical Inspection - Jorf Lasfar",
      "description": "Monthly electrical equipment inspection",
      "items": [
        {
          "id": "item_1",
          "name": "Voltage Check",
          "status": "pending", // "pending" | "completed" | "failed"
          "notes": "All voltages within range",
          "photo": "gs://bucket/photo.jpg",
          "completedAt": "2025-01-04T12:00:00Z"
        }
      ],
      "metadata": {
        "location": "Jorf Lasfar - Unit A",
        "inspectorName": "Ahmed Bennani",
        "date": "2025-01-04",
        "shift": "morning"
      },
      "status": "draft", // "draft" | "pending_approval" | "approved" | "rejected"
      "createdAt": "2025-01-04T10:00:00Z",
      "updatedAt": "2025-01-04T12:00:00Z",
      "approvals": [
        {
          "userId": "approver_uid",
          "status": "approved",
          "comment": "All items verified",
          "timestamp": "2025-01-04T13:00:00Z"
        }
      ]
    }
  },
  "documents": {
    "$docId": {
      "id": "doc_123",
      "filename": "documents/user_uid/photo.pdf",
      "originalName": "Monthly Report.pdf",
      "size": 1024000,
      "mimetype": "application/pdf",
      "uploadedBy": "user_uid",
      "uploadedAt": "2025-01-04T12:00:00Z",
      "checklistId": "checklist_123",
      "tags": ["electrical", "january"],
      "archived": false
    }
  },
  "approvals": {
    "$approvalId": {
      "id": "approval_123",
      "checklistId": "checklist_123",
      "requesterUid": "user_uid",
      "approverUid": "approver_uid",
      "status": "pending", // "pending" | "approved" | "rejected"
      "comment": "Needs minor adjustments",
      "createdAt": "2025-01-04T12:00:00Z",
      "resolvedAt": "2025-01-04T13:00:00Z"
    }
  },
  "notifications": {
    "$notifId": {
      "id": "notif_123",
      "userId": "user_uid",
      "type": "approval_requested", // "approval_requested" | "checklist_completed" | "document_uploaded"
      "title": "Approval Requested",
      "message": "New checklist waiting for approval",
      "data": {
        "checklistId": "checklist_123",
        "relatedUserId": "requester_uid"
      },
      "read": false,
      "createdAt": "2025-01-04T12:00:00Z"
    }
  }
}
```

### 3. Cloud Storage Paths

```
gs://bucket/
├── documents/
│   └── {userId}/
│       ├── {timestamp}_filename.pdf
│       ├── {timestamp}_photo.jpg
│       └── {timestamp}_document.png
└── archives/
    └── {year}/{month}/
        └── {checklistId}.pdf
```

---

## 📧 Email & SMS Setup

### Option 1: SendGrid (Email)

```bash
npm install @sendgrid/mail
```

```javascript
// backend/src/config/email.js
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

module.exports = sgMail;
```

```javascript
// backend/src/services/emailService.js
const sgMail = require('../config/email');

exports.sendApprovalNotification = async (userEmail, checklistTitle) => {
  const msg = {
    to: userEmail,
    from: process.env.SENDER_EMAIL,
    subject: `New Approval Request: ${checklistTitle}`,
    html: `
      <h1>Approval Required</h1>
      <p>A new checklist has been submitted for your approval:</p>
      <p><strong>${checklistTitle}</strong></p>
      <a href="${process.env.APP_URL}/approvals">Review Now</a>
    `
  };
  return sgMail.send(msg);
};

exports.sendChecklistComplete = async (userEmail, checklistTitle) => {
  const msg = {
    to: userEmail,
    from: process.env.SENDER_EMAIL,
    subject: `Checklist Completed: ${checklistTitle}`,
    html: `
      <h1>Inspection Complete</h1>
      <p>Your checklist has been successfully completed:</p>
      <p><strong>${checklistTitle}</strong></p>
    `
  };
  return sgMail.send(msg);
};
```

### Option 2: Twilio (SMS)

```bash
npm install twilio
```

```javascript
// backend/src/config/sms.js
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

module.exports = client;
```

```javascript
// backend/src/services/smsService.js
const client = require('../config/sms');

exports.sendApprovalNotificationSMS = async (phoneNumber, checklistTitle) => {
  return client.messages.create({
    body: `Plant HealthCheck: New approval request for "${checklistTitle}". Review at ${process.env.APP_URL}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber
  });
};
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register              # Register user
POST   /api/auth/login                 # Login user
POST   /api/auth/logout                # Logout
POST   /api/auth/reset-password        # Request password reset
POST   /api/auth/verify-reset-token    # Verify reset token
PUT    /api/auth/reset-password/:token # Reset password
GET    /api/auth/me                    # Get current user
```

### Checklists
```
GET    /api/checklists                 # Get all checklists
GET    /api/checklists/:id             # Get checklist details
POST   /api/checklists                 # Create checklist
PUT    /api/checklists/:id             # Update checklist
DELETE /api/checklists/:id             # Delete checklist
POST   /api/checklists/:id/submit      # Submit for approval
GET    /api/checklists/by-status/:status # Filter by status
```

### Documents
```
POST   /api/documents/upload           # Upload document
GET    /api/documents                  # Get all documents
GET    /api/documents/:id/download     # Download document
DELETE /api/documents/:id              # Delete document
POST   /api/documents/:id/archive      # Archive document
```

### Approvals
```
GET    /api/approvals                  # Get all approvals
GET    /api/approvals/pending          # Get pending approvals
POST   /api/approvals/:id/approve      # Approve checklist
POST   /api/approvals/:id/reject       # Reject checklist
GET    /api/approvals/:id/history      # Get approval history
```

### Notifications
```
GET    /api/notifications              # Get user notifications
PUT    /api/notifications/:id/read     # Mark as read
DELETE /api/notifications/:id          # Delete notification
GET    /api/notifications/preferences  # Get preferences
PUT    /api/notifications/preferences  # Update preferences
```

### Users
```
GET    /api/users/:id                  # Get user profile
PUT    /api/users/:id                  # Update profile
GET    /api/users                      # List all users (admin)
PUT    /api/users/:id/role             # Change user role (admin)
DELETE /api/users/:id                  # Delete user (admin)
```

---

## .env Configuration Complete

### backend/.env

```env
# Server
PORT=5000
NODE_ENV=development

# Firebase
FIREBASE_PROJECT_ID=plant-healthcheck-prod
FIREBASE_PRIVATE_KEY_ID=xxxxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@plant-healthcheck.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=xxxxx
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...

DATABASE_URL=https://plant-healthcheck-prod.firebaseio.com
STORAGE_BUCKET=plant-healthcheck-prod.appspot.com

# JWT
JWT_SECRET=your_super_secret_key_min_32_characters_change_in_prod
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

# Database Backups
BACKUP_ENABLED=true
BACKUP_INTERVAL=daily

# Logging
LOG_LEVEL=debug

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

### frontend/.env

```env
# Firebase
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
VITE_LOG_LEVEL=debug

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_OFFLINE_MODE=false
```

---

## 🚀 Deployment Checklist

### Render Deployment

#### Backend (Web Service)
```
Name: plant-healthcheck-api
Environment: Node
Region: Frankfurt (eur)
Plan: Free/Starter
Root Directory: backend
Build Command: npm install
Start Command: npm start
Environment Variables: [All from backend/.env.production]
```

#### Frontend (Static Site)
```
Name: plant-healthcheck-app
Region: Frankfurt (eur)
Plan: Free
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: frontend/dist
Environment Variables: [All from frontend/.env.production]
```

### GitHub Actions (Optional)

#### backend-deploy.yml
```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/backend-deploy.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Trigger Render Deployment
        run: |
          curl -X POST https://api.render.com/deploy/srv-YOUR_SERVICE_ID \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}"
```

#### frontend-deploy.yml
```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/frontend-deploy.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Trigger Render Deployment
        run: |
          curl -X POST https://api.render.com/deploy/srv-YOUR_SERVICE_ID \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}"
```

---

## 🔒 Security Checklist

- ☐ Change all JWT_SECRET and API keys
- ☐ Enable Firebase security rules (not test mode)
- ☐ Setup rate limiting
- ☐ Enable HTTPS (Render handles this)
- ☐ Setup CORS properly
- ☐ Add input validation
- ☐ Add CSRF protection
- ☐ Setup logging & monitoring
- ☐ Regular security audits
- ☐ Backup strategy

---

## 📦 Package Dependencies

### Backend
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "firebase-admin": "^12.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "multer": "^1.4.5-lts.1",
    "body-parser": "^1.20.2",
    "jsonwebtoken": "^9.1.2",
    "axios": "^1.6.2",
    "@sendgrid/mail": "^7.7.0",
    "twilio": "^4.0.0",
    "express-rate-limit": "^7.1.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0"
  }
}
```

### Frontend
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "firebase": "^10.7.0",
    "axios": "^1.6.2",
    "chart.js": "^4.4.1",
    "react-chartjs-2": "^5.2.0",
    "react-hot-toast": "^2.4.1",
    "tailwindcss": "^3.4.1",
    "zustand": "^4.4.1"
  }
}
```

---

## 🎯 Next Steps

1. **Setup Firebase** (10 min)
   - Create project
   - Enable services
   - Download keys

2. **Setup Email/SMS** (5 min)
   - SendGrid API key
   - Twilio credentials

3. **Configure .env files** (5 min)
   - Backend
   - Frontend

4. **Install Dependencies** (5 min)
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

5. **Test Locally** (15 min)
   ```bash
   # Terminal 1
   cd backend && npm run dev
   
   # Terminal 2
   cd frontend && npm run dev
   ```

6. **Deploy to Render** (15 min)
   - Create services
   - Add environment variables
   - Deploy

7. **Test in Production** (10 min)
   - Create account
   - Test all features
   - Check notifications

---

## 📞 Support Resources

- Firebase: https://firebase.google.com/docs
- Express: https://expressjs.com
- React: https://react.dev
- Render: https://docs.render.com
- SendGrid: https://sendgrid.com/docs
- Twilio: https://www.twilio.com/docs

---

**Status:** Ready for Development ✅

