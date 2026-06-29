#!/usr/bin/env python3
"""
Test Splunk and Claude integration with generated test data.

This script:
1. Generates test security data
2. Optionally sends it to Splunk
3. Creates test findings and cases
4. Enriches cases with Splunk data
5. Uses Claude to analyze the enriched data
"""

import os
import sys
import json
import logging
import argparse
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.splunk_service import SplunkService
from services.splunk_enrichment_service import SplunkEnrichmentService
from services.claude_service import ClaudeService
from services.database_data_service import DatabaseDataService
from scripts.generate_splunk_test_data import SplunkTestDataGenerator
from core.config import get_integration_config

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_test_case_from_events(data_service: DatabaseDataService, 
                                events: list) -> tuple:
    """
    Create a test case and findings from generated events.
    
    Returns:
        Tuple of (case_id, finding_ids)
    """
    logger.info("Creating test case and findings...")
    
    # Group events by attack type
    attack_types = {}
    for event in events:
        attack_type = event.get('category', 'Unknown')
        if attack_type not in attack_types:
            attack_types[attack_type] = []
        attack_types[attack_type].append(event)
    
    # Create findings for each attack type
    finding_ids = []
    
    for attack_type, type_events in attack_types.items():
        if len(type_events) == 0:
            continue
        
        # Extract IOCs from events
        ips = set()
        domains = set()
        usernames = set()
        hostnames = set()
        hashes = set()
        
        for event in type_events:
            if event.get('src_ip'):
                ips.add(event['src_ip'])
            if event.get('dest_ip'):
                ips.add(event['dest_ip'])
            if event.get('dest_domain'):
                domains.add(event['dest_domain'])
            if event.get('user'):
                usernames.add(event['user'])
            if event.get('host'):
                hostnames.add(event['host'])
            if event.get('file_hash_md5'):
                hashes.add(event['file_hash_md5'])
            if event.get('file_hash_sha256'):
                hashes.add(event['file_hash_sha256'])
        
        # Get severity
        severities = [e.get('severity', 'medium') for e in type_events]
        severity = 'critical' if 'critical' in severities else ('high' if 'high' in severities else 'medium')
        
        # Create finding
        finding = {
            "title": f"{attack_type} Activity Detected",
            "description": f"Test data: {len(type_events)} {attack_type} events detected",
            "severity": severity,
            "data_source": "test_data",
            "status": "open",
            "entity_context": {
                "src_ip": list(ips)[:5] if ips else [],
                "dest_domain": list(domains)[:5] if domains else [],
                "user": list(usernames)[:5] if usernames else [],
                "host": list(hostnames)[:5] if hostnames else [],
                "file_hash": list(hashes)[:3] if hashes else [],
            },
            "mitre_attack": {
                "tactics": [type_events[0].get('mitre_tactic')] if type_events else [],
                "techniques": [type_events[0].get('mitre_technique')] if type_events else [],
            },
            "event_count": len(type_events),
            "first_seen": min(e['_time'] for e in type_events),
            "last_seen": max(e['_time'] for e in type_events),
        }
        
        finding_id = data_service.create_finding(finding)
        if finding_id:
            finding_ids.append(finding_id)
            logger.info(f"Created finding {finding_id} for {attack_type}")
    
    # Create case
    case_data = {
        "title": "Multi-Stage Attack Campaign - Test Data",
        "description": """Comprehensive test case for Splunk and Claude integration.

This case contains multiple attack types including:
- Brute force authentication attempts
- Malware infections
- Command and control traffic
- Data exfiltration
- Privilege escalation
- Lateral movement
- Network reconnaissance

Use this case to test the Splunk enrichment and Claude analysis capabilities.""",
        "priority": "critical",
        "status": "open",
        "finding_ids": finding_ids,
        "tags": ["test_data", "multi_stage_attack", "splunk_integration"],
    }
    
    case_id = data_service.create_case(case_data)
    logger.info(f"Created case {case_id} with {len(finding_ids)} findings")
    
    return case_id, finding_ids


def test_splunk_connection(config: dict) -> SplunkService:
    """Test Splunk connection."""
    logger.info("Testing Splunk connection...")
    
    splunk = SplunkService(
        server_url=config.get('url'),
        username=config.get('username'),
        password=config.get('password'),
        verify_ssl=config.get('verify_ssl', False)
    )
    
    success, message = splunk.test_connection()
    if success:
        logger.info(f"✓ Splunk connection successful: {message}")
    else:
        logger.error(f"✗ Splunk connection failed: {message}")
        sys.exit(1)
    
    return splunk


