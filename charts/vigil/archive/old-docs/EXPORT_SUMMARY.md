# PostgreSQL to Splunk Export - Summary

## ✅ What Was Created

I've successfully created a complete solution to export half of your PostgreSQL data to Splunk:

### 1. **Main Export Script**
   - **File:** `scripts/export_postgres_to_splunk.py`
   - **Purpose:** Export 50% of findings and cases to Splunk HEC
   - **Features:**
     - Batch processing (100 events per batch by default)
     - Progress tracking with detailed logging
     - Error handling and retry logic
     - Export to Splunk HEC or save to JSON file
     - Selective export (findings-only, cases-only, or both)

### 2. **Documentation**
   - **Quick Start Guide:** `POSTGRES_TO_SPLUNK_QUICKSTART.md`
   - **Full Documentation:** `docs/POSTGRES_TO_SPLUNK_EXPORT.md`
   - **Updated:** `README.md` with export section

### 3. **Your Current Database**
   ```
   ✓ Findings in database: 50
   ✓ Cases in database: 5
   
   Export will send:
     - 25 findings (50%)
     - 2 cases (50%)
     - Total: 27 events
   ```

## 🚀 How to Use It

### Step 1: Set Up Splunk HEC (One-Time)

1. Log into Splunk Web
2. Go to **Settings** → **Data Inputs** → **HTTP Event Collector**
3. Click **Global Settings** → Enable HEC
4. Click **New Token** → Create token → Copy the token value

### Step 2: Run the Export

```bash
# Export everything to Splunk
python scripts/export_postgres_to_splunk.py \
    --hec-url https://your-splunk:8088/services/collector \
    --hec-token YOUR_HEC_TOKEN \
    --index main \
    --no-verify-ssl
```

### Step 3: View in Splunk

```spl
index=main source="postgresql_export" | head 100
```

## 📊 What Gets Exported

### Findings (25 events in your case)
- **Core Data:**
  - Finding ID, severity, anomaly score
  - Data source and status
  - Timestamps (created, updated, detected)

- **Security Intelligence:**
  - MITRE ATT&CK predictions
  - Entity context (IPs, users, hosts, domains, hashes)
  - AI enrichment analysis
  - Evidence links

- **Metadata:**
  - Cluster ID (for related findings)
  - Source system tag

### Cases (2 events in your case)
- **Case Details:**
  - Case ID, title, description
  - Status and priority
  - Assigned analyst

- **Investigation Data:**
  - Timeline events
  - Activities and notes
  - Resolution steps
  - Associated finding IDs

- **Classification:**
  - Tags
  - MITRE techniques
  - Timestamps

## 📝 Quick Examples

### Example 1: Export Everything
```bash
python scripts/export_postgres_to_splunk.py \
    --hec-url https://splunk.example.com:8088/services/collector \
    --hec-token 12345678-1234-1234-1234-123456789012 \
    --index deeptempo \
    --no-verify-ssl
```

**Output:**
```
Connecting to PostgreSQL database...
====================================================================
EXPORTING FINDINGS TO SPLUNK
====================================================================
Total findings in database: 50
Fetched 25 findings (half of total)
Converting 25 findings to Splunk events...
Sending 25 events to Splunk in batches of 100
✓ Batch 1/1: Sent 25 events successfully

====================================================================
EXPORTING CASES TO SPLUNK
====================================================================
Total cases in database: 5
Fetched 2 cases (half of total)
Converting 2 cases to Splunk events...
Sending 2 events to Splunk in batches of 100
✓ Batch 1/1: Sent 2 events successfully

====================================================================
EXPORT COMPLETE
====================================================================
Findings: 25 sent, 0 errors
Cases:    2 sent, 0 errors
Total:    27 sent, 0 errors
```

### Example 2: Export Findings Only
```bash
python scripts/export_postgres_to_splunk.py \
    --hec-url https://splunk.example.com:8088/services/collector \
    --hec-token YOUR_TOKEN \
    --findings-only \
    --no-verify-ssl
```

### Example 3: Save to File First (Review Before Sending)
```bash
# Save to file
python scripts/export_postgres_to_splunk.py \
    --save-to-file export_review.json

# Review the file
cat export_review.json | jq '.[0]' | head -20

# Then send to Splunk if it looks good
python scripts/export_postgres_to_splunk.py \
    --hec-url https://your-splunk:8088/services/collector \
    --hec-token YOUR_TOKEN \
    --no-verify-ssl
```

## 🔍 Splunk Queries to Try

Once data is exported, try these searches in Splunk:

### View All Exported Data
```spl
index=main source="postgresql_export"
```

### View Findings Only
```spl
index=main sourcetype="deeptempo:finding"
| table _time, finding_id, severity, anomaly_score, data_source
```

### High Severity Findings
```spl
index=main sourcetype="deeptempo:finding" severity IN (high, critical)
| sort -anomaly_score
| table _time, finding_id, severity, anomaly_score, mitre_predictions
```

