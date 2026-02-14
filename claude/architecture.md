# Architecture Decisions

## Modules

| Module     | Responsibility                                                                   |
| ---------- | -------------------------------------------------------------------------------- |
| `common`   | Guards, interceptors, filters, decorators, enums, exceptions, DTOs               |
| `config`   | @nestjs/config with Joi validation (app, db, auth, llm namespaces)               |
| `database` | TypeORM async config, migrations                                                 |
| `auth`     | Register, login, JWT strategy, mock OIDC, roles guard                            |
| `users`    | User entity + service (no controller — accessed via auth)                        |
| `drivers`  | Registration, online/offline, location, nearby query (PostGIS)                   |
| `ai`       | LLM provider interface, mock/OpenRouter providers, dispatch + destination agents |
| `fare`     | Fare calculation, surge zone CRUD (admin)                                        |
| `rides`    | Ride lifecycle, state machine, destination change                                |
| `history`  | Rider ride history (paginated), driver earnings summary                          |

## Response Envelope

Every endpoint returns:

```json
{
  "success": true | false,
  "data": T | null,
  "error": { "code": "ERROR_CODE", "message": "...", "details": ... } | null,
  "meta": { "timestamp": "...", "page": 1, "limit": 10, "total": 100 }
}
```

Implemented via `ResponseTransformInterceptor` (success) and `GlobalExceptionFilter` (errors).

## Ride State Machine

```
REQUESTED → MATCHED → DRIVER_ARRIVING → IN_PROGRESS → COMPLETED
    ↓           ↓            ↓                ↓
 CANCELLED   CANCELLED   CANCELLED        CANCELLED
```

Pure transition map — no library:

```typescript
const VALID_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  requested: [matched, cancelled],
  matched: [driver_arriving, cancelled],
  driver_arriving: [in_progress, cancelled],
  in_progress: [completed, cancelled],
  completed: [],
  cancelled: [],
};
```

### Permission Matrix

| Transition                      | Who                                             |
| ------------------------------- | ----------------------------------------------- |
| `requested → matched`           | Rider (via `POST /rides/:id/match`)             |
| `matched → driver_arriving`     | Driver (assigned)                               |
| `driver_arriving → in_progress` | Driver (assigned)                               |
| `in_progress → completed`       | Driver (assigned)                               |
| `* → cancelled`                 | Rider (before IN_PROGRESS) or Driver (any time) |

### Cancel Rules

- **Rider** can cancel in: REQUESTED, MATCHED, DRIVER_ARRIVING
- **Driver** can cancel in: MATCHED, DRIVER_ARRIVING, IN_PROGRESS (partial fare calculated)
- **Nobody** can cancel COMPLETED or already CANCELLED rides
- On cancel: release `activeRideId`, record event in audit trail

### Destination Change

Allowed in: `DRIVER_ARRIVING`, `IN_PROGRESS`

## Concurrency

### Double-Assign Prevention

1. `POST /rides/:id/match` runs inside a DB transaction
2. Candidate drivers fetched with `FOR UPDATE SKIP LOCKED` — non-blocking
3. Driver `activeRideId` (nullable UUID, no FK) set to ride ID on match
4. A driver with non-null `activeRideId` is excluded from dispatch
5. On ride completion/cancellation, `activeRideId` set back to null

### Ownership Checks

Every ride endpoint verifies the caller owns/is assigned to that ride:

- `POST /rides/:id/match`: `ride.riderId === currentUser.id` AND `status === REQUESTED`
- `PATCH /rides/:id/status`: `ride.driverId === currentDriver.id`
- `PATCH /rides/:id/destination`: `ride.riderId === currentUser.id`
- `POST /rides/:id/cancel`: rider (own ride) or driver (assigned ride)
- `GET /rides/:id`: rider or assigned driver

## AI / LLM Strategy

### Provider Pattern

```
LlmProvider (interface)
├── MockLlmProvider     ← DEFAULT (no API key needed, deterministic)
└── OpenRouterProvider  ← activated when OPENROUTER_API_KEY is set
```

Factory in AiModule checks env: if `OPENROUTER_API_KEY` exists → OpenRouter; otherwise → Mock.

OpenRouter config: `openai` npm package with `baseURL: https://openrouter.ai/api/v1`, model `google/gemini-2.0-flash-exp` (free).

### Agents

**DestinationResolverAgent**: natural language → `{ lat, lng, address, confidence }`. Low confidence → throw error.

**DispatchAgent**: ride + candidates → `{ selectedDriverId, reasoning }`. Invalid driver ID → fallback to closest.

Both agents use structured JSON prompts with low temperature (0.1–0.2).

## Geospatial

- **Nearby drivers**: PostGIS `ST_DWithin` with GiST spatial index
- **Surge zone lookup**: PostGIS `ST_DWithin` on zone center
- **Point-to-point distance**: Haversine formula in app code (no DB needed)

## Fare Calculation

```
total = max((baseFare + distanceKm * perKmRate + durationMin * perMinRate) * surgeMultiplier, minimumFare)
```

Constants: baseFare=$2.50, perKmRate=$1.50, perMinRate=$0.25, minimumFare=$5.00

## Database

PostgreSQL 16 + PostGIS 3.4 via Docker.

### Entities

- **User**: id, email, passwordHash, name, role (rider|driver|admin)
- **Driver**: id, userId, vehicleMake/Model/Color, licensePlate, isOnline, currentLocation (PostGIS POINT), currentLat, currentLng, rating, totalTrips, activeRideId (nullable UUID, no FK)
- **Ride**: id, riderId, driverId, status, pickup coords, destination coords/text/address, estimatedFare, finalFare, surgeMultiplier, distanceKm, durationMinutes, dispatchReasoning, timestamps
- **RideEvent**: id, rideId, fromStatus, toStatus, metadata (jsonb), timestamp
- **SurgeZone**: id, name, center (PostGIS POINT), centerLat, centerLng, radiusKm, multiplier, isActive

## Auth

JWT + Passport + bcrypt. Roles guard with `@Roles()` decorator. Mock OIDC documented as integration point.

## Endpoints

### Auth (public)

- `POST /auth/register` — register rider or driver
- `POST /auth/login` — get JWT
- `GET /auth/me` — current user profile

### Drivers (DRIVER role)

- `POST /drivers/register` — register vehicle info
- `PATCH /drivers/me/status` — go online/offline
- `PATCH /drivers/me/location` — update lat/lng
- `GET /drivers/me` — own profile
- `GET /drivers/nearby?lat&lng&radiusKm` — nearby online drivers (any role)

### Rides

- `POST /rides` — create ride in REQUESTED (RIDER)
- `POST /rides/:id/match` — dispatch + assign driver (RIDER)
- `GET /rides/:id` — ride details (owner only)
- `PATCH /rides/:id/status` — advance state (DRIVER)
- `PATCH /rides/:id/destination` — change destination (RIDER)
- `POST /rides/:id/cancel` — cancel ride

### Fare (ADMIN)

- `GET /fare/estimate` — fare estimate (RIDER)
- `GET/POST/PATCH/DELETE /fare/surge-zones` — surge zone CRUD

### History

- `GET /history/rides` — rider's past rides (paginated)
- `GET /history/driver/rides` — driver's completed rides (paginated)
- `GET /history/driver/earnings` — earnings summary
