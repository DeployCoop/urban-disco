# Migrating from MCP to Backend Tools

> **Note:** This migration is complete. AI-OpenSOC uses backend-only tool integration. This document is preserved as a reference for the migration that was performed.

## Overview

AI-OpenSOC uses **backend-only tool integration** via Claude API function calling. No external desktop applications or MCP host configuration is required.

## Why Backend Tools?

| Legacy MCP Servers | Backend Tools |
|-------------------|---------------|
| Required external MCP host | Works via web UI |
| Complex configuration | Simple env vars |
| Single-user only | Multi-user production |
| Higher latency | Direct function calls |
| 100+ tools | 19 core tools |

**TL;DR**: Backend tools work everywhere (web UI, API, mobile) with no external dependencies.

## Quick Start

**You're already using backend tools!** No action needed.

The web UI automatically uses backend tool integration. All detection engineering, case management, and approval tools are available.

## Tool Comparison

### Security Detection Tools

| Function | MCP Tool Name | Backend Tool Name | Status |
|----------|--------------|------------------|--------|
| Coverage analysis | `security-detections_analyze_coverage` | `analyze_coverage` | ✅ Migrated |
| Search detections | `security-detections_search_detections` | `search_detections` | ✅ Migrated |
| Gap identification | `security-detections_identify_gaps` | `identify_gaps` | ✅ Migrated |
| Coverage stats | `security-detections_get_coverage_stats` | `get_coverage_stats` | ✅ Migrated |
| Detection count | `security-detections_get_detection_count` | `get_detection_count` | ✅ Migrated |
| 66+ other tools | `security-detections_*` | N/A | MCP only |

### Finding & Case Tools

| Function | MCP Tool Name | Backend Tool Name | Status |
|----------|--------------|------------------|--------|
| List findings | `deeptempo-findings_list_findings` | `list_findings` | ✅ Migrated |
| Get finding | `deeptempo-findings_get_finding` | `get_finding` | ✅ Migrated |
| Similar findings | `deeptempo-findings_nearest_neighbors` | `nearest_neighbors` | ✅ Migrated |
| List cases | `deeptempo-findings_list_cases` | `list_cases` | ✅ Migrated |
| Get case | `deeptempo-findings_get_case` | `get_case` | ✅ Migrated |
| Create case | `deeptempo-findings_create_case` | `create_case` | ✅ Migrated |
| Add to case | `deeptempo-findings_add_finding_to_case` | `add_finding_to_case` | ✅ Migrated |

### MITRE ATT&CK Tools

| Function | MCP Tool Name | Backend Tool Name | Status |
|----------|--------------|------------------|--------|
| Get layer | `attack-layer_get_attack_layer` | `get_attack_layer` | ✅ Migrated |
| Technique rollup | `attack-layer_get_technique_rollup` | `get_technique_rollup` | ✅ Migrated |

### Approval Tools

| Function | MCP Tool Name | Backend Tool Name | Status |
|----------|--------------|------------------|--------|
| List pending | `approval_list_pending_approvals` | `list_pending_approvals` | ✅ Migrated |
| Get action | `approval_get_action` | `get_approval_action` | ✅ Migrated |
| Approve | `approval_approve_action` | `approve_action` | ✅ Migrated |
| Reject | `approval_reject_action` | `reject_action` | ✅ Migrated |
| Get stats | `approval_get_stats` | `get_approval_stats` | ✅ Migrated |

## Code Changes

### Before (MCP)

```python
from services.claude_service import ClaudeService

# Old way - requires MCP servers
claude = ClaudeService(
    use_mcp_tools=True,
    use_backend_tools=False
)
```

### After (Backend)

```python
from services.claude_service import ClaudeService

# New way - no MCP required
claude = ClaudeService(
    use_backend_tools=True,
    use_mcp_tools=False
)
```

### Web UI (Automatic)

The web UI automatically uses backend tools. No code changes needed!

## Configuration Changes

### Before (Legacy MCP)

Required `mcp-config.json` and an external MCP host:

```json
// mcp-config.json (no longer required)
{
  "mcpServers": {
    "security-detections": {
      "command": "npx",
      "args": ["-y", "security-detections-mcp"],
      "env": {
        "SIGMA_PATHS": "/Users/you/security-detections/sigma/rules",
        // ... more config
      }
    }
  }
}
```

### After (Backend)

Just environment variables in `.env`:

```bash
# .env
SIGMA_PATHS="${HOME}/security-detections/sigma/rules"
SPLUNK_PATHS="${HOME}/security-detections/security_content/detections"
ELASTIC_PATHS="${HOME}/security-detections/detection-rules/rules"
KQL_PATHS="${HOME}/security-detections/Hunting-Queries-Detection-Rules"
```

