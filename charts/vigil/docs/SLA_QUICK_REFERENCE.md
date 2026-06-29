# SLA Quick Reference Card

## ✨ Automatic SLA Assignment

**Good News!** SLA is automatically assigned when you create a case.

```bash
# Create case → SLA auto-assigned based on priority
curl -X POST "/api/cases/" -d '{"title":"Issue","priority":"high","finding_ids":[]}'
```

## 📋 Default Policies

| Priority | Response | Resolution | Coverage |
|----------|----------|------------|----------|
| Critical | 1h | 4h | 24/7 |
| High | 2h | 8h | 24/7 |
| Medium | 4h | 24h | Business hours |
| Low | 8h | 72h | Business hours |

## 🔧 Common Operations

### Check SLA Status
```bash
GET /api/cases/{case_id}/sla
```

### Assign/Override SLA
```bash
POST /api/cases/{case_id}/sla
{"sla_policy_id": "sla-vip-critical"}  # or {} for default
```

### Pause SLA
```bash
POST /api/cases/{case_id}/sla/pause
```

### Resume SLA
```bash
POST /api/cases/{case_id}/sla/resume
```

## 🎛️ Policy Management

### List Policies
```bash
GET /api/sla-policies/
GET /api/sla-policies/?active_only=true
GET /api/sla-policies/?priority_level=high&default_only=true
```

### Create Policy
```bash
POST /api/sla-policies/
{
  "policy_id": "sla-custom",
  "name": "Custom Policy",
  "priority_level": "high",
  "response_time_hours": 1.5,
  "resolution_time_hours": 6.0,
  "business_hours_only": false
}
```

### Update Policy
```bash
PUT /api/sla-policies/{policy_id}
{"response_time_hours": 2.0}
```

### Delete Policy
```bash
DELETE /api/sla-policies/{policy_id}
DELETE /api/sla-policies/{policy_id}?force=true  # Force delete
```

### Set as Default
```bash
POST /api/sla-policies/{policy_id}/set-default
```

### Get Usage Stats
```bash
GET /api/sla-policies/{policy_id}/usage
```

## 💻 Frontend (TypeScript)

### Import
```typescript
import { casesApi, slaPoliciesApi } from '@/services/api'
```

### Check SLA
```typescript
const sla = await casesApi.getSLA(caseId)
console.log(sla.data.health_status)  // healthy, warning, critical, breached
```

### Assign SLA
```typescript
await casesApi.assignSLA(caseId, { sla_policy_id: 'sla-vip-high' })
```

### Pause/Resume
```typescript
await casesApi.pauseSLA(caseId)
await casesApi.resumeSLA(caseId)
```

### Manage Policies
```typescript
// List
const policies = await slaPoliciesApi.getAll({ active_only: true })

// Create
await slaPoliciesApi.create({
  policy_id: 'sla-custom',
  name: 'Custom',
  priority_level: 'high',
  response_time_hours: 1,
  resolution_time_hours: 4
})

// Update
await slaPoliciesApi.update('sla-custom', { response_time_hours: 2 })

// Usage
const usage = await slaPoliciesApi.getUsage('sla-high-default')
```

### Use Component
```tsx
import CaseSLA from '@/components/cases/CaseSLA'

<CaseSLA caseId={caseId} />
```

## 🚦 Health Status

- 🟢 **healthy**: < 75% elapsed
- 🟡 **warning**: 75-89% elapsed  
- 🟠 **critical**: 90-99% elapsed
- 🔴 **breached**: 100%+ elapsed

## 🧪 Testing

```bash
# Run test suite
python scripts/test_sla_assignment.py

# Test API
curl http://localhost:6987/api/sla-policies/
```

## 📚 Full Documentation

- **Usage Guide**: `docs/SLA_USAGE_GUIDE.md`
- **API Reference**: `docs/SLA_POLICY_API_GUIDE.md`
- **Assessment**: `docs/SLA_SYSTEM_ASSESSMENT.md`
- **Enhancement Plan**: `docs/SLA_SYSTEM_ENHANCEMENT_PLAN.md`

## 🆘 Troubleshooting

**SLA not assigned?**
```bash
# Check default policies exist
curl http://localhost:6987/api/sla-policies/?default_only=true
```

**Check logs:**
```bash
tail -f logs/backend.log | grep SLA
```

---

**Version**: 1.0.0 | **Updated**: 2026-01-21

