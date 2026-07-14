# Troubleshooting

## Database Connection Failed
- Verify PostgreSQL is running: `docker-compose ps`
- Check `DATABASE_URL` format: `postgresql://user:pass@host:5432/dbname`
- Run `npx prisma db push` to sync schema

## Redis Connection Error
- Start Redis: `docker-compose up -d redis`
- Worker requires Redis for BullMQ jobs

## CORS Errors
- Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL
- Vite proxy handles dev CORS automatically

## JWT Token Expired
- Frontend auto-refreshes via `/api/auth/refresh`
- Clear localStorage if stuck: `localStorage.removeItem('healthcare-auth')`

## Emails Not Sending
- In development without SMTP, emails log to console
- Configure `SMTP_USER` and `SMTP_PASS` for Gmail app passwords
- Or switch to SendGrid: `EMAIL_PROVIDER=sendgrid`

## AI Analysis Not Working
- Verify `GEMINI_API_KEY` is set
- Check admin AI logs at `/api/admin/ai-logs`
- System continues without AI if key is missing

## Slot Already Booked (409)
- Another user may hold the slot — wait for hold expiry (10 min)
- Refresh available slots and try again

## Build Errors
```bash
# Backend
cd backend && npx prisma generate && npm run build

# Frontend
cd frontend && npm run build
```
