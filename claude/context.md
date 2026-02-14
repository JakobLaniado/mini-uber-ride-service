# Project Context

## Mission

Build a senior-level backend for a simplified ride-hailing service as an interview coding exercise. The system must demonstrate clean architecture, proper separation of concerns, consistent API design, solid testing, and professional Git practices.

## Requirements

### Driver Management

- Drivers register with name, vehicle info, and license plate
- Drivers can go online/offline
- Drivers update their current location (latitude, longitude)
- Query nearby online drivers within a given radius

### Ride Lifecycle

- Rider requests a ride with pickup coordinates and a natural language destination (e.g., "the airport")
- An LLM agent resolves the destination into coordinates and a human-readable address
- The system finds available drivers nearby; the LLM agent selects the best match considering distance, rating, and vehicle type
- Ride states: `requested → matched → driver_arriving → in_progress → completed → cancelled`
- Only valid state transitions are allowed
- Rider can change destination mid-ride via natural language — the agent updates destination and recalculates fare

### Fare Calculation

- Base fare + per-km rate + per-minute rate
- Surge pricing: multiplier per zone, updatable by admin
- Final fare calculated on ride completion

### Ride History

- Rider's past rides with pagination
- Driver's completed rides with earnings summary

### Bonus

- Auth with mocked OAuth2/OIDC provider, role-based permissions (rider vs driver vs admin)
- Tests: API/integration for main flows + unit tests with mocks for fare and AI dispatch

## Scope & Constraints

- Backend only (NestJS + TypeORM + PostgreSQL/PostGIS)
- LLM provider: OpenRouter with Gemini Flash (free tier), with MockLlmProvider as default fallback
- No real OIDC provider — mock it, document the integration point
- No frontend in this phase
- No WebSocket/real-time — REST only
- Docker for PostgreSQL, local Node.js for the app

## Tech Stack

- NestJS 11
- TypeORM with PostgreSQL 16 + PostGIS 3.4
- JWT auth (Passport) + bcrypt
- class-validator + class-transformer
- openai npm package (pointed at OpenRouter)
- Jest + supertest
