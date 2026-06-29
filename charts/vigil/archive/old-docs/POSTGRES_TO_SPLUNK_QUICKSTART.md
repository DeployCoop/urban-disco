# PostgreSQL to Splunk Export - Quick Start

Export half of your PostgreSQL data (findings and cases) to Splunk in 3 easy steps.

## 1. Enable Splunk HEC (One-time Setup)

In Splunk Web:
1. **Settings** → **Data Inputs** → **HTTP Event Collector**
2. Click **Global Settings** → Enable HEC
3. Click **New Token** → Create token → **Copy the token value**

Your HEC URL will be: `https://your-splunk-server:8088/services/collector`

## 2. Run the Export Script

```bash
# Make sure database is running
./start_database.sh

# Export everything (findings + cases)
python scripts/export_postgres_to_splunk.py \
    --hec-url https://your-splunk:8088/services/collector \
    --hec-token YOUR_HEC_TOKEN_HERE \
    --index main \
    --no-verify-ssl
```

**That's it!** The script will:
- Fetch 50% of findings from PostgreSQL
- Fetch 50% of cases from PostgreSQL
- Send them to Splunk in batches of 100
- Show progress as it goes

## 3. View in Splunk

Open Splunk and search:

```spl
index=main source="postgresql_export" | head 100
```

Or use these queries:

```spl
# View findings only
index=main sourcetype="deeptempo:finding"

# View cases only  
index=main sourcetype="deeptempo:case"

# High severity findings
index=main sourcetype="deeptempo:finding" severity IN (high, critical)

# Count by type
index=main source="postgresql_export" | stats count by event_type
```

## Options

```bash
# Export only findings
python scripts/export_postgres_to_splunk.py \
    --hec-url https://your-splunk:8088/services/collector \
    --hec-token YOUR_TOKEN \
    --findings-only \
    --no-verify-ssl

# Export only cases
python scripts/export_postgres_to_splunk.py \
    --hec-url https://your-splunk:8088/services/collector \
    --hec-token YOUR_TOKEN \
    --cases-only \
    --no-verify-ssl

# Save to file instead (for review first)
python scripts/export_postgres_to_splunk.py \
    --save-to-file export.json
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Authentication failed" | Check your HEC token is correct |
| "Connection refused" | Ensure Splunk HEC is enabled and port 8088 is open |
| "No findings to export" | Check you have data: `psql -d deeptempo_soc -c "SELECT COUNT(*) FROM findings;"` |
| SSL certificate errors | Use `--no-verify-ssl` flag (if self-signed cert) |

## What Gets Exported?

### Findings (50% of total)
- Finding IDs, severity, anomaly scores
- MITRE ATT&CK predictions
- Entity context (IPs, users, hosts, etc.)
- AI enrichment analysis
- Evidence links

### Cases (50% of total)
- Case details (title, description, priority)
- Status and assignee
- Timeline and activities
- Associated finding IDs
- MITRE techniques

## Full Documentation

For detailed information, see:
- **[Full Export Guide](docs/POSTGRES_TO_SPLUNK_EXPORT.md)** - Complete documentation
- **[Splunk Integration Docs](docs/INTEGRATIONS.md)** - General Splunk integration info

## Advanced: Create a Splunk Dashboard

1. In Splunk, go to **Dashboards** → **Create New Dashboard**
2. Add panels with these queries:

**Findings by Severity (Pie Chart)**
```spl
index=main sourcetype="deeptempo:finding" | stats count by severity
```

**Case Status Timeline (Area Chart)**
```spl
index=main sourcetype="deeptempo:case" | timechart count by status
```

**Top MITRE Techniques (Table)**
```spl
index=main sourcetype="deeptempo:finding" 
| spath mitre_predictions{} 
| stats count by mitre_predictions{} 
| sort -count | head 10
```

Save your dashboard and share with your team!