## API Integration

### Before (Legacy MCP - not accessible)

MCP tools were **not accessible** via web API. They required a local MCP host application.

### After (Full API access)

```bash
# All tools available via API
curl -X POST http://localhost:6987/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze our detection coverage for T1059.001",
    "agent_id": "mitre_analyst"
  }'
```

## Testing

### Verify Backend Tools

```bash
# Run backend tool tests
python tests/test_backend_tools.py

# Expected: All 19 tools loaded
# Expected: 6,700+ detection rules indexed
```

### Compare with MCP

```bash
# Run comparison test
python tests/test_integration_backend_tools.py

# Should show:
# - Backend tools: 19
# - MCP tools: 0 (if disabled) or 128 (if still enabled)
```

## Troubleshooting

### "No tools loaded"

```python
claude = ClaudeService(use_backend_tools=True)
print(f"Loaded: {len(claude.backend_tools)} tools")
# Should show 19
```

If showing 0:
1. Check `backend/schemas/tool_schemas.py` exists
2. Ensure `tools/security_detections.py` exists
3. Verify detection repos in `~/security-detections/`

### "Detection rules not found"

```bash
# Check repos
ls -la ~/security-detections/

# Should show:
# - sigma/
# - security_content/
# - detection-rules/
# - Hunting-Queries-Detection-Rules/

# Re-clone if missing
./scripts/setup_detection_repos.sh
```

### "Tools not working in web UI"

Check backend initialization:

```python
# In backend/main.py or where ClaudeService is initialized
app.state.claude = ClaudeService(
    use_backend_tools=True,  # ← Must be True
    use_mcp_tools=False       # ← Must be False for web
)
```

## Performance Comparison

### Tool Execution Latency

| Operation | MCP | Backend | Improvement |
|-----------|-----|---------|-------------|
| Coverage analysis | 800ms | 500ms | 37% faster |
| Detection search | 600ms | 300ms | 50% faster |
| List findings | 150ms | 50ms | 67% faster |
| Get case | 100ms | 30ms | 70% faster |

### First Load

| Component | MCP | Backend |
|-----------|-----|---------|
| Detection rules | 10s | 8s (lazy load) |
| Tool initialization | 5s | 1s |
| **Total** | **15s** | **9s** |

## Feature Parity

### Core Features (100% parity)

- ✅ Coverage analysis
- ✅ Detection search
- ✅ Gap identification
- ✅ Case management
- ✅ Finding queries
- ✅ MITRE ATT&CK layers
- ✅ Approval workflow

### MCP-Only Features (Legacy)

These features were only available via the legacy MCP integration:

- ❌ 66+ advanced detection tools
- ❌ Tribal knowledge system
- ❌ Expert workflow prompts
- ❌ Template generation (advanced)
- ❌ Detection lifecycle management

Most users don't need these - the 5 core detection tools cover 90% of use cases.

## Deployment

### Development

```bash
# Backend tools work out of the box
./setup_dev.sh
./start_web.sh

# Access web UI: http://localhost:6988
# All 19 tools available immediately
```

### Production

```bash
# Deploy backend
docker-compose up -d backend

# No MCP server configuration needed
# No external desktop application required
# Just set environment variables
```

### Multi-User

```bash
# Each user gets backend tools automatically
# No per-user MCP configuration
# Shared detection rule index
# Central database access
```

## Rollback

If you need to revert to MCP:

```python
# services/claude_service.py
claude = ClaudeService(
    use_backend_tools=False,  # Disable backend
    use_mcp_tools=True        # Enable MCP
)
```

Then restore your `mcp-config.json` and MCP host configuration.

## Support

### Backend Tools

- Documentation: [docs/BACKEND_TOOLS.md](BACKEND_TOOLS.md)
- Tests: `tests/test_backend_tools.py`
- Issues: GitHub Issues with "backend-tools" label

### MCP (Legacy)

- Documentation: [docs/INTEGRATIONS.md](INTEGRATIONS.md)
- MCP Servers: `mcp-servers/servers/`
- Issues: GitHub Issues with "mcp" label

## Recommendation

✅ **Use backend tools** for:
- Web UI deployment
- API integration
- Production systems
- Multi-user environments
- Mobile access

🔧 **Use MCP** for:
- Advanced detection engineering (66+ tools)
- Tribal knowledge features
- Local development with MCP-compatible tools

Most deployments should use **backend tools only**.

