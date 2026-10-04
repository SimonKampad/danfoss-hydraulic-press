import fs from 'fs';
import path from 'path';
import readline from 'readline';

const SENSORS = [
  'PS1', 'PS2', 'PS3', 'PS4', 'PS5', 'PS6',
  'EPS1',
  'FS1', 'FS2',
  'TS1', 'TS2', 'TS3', 'TS4',
  'VS1', 'CE', 'CP', 'SE'
];

const OFFLINE_ACCURACIES = {
  cooler: '99.81%',
  valve: '77.41%',
  pump_leakage: '98.46%',
  accumulator: '56.37% (Primary Group Split) / 99.32% (Diagnostic Stratified)'
};

const COMPONENT_LABELS = {
  cooler: {
    name: 'Cooler Efficiency Condition',
    target: 'cooler',
    classes: {
      3: 'Close to Total Failure (3)',
      20: 'Reduced Efficiency (20)',
      100: 'Full Efficiency (100)'
    }
  },
  valve: {
    name: 'Proportional Valve Condition',
    target: 'valve',
    classes: {
      73: 'Close to Total Failure (73)',
      80: 'Severe Switching Lag (80)',
      90: 'Slight Switching Lag (90)',
      100: 'Optimal Switching Behavior (100)'
    }
  },
  pump_leakage: {
    name: 'Internal Pump Leakage',
    target: 'pump_leakage',
    classes: {
      0: 'No Internal Leakage (0)',
      1: 'Weak Internal Leakage (1)',
      2: 'Severe Internal Leakage (2)'
    }
  },
  accumulator: {
    name: 'Hydraulic Accumulator Gas Pressure',
    target: 'accumulator',
    classes: {
      90: 'Severely Damaged / Low Pressure (90 bar)',
      100: 'Severely Reduced Pressure (100 bar)',
      115: 'Slightly Reduced Pressure (115 bar)',
      130: 'Optimal Pressure (130 bar)'
    }
  }
};

export class DatasetReplayEngine {
  constructor(dataDir = 'E:/Danfoss Project/dataset', fastApiUrl = 'http://127.0.0.1:8000') {
    this.dataDir = dataDir;
    this.fastApiUrl = fastApiUrl;
    
    this.profileData = []; // Cached profile lines: array of { cooler, valve, pump_leakage, accumulator, stable_flag }
    this.currentCycleNumber = 1;
    this.maxCycles = 2205;
    
    this.cycleRawCache = new Map(); // Cache recent cycle sensor dicts
    this.lastMlPrediction = null;
    this.isFastApiAvailable = false;
    
    this.initProfile();
  }

  initProfile() {
    try {
      const profilePath = path.join(this.dataDir, 'profile.txt');
      if (fs.existsSync(profilePath)) {
        const lines = fs.readFileSync(profilePath, 'utf8').trim().split('\n');
        this.profileData = lines.map((line, idx) => {
          const parts = line.trim().split(/\s+/).map(Number);
          return {
            cycleNumber: idx + 1,
            cooler: parts[0],
            valve: parts[1],
            pump_leakage: parts[2],
            accumulator: parts[3],
            stable_flag: parts[4]
          };
        });
        this.maxCycles = this.profileData.length;
        console.log(`[DatasetReplayEngine] Successfully loaded profile.txt (${this.maxCycles} cycles).`);
      } else {
        console.warn(`[DatasetReplayEngine] Warning: profile.txt not found at ${profilePath}`);
      }
    } catch (err) {
      console.error(`[DatasetReplayEngine] Error loading profile.txt:`, err);
    }
  }

  getGroundTruth(cycleNumber) {
    if (cycleNumber >= 1 && cycleNumber <= this.profileData.length) {
      return this.profileData[cycleNumber - 1];
    }
    return null;
  }