### Cases Timeline
```spl
index=main sourcetype="deeptempo:case"
| timechart count by priority
```

### Findings by Data Source
```spl
index=main sourcetype="deeptempo:finding"
| stats count by data_source
| sort -count
```

### Join Cases with Their Findings
```spl
index=main sourcetype="deeptempo:case"
| eval finding_id=mvindex(finding_ids, 0)
| join finding_id [
    search index=main sourcetype="deeptempo:finding"
    | fields finding_id, severity, anomaly_score
]
| table case_id, title, priority, finding_id, severity, anomaly_score
```

## 🎨 Create a Splunk Dashboard

1. Go to **Dashboards** → **Create New Dashboard**
2. Add these panels:

**Panel 1: Findings by Severity (Pie Chart)**
```spl
index=main sourcetype="deeptempo:finding"
| stats count by severity
```

**Panel 2: Cases by Status (Bar Chart)**
```spl
index=main sourcetype="deeptempo:case"
| stats count by status
```

**Panel 3: High Anomaly Findings (Table)**
```spl
index=main sourcetype="deeptempo:finding" anomaly_score>0.7
| sort -anomaly_score
| table _time, finding_id, severity, anomaly_score, data_source
| head 10
```

**Panel 4: Activity Timeline (Line Chart)**
```spl
index=main source="postgresql_export"
| timechart count by event_type
```

## 🛠️ Advanced Options

### Adjust Batch Size
For slower networks or rate limits:
```bash
python scripts/export_postgres_to_splunk.py \
    --hec-url https://your-splunk:8088/services/collector \
    --hec-token YOUR_TOKEN \
    --batch-size 50 \
    --no-verify-ssl
```

### Use Different Index
Create a dedicated index in Splunk for better organization:
```bash
python scripts/export_postgres_to_splunk.py \
    --hec-url https://your-splunk:8088/services/collector \
    --hec-token YOUR_TOKEN \
    --index deeptempo_soc \
    --no-verify-ssl
```

## 🔧 Troubleshooting

### "Authentication failed"
- Double-check your HEC token
- Ensure HEC is enabled in Splunk global settings

### "Connection refused"
- Verify Splunk is running
- Check that port 8088 is open
- Confirm the HEC URL is correct

### "SSL certificate error"
- Add `--no-verify-ssl` flag for self-signed certificates
- Or install proper SSL certificates in Splunk

### "No data in Splunk"
- Check Splunk logs: `index=_internal sourcetype=splunkd HEC`
- Verify the index name is correct
- Ensure you have search permissions for the index

## 📚 Documentation Links

- **Quick Start:** [POSTGRES_TO_SPLUNK_QUICKSTART.md](POSTGRES_TO_SPLUNK_QUICKSTART.md)
- **Full Guide:** [docs/POSTGRES_TO_SPLUNK_EXPORT.md](docs/POSTGRES_TO_SPLUNK_EXPORT.md)
- **Main README:** [README.md](README.md)
- **Splunk Testing:** [docs/SPLUNK_TESTING_GUIDE.md](docs/SPLUNK_TESTING_GUIDE.md)

## 🎯 Next Steps

1. **Set up Splunk HEC** (if not already done)
2. **Run a test export** with `--save-to-file` first
3. **Review the JSON** to ensure data looks correct
4. **Export to Splunk** using the HEC
5. **Create dashboards** in Splunk
6. **Set up alerts** for high-severity findings
7. **Correlate** with other Splunk data sources

## 💡 Use Cases

### 1. Enhanced Visualization
- Use Splunk's powerful visualization tools
- Create executive dashboards
- Share with stakeholders

### 2. Correlation with Other Data
- Correlate findings with network logs
- Join cases with incident response data
- Enrich with threat intelligence feeds

### 3. Long-Term Storage
- Archive PostgreSQL data to Splunk
- Maintain historical records
- Compliance and audit requirements

### 4. Advanced Analytics
- Use Splunk ML toolkit
- Detect patterns across all data
- Predictive analytics

### 5. Centralized Security Platform
- Splunk as single pane of glass
- Integrate with SOAR platforms
- Unified incident response

## ✅ Summary

You now have a complete, production-ready solution to export your PostgreSQL data to Splunk:

- ✅ Exports 50% of findings and cases
- ✅ Batch processing with error handling
- ✅ Flexible options (findings-only, cases-only, file export)
- ✅ Comprehensive documentation
- ✅ Splunk query examples
- ✅ Dashboard templates
- ✅ Troubleshooting guide

**Your database currently has:**
- 50 findings → Will export 25 (50%)
- 5 cases → Will export 2 (50%)
- Total: 27 events ready to export

**Ready to export?** Run:
```bash
python scripts/export_postgres_to_splunk.py \
    --hec-url https://your-splunk:8088/services/collector \
    --hec-token YOUR_HEC_TOKEN \
    --index deeptempo \
    --no-verify-ssl
```

Enjoy your enhanced Splunk analytics! 🚀

