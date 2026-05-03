# F1 Analytics Platform — Backend

Production-ready real-time Formula 1 analytics backend with AI predictions.

## Stack

| Layer | Technology |
|-------|-----------|
| API | FastAPI (async) + Python 3.11 |
| Database | PostgreSQL 15 + SQLAlchemy 2 (asyncpg) |
| Cache / Pub-Sub | Redis 7 |
| Real-time | WebSockets (Starlette) |
| HTTP Client | httpx (async) |
| Containerisation | Docker + docker-compose |

---

## Quick Start

### 1. Prerequisites

- Docker ≥ 24
- Docker Compose ≥ 2.20

### 2. Clone and configure

```bash
git clone <repo>
cd backend

# The .env file is already populated with defaults for local Docker.
# Edit values (passwords, log level, etc.) before production use.
cp .env.example .env
```

### 3. Build and start

```bash
docker compose up --build
```

This starts four containers:

| Container | Port | Role |
|-----------|------|------|
| `f1_postgres` | 5432 | PostgreSQL database |
| `f1_redis` | 6379 | Redis cache + pub/sub |
| `f1_app` | 8000 | FastAPI application server |
| `f1_worker` | — | Ingestion + AI worker |

### 4. Verify

```bash
curl http://localhost:8000/health
```

---

## API Reference

Base URL: `http://localhost:8000`

### REST

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| GET | `/api/v1/drivers` | All drivers (optional `?session_key=`) |
| GET | `/api/v1/drivers/{number}` | Single driver |
| GET | `/api/v1/leaderboard` | Live race leaderboard (from Redis) |
| GET | `/api/v1/events` | Recent events (`?event_type=pit_stop\|overtake\|safety_car`) |
| GET | `/api/v1/predictions` | AI predictions (`?prediction_type=pit_stop\|overtake`) |

### WebSocket

```
ws://localhost:8000/ws/live
```

Receives a JSON push every ~1.5 s:

```jsonc
{
  "type": "live_update",
  "timestamp": "2024-05-04T12:34:56.789Z",
  "leaderboard": { ... },
  "events": [ ... ]
}
```

On initial connect, a `"type": "snapshot"` message delivers the current leaderboard state.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  OpenF1 API (https://api.openf1.org/v1)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP poll every 1.5 s
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Worker (worker/main.py)                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ OpenF1Client │→ │  Normalizer  │→ │  Event Engine      │   │
│  └──────────────┘  └──────────────┘  │  (pit / overtake / │   │
│                                       │   flags)           │   │
│                                       └────────┬───────────┘   │
│  ┌──────────────────────────────────┐          │               │
│  │  AI Predictions                  │          │               │
│  │  pit_stop_predictor              │          │               │
│  │  overtake_predictor              │          │               │
│  └──────────────────────────────────┘          │               │
└─────────────────────────────────┬──────────────┼───────────────┘
                                  │              │
                         PostgreSQL           Redis
                         (historical)    ┌────┴──────────────┐
                                         │ Live State (keys) │
                                         │ Pub/Sub channel   │
                                         └────────┬──────────┘
                                                  │ subscribe
                                                  ▼
                                     ┌────────────────────────┐
                                     │  FastAPI App           │
                                     │  REST endpoints        │
                                     │  WebSocket /ws/live    │
                                     └────────────────────────┘
```

### Redis key schema

| Key | Type | TTL | Content |
|-----|------|-----|---------|
| `f1:leaderboard` | String (JSON) | 30 s | Full leaderboard |
| `f1:drivers` | String (JSON) | 1 h | Driver list |
| `f1:recent_events` | List (JSON) | 5 min | Last 50 events |
| `f1:predictions` | String (JSON) | 10 s | Latest predictions |
| `f1:current_session` | String | — | Active session key |
| **`f1:live_updates`** | Pub/Sub | — | Broadcast channel |

---

## Project Layout

```
backend/
├── app/
│   ├── main.py               # FastAPI app + lifespan + WebSocket endpoint
│   ├── api/routes/           # REST route handlers
│   │   ├── drivers.py
│   │   ├── leaderboard.py
│   │   ├── events.py
│   │   ├── predictions.py
│   │   └── health.py
│   ├── core/                 # Config, DB, Redis, logging
│   ├── models/               # SQLAlchemy ORM models
│   ├── schemas/              # Pydantic request/response schemas
│   ├── services/             # Business logic layer
│   ├── ai/                   # Prediction modules
│   │   ├── pit_stop_predictor.py
│   │   ├── overtake_predictor.py
│   │   └── race_summary.py
│   ├── ingestion/            # OpenF1 client + data normaliser
│   └── websocket/            # Connection manager + pub/sub bridge
├── worker/
│   ├── main.py               # Worker entry point + event loop
│   └── tasks.py              # Ingestion, event detection, AI pipeline
├── Dockerfile                # App image
├── Dockerfile.worker         # Worker image
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## AI Prediction Modules

### Pit Stop Predictor (`app/ai/pit_stop_predictor.py`)

Heuristic model. Inputs: `tire_compound`, `tire_age`, `lap_time_delta`,
`stint_length`, `total_laps`, `current_lap`. Output: probability (0–1) that
the driver will pit within the next 3 laps.

**Swap for ML**: Replace the `predict()` function body with any model.
The signature is unchanged.

### Overtake Predictor (`app/ai/overtake_predictor.py`)

Inputs: `gap_to_ahead`, `pace_delta`, `drs_available`, `tire_advantage`.
Output: probability of an overtake within 3 laps.

### Race Summary Generator (`app/ai/race_summary.py`)

Aggregates events into a timeline and generates a narrative string.
`_generate_narrative()` is a stub — replace with an LLM call
(Anthropic Claude, OpenAI, etc.) without changing the public API.

---

## Development (without Docker)

```bash
# Dependencies
pip install -r requirements.txt

# Local services
docker compose up postgres redis -d

# App (override DB/Redis URLs for localhost)
export DATABASE_URL=postgresql+asyncpg://f1user:f1password@localhost:5432/f1_analytics
export REDIS_URL=redis://localhost:6379
uvicorn app.main:app --reload

# Worker (separate terminal)
python -m worker.main
```

---

## Extending

- **ML models**: drop a trained sklearn/torch/onnx model into `app/ai/` and
  call it from `predict()`.
- **Additional data sources**: add a new client in `app/ingestion/` and call
  it from `worker/tasks.py`.
- **Authentication**: add an OAuth2 / API-key middleware in `app/main.py`.
- **Alembic migrations**: `alembic init alembic` then generate revisions with
  `alembic revision --autogenerate`.
