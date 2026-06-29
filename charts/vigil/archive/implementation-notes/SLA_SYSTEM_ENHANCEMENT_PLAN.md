# SLA System Enhancement Plan

## Executive Summary

The current SLA system has a solid foundation with core tracking, pause/resume functionality, and basic reporting. However, several critical features are missing for enterprise-grade SLA management.

## Current Implementation Status

### ✅ Implemented Features

1. **Core SLA Tracking**
   - Response and resolution time tracking
   - Business hours calculator
   - Pause/resume functionality
   - Breach detection
   - Basic notification system

2. **Database Schema**
   - SLAPolicy model with escalation rules support
   - CaseSLA model for per-case tracking
   - Default policies for all priority levels

3. **API Endpoints (Limited)**
   - Assign SLA to case
   - Get SLA status
   - Pause/resume SLA
   - SLA compliance report
   - Breached cases list

4. **Frontend**
   - Real-time SLA countdown component
   - Visual progress indicators
   - Pause/resume controls

5. **Automation**
   - Background monitoring every 60s
   - Threshold notifications (75%, 90%, 100%)
   - Auto-escalation for breached cases

## Priority 1: Critical Missing Features

### 1.1 SLA Policy Management API

**Priority: CRITICAL**  
**Effort: Medium**

Create comprehensive CRUD API for SLA policies:

```python
# backend/api/sla_policies.py

@router.get("/sla-policies")
async def list_sla_policies(
    active_only: bool = False,
    priority_level: Optional[str] = None
)

@router.get("/sla-policies/{policy_id}")
async def get_sla_policy(policy_id: str)

@router.post("/sla-policies")
async def create_sla_policy(data: SLAPolicyCreate)

@router.put("/sla-policies/{policy_id}")
async def update_sla_policy(policy_id: str, data: SLAPolicyUpdate)

@router.delete("/sla-policies/{policy_id}")
async def delete_sla_policy(policy_id: str)

@router.post("/sla-policies/{policy_id}/set-default")
async def set_default_policy(policy_id: str, priority_level: str)
```

**Benefits:**
- Administrators can manage policies without database access
- Enables policy versioning and auditing
- Supports dynamic policy adjustments

### 1.2 Automatic SLA Assignment on Case Creation

**Priority: CRITICAL**  
**Effort: Low**

Currently, SLA must be manually assigned. Should auto-assign based on:
- Case priority
- Case template default SLA
- Customer tier (if applicable)

**Implementation:**
```python
# In cases.py create_case()
# After case creation:
sla_service = CaseSLAService()
sla_policy_id = case_template.default_sla_policy_id if template else None
sla_service.assign_sla_to_case(case.case_id, sla_policy_id)
```

### 1.3 Escalation Engine Implementation

**Priority: HIGH**  
**Effort: High**

Implement the escalation rules that are defined in SLAPolicy but not used:

```python
# services/case_sla_escalation_service.py

class SLAEscalationService:
    """Handles SLA escalations based on policy rules."""
    
    def process_escalation_rules(self, case_id: str, threshold: int):
        """
        Process escalation rules when SLA threshold is reached.
        
        Escalation rules format:
        {
            "75": {
                "notify": ["assignee", "team_lead"],
                "channels": ["ui", "email"]
            },
            "90": {
                "notify": ["assignee", "team_lead", "manager"],
                "channels": ["ui", "email", "slack"],
                "reassign_if_no_response": true,
                "escalate_priority": true
            },
            "100": {
                "notify": ["assignee", "team_lead", "manager", "director"],
                "channels": ["ui", "email", "slack", "pagerduty"],
                "create_incident": true,
                "auto_escalate": "senior_team"
            }
        }
        """
```

**Features:**
- Dynamic notification channels based on threshold
- Auto-reassignment if no response
- Priority elevation
- Incident creation for critical breaches
- Escalation chain management

### 1.4 Multi-Channel Notification Integration

**Priority: HIGH**  
**Effort: Medium**

Connect SLA warnings to existing notification tools:

