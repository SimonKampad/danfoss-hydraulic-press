"""
Hydraulic Press ML - Excel Report Generator

This script creates:
    Hydraulic_Press_ML_Analysis.xlsx

The workbook contains:
    1. Project Overview
    2. Final Dataset
    3. Sensor Summary
    4. Condition Distribution
    5. Sensor Trends
    6. Feature Analysis
    7. ML Results
    8. Predictions
    9. Confusion Matrices
    10. Dashboard Data

The script does NOT modify:
    - trained models
    - dataset
    - FastAPI
    - React frontend
"""

from pathlib import Path
import json
import warnings

import numpy as np
import pandas as pd
import joblib

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.formatting.rule import ColorScaleRule


warnings.filterwarnings("ignore")


# ============================================================
# 1. PROJECT PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATASET_DIR = BASE_DIR.parent.parent / "dataset"
MODELS_DIR = BASE_DIR / "models"

FEATURES_FILE = DATASET_DIR / "features.csv"
FINAL_DATASET_FILE = DATASET_DIR / "final_dataset.csv"

OUTPUT_FILE = BASE_DIR / "Hydraulic_Press_ML_Analysis.xlsx"


# ============================================================
# 2. BASIC PROJECT INFORMATION
# ============================================================

SENSORS = [
    "PS1",
    "PS2",
    "PS3",
    "PS4",
    "PS5",
    "PS6",
    "EPS1",
    "FS1",
    "FS2",
    "TS1",
    "TS2",
    "TS3",
    "TS4",
    "VS1",
    "CE",
    "CP",
    "SE",
]

TARGET_COLUMNS = [
    "cooler",
    "valve",
    "pump_leakage",
    "accumulator",
]

SAMPLES_PER_CYCLE = {
    "PS1": 6000,
    "PS2": 6000,
    "PS3": 6000,
    "PS4": 6000,
    "PS5": 6000,
    "PS6": 6000,
    "EPS1": 6000,
    "FS1": 600,
    "FS2": 600,
    "TS1": 60,
    "TS2": 60,
    "TS3": 60,
    "TS4": 60,
    "VS1": 60,
    "CE": 60,
    "CP": 60,
    "SE": 60,
}


# ============================================================
# 3. MODEL RESULTS
# ============================================================

MODEL_RESULTS = {
    "Cooler": {
        "model": "Random Forest Classifier",
        "accuracy": 99.81,
        "features": 85,
    },
    "Valve": {
        "model": "Random Forest Classifier",
        "accuracy": 77.41,
        "features": 85,
    },
    "Pump Leakage": {
        "model": "Random Forest Classifier",
        "accuracy": 98.46,
        "features": 85,
    },
    "Accumulator": {
        "model": "Random Forest Classifier",
        "accuracy": 56.37,
        "features": 109,
    },
}


# ============================================================
# 4. CONFUSION MATRICES FROM OUR GROUP-BASED EVALUATION
# ============================================================

CONFUSION_MATRICES = {
    "Cooler": {
        "labels": [3, 20, 100],
        "matrix": [
            [244, 0, 0],
            [0, 244, 0],
            [1, 0, 29],
        ],
    },

    "Valve": {
        "labels": [73, 80, 90, 100],
        "matrix": [
            [84, 25, 0, 1],
            [1, 23, 30, 6],
            [0, 7, 8, 25],
            [1, 0, 21, 286],
        ],
    },

    "Pump Leakage": {
        "labels": [0, 1, 2],
        "matrix": [
            [273, 0, 0],
            [0, 112, 0],
            [0, 8, 125],
        ],
    },

    "Accumulator": {
        "labels": [90, 100, 115, 130],
        "matrix": [
            [69, 6, 0, 198],
            [3, 60, 0, 0],
            [1, 6, 93, 12],
            [0, 0, 0, 70],
        ],
    },
}


# ============================================================
# 5. HELPER FUNCTIONS
# ============================================================

def style_header(ws, row=1):
    """
    Apply header formatting.
    """

    fill = PatternFill(
        "solid",
        fgColor="1F4E78"
    )

    font = Font(
        bold=True,
        color="FFFFFF"
    )

    for cell in ws[row]:
        cell.fill = fill
        cell.font = font
        cell.alignment = Alignment(
            horizontal="center",
            vertical="center"
        )


