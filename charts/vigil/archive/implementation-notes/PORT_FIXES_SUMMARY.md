# Port Configuration Fixes - Summary

**Date**: 2026-01-20  
**Status**: ✅ FIXED

## Issues Found and Resolved

### 1. Backend API Port Mismatch ✅ FIXED

**Problem:**
- `backend/main.py` was hardcoded to port **6987**
- `start_daemon.sh` and `start_web.sh` both start backend on port **8000**
- Docker compose expected backend on port **8000**

**Impact:**
- If backend was run directly via `python backend/main.py`, it would start on wrong port
- Confusion about which port is "official"

**Fix Applied:**
```python
# backend/main.py line 380
# Changed from: port=6987
# Changed to:   port=8000
```

### 2. Frontend Proxy Configuration ✅ FIXED

**Problem:**
- Frontend `vite.config.ts` proxy pointed to `http://127.0.0.1:6987`
- Backend was actually running on port **8000**
- **This was causing all API calls to fail!**

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:6987
[vite] http proxy error: /api/config/integrations
[vite] http proxy error: /api/users/
[vite] http proxy error: /api/api/analytics?timeRange=7d
```

**Fix Applied:**
```typescript
// frontend/vite.config.ts
// Changed proxy target from:
target: 'http://127.0.0.1:6987'
// Changed to:
target: 'http://127.0.0.1:8000'
```

### 3. Enhanced CORS Configuration ✅ IMPROVED

**Problem:**
- CORS only allowed `localhost:6988`
- Vite uses `127.0.0.1:6988` explicitly

**Fix Applied:**
```python
# backend/main.py
# Added explicit IPv4 address to CORS origins
allow_origins=[
    "http://localhost:6988",
    "http://127.0.0.1:6988",  # Added this
    # ... other origins
]
```

## Verified Port Configuration

### All Services Now Correctly Configured:

| Service | Port | Status |
|---------|------|--------|
| Backend API | 8000 | ✅ Aligned |
| Frontend UI | 6988 | ✅ Correct |
| Frontend→Backend Proxy | 8000 | ✅ Fixed |
| PostgreSQL | 5432 | ✅ Correct |
| PgAdmin | 5050 | ✅ Correct |
| Splunk UI | 6990 | ✅ Correct |
| Splunk HEC | 8088 | ✅ Correct |
| Daemon Webhook | 8081 | ✅ Correct |
| Daemon Metrics | 9090 | ✅ Correct |

## Testing Verification

### Before Fixes:
```bash
$ lsof -i :6987
# (No output - nothing running on 6987)

$ lsof -i :8000
Python 74480 ... TCP localhost:8000 (LISTEN)  # Backend actually here

$ tail -f logs/frontend.log
Error: connect ECONNREFUSED 127.0.0.1:6987  # Frontend trying wrong port
```

### After Fixes:
- Backend runs on 8000 (consistent everywhere)
- Frontend proxy points to 8000 (matches backend)
- All configuration files aligned
- API calls will succeed once services restart

## Additional Issue Found (Not Port-Related)

**Daemon Failure:**
```
ModuleNotFoundError: No module named 'aiohttp'
```

**Note**: This is a dependency issue, not a port issue. The daemon needs `aiohttp` installed. This was in `requirements.txt` but may need reinstallation in the venv.

## Action Items

✅ **Completed:**
1. Fixed backend port in `backend/main.py`
2. Fixed frontend proxy in `frontend/vite.config.ts`
3. Enhanced CORS configuration
4. Created `PORT_CONFIGURATION.md` reference document

⚠️ **Recommended:**
1. Restart services to apply fixes:
   ```bash
   ./shutdown_all.sh
   ./start_daemon.sh
   ```

2. Fix daemon dependency issue (separate from ports):
   ```bash
   source venv/bin/activate
   pip install -r requirements.txt
   ```

## Files Modified

1. `/Users/mando222/Github/ai-opensoc/backend/main.py`
   - Line 380: Changed port from 6987 to 8000
   - Line 87-94: Enhanced CORS origins

2. `/Users/mando222/Github/ai-opensoc/frontend/vite.config.ts`
   - Line 12: Changed proxy target from 6987 to 8000

3. `/Users/mando222/Github/ai-opensoc/PORT_CONFIGURATION.md` (NEW)
   - Comprehensive port reference document

4. `/Users/mando222/Github/ai-opensoc/PORT_FIXES_SUMMARY.md` (NEW - this file)
   - Summary of fixes applied

## Expected Outcome

After restarting services:
- ✅ Frontend will successfully connect to backend API
- ✅ All proxy errors will resolve
- ✅ Health check at http://localhost:8000/api/health will respond
- ✅ Frontend UI at http://localhost:6988 will load data
- ✅ No more "ECONNREFUSED" errors in logs

---

**Configuration Status**: All port mismatches resolved  
**Ready for Testing**: Yes (after service restart)  
**Breaking Changes**: None (scripts already used port 8000)