```python
# In case_automation_service.py _check_sla_deadlines()

if response_pct >= threshold:
    # Get escalation rules for this threshold
    escalation_rules = policy.escalation_rules.get(str(threshold), {})
    channels = escalation_rules.get("channels", ["ui"])
    
    for channel in channels:
        if channel == "email":
            email_service.send_sla_warning(case_id, threshold)
        elif channel == "slack":
            slack_service.send_sla_warning(case_id, threshold)
        elif channel == "teams":
            teams_service.send_sla_warning(case_id, threshold)
        elif channel == "pagerduty" and threshold >= 90:
            pagerduty_service.create_incident(case_id)
```

## Priority 2: Important Enhancements

### 2.1 Business Hours Calendar System

**Priority: HIGH**  
**Effort: High**

Create a configurable calendar system:

```python
# database/models.py

class BusinessCalendar(Base):
    """Defines business hours, holidays, and special days."""
    
    calendar_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    timezone: Mapped[str] = mapped_column(String(50))  # e.g., "America/New_York"
    
    # Business hours per day (JSONB)
    business_hours: Mapped[dict] = mapped_column(JSONB)
    # Format: {"monday": {"start": "09:00", "end": "17:00"}, ...}
    
    # Holidays (JSONB array)
    holidays: Mapped[List[dict]] = mapped_column(JSONB)
    # Format: [{"date": "2024-12-25", "name": "Christmas"}, ...]
    
    # Special working days (JSONB array)
    special_working_days: Mapped[List[dict]] = mapped_column(JSONB)
    # Format: [{"date": "2024-12-28", "hours": {"start": "09:00", "end": "17:00"}}]
    
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

# Link calendar to SLA policy
class SLAPolicy(Base):
    # Add field:
    calendar_id: Mapped[Optional[str]] = mapped_column(
        String(50),
        ForeignKey('business_calendars.calendar_id'),
        nullable=True
    )
```

**API Endpoints:**
```python
# backend/api/business_calendars.py

@router.post("/business-calendars")
async def create_calendar(data: CalendarCreate)

@router.get("/business-calendars/{calendar_id}/preview")
async def preview_calendar(calendar_id: str, year: int)
# Returns all business days/hours for the year

@router.post("/business-calendars/{calendar_id}/holidays")
async def add_holiday(calendar_id: str, data: HolidayAdd)

@router.post("/business-calendars/{calendar_id}/import")
async def import_holidays(calendar_id: str, country: str, year: int)
# Import holidays from external API
```

### 2.2 SLA Override and Exception Handling

**Priority: MEDIUM**  
**Effort: Medium**

```python
# database/models.py

class SLAException(Base):
    """Records SLA exceptions and extensions."""
    
    exception_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sla_id: Mapped[int] = mapped_column(Integer, ForeignKey('case_slas.sla_id'))
    
    exception_type: Mapped[str] = mapped_column(String(50))
    # Types: "extension", "pause", "waiver", "override"
    
    reason: Mapped[str] = mapped_column(Text)
    requested_by: Mapped[str] = mapped_column(String(100))
    approved_by: Mapped[Optional[str]] = mapped_column(String(100))
    
    original_deadline: Mapped[datetime] = mapped_column(DateTime)
    new_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime)
    extension_hours: Mapped[Optional[float]] = mapped_column(Float)
    
    status: Mapped[str] = mapped_column(String(20))
    # Status: "pending", "approved", "rejected"
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
```

**API:**
```python
@router.post("/{case_id}/sla/request-extension")
async def request_sla_extension(
    case_id: str,
    extension_hours: float,
    reason: str,
    requested_by: str
)

@router.post("/sla/exceptions/{exception_id}/approve")
async def approve_exception(exception_id: int, approved_by: str)

@router.post("/sla/exceptions/{exception_id}/reject")
async def reject_exception(exception_id: int, rejected_by: str, reason: str)
```

### 2.3 Advanced Reporting & Analytics

**Priority: MEDIUM**  
**Effort: High**