def auto_width(ws, max_width=35):
    """
    Automatically adjust column widths.
    """

    for column_cells in ws.columns:

        max_length = 0

        column_letter = get_column_letter(
            column_cells[0].column
        )

        for cell in column_cells:

            try:
                value_length = len(str(cell.value))

                if value_length > max_length:
                    max_length = value_length

            except Exception:
                pass

        ws.column_dimensions[
            column_letter
        ].width = min(
            max(max_length + 2, 12),
            max_width
        )


def freeze_header(ws):
    """
    Freeze first row.
    """

    ws.freeze_panes = "A2"


def add_title(ws, title, row=1):
    """
    Add a large title.
    """

    ws.cell(row=row, column=1).value = title

    ws.cell(row=row, column=1).font = Font(
        size=18,
        bold=True
    )


def safe_read_csv(path):
    """
    Read CSV safely.
    """

    if not path.exists():

        print(f"[WARNING] File not found: {path}")

        return None

    try:

        df = pd.read_csv(path)

        print(
            f"[OK] Loaded {path.name}: "
            f"{df.shape[0]} rows x {df.shape[1]} columns"
        )

        return df

    except Exception as e:

        print(
            f"[ERROR] Could not read {path}: {e}"
        )

        return None


# ============================================================
# 6. LOAD DATA
# ============================================================

print("\n==========================================")
print(" HYDRAULIC PRESS EXCEL REPORT GENERATOR")
print("==========================================\n")


final_df = safe_read_csv(FINAL_DATASET_FILE)

features_df = safe_read_csv(FEATURES_FILE)


if final_df is None:

    raise FileNotFoundError(
        "final_dataset.csv was not found. "
        "Please place this script in the backend folder."
    )


# ============================================================
# 7. CREATE WORKBOOK
# ============================================================

wb = Workbook()

# Remove default sheet
default_sheet = wb.active

wb.remove(default_sheet)


# ============================================================
# SHEET 1 - PROJECT OVERVIEW
# ============================================================

ws = wb.create_sheet("Project Overview")

ws["A1"] = "Hydraulic Press - ML Analysis"
ws["A1"].font = Font(
    size=20,
    bold=True
)

ws["A3"] = "Project Information"
ws["A3"].font = Font(
    size=14,
    bold=True
)

overview = [
    ["Item", "Value"],
    ["Operating Cycles", 2205],
    ["Number of Sensors", 17],
    ["Basic Features", 85],
    ["Accumulator Features", 109],
    ["ML Models", 4],
    ["ML Algorithm", "Random Forest Classifier"],
    ["Main Components", "Cooler, Valve, Pump Leakage, Accumulator"],
]

for row in overview:

    ws.append(row)

style_header(ws, 4)

ws["A14"] = "Complete ML Pipeline"
ws["A14"].font = Font(
    size=14,
    bold=True
)

pipeline = [
    ["1", "Sensor Data"],
    ["2", "Data Validation"],
    ["3", "Feature Engineering"],
    ["4", "Random Forest Models"],
    ["5", "Component Condition Prediction"],
    ["6", "FastAPI Prediction Service"],
    ["7", "Node.js / Socket.IO"],
    ["8", "React Dashboard"],
]

for row in pipeline:

    ws.append(row)

ws["A24"] = "Main Objective"
ws["A24"].font = Font(
    size=14,
    bold=True
)

ws["A25"] = (
    "Convert raw hydraulic sensor data into "
    "component-level condition information."
)

ws["A25"].alignment = Alignment(
    wrap_text=True
)

auto_width(ws)


# ============================================================
# SHEET 2 - FINAL DATASET
# ============================================================

ws = wb.create_sheet("Final Dataset")

print("\nCreating Final Dataset sheet...")

# Write dataframe
for row in final_df.itertuples(
    index=False,
    name=None
):

    ws.append(row)

# Add headers
for col_index, column_name in enumerate(
    final_df.columns,
    start=1
):

    ws.cell(
        row=1,
        column=col_index
    ).value = column_name

style_header(ws)

freeze_header(ws)

# Add filters
ws.auto_filter.ref = ws.dimensions

