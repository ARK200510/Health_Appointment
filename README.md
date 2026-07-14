# HealthCare+ — Healthcare Appointment & Follow-up Manager

A production-ready healthcare SaaS platform with three portals (Patient, Doctor, Admin), AI-powered symptom analysis, smart scheduling with double-booking prevention, email notifications, medication reminders, and Google Calendar integration.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![Node.js](https://img.shields.io/badge/Node.js-20-green) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## Features

### Three Portals
- **Patient Portal** — Register, search doctors, book appointments, view AI summaries, medication reminders
- **Doctor Portal** — Today's schedule, patient list, clinical notes, prescriptions, AI pre-visit summaries
- **Admin Portal** — Doctor/patient management, analytics dashboard, leave management, audit logs

### Core Capabilities
- JWT + Refresh Token authentication with RBAC
- Conflict-free appointment scheduling with slot hold mechanism
- AI symptom analysis & post-visit summaries (Google Gemini)
- Email notifications (Nodemailer + SendGrid)
- Medication reminder engine (BullMQ + Redis)
- Google Calendar OAuth sync
- Swagger API documentation
- Docker support

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16 (or Docker)
- Redis 7 (or Docker)

### Option 1: Docker (Recommended)

```bash
# Start PostgreSQL + Redis
docker-compose up -d postgres redis

# Backend
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev

# Worker (separate terminal)
npm run worker

# Frontend (separate terminal)
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

### Option 2: Manual Setup

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for detailed instructions.

## Demo Accounts

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Admin   | admin@healthcare.app   | Admin@123   |
| Doctor  | doctor@healthcare.app  | Doctor@123  |
| Patient | patient@healthcare.app | Patient@123 |

## Project Structure

```
Health_Appointment/
├── backend/                 # Express.js API
│   ├── prisma/              # Database schema & seed
│   └── src/
│       ├── config/          # App configuration
│       ├── controllers/     # Route handlers
│       ├── middleware/      # Auth, audit
│       ├── routes/          # API routes
│       ├── services/        # Business logic
│       ├── validators/      # Zod schemas
│       └── workers/         # Background jobs
├── frontend/                # React + Vite SPA
│   └── src/
│       ├── components/      # UI components
│       ├── pages/           # Portal pages
│       ├── lib/             # API client, utils
│       └── stores/          # Zustand state
├── docs/                    # Documentation
└── docker-compose.yml
```

## API Documentation

- Swagger UI: `http://localhost:5000/api/docs`
- Health check: `http://localhost:5000/api/health`

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for all configuration options.

## Deployment

| Service    | Platform | Guide                          |
|------------|----------|--------------------------------|
| Frontend   | Vercel   | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Backend    | Render   | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Database   | Neon     | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |

## Documentation

- [Installation Guide](docs/INSTALLATION.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [System Design Document](docs/SYSTEM_DESIGN.md)
- [Database Schema](docs/DATABASE.md)
- [API Reference](docs/API.md)
- [Google Calendar Setup](docs/GOOGLE_CALENDAR.md)
- [Gemini AI Setup](docs/GEMINI_SETUP.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)


