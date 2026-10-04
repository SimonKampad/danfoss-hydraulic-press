"""
================================================================================
 CONTROLLED DIAGNOSTIC TEST — CYLINDER SPEED TEST
================================================================================
 This script sends controlled cylinder speed test conditions to the Danfoss Hydraulic
 Press Version 3 backend to verify that cylinder velocity anomalies (slowdown / overspeed
 relative to nominal 200 mm/s extend velocity) trigger appropriate dashboard warnings,
 alerts, and recommendations, and that the dashboard cleanly recovers to NORMAL state afterwards.

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

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from diagnostics.diagnostic_scenarios import RuleBasedDiagnosticEngine

BACKEND_API_URL = "http://127.0.0.1:5000/api/diagnostic-test"


def send_diagnostic_test_condition(test_type: str, scenario: str, speed_val: float):
    payload = {
        "testType": test_type,
        "scenario": scenario,
        "value": speed_val
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
        res = RuleBasedDiagnosticEngine.evaluate_telemetry(
            pressure_bar=160.0,
            temp_c=42.5,
            flow_lmin=68.1,
            speed_mms=speed_val,
            motor_current_a=14.5,
            fault_injected=None
        )
        return {
            "source": "LOCAL RULE ENGINE FALLBACK",
            "machineCondition": res["machineCondition"],
            "anomalyStatus": res["anomalyStatus"],
            "maintenanceIndicator": res["maintenanceIndicator"],
            "confidenceScore": res["confidenceScore"]
        }


def run_cylinder_speed_diagnostic_test():
    print("========================================")
    print("CONTROLLED DIAGNOSTIC TEST")
    print("CYLINDER SPEED TEST")
    print("========================================")
    print("Target Extend Velocity = 200.0 mm/s | Deviation Boundary = ±50 mm/s\n")

    scenarios = [
        {
            "num": 1,
            "name": "NORMAL CYLINDER SPEED",
            "scenario_key": "NORMAL",
            "input_mms": 200.0,
            "expected": "Machine Health = NORMAL, 0 speed alert, Maintenance = NORMAL"
        },
        {
            "num": 2,
            "name": "SLOW CYLINDER SLOWDOWN ANOMALY",
            "scenario_key": "SLOW",
            "input_mms": 20.0,
            "expected": "Machine Health = ATTENTION, Anomaly = CYLINDER SLOWDOWN ANOMALY, Maintenance = INSPECT DIRECTIONAL CONTROL VALVE"
        },
        {
            "num": 3,
            "name": "FAST CYLINDER OVERSPEED ANOMALY",
            "scenario_key": "FAST",
            "input_mms": 260.0,
            "expected": "Machine Health = ATTENTION, Anomaly = CYLINDER OVERSPEED ANOMALY, Maintenance = INSPECT FLOW CONTROL VALVE"
        },
        {
            "num": 4,
            "name": "RECOVERY",
            "scenario_key": "RECOVERY",
            "input_mms": 200.0,
            "expected": "Machine Health returns to NORMAL, speed alerts cleared"
        }
    ]

    for idx, sc in enumerate(scenarios):
        res = send_diagnostic_test_condition("CYLINDER_SPEED", sc["scenario_key"], sc["input_mms"])
        print(f"Scenario {sc['num']}: {sc['name']}")
        print(f"Input:    {sc['input_mms']} mm/s")
        print(f"Expected: {sc['expected']}")
        print(f"Actual:   Machine Health = {res['machineCondition']} | Anomaly = {res['anomalyStatus']} | Maintenance = {res['maintenanceIndicator']} ({res['source']})")
        print("-" * 50)
        if idx < len(scenarios) - 1:
            time.sleep(2.5)

    print("TEST COMPLETE\n")


if __name__ == "__main__":
    run_cylinder_speed_diagnostic_test()
