# Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable **Google Calendar API**
4. Go to **Credentials** → Create **OAuth 2.0 Client ID**
5. Application type: Web application
6. Authorized redirect URIs:
   - `http://localhost:5000/api/calendar/oauth/callback` (dev)
   - `https://your-api.onrender.com/api/calendar/oauth/callback` (prod)
7. Copy Client ID and Client Secret to `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/oauth/callback
   ```

## Usage Flow

1. Patient clicks "Sync to Google Calendar" on appointment
2. Frontend calls `GET /api/calendar/auth` → redirects to Google OAuth
3. After consent, callback stores tokens in `GoogleOAuthToken` table
4. `POST /api/calendar/sync/:appointmentId` creates calendar event with patient as attendee
