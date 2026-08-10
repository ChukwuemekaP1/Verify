# VeriFlow

Academic certificate verification platform for Nigerian universities. Institutions manage graduates and issue verifiable certificates; the public can verify certificates online.

## Structure

```
Verify/
├── backend/          → Node.js + Express API (Render)
└── frontend/
    └── veriflow-ui/  → React + TanStack Start SPA (Vercel)
```

## Quick Start

### Prerequisites

- Node.js >= 20
- MongoDB (local or Atlas connection string)

### Backend

```bash
cd backend
cp .env.example .env        # edit MONGODB_URI and other variables
npm install
npm run dev                 # starts on http://localhost:4000
```

The seed runs automatically on first start and creates:
- Super admin account
- 3 demo Nigerian universities with admin credentials
- 10 demo graduates
- 10 demo certificates

To run the seed manually: `npm run seed`

### Frontend

```bash
cd frontend/veriflow-ui
npm install
npm run dev                 # starts on http://localhost:5173
```

### Demo Credentials

After seeding, see `.veriflow/credentials/DEMO_CREDENTIALS.md` for all login credentials and test verification examples.

## Deployment

### Backend → Render

1. Push to GitHub
2. Create a new Web Service on Render, connect the repo
3. Set Root Directory: `backend`
4. Build Command: `npm install`
5. Start Command: `node src/server.js`
6. Add environment variables (see `backend/.env.example` for required keys)
7. Set `CLIENT_ORIGIN` to the Vercel frontend URL

### Frontend → Vercel

1. Import the repo in Vercel
2. Root Directory: `frontend/veriflow-ui`
3. Framework Preset: Vite
4. Build Command: `npm run build`
5. Output Directory: `.output/public`
6. Add environment variable: `VITE_API_BASE_URL` = Render backend URL + `/api/v1`

## Tech Stack

- **Backend:** Express 5, Mongoose 8, JWT auth, Cloudinary, Tesseract OCR, QR codes
- **Frontend:** React 19, TanStack Router/Start, Tailwind CSS 4, Radix UI, sonner
