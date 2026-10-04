"""
================================================================================
 CONTROLLED DIAGNOSTIC TEST — TEMPERATURE TEST
================================================================================
 This script sends controlled oil temperature test conditions to the Danfoss Hydraulic
 Press Version 3 backend to verify that system thermal thresholds (56°C drift threshold,
 65°C alarm threshold) trigger appropriate dashboard warnings, alerts, and recommendations,
 and that the dashboard cleanly recovers to NORMAL state afterwards.

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


def send_diagnostic_test_condition(test_type: str, scenario: str, temp_val: float):
    payload = {
        "testType": test_type,
        "scenario": scenario,
        "value": temp_val
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
            temp_c=temp_val,
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


def run_temperature_diagnostic_test():
    print("========================================")
    print("CONTROLLED DIAGNOSTIC TEST")
    print("TEMPERATURE TEST")
    print("========================================")
    print("Thresholds Configured: Thermal Drift = 56°C | High Temp Alarm = 65°C\n")

    scenarios = [
        {
            "num": 1,
            "name": "NORMAL TEMPERATURE",
            "scenario_key": "NORMAL",
            "input_c": 45.0,
            "expected": "Machine Health = NORMAL, 0 alerts, Maintenance = NORMAL"
        },
        {
            "num": 2,
            "name": "THERMAL DRIFT ANOMALY",
            "scenario_key": "THERMAL_DRIFT",
            "input_c": 58.0,
            "expected": "Machine Health = ATTENTION, Anomaly = THERMAL DRIFT, Maintenance = CLEAN HEAT EXCHANGER"
        },
        {
            "num": 3,
            "name": "HIGH TEMPERATURE ALARM",
            "scenario_key": "HIGH_TEMP_ALARM",
            "input_c": 66.0,
            "expected": "Machine Health = ATTENTION, Anomaly = HIGH OIL TEMPERATURE ALARM, Maintenance = CHECK COOLING LOOP"
        },
        {
            "num": 4,
            "name": "RECOVERY",
            "scenario_key": "RECOVERY",
            "input_c": 45.0,
            "expected": "Machine Health returns to NORMAL, thermal alerts cleared"
        }
    ]

    for idx, sc in enumerate(scenarios):
        res = send_diagnostic_test_condition("TEMPERATURE", sc["scenario_key"], sc["input_c"])
        print(f"Scenario {sc['num']}: {sc['name']}")
        print(f"Input:    {sc['input_c']} °C")
        print(f"Expected: {sc['expected']}")
        print(f"Actual:   Machine Health = {res['machineCondition']} | Anomaly = {res['anomalyStatus']} | Maintenance = {res['maintenanceIndicator']} ({res['source']})")
        print("-" * 50)
        if idx < len(scenarios) - 1:
            time.sleep(2.5)

    print("TEST COMPLETE\n")


if __name__ == "__main__":
    run_temperature_diagnostic_test()
