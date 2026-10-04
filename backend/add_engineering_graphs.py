from pathlib import Path
import numpy as np
import pandas as pd
from openpyxl import load_workbook
from openpyxl.chart import LineChart, Reference
from openpyxl.styles import Font, PatternFill, Alignment


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

# E:\Danfoss Project\dataset
DATASET_DIR = BASE_DIR.parent.parent / "dataset"

# Existing Excel report
EXCEL_FILE = BASE_DIR / "Hydraulic_Press_ML_Analysis.xlsx"


# ============================================================
# DATASET SENSOR INFORMATION
# ============================================================

SENSOR_SAMPLES = {
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
# HELPER FUNCTIONS
# ============================================================

def load_sensor(sensor_name):
    """
    Load one sensor TXT file.

    Each row represents one operating cycle.
    Each column represents a measurement inside that cycle.
    """

    file_path = DATASET_DIR / f"{sensor_name}.txt"

    if not file_path.exists():
        raise FileNotFoundError(
            f"Sensor file not found: {file_path}"
        )

    data = pd.read_csv(
        file_path,
        sep=r"\s+",
        header=None
    )

    print(
        f"[OK] Loaded {sensor_name}.txt: "
        f"{data.shape[0]} cycles x {data.shape[1]} samples"
    )

    return data


def create_time_axis(number_of_samples):
    """
    Creates a normalized time axis.

    The dataset gives samples per cycle but does not provide
    an explicit timestamp column in the TXT files.

    Therefore we represent the cycle from 0 to 1 normalized
    time unit.
    """

    return np.linspace(
        0,
        1,
        number_of_samples
    )


def add_line_chart(
    worksheet,
    title,
    y_axis_title,
    data_column,
    chart_position,
    max_row
):
    """
    Add a line chart to an Excel worksheet.
    """

    chart = LineChart()

    chart.title = title
    chart.style = 2

    chart.y_axis.title = y_axis_title
    chart.x_axis.title = "Normalized Time"

    chart.height = 8
    chart.width = 15

    data = Reference(
        worksheet,
        min_col=data_column,
        min_row=1,
        max_row=max_row
    )

    categories = Reference(
        worksheet,
        min_col=1,
        min_row=2,
        max_row=max_row
    )

    chart.add_data(
        data,
        titles_from_data=True
    )

    chart.set_categories(categories)

    chart.legend = None

    worksheet.add_chart(
        chart,
        chart_position
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print("\n==========================================")
    print(" HYDRAULIC PRESS ENGINEERING GRAPH ADDER")
    print("==========================================\n")

    # --------------------------------------------------------
    # Check Excel file
    # --------------------------------------------------------

    if not EXCEL_FILE.exists():

        print(
            f"[ERROR] Excel file not found:\n"
            f"{EXCEL_FILE}"
        )

        return

    print(f"[OK] Excel file found:")
    print(EXCEL_FILE)

    print()

    # --------------------------------------------------------
    # Load selected sensors
    # --------------------------------------------------------

    ps1 = load_sensor("PS1")
    fs1 = load_sensor("FS1")
    vs1 = load_sensor("VS1")
    cp = load_sensor("CP")
    se = load_sensor("SE")

    # --------------------------------------------------------
    # Select one representative cycle
    # --------------------------------------------------------

    # Cycle 1
    cycle_number = 1
    cycle_index = cycle_number - 1

    pressure_values = ps1.iloc[cycle_index].values.astype(float)
    flow_values = fs1.iloc[cycle_index].values.astype(float)

    vs1_values = vs1.iloc[cycle_index].values.astype(float)
    cp_values = cp.iloc[cycle_index].values.astype(float)
    se_values = se.iloc[cycle_index].values.astype(float)

    # --------------------------------------------------------
    # Create time axes
    # --------------------------------------------------------

    pressure_time = create_time_axis(len(pressure_values))
    flow_time = create_time_axis(len(flow_values))
    vs1_time = create_time_axis(len(vs1_values))
    cp_time = create_time_axis(len(cp_values))
    se_time = create_time_axis(len(se_values))

    # --------------------------------------------------------
    # Open existing workbook
    # --------------------------------------------------------

    print("\nOpening existing Excel workbook...")

    workbook = load_workbook(EXCEL_FILE)

    # --------------------------------------------------------
    # Remove old Engineering Graphs sheet
    # --------------------------------------------------------

    if "Engineering Graphs" in workbook.sheetnames:

        print(
            "[INFO] Removing existing "
            "'Engineering Graphs' sheet..."
        )

        del workbook["Engineering Graphs"]

    if "Engineering Graph Data" in workbook.sheetnames:

        print(
            "[INFO] Removing existing "
            "'Engineering Graph Data' sheet..."
        )

        del workbook["Engineering Graph Data"]

    # --------------------------------------------------------
    # Create sheets
    # --------------------------------------------------------

    graph_sheet = workbook.create_sheet(
        "Engineering Graphs"
    )

    data_sheet = workbook.create_sheet(
        "Engineering Graph Data"
    )

    # ========================================================
    # ENGINEERING GRAPH DATA
    # ========================================================

    print("\nCreating engineering graph data...")

    # --------------------------------------------------------
    # Pressure data
    # --------------------------------------------------------

    data_sheet["A1"] = "Pressure Time"
    data_sheet["B1"] = "PS1 Pressure"

    max_pressure_rows = len(pressure_values) + 1

    for i, value in enumerate(
        pressure_time,
        start=2
    ):
        data_sheet.cell(
            row=i,
            column=1,
            value=float(value)
        )

    for i, value in enumerate(
        pressure_values,
        start=2
    ):
        data_sheet.cell(
            row=i,
            column=2,
            value=float(value)
        )

    # --------------------------------------------------------
    # Flow data
    # --------------------------------------------------------

    flow_start_col = 4

    data_sheet.cell(
        row=1,
        column=flow_start_col,
        value="Flow Time"
    )

    data_sheet.cell(
        row=1,
        column=flow_start_col + 1,
        value="FS1 Flow"
    )

    max_flow_rows = len(flow_values) + 1

    for i, value in enumerate(
        flow_time,
        start=2
    ):
        data_sheet.cell(
            row=i,
            column=flow_start_col,
            value=float(value)
        )

    for i, value in enumerate(
        flow_values,
        start=2
    ):
        data_sheet.cell(
            row=i,
            column=flow_start_col + 1,
            value=float(value)
        )

    # --------------------------------------------------------
    # VS1 data
    # --------------------------------------------------------

    vs_start_col = 7

    data_sheet.cell(
        row=1,
        column=vs_start_col,
        value="VS1 Time"
    )

    data_sheet.cell(
        row=1,
        column=vs_start_col + 1,
        value="VS1"
    )

    for i, value in enumerate(
        vs1_time,
        start=2
    ):
        data_sheet.cell(
            row=i,
            column=vs_start_col,
            value=float(value)
        )

    for i, value in enumerate(
        vs1_values,
        start=2
    ):
        data_sheet.cell(
            row=i,
            column=vs_start_col + 1,
            value=float(value)
        )

    # --------------------------------------------------------
    # CP data
    # --------------------------------------------------------

    cp_start_col = 10

    data_sheet.cell(
        row=1,
        column=cp_start_col,
        value="CP Time"
    )

    data_sheet.cell(
        row=1,
        column=cp_start_col + 1,
        value="CP"
    )

    for i, value in enumerate(
        cp_time,
        start=2
    ):
        data_sheet.cell(
            row=i,
            column=cp_start_col,
            value=float(value)
        )

    for i, value in enumerate(
        cp_values,
        start=2
    ):
        data_sheet.cell(
            row=i,
            column=cp_start_col + 1,
            value=float(value)
        )

    # --------------------------------------------------------
    # SE data
    # --------------------------------------------------------

    se_start_col = 13

    data_sheet.cell(
        row=1,
        column=se_start_col,
        value="SE Time"
    )

    data_sheet.cell(
        row=1,
        column=se_start_col + 1,
        value="SE"
    )

    for i, value in enumerate(
        se_time,
        start=2
    ):
        data_sheet.cell(
            row=i,
            column=se_start_col,
            value=float(value)
        )

    for i, value in enumerate(
        se_values,
        start=2
    ):
        data_sheet.cell(
            row=i,
            column=se_start_col + 1,
            value=float(value)
        )

    # ========================================================
    # FORMAT DATA SHEET
    # ========================================================

    header_fill = PatternFill(
        fill_type="solid",
        fgColor="1F4E78"
    )

    for cell in data_sheet[1]:

        cell.font = Font(
            bold=True,
            color="FFFFFF"
        )

        cell.fill = header_fill

        cell.alignment = Alignment(
            horizontal="center"
        )

    # Width
    for column in range(1, 15):

        data_sheet.column_dimensions[
            chr(64 + column)
        ].width = 18

    # ========================================================
    # ENGINEERING GRAPH SHEET
    # ========================================================

    graph_sheet["A1"] = "Hydraulic Press Engineering Graphs"

    graph_sheet["A1"].font = Font(
        bold=True,
        size=18
    )

    graph_sheet["A3"] = (
        f"Representative Dataset Cycle: {cycle_number}"
    )

    graph_sheet["A4"] = (
        "Time is normalized because the raw TXT files "
        "contain samples per cycle rather than explicit timestamps."
    )

    graph_sheet["A4"].alignment = Alignment(
        wrap_text=True
    )

    # --------------------------------------------------------
    # Graph 1: Hydraulic Pressure
    # --------------------------------------------------------

    add_line_chart(
        data_sheet,
        "Hydraulic Pressure vs. Time",
        "PS1 Pressure",
        2,
        "A6",
        max_pressure_rows
    )

    # --------------------------------------------------------
    # Graph 2: Hydraulic Flow
    # --------------------------------------------------------

    add_line_chart(
        data_sheet,
        "Hydraulic Flow vs. Time",
        "FS1 Flow",
        5,
        "J6",
        max_flow_rows
    )

    # --------------------------------------------------------
    # Graph 3: VS1
    # --------------------------------------------------------

    add_line_chart(
        data_sheet,
        "VS1 Signal vs. Time",
        "VS1",
        8,
        "A23",
        len(vs1_values) + 1
    )

    # --------------------------------------------------------
    # Graph 4: CP
    # --------------------------------------------------------

    add_line_chart(
        data_sheet,
        "CP Signal vs. Time",
        "CP",
        11,
        "J23",
        len(cp_values) + 1
    )

    # --------------------------------------------------------
    # Graph 5: SE
    # --------------------------------------------------------

    add_line_chart(
        data_sheet,
        "SE Signal vs. Time",
        "SE",
        14,
        "A40",
        len(se_values) + 1
    )

    # --------------------------------------------------------
    # Explanation
    # --------------------------------------------------------

    graph_sheet["A57"] = "Signal Mapping"

    graph_sheet["A57"].font = Font(
        bold=True,
        size=14
    )

    explanations = [
        (
            "PS1",
            "Used as representative hydraulic pressure signal."
        ),
        (
            "FS1",
            "Used as representative hydraulic flow signal."
        ),
        (
            "VS1",
            "Dataset signal shown directly; not renamed as cylinder speed "
            "without dataset evidence."
        ),
        (
            "CP",
            "Dataset signal shown directly; not renamed as cylinder position "
            "without dataset evidence."
        ),
        (
            "SE",
            "Dataset signal shown directly for additional engineering analysis."
        ),
    ]

    row = 59

    for signal, explanation in explanations:

        graph_sheet.cell(
            row=row,
            column=1,
            value=signal
        )

        graph_sheet.cell(
            row=row,
            column=2,
            value=explanation
        )

        graph_sheet.cell(
            row=row,
            column=2
        ).alignment = Alignment(
            wrap_text=True
        )

        row += 1

    graph_sheet.column_dimensions["A"].width = 20
    graph_sheet.column_dimensions["B"].width = 80

    # --------------------------------------------------------
    # Save workbook
    # --------------------------------------------------------

    print("\nSaving updated Excel workbook...")

    workbook.save(EXCEL_FILE)

    print("\n==========================================")
    print(" ENGINEERING GRAPHS ADDED SUCCESSFULLY")
    print("==========================================")

    print("\nUpdated file:")
    print(EXCEL_FILE)

    print("\nAdded sheets:")
    print("  - Engineering Graphs")
    print("  - Engineering Graph Data")

    print("\nAdded graphs:")
    print("  - Hydraulic Pressure vs. Time")
    print("  - Hydraulic Flow vs. Time")
    print("  - VS1 Signal vs. Time")
    print("  - CP Signal vs. Time")
    print("  - SE Signal vs. Time")


if __name__ == "__main__":
    main()