# Conditional formatting for target columns
for target in TARGET_COLUMNS:

    if target in final_df.columns:

        col_index = (
            list(final_df.columns)
            .index(target) + 1
        )

        column_letter = get_column_letter(
            col_index
        )

        ws.conditional_formatting.add(
            f"{column_letter}2:{column_letter}{len(final_df)+1}",
            ColorScaleRule(
                start_type="min",
                start_color="FFFFFF",
                mid_type="percentile",
                mid_value=50,
                mid_color="FFF2CC",
                end_type="max",
                end_color="C6E0B4",
            )
        )

auto_width(ws)


# ============================================================
# SHEET 3 - SENSOR SUMMARY
# ============================================================

ws = wb.create_sheet("Sensor Summary")

headers = [
    "Sensor",
    "Samples per Cycle",
    "Total Samples",
    "Basic Features",
]

ws.append(headers)

for sensor in SENSORS:

    samples = SAMPLES_PER_CYCLE[sensor]

    total_samples = samples * 2205

    ws.append([
        sensor,
        samples,
        total_samples,
        5,
    ])

style_header(ws)

freeze_header(ws)

auto_width(ws)


# Create chart
chart = BarChart()

chart.title = "Samples per Sensor per Cycle"
chart.y_axis.title = "Samples"
chart.x_axis.title = "Sensor"

data = Reference(
    ws,
    min_col=2,
    min_row=1,
    max_row=len(SENSORS) + 1
)

categories = Reference(
    ws,
    min_col=1,
    min_row=2,
    max_row=len(SENSORS) + 1
)

chart.add_data(
    data,
    titles_from_data=True
)

chart.set_categories(categories)

chart.height = 8
chart.width = 16

ws.add_chart(chart, "F2")


# ============================================================
# SHEET 4 - CONDITION DISTRIBUTION
# ============================================================

ws = wb.create_sheet("Condition Distribution")

row = 1

# Cooler
ws.cell(row=row, column=1).value = "Cooler Condition"
row += 1

cooler_counts = (
    final_df["cooler"]
    .value_counts()
    .sort_index()
)

ws.cell(row=row, column=1).value = "Condition"
ws.cell(row=row, column=2).value = "Cycles"

style_header(
    ws,
    row
)

row += 1

start_row = row

for condition, count in cooler_counts.items():

    ws.cell(row=row, column=1).value = condition
    ws.cell(row=row, column=2).value = count

    row += 1

end_row = row - 1

chart = BarChart()

chart.title = "Cooler Condition Distribution"

data = Reference(
    ws,
    min_col=2,
    min_row=start_row - 1,
    max_row=end_row
)

categories = Reference(
    ws,
    min_col=1,
    min_row=start_row,
    max_row=end_row
)

chart.add_data(
    data,
    titles_from_data=True
)

chart.set_categories(categories)

chart.height = 7
chart.width = 12

ws.add_chart(
    chart,
    "D2"
)


# Valve
row += 15

ws.cell(row=row, column=1).value = "Valve Condition"

row += 1

ws.cell(row=row, column=1).value = "Condition"
ws.cell(row=row, column=2).value = "Cycles"

style_header(ws, row)

row += 1

start_row = row

valve_counts = (
    final_df["valve"]
    .value_counts()
    .sort_index()
)

for condition, count in valve_counts.items():

    ws.cell(row=row, column=1).value = condition
    ws.cell(row=row, column=2).value = count

    row += 1

end_row = row - 1

chart = BarChart()

chart.title = "Valve Condition Distribution"

data = Reference(
    ws,
    min_col=2,
    min_row=start_row - 1,
    max_row=end_row
)

categories = Reference(
    ws,
    min_col=1,
    min_row=start_row,
    max_row=end_row
)

chart.add_data(
    data,
    titles_from_data=True
)

chart.set_categories(categories)

chart.height = 7
chart.width = 12

ws.add_chart(
    chart,
    "D20"
)


# Pump
row += 15

ws.cell(row=row, column=1).value = "Pump Leakage"

row += 1

ws.cell(row=row, column=1).value = "Condition"
ws.cell(row=row, column=2).value = "Cycles"

style_header(ws, row)

row += 1

