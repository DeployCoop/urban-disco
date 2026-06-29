# Event Visualization Implementation

## Overview

This document describes the implementation of the event incident visualization feature that provides comprehensive, AI-powered incident analysis for timeline events in the AI OpenSOC platform.

## Implementation Summary

### Completed Features

1. **Backend API Endpoint** (`backend/api/timeline.py`)
   - New endpoint: `GET /api/timeline/event/{event_id}/visualization`
   - Returns comprehensive event data including:
     - Event details and metadata
     - Associated finding (if applicable)
     - Related events in time window (±30 minutes default)
     - Entity relationship graph
     - MITRE ATT&CK techniques
     - AI-generated incident analysis

2. **Claude AI Event Analysis** (`services/claude_service.py`)
   - New method: `generate_event_analysis()`
   - Provides SOC analysts with:
     - Incident summary (plain language)
     - Attack narrative (story-based explanation)
     - Entity analysis (relationship explanations)
     - Threat assessment (risk level justification)
     - Investigation priorities (what to check next)
     - Response recommendations (immediate actions)
     - Timeline correlation (contextual understanding)
     - Confidence score (0.0-1.0)

3. **Event Visualization Dialog** (`frontend/src/components/timeline/EventVisualizationDialog.tsx`)
   - Multi-tab dialog component with:
     - **Overview Tab**: Event summary, finding info, key metrics
     - **AI Analysis Tab**: Expandable accordions with AI insights
     - **Entity Graph Tab**: Interactive force-directed graph
     - **Related Events Tab**: Timeline visualization
     - **MITRE ATT&CK Tab**: Techniques table with confidence scores
     - **Raw Data Tab**: JSON view of all data
   - Features:
     - Copy-to-clipboard for IOCs
     - Export report functionality
     - Severity-based color coding
     - Responsive design

4. **FindingDetailDialog Integration** (`frontend/src/components/findings/FindingDetailDialog.tsx`)
   - Added timeline section showing related events
   - Click-to-visualize functionality
   - Event count display
   - Seamless dialog integration

5. **API Service Methods** (`frontend/src/services/api.ts`)
   - `timelineApi.getEventVisualization()` - Get comprehensive event data
   - `timelineApi.getFindingEvents()` - Get events for a specific finding

## How to Test

### 1. Backend Testing

Start the backend server:
```bash
cd /Users/mando222/Github/ai-opensoc
python -m backend.main
```

Test the new endpoint:
```bash
# Get visualization for a finding event
curl http://localhost:8000/api/timeline/event/finding-f-20260114-001/visualization?time_window_minutes=30&include_ai_analysis=true
```

### 2. Frontend Testing

1. Start the frontend development server:
```bash
cd frontend
npm run dev
```

2. Navigate to the application in your browser (typically `http://localhost:5173`)

3. Test the feature:
   - Open the Dashboard or Findings page
   - Click on any finding to open the Finding Detail Dialog
   - Scroll down to the "Related Events" section
   - Click on any event in the timeline
   - The Event Visualization Dialog should open with all tabs populated

### 3. Feature Validation Checklist

#### Backend Validation
- [ ] Event visualization endpoint responds (200 OK)
- [ ] Event data is correctly formatted
- [ ] Related events are within the time window
- [ ] Entity graph contains nodes and links
- [ ] MITRE techniques are extracted from finding
- [ ] AI analysis is generated (requires Claude API key)
- [ ] Error handling works (404 for invalid event_id)

#### Frontend Validation
- [ ] Finding Detail Dialog loads successfully
- [ ] Timeline section appears with events
- [ ] Clicking an event opens Event Visualization Dialog
- [ ] All 6 tabs are accessible and render correctly
- [ ] Overview tab shows event summary and metrics
- [ ] AI Analysis tab shows expandable sections (if AI available)
- [ ] Entity Graph tab renders interactive graph
- [ ] Related Events tab shows timeline visualization
- [ ] MITRE ATT&CK tab shows techniques table
- [ ] Raw Data tab shows JSON
- [ ] Copy buttons work for IOCs
- [ ] Export report button downloads JSON file
- [ ] Dialog closes properly

#### User Experience Validation
- [ ] Loading states are clear and informative
- [ ] Error messages are helpful
- [ ] Severity colors are consistent
- [ ] Responsive design works on different screen sizes
- [ ] No console errors or warnings
- [ ] Performance is acceptable (< 2s for visualization load)

