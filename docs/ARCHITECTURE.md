# System Architecture

## High-Level Architecture

```mermaid
graph TB
    subgraph Client Layer
        PP[Patient Portal]
        DP[Doctor Portal]
        AP[Admin Portal]
    end

    subgraph Frontend - Vercel
        React[React + Vite + TypeScript]
        RQ[React Query]
        ZS[Zustand Store]
    end

    subgraph Backend - Render
        API[Express.js API]
        Auth[JWT Auth Middleware]
        Val[Zod Validation]
        Swagger[Swagger Docs]
    end

    subgraph Services
        AS[Appointment Service]
        SS[Slot Service]
        AIS[AI Service - Gemini]
        ES[Email Service]
        MS[Medication Service]
        CS[Calendar Service]
    end

    subgraph Data Layer
        PG[(PostgreSQL - Neon)]
        Redis[(Redis)]
    end

    subgraph Workers
        BQ[BullMQ Workers]
        SlotCleanup[Slot Cleanup]
        MedRemind[Med Reminders]
        NotifRetry[Notification Retry]
    end

    subgraph External
        Gemini[Google Gemini API]
        GCal[Google Calendar API]
        SMTP[Email - SMTP/SendGrid]
    end

    PP & DP & AP --> React
    React --> RQ --> API
    API --> Auth --> Val
    API --> AS & SS & AIS & ES & MS & CS
    AS & SS --> PG
    AIS --> Gemini
    ES --> SMTP
    CS --> GCal
    MS --> PG
    BQ --> Redis
    BQ --> SlotCleanup & MedRemind & NotifRetry
    SlotCleanup & MedRemind & NotifRetry --> PG
```

## Booking Sequence Diagram

```mermaid
sequenceDiagram
    participant P as Patient
    participant FE as Frontend
    participant API as Backend API
    participant DB as PostgreSQL
    participant AI as Gemini AI
    participant Email as Email Service

    P->>FE: Select doctor & date
    FE->>API: GET /appointments/slots
    API->>DB: Query working hours, leaves, bookings, holds
    DB-->>API: Available slots
    API-->>FE: Slot list

    P->>FE: Click time slot
    FE->>API: POST /appointments/hold
    API->>DB: Serializable transaction
    Note over DB: Check conflicts, create SlotHold
    DB-->>API: Hold created (10min expiry)
    API-->>FE: Hold ID

    P->>FE: Enter symptoms & confirm
    FE->>API: POST /appointments/book
    API->>DB: Serializable transaction
    Note over DB: Verify hold, create Appointment
    DB-->>API: Appointment confirmed
    API-->>Email: Booking confirmation
    API->>AI: Analyze symptoms (async)
    API-->>FE: Success
```

## ER Diagram

```mermaid
erDiagram
    User ||--o| Admin : has
    User ||--o| Doctor : has
    User ||--o| Patient : has
    User ||--o{ RefreshToken : has
    User ||--o{ AuditLog : creates

    Doctor ||--o{ WorkingHours : has
    Doctor ||--o{ DoctorLeave : has
    Doctor ||--o{ Appointment : receives
    Doctor ||--o{ Prescription : writes

    Patient ||--o{ Appointment : books
    Patient ||--o{ Symptom : reports
    Patient ||--o{ Medication : takes

    Appointment ||--o{ Symptom : includes
    Appointment ||--o{ AISummary : generates
    Appointment ||--o{ Prescription : results_in
    Appointment ||--o| PatientFeedback : receives

    Prescription ||--o{ Medication : contains
    Medication ||--o{ MedicationReminder : schedules

    Doctor ||--o{ SlotHold : holds
    Patient ||--o{ SlotHold : reserves

    Appointment {
        uuid id PK
        datetime date
        string startTime
        string endTime
        enum status
    }

    SlotHold {
        uuid id PK
        datetime expiresAt
        enum status
    }

    AISummary {
        uuid id PK
        string type
        json outputData
        enum status
    }
```

## Folder Structure

```
backend/src/
├── config/          # Environment, database, swagger
├── controllers/     # HTTP request handlers
├── middleware/      # Auth, audit logging
├── routes/          # Express route definitions
├── services/        # Business logic layer
│   ├── auth.service.ts
│   ├── appointment.service.ts  # Booking + slots
│   ├── ai.service.ts
│   ├── email.service.ts
│   ├── medication.service.ts
│   ├── calendar.service.ts
│   ├── leave.service.ts
│   └── admin.service.ts
├── validators/      # Zod input schemas
├── workers/         # BullMQ background jobs
└── utils/           # JWT, password, helpers

frontend/src/
├── components/
│   ├── ui/          # shadcn-style components
│   └── layout/      # Dashboard layout, guards
├── pages/
│   ├── admin/       # Admin portal pages
│   ├── doctor/      # Doctor portal pages
│   ├── patient/     # Patient portal pages
│   └── auth/        # Login, register
├── lib/             # API client, utilities
├── stores/          # Zustand auth & theme
└── types/           # TypeScript interfaces
```

## Security Architecture

- **Authentication:** JWT access tokens (15min) + refresh tokens (7d)
- **Authorization:** Role-based middleware (`ADMIN`, `DOCTOR`, `PATIENT`)
- **Transport:** Helmet security headers, CORS whitelist
- **Rate Limiting:** 100 requests per 15 minutes per IP
- **Input Validation:** Zod schemas on all endpoints
- **SQL Injection:** Prisma parameterized queries
- **Password:** bcrypt with 12 salt rounds
- **Audit:** All admin actions logged with IP and user agent