def main():
    """Main function."""
    parser = argparse.ArgumentParser(
        description="Test Splunk and Claude integration"
    )
    parser.add_argument(
        "--generate-data",
        action="store_true",
        help="Generate new test data"
    )
    parser.add_argument(
        "--send-to-splunk",
        action="store_true",
        help="Send generated data to Splunk HEC"
    )
    parser.add_argument(
        "--hec-url",
        help="Splunk HEC URL"
    )
    parser.add_argument(
        "--hec-token",
        help="Splunk HEC token"
    )
    parser.add_argument(
        "--create-case",
        action="store_true",
        help="Create test case and findings"
    )
    parser.add_argument(
        "--enrich-case",
        help="Enrich existing case by case ID"
    )
    parser.add_argument(
        "--lookback-hours",
        type=int,
        default=168,
        help="Hours to look back in Splunk (default: 168 = 7 days)"
    )
    parser.add_argument(
        "--use-existing-data",
        help="Use existing test data JSON file"
    )
    
    args = parser.parse_args()
    
    # Generate test data
    events = []
    if args.generate_data or args.send_to_splunk:
        logger.info("Generating test data...")
        generator = SplunkTestDataGenerator()
        events = generator.generate_all_test_data()
        
        # Save to file
        output_file = "splunk_test_data.json"
        generator.save_to_file(events, output_file)
        logger.info(f"Saved {len(events)} events to {output_file}")
        
        # Send to Splunk HEC if requested
        if args.send_to_splunk:
            if not args.hec_url or not args.hec_token:
                logger.error("--hec-url and --hec-token required for --send-to-splunk")
                sys.exit(1)
            
            generator.send_to_splunk_hec(
                events,
                args.hec_url,
                args.hec_token,
                index="main",
                verify_ssl=False
            )
    
    # Load existing data if specified
    elif args.use_existing_data:
        logger.info(f"Loading test data from {args.use_existing_data}")
        with open(args.use_existing_data, 'r') as f:
            events = json.load(f)
        logger.info(f"Loaded {len(events)} events")
    
    # Create test case
    case_id = None
    if args.create_case and events:
        data_service = DatabaseDataService()
        case_id, finding_ids = create_test_case_from_events(data_service, events)
        logger.info(f"Created case: {case_id}")
        logger.info(f"Created findings: {finding_ids}")
    
    # Enrich case
    if args.enrich_case or case_id:
        target_case_id = args.enrich_case or case_id
        
        logger.info(f"Enriching case {target_case_id}...")
        
        # Get Splunk configuration
        splunk_config = get_integration_config('splunk')
        if not splunk_config:
            logger.error("Splunk not configured. Set SPLUNK_URL, SPLUNK_USERNAME, SPLUNK_PASSWORD in .env")
            sys.exit(1)
        
        # Test connection
        splunk = test_splunk_connection(splunk_config)
        
        # Check Claude
        claude = ClaudeService(use_mcp_tools=False)
        if not claude.has_api_key():
            logger.warning("Claude API key not set. Set ANTHROPIC_API_KEY in .env")
            logger.warning("Proceeding without AI analysis...")
        
        # Create enrichment service
        enrichment_service = SplunkEnrichmentService(splunk, claude)
        
        # Enrich case
        logger.info("Starting case enrichment process...")
        result = enrichment_service.enrich_case(
            target_case_id,
            lookback_hours=args.lookback_hours
        )
        
        if result.get('success'):
            logger.info("✓ Case enrichment successful!")
            
            # Print summary
            summary = result.get('splunk_data', {}).get('summary', {})
            logger.info(f"\nEnrichment Summary:")
            logger.info(f"- Total Splunk events: {summary.get('total_events', 0)}")
            logger.info(f"- IPs queried: {summary.get('ips_queried', 0)}")
            logger.info(f"- Domains queried: {summary.get('domains_queried', 0)}")
            logger.info(f"- Hashes queried: {summary.get('hashes_queried', 0)}")
            logger.info(f"- Usernames queried: {summary.get('usernames_queried', 0)}")
            logger.info(f"- Hostnames queried: {summary.get('hostnames_queried', 0)}")
            
            # Print Claude analysis (first 500 chars)
            analysis = result.get('claude_analysis', '')
            if analysis and analysis != "AI analysis not available (API key not configured)":
                logger.info(f"\nClaude Analysis (preview):")
                logger.info(analysis[:500] + "..." if len(analysis) > 500 else analysis)
                
                # Save full analysis
                analysis_file = f"claude_analysis_{target_case_id}.txt"
                with open(analysis_file, 'w') as f:
                    f.write(analysis)
                logger.info(f"\nFull analysis saved to: {analysis_file}")
            
            # Save full enrichment result
            result_file = f"enrichment_result_{target_case_id}.json"
            with open(result_file, 'w') as f:
                json.dump(result, f, indent=2)
            logger.info(f"Full enrichment result saved to: {result_file}")
        
        else:
            logger.error(f"✗ Case enrichment failed: {result.get('error')}")
            sys.exit(1)
    
    logger.info("\n✓ Test completed successfully!")
    
    # Print next steps
    if not args.enrich_case and not args.create_case:
        logger.info("""
Next steps:
1. Generate and send test data to Splunk:
   python scripts/test_splunk_claude_integration.py --generate-data --send-to-splunk \\
       --hec-url https://your-splunk:8088/services/collector \\
       --hec-token your-hec-token

2. Create test case from generated data:
   python scripts/test_splunk_claude_integration.py --use-existing-data splunk_test_data.json --create-case

3. Enrich case with Splunk and Claude:
   python scripts/test_splunk_claude_integration.py --enrich-case <case_id>

Or do it all at once:
   python scripts/test_splunk_claude_integration.py --generate-data --create-case --lookback-hours 24
""")


if __name__ == "__main__":
    main()