  async loadCycleRawSensors(cycleNumber) {
    if (this.cycleRawCache.has(cycleNumber)) {
      return this.cycleRawCache.get(cycleNumber);
    }

    const sensorData = {};
    for (const sensor of SENSORS) {
      const filePath = path.join(this.dataDir, `${sensor}.txt`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Dataset sensor file missing: ${filePath}`);
      }
      
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
      
      let currentLine = 0;
      let lineFound = false;
      for await (const line of rl) {
        currentLine++;
        if (currentLine === cycleNumber) {
          sensorData[sensor] = line.trim().split(/\s+/).map(Number);
          lineFound = true;
          break;
        }
      }
      if (!lineFound) {
        throw new Error(`Cycle ${cycleNumber} not found in ${sensor}.txt`);
      }
    }

    // Retain only last 5 loaded cycles in cache to manage memory
    if (this.cycleRawCache.size > 5) {
      const firstKey = this.cycleRawCache.keys().next().value;
      this.cycleRawCache.delete(firstKey);
    }
    this.cycleRawCache.set(cycleNumber, sensorData);
    return sensorData;
  }

  async runMlPredictionForCycle(cycleNumber) {
    const groundTruth = this.getGroundTruth(cycleNumber);
    const rawSensors = await this.loadCycleRawSensors(cycleNumber);

    // CRITICAL SECURITY / DATA LEAKAGE REQUIREMENT:
    // We send ONLY the 17 raw sensor arrays to FastAPI /predict.
    // Ground truth targets (cooler, valve, etc.) are NEVER sent in the prediction request.
    const predictPayload = {};
    for (const sensor of SENSORS) {
      predictPayload[sensor] = rawSensors[sensor];
    }

    try {
      const response = await fetch(`${this.fastApiUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(predictPayload)
      });

      if (!response.ok) {
        throw new Error(`FastAPI responded with status ${response.status}`);
      }

      const result = await response.ok ? await response.json() : null;
      this.isFastApiAvailable = true;

      // Build structured comparison payload with ground truth
      const comparison = [];
      const targets = ['cooler', 'valve', 'pump_leakage', 'accumulator'];

      for (const target of targets) {
        const predictedVal = result.predictions[target];
        const actualVal = groundTruth ? groundTruth[target] : null;
        const probs = result.probabilities[target] || {};
        
        // Find predicted class probability
        const probForPredicted = probs[String(predictedVal)] !== undefined 
          ? probs[String(predictedVal)] 
          : (probs[predictedVal] !== undefined ? probs[predictedVal] : 0.0);

        comparison.push({
          targetKey: target,
          componentName: COMPONENT_LABELS[target].name,
          predictedClass: predictedVal,
          predictedClassLabel: COMPONENT_LABELS[target].classes[predictedVal] || `Class ${predictedVal}`,
          actualGroundTruth: actualVal,
          actualClassLabel: actualVal !== null ? (COMPONENT_LABELS[target].classes[actualVal] || `Class ${actualVal}`) : 'N/A',
          predictedProbability: parseFloat((probForPredicted * 100).toFixed(1)),
          allProbabilities: probs,
          match: actualVal !== null ? (predictedVal === actualVal) : null,
          offlineAccuracy: OFFLINE_ACCURACIES[target]
        });
      }

      const mlPayload = {
        status: 'SUCCESS',
        mode: 'DATASET_REPLAY',
        cycleNumber,
        fastApiUrl: this.fastApiUrl,
        fastApiStatus: 'ONLINE',
        timestamp: new Date().toISOString(),
        predictions: result.predictions,
        probabilities: result.probabilities,
        groundTruth,
        comparison,
        pipelineMetadata: {
          modelsUsed: ['cooler_model.joblib', 'valve_model.joblib', 'pump_model.joblib', 'accumulator_model.joblib'],
          featureCount: { basic: 85, accumulator: 109 },
          apiEndpoint: `${this.fastApiUrl}/predict`,
          isHardcoded: false
        }
      };

      this.lastMlPrediction = mlPayload;
      return mlPayload;
    } catch (err) {
      console.error(`[DatasetReplayEngine] FastAPI Prediction Failed for Cycle ${cycleNumber}:`, err.message);
      this.isFastApiAvailable = false;
      const errorPayload = {
        status: 'ERROR',
        mode: 'DATASET_REPLAY',
        cycleNumber,
        fastApiUrl: this.fastApiUrl,
        fastApiStatus: 'OFFLINE',
        errorMessage: err.message,
        timestamp: new Date().toISOString(),
        groundTruth,
        predictions: null,
        comparison: null
      };
      this.lastMlPrediction = errorPayload;
      return errorPayload;
    }
  }

