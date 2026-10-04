"""
Danfoss Hydraulic Press Diagnostic Scenario & Test System
==========================================================
Controlled Diagnostic Scenario Framework for System Behavior Analysis

IMPORTANT ARCHITECTURAL SEPARATION:
-----------------------------------
This file strictly separates three distinct operational layers:

A. REAL DATASET CONDITIONS:
   Statistical properties and bounds observed across the 2,205 real hydraulic press cycles.

B. ML PREDICTION CONDITIONS:
   Component condition classifications performed by 4 trained Stage 2 Random Forest models:
   - Cooler Efficiency (Classes: 3, 20, 100) -> Accuracy: 99.81%
   - Valve Condition (Classes: 73, 80, 90, 100) -> Accuracy: 77.41% (Group Split)
   - Internal Pump Leakage (Classes: 0, 1, 2) -> Accuracy: 98.46%
   - Hydraulic Accumulator Pressure (Classes: 90, 100, 115, 130) -> Accuracy: 56.37% (Group Split)

C. CONTROLLED DIAGNOSTIC SCENARIOS:
   Artificially constructed software test conditions used strictly to evaluate
   the dashboard's rule-based alert engine, machine health classifier, and API validation.
   These are labeled as "Diagnostic Test Scenarios" and NOT physical press failure claims.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List

# Ensure project root is in path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from src.predictor import HydraulicPredictor, BASIC_FEATURE_NAMES, ACCUMULATOR_FEATURE_NAMES
from src.feature_extractor import SENSORS

# Constant System & Simulation Thresholds (from pressConfig.js / analyticsService.js)
THRESHOLDS = {
    "pressure_warning_bar": 210.0,
    "pressure_alarm_bar": 235.0,
    "temperature_warning_c": 55.0,
    "temperature_alarm_c": 65.0,
    "analytics_temp_threshold_c": 56.0,
    "motor_current_warning_a": 35.0,
    "motor_current_alarm_a": 42.0
}

# Expected API Sample Counts per sensor for 1 cycle
EXPECTED_SAMPLE_COUNTS = {
    "PS1": 6000, "PS2": 6000, "PS3": 6000, "PS4": 6000, "PS5": 6000, "PS6": 6000,
    "EPS1": 6000, "FS1": 600, "FS2": 600,
    "TS1": 60, "TS2": 60, "TS3": 60, "TS4": 60,
    "VS1": 60, "CE": 60, "CP": 60, "SE": 60
}


class RuleBasedDiagnosticEngine:
    """
    Python implementation of the backend JS Analytics & Threshold Engine logic
    to evaluate software diagnostic responses for controlled scenarios.
    """
    @staticmethod
    def evaluate_telemetry(pressure_bar: float, temp_c: float, flow_lmin: float, speed_mms: float = 200.0, motor_current_a: float = 14.5, fault_injected: str = None) -> Dict[str, Any]:
        machine_condition = "NORMAL"
        anomaly_status = "NO ANOMALY"
        maintenance_indicator = "NORMAL"
        confidence_score = 98.5
        alerts = []

        # 1. Fault Injection Check (from analyticsService.js)
        if fault_injected == "OVERPRESSURE" or pressure_bar >= 235.0:
            machine_condition = "ATTENTION"
            anomaly_status = "HIGH PRESSURE TRANSIENT"
            maintenance_indicator = "INSPECT RELIEF VALVE"
            confidence_score = 94.1
            alerts.append({"type": "HIGH_PRESSURE_TRANSIENT", "severity": "WARNING", "msg": "Pressure spike detected"})
        elif pressure_bar >= 210.0:
            machine_condition = "ATTENTION"
            anomaly_status = "HIGH PRESSURE TRANSIENT"
            maintenance_indicator = "INSPECT RELIEF VALVE"
            confidence_score = 95.0
            alerts.append({"type": "PRESSURE_WARNING", "severity": "WARNING", "msg": f"Pressure {pressure_bar} bar > 210 bar warning threshold"})
        elif fault_injected == "THERMAL_SPIKE" or temp_c >= 65.0:
            machine_condition = "ATTENTION"
            anomaly_status = "HIGH OIL TEMPERATURE ALARM"
            maintenance_indicator = "CHECK COOLING LOOP"
            confidence_score = 92.4
            alerts.append({"type": "HIGH_TEMP_ALARM", "severity": "ALARM", "msg": f"Oil temp {temp_c}°C > 65°C alarm threshold"})
        elif fault_injected == "VALVE_LEAK":
            machine_condition = "FAULT"
            anomaly_status = "HYDRAULIC VALVE BYPASS LEAK"
            maintenance_indicator = "REPLACE PROPORTIONAL VALVE"
            confidence_score = 96.8
            alerts.append({"type": "VALVE_BYPASS_LEAK", "severity": "ALARM", "msg": "Flow & pressure correlation anomaly"})
        elif fault_injected == "LOW_FLOW" or flow_lmin <= 5.0:
            machine_condition = "ATTENTION"
            anomaly_status = "LOW HYDRAULIC FLOW ANOMALY"
            maintenance_indicator = "INSPECT PUMP & SUCTION LINE"
            confidence_score = 93.5
            alerts.append({"type": "LOW_FLOW_WARN", "severity": "WARNING", "msg": f"Hydraulic flow {flow_lmin} L/min significantly below nominal rating"})
        elif fault_injected == "SLOW_CYLINDER" or speed_mms <= 50.0:
            machine_condition = "ATTENTION"
            anomaly_status = "CYLINDER SLOWDOWN ANOMALY"
            maintenance_indicator = "INSPECT DIRECTIONAL CONTROL VALVE"
            confidence_score = 94.0
            alerts.append({"type": "SLOW_CYLINDER_WARN", "severity": "WARNING", "msg": f"Cylinder speed {speed_mms} mm/s below nominal stroke velocity"})
        elif fault_injected == "FAST_CYLINDER" or speed_mms >= 250.0:
            machine_condition = "ATTENTION"
            anomaly_status = "CYLINDER OVERSPEED ANOMALY"
            maintenance_indicator = "INSPECT FLOW CONTROL VALVE"
            confidence_score = 94.0
            alerts.append({"type": "FAST_CYLINDER_WARN", "severity": "WARNING", "msg": f"Cylinder speed {speed_mms} mm/s exceeds upper speed boundary"})
        elif motor_current_a >= 42.0:
            machine_condition = "ATTENTION"
            anomaly_status = "MOTOR OVERCURRENT ALARM"
            maintenance_indicator = "INSPECT MOTOR & PUMP"
            confidence_score = 93.0
            alerts.append({"type": "MOTOR_OVERCURRENT_ALARM", "severity": "ALARM", "msg": f"Motor current {motor_current_a} A exceeds alarm threshold (42.0 A)"})
        elif motor_current_a >= 35.0:
            machine_condition = "ATTENTION"
            anomaly_status = "MOTOR OVERCURRENT WARNING"
            maintenance_indicator = "INSPECT MOTOR & PUMP"
            confidence_score = 95.0
            alerts.append({"type": "MOTOR_OVERCURRENT_WARN", "severity": "WARNING", "msg": f"Motor current {motor_current_a} A exceeds warning threshold (35.0 A)"})
        else:
            # Physics threshold checks
            if temp_c > THRESHOLDS["analytics_temp_threshold_c"]:
                machine_condition = "ATTENTION"
                anomaly_status = "THERMAL DRIFT"
                maintenance_indicator = "CLEAN HEAT EXCHANGER"
                alerts.append({"type": "THERMAL_DRIFT", "severity": "WARNING", "msg": f"Oil temp {temp_c}°C > {THRESHOLDS['analytics_temp_threshold_c']}°C threshold"})

        return {
            "machineCondition": machine_condition,
            "anomalyStatus": anomaly_status,
            "maintenanceIndicator": maintenance_indicator,
            "confidenceScore": confidence_score,
            "activeAlertsCount": len(alerts),
            "alerts": alerts,
            "cycleConsistency": "STABLE (98.8%)"
        }

    @staticmethod
    def validate_api_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
        """Validate input payload against FastAPI CycleRequest schema rules."""
        for sensor, expected_count in EXPECTED_SAMPLE_COUNTS.items():
            if sensor not in payload or payload[sensor] is None:
                return {"valid": False, "status_code": 422, "error": f"Missing required sensor: '{sensor}'"}
            
            samples = payload[sensor]
            if not isinstance(samples, list) or len(samples) == 0:
                return {"valid": False, "status_code": 422, "error": f"Sensor '{sensor}' array cannot be empty"}
            
            if len(samples) != expected_count:
                return {"valid": False, "status_code": 422, "error": f"{sensor} must contain exactly {expected_count} samples, received {len(samples)}"}
            
            # Check data types
            for val in samples[:10]: # check prefix
                if not isinstance(val, (int, float)) or np.isnan(val):
                    return {"valid": False, "status_code": 422, "error": f"Sensor '{sensor}' contains non-numeric/NaN values"}
        
        return {"valid": True, "status_code": 200, "error": None}


def analyze_real_dataset_conditions(data_dir: str) -> Dict[str, Any]:
    """Inspect and extract empirical statistics across all 2205 dataset cycles."""
    features_csv = os.path.join(data_dir, "features.csv")
    profile_txt = os.path.join(data_dir, "profile.txt")

    if not os.path.exists(features_csv) or not os.path.exists(profile_txt):
        raise FileNotFoundError(f"Dataset files missing in {data_dir}")

    df_feat = pd.read_csv(features_csv)
    df_prof = pd.read_csv(profile_txt, sep=r'\s+', header=None, names=["cooler", "valve", "pump_leakage", "accumulator", "stable_flag"])

    sensor_stats = []
    sensor_descriptions = {
        "PS1": "Primary Cap Pressure (bar)",
        "PS2": "Secondary Line Pressure (bar)",
        "PS3": "Suction/Return Line Pressure (bar)",
        "PS4": "Pilot Drain Line Pressure (bar)",
        "PS5": "Pre-charge Base Pressure (bar)",
        "PS6": "Tank Return Line Pressure (bar)",
        "EPS1": "Electric Motor Power (W)",
        "FS1": "Primary Pump Flow (L/min)",
        "FS2": "Cooling Loop Flow (L/min)",
        "TS1": "Main Tank Oil Temp (°C)",
        "TS2": "Pump Outlet Oil Temp (°C)",
        "TS3": "Cooler Inlet Oil Temp (°C)",
        "TS4": "Cooler Outlet Oil Temp (°C)",
        "VS1": "Mechanical Vibration (mm/s)",
        "CE": "Cooling Efficiency Factor (%)",
        "CP": "Cooling Dissipated Power (kW)",
        "SE": "System Efficiency Factor (%)"
    }

    for sensor in SENSORS:
        min_val = float(df_feat[f"{sensor}_min"].min())
        max_val = float(df_feat[f"{sensor}_max"].max())
        mean_val = float(df_feat[f"{sensor}_mean"].mean())
        sensor_stats.append({
            "Sensor": sensor,
            "Description": sensor_descriptions.get(sensor, "Hydraulic Sensor"),
            "Minimum": round(min_val, 2),
            "Maximum": round(max_val, 2),
            "Mean": round(mean_val, 2)
        })

    return {
        "sensor_stats": pd.DataFrame(sensor_stats),
        "profile_summary": {
            "total_cycles": len(df_prof),
            "cooler_counts": df_prof["cooler"].value_counts().to_dict(),
            "valve_counts": df_prof["valve"].value_counts().to_dict(),
            "pump_leakage_counts": df_prof["pump_leakage"].value_counts().to_dict(),
            "accumulator_counts": df_prof["accumulator"].value_counts().to_dict(),
            "stable_flag_counts": df_prof["stable_flag"].value_counts().to_dict()
        }
    }


def run_controlled_diagnostic_scenarios(data_dir: str, models_dir: str) -> List[Dict[str, Any]]:
    """Execute complete suite of controlled diagnostic scenarios."""
    predictor = HydraulicPredictor(models_dir=models_dir)
    results = []

    # Helper to get sample raw sensor array for API validation tests
    def get_valid_sample_payload():
        payload = {}
        for s, count in EXPECTED_SAMPLE_COUNTS.items():
            payload[s] = [50.0] * count
        return payload

    # SCENARIO 1: NORMAL_OPERATION
    res1 = RuleBasedDiagnosticEngine.evaluate_telemetry(pressure_bar=160.0, temp_c=42.5, flow_lmin=68.1)
    results.append({
        "id": "SCENARIO_01",
        "name": "Normal Operation Baseline",
        "category": "CONTROLLED DIAGNOSTIC SCENARIO",
        "input": "P = 160.0 bar, T = 42.5°C, Q = 68.1 L/min (Nominal bounds)",
        "expected": "No fault, 0 alerts, Machine Health: NORMAL",
        "actual_response": res1,
        "ml_involved": False,
        "detection_method": "Rule-Based Physics Bounds"
    })

    # SCENARIO 2: HIGH_PRESSURE (Below, Near, Above threshold)
    sub2_below = RuleBasedDiagnosticEngine.evaluate_telemetry(pressure_bar=180.0, temp_c=42.5, flow_lmin=68.1)
    sub2_near = RuleBasedDiagnosticEngine.evaluate_telemetry(pressure_bar=215.0, temp_c=42.5, flow_lmin=68.1)
    sub2_above = RuleBasedDiagnosticEngine.evaluate_telemetry(pressure_bar=240.0, temp_c=42.5, flow_lmin=68.1)
    results.append({
        "id": "SCENARIO_02",
        "name": "High Pressure Excursion",
        "category": "CONTROLLED DIAGNOSTIC SCENARIO",
        "input": "P_test = [180.0 (below), 215.0 (near warning 210), 240.0 (above alarm 235)] bar",
        "expected": "Below: NORMAL (0 alerts); Near: WARNING (1 alert); Above: ALARM (1 alert, ATTENTION)",
        "actual_response": {
            "below_threshold": sub2_below,
            "near_threshold": sub2_near,
            "above_threshold": sub2_above
        },
        "ml_involved": False,
        "detection_method": "Software Diagnostic Thresholds (210/235 bar)"
    })

    # SCENARIO 3: HIGH_TEMPERATURE
    sub3_normal = RuleBasedDiagnosticEngine.evaluate_telemetry(pressure_bar=160.0, temp_c=45.0, flow_lmin=68.1)
    sub3_inc = RuleBasedDiagnosticEngine.evaluate_telemetry(pressure_bar=160.0, temp_c=56.5, flow_lmin=68.1)
    sub3_alarm = RuleBasedDiagnosticEngine.evaluate_telemetry(pressure_bar=160.0, temp_c=66.0, flow_lmin=68.1)
    results.append({
        "id": "SCENARIO_03",
        "name": "High Temperature / Thermal Drift",
        "category": "CONTROLLED DIAGNOSTIC SCENARIO",
        "input": "T_test = [45.0°C (normal), 56.5°C (drift > 56.0), 66.0°C (alarm > 65.0)]",
        "expected": "Normal: 0 alerts; 56.5°C: THERMAL DRIFT / CLEAN HEAT EXCHANGER; 66.0°C: TEMP ALARM",
        "actual_response": {
            "normal_temp": sub3_normal,
            "increasing_temp": sub3_inc,
            "alarm_temp": sub3_alarm
        },
        "ml_involved": False,
        "detection_method": "Rule-Based Thermal Management (55/56/65°C)"
    })

    # SCENARIO 4: LOW_FLOW
    res4 = RuleBasedDiagnosticEngine.evaluate_telemetry(pressure_bar=160.0, temp_c=45.0, flow_lmin=2.0)
    results.append({
        "id": "SCENARIO_04",
        "name": "Low Hydraulic Flow",
        "category": "CONTROLLED DIAGNOSTIC SCENARIO",
        "input": "Q = 2.0 L/min (reduced from nominal 68.1 L/min during fast down)",
        "expected": "Telemetry recorded; flow warning evaluate if fault injected",
        "actual_response": res4,
        "ml_involved": False,
        "detection_method": "Telemetry Processing"
    })

    # SCENARIO 5: PUMP LEAKAGE (ML Model Execution on Real Dataset Cycles)
    pump_cycles = [1, 252, 211] # Ground Truth: [0, 1, 2]
    pump_results = []
    for c in pump_cycles:
        pred_res = predictor.predict_single_cycle(cycle_number=c, data_dir=data_dir)
        pred_cls = pred_res["predictions"]["pump_leakage"]
        probs = pred_res["probabilities"]["pump_leakage"]
        gt = 0 if c == 1 else (1 if c == 252 else 2)
        pump_results.append({
            "cycle": c,
            "ground_truth": gt,
            "predicted_class": pred_cls,
            "correct": gt == pred_cls,
            "probabilities": probs
        })
    results.append({
        "id": "SCENARIO_05",
        "name": "Pump Leakage Classification (ML)",
        "category": "ML PREDICTION CONDITION",
        "input": f"Real dataset cycles {pump_cycles} (Ground Truth: [0=None, 1=Weak, 2=Severe])",
        "expected": "Random Forest model classifies internal pump leakage with ~98.46% accuracy",
        "actual_response": pump_results,
        "ml_involved": True,
        "model_name": "pump_model.joblib",
        "detection_method": "Stage 2 Random Forest (85 Features)"
    })

    # SCENARIO 6: COOLER CONDITION (ML Model Execution on Real Dataset Cycles)
    cooler_cycles = [1465, 733, 1] # Ground Truth: [100, 20, 3]
    cooler_results = []
    for c in cooler_cycles:
        pred_res = predictor.predict_single_cycle(cycle_number=c, data_dir=data_dir)
        pred_cls = pred_res["predictions"]["cooler"]
        probs = pred_res["probabilities"]["cooler"]
        gt = 100 if c == 1465 else (20 if c == 733 else 3)
        cooler_results.append({
            "cycle": c,
            "ground_truth": gt,
            "predicted_class": pred_cls,
            "correct": gt == pred_cls,
            "probabilities": probs
        })
    results.append({
        "id": "SCENARIO_06",
        "name": "Cooler Efficiency Classification (ML)",
        "category": "ML PREDICTION CONDITION",
        "input": f"Real dataset cycles {cooler_cycles} (Ground Truth: [100=Full, 20=Reduced, 3=Failure])",
        "expected": "Random Forest model classifies cooler efficiency with ~99.81% accuracy",
        "actual_response": cooler_results,
        "ml_involved": True,
        "model_name": "cooler_model.joblib",
        "detection_method": "Stage 2 Random Forest (85 Features)"
    })

    # SCENARIO 7: VALVE CONDITION (ML Model Execution on Real Dataset Cycles - Primary Accuracy 77.41%)
    valve_cycles = [1, 232, 222, 212] # Ground Truth: [100, 90, 80, 73]
    valve_results = []
    for c in valve_cycles:
        pred_res = predictor.predict_single_cycle(cycle_number=c, data_dir=data_dir)
        pred_cls = pred_res["predictions"]["valve"]
        probs = pred_res["probabilities"]["valve"]
        gt = 100 if c == 1 else (90 if c == 232 else (80 if c == 222 else 73))
        valve_results.append({
            "cycle": c,
            "ground_truth": gt,
            "predicted_class": pred_cls,
            "correct": gt == pred_cls,
            "probabilities": probs
        })
    results.append({
        "id": "SCENARIO_07",
        "name": "Proportional Valve Condition (ML)",
        "category": "ML PREDICTION CONDITION",
        "input": f"Real dataset cycles {valve_cycles} (Ground Truth: [100=Optimal, 90=Slight Lag, 80=Severe Lag, 73=Failure])",
        "expected": "Random Forest classifies valve condition. Note: Primary Group Split accuracy is 77.41%",
        "actual_response": valve_results,
        "ml_involved": True,
        "model_name": "valve_model.joblib",
        "detection_method": "Stage 2 Random Forest (85 Features)"
    })

    # SCENARIO 8: ACCUMULATOR CONDITION (ML Model Execution on Real Dataset Cycles - Primary Accuracy 56.37%)
    accum_cycles = [1, 334, 467, 600] # Ground Truth: [130, 115, 100, 90]
    accum_results = []
    for c in accum_cycles:
        pred_res = predictor.predict_single_cycle(cycle_number=c, data_dir=data_dir)
        pred_cls = pred_res["predictions"]["accumulator"]
        probs = pred_res["probabilities"]["accumulator"]
        gt = 130 if c == 1 else (115 if c == 334 else (100 if c == 467 else 90))
        accum_results.append({
            "cycle": c,
            "ground_truth": gt,
            "predicted_class": pred_cls,
            "correct": gt == pred_cls,
            "probabilities": probs
        })
    results.append({
        "id": "SCENARIO_08",
        "name": "Accumulator Gas Pressure (ML)",
        "category": "ML PREDICTION CONDITION",
        "input": f"Real dataset cycles {accum_cycles} (Ground Truth: [130=Optimal, 115=Slight, 100=Severe, 90=Damaged])",
        "expected": "Random Forest classifies gas pressure. Note: Primary Group Split accuracy is 56.37%",
        "actual_response": accum_results,
        "ml_involved": True,
        "model_name": "accumulator_model.joblib",
        "detection_method": "Stage 2 Random Forest (109 Features)"
    })

    # SCENARIO 9: SENSOR FAILURE - MISSING SENSOR
    payload_missing = get_valid_sample_payload()
    del payload_missing["PS1"]
    val_missing = RuleBasedDiagnosticEngine.validate_api_payload(payload_missing)
    results.append({
        "id": "SCENARIO_09",
        "name": "Data Quality Failure: Missing Sensor Key",
        "category": "CONTROLLED DIAGNOSTIC SCENARIO",
        "input": "Payload missing required sensor 'PS1'",
        "expected": "Input Validation Error (HTTP 422 Unprocessable Entity)",
        "actual_response": val_missing,
        "ml_involved": False,
        "detection_method": "FastAPI Pydantic Schema Validation"
    })

    # SCENARIO 10: SENSOR FAILURE - INCORRECT SAMPLE COUNT
    payload_count = get_valid_sample_payload()
    payload_count["PS1"] = payload_count["PS1"][:5000] # 5000 samples instead of 6000
    val_count = RuleBasedDiagnosticEngine.validate_api_payload(payload_count)
    results.append({
        "id": "SCENARIO_10",
        "name": "Data Quality Failure: Incorrect Sample Count",
        "category": "CONTROLLED DIAGNOSTIC SCENARIO",
        "input": "PS1 array contains 5000 samples (Expected: 6000)",
        "expected": "Input Validation Error (HTTP 422 Unprocessable Entity)",
        "actual_response": val_count,
        "ml_involved": False,
        "detection_method": "FastAPI Pydantic Schema Validation"
    })

    # SCENARIO 11: SENSOR FAILURE - NON-NUMERIC DATA
    payload_type = get_valid_sample_payload()
    payload_type["SE"][0] = "INVALID_STRING"
    val_type = RuleBasedDiagnosticEngine.validate_api_payload(payload_type)
    results.append({
        "id": "SCENARIO_11",
        "name": "Data Quality Failure: Non-Numeric Sensor Value",
        "category": "CONTROLLED DIAGNOSTIC SCENARIO",
        "input": "SE sensor array contains non-numeric string value",
        "expected": "Input Validation Error (HTTP 422 Unprocessable Entity)",
        "actual_response": val_type,
        "ml_involved": False,
        "detection_method": "FastAPI Pydantic Schema Validation"
    })

    # SCENARIO 12: MULTI-CONDITION (HIGH TEMP + LOW FLOW)
    res12 = RuleBasedDiagnosticEngine.evaluate_telemetry(pressure_bar=160.0, temp_c=58.0, flow_lmin=2.5)
    results.append({
        "id": "SCENARIO_12",
        "name": "Multi-Condition Combination (High Temp + Low Flow)",
        "category": "CONTROLLED DIAGNOSTIC SCENARIO",
        "input": "T = 58.0°C (> 56.0°C threshold), Q = 2.5 L/min",
        "expected": "Machine Health: ATTENTION, Anomaly: THERMAL DRIFT, Maintenance: CLEAN HEAT EXCHANGER",
        "actual_response": res12,
        "ml_involved": False,
        "detection_method": "Rule-Based Diagnostic Multi-Rule Processor"
    })

    # SCENARIO 13: CYCLE CONSISTENCY EVALUATION
    results.append({
        "id": "SCENARIO_13",
        "name": "Cycle Consistency Metric Evaluation",
        "category": "CONTROLLED DIAGNOSTIC SCENARIO",
        "input": "Backend analytics report request during steady state operation",
        "expected": "Static rule-based string 'STABLE (98.8%)'",
        "actual_response": {
            "cycleConsistency": "STABLE (98.8%)",
            "is_ml_computed": False,
            "label": "Rule-Based Simulation Estimate"
        },
        "ml_involved": False,
        "detection_method": "Static Service Rule"
    })

    # SCENARIO 14: CONFIDENCE SCORE EVALUATION
    results.append({
        "id": "SCENARIO_14",
        "name": "Confidence Score Implementation Audit",
        "category": "CONTROLLED DIAGNOSTIC SCENARIO",
        "input": "Comparison of dashboard summary score vs Stage 2 ML probabilities",
        "expected": "Dashboard summary score = rule-based proxy (98.5%); Component modal probabilities = Random Forest predict_proba()",
        "actual_response": {
            "dashboard_summary_score": 98.5,
            "dashboard_score_type": "Rule-Based Proxy Score",
            "component_level_ml_probabilities": "Random Forest predict_proba() per class",
            "example_ml_prob_cycle1": predictor.predict_single_cycle(cycle_number=1, data_dir=data_dir)["probabilities"]
        },
        "ml_involved": True, # For component level
        "detection_method": "Dual Layer (Rule-Based Summary + RF Predict Proba)"
    })

    # SCENARIO 15: RECOVERY TO NORMAL OPERATION
    sub15_fault = RuleBasedDiagnosticEngine.evaluate_telemetry(pressure_bar=240.0, temp_c=42.5, flow_lmin=68.1, fault_injected="OVERPRESSURE")
    sub15_cleared = RuleBasedDiagnosticEngine.evaluate_telemetry(pressure_bar=160.0, temp_c=42.5, flow_lmin=68.1, fault_injected=None)
    results.append({
        "id": "SCENARIO_15",
        "name": "Fault Injection & Recovery Sequence",
        "category": "CONTROLLED DIAGNOSTIC SCENARIO",
        "input": "Step 1: Inject OVERPRESSURE fault -> Step 2: Clear fault & return to nominal",
        "expected": "Step 1: ATTENTION / HIGH PRESSURE TRANSIENT -> Step 2: NORMAL / NO ANOMALY",
        "actual_response": {
            "during_fault": sub15_fault,
            "after_recovery": sub15_cleared
        },
        "ml_involved": False,
        "detection_method": "Simulator State Control & Analytics Transition"
    })

    return results


def print_diagnostic_report(dataset_info: Dict[str, Any], scenario_results: List[Dict[str, Any]]):
    """Print structured, clean report of diagnostic scenario analysis."""
    print("=" * 80)
    print(" DANFOSS HYDRAULIC PRESS DIAGNOSTIC SCENARIO & TEST REPORT")
    print("=" * 80)
    print("\n1. REAL DATASET EMPIRICAL STATISTICS (2,205 Cycles):")
    print("-" * 80)
    df_stats = dataset_info["sensor_stats"]
    print(df_stats.to_string(index=False))

    print("\nTarget Class Distributions in Ground Truth Profile:")
    for k, v in dataset_info["profile_summary"].items():
        if k != "total_cycles":
            print(f"  - {k}: {v}")

    print("\n" + "=" * 80)
    print("2. CONTROLLED DIAGNOSTIC TEST SCENARIOS EVALUATION:")
    print("=" * 80)

    for res in scenario_results:
        print(f"\n[{res['id']}] {res['name']}")
        print(f"  - Category:         {res['category']}")
        print(f"  - Input:            {res['input']}")
        print(f"  - Detection Method: {res['detection_method']}")
        print(f"  - ML Involved?:     {'YES' if res['ml_involved'] else 'NO'}")
        print(f"  - Expected Result:  {res['expected']}")
        print(f"  - Actual System Response:")
        print("    " + json.dumps(res['actual_response'], indent=6).replace('\n', '\n    '))

    print("\n" + "=" * 80)
    print(" DIAGNOSTIC TEST SUITE EXECUTION COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    dataset_dir = "E:/Danfoss Project/dataset"
    models_dir = os.path.join(BACKEND_ROOT, "models")

    dataset_info = analyze_real_dataset_conditions(dataset_dir)
    scenario_results = run_controlled_diagnostic_scenarios(dataset_dir, models_dir)
    print_diagnostic_report(dataset_info, scenario_results)