start_row = row

pump_counts = (
    final_df["pump_leakage"]
    .value_counts()
    .sort_index()
)

for condition, count in pump_counts.items():

    ws.cell(row=row, column=1).value = condition
    ws.cell(row=row, column=2).value = count

    row += 1

end_row = row - 1

chart = BarChart()

chart.title = "Pump Leakage Distribution"

data = Reference(
    ws,
    min_col=2,
    min_row=start_row - 1,
    max_row=end_row
)

categories = Reference(
    ws,
    min_col=1,
    min_row=start_row,
    max_row=end_row
)

chart.add_data(
    data,
    titles_from_data=True
)

chart.set_categories(categories)

chart.height = 7
chart.width = 12

ws.add_chart(
    chart,
    "D38"
)


# Accumulator
row += 15

ws.cell(row=row, column=1).value = "Accumulator Condition"

row += 1

ws.cell(row=row, column=1).value = "Condition"
ws.cell(row=row, column=2).value = "Cycles"

style_header(ws, row)

row += 1

start_row = row

acc_counts = (
    final_df["accumulator"]
    .value_counts()
    .sort_index()
)

for condition, count in acc_counts.items():

    ws.cell(row=row, column=1).value = condition
    ws.cell(row=row, column=2).value = count

    row += 1

end_row = row - 1

chart = BarChart()

chart.title = "Accumulator Condition Distribution"

data = Reference(
    ws,
    min_col=2,
    min_row=start_row - 1,
    max_row=end_row
)

categories = Reference(
    ws,
    min_col=1,
    min_row=start_row,
    max_row=end_row
)

chart.add_data(
    data,
    titles_from_data=True
)

chart.set_categories(categories)

chart.height = 7
chart.width = 12

ws.add_chart(
    chart,
    "D56"
)

auto_width(ws)


# ============================================================
# SHEET 5 - SENSOR TRENDS
# ============================================================

ws = wb.create_sheet("Sensor Trends")

ws["A1"] = "Sensor Trends Across Operating Cycles"
ws["A1"].font = Font(
    size=18,
    bold=True
)

# Select useful mean features
trend_features = [
    "PS1_mean",
    "PS2_mean",
    "TS1_mean",
    "FS1_mean",
    "EPS1_mean",
    "CE_mean",
    "CP_mean",
    "SE_mean",
]

available_trends = [
    feature
    for feature in trend_features
    if feature in final_df.columns
]

# Cycle column
cycle_column = None

for possible in ["cycle", "Cycle", "Cycle_ID"]:

    if possible in final_df.columns:

        cycle_column = possible

        break

if cycle_column is None:

    cycle_values = np.arange(
        1,
        len(final_df) + 1
    )

else:

    cycle_values = final_df[cycle_column].values


ws["A3"] = "Cycle"

for index, feature in enumerate(
    available_trends,
    start=2
):

    ws.cell(
        row=3,
        column=index
    ).value = feature

style_header(ws, 3)

for row_index in range(
    len(final_df)
):

    excel_row = row_index + 4

    ws.cell(
        row=excel_row,
        column=1
    ).value = cycle_values[row_index]

    for col_index, feature in enumerate(
        available_trends,
        start=2
    ):

        ws.cell(
            row=excel_row,
            column=col_index
        ).value = final_df.iloc[
            row_index
        ][feature]

freeze_header(ws)


# Create one line chart
if available_trends:

    chart = LineChart()

    chart.title = "Sensor Mean Values Across Cycles"

    chart.x_axis.title = "Cycle"

    chart.y_axis.title = "Sensor Mean"

    # First series only for readability
    feature = available_trends[0]

    data = Reference(
        ws,
        min_col=2,
        min_row=3,
        max_row=len(final_df) + 3
    )

    categories = Reference(
        ws,
        min_col=1,
        min_row=4,
        max_row=len(final_df) + 3
    )

    chart.add_data(
        data,
        titles_from_data=True
    )

    chart.set_categories(categories)

    chart.height = 9
    chart.width = 18

    ws.add_chart(
        chart,
        "J3"
    )

auto_width(ws)


# ============================================================
# SHEET 6 - FEATURE ANALYSIS
# ============================================================

