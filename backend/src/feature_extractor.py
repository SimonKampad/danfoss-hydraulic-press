import os
import numpy as np
import pandas as pd

# 17 Hydraulic Sensors
SENSORS = [
    "PS1", "PS2", "PS3", "PS4", "PS5", "PS6",
    "EPS1",
    "FS1", "FS2",
    "TS1", "TS2", "TS3", "TS4",
    "VS1", "CE", "CP", "SE"
]

# Explicitly excluded columns (targets and identifiers)
EXCLUDED_COLUMNS = [
    "cycle",
    "cooler",
    "valve",
    "pump_leakage",
    "accumulator",
    "stable_flag"
]

# Build 85 basic feature names in exact order
BASIC_FEATURE_NAMES = []
for sensor in SENSORS:
    BASIC_FEATURE_NAMES.extend([
        f"{sensor}_mean",
        f"{sensor}_std",
        f"{sensor}_min",
        f"{sensor}_max",
        f"{sensor}_range"
    ])

# Build 24 PS1 segment feature names in exact order
PS1_SEGMENT_FEATURE_NAMES = []
for i in range(1, 13):
    PS1_SEGMENT_FEATURE_NAMES.extend([
        f"PS1_seg{i}_mean",
        f"PS1_seg{i}_std"
    ])

# Build 109 accumulator feature names in exact order
ACCUMULATOR_FEATURE_NAMES = BASIC_FEATURE_NAMES + PS1_SEGMENT_FEATURE_NAMES


class HydraulicFeatureExtractor:
    """
    Feature extraction engine for Danfoss Hydraulic System raw sensor data.
    Extracts 85 statistical features for Cooler, Valve, and Pump Leakage models,
    and 109 features (85 basic + 24 PS1 segments) for Accumulator model.
    """

    def __init__(self):
        self.sensors = SENSORS
        self.basic_feature_names = BASIC_FEATURE_NAMES
        self.accumulator_feature_names = ACCUMULATOR_FEATURE_NAMES
        self.excluded_columns = EXCLUDED_COLUMNS

    def extract_from_cycle_dict(self, sensor_dict):
        """
        Extract features for a single cycle from a dictionary of raw sensor values.
        
        Parameters:
        -----------
        sensor_dict : dict
            Key: sensor name ('PS1', 'PS2', etc.)
            Value: list or np.ndarray of raw float sensor measurements for 1 cycle.
            
        Returns:
        --------
        basic_df : pd.DataFrame (1 row, 85 columns)
        accumulator_df : pd.DataFrame (1 row, 109 columns)
        """
        row_basic = {}
        
        # 1. Basic 85 features
        for sensor in self.sensors:
            if sensor not in sensor_dict:
                raise KeyError(f"Missing raw sensor data for '{sensor}' in sensor_dict.")
            
            values = np.array(sensor_dict[sensor], dtype=float)
            if len(values) == 0:
                raise ValueError(f"Raw sensor array for '{sensor}' is empty.")
            
            v_min = float(np.min(values))
            v_max = float(np.max(values))
            
            row_basic[f"{sensor}_mean"] = float(np.mean(values))
            # ddof=1 to match sample std (statistics.stdev used in Stage 1)
            row_basic[f"{sensor}_std"] = float(np.std(values, ddof=1)) if len(values) > 1 else 0.0
            row_basic[f"{sensor}_min"] = v_min
            row_basic[f"{sensor}_max"] = v_max
            row_basic[f"{sensor}_range"] = v_max - v_min
            
        # Ensure exact column ordering for basic features
        basic_df = pd.DataFrame([row_basic])[self.basic_feature_names]
        
        # 2. Accumulator 24 PS1 segment features
        ps1_values = np.array(sensor_dict["PS1"], dtype=float)
        segments = np.array_split(ps1_values, 12)
        
        row_accum = dict(row_basic)
        for i, segment in enumerate(segments, start=1):
            # np.std(..., ddof=0) used in Stage 1 create_accumulator_features.py
            row_accum[f"PS1_seg{i}_mean"] = float(np.mean(segment))
            row_accum[f"PS1_seg{i}_std"] = float(np.std(segment)) if len(segment) > 0 else 0.0
            
        accumulator_df = pd.DataFrame([row_accum])[self.accumulator_feature_names]
        
        return basic_df, accumulator_df

    def extract_from_dataset_cycle(self, data_dir, cycle_number):
        """
        Read raw sensor files from disk for a specific cycle (1-indexed).
        
        Parameters:
        -----------
        data_dir : str
            Path to directory containing sensor .txt files (PS1.txt, etc.)
        cycle_number : int
            1-based cycle index (1 to 2205)
            
        Returns:
        --------
        basic_df : pd.DataFrame (1 row, 85 columns)
        accumulator_df : pd.DataFrame (1 row, 109 columns)
        raw_sensor_dict : dict
        """
        if cycle_number < 1 or cycle_number > 2205:
            raise ValueError(f"cycle_number must be between 1 and 2205, got {cycle_number}")

        sensor_dict = {}
        for sensor in self.sensors:
            file_path = os.path.join(data_dir, f"{sensor}.txt")
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Sensor file missing: {file_path}")
            
            with open(file_path, "r") as f:
                for current_cycle, line in enumerate(f, start=1):
                    if current_cycle == cycle_number:
                        sensor_dict[sensor] = list(map(float, line.split()))
                        break

        basic_df, accumulator_df = self.extract_from_cycle_dict(sensor_dict)
        return basic_df, accumulator_df, sensor_dict

    @staticmethod
    def validate_features(df, expected_features, target_name):
        """
        Validate that input DataFrame matches expected features in names, count, and order.
        Raises ValueError if validation fails.
        """
        if not isinstance(df, pd.DataFrame):
            raise TypeError(f"Input features for {target_name} must be a pandas DataFrame.")

        # Check for forbidden target/identifier columns
        for col in EXCLUDED_COLUMNS:
            if col in df.columns:
                raise ValueError(
                    f"Data Leakage Risk: Forbidden column '{col}' detected in input features for {target_name}!"
                )

        current_cols = df.columns.tolist()
        if len(current_cols) != len(expected_features):
            raise ValueError(
                f"Feature count mismatch for {target_name}: Expected {len(expected_features)} features, "
                f"got {len(current_cols)}."
            )

        if current_cols != expected_features:
            mismatches = [
                (i, exp, cur) for i, (exp, cur) in enumerate(zip(expected_features, current_cols))
                if exp != cur
            ]
            raise ValueError(
                f"Feature order/name mismatch for {target_name} at index {mismatches[0][0]}: "
                f"Expected '{mismatches[0][1]}', got '{mismatches[0][2]}'."
            )
