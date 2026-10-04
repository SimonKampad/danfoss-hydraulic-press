import os
import sys
from typing import Dict, List, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.predictor import HydraulicPredictor

# Expected sample counts per sensor for one complete hydraulic cycle
EXPECTED_SAMPLE_COUNTS = {
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
    "SE": 60
}

MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
predictor: HydraulicPredictor = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event to load ML models once at application startup."""
    global predictor
    try:
        predictor = HydraulicPredictor(models_dir=MODELS_DIR)
        print(f"Successfully loaded Stage 2 HydraulicPredictor from '{MODELS_DIR}'.")
    except Exception as e:
        print(f"Error loading HydraulicPredictor: {e}")
        predictor = None
    yield


app = FastAPI(
    title="Danfoss Hydraulic System Prediction API",
    description=(
        "REST API for real-time condition monitoring and fault prediction "
        "of hydraulic system components (Cooler, Valve, Pump Leakage, Accumulator)."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CycleRequest(BaseModel):
    """Pydantic schema for a complete hydraulic cycle raw sensor request."""

    PS1: List[float] = Field(..., description="Pressure sensor 1 raw values (6000 samples)")
    PS2: List[float] = Field(..., description="Pressure sensor 2 raw values (6000 samples)")
    PS3: List[float] = Field(..., description="Pressure sensor 3 raw values (6000 samples)")
    PS4: List[float] = Field(..., description="Pressure sensor 4 raw values (6000 samples)")
    PS5: List[float] = Field(..., description="Pressure sensor 5 raw values (6000 samples)")
    PS6: List[float] = Field(..., description="Pressure sensor 6 raw values (6000 samples)")
    EPS1: List[float] = Field(..., description="Motor power sensor raw values (6000 samples)")

    FS1: List[float] = Field(..., description="Volume flow sensor 1 raw values (600 samples)")
    FS2: List[float] = Field(..., description="Volume flow sensor 2 raw values (600 samples)")

    TS1: List[float] = Field(..., description="Temperature sensor 1 raw values (60 samples)")
    TS2: List[float] = Field(..., description="Temperature sensor 2 raw values (60 samples)")
    TS3: List[float] = Field(..., description="Temperature sensor 3 raw values (60 samples)")
    TS4: List[float] = Field(..., description="Temperature sensor 4 raw values (60 samples)")
    VS1: List[float] = Field(..., description="Vibration sensor raw values (60 samples)")
    CE: List[float] = Field(..., description="Cooling efficiency sensor raw values (60 samples)")
    CP: List[float] = Field(..., description="Cooling power sensor raw values (60 samples)")
    SE: List[float] = Field(..., description="Efficiency factor sensor raw values (60 samples)")

    @model_validator(mode="after")
    def validate_sample_counts(self):
        """Validate sample counts for all 17 sensors."""
        sensor_data = self.model_dump()
        
        for sensor, expected_count in EXPECTED_SAMPLE_COUNTS.items():
            if sensor not in sensor_data or sensor_data[sensor] is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Missing required sensor: '{sensor}'"
                )
            
            samples = sensor_data[sensor]
            if len(samples) == 0:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Sensor '{sensor}' array cannot be empty"
                )
                
            if len(samples) != expected_count:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{sensor} must contain exactly {expected_count} samples, received {len(samples)}"
                )
        return self


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    models_dir: str


class PredictionResponse(BaseModel):
    predictions: Dict[str, int] = Field(
        ...,
        description="Predicted component condition classes for cooler, valve, pump_leakage, accumulator"
    )
    probabilities: Dict[str, Dict[str, float]] = Field(
        ...,
        description="Predicted class probabilities for each component model"
    )


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check endpoint",
    tags=["Health"]
)
def health_check():
    """Returns API health status and model availability."""
    is_loaded = predictor is not None and len(predictor.models) == 4
    return HealthResponse(
        status="ok" if is_loaded else "warning",
        models_loaded=is_loaded,
        models_dir=MODELS_DIR
    )


@app.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Predict component conditions for one hydraulic cycle",
    tags=["Prediction"]
)
def predict_cycle(request: CycleRequest):
    """
    Accepts raw sensor measurements for 1 complete hydraulic cycle (17 sensors),
    runs Stage 2 feature extraction and model inference, and returns predicted
    component conditions along with class probabilities.
    """
    if predictor is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Prediction model pipeline is not loaded."
        )

    try:
        sensor_dict = request.model_dump()
        result = predictor.predict_single_cycle(sensor_dict=sensor_dict)
        
        # Convert numeric class probability keys to strings for JSON schema compatibility
        formatted_probabilities = {}
        for comp, probs in result["probabilities"].items():
            formatted_probabilities[comp] = {str(cls_lbl): prob for cls_lbl, prob in probs.items()}

        return PredictionResponse(
            predictions=result["predictions"],
            probabilities=formatted_probabilities
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failure: {str(e)}"
        )
