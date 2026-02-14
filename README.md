# Mini Uber — Ride Service with AI Dispatch

A production-quality ride-hailing backend built with NestJS, featuring AI-powered destination resolution and intelligent driver dispatch using LLMs.

## Tech Stack

- **NestJS 11** — modular backend framework
- **TypeORM** + **PostgreSQL 16** + **PostGIS 3.4** — geospatial queries (nearby drivers, surge zones)
- **Redis 7** — versioned caching for nearby drivers, surge zones, fare estimates, destination resolution
- **JWT** + **Passport** — authentication with role-based access control (rider / driver / admin)
- **OpenRouter / Gemini Flash** — LLM-powered destination resolution and dispatch (optional; deterministic mock provider works offline)
- **Jest** + **Supertest** — unit and e2e tests (49 unit + 17 e2e)
- **CLI Client** — Commander-based interactive client with full lifecycle demo

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose

### 1. Start the infrastructure

```bash
cd backend
docker compose up -d
```

This starts PostgreSQL with PostGIS on port **5433** and Redis on port **6379**.

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

### 3. Install dependencies & run migrations

```bash
npm install
npm run migration:run
```

### 4. Start the server

```bash
npm run start:dev
```

The API is available at `http://localhost:3000`.

### 5. Run tests

```bash
npm test          # Unit tests (49 tests)
npm run test:e2e  # E2E tests (17 tests, requires running DB)
```

### 6. Run the CLI demo

```bash
cd ../cli
npm install
npx ts-node src/index.ts demo
```

This runs a full lifecycle: register rider + driver → create ride → AI dispatch → complete.

## AI / LLM Provider

The app uses a **provider pattern** for LLM integration:

- **MockLlmProvider** (default) — deterministic responses, works offline. Returns realistic NYC coordinates for known destinations and always picks the closest driver.
- **OpenRouterProvider** (optional) — real LLM calls via OpenRouter using Google Gemini Flash (free tier). Activated by setting `OPENROUTER_API_KEY` in `.env`.

No code changes needed to switch — the factory auto-detects based on environment.

## API Overview

All responses are wrapped in a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "timestamp": "2024-..." }
}
```

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Register (rider/driver) |
| POST | `/auth/login` | Public | Get JWT token |
| GET | `/auth/me` | JWT | Current user profile |

### Drivers

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/drivers/register` | Driver | Register vehicle info |
| PATCH | `/drivers/me/status` | Driver | Go online/offline |
| PATCH | `/drivers/me/location` | Driver | Update GPS coordinates |
| GET | `/drivers/me` | Driver | Own profile |
| GET | `/drivers/nearby` | Any | Nearby online drivers |

### Rides

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/rides` | Rider | Create ride (LLM resolves destination) |
| POST | `/rides/:id/match` | Rider | AI dispatch + assign driver |
| GET | `/rides/:id` | Owner | Ride details |
| PATCH | `/rides/:id/status` | Driver | Advance state machine |
| PATCH | `/rides/:id/destination` | Rider | Change destination mid-ride |
| POST | `/rides/:id/cancel` | Owner | Cancel with partial fare |

### Fare (Admin)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/fare/estimate` | Rider | Fare estimate |
| GET | `/fare/surge-zones` | Admin | List surge zones |
| POST | `/fare/surge-zones` | Admin | Create surge zone |
| PATCH | `/fare/surge-zones/:id` | Admin | Update multiplier |
| DELETE | `/fare/surge-zones/:id` | Admin | Delete zone |

### History

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/history/rides` | Rider | Past rides (paginated) |
| GET | `/history/driver/rides` | Driver | Completed rides |
| GET | `/history/driver/earnings` | Driver | Earnings summary |

## API Usage Example

```bash
# Register a rider
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"rider@test.com","password":"Pass123!","name":"Alice","role":"rider"}'

# Save the token
TOKEN="<accessToken from response>"

# Register a driver
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@test.com","password":"Pass123!","name":"Bob","role":"driver"}'

