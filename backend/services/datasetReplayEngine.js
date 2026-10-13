import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { SCENARIOS, applyScenarioToSensors } from './scenarioEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

/**
 * Resolves the dataset directory safely across local development and Render production.
 * Never fails or relies on hardcoded Windows drive letters if the directory does not exist.
 */
function resolveDatasetDirectory(customDir) {
  if (customDir && fs.existsSync(customDir)) {
    return customDir;
  }
  // Try relative path to deployment_dataset from current directory
  const relativeToDir = path.resolve(__dirname, '../deployment_dataset');
  if (fs.existsSync(relativeToDir)) {
    return relativeToDir;
  }
  const relativeToCwd = path.resolve(process.cwd(), 'deployment_dataset');
  if (fs.existsSync(relativeToCwd)) {
    return relativeToCwd;
  }
  const relativeToBackend = path.resolve(process.cwd(), 'backend/deployment_dataset');
  if (fs.existsSync(relativeToBackend)) {
    return relativeToBackend;
  }
  return relativeToDir;
}

/**
 * Normalizes FastAPI base URL to prevent double slashes or accidental /predict suffixes
 */
function normalizeFastApiUrl(url) {
  let clean = (url || 'http://127.0.0.1:8000').trim();
  clean = clean.replace(/\/+$/, ''); // remove trailing slash
  clean = clean.replace(/\/predict$/, ''); // remove accidental /predict suffix
  clean = clean.replace(/\/health$/, ''); // remove accidental /health suffix
  return clean;
}

