# Port Architecture Diagram

## System Overview - Corrected Configuration

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AI OpenSOC System                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   Browser / Client   │
│                      │
└──────────────────────┘
         │
         │ HTTP
         │
    ┌────▼─────┐
    │  :6988   │  Frontend (Vite/React)
    │          │  ✅ NOW: Proxies /api → :8000
    └────┬─────┘  ❌ WAS: Proxied /api → :6987 (WRONG!)
         │
         │ /api/* requests
         │
    ┌────▼─────┐
    │  :8000   │  Backend API (FastAPI/Python)
    │          │  ✅ NOW: Runs on :8000 everywhere
    └────┬─────┘  ❌ WAS: main.py had :6987 (MISMATCH!)
         │
         │ Database queries
         │
    ┌────▼─────┐
    │  :5432   │  PostgreSQL (Docker)
    │          │  ✅ Standard port, no issues
    └──────────┘

```

## Port Connections - Before Fix (BROKEN)

```
Frontend :6988
     │
     │ API Proxy tries → :6987
     │
     ├──────────────────┐
     │                  │
     ✗ Nothing here!    │
                        │
                Backend :8000 (actually running here!)
                   ↑
                   │
             ❌ MISMATCH!
             Frontend can't reach backend
```

## Port Connections - After Fix (WORKING)

```
Frontend :6988
     │
     │ API Proxy → :8000 ✅
     │
     └─────────────────┐
                       │
                Backend :8000
                       │
                       └──→ PostgreSQL :5432 ✅
```

## Complete Service Map

### User-Facing Services
```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  Frontend UI                                                  │
│  http://localhost:6988                                        │
│  Status: ✅ Running                                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  React SPA                                           │    │
│  │  - Dashboard, Findings, Cases                        │    │
│  │  - Real-time updates                                 │    │
│  │  - Claude AI integration                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
│                          │ Proxies /api/                     │
│                          ▼                                    │
│  Backend API                                                  │
│  http://localhost:8000                                        │
│  Status: ✅ Running                                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  FastAPI                                             │    │
│  │  - /api/findings                                     │    │
│  │  - /api/cases                                        │    │
│  │  - /api/claude                                       │    │
│  │  - /docs (Swagger UI)                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                    │
│                          │ SQL queries                        │
│                          ▼                                    │
│  PostgreSQL Database                                          │
│  localhost:5432                                               │
│  Status: ✅ Running (Docker)                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Background Services
```
┌─────────────────────────────────────────────────────────────┐
│  SOC Daemon (Autonomous Operations)                          │
│  Status: ⚠️  Needs dependency fix (aiohttp)                 │
│                                                               │
│  Webhook Endpoint:  http://localhost:8081                    │
│  Metrics Endpoint:  http://localhost:9090                    │
│                                                               │
│  Functions:                                                   │
│  - Poll SIEM sources                                          │
│  - Auto-triage findings                                       │
│  - Autonomous response                                        │
│  - Threat hunting                                             │
└─────────────────────────────────────────────────────────────┘
```

### Admin/Development Services
```
┌─────────────────────────────────────────────────────────────┐
│  PgAdmin                                                      │
│  http://localhost:5050                                        │
│  Database administration UI                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Splunk Enterprise (Optional)                                 │
│  http://localhost:6990                                        │
│  Status: Running but restarting                              │
│                                                               │
│  Other Splunk ports:                                          │
│  - :8088  HEC (HTTP Event Collector)                         │
│  - :8089  Management API                                      │
│  - :9997  Forwarder                                           │
└─────────────────────────────────────────────────────────────┘
```

## Request Flow Example

### 1. User visits dashboard

```
User Browser
    ↓
http://localhost:6988/
    ↓
Vite Dev Server (Frontend)
    ↓ renders React app
Browser (loaded with JavaScript)
```

### 2. App fetches findings

```
React App (in browser)
    ↓
fetch('http://localhost:6988/api/findings')
    ↓
Vite Proxy (reads vite.config.ts)
    ↓ sees /api → proxy to http://127.0.0.1:8000
    ↓
http://127.0.0.1:8000/api/findings
    ↓
FastAPI Backend
    ↓ queries database
PostgreSQL :5432
    ↓ returns data
FastAPI → Vite Proxy → React App → User
```

### 3. What was broken before (OLD):

```
React App
    ↓
fetch('http://localhost:6988/api/findings')
    ↓
Vite Proxy
    ↓ proxy to http://127.0.0.1:6987  ❌ WRONG PORT!
    ↓
❌ Connection Refused! Nothing listening on :6987
    ↓
Error displayed to user
```

## Port Allocation Summary

| Port Range | Service Type | Details |
|------------|--------------|---------|
| 5000-5999  | Infrastructure | PostgreSQL (5432), PgAdmin (5050) |
| 6000-6999  | Application | Frontend (6988), Splunk UI (6990) |
| 8000-8999  | Backend APIs | Backend (8000), Daemon Webhook (8081), Splunk HEC/Mgmt (8088-8089) |
| 9000-9999  | Monitoring | Daemon Metrics (9090), Splunk Forwarder (9997) |

## Configuration Files Reference

### Port Definitions

```
frontend/vite.config.ts
├─ server.port: 6988             ← Frontend listens here
└─ server.proxy['/api'].target   ← NOW: http://127.0.0.1:8000 ✅
                                    WAS: http://127.0.0.1:6987 ❌

backend/main.py
├─ CORS: allow_origins           ← Must include frontend URL
└─ uvicorn.run(..., port=8000)   ← NOW: 8000 ✅ WAS: 6987 ❌

start_daemon.sh / start_web.sh
└─ uvicorn ... --port 8000       ← Always was 8000 ✅

docker/docker-compose.yml
├─ postgres.ports: "5432:5432"
├─ backend.ports: "8000:8000"
├─ soc-daemon.ports:
│  ├─ "8081:8081"  (webhook)
│  └─ "9090:9090"  (metrics)
└─ splunk.ports: "6990:8000"     ← Maps internal :8000 to host :6990
```

## Quick Health Check Commands

```bash
# Check all ports are listening
lsof -i :5432  # PostgreSQL
lsof -i :6988  # Frontend
lsof -i :8000  # Backend

# Test connectivity
curl http://localhost:8000/api/health    # Backend health
curl http://localhost:8000/docs          # API documentation (HTML)
curl http://localhost:9090/metrics       # Daemon metrics (if running)

# View in browser
open http://localhost:6988               # Frontend UI
open http://localhost:8000/docs          # API docs
open http://localhost:5050               # PgAdmin
open http://localhost:6990               # Splunk (if running)
```

---

**Last Updated**: 2026-01-20  
**All Ports Verified**: ✅  
**Status**: Ready for operation after service restart