### 4. AI Analysis Testing

To test AI-generated event analysis, ensure Claude API key is configured:

1. Go to Settings → Configuration
2. Add your Claude API key
3. Open a finding with timeline events
4. Click on an event
5. Check the "AI Analysis" tab for:
   - Incident Summary
   - Attack Narrative
   - Entity Relationships
   - Threat Assessment
   - Investigation Priorities
   - Response Recommendations
   - Timeline Correlation

## Data Flow

```
User Action: Click event in Finding Detail Dialog
     ↓
Frontend: Call timelineApi.getEventVisualization(eventId)
     ↓
Backend: GET /api/timeline/event/{event_id}/visualization
     ↓
Backend: Parse event_id, fetch event data
     ↓
Backend: Get related events (±30 min window)
     ↓
Backend: Build entity graph from findings
     ↓
Backend: Extract MITRE techniques
     ↓
Backend: Call claude_service.generate_event_analysis() [if enabled]
     ↓
Backend: Return EventVisualizationResponse
     ↓
Frontend: Display in EventVisualizationDialog with tabs
     ↓
User: Explore incident details, copy IOCs, export report
```

## Key Files Modified/Created

### Backend
- `backend/api/timeline.py` - Added event visualization endpoint
- `services/claude_service.py` - Added event analysis method

### Frontend
- `frontend/src/components/timeline/EventVisualizationDialog.tsx` - NEW
- `frontend/src/components/findings/FindingDetailDialog.tsx` - Modified
- `frontend/src/services/api.ts` - Modified

## Dependencies

### Backend
- Existing: FastAPI, Anthropic SDK, database_data_service, graph_builder_service
- No new dependencies added

### Frontend
- Existing: Material-UI, react-force-graph-2d, vis-timeline, moment
- No new dependencies added

## Configuration Requirements

### Optional: Claude API Key
For AI-generated event analysis:
1. Get API key from https://console.anthropic.com/
2. Configure in Settings → Configuration → Claude API
3. Without API key, the feature still works but AI Analysis tab shows info message

## Known Limitations

1. **Event ID Format**: Event IDs must follow the format `{type}-{id}` (e.g., `finding-f-20260114-001`)
2. **Time Window**: Default is 30 minutes, configurable via API parameter
3. **Entity Graph**: Limited to 10 related events to prevent graph overcrowding
4. **AI Analysis**: Requires Claude API key and may take 2-5 seconds to generate
5. **Case Events**: Currently optimized for finding events; case activity events have simplified visualization

## Future Enhancements

1. Add event correlation detection (same IP, same user, etc.)
2. Add real-time event updates via WebSocket
3. Add event bookmarking/flagging
4. Add event-to-case linking from visualization dialog
5. Add collaborative event annotation
6. Add event playback mode (auto-advance through timeline)
7. Add export to STIX/IOC feeds
8. Add integration with SOAR platforms

## Troubleshooting

### Event Visualization Dialog Doesn't Open
- Check browser console for errors
- Verify event ID format is correct
- Ensure backend is running and accessible

### AI Analysis Shows "Not Available"
- Verify Claude API key is configured in Settings
- Check backend logs for API errors
- Ensure network connectivity to Anthropic API

### Timeline Section Empty
- Verify finding has events in the database
- Check backend logs for timeline API errors
- Try refreshing the finding detail dialog

### Entity Graph Not Displaying
- Ensure finding has entity_context data
- Verify GraphBuilderService is working
- Check for JavaScript errors in browser console

## Performance Considerations

- **Caching**: AI analysis is cached for 1 hour per event (future enhancement)
- **Rate Limiting**: Claude API has rate limits; consider implementing request queuing
- **Graph Rendering**: Entity graphs with >50 nodes may be slow; consider pagination
- **Timeline Events**: Limit to 100 events per finding for performance

## Security Considerations

- Event IDs are validated before database queries
- API keys are never exposed to frontend
- User input is sanitized before Claude API calls
- Export functionality is client-side only (no server-side file storage)

## Testing Results

Implementation completed successfully with:
- ✅ No linting errors
- ✅ TypeScript compilation successful
- ✅ Backend endpoint structure validated
- ✅ Frontend components structure validated
- ✅ All integration points connected

## Conclusion

The event incident visualization feature has been successfully implemented and integrated into the AI OpenSOC platform. It provides SOC analysts with comprehensive, AI-powered incident analysis directly from timeline events, enabling faster investigation and response.

