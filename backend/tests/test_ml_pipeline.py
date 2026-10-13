"""
Automated Verification for Python ML Inference Pipeline & FastAPI Endpoints
"""

import os
import sys

# Ensure backend root is in sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from src.feature_extractor import HydraulicFeatureExtractor, BASIC_FEATURE_NAMES, ACCUMULATOR_FEATURE_NAMES, SENSORS
from src.predictor import HydraulicPredictor
from api.app import app
from fastapi.testclient import TestClient


def test_feature_extraction_schema():
    print("[TEST] Checking feature extraction schemas...")
    extractor = HydraulicFeatureExtractor()
    assert len(BASIC_FEATURE_NAMES) == 85, f"Expected 85 basic features, got {len(BASIC_FEATURE_NAMES)}"
    assert len(ACCUMULATOR_FEATURE_NAMES) == 109, f"Expected 109 accumulator features, got {len(ACCUMULATOR_FEATURE_NAMES)}"
    print(f"  [PASS] Feature counts verified: 85 basic, 109 accumulator.")


def test_model_inference():
    print("[TEST] Checking 4 Random Forest model inferences...")
    models_dir = os.path.join(BACKEND_DIR, "models")
    predictor = HydraulicPredictor(models_dir=models_dir)
    assert len(predictor.models) == 4, f"Expected 4 models loaded, got {len(predictor.models)}"

    # Load 1 cycle from deployment_dataset
    data_dir = os.path.join(BACKEND_DIR, "deployment_dataset")
    raw_sensors = {}
    for s in SENSORS:
        with open(os.path.join(data_dir, f"{s}.txt")) as fp:
            raw_sensors[s] = list(map(float, fp.readline().strip().split()))

    result = predictor.predict_single_cycle(sensor_dict=raw_sensors)
    assert "predictions" in result, "Result missing 'predictions'"
    assert "probabilities" in result, "Result missing 'probabilities'"

    for target in ["cooler", "valve", "pump_leakage", "accumulator"]:
        assert target in result["predictions"], f"Missing prediction for {target}"
        assert target in result["probabilities"], f"Missing probabilities for {target}"
        probs = result["probabilities"][target]
        prob_sum = sum(probs.values())
        assert abs(prob_sum - 1.0) < 1e-3, f"Probabilities for {target} do not sum to 1.0: {prob_sum}"

    print(f"  [PASS] Prediction output: {result['predictions']}")


def test_fastapi_endpoints():
    print("[TEST] Checking FastAPI HTTP endpoints...")
    with TestClient(app) as client:
        r_root = client.get("/")
        assert r_root.status_code == 200, f"Root endpoint failed: {r_root.status_code}"
        assert r_root.json()["status"] == "online"

        r_health = client.get("/health")
        assert r_health.status_code == 200, f"Health endpoint failed: {r_health.status_code}"
        health_data = r_health.json()
        assert health_data["status"] == "ok"
        assert health_data["models_loaded"] is True

    print("  [PASS] FastAPI / and /health endpoints respond with HTTP 200 OK.")


if __name__ == "__main__":
    print("===============================================================")
    print(" DANFOSS HYDRAULIC PRESS - PYTHON ML PIPELINE VERIFICATION")
    print("===============================================================")
    test_feature_extraction_schema()
    test_model_inference()
    test_fastapi_endpoints()
    print("===============================================================")
    print(" ALL PYTHON ML TESTS PASSED SUCCESSFULLY!")
    print("===============================================================")
