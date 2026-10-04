import os
import json
import joblib
import pandas as pd
import numpy as np

from src.feature_extractor import HydraulicFeatureExtractor, BASIC_FEATURE_NAMES, ACCUMULATOR_FEATURE_NAMES


class HydraulicPredictor:
    """
    Inference pipeline for Danfoss Hydraulic System components.
    Loads 4 saved Random Forest models (Cooler, Valve, Pump Leakage, Accumulator)
    and predicts component conditions with probability/confidence estimates.
    """

    TARGET_MODELS = {
        "cooler": "cooler_model.joblib",
        "valve": "valve_model.joblib",
        "pump_leakage": "pump_model.joblib",
        "accumulator": "accumulator_model.joblib"
    }

    def __init__(self, models_dir="models"):
        self.models_dir = models_dir
        self.extractor = HydraulicFeatureExtractor()
        self.models = {}
        self.metadata = {}

        self._load_models()

    def _load_models(self):
        """Load trained model artifacts and metadata from disk."""
        if not os.path.exists(self.models_dir):
            raise FileNotFoundError(f"Models directory not found: '{self.models_dir}'")

        # Load metadata if present
        metadata_path = os.path.join(self.models_dir, "model_metadata.json")
        if os.path.exists(metadata_path):
            with open(metadata_path, "r") as f:
                self.metadata = json.load(f)

        # Load individual models
        for target, model_filename in self.TARGET_MODELS.items():
            model_path = os.path.join(self.models_dir, model_filename)
            if not os.path.exists(model_path):
                raise FileNotFoundError(
                    f"Model file missing for '{target}': {model_path}. "
                    "Please run train_final_models.py first."
                )
            self.models[target] = joblib.load(model_path)

    def predict_features(self, basic_df, accumulator_df):
        """
        Generate predictions and confidence probabilities given pre-extracted feature DataFrames.
        
        Parameters:
        -----------
        basic_df : pd.DataFrame (N rows, 85 columns)
            Feature matrix for cooler, valve, and pump_leakage models.
        accumulator_df : pd.DataFrame (N rows, 109 columns)
            Feature matrix for accumulator model.
            
        Returns:
        --------
        results : list of dict (1 per row)
        """
        # Feature validation & leakage check
        self.extractor.validate_features(basic_df, BASIC_FEATURE_NAMES, "cooler/valve/pump_leakage")
        self.extractor.validate_features(accumulator_df, ACCUMULATOR_FEATURE_NAMES, "accumulator")

        n_samples = len(basic_df)
        if len(accumulator_df) != n_samples:
            raise ValueError(
                f"Row count mismatch between basic_df ({n_samples}) and accumulator_df ({len(accumulator_df)})."
            )

        predictions_by_target = {}
        probabilities_by_target = {}

        for target in ["cooler", "valve", "pump_leakage"]:
            model = self.models[target]
            preds = model.predict(basic_df)
            probs = model.predict_proba(basic_df)
            classes = model.classes_
            
            predictions_by_target[target] = preds
            probabilities_by_target[target] = [
                {int(c): float(p) for c, p in zip(classes, row_probs)}
                for row_probs in probs
            ]

        # Accumulator model
        accum_model = self.models["accumulator"]
        accum_preds = accum_model.predict(accumulator_df)
        accum_probs = accum_model.predict_proba(accumulator_df)
        accum_classes = accum_model.classes_

        predictions_by_target["accumulator"] = accum_preds
        probabilities_by_target["accumulator"] = [
            {int(c): float(p) for c, p in zip(accum_classes, row_probs)}
            for row_probs in accum_probs
        ]

        # Format output per sample
        formatted_results = []
        for i in range(n_samples):
            res = {
                "predictions": {
                    target: int(predictions_by_target[target][i])
                    for target in ["cooler", "valve", "pump_leakage", "accumulator"]
                },
                "probabilities": {
                    target: probabilities_by_target[target][i]
                    for target in ["cooler", "valve", "pump_leakage", "accumulator"]
                }
            }
            formatted_results.append(res)

        return formatted_results

    def predict_single_cycle(self, sensor_dict=None, cycle_number=None, data_dir="."):
        """
        Predict component conditions for a single cycle, from raw sensor dict or dataset file cycle.
        
        Parameters:
        -----------
        sensor_dict : dict, optional
            Dictionary of raw sensor arrays for 1 cycle.
        cycle_number : int, optional
            1-based cycle index if reading from raw dataset files.
        data_dir : str, default='.'
            Path to raw sensor dataset directory.
            
        Returns:
        --------
        dict : Structured result with predictions and probabilities.
        """
        if sensor_dict is None and cycle_number is None:
            raise ValueError("Either sensor_dict or cycle_number must be provided.")

        if sensor_dict is None:
            basic_df, accum_df, _ = self.extractor.extract_from_dataset_cycle(data_dir, cycle_number)
        else:
            basic_df, accum_df = self.extractor.extract_from_cycle_dict(sensor_dict)

        results = self.predict_features(basic_df, accum_df)
        return results[0]
