# Marksheet Verification & Watermark System 🛡️

A full-stack digital document verification portal engineered with **Node.js, Express, React, and MongoDB**. The system computes a **SHA-256 cryptographic fingerprint** from uploaded marksheets (PDFs & Images) to detect duplicate uploads instantly, embeds semi-transparent digital watermarks & verification stamps, and maintains a secure audit log.

---

## 🌟 Key Features

1. **SHA-256 Cryptographic Duplicate Detection**
   - Computes a unique SHA-256 binary hash upon file upload.
   - Searches MongoDB Atlas using an indexed `fileHash` field.
   - Renaming files (e.g., `marksheet.pdf` vs `student_result.pdf`) will **not** bypass duplicate detection if the underlying file contents match.

2. **Automatic Digital Watermark & Verification Stamp**
   - **PDF Documents**: Uses `pdf-lib` to embed a diagonal translucent watermark and an official verification stamp on **every page**.
   - **Image Documents**: Uses `sharp` SVG compositing to apply translucent vector watermarks to JPG, JPEG, PNG, and WEBP marksheets.

3. **Verification State Workflows**
   - **First Upload (New Document)**: Generates a unique `VER-2026-XXXXXX` Verification ID, embeds the watermark, saves original & watermarked files to storage, and writes document metadata to MongoDB.
   - **Second Upload (Duplicate Document)**: Detects matching SHA-256 hash in MongoDB, halts duplicate record creation, and displays a prominent **“This marksheet has already been verified”** alert with existing record metadata & watermarked file download options.

4. **Comprehensive Admin & Audit Dashboard**
   - Displays real-time metrics: Total Marksheets, Verified Status, Intercepted Duplicates, and Today's Verifications.
   - Complete audit trail of all verification attempts (new vs duplicate attempts).
   - Search by Verification ID, original filename, or SHA-256 fingerprint.

---

## 🚀 Tech Stack

- **Frontend**: React.js, Vite, Lucide Icons, Modern Glassmorphism CSS design system.
- **Backend**: Node.js, Express.js, Multer (memory buffer upload).
- **Cryptography & Image Processing**: Node `crypto` (SHA-256), `pdf-lib` (PDF watermarking), `sharp` (Image watermarking).
- **Database**: MongoDB / MongoDB Atlas (with automatic in-memory fallback for instant zero-config local testing).

---

## 📁 Directory Structure

```text
Marksheet-Verification/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection & fallback
│   ├── controllers/
│   │   └── marksheetController.js# Core upload, hash check & watermarking logic
│   ├── middleware/
│   │   ├── upload.js             # Multer memory storage & file type validator
│   │   └── errorHandler.js     # Global Express error handler
│   ├── models/
│   │   ├── Marksheet.js          # Main schema with unique fileHash index
│   │   └── VerificationAttempt.js# Audit history collection
│   ├── routes/
│   │   └── marksheetRoutes.js    # Express REST API routes
│   ├── services/
│   │   ├── hashService.js        # SHA-256 hash generator
│   │   ├── watermarkService.js   # PDF & Image watermarker
│   │   └── storageService.js     # Disk/Cloud file storage driver
│   ├── uploads/
│   │   ├── original/             # Stored original files
│   │   └── watermarked/          # Stored watermarked files
│   ├── .env                      # Environment variables
│   └── server.js                 # Express server entrypoint
│
├── frontend/
│   ├── src/
│   │   ├── components/           # Navbar, Sidebar, Modals, StatsCards
│   │   ├── pages/                # Dashboard, Upload, History, VerifiedDocs, Admin
│   │   ├── services/
│   │   │   └── api.js            # Axios client API helper
│   │   ├── App.jsx
│   │   ├── index.css             # Glassmorphism dark mode design system
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
│
├── package.json                  # Root package runner with concurrently
└── README.md
```

---

## ⚙️ Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

### 2. Installation

Install dependencies for root, backend, and frontend with a single command:

```bash
npm run install:all
```

Or manually:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

---

## 🔑 Environment Configuration (.env)

### Backend `.env` (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
# MongoDB Atlas Connection String (Optional: Leave blank to auto-use in-memory MongoDB)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/marksheet_db?retryWrites=true&w=majority
STORAGE_MODE=local
```

> 💡 **Note**: If `MONGODB_URI` is left blank or disconnected, the system automatically starts an **In-Memory MongoDB Server** (`mongodb-memory-server`) so you can test the application instantly out-of-the-box!

### Frontend `.env` (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000/api/marksheets
```

---

## 🚀 Running the Application

To run both backend API server and React frontend concurrently:

```bash
npm run dev
```

- **Frontend Portal**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

---

## 🧪 Verification & Duplicate Testing Workflow

1. Open `http://localhost:5173` and click **Upload Marksheet**.
2. Select any sample PDF or Image marksheet and click **Upload & Verify Marksheet**.
3. **First Upload Result**:
   - System computes SHA-256 hash.
   - Searches MongoDB (No match found).
   - Generates Verification ID: `VER-2026-000001`.
   - Embeds watermark stamp into document.
   - Displays **“✓ Verification Successful”** green badge.
4. **Second Upload (Duplicate Test)**:
   - Re-upload the **exact same file** (or rename the file first to `test_result.pdf`).
   - Click **Upload & Verify Marksheet**.
   - System computes SHA-256 hash and finds matching record in MongoDB.
   - Displays **“⚠ Already Verified”** amber warning badge with original Verification ID (`VER-2026-000001`), original upload timestamp, and options to view/download the existing watermarked document.