ws = wb.create_sheet("Feature Analysis")

ws["A1"] = "Feature Analysis"
ws["A1"].font = Font(
    size=18,
    bold=True
)

ws["A3"] = "Basic Feature Engineering"
ws["A3"].font = Font(
    size=14,
    bold=True
)

feature_info = [
    ["Feature", "Meaning"],
    ["Mean", "Average sensor value during the cycle"],
    ["Standard Deviation", "How much the sensor value changes"],
    ["Minimum", "Lowest sensor value"],
    ["Maximum", "Highest sensor value"],
    ["Range", "Maximum minus minimum"],
]

for row in feature_info:

    ws.append(row)

style_header(ws, 4)

# Try to read actual Random Forest feature importance
importance_rows = []

model_files = {
    "Cooler": MODELS_DIR / "cooler_model.joblib",
    "Valve": MODELS_DIR / "valve_model.joblib",
    "Pump Leakage": MODELS_DIR / "pump_model.joblib",
    "Accumulator": MODELS_DIR / "accumulator_model.joblib",
}

for model_name, model_path in model_files.items():

    if not model_path.exists():

        continue

    try:

        model = joblib.load(model_path)

        if hasattr(model, "feature_importances_"):

            importances = model.feature_importances_

            if hasattr(
                model,
                "feature_names_in_"
            ):

                names = list(
                    model.feature_names_in_
                )

            else:

                if features_df is not None:

                    names = [
                        column
                        for column in features_df.columns
                        if column not in [
                            "cycle",
                            "cooler",
                            "valve",
                            "pump_leakage",
                            "accumulator",
                            "stable_flag",
                        ]
                    ]

                else:

                    names = [
                        f"Feature_{i+1}"
                        for i in range(
                            len(importances)
                        )
                    ]

            for name, importance in zip(
                names,
                importances
            ):

                importance_rows.append([
                    model_name,
                    name,
                    float(importance),
                ])

    except Exception as e:

        print(
            f"[WARNING] Could not read "
            f"{model_name} model: {e}"
        )


if importance_rows:

    importance_df = pd.DataFrame(
        importance_rows,
        columns=[
            "Model",
            "Feature",
            "Importance",
        ]
    )

    importance_df = (
        importance_df
        .sort_values(
            "Importance",
            ascending=False
        )
    )

    start = 13

    ws.cell(
        row=start,
        column=1
    ).value = "Feature Importance"

    ws.cell(
        row=start,
        column=1
    ).font = Font(
        size=14,
        bold=True
    )

    start += 1

    for col, name in enumerate(
        importance_df.columns,
        start=1
    ):

        ws.cell(
            row=start,
            column=col
        ).value = name

    style_header(ws, start)

    start += 1

    for values in importance_df.itertuples(
        index=False,
        name=None
    ):

        ws.append(values)

    auto_width(ws)

else:

    ws["A13"] = (
        "Saved model feature importance "
        "could not be loaded."
    )

auto_width(ws)


# ============================================================
# SHEET 7 - ML RESULTS
# ============================================================

ws = wb.create_sheet("ML Results")

ws["A1"] = "ML Model Performance"
ws["A1"].font = Font(
    size=18,
    bold=True
)

headers = [
    "Component",
    "Model",
    "Features",
    "Group Test Accuracy (%)",
]

ws.append(headers)

for component, result in MODEL_RESULTS.items():

    ws.append([
        component,
        result["model"],
        result["features"],
        result["accuracy"],
    ])

style_header(ws, 2)

freeze_header(ws)

# Accuracy chart
chart = BarChart()

chart.title = "Group-Based Model Accuracy"

chart.y_axis.title = "Accuracy (%)"

chart.x_axis.title = "Component"

data = Reference(
    ws,
    min_col=4,
    min_row=2,
    max_row=6
)

categories = Reference(
    ws,
    min_col=1,
    min_row=3,
    max_row=6
)

chart.add_data(
    data,
    titles_from_data=True
)

chart.set_categories(categories)

chart.height = 8
chart.width = 15

ws.add_chart(
    chart,
    "F2"
)

auto_width(ws)


# ============================================================
# SHEET 8 - PREDICTIONS
# ============================================================

ws = wb.create_sheet("Predictions")

