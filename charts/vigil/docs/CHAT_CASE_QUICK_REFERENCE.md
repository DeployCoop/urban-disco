# Chat Case Management - Quick Reference

## Quick Commands

### Adding to Cases

| What You Say | What Happens |
|--------------|--------------|
| "Add this to case-123" | Adds current finding to specified case |
| "Add f-001 to case-123" | Adds specific finding to case |
| "Add f-001, f-002, f-003 to case-123" | Bulk adds multiple findings |
| "Add this finding - it's the persistence mechanism" | Adds finding with contextual note |

### Creating Cases

| What You Say | What Happens |
|--------------|--------------|
| "Create a case called 'APT Campaign'" | Creates new case with title |
| "Create a case for lateral movement with f-001 and f-002" | Creates case with specific findings |
| "Build a kill chain case for this attack" | Creates structured case with timeline |

### Logging Activities

| What You Say | What Happens |
|--------------|--------------|
| "Note that this is T1071 C2 communication" | Adds analysis note to case |
| "Log that I isolated the affected hosts" | Records action taken |
| "Add a note - contacted user about phishing email" | Logs communication action |

### Timeline & Kill Chain

| What You Say | What Happens |
|--------------|--------------|
| "Add timeline entry - malware first seen at 10:00 UTC" | Adds chronological event |
| "This is initial access, tag T1078" | Adds timeline + MITRE technique |
| "Document lateral movement at 10:15, then exfil at 10:30" | Adds multiple timeline entries |

### Resolution Steps

| What You Say | What Happens |
|--------------|--------------|
| "Add resolution step - blocked C2 domain" | Documents remediation action |
| "Resolution: patched all affected systems" | Records resolution with result |

### Case Updates

| What You Say | What Happens |
|--------------|--------------|
| "Update case-123 status to investigating" | Changes case status |
| "Assign case-123 to me" | Assigns case to you |
| "Change priority to critical" | Updates case priority |

### Comments 🆕

| What You Say | What Happens |
|--------------|--------------|
| "Add comment - This is suspicious" | Adds comment to case |
| "Comment that user confirmed phishing" | Logs comment with context |
| "Reply to comment 5 - I agree" | Threaded reply to comment |

### Evidence 🆕

| What You Say | What Happens |
|--------------|--------------|
| "Add evidence - memory dump from host-42" | Adds evidence with chain of custody |
| "Log evidence: PCAP file showing C2 traffic" | Tracks network capture |
| "Add screenshot of malicious process" | Documents visual evidence |

### IOCs (Indicators) 🆕

| What You Say | What Happens |
|--------------|--------------|
| "Add IOC 192.168.1.5 as C2 server" | Adds IP address IOC |
| "Tag domain evil.com as malicious" | Adds domain IOC |
| "Bulk add these IPs: 10.1.1.5, 10.1.1.6" | Adds multiple IOCs |
| "Add file hash abc123... as malware" | Tracks malicious file hash |

### Tasks 🆕

| What You Say | What Happens |
|--------------|--------------|
| "Create task to analyze malware" | Adds investigation task |
| "Assign task 5 to analyst2" | Assigns task to team member |
| "Mark task 3 as completed" | Updates task status |
| "Add task: Review logs, high priority" | Creates prioritized task |

### Relationships 🆕

| What You Say | What Happens |
|--------------|--------------|
| "Link this to case-456 as related" | Links cases together |
| "Mark as duplicate of case-123" | Links as duplicate |
| "Set case-789 as parent" | Creates parent-child relationship |

### Escalations 🆕

| What You Say | What Happens |
|--------------|--------------|
| "Escalate to soc-manager" | Escalates case to management |
| "Escalate as critical - active breach" | High urgency escalation |

### Closure 🆕

| What You Say | What Happens |
|--------------|--------------|
| "Close case as resolved" | Closes with resolved status |
| "Close as false positive" | Marks as false positive |
| "Close with root cause: phishing" | Closes with full documentation |

## Activity Types

Use these activity types when logging:
- `note` - General observations
- `analysis` - Analytical findings
- `action_taken` - Actions you performed
- `investigation_step` - Investigation progress
- `communication` - Contacted users/teams
- `status_change` - Status updates

## Timeline Event Types

Use these for timeline entries:
- `attack` - Attacker actions
- `detection` - When something was detected
- `investigation` - Investigation milestones
- `response` - Response actions taken

## Common Patterns

### Pattern 1: Sequential Investigation
```
1. "Show me high severity findings"
2. "Analyze f-001"
3. "This looks suspicious - create a case"
4. "Find similar findings"
5. "Add all of these to the case"
```

### Pattern 2: Kill Chain Documentation
```
1. "Create case 'APT Lateral Movement'"
2. "Add f-001 - initial access via T1078"
3. "Add f-002 - lateral movement T1021.001"
4. "Add f-003 - credential dumping T1003"
5. "Add f-004 - exfiltration T1048"
```

### Pattern 3: Ongoing Updates
```
1. "Add activity - contacted user"
2. "Note: user confirmed clicking phishing link"
3. "Add resolution step - reset user password"
4. "Log action - isolated user's system"
5. "Update status to contained"
```

## Finding & Case ID Formats

- **Finding IDs**: `f-YYYYMMDD-XXXXXXXX`
  - Example: `f-20260121-abc12345`
- **Case IDs**: `case-YYYYMMDD-XXXXXXXX`
  - Example: `case-20260121-def67890`

## Tips

✓ **Be conversational** - Claude understands natural language
✓ **Provide context** - "Add this because..." helps with documentation
✓ **Build as you go** - Don't wait until the end to document
✓ **Use bulk operations** - Add multiple findings at once
✓ **Tag techniques** - Build the MITRE kill chain as you investigate

## Examples by Scenario

### Phishing Investigation
```
"Analyze f-001"
"Create case 'Phishing Campaign Q1' with f-001"
"Tag with T1566 phishing technique"
"User clicked link at 09:15 - add timeline entry"
"Add resolution step - blocked sender domain"
```

### Malware Analysis
```
"Get f-002 details"
"This is malware - create case 'Malware Incident'"
"Add f-003 and f-004 - same malware family"
"Tag techniques T1059, T1055, T1071"
"Resolution: quarantined files and scanned endpoints"
```

### Lateral Movement
```
"Show lateral movement findings"
"Create case with f-010, f-011, f-012"
"Timeline: 10:00 initial access, 10:15 lateral move to server-1"
"Timeline: 10:30 lateral move to server-2"
"Tag T1078, T1021.001, T1021.002"
```

### Data Exfiltration
```
"Analyze suspicious outbound traffic f-020"
"Create case 'Data Exfiltration Incident'"
"Add timeline - exfil started at 14:00 UTC"
"Tag T1048.003 exfil over alternative protocol"
"Resolution: blocked external IPs, isolated source host"
```

## Remember

🎯 **The goal**: Have a natural conversation while investigating. Claude handles the documentation.

📝 **The result**: Fully documented case with timeline, findings, MITRE mapping, and resolution steps.

⚡ **The benefit**: Focus on analysis, not paperwork.