  generateTelemetryFrame(sensorData, cycleNumber, progressRatio, elapsedSec) {
    // Helper to sample array at relative progress ratio (0.0 to 1.0)
    const sampleAtRatio = (arr) => {
      if (!arr || arr.length === 0) return 0;
      const idx = Math.min(arr.length - 1, Math.floor(progressRatio * arr.length));
      return arr[idx];
    };

    const ps1 = sampleAtRatio(sensorData.PS1);
    const ps2 = sampleAtRatio(sensorData.PS2);
    const ps3 = sampleAtRatio(sensorData.PS3);
    const fs1 = sampleAtRatio(sensorData.FS1);
    const ts1 = sampleAtRatio(sensorData.TS1);
    const eps1 = sampleAtRatio(sensorData.EPS1);

    // Calculate phase key from progressRatio
    let phase = 'FAST_DOWN';
    let phaseName = 'Fast Down (Stroke)';
    let positionMm = progressRatio * 250.0;
    let speedMmS = 200.0;

    if (progressRatio < 0.15) {
      phase = 'FAST_DOWN';
      phaseName = 'Fast Down (Stroke)';
      positionMm = (progressRatio / 0.15) * 200.0;
      speedMmS = 200.0;
    } else if (progressRatio < 0.70) {
      phase = 'WORKING';
      phaseName = 'Working Stroke (Pressing)';
      positionMm = 200.0 + ((progressRatio - 0.15) / 0.55) * 50.0;
      speedMmS = 10.0;
    } else if (progressRatio < 0.85) {
      phase = 'HOLDING';
      phaseName = 'Holding Load';
      positionMm = 250.0;
      speedMmS = 0.0;
    } else {
      phase = 'FAST_UP';
      phaseName = 'Fast Return (Up)';
      positionMm = 250.0 - ((progressRatio - 0.85) / 0.15) * 250.0;
      speedMmS = 200.0;
    }

    // Convert Motor Power (EPS1 in W/kW) to Motor Current estimate (A)
    const motorCurrentA = parseFloat((eps1 / 380.0 / 1.732 / 0.85).toFixed(2)) || parseFloat((eps1 / 100).toFixed(2)) || 18.5;

    return {
      timestamp: new Date().toISOString(),
      timeMs: Date.now(),
      cycleNumber,
      phase,
      phaseName,
      phaseProgressPct: Math.round(progressRatio * 100),
      cycleProgressPct: Math.round(progressRatio * 100),
      pressureBar: parseFloat(ps1.toFixed(2)),
      flowLmin: parseFloat(fs1.toFixed(2)),
      speedMmS: parseFloat(speedMmS.toFixed(2)),
      positionMm: parseFloat(positionMm.toFixed(2)),
      temperatureC: parseFloat(ts1.toFixed(2)),
      motorCurrentA: Math.max(5.0, Math.min(60.0, motorCurrentA)),
      status: 'RUNNING',
      speedMultiplier: 1.0,
      dataMode: 'DATASET_REPLAY',
      fault: null,
      rawSensorsSnapshot: {
        PS1: parseFloat(ps1.toFixed(2)),
        PS2: parseFloat(ps2.toFixed(2)),
        PS3: parseFloat(ps3.toFixed(2)),
        FS1: parseFloat(fs1.toFixed(2)),
        TS1: parseFloat(ts1.toFixed(2))
      }
    };
  }
}
