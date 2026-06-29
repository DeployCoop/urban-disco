#!/usr/bin/env python3
"""
Test Security-Detections-MCP Integration
Verifies detection repositories and MCP server configuration.
"""
import os
import json
from pathlib import Path

def test_detection_repos():
    """Verify detection repositories exist and contain rules"""
    print("Testing Detection Repositories...")
    
    detection_dir = Path.home() / "security-detections"
    repos = {
        "Sigma": detection_dir / "sigma" / "rules",
        "Splunk ESCU": detection_dir / "security_content" / "detections",
        "Elastic": detection_dir / "detection-rules" / "rules",
        "KQL": detection_dir / "Hunting-Queries-Detection-Rules"
    }
    
    for name, path in repos.items():
        if path.exists():
            # Count rule files
            if name == "Sigma":
                count = len(list(path.rglob("*.yml")))
            elif name == "Splunk ESCU":
                count = len(list(path.rglob("*.yml")))
            elif name == "Elastic":
                count = len(list(path.rglob("*.toml")))
            else:  # KQL
                count = len(list(path.rglob("*.kql"))) + len(list(path.rglob("*.yaml")))
            
            print(f"✅ {name}: {count} files at {path}")
        else:
            print(f"❌ {name}: Not found at {path}")
            return False
    
    return True

def test_mcp_config():
    """Verify MCP configuration includes security-detections"""
    print("\nTesting MCP Configuration...")
    
    config_path = Path("mcp-config.json")
    if not config_path.exists():
        print("❌ mcp-config.json not found")
        return False
    
    with open(config_path) as f:
        config = json.load(f)
    
    if "security-detections" in config.get("mcpServers", {}):
        server = config["mcpServers"]["security-detections"]
        print(f"✅ Security-Detections-MCP configured")
        print(f"   Command: {server['command']}")
        print(f"   Sigma Path: {server['env'].get('SIGMA_PATHS', 'Not set')}")
        return True
    else:
        print("❌ security-detections not found in mcp-config.json")
        return False

def test_env_config():
    """Verify .env contains detection paths"""
    print("\nTesting Environment Configuration...")
    
    env_path = Path(".env")
    if not env_path.exists():
        print("⚠️  .env not found (run setup_dev.sh first)")
        return False
    
    with open(env_path) as f:
        content = f.read()
    
    required_vars = ["SIGMA_PATHS", "SPLUNK_PATHS", "ELASTIC_PATHS", "KQL_PATHS"]
    found = []
    
    for var in required_vars:
        if var in content:
            found.append(var)
            print(f"✅ {var} configured")
        else:
            print(f"❌ {var} not found")
    
    return len(found) == len(required_vars)

if __name__ == "__main__":
    print("=" * 50)
    print("Security-Detections-MCP Integration Test")
    print("=" * 50)
    print()
    
    results = []
    results.append(("Detection Repositories", test_detection_repos()))
    results.append(("MCP Configuration", test_mcp_config()))
    results.append(("Environment Config", test_env_config()))
    
    print("\n" + "=" * 50)
    print("Test Results")
    print("=" * 50)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {name}")
    
    if all(r[1] for r in results):
        print("\n🎉 All tests passed! Detection tools are ready.")
        print("\nNext steps:")
        print("1. Start the web UI if not already running")
        print("2. Ask Claude: 'What detection tools are available?'")
        print("3. Try: 'Analyze detection coverage for T1059.001'")
        print("\nNote: For advanced MCP workflows, configure MCP servers separately")
    else:
        print("\n⚠️  Some tests failed. Review errors above.")

