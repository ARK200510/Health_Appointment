# API Reference

Base URL: `http://localhost:5000/api`

Swagger UI: `http://localhost:5000/api/docs`

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register patient |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Current user profile |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password |

## Appointments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/appointments/slots?doctorId&date` | Any | Get available slots |
| POST | `/appointments/hold` | Patient | Hold a slot (10 min) |
| POST | `/appointments/book` | Patient | Book from hold |
| GET | `/appointments` | Any | List appointments |
| GET | `/appointments/today` | Doctor | Today's schedule |
| GET | `/appointments/:id` | Any | Appointment details |
| POST | `/appointments/:id/cancel` | Any | Cancel appointment |
| POST | `/appointments/:id/reschedule` | Patient | Reschedule |
| POST | `/appointments/:id/complete` | Doctor | Complete with notes |

## Doctors

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/doctors/search?search&specialization` | Search doctors |
| GET | `/doctors/:id` | Doctor profile |
| GET | `/doctors/me/patients` | Doctor's patients |
| PUT | `/doctors/me/profile` | Update profile |

## Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Analytics dashboard |
| GET/POST | `/admin/doctors` | Manage doctors |
| GET | `/admin/patients` | List patients |
| POST | `/admin/leaves` | Create doctor leave |
| GET | `/admin/audit-logs` | Audit logs |
| GET | `/admin/ai-logs` | AI operation logs |
| GET | `/admin/notifications/failed` | Failed emails |
| POST | `/admin/notifications/:id/retry` | Retry notification |

## AI & Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | AI symptom analysis |
| POST | `/post-visit` | AI post-visit summary |
| GET | `/summaries/:appointmentId` | Get AI summaries |
| POST | `/prescriptions` | Create prescription |
| GET | `/medications` | Patient medications |
| GET | `/calendar/auth` | Google OAuth URL |
| POST | `/calendar/sync/:appointmentId` | Sync to calendar |

All list endpoints support `?page=1&limit=10&search=&sortBy=&sortOrder=asc|desc`.