DRIVER_TOKEN="<accessToken from response>"

# Register driver profile + go online + set location
curl -X POST http://localhost:3000/drivers/register \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vehicleMake":"Toyota","vehicleModel":"Camry","vehicleColor":"White","licensePlate":"ABC-1234"}'

curl -X PATCH http://localhost:3000/drivers/me/status \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isOnline":true}'

curl -X PATCH http://localhost:3000/drivers/me/location \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat":40.76,"lng":-73.98}'

# Create a ride (destination resolved by LLM)
curl -X POST http://localhost:3000/rides \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pickupLat":40.758,"pickupLng":-73.9855,"destinationText":"JFK Airport"}'

RIDE_ID="<id from response>"

# Match with a driver (AI dispatch)
curl -X POST http://localhost:3000/rides/$RIDE_ID/match \
  -H "Authorization: Bearer $TOKEN"

# Driver advances: arriving → pickup → start → complete
curl -X PATCH http://localhost:3000/rides/$RIDE_ID/status \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"driver_arriving"}'

curl -X PATCH http://localhost:3000/rides/$RIDE_ID/status \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}'

curl -X PATCH http://localhost:3000/rides/$RIDE_ID/status \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

## Ride State Machine

```
REQUESTED → MATCHED → DRIVER_ARRIVING → IN_PROGRESS → COMPLETED
    ↓           ↓            ↓                ↓
 CANCELLED   CANCELLED   CANCELLED        CANCELLED
```

- **Rider** can cancel before `IN_PROGRESS`
- **Driver** can cancel anytime (partial fare calculated for in-progress cancellations)
- Destination changes allowed during `DRIVER_ARRIVING` and `IN_PROGRESS`

## Concurrency

Driver assignment uses `SELECT ... FOR UPDATE SKIP LOCKED` to prevent double-assignment. Concurrent match requests skip already-locked drivers instead of blocking — no deadlocks.

## Architecture

See [claude/architecture.md](claude/architecture.md) for detailed decisions on modules, state machine, concurrency, AI fallback, geospatial strategy, and fare calculation.

## Caching Strategy

Uses **versioned cache keys** for O(1) invalidation (no pattern scanning):

| Data | Key Pattern | TTL | Invalidation |
|------|-------------|-----|-------------|
| Nearby drivers | `nearby:v{ver}:{lat3}:{lng3}:{r}` | 15s | `INCR nearby:ver` on driver status/location persist |
| Surge multiplier | `surge:v{ver}:{lat3}:{lng3}` | 5min | `INCR surge:ver` on zone CRUD |
| Fare estimate | `fare:v{ver}:{coords}` | 10min | `INCR fare:ver` on zone CRUD |
| Destination | `dest:{text}:{lat1}:{lng1}` | 24h | Never (stable) |

CacheService degrades gracefully — if Redis is down, the app works but slower. Rate-limited `logger.warn` on failures.

### Location Write Throttling

Driver GPS updates only persist to PostgreSQL when:
- **>2 seconds** since last write, OR
- **>50 meters** moved (haversine distance)

Cache invalidation only fires on actual PG persists, preserving cache benefit for rapid-fire updates.

## CLI Client

Interactive CLI in `cli/` for testing and demo:

```bash
miniuber auth register          # Register (interactive prompts)
miniuber auth login -e x -p y   # Login with flags
miniuber driver online           # Go online
miniuber ride create --pickup-lat 40.758 --pickup-lng -73.9855 --dest "JFK Airport"
miniuber ride match <id>         # AI dispatch
miniuber demo                    # Full automated lifecycle
```

Supports `MINIUBER_BASE_URL` env var and `--base-url` flag.

## Production Polish (Not Implemented — Shows Awareness)

- **Rate limiting**: `@nestjs/throttler` on `/auth/login`, `/rides/:id/match`, `/drivers/me/location`
- **WebSocket**: real-time ride status updates for rider and driver
- **Monitoring**: health checks, Prometheus metrics, structured logging
