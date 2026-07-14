# Deployment Guide

## Frontend — Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set root directory to `frontend`
4. Environment variables:
   ```
   VITE_API_URL=https://your-api.onrender.com/api
   ```
5. Deploy

## Backend — Render

1. Create new **Web Service** on [Render](https://render.com)
2. Connect GitHub repo, set root directory to `backend`
3. Build command: `npm install && npx prisma generate && npm run build`
4. Start command: `npx prisma db push && node dist/index.js`
5. Environment variables: copy from `.env.example`

### Render Worker Service
Create a second service for background jobs:
- Start command: `node dist/workers/index.js` (or `npm run worker`)

## Database — Neon PostgreSQL

1. Create project at [neon.tech](https://neon.tech)
2. Copy connection string to `DATABASE_URL` on Render
3. Enable connection pooling for serverless

## Redis — Upstash

1. Create database at [upstash.com](https://upstash.com)
2. Copy Redis URL to `REDIS_URL`

## Docker Production

```bash
docker-compose up -d
```

## Post-Deployment Checklist

- [ ] Change JWT secrets to strong random values
- [ ] Configure SMTP or SendGrid for emails
- [ ] Set up Gemini API key
- [ ] Configure Google OAuth credentials
- [ ] Run database seed or create admin manually
- [ ] Verify CORS `FRONTEND_URL` matches Vercel domain
- [ ] Test health endpoint and login flow
