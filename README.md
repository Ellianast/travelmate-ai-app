# TravelMate AI

A React + Vite + TypeScript travel-planning app with an Express API. It runs in demo mode without API keys.

## Requirements
- Node.js 18 or newer
- npm

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your local environment file:
   ```bash
   cp .env.example .env
   ```
3. (Optional) Add API keys to `.env`. Keep this file private and never commit it.
4. Start frontend and backend together:
   ```bash
   npm run dev
   ```
5. Open http://localhost:5173

The frontend proxies `/api` requests to the Express server on port 3001. Without keys, trip planning and weather return demo data.

## Production build

```bash
npm run build
```

The build outputs the frontend to `dist/`. Run the API with `npm run dev:server` (or `node server/index.js`) and serve the frontend with a static hosting provider configured to route `/api/*` to the backend.

## API endpoints
- `GET /api/health`
- `GET /api/destinations?q=...`
- `POST /api/trip-plan`
- `GET /api/weather?city=Paris&days=5`

## Notes
- Saved trips and preferences are stored in the browser's localStorage.
- Weather and AI data are only live when valid server-side API keys are configured.
- Affiliate destinations currently use example partner links; replace them with your approved affiliate URLs before launch.
