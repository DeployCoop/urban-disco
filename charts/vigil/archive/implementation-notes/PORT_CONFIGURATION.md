# Port Configuration - AI OpenSOC

This document outlines all ports used by the AI OpenSOC system to prevent conflicts and ensure proper connectivity.

## Standard Configuration (Native/Development)

### Core Services
| Service | Port | Description | Config Location |
|---------|------|-------------|-----------------|
| Backend API | **8000** | FastAPI backend server | `backend/main.py`, `start_daemon.sh`, `start_web.sh` |
| Frontend UI | **6988** | Vite/React dev server | `frontend/vite.config.ts` |
| SOC Daemon Webhook | **8081** | Webhook ingestion endpoint | `daemon/config.py`, `docker-compose.yml` |
| SOC Daemon Metrics | **9090** | Prometheus-style metrics | `daemon/config.py`, `docker-compose.yml` |

### Database Services
| Service | Port | Description | Config Location |
|---------|------|-------------|-----------------|
| PostgreSQL | **5432** | Main database | `docker-compose.yml` |
| PgAdmin | **5050** | Database admin UI | `docker-compose.yml` |

### SIEM/Security Services
| Service | Port | Description | Config Location |
|---------|------|-------------|-----------------|
| Splunk UI | **6990** | Web interface | `docker-compose.yml` (was 8000, changed to avoid conflict) |
| Splunk HEC | **8088** | HTTP Event Collector | `docker-compose.yml` |
| Splunk Management | **8089** | Management API | `docker-compose.yml` |
| Splunk Forwarder | **9997** | Log forwarding | `docker-compose.yml` |

## Port Conflict Resolution

### Recent Fixes Applied (2026-01-20)

1. **Backend Port Mismatch** ✅ FIXED
   - **Issue**: `backend/main.py` had port `6987`, but all start scripts used `8000`
   - **Fix**: Updated `backend/main.py` to use port `8000`

2. **Frontend Proxy Mismatch** ✅ FIXED
   - **Issue**: `vite.config.ts` proxy pointed to backend on `6987`
   - **Fix**: Updated proxy target to `http://127.0.0.1:8000`
   - **Result**: Frontend can now properly connect to backend API

3. **Splunk Port Conflict** ✅ FIXED
   - **Issue**: Splunk originally used port `8000` (conflicts with backend)
   - **Fix**: Changed Splunk UI to port `6990` in docker-compose.yml

## Docker vs Native Mode

### Docker Mode (via docker-compose)
- All services run in containers with port mappings
- Backend: `8000:8000`
- Frontend: Would need to be added to docker-compose if containerized
- Database: `5432:5432`

### Native Mode (current setup)
- Backend and Frontend run directly via Python/Node
- Database runs in Docker
- Allows for hot-reload during development

## Common Issues and Troubleshooting

### "Address already in use" Error

Check what's using a port:
```bash
lsof -i :PORT_NUMBER
```

Kill a process on a specific port:
```bash
kill -9 $(lsof -t -i:PORT_NUMBER)
```

### Frontend Can't Connect to Backend

**Symptom**: `Error: connect ECONNREFUSED 127.0.0.1:PORT`

**Solutions**:
1. Verify backend is running: `lsof -i :8000`
2. Check frontend proxy in `vite.config.ts` points to correct backend port
3. Ensure CORS is configured in `backend/main.py`

### Port Already in Use on Startup

**Solution**: Run shutdown script first:
```bash
./shutdown_all.sh
```

Then restart:
```bash
./start_daemon.sh
```

## Environment Variables

No environment variables control ports by default. All ports are hardcoded in:
- `backend/main.py` - Backend port (8000)
- `frontend/vite.config.ts` - Frontend port (6988) and proxy
- `docker/docker-compose.yml` - Docker service ports
- `daemon/config.py` - Daemon service ports

## Health Check Endpoints

After starting services, verify they're running:

```bash
# Backend API
curl http://localhost:8000/api/health

# Frontend (in browser)
http://localhost:6988

# Backend API Docs
http://localhost:8000/docs

# Daemon Metrics
curl http://localhost:9090/metrics

# Splunk UI (if running)
http://localhost:6990
```

## Quick Reference URLs

### Development
- Frontend: http://localhost:6988
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- API Health: http://localhost:8000/api/health

### Administration
- PgAdmin: http://localhost:5050
- Splunk UI: http://localhost:6990
- Daemon Metrics: http://localhost:9090

## Port Change History

| Date | Port | Old Value | New Value | Reason |
|------|------|-----------|-----------|--------|
| 2026-01-20 | Backend | 6987 | 8000 | Align with start scripts |
| 2026-01-20 | Frontend Proxy | 6987 | 8000 | Fix backend connection |
| 2026-01-20 | Splunk UI | 8000 | 6990 | Avoid backend conflict |

---

**Last Updated**: 2026-01-20  
**Configuration Version**: v2.0  
**Status**: ✅ All ports aligned and tested