```python
# services/case_sla_analytics_service.py

class SLAAnalyticsService:
    """Advanced SLA analytics and reporting."""
    
    def get_sla_trends(
        self,
        start_date: datetime,
        end_date: datetime,
        granularity: str = "day"  # day, week, month
    ) -> Dict:
        """
        Returns SLA compliance trends over time.
        
        Returns:
        {
            "response_compliance_trend": [
                {"date": "2024-01-01", "compliance_rate": 95.2},
                ...
            ],
            "resolution_compliance_trend": [...],
            "breach_trend": [...]
        }
        """
    
    def get_policy_effectiveness(self) -> List[Dict]:
        """
        Analyze which policies are most/least effective.
        
        Returns metrics like:
        - Average compliance rate per policy
        - Breach frequency per policy
        - Average time to complete vs. allocated time
        - Recommendations for policy adjustments
        """
    
    def get_breach_analysis(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Root cause analysis of SLA breaches.
        
        Returns:
        - Most common breach reasons
        - Breach patterns (time of day, day of week)
        - Team/analyst breach rates
        - Case type breach correlation
        """
    
    def forecast_sla_risk(self) -> List[Dict]:
        """
        Predict which open cases are at risk of breaching.
        
        Uses:
        - Current velocity
        - Historical resolution times
        - Case complexity indicators
        - Team workload
        """
    
    def get_team_sla_performance(
        self,
        team_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict:
        """
        Team-level SLA performance metrics.
        """
```

**New API Endpoints:**
```python
# backend/api/sla_analytics.py

@router.get("/sla-analytics/trends")
async def get_sla_trends(...)

@router.get("/sla-analytics/policy-effectiveness")
async def get_policy_effectiveness()

@router.get("/sla-analytics/breach-analysis")
async def get_breach_analysis(...)

@router.get("/sla-analytics/at-risk-cases")
async def get_at_risk_cases()

@router.get("/sla-analytics/team-performance/{team_id}")
async def get_team_performance(...)
```

### 2.4 SLA History and Audit Trail

**Priority: MEDIUM**  
**Effort: Low**

```python
# database/models.py

class SLAPolicyHistory(Base):
    """Tracks changes to SLA policies."""
    
    history_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    policy_id: Mapped[str] = mapped_column(String(50), ForeignKey('sla_policies.policy_id'))
    
    change_type: Mapped[str] = mapped_column(String(50))
    # Types: "created", "updated", "activated", "deactivated", "deleted"
    
    changed_by: Mapped[str] = mapped_column(String(100))
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    old_values: Mapped[Optional[dict]] = mapped_column(JSONB)
    new_values: Mapped[dict] = mapped_column(JSONB)
    
    change_reason: Mapped[Optional[str]] = mapped_column(Text)


class SLAActionLog(Base):
    """Logs all SLA-related actions on cases."""
    
    log_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sla_id: Mapped[int] = mapped_column(Integer, ForeignKey('case_slas.sla_id'))
    case_id: Mapped[str] = mapped_column(String(50))
    
    action_type: Mapped[str] = mapped_column(String(50))
    # Types: "assigned", "paused", "resumed", "breached", "completed", "extended"
    
    performed_by: Mapped[Optional[str]] = mapped_column(String(100))
    performed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    details: Mapped[Optional[dict]] = mapped_column(JSONB)
    reason: Mapped[Optional[str]] = mapped_column(Text)
```

## Priority 3: Nice-to-Have Features

### 3.1 Multi-Tier SLA Support

**Priority: LOW**  
**Effort: Medium**

Support different SLA tiers for:
- Customer tiers (Platinum, Gold, Silver)
- Case types
- Service agreements

```python
# database/models.py

class CustomerSLATier(Base):
    """Maps customers to SLA tiers."""
    
    tier_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    tier_name: Mapped[str] = mapped_column(String(100))
    
    # Override SLA multipliers
    response_time_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    resolution_time_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    
    # Or direct policy mapping
    critical_policy_id: Mapped[Optional[str]] = mapped_column(String(50))
    high_policy_id: Mapped[Optional[str]] = mapped_column(String(50))
    # ...

# Add to Case model:
class Case(Base):
    customer_tier: Mapped[Optional[str]] = mapped_column(String(50))
```

### 3.2 SLA Dashboard Frontend

**Priority: MEDIUM**  
**Effort: High**

Create comprehensive SLA management UI:

