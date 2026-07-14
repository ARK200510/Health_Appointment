# Gemini AI Setup

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create an API key
3. Add to `backend/.env`:
   ```
   GEMINI_API_KEY=your-api-key
   GEMINI_MODEL=gemini-1.5-flash
   GEMINI_MAX_RETRIES=3
   ```

## Features Powered by Gemini

- **Pre-Visit Analysis:** Urgency level, chief complaint, risk factors, doctor questions, red flags
- **Post-Visit Summary:** Patient-friendly explanation, medication schedule, lifestyle advice

## Failure Handling

If Gemini is unavailable, the system stores original data and returns graceful fallback messages. See [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) for details.
