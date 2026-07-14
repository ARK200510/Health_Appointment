# System Design Document

## Healthcare Appointment & Follow-up Manager

### 1. Double-Booking Prevention

Double-booking is prevented through a multi-layered defense strategy combining database constraints, transactional logic, and temporary slot holds.

**Database Layer:** The `Appointment` model enforces a unique composite constraint on `(doctorId, date, startTime)`. This guarantees that at the database level, no two confirmed appointments can occupy the same doctor-time slot, regardless of application logic failures or race conditions.

**Application Layer:** All booking operations execute within Prisma transactions using `Serializable` isolation level. When a patient attempts to book, the system first queries for existing appointments with status `PENDING`, `CONFIRMED`, or `RESCHEDULED` at the target slot. If a match exists, the transaction aborts with a 409 Conflict response.

**Slot Hold Integration:** Before final booking, patients must acquire an active slot hold. The hold mechanism ensures that concurrent users selecting the same slot cannot both proceed to booking—the second user's hold request fails if an active, non-expired hold exists from another patient.

### 2. Slot Hold Mechanism

The slot hold system provides a configurable temporary reservation window (default: 10 minutes via `SLOT_HOLD_DURATION_MINUTES`).

**Flow:**
1. Patient selects a date and views available slots (excluding booked appointments and active holds).
2. Patient clicks a slot → `POST /api/appointments/hold` creates a `SlotHold` record with `status: ACTIVE` and `expiresAt = now + duration`.
3. Patient completes booking form within the hold window.
4. On successful booking, hold status changes to `CONVERTED` and appointment is created atomically.
5. If hold expires, a background worker (BullMQ, every 60 seconds) sets status to `EXPIRED`, releasing the slot.

**Race Condition Handling:** Hold creation runs in a Serializable transaction that: (a) releases expired holds, (b) checks for existing appointments, (c) checks for active holds from other patients, (d) creates or extends the hold. The same patient refreshing their hold extends `expiresAt` without creating duplicates.

**Configurable Duration:** Stored in environment variable and `SystemConfig` table, allowing admin override without code deployment.

### 3. Doctor Leave Conflict Handling

When admin marks doctor leave (Full Day, Half Day, or Emergency), the `LeaveService` performs impact analysis:

1. **Overlap Detection:** Queries all `CONFIRMED` and `PENDING` appointments where `doctorId` matches and `date` falls within leave period. Half-day leaves additionally check time overlap with `startTime`/`endTime`.

2. **Patient Notification:** For each affected appointment, an email is sent via `doctorLeaveNotice` template informing the patient of unavailability and prompting rescheduling through the patient portal.

3. **Slot Generation:** The `SlotService.getAvailableSlots()` method checks approved leaves before generating slots. Full-day and emergency leaves block all slots; half-day leaves block only overlapping time ranges.

4. **Calendar Sync:** If Google Calendar events exist for affected appointments, the calendar service can update or delete events (integration point for automatic calendar management).

5. **Rescheduling Path:** Patients receive email with portal link. Rescheduling uses the same hold-then-book flow, incrementing `rescheduleCount` on the new appointment while marking the original as `RESCHEDULED`.

### 4. Notification Retry Strategy

The notification system uses a persistent queue pattern with database-backed retry tracking.

**Initial Send:** Every email creates a `Notification` record with `status: PENDING`. On success → `SENT` with `sentAt`. On failure → `FAILED` with `errorMessage` and `retryCount: 1`.

**Retry Configuration:** Each notification has `maxRetries: 3` (configurable). The BullMQ worker runs hourly (`retry-notifications` job), querying notifications where `status: FAILED` AND `retryCount < maxRetries`.

**Retry Execution:** Status transitions to `RETRYING` during attempt. Success updates to `SENT`. Failure increments `retryCount` and remains `FAILED`.

**Admin Interface:** Admins can view failed notifications at `/api/admin/notifications/failed` and manually trigger retry via `POST /api/admin/notifications/:id/retry`.

**Provider Failover:** Supports Nodemailer (SMTP) and SendGrid via `EMAIL_PROVIDER` environment variable. Development mode logs emails to console when SMTP is unconfigured.

**Medication Reminders:** Follow the same pattern in `MedicationReminder` table with `PENDING → SENT/FAILED` states and retry count tracking.

### 5. LLM Failure Handling

AI features (pre-visit symptom analysis and post-visit summaries) use Google Gemini with graceful degradation.

**Retry Logic:** Configurable `GEMINI_MAX_RETRIES` (default: 3) with exponential backoff (1s, 2s, 3s delays). Each attempt is logged in `AISummary.retryCount`.

**Structured Prompts:** Pre-visit and post-visit prompts require JSON-only responses. A regex extractor parses JSON from Gemini output, handling occasional markdown wrapping.

**Fallback Strategy:** After all retries fail:
- `AISummary` is created with `status: MANUAL_FALLBACK`
- Original input (symptoms or clinical notes) is preserved in `inputData`
- For pre-visit: output includes `urgencyLevel: medium` and truncated chief complaint
- For post-visit: `simpleExplanation` provides user-friendly message; `outputData.originalNotes` preserves doctor's notes
- Application never crashes—controllers return fallback summary with appropriate messaging

**Observability:** All AI operations logged in `AISummary` table with `status` (SUCCESS, FAILED, RETRY, MANUAL_FALLBACK), enabling admin review via `/api/admin/ai-logs`.

**Configuration Guard:** If `GEMINI_API_KEY` is unset, service returns 503 for explicit requests but booking flow continues without AI analysis (fire-and-forget pattern with `.catch(console.error)`).

---

*This design ensures production reliability for a real clinic deployment with concurrent users, external service failures, and complex scheduling edge cases.*
