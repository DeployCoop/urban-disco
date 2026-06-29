"""Timeline service for converting findings and cases to Timesketch timeline format."""

import logging
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class TimelineService:
    """Service for transforming DeepTempo data to Timesketch timeline format."""
    
    @staticmethod
    def findings_to_timeline_events(findings: List[Dict]) -> List[Dict]:
        """
        Convert findings to Timesketch timeline events.
        
        Args:
            findings: List of finding dictionaries
        
        Returns:
            List of timeline event dictionaries.
        """
        events = []
        
        for finding in findings:
            event = TimelineService._finding_to_event(finding)
            if event:
                events.append(event)
        
        return events
    
    @staticmethod
    def _finding_to_event(finding: Dict) -> Optional[Dict]:
        """
        Convert a single finding to a timeline event.
        
        Args:
            finding: Finding dictionary
        
        Returns:
            Timeline event dictionary or None if invalid.
        """
        try:
            # Extract timestamp
            timestamp = finding.get('timestamp', '')
            if not timestamp:
                logger.warning(f"Finding {finding.get('finding_id')} has no timestamp")
                return None
            
            # Parse timestamp (handle ISO format)
            try:
                if 'T' in timestamp:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                else:
                    dt = datetime.fromisoformat(timestamp)
                timestamp_str = dt.strftime('%Y-%m-%dT%H:%M:%S')
            except Exception:
                timestamp_str = timestamp
            
            # Build message
            finding_id = finding.get('finding_id', 'Unknown')
            severity = finding.get('severity', 'unknown')
            data_source = finding.get('data_source', 'unknown')
            message = f"{severity.upper()} finding: {data_source} anomaly detected"
            
            # Get entity context for additional details
            entity_context = finding.get('entity_context') or {}
            if entity_context:
                src_ip = entity_context.get('src_ip')
                dst_ip = entity_context.get('dst_ip')
                hostname = entity_context.get('hostname')
                
                if src_ip or dst_ip or hostname:
                    details = []
                    if src_ip:
                        details.append(f"src: {src_ip}")
                    if dst_ip:
                        details.append(f"dst: {dst_ip}")
                    if hostname:
                        details.append(f"host: {hostname}")
                    if details:
                        message += f" ({', '.join(details)})"
            
            # Build event
            event = {
                'timestamp': timestamp_str,
                'timestamp_desc': 'Event Time',
                'message': message,
                'source': 'DeepTempo Finding',
                'source_short': 'DT',
                'data_type': 'security:finding',
                'finding_id': finding_id,
                'severity': severity,
                'data_source': data_source,
                'anomaly_score': finding.get('anomaly_score', 0),
            }
            
            # Add MITRE techniques
            mitre_preds = finding.get('mitre_predictions') or {}
            if mitre_preds:
                top_techniques = sorted(mitre_preds.items(), key=lambda x: float(x[1] or 0), reverse=True)[:5]
                event['mitre_techniques'] = [t[0] for t in top_techniques]
                event['mitre_techniques_str'] = ', '.join([f"{t[0]} ({float(t[1] or 0):.2f})" for t in top_techniques])
            
            # Add cluster ID
            cluster_id = finding.get('cluster_id')
            if cluster_id:
                event['cluster_id'] = cluster_id
            
            # Add entity context as separate fields for searchability
            if entity_context:
                for key, value in entity_context.items():
                    if value:
                        event[f'entity_{key}'] = str(value)
            
            # Add tags based on severity and techniques
            tags = [f"severity:{severity}"]
            if cluster_id:
                tags.append(f"cluster:{cluster_id}")
            if mitre_preds:
                for tech in list(mitre_preds.keys())[:3]:
                    tags.append(f"mitre:{tech}")
            
            event['tag'] = tags
            
            return event
        
        except Exception as e:
            logger.error(f"Error converting finding to event: {e}")
            return None
    
    @staticmethod
    def case_to_timeline_events(case: Dict, findings: List[Dict]) -> List[Dict]:
        """
        Convert a case and its findings to timeline events.
        
        Args:
            case: Case dictionary
            findings: List of related findings
        
        Returns:
            List of timeline events including case metadata events.
        """
        events = []
        
        # Add case creation event
        case_id = case.get('case_id', 'Unknown')
        case_title = case.get('title', 'Untitled Case')
        created_at = case.get('created_at', '')
        
        if created_at:
            try:
                if 'T' in created_at:
                    dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    dt = datetime.fromisoformat(created_at)
                timestamp_str = dt.strftime('%Y-%m-%dT%H:%M:%S')
            except Exception:
                timestamp_str = created_at
            
            case_event = {
                'timestamp': timestamp_str,
                'timestamp_desc': 'Case Created',
                'message': f"Case created: {case_title}",
                'source': 'DeepTempo Case',
                'source_short': 'DT-CASE',
                'data_type': 'security:case',
                'case_id': case_id,
                'case_title': case_title,
                'case_status': case.get('status', 'unknown'),
                'case_priority': case.get('priority', 'unknown'),
                'tag': ['case:created', f"priority:{case.get('priority', 'unknown')}"]
            }
            events.append(case_event)
        
        # Add timeline events from case
        timeline = case.get('timeline', [])
        for timeline_event in timeline:
            event_timestamp = timeline_event.get('timestamp', '')
            if event_timestamp:
                try:
                    if 'T' in event_timestamp:
                        dt = datetime.fromisoformat(event_timestamp.replace('Z', '+00:00'))
                    else:
                        dt = datetime.fromisoformat(event_timestamp)
                    timestamp_str = dt.strftime('%Y-%m-%dT%H:%M:%S')
                except Exception:
                    timestamp_str = event_timestamp
                
                event = {
                    'timestamp': timestamp_str,
                    'timestamp_desc': 'Case Event',
                    'message': timeline_event.get('event', ''),
                    'source': 'DeepTempo Case Timeline',
                    'source_short': 'DT-CASE',
                    'data_type': 'security:case:event',
                    'case_id': case_id,
                    'tag': ['case:timeline']
                }
                events.append(event)
        
        # Add finding events
        finding_events = TimelineService.findings_to_timeline_events(findings)
        for event in finding_events:
            event['case_id'] = case_id
            if 'tag' not in event:
                event['tag'] = []
            event['tag'].append(f"case:{case_id}")
        
        events.extend(finding_events)
        
        return events
    
    @staticmethod
    def create_event_timeline(findings: List[Dict], case: Optional[Dict] = None) -> Dict:
        """
        Create a complete timeline from findings and optional case.
        
        Args:
            findings: List of findings
            case: Optional case dictionary
        
        Returns:
            Timeline dictionary with events and metadata.
        """
        if case:
            events = TimelineService.case_to_timeline_events(case, findings)
            timeline_name = f"Case: {case.get('title', 'Untitled')}"
        else:
            events = TimelineService.findings_to_timeline_events(findings)
            timeline_name = f"Findings Timeline ({len(findings)} findings)"
        
        # Sort events by timestamp
        events.sort(key=lambda x: x.get('timestamp', ''))
        
        timeline = {
            'name': timeline_name,
            'events': events,
            'event_count': len(events),
            'time_range': TimelineService._get_time_range(events)
        }
        
        return timeline
    
    @staticmethod
    def _get_time_range(events: List[Dict]) -> Dict:
        """Get time range from events."""
        if not events:
            return {}
        
        timestamps = [e.get('timestamp', '') for e in events if e.get('timestamp')]
        if not timestamps:
            return {}
        
        timestamps.sort()
        return {
            'start': timestamps[0],
            'end': timestamps[-1],
            'duration_seconds': 0  # Could calculate if needed
        }
    
    @staticmethod
    def enrich_event_with_context(event: Dict, finding: Dict) -> Dict:
        """
        Enrich a timeline event with additional finding context.
        
        Args:
            event: Timeline event dictionary
            finding: Finding dictionary
        
        Returns:
            Enriched event dictionary.
        """
        # Add additional context fields
        entity_context = finding.get('entity_context', {})
        if entity_context:
            event['entity_context'] = entity_context
        
        # Add evidence links
        evidence_links = finding.get('evidence_links', [])
        if evidence_links:
            event['evidence_links'] = evidence_links
        
        return event
    
    @staticmethod
    def generate_timeline_summary(events: List[Dict]) -> Dict:
        """
        Generate a summary of timeline events.
        
        Args:
            events: List of timeline events
        
        Returns:
            Summary dictionary with statistics.
        """
        if not events:
            return {
                'total_events': 0,
                'severity_breakdown': {},
                'data_source_breakdown': {},
                'time_range': {}
            }
        
        severity_counts = {}
        source_counts = {}
        
        for event in events:
            severity = event.get('severity', 'unknown')
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
            
            source = event.get('data_source', 'unknown')
            source_counts[source] = source_counts.get(source, 0) + 1
        
        return {
            'total_events': len(events),
            'severity_breakdown': severity_counts,
            'data_source_breakdown': source_counts,
            'time_range': TimelineService._get_time_range(events)
        }
    
    @staticmethod
    def filter_events_by_timeframe(events: List[Dict], start: str, end: str) -> List[Dict]:
        """
        Filter events by time frame.
        
        Args:
            events: List of timeline events
            start: Start timestamp (ISO format)
            end: End timestamp (ISO format)
        
        Returns:
            Filtered list of events.
        """
        try:
            start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
        except Exception:
            logger.warning(f"Invalid time frame: {start} to {end}")
            return events
        
        filtered = []
        for event in events:
            event_timestamp = event.get('timestamp', '')
            if not event_timestamp:
                continue
            
            try:
                if 'T' in event_timestamp:
                    event_dt = datetime.fromisoformat(event_timestamp.replace('Z', '+00:00'))
                else:
                    event_dt = datetime.fromisoformat(event_timestamp)
                
                if start_dt <= event_dt <= end_dt:
                    filtered.append(event)
            except Exception:
                continue
        
        return filtered
    
    @staticmethod
    def correlate_events(events: List[Dict]) -> List[Dict]:
        """
        Correlate events to identify relationships.
        
        Args:
            events: List of timeline events
        
        Returns:
            List of correlated event groups.
        """
        # Group events by common attributes
        correlations = []
        
        # Group by IP addresses
        ip_groups = {}
        for event in events:
            src_ip = event.get('entity_src_ip')
            dst_ip = event.get('entity_dst_ip')
            
            if src_ip:
                if src_ip not in ip_groups:
                    ip_groups[src_ip] = []
                ip_groups[src_ip].append(event)
            
            if dst_ip:
                if dst_ip not in ip_groups:
                    ip_groups[dst_ip] = []
                ip_groups[dst_ip].append(event)
        
        # Create correlation groups
        for ip, ip_events in ip_groups.items():
            if len(ip_events) > 1:
                correlations.append({
                    'type': 'ip_correlation',
                    'key': ip,
                    'events': ip_events,
                    'count': len(ip_events)
                })
        
        # Group by cluster
        cluster_groups = {}
        for event in events:
            cluster_id = event.get('cluster_id')
            if cluster_id:
                if cluster_id not in cluster_groups:
                    cluster_groups[cluster_id] = []
                cluster_groups[cluster_id].append(event)
        
        for cluster_id, cluster_events in cluster_groups.items():
            if len(cluster_events) > 1:
                correlations.append({
                    'type': 'cluster_correlation',
                    'key': cluster_id,
                    'events': cluster_events,
                    'count': len(cluster_events)
                })
        
        return correlations
    
    @staticmethod
    def advanced_correlation(events: List[Dict]) -> Dict:
        """
        Perform advanced correlation analysis on events.
        
        Args:
            events: List of timeline events
        
        Returns:
            Dictionary with correlation analysis results.
        """
        from collections import defaultdict
        from datetime import datetime, timedelta
        
        correlations = {
            'ip_networks': {},
            'temporal_clusters': [],
            'attack_chains': [],
            'entity_relationships': [],
            'mitre_patterns': defaultdict(list),
            'severity_timeline': [],
            'geographic_correlation': []
        }
        
        # Temporal clustering (events within time windows)
        if events:
            # Sort by timestamp
            sorted_events = sorted(events, key=lambda x: x.get('timestamp', ''))
            
            # Group events within 5-minute windows
            current_window = []
            window_start = None
            
            for event in sorted_events:
                event_time = event.get('timestamp', '')
                if not event_time:
                    continue
                
                try:
                    if 'T' in event_time:
                        event_dt = datetime.fromisoformat(event_time.replace('Z', '+00:00'))
                    else:
                        event_dt = datetime.fromisoformat(event_time)
                    
                    if window_start is None:
                        window_start = event_dt
                        current_window = [event]
                    else:
                        if (event_dt - window_start) <= timedelta(minutes=5):
                            current_window.append(event)
                        else:
                            if len(current_window) > 1:
                                correlations['temporal_clusters'].append({
                                    'start_time': window_start.isoformat(),
                                    'end_time': event_dt.isoformat(),
                                    'events': current_window,
                                    'count': len(current_window)
                                })
                            window_start = event_dt
                            current_window = [event]
                except Exception:
                    continue
            
            # Add last window
            if len(current_window) > 1:
                correlations['temporal_clusters'].append({
                    'start_time': window_start.isoformat() if window_start else '',
                    'end_time': sorted_events[-1].get('timestamp', ''),
                    'events': current_window,
                    'count': len(current_window)
                })
        
        # IP network analysis
        ip_networks = defaultdict(list)
        for event in events:
            src_ip = event.get('entity_src_ip')
            dst_ip = event.get('entity_dst_ip')
            
            if src_ip:
                # Extract network (first 3 octets)
                network = '.'.join(src_ip.split('.')[:3]) + '.0/24'
                ip_networks[network].append(event)
            
            if dst_ip:
                network = '.'.join(dst_ip.split('.')[:3]) + '.0/24'
                ip_networks[network].append(event)
        
        for network, network_events in ip_networks.items():
            if len(network_events) > 1:
                correlations['ip_networks'][network] = {
                    'events': network_events,
                    'count': len(network_events)
                }
        
        # MITRE technique patterns
        for event in events:
            techniques = event.get('mitre_techniques', [])
            for technique in techniques:
                correlations['mitre_patterns'][technique].append(event)
        
        # Attack chain detection (sequence of related MITRE techniques)
        technique_sequences = []
        for event in events:
            techniques = event.get('mitre_techniques', [])
            if techniques:
                technique_sequences.append({
                    'timestamp': event.get('timestamp', ''),
                    'techniques': techniques,
                    'event': event
                })
        
        # Find common sequences
        if len(technique_sequences) > 1:
            # Group by technique combinations
            sequence_groups = defaultdict(list)
            for seq in technique_sequences:
                key = tuple(sorted(seq['techniques']))
                sequence_groups[key].append(seq)
            
            for key, sequences in sequence_groups.items():
                if len(sequences) > 1:
                    correlations['attack_chains'].append({
                        'techniques': list(key),
                        'occurrences': sequences,
                        'count': len(sequences)
                    })
        
        # Entity relationships
        entity_pairs = defaultdict(list)
        for event in events:
            src_ip = event.get('entity_src_ip')
            dst_ip = event.get('entity_dst_ip')
            hostname = event.get('entity_hostname')
            
            if src_ip and dst_ip:
                pair_key = f"{src_ip} -> {dst_ip}"
                entity_pairs[pair_key].append(event)
            
            if hostname and src_ip:
                pair_key = f"{hostname} ({src_ip})"
                entity_pairs[pair_key].append(event)
        
        for pair, pair_events in entity_pairs.items():
            if len(pair_events) > 1:
                correlations['entity_relationships'].append({
                    'relationship': pair,
                    'events': pair_events,
                    'count': len(pair_events)
                })
        
        # Severity timeline
        severity_timeline = []
        for event in events:
            severity = event.get('severity', 'unknown')
            timestamp = event.get('timestamp', '')
            if timestamp and severity:
                severity_timeline.append({
                    'timestamp': timestamp,
                    'severity': severity,
                    'event': event
                })
        
        correlations['severity_timeline'] = sorted(
            severity_timeline,
            key=lambda x: x.get('timestamp', '')
        )
        
        return correlations
    
    @staticmethod
    def detect_attack_patterns(events: List[Dict]) -> List[Dict]:
        """
        Detect common attack patterns in events.
        
        Args:
            events: List of timeline events
        
        Returns:
            List of detected attack patterns.
        """
        patterns = []
        
        # Pattern: Reconnaissance -> Initial Access -> Execution
        recon_techniques = ['T1046', 'T1047', 'T1082', 'T1083']
        initial_access = ['T1078', 'T1190', 'T1133', 'T1566']
        execution = ['T1059', 'T1106', 'T1129', 'T1203']
        
        # Find events matching these patterns
        recon_events = [e for e in events if any(t in e.get('mitre_techniques', []) for t in recon_techniques)]
        access_events = [e for e in events if any(t in e.get('mitre_techniques', []) for t in initial_access)]
        exec_events = [e for e in events if any(t in e.get('mitre_techniques', []) for t in execution)]
        
        if recon_events and access_events and exec_events:
            patterns.append({
                'pattern': 'Reconnaissance -> Initial Access -> Execution',
                'description': 'Classic attack chain detected',
                'recon_events': recon_events,
                'access_events': access_events,
                'exec_events': exec_events,
                'confidence': 'high'
            })
        
        # Pattern: Lateral Movement
        lateral_techniques = ['T1021', 'T1072', 'T1105', 'T1210']
        lateral_events = [e for e in events if any(t in e.get('mitre_techniques', []) for t in lateral_techniques)]
        
        if len(lateral_events) > 3:
            patterns.append({
                'pattern': 'Lateral Movement',
                'description': f'Multiple lateral movement events detected ({len(lateral_events)})',
                'events': lateral_events,
                'confidence': 'high'
            })
        
        # Pattern: Data Exfiltration
        exfil_techniques = ['T1041', 'T1048', 'T1537', 'T1567']
        exfil_events = [e for e in events if any(t in e.get('mitre_techniques', []) for t in exfil_techniques)]
        
        if exfil_events:
            patterns.append({
                'pattern': 'Data Exfiltration',
                'description': f'Potential data exfiltration detected ({len(exfil_events)} events)',
                'events': exfil_events,
                'confidence': 'medium'
            })
        
        return patterns

