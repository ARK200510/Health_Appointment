# Installation Guide

## Prerequisites

| Tool       | Version | Purpose              |
|------------|---------|----------------------|
| Node.js    | 20+     | Runtime              |
| PostgreSQL | 16+     | Primary database     |
| Redis      | 7+      | Job queue (BullMQ)   |
| npm        | 9+      | Package manager      |

## Step 1: Clone & Install

```bash
cd Health_Appointment

# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

## Step 2: Database Setup

### Using Docker
```bash
docker-compose up -d postgres redis
```

### Using Neon (Cloud)
1. Create account at [neon.tech](https://neon.tech)
2. Create a new PostgreSQL project
3. Copy the connection string

## Step 3: Environment Configuration

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT secrets, etc.

# Frontend
cd ../frontend
cp .env.example .env
```

### Minimum Required Variables
```env
# backend/.env
DATABASE_URL=postgresql://healthuser:healthpass@localhost:5432/health_appointment
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
REDIS_URL=redis://localhost:6379
```

## Step 4: Database Migration & Seed

```bash
cd backend
npx prisma generate
npx prisma db push
npm run db:seed
```

## Step 5: Start Services

```bash
# Terminal 1 - API Server
cd backend
npm run dev

# Terminal 2 - Background Worker
cd backend
npm run worker

# Terminal 3 - Frontend
cd frontend
npm run dev
```

## Step 6: Verify

- Frontend: http://localhost:5173
- API: http://localhost:5000/api/health
- Swagger: http://localhost:5000/api/docs

Login with demo accounts from README.md.

## Optional: AI & Calendar Setup

- [Gemini AI Setup](GEMINI_SETUP.md)
- [Google Calendar Setup](GOOGLE_CALENDAR.md)
