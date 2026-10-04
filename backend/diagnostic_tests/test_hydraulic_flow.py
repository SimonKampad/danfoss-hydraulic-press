"""
================================================================================
 CONTROLLED DIAGNOSTIC TEST — HYDRAULIC FLOW TEST
================================================================================
 This script sends controlled hydraulic flow test conditions to the Danfoss Hydraulic
 Press Version 3 backend to verify that system flow restrictions (FS1 sensor output
 below nominal extend rating of ~68.1 L/min) trigger appropriate dashboard warnings,
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


def send_diagnostic_test_condition(test_type: str, scenario: str, flow_val: float):
    payload = {
        "testType": test_type,
        "scenario": scenario,
        "value": flow_val
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
            flow_lmin=flow_val,
            fault_injected=None
        )
        return {
            "source": "LOCAL RULE ENGINE FALLBACK",
            "machineCondition": res["machineCondition"],
            "anomalyStatus": res["anomalyStatus"],
            "maintenanceIndicator": res["maintenanceIndicator"],
            "confidenceScore": res["confidenceScore"]
        }


def run_hydraulic_flow_diagnostic_test():
    print("========================================")
    print("CONTROLLED DIAGNOSTIC TEST")
    print("HYDRAULIC FLOW TEST")
    print("========================================")
    print("Primary Flow Sensor: FS1 | Nominal Extend Flow = 68.1 L/min\n")

    scenarios = [
        {
            "num": 1,
            "name": "NORMAL HYDRAULIC FLOW",
            "scenario_key": "NORMAL",
            "input_lmin": 68.1,
            "expected": "Machine Health = NORMAL, 0 flow alert, Maintenance = NORMAL"
        },
        {
            "num": 2,
            "name": "LOW HYDRAULIC FLOW ANOMALY",
            "scenario_key": "LOW_FLOW",
            "input_lmin": 2.0,
            "expected": "Machine Health = ATTENTION, Anomaly = LOW HYDRAULIC FLOW ANOMALY, Maintenance = INSPECT PUMP & SUCTION LINE"
        },
        {
            "num": 3,
            "name": "RECOVERY",
            "scenario_key": "RECOVERY",
            "input_lmin": 68.1,
            "expected": "Machine Health returns to NORMAL, flow alerts cleared"
        }
    ]

    for idx, sc in enumerate(scenarios):
        res = send_diagnostic_test_condition("FLOW", sc["scenario_key"], sc["input_lmin"])
        print(f"Scenario {sc['num']}: {sc['name']}")
        print(f"Input:    {sc['input_lmin']} L/min")
        print(f"Expected: {sc['expected']}")
        print(f"Actual:   Machine Health = {res['machineCondition']} | Anomaly = {res['anomalyStatus']} | Maintenance = {res['maintenanceIndicator']} ({res['source']})")
        print("-" * 50)
        if idx < len(scenarios) - 1:
            time.sleep(2.5)

    print("TEST COMPLETE\n")


if __name__ == "__main__":
    run_hydraulic_flow_diagnostic_test()