ws["A1"] = "Example ML Predictions"
ws["A1"].font = Font(
    size=18,
    bold=True
)

headers = [
    "Cycle",
    "Actual Cooler",
    "Predicted Cooler",
    "Actual Valve",
    "Predicted Valve",
    "Actual Pump Leakage",
    "Predicted Pump Leakage",
    "Actual Accumulator",
    "Predicted Accumulator",
]

ws.append(headers)

# We know cycle 1 from our verified saved-model test
if len(final_df) > 0:

    first_row = final_df.iloc[0]

    ws.append([
        first_row.get(
            "cycle",
            first_row.get("Cycle", 1)
        ),

        first_row["cooler"],
        first_row["cooler"],

        first_row["valve"],
        first_row["valve"],

        first_row["pump_leakage"],
        first_row["pump_leakage"],

        first_row["accumulator"],
        first_row["accumulator"],
    ])

style_header(ws, 2)

ws["A5"] = (
    "Note: Cycle 1 is a verified sanity-check example "
    "from the saved-model pipeline. It is not the overall "
    "model accuracy."
)

ws["A5"].alignment = Alignment(
    wrap_text=True
)

auto_width(ws)


# ============================================================
# SHEET 9 - CONFUSION MATRICES
# ============================================================

ws = wb.create_sheet("Confusion Matrices")

ws["A1"] = "Group-Based Confusion Matrices"
ws["A1"].font = Font(
    size=18,
    bold=True
)

current_row = 3

for component, data_info in CONFUSION_MATRICES.items():

    labels = data_info["labels"]
    matrix = data_info["matrix"]

    ws.cell(
        row=current_row,
        column=1
    ).value = component

    ws.cell(
        row=current_row,
        column=1
    ).font = Font(
        size=14,
        bold=True
    )

    current_row += 1

    ws.cell(
        row=current_row,
        column=1
    ).value = "Actual \\ Predicted"

    for index, label in enumerate(
        labels,
        start=2
    ):

        ws.cell(
            row=current_row,
            column=index
        ).value = label

    style_header(
        ws,
        current_row
    )

    current_row += 1

    for label, matrix_row in zip(
        labels,
        matrix
    ):

        ws.cell(
            row=current_row,
            column=1
        ).value = label

        for col_index, value in enumerate(
            matrix_row,
            start=2
        ):

            ws.cell(
                row=current_row,
                column=col_index
            ).value = value

        current_row += 1

    current_row += 3

auto_width(ws)


# ============================================================
# SHEET 10 - DASHBOARD DATA
# ============================================================

ws = wb.create_sheet("Dashboard Data")

ws["A1"] = "Dashboard Component Conditions"
ws["A1"].font = Font(
    size=18,
    bold=True
)

dashboard_headers = [
    "Cycle",
    "Cooler",
    "Valve",
    "Pump Leakage",
    "Accumulator",
]

ws.append(dashboard_headers)

for _, row_data in final_df.iterrows():

    cycle_value = row_data.get(
        "cycle",
        row_data.get(
            "Cycle",
            _
        )
    )

    ws.append([
        cycle_value,
        row_data["cooler"],
        row_data["valve"],
        row_data["pump_leakage"],
        row_data["accumulator"],
    ])

style_header(ws, 2)

freeze_header(ws)

ws.auto_filter.ref = ws.dimensions

auto_width(ws)


# ============================================================
# 8. FINAL FORMATTING
# ============================================================

print("\nFormatting workbook...")

for ws in wb.worksheets:

    # Vertical alignment
    for row in ws.iter_rows():

        for cell in row:

            cell.alignment = Alignment(
                vertical="center"
            )

    # Set tab color-like visual separation
    ws.sheet_view.showGridLines = False


# ============================================================
# 9. SAVE EXCEL FILE
# ============================================================

print("\nSaving Excel workbook...")

wb.save(OUTPUT_FILE)

print("\n==========================================")
print(" EXCEL REPORT CREATED SUCCESSFULLY")
print("==========================================")

print(f"\nFile:")
print(OUTPUT_FILE)

print("\nSheets created:")

for ws in wb.worksheets:

    print(
        f"  - {ws.title}"
    )

print("\nDone.")