# Chat-Driven Case Management - Implementation Summary

## Overview

The AI-OpenSOC platform now supports **automatic case building and management through natural language chat**. When investigating security incidents, analysts can simply tell Claude what to do (e.g., "add this to case XYZ") and Claude will automatically handle all the case management details.

## What Was Implemented

### 1. Enhanced MCP Tools (`tools/deeptempo_findings.py`)

Added powerful case management tools that Claude can call:

#### New Tools

1. **`add_case_activity`** - Log investigation activities and notes
   - Supports activity types: note, action_taken, investigation_step, analysis, communication
   - Automatically timestamps all activities
   - Stores additional context in details field

2. **`add_case_timeline_entry`** - Build chronological attack timelines
   - Documents when events occurred (attack, detection, investigation, response)
   - Automatically sorts timeline by timestamp
   - Essential for kill chain documentation

3. **`add_case_mitre_techniques`** - Tag MITRE ATT&CK techniques
   - Accumulates techniques as investigation progresses
   - Deduplicates automatically
   - Builds complete TTP picture

4. **`add_resolution_step`** - Document remediation actions
   - Tracks what was done, the action taken, and the result
   - Creates audit trail of response efforts
   - Timestamped for compliance

5. **`bulk_add_findings_to_case`** - Add multiple findings at once
   - Efficient batch operations
   - Automatically logs bulk additions as activities
   - Returns success/failure counts

6. **`create_case_from_killchain`** - Structured case creation for attack campaigns
   - Creates case with findings organized by kill chain stage
   - Automatically builds timeline from stages
   - Tags all MITRE techniques at once
   - Generates initial activity log

### 2. Enhanced Claude System Prompt (`services/claude_service.py`)

Updated Claude's system prompt with comprehensive case management instructions:

#### New System Prompt Section: `<case_management_capabilities>`

- **Proactive Action**: Claude now automatically performs case management tasks when user intent is clear
- **Context Awareness**: Claude tracks which findings/cases are being discussed
- **Natural Language Understanding**: Interprets various phrasings of the same intent
- **Confirmation Pattern**: Claude performs actions and confirms what was done

#### Key Behaviors

- Automatically adds findings to cases when user says "add this to case XYZ"
- Creates cases when user identifies attack campaigns
- Logs notes and activities from casual conversation
- Builds timelines as user describes attack progression
- Tags MITRE techniques when mentioned
- Documents resolution steps from user's actions

### 3. Comprehensive Documentation

Created three documentation resources:

1. **`docs/CHAT_CASE_MANAGEMENT.md`** (Full Guide)
   - Detailed explanation of all capabilities
   - Example workflows for common scenarios
   - Technical architecture details
   - Troubleshooting section
   - Best practices

2. **`docs/CHAT_CASE_QUICK_REFERENCE.md`** (Quick Reference)
   - Command quick reference table
   - Common patterns
   - Tips and examples
   - Scenario-based guides

3. **`scripts/demo_chat_case_management.py`** (Demo Script)
   - Interactive demonstration
   - Shows example interactions
   - Tests the functionality
   - Educational tool for users

## How It Works

### Architecture

```
User's Natural Language Prompt
          ↓
Claude (System Prompt Guides Interpretation)
          ↓
Intent Recognition ("add to case" → add_finding_to_case tool)
          ↓
MCP Tool Selection & Parameter Extraction
          ↓
MCP Server (deeptempo-findings)
          ↓
Database Service (DatabaseDataService)
          ↓
PostgreSQL Database
          ↓
Confirmation Message to User
```

### Example Flow

```
User: "Add finding f-001 to case-123 - it shows lateral movement"

Claude's Internal Process:
1. Recognizes intent: Add finding to case
2. Extracts parameters:
   - case_id: case-123
   - finding_id: f-001
   - context: "shows lateral movement"
3. Selects tool: deeptempo-findings_add_finding_to_case
4. Executes tool call
5. Sees success response
6. Optionally adds activity noting the context
7. Responds to user with confirmation

Claude: "✓ Added f-001 to case-123
        ✓ Logged activity: Finding shows lateral movement pattern
        The case now has 3 findings total."
```

## Key Features

### 1. Natural Language Interface

Users don't need to learn commands or syntax. Examples of natural phrases that work:

- "Add this to case XYZ"
- "Create a case for this attack campaign"
- "Log that I've isolated the affected hosts"
- "This is T1071 C2 communication"
- "Add timeline entry - malware first seen at 10:00"
- "Note: user confirmed clicking phishing link"

### 2. Context Awareness

Claude maintains context during conversation:
- Remembers which finding is being discussed
- Tracks the current case being worked on
- References previous analysis in the conversation
- Builds on earlier observations

### 3. Automatic Documentation

Everything is logged automatically:
- Finding additions → Activities
- User notes → Activities
- Timeline observations → Timeline entries
- MITRE techniques → Technique tags
- Resolution actions → Resolution steps

### 4. Structured Data Generation

Cases created through chat contain:
- Complete finding lists
- Chronological timeline
- MITRE ATT&CK kill chain
- Investigation activities log
- Resolution steps documentation

### 5. Parallel Operations

Claude can perform multiple operations simultaneously:
- Add several findings at once
- Add timeline entry + tag techniques + log activity
- Update case details while adding findings

## Use Cases

### 1. Real-Time Investigation

As an analyst investigates, they describe what they're finding and Claude documents it:

```
Analyst: "I'm seeing RDP connections from 10.50.1.5 to multiple servers"
Claude: [Searches for related findings, shows results]
Analyst: "Create a case - this is lateral movement"
Claude: ✓ Created case, added findings, tagged T1021.001
Analyst: "User account jsmith was used"
Claude: ✓ Added activity noting compromised account jsmith
```

### 2. Kill Chain Documentation

Analyst identifies multi-stage attack and Claude structures it:

```
Analyst: "Initial access via phishing, then lateral movement, then data exfil"
Claude: [Creates structured case with 3 timeline stages, tags T1566, T1021, T1048]
```

### 3. Post-Investigation Documentation

After resolving incident, analyst summarizes actions:

```
Analyst: "I've blocked the C2 domain, reset compromised passwords, and patched systems"
Claude: ✓ Added 3 resolution steps with timestamps and details
```

### 4. Collaborative Investigation

Multiple analysts working same case can use chat to add their findings:

```
Analyst 1: "Add f-100 to the APT case - shows persistence"
Analyst 2: "Add f-101 and f-102 - same malware family"
```

All actions logged with timestamps for full audit trail.

## Technical Implementation Details

### MCP Tool Format

All tools follow this pattern:

```python
@mcp.tool()
def tool_name(param1: str, param2: Optional[str] = None, **kwargs) -> str:
    """Tool description for Claude."""
    try:
        # Implementation
        return jdump({"success": True, "data": result})
    except Exception as e:
        return jdump({"error": str(e)})
```

### Database Integration

All tools use `DatabaseService` for database operations:
- Automatic connection management
- Transaction support
- Error handling
- Support for PostgreSQL and JSON fallback

### Error Handling

Robust error handling at multiple levels:
- Tool level: Try/except with error JSON responses
- MCP server level: Connection error handling
- Database level: Transaction rollback on errors
- Claude level: Graceful failure with error messages to user

### Performance

Optimizations included:
- Parallel tool calls when possible
- Bulk operations for multiple findings
- Cached tool definitions
- Efficient database queries

## Integration Points

### Frontend

Chat interface (`ClaudeDrawer.tsx`) already supports:
- Streaming responses
- Tool call visualization
- Multi-turn conversations
- Message history

No frontend changes needed - feature works immediately.

### Backend API

Case management API endpoints (`backend/api/cases.py`) provide:
- REST endpoints for programmatic access
- Same functionality available via API
- Web UI can call same endpoints

### Database

Database models (`database/models.py`) support:
- Activities array (JSONB)
- Timeline array (JSONB)
- Resolution steps array (JSONB)
- MITRE techniques array
- All case metadata

## Benefits

### For Analysts

1. **Faster Investigation**: Focus on analysis, not paperwork
2. **Better Documentation**: Everything logged automatically
3. **Complete Cases**: No missing information or gaps
4. **Natural Workflow**: Investigate naturally, Claude handles rest

### For SOC Operations

1. **Standardized Cases**: Consistent case structure
2. **Complete Audit Trail**: Every action timestamped and logged
3. **MITRE Mapping**: Kill chains documented automatically
4. **Knowledge Capture**: Investigation rationale preserved

### For Compliance

1. **Full Audit Logs**: Who did what and when
2. **Timeline Documentation**: Chronological record of events
3. **Resolution Tracking**: Actions taken and results
4. **Retention**: All data stored in database

## Testing

Run the demo script to test functionality:

```bash
python3 scripts/demo_chat_case_management.py
```

Or test in chat interface with natural language:

```
"Show me critical findings"
"Create a case for the lateral movement attack"
"Add findings f-001, f-002, f-003"
"Log that I've isolated the affected systems"
```

## Future Enhancements

Potential additions:

1. **Smart Case Suggestions**: Claude suggests creating case when patterns detected
2. **Automatic Correlation**: Claude finds related findings automatically
3. **Case Templates**: Pre-defined case structures for common scenarios
4. **Integration Actions**: Claude can trigger response actions (block IP, etc.)
5. **Report Generation**: Auto-generate incident reports from cases
6. **Case Linking**: Automatically link related cases

## Rollout Plan

1. ✅ **Phase 1**: Core implementation (Complete)
2. ✅ **Phase 2**: Documentation (Complete)
3. **Phase 3**: User training and demos
4. **Phase 4**: Feedback collection
5. **Phase 5**: Refinements based on usage

## Maintenance

### Adding New Tools

To add new case management capabilities:

1. Add function to `tools/deeptempo_findings.py`
2. Use `@mcp.tool()` decorator
3. Follow existing error handling patterns
4. Return JSON with `jdump()`
5. Update documentation

### Updating System Prompt

To modify Claude's behavior:

1. Edit `services/claude_service.py`
2. Update `_get_default_system_prompt()` method
3. Test with various natural language inputs
4. Document any behavior changes

## Support

For issues or questions:

1. Check documentation: `docs/CHAT_CASE_MANAGEMENT.md`
2. Review quick reference: `docs/CHAT_CASE_QUICK_REFERENCE.md`
3. Run demo script: `scripts/demo_chat_case_management.py`
4. Check MCP server logs for tool execution errors
5. Review backend logs for database errors

## Conclusion

The chat-driven case management feature represents a significant advancement in SOC automation. By allowing analysts to have natural conversations while investigating, and having Claude automatically handle all the case management tasks, we've removed significant friction from the investigation process.

**Result**: Analysts can focus 100% on analysis and threat hunting, while comprehensive case documentation happens automatically in the background.

---

**Implementation Date**: January 21, 2026  
**Version**: 1.0  
**Status**: Production Ready

