# Analytics Dashboard Enhancements

## Overview
Enhanced the Analytics dashboard with detailed visualizations to help SOC analysts understand attack patterns, affected devices, and threat intelligence.

## New Features Added

### 1. **Affected Devices/Entities View**
- **Description**: Shows the most affected devices, users, IPs, and hosts
- **Key Metrics**:
  - Entity name (IP, hostname, username, etc.)
  - Total finding count
  - Breakdown by severity (Critical, High, Medium, Low)
  - Risk score calculation (weighted by severity)
- **Use Cases**:
  - Identify compromised systems
  - Prioritize incident response
  - Track lateral movement
  - Detect patient zero

**Example Output**:
```
Top Affected Entities:
1. 10.0.1.15         | Count: 27 | Risk: 96  | C:0 H:15 M:9 L:3
2. workstation-042   | Count: 22 | Risk: 87  | C:0 H:15 M:5 L:2
3. jsmith            | Count: 18 | Risk: 81  | C:0 H:15 M:3 L:0
```

### 2. **Attack Time Heatmap**
- **Description**: Visual heatmap showing when attacks occur (hour of day vs day of week)
- **Key Features**:
  - 7 days x 24 hours grid
  - Color intensity based on finding count
  - Hover details show critical/high severity counts
- **Use Cases**:
  - Identify attack patterns (e.g., after-hours activity)
  - Detect automated attacks
  - Optimize staffing for peak times
  - Identify time-based anomalies

**Example Data**:
```
Friday 19:00 - 4 findings (1 high)
Friday 20:00 - 5 findings (2 high)
Friday 21:00 - 3 findings (1 high)
```

### 3. **MITRE ATT&CK Technique Distribution**
- **Description**: Bar chart showing most common attack techniques
- **Key Metrics**:
  - Technique ID (e.g., T1059)
  - Technique name
  - Associated tactic
  - Frequency count
- **Use Cases**:
  - Understand attacker TTPs
  - Prioritize detection rule tuning
  - Track campaign evolution
  - Report on threat landscape

### 4. **Enhanced Time Series Analysis**
- Existing charts now include:
  - Findings, Cases, and Alerts over time
  - Severity distribution pie chart
  - Top alert sources
  - Response time trends

## Technical Implementation

### Backend Changes (`backend/api/analytics.py`)

#### New Functions Added:

1. **`get_affected_entities()`**
   ```python
   - Extracts entities from finding.entity_context
   - Supports: hostname, host, device, ip_address, src_ip, dest_ip, username, user
   - Calculates risk score: (critical×10 + high×5 + medium×2 + low×1)
   - Returns top 15 entities by risk score
   ```

2. **`get_attack_time_heatmap()`**
   ```python
   - Creates 7×24 grid (day of week × hour of day)
   - Aggregates findings by time bucket
   - Tracks critical and high severity separately
   - Returns 168 data points (full week)
   ```

3. **`get_mitre_technique_distribution()`**
   ```python
   - Extracts MITRE techniques from mitre_predictions
   - Handles multiple prediction formats
   - Links techniques to tactics
   - Returns top 10 by frequency
   ```

### Frontend Changes (`frontend/src/pages/Analytics.tsx`)

#### New Visualization Components:

1. **Affected Entities Card**
   - Scrollable list with entity details
   - Color-coded risk score chips
   - Severity breakdown badges
   - Total finding count

2. **Attack Time Heatmap**
   - Interactive grid visualization
   - Color intensity based on activity
   - Hover tooltips with details
   - Legend for intensity scale

3. **MITRE Techniques Bar Chart**
   - Horizontal bar chart (using Recharts)
   - Custom tooltip with technique details
   - Sorted by frequency
   - Shows technique ID and count

## API Response Structure

```json
{
  "metrics": { ... },
  "timeSeriesData": [ ... ],
  "severityDistribution": [ ... ],
  "topSources": [ ... ],
  "responseTimeData": [ ... ],
  
  "affectedEntities": [
    {
      "entity": "10.0.1.15",
      "count": 27,
      "critical": 0,
      "high": 15,
      "medium": 9,
      "low": 3,
      "riskScore": 96
    }
  ],
  
  "attackHeatmap": [
    {
      "day": "Friday",
      "dayNum": 4,
      "hour": 19,
      "count": 4,
      "critical": 0,
      "high": 1,
      "intensity": 4
    }
  ],
  
  "mitreTechniques": [
    {
      "techniqueId": "T1059",
      "techniqueName": "Command and Scripting Interpreter",
      "tactic": "Execution",
      "count": 12
    }
  ],
  
  "insights": [ ... ]
}
```

## Usage Guide

### Accessing the Analytics Dashboard
1. Navigate to http://localhost:6988/analytics
2. Select time range: 24 Hours, 7 Days, or 30 Days
3. Click refresh icon to reload data

### Interpreting Visualizations

**Affected Entities**:
- Red risk score = High priority (>50)
- Orange risk score = Medium priority (20-50)
- Gray risk score = Low priority (<20)

**Attack Heatmap**:
- Darker red = More attack activity
- Light gray = No activity
- Hover for detailed counts
- Look for patterns (e.g., weekend attacks, late night activity)

**MITRE Techniques**:
- Longer bars = More frequent techniques
- Hover to see full technique name and tactic
- Use for threat hunting and detection priorities

## Performance Considerations

- All queries are optimized with database indexes
- Heatmap pre-aggregates to 168 buckets (not per-finding)
- Entity extraction uses JSONB queries (fast on PostgreSQL)
- Typical response time: < 2 seconds for 7-day window

## Future Enhancements

Potential additions:
- Attack chain visualization (sequence of techniques)
- Geographic map of source IPs
- Trend forecasting using ML
- Automated anomaly detection alerts
- Export to PDF/CSV for reporting
- Real-time updates via WebSocket

## Dependencies

- Backend: SQLAlchemy, PostgreSQL, FastAPI
- Frontend: React, Recharts, Material-UI
- No new dependencies added

## Testing

Test the analytics endpoint:
```bash
curl http://localhost:8000/api/analytics?timeRange=7d | jq .
```

Check data availability:
```bash
curl -s http://localhost:8000/api/analytics?timeRange=7d | \
  python3 -c "import json, sys; data = json.load(sys.stdin); \
  print('Entities:', len(data['affectedEntities'])); \
  print('Heatmap:', len(data['attackHeatmap'])); \
  print('MITRE:', len(data['mitreTechniques']))"
```

## Troubleshooting

**No entities showing**:
- Ensure findings have entity_context populated
- Check that entity_context contains standard fields (hostname, ip_address, etc.)

**Empty heatmap**:
- Verify findings have valid timestamps
- Ensure findings exist in the selected time range

**No MITRE techniques**:
- Check that findings have mitre_predictions populated
- Verify the prediction format matches expected structure

## Related Files

- `backend/api/analytics.py` - Analytics API endpoints and logic
- `frontend/src/pages/Analytics.tsx` - Analytics dashboard UI
- `database/models.py` - Finding and Case models
- `backend/services/ai_insights_service.py` - AI-powered insights

---

**Last Updated**: 2026-01-21
**Version**: 2.0
**Status**: Production Ready ✅

