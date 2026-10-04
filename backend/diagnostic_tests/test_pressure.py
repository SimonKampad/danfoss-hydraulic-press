"""
================================================================================
 CONTROLLED DIAGNOSTIC TEST — PRESSURE TEST
================================================================================
 This script sends controlled pressure test conditions to the Danfoss Hydraulic
 Press Version 3 backend to verify that system thresholds (210 bar warning, 235 bar alarm)
 trigger appropriate dashboard warnings, alerts, and recommendations, and that the
 dashboard cleanly recovers to NORMAL state afterwards.

 IMPORTANT:
 - These are CONTROLLED DIAGNOSTIC TEST inputs for judge demonstrations.
 - They do NOT alter real historical dataset files or retrain ML models.
 - Stage 2 Random Forest ML models remain separate and unaffected.
================================================================================
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error

# Setup backend import path for direct rule fallback if needed
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from diagnostics.diagnostic_scenarios import RuleBasedDiagnosticEngine

BACKEND_API_URL = "http://127.0.0.1:5000/api/diagnostic-test"


def send_diagnostic_test_condition(test_type: str, scenario: str, pressure_val: float):
    """
    Send controlled diagnostic test condition to backend API.
    Falls back to local diagnostic engine evaluation if backend server is offline.
    """
    payload = {
        "testType": test_type,
        "scenario": scenario,
        "value": pressure_val
    }
    
    try:
        req = urllib.request.Request(
            BACKEND_API_URL,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            actual = data.get("actual", {})
            return {
                "source": "LIVE BACKEND API (Socket.IO Broadcasted to Dashboard)",
                "machineCondition": actual.get("machineCondition", "NORMAL"),
                "anomalyStatus": actual.get("anomalyStatus", "NO ANOMALY"),
                "maintenanceIndicator": actual.get("maintenanceIndicator", "NORMAL"),
                "confidenceScore": actual.get("confidenceScore", 98.5)
            }
    except Exception:
        # Fallback to backend rule engine evaluation if API unavailable
        res = RuleBasedDiagnosticEngine.evaluate_telemetry(
            pressure_bar=pressure_val,
            temp_c=42.5,
            flow_lmin=68.1,
            fault_injected=None
        )
        return {
            "source": "LOCAL RULE ENGINE FALLBACK",
            "machineCondition": res["machineCondition"],
            "anomalyStatus": res["anomalyStatus"],
            "maintenanceIndicator": res["maintenanceIndicator"],
            "confidenceScore": res["confidenceScore"]
        }


def run_pressure_diagnostic_test():
    print("========================================")
    print("CONTROLLED DIAGNOSTIC TEST")
    print("PRESSURE TEST")
    print("========================================")
    print("Thresholds Configured: Warning = 210 bar | Alarm = 235 bar\n")

    scenarios = [
        {
            "num": 1,
            "name": "NORMAL",
            "scenario_key": "NORMAL",
            "input_bar": 180.0,
            "expected": "Machine Health = NORMAL, 0 pressure alert"
        },
        {
            "num": 2,
            "name": "HIGH PRESSURE WARNING",
            "scenario_key": "WARNING",
            "input_bar": 215.0,
            "expected": "Machine Health = ATTENTION, Pressure Warning alert (210 bar threshold)"
        },
        {
            "num": 3,
            "name": "HIGH PRESSURE ALARM",
            "scenario_key": "ALARM",
            "input_bar": 240.0,
            "expected": "Machine Health = ATTENTION, Pressure Alarm alert (235 bar threshold), Relief Valve Inspection"
        },
        {
            "num": 4,
            "name": "RECOVERY",
            "scenario_key": "RECOVERY",
            "input_bar": 180.0,
            "expected": "Machine Health returns to NORMAL, pressure alerts cleared"
        }
    ]

    for idx, sc in enumerate(scenarios):
        res = send_diagnostic_test_condition("PRESSURE", sc["scenario_key"], sc["input_bar"])
        print(f"Scenario {sc['num']}: {sc['name']}")
        print(f"Input:    {sc['input_bar']} bar")
        print(f"Expected: {sc['expected']}")
        print(f"Actual:   Machine Health = {res['machineCondition']} | Anomaly = {res['anomalyStatus']} | Maintenance = {res['maintenanceIndicator']} ({res['source']})")
        print("-" * 50)
        if idx < len(scenarios) - 1:
            time.sleep(2.5)

    print("TEST COMPLETE\n")


if __name__ == "__main__":
    run_pressure_diagnostic_test()