```typescript
// frontend/src/pages/SLADashboard.tsx

- List all cases with SLA status
- Filter by: at-risk, breached, healthy, paused
- Sort by: time remaining, priority, created date
- Visual indicators: red (breached), yellow (warning), green (healthy)
- Quick actions: pause, resume, extend
- SLA policy management interface
- Analytics charts and graphs
```

### 3.3 SLA Prediction & Machine Learning

**Priority: LOW**  
**Effort: Very High**

ML-based SLA risk prediction:

```python
# services/sla_ml_service.py

class SLAPredictionService:
    """ML-based SLA breach prediction."""
    
    def train_breach_prediction_model(self):
        """
        Train model on historical data.
        
        Features:
        - Case priority, type, complexity
        - Analyst workload
        - Time of day/week created
        - Historical team performance
        - Finding count and severity
        """
    
    def predict_breach_probability(self, case_id: str) -> float:
        """Return probability (0-1) of SLA breach."""
    
    def recommend_optimal_sla(self, case_data: Dict) -> str:
        """Recommend best SLA policy based on case characteristics."""
```

### 3.4 SLA Notifications Preferences

**Priority: LOW**  
**Effort: Low**

Allow users to customize SLA notification preferences:

```python
# database/models.py

class UserSLAPreferences(Base):
    """User preferences for SLA notifications."""
    
    user_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    
    # Notification channels per threshold
    notify_at_75_percent: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_at_90_percent: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_at_breach: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Preferred channels
    preferred_channels: Mapped[List[str]] = mapped_column(ARRAY(String))
    # e.g., ["ui", "email", "slack"]
    
    # Quiet hours
    quiet_hours_start: Mapped[Optional[str]] = mapped_column(String(5))
    quiet_hours_end: Mapped[Optional[str]] = mapped_column(String(5))
    
    # Digest settings
    send_daily_digest: Mapped[bool] = mapped_column(Boolean, default=False)
    digest_time: Mapped[Optional[str]] = mapped_column(String(5))
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. ✅ SLA Policy Management API
2. ✅ Automatic SLA assignment on case creation
3. ✅ Multi-channel notification integration

### Phase 2: Core Features (Week 3-4)
4. ✅ Escalation engine implementation
5. ✅ Business hours calendar system
6. ✅ SLA history and audit trail

### Phase 3: Advanced Features (Week 5-6)
7. ✅ SLA override/exception handling
8. ✅ Advanced reporting and analytics
9. ✅ SLA dashboard frontend

### Phase 4: Polish (Week 7-8)
10. ✅ Multi-tier SLA support
11. ✅ User notification preferences
12. ✅ Documentation and testing

## Testing Requirements

### Unit Tests
- Business hours calculator edge cases
- SLA calculation with pauses
- Escalation rule processing
- Holiday calendar integration

### Integration Tests
- End-to-end case creation with SLA
- SLA breach notification flow
- Escalation workflow
- API endpoint validation

### Performance Tests
- SLA monitoring at scale (1000+ active cases)
- Notification delivery performance
- Analytics query performance

## Documentation Needs

1. **Admin Guide**
   - How to create/manage SLA policies
   - Configuring business hours and holidays
   - Setting up escalation rules
   - Understanding reports

2. **User Guide**
   - Understanding SLA indicators
   - Requesting extensions
   - Notification preferences

3. **API Documentation**
   - All new endpoints
   - Request/response examples
   - Error codes

4. **Architecture Documentation**
   - SLA calculation flow
   - Escalation decision tree
   - Database schema changes

## Success Metrics

- **SLA Compliance Rate**: Target 95%+ for all priorities
- **Breach Notification Time**: < 1 minute after breach
- **Policy Management**: Admins can create/modify policies in < 5 minutes
- **Reporting**: Generate comprehensive SLA reports in < 10 seconds
- **User Satisfaction**: 90%+ approval on SLA visibility and control

## Conclusion

The current SLA system provides a solid foundation. Priority 1 enhancements (Policy Management API, Auto-assignment, Escalation Engine, and Multi-channel Notifications) should be implemented first as they address critical gaps. Priority 2 features enhance the system's robustness and analytics capabilities. Priority 3 features are nice-to-have and can be implemented based on specific customer needs.

Estimated total effort: **6-8 weeks** for Priority 1 & 2 features with 1 full-time developer.

