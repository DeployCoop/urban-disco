# API Reference

## Data Model

### Finding

Primary security observation with embeddings and MITRE predictions.

```json
{
  "finding_id": "f-2024-01-15-001",
  "embedding": [0.123, -0.456, ...],
  "mitre_predictions": {"T1071.001": 0.85, "T1048.003": 0.72},
  "anomaly_score": 0.92,
  "entity_context": {
    "src_ip": "10.0.1.15",
    "dst_ip": "203.0.113.50",
    "hostname": "workstation-042",
    "user": "jsmith"
  },
  "timestamp": "2024-01-15T14:32:18Z",
  "data_source": "flow",
  "severity": "high",
  "status": "new"
}
```

### Case

Investigation grouping related findings.

```json
{
  "case_id": "case-2024-01-15-001",
  "title": "Potential C2 Beaconing",
  "finding_ids": ["f-2024-01-15-001", "f-2024-01-15-002"],
  "status": "investigating",
  "priority": "high",
  "assignee": "analyst@example.com",
  "notes": [...],
  "timeline": [...],
  "created_at": "2024-01-15T15:00:00Z"
}
```

### Severity Calculation

```
combined = (anomaly_score * 0.6) + (max_mitre_confidence * 0.4)

>= 0.8: critical
>= 0.6: high
>= 0.4: medium
<  0.4: low
```

## MCP Tools - DeepTempo Findings

### `get_finding`

```json
{ "finding_id": "f-xxx" }
```

### `list_findings`

```json
{
  "filters": { "severity": "high", "data_source": "flow" },
  "limit": 50,
  "sort_by": "timestamp",
  "sort_order": "desc"
}
```

### `nearest_neighbors`

Find similar findings by embedding.

```json
{
  "query": "f-xxx",
  "k": 10,
  "filters": {
    "data_source": "flow",
    "min_anomaly_score": 0.5,
    "techniques": ["T1071"]
  }
}
```

### `technique_rollup`

MITRE technique aggregation.

```json
{
  "time_window": { "start": "2024-01-15T00:00:00Z", "end": "2024-01-15T23:59:59Z" },
  "min_confidence": 0.5
}
```

Returns:

```json
{
  "techniques": [
    {
      "technique_id": "T1071.001",
      "technique_name": "Application Layer Protocol: Web Protocols",
      "finding_count": 15,
      "avg_confidence": 0.82
    }
  ]
}
```

## MCP Tools - Case Management

### `create_case`

```json
{
  "title": "Investigation title",
  "finding_ids": ["f-xxx", "f-yyy"],
  "priority": "high",
  "description": "Case description"
}
```

### `update_case`

```json
{
  "case_id": "case-xxx",
  "updates": {
    "status": "in_progress",
    "add_findings": ["f-zzz"],
    "add_tags": ["ransomware"]
  }
}
```

### `list_cases`

```json
{
  "status": "in_progress",
  "priority": "high",
  "limit": 50
}
```

### `get_case`

```json
{
  "case_id": "case-xxx",
  "include_findings": true
}
```

## MCP Tools - Approval

### `create_approval_action`

```json
{
  "action_type": "isolate_host",
  "title": "Isolate compromised host",
  "target": "192.168.1.100",
  "confidence": 0.85,
  "reason": "Confirmed ransomware activity",
  "evidence": ["f-xxx"]
}
```

### `list_approval_actions`

```json
{
  "status": "pending",
  "action_type": "isolate_host"
}
```

## MCP Tools - Attack Layer

### `get_attack_layer`

Returns ATT&CK Navigator layer JSON.

### `get_technique_rollup`

```json
{ "min_confidence": 0.5 }
```

### `get_findings_by_technique`

```json
{ "technique_id": "T1071.001" }
```

### `create_attack_layer`

```json
{
  "name": "Investigation Layer",
  "finding_ids": ["f-xxx", "f-yyy"]
}
```

## Access Tiers

| Tier | Description | Rate Limit |
|------|-------------|------------|
| 1 | Findings, embeddings, aggregations | 100/min |
| 2 | Evidence snippets (redacted) | 20/min |
| 3 | Raw log export (disabled default) | 5/min |

## Error Codes

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Resource not found |
| `INVALID_PARAMETER` | Invalid parameter |
| `ACCESS_DENIED` | Insufficient permissions |
| `RATE_LIMITED` | Too many requests |

Error response format:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Finding not found"
  }
}
```

## Entity Context by Data Source

### Flow

```json
{
  "src_ip": "10.0.1.15",
  "dst_ip": "203.0.113.50",
  "src_port": 54321,
  "dst_port": 443,
  "protocol": "tcp",
  "bytes_sent": 1024,
  "hostname": "workstation-042"
}
```

### DNS

```json
{
  "src_ip": "10.0.1.15",
  "query_name": "suspicious.com",
  "query_type": "A",
  "response_ips": ["203.0.113.50"]
}
```

### WAF

```json
{
  "src_ip": "203.0.113.100",
  "method": "POST",
  "uri": "/api/upload",
  "rule_matched": "942100",
  "rule_category": "SQL Injection"
}
```

## JSON Schemas

Available in `data/schemas/`:
- `finding.schema.json`
- `case.schema.json`
- `attack-layer.schema.json`