export class DatasetReplayEngine {
  constructor(
    dataDir = process.env.DATASET_DIR,
    fastApiUrl = process.env.FASTAPI_URL || 'http://127.0.0.1:8000'
  ) {
    this.dataDir = resolveDatasetDirectory(dataDir);
    this.fastApiUrl = normalizeFastApiUrl(fastApiUrl);

    this.profileData = [];
    this.currentCycleNumber = 1;
    this.maxCycles = 2205;

    this.currentScenarioId = 'NORMAL_OPERATION';

    this.cycleRawCache = new Map();
    this.lastMlPrediction = null;

    // Health checking state
    this.isFastApiAvailable = false;
    this.fastApiStatus = 'UNKNOWN'; // 'ONLINE' | 'OFFLINE' | 'UNKNOWN'
    this.modelsLoaded = false;
    this.fastApiLatencyMs = null;
    this.fastApiLastError = null;
    this.lastHealthCheckTime = null;

    console.log(`[DatasetReplayEngine] Initialized with Dataset Directory: ${this.dataDir}`);
    console.log(`[DatasetReplayEngine] Configured FastAPI URL: ${this.fastApiUrl}`);

    this.initProfile();
    // Run initial non-blocking health check
    this.checkFastApiHealth().catch(() => {});
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
        console.log(`[DatasetReplayEngine] Successfully loaded profile.txt (${this.maxCycles} cycles available).`);
      } else {
        console.warn(`[DatasetReplayEngine] Warning: profile.txt not found at ${profilePath}`);
      }
    } catch (err) {
      console.error(`[DatasetReplayEngine] Error loading profile.txt:`, err.message);
    }
  }

  /**
   * Health probe to check if FastAPI service is reachable and reports models loaded
   */
  async checkFastApiHealth(timeoutMs = 3000) {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.fastApiUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeout);
      this.fastApiLatencyMs = Date.now() - startTime;
      this.lastHealthCheckTime = new Date().toISOString();

      if (response.ok) {
        const body = await response.json();
        this.isFastApiAvailable = true;
        this.fastApiStatus = 'ONLINE';
        this.modelsLoaded = !!body.models_loaded;
        this.fastApiLastError = null;
        return {
          available: true,
          status: 'ONLINE',
          modelsLoaded: this.modelsLoaded,
          latencyMs: this.fastApiLatencyMs,
          url: this.fastApiUrl
        };
      } else {
        this.isFastApiAvailable = false;
        this.fastApiStatus = 'OFFLINE';
        this.modelsLoaded = false;
        this.fastApiLastError = `HTTP ${response.status}: ${response.statusText}`;
        return {
          available: false,
          status: 'OFFLINE',
          error: this.fastApiLastError,
          url: this.fastApiUrl
        };
      }
    } catch (err) {
      clearTimeout(timeout);
      this.isFastApiAvailable = false;
      this.fastApiStatus = 'OFFLINE';
      this.modelsLoaded = false;
      this.fastApiLatencyMs = null;
      this.fastApiLastError = err.name === 'AbortError' ? 'Connection timed out (3s)' : err.message;
      this.lastHealthCheckTime = new Date().toISOString();
      return {
        available: false,
        status: 'OFFLINE',
        error: this.fastApiLastError,
        url: this.fastApiUrl
      };
    }
  }

  getGroundTruth(cycleNumber) {
    if (cycleNumber >= 1 && cycleNumber <= this.profileData.length) {
      return this.profileData[cycleNumber - 1];
    }
    return null;
  }

  async loadCycleRawSensors(cycleNumber) {
    // Clamp to available range
    const clampedCycle = Math.max(1, Math.min(this.maxCycles, cycleNumber));

    if (this.cycleRawCache.has(clampedCycle)) {
      return this.cycleRawCache.get(clampedCycle);
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
        if (currentLine === clampedCycle) {
          sensorData[sensor] = line.trim().split(/\s+/).map(Number);
          lineFound = true;
          break;
        }
      }
      if (!lineFound) {
        throw new Error(`Cycle ${clampedCycle} not found in ${sensor}.txt`);
      }
    }

    // Retain up to 10 cycles in cache
    if (this.cycleRawCache.size > 10) {
      const firstKey = this.cycleRawCache.keys().next().value;
      this.cycleRawCache.delete(firstKey);
    }
    this.cycleRawCache.set(clampedCycle, sensorData);
    return sensorData;
  }

  setScenario(scenarioId) {
    const sc = SCENARIOS[scenarioId] || SCENARIOS.NORMAL_OPERATION;
    this.currentScenarioId = sc.id;

    // If scenario specifies a default real failure cycle, auto-select it
    if (sc.defaultCycle && sc.dataSource === 'REAL_FAULT_REPLAY') {
      this.currentCycleNumber = Math.min(this.maxCycles, sc.defaultCycle);
    }
    console.log(`[DatasetReplayEngine] Active Scenario changed to: ${sc.name} (${sc.id}) [Source: ${sc.dataSource}]`);
    return sc;
  }

  async runMlPredictionForCycle(cycleNumber = this.currentCycleNumber, scenarioId = this.currentScenarioId) {
    const scenario = SCENARIOS[scenarioId] || SCENARIOS.NORMAL_OPERATION;
    const clampedCycle = Math.max(1, Math.min(this.maxCycles, cycleNumber));
    const groundTruth = this.getGroundTruth(clampedCycle);

    let rawSensors;
    try {
      rawSensors = await this.loadCycleRawSensors(clampedCycle);
    } catch (err) {
      console.error(`[DatasetReplayEngine] Could not load raw sensors for cycle ${clampedCycle}:`, err.message);
      return {
        status: 'ERROR',
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        dataSource: scenario.dataSource,
        cycleNumber: clampedCycle,
        errorMessage: `Dataset load failed: ${err.message}`,
        fastApiStatus: this.fastApiStatus,
        predictions: null
      };
    }

    // Apply scenario modification layer to obtain active 17 raw sensor channels
    const scenarioResult = applyScenarioToSensors(scenario.id, rawSensors);
    const activeSensors = scenarioResult.sensors;

    // Build payload containing ONLY the 17 raw sensor arrays (no ground truths, strictly 0 data leakage)
    const predictPayload = {};
    for (const sensor of SENSORS) {
      predictPayload[sensor] = activeSensors[sensor];
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${this.fastApiUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(predictPayload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`FastAPI HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      this.isFastApiAvailable = true;
      this.fastApiStatus = 'ONLINE';
      this.fastApiLastError = null;

      // Build structured comparison payload with ground truth
      const comparison = [];
      const targets = ['cooler', 'valve', 'pump_leakage', 'accumulator'];

      for (const target of targets) {
        const predictedVal = result.predictions[target];
        const actualVal = groundTruth ? groundTruth[target] : null;
        const probs = result.probabilities[target] || {};

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
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        dataSource: scenarioResult.dataSource,
        isSynthetic: scenarioResult.isSynthetic,
        cycleNumber: clampedCycle,
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
      console.warn(`[DatasetReplayEngine] FastAPI Prediction Unavailable for Cycle ${clampedCycle}: ${err.message}`);
      this.isFastApiAvailable = false;
      this.fastApiStatus = 'OFFLINE';
      this.fastApiLastError = err.message;

      const fallbackPayload = {
        status: 'OFFLINE',
        mode: 'DATASET_REPLAY',
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        dataSource: scenarioResult.dataSource,
        isSynthetic: scenarioResult.isSynthetic,
        cycleNumber: clampedCycle,
        fastApiUrl: this.fastApiUrl,
        fastApiStatus: 'OFFLINE',
        errorMessage: `FastAPI service unreachable at ${this.fastApiUrl}: ${err.message}`,
        timestamp: new Date().toISOString(),
        groundTruth,
        predictions: null,
        comparison: null
      };

      this.lastMlPrediction = fallbackPayload;
      return fallbackPayload;
    }
  }

  generateTelemetryFrame(sensorData, cycleNumber, progressRatio, elapsedSec, scenarioId = this.currentScenarioId) {
    const scenario = SCENARIOS[scenarioId] || SCENARIOS.NORMAL_OPERATION;

    // Apply scenario modification layer to current cycle sensor data
    const scenarioResult = applyScenarioToSensors(scenario.id, sensorData);
    const activeSensors = scenarioResult.sensors;

    // Helper to sample array at relative progress ratio (0.0 to 1.0)
    const sampleAtRatio = (arr) => {
      if (!arr || arr.length === 0) return 0;
      const idx = Math.min(arr.length - 1, Math.floor(progressRatio * arr.length));
      return arr[idx];
    };

    const ps1 = sampleAtRatio(activeSensors.PS1);
    const ps2 = sampleAtRatio(activeSensors.PS2);
    const ps3 = sampleAtRatio(activeSensors.PS3);
    const fs1 = sampleAtRatio(activeSensors.FS1);
    const ts1 = sampleAtRatio(activeSensors.TS1);
    const eps1 = sampleAtRatio(activeSensors.EPS1);

    // Calculate press physical phase and kinematic position
    let phase = 'FAST_DOWN';
    let phaseName = 'Fast Down (Approach)';
    let positionMm = progressRatio * 250.0;
    let speedMmS = 200.0;

    if (progressRatio < 0.15) {
      phase = 'FAST_DOWN';
      phaseName = 'Fast Down (Approach)';
      positionMm = (progressRatio / 0.15) * 200.0;
      speedMmS = 200.0;
    } else if (progressRatio < 0.70) {
      phase = 'WORKING';
      phaseName = 'Working Stroke (Pressing)';
      positionMm = 200.0 + ((progressRatio - 0.15) / 0.55) * 50.0;
      speedMmS = 10.0;
    } else if (progressRatio < 0.85) {
      phase = 'HOLDING';
      phaseName = 'Holding Load (9 Ton)';
      positionMm = 250.0;
      speedMmS = 0.0;
    } else {
      phase = 'FAST_UP';
      phaseName = 'Fast Return (Retraction)';
      positionMm = 250.0 - ((progressRatio - 0.85) / 0.15) * 250.0;
      speedMmS = 200.0;
    }

    // Convert Motor Power (EPS1 in Watts) to Motor Current estimate (A)
    const motorCurrentA = parseFloat((eps1 / 380.0 / 1.732 / 0.85).toFixed(2)) || parseFloat((eps1 / 100).toFixed(2)) || 18.5;

    // Evaluate immediate software safety thresholds
    let activeAlert = null;
    if (ps1 >= 235.0) {
      activeAlert = {
        id: `alt-p-stop-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'HIGH_PRESSURE_ALARM',
        severity: 'ALARM',
        message: `STOP — HIGH PRESSURE: Measured ${ps1.toFixed(1)} bar exceeds emergency safety threshold (235.0 bar)`,
        measuredValue: `${ps1.toFixed(1)} bar`,
        thresholdLimit: '235.0 bar',
        source: 'PRESSURE_SENSOR (PS1)',
        scenario: scenario.name
      };
    } else if (ps1 >= 210.0) {
      activeAlert = {
        id: `alt-p-warn-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'HIGH_PRESSURE_WARN',
        severity: 'WARNING',
        message: `Pressure Warning: System pressure ${ps1.toFixed(1)} bar elevated near safety limit (210.0 bar)`,
        measuredValue: `${ps1.toFixed(1)} bar`,
        thresholdLimit: '210.0 bar',
        source: 'PRESSURE_SENSOR (PS1)',
        scenario: scenario.name
      };
    } else if (ts1 >= 65.0) {
      activeAlert = {
        id: `alt-t-alarm-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'HIGH_TEMP_ALARM',
        severity: 'ALARM',
        message: `Oil Temperature Alarm: Measured ${ts1.toFixed(1)} °C exceeds thermal limit (65.0 °C)`,
        measuredValue: `${ts1.toFixed(1)} °C`,
        thresholdLimit: '65.0 °C',
        source: 'TEMPERATURE_SENSOR (TS1)',
        scenario: scenario.name
      };
    } else if (fs1 <= 5.0 && (phase === 'FAST_DOWN' || phase === 'FAST_UP')) {
      activeAlert = {
        id: `alt-q-warn-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'LOW_FLOW_WARN',
        severity: 'WARNING',
        message: `Low Flow Warning: ${fs1.toFixed(1)} L/min severely below nominal rating during ${phaseName}`,
        measuredValue: `${fs1.toFixed(1)} L/min`,
        thresholdLimit: '5.0 L/min',
        source: 'FLOW_SENSOR (FS1)',
        scenario: scenario.name
      };
    }

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
      instantaneousPowerKw: parseFloat((eps1 / 1000.0).toFixed(2)) || 18.5,
      status: 'RUNNING',
      speedMultiplier: 1.0,
      dataMode: 'DATASET_REPLAY',
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      dataSource: scenarioResult.dataSource,
      isSynthetic: scenarioResult.isSynthetic,
      alert: activeAlert,
      fault: scenario.id !== 'NORMAL_OPERATION' ? scenario.id : null,
      rawSensorsSnapshot: {
        PS1: parseFloat(ps1.toFixed(2)),
        PS2: parseFloat(ps2.toFixed(2)),
        PS3: parseFloat(ps3.toFixed(2)),
        FS1: parseFloat(fs1.toFixed(2)),
        TS1: parseFloat(ts1.toFixed(2)),
        EPS1: parseFloat(eps1.toFixed(1))
      }
    };
  }
}
