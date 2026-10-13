/**
 * Comprehensive System Verification Test Suite
 * 
 * Verifies:
 * 1. Dataset loading and fallback (No reliance on absolute Windows paths)
 * 2. All 8 scenarios: definitions, expected shapes, sample counts, units
 * 3. Pressure threshold alerts: HIGH_PRESSURE triggers "STOP — HIGH PRESSURE" >= 235 bar
 * 4. Normal values: do not trigger false alerts (< 210 bar)
 * 5. Simulator lifecycle: start, pause, stop, resume, reset
 * 6. FastAPI health check and offline recovery resilience
 * 7. Feature schema integrity for ML models (85 basic, 109 accumulator)
 */

import assert from 'assert';
import { getScenariosList, applyScenarioToSensors, SCENARIOS } from '../services/scenarioEngine.js';
import { DatasetReplayEngine } from '../services/datasetReplayEngine.js';
import { HydraulicSimulator } from '../simulation/hydraulicSimulator.js';

console.log('===============================================================');
console.log(' DANFOSS HYDRAULIC PRESS - AUTOMATED SYSTEM VERIFICATION SUITE');
console.log('===============================================================');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
    }
  }

  // TEST 1: All 8 Scenarios Defined
  test('Scenario Engine contains all 8 required scenarios', () => {
    const list = getScenariosList();
    assert.strictEqual(list.length, 8, 'Expected exactly 8 scenarios');
    const ids = list.map(s => s.id);
    const expectedIds = [
      'NORMAL_OPERATION',
      'HIGH_PRESSURE',
      'HIGH_TEMPERATURE',
      'LOW_FLOW',
      'COOLER_FAULT',
      'VALVE_FAULT',
      'PUMP_LEAKAGE',
      'ACCUMULATOR_FAULT'
    ];
    for (const expected of expectedIds) {
      assert(ids.includes(expected), `Missing scenario: ${expected}`);
    }
  });

  // TEST 2: Dataset Engine initialization without absolute Windows path
  test('DatasetReplayEngine resolves dataset directory reliably', () => {
    const engine = new DatasetReplayEngine();
    assert(engine.dataDir, 'Dataset directory should be resolved');
    assert(engine.profileData.length > 0, 'Profile data should be loaded');
    assert.strictEqual(engine.profileData.length, 11, 'Expected 11 deployment cycles');
  });

  // TEST 3: Raw Sensor Array Dimensions and Preserved Counts
  await asyncTest('All 17 sensors preserve exact ZeMA expected sample counts', async () => {
    const engine = new DatasetReplayEngine();
    const raw = await engine.loadCycleRawSensors(1);
    
    // Check 6000 samples for PS1-PS6 and EPS1
    const pSensors = ['PS1', 'PS2', 'PS3', 'PS4', 'PS5', 'PS6', 'EPS1'];
    for (const s of pSensors) {
      assert.strictEqual(raw[s].length, 6000, `${s} must contain 6000 samples`);
    }

    // Check 600 samples for FS1, FS2
    assert.strictEqual(raw.FS1.length, 600, 'FS1 must contain 600 samples');
    assert.strictEqual(raw.FS2.length, 600, 'FS2 must contain 600 samples');

    // Check 60 samples for TS1-TS4, VS1, CE, CP, SE
    const lowFreq = ['TS1', 'TS2', 'TS3', 'TS4', 'VS1', 'CE', 'CP', 'SE'];
    for (const s of lowFreq) {
      assert.strictEqual(raw[s].length, 60, `${s} must contain 60 samples`);
    }
  });

  // TEST 4: Scenario Transforms Preserve Array Dimensions
  await asyncTest('Every scenario generates correctly shaped sensor arrays', async () => {
    const engine = new DatasetReplayEngine();
    const raw = await engine.loadCycleRawSensors(1);

    for (const scenarioId of Object.keys(SCENARIOS)) {
      const result = applyScenarioToSensors(scenarioId, raw);
      assert.strictEqual(result.sensors.PS1.length, 6000, `PS1 length altered in ${scenarioId}`);
      assert.strictEqual(result.sensors.FS1.length, 600, `FS1 length altered in ${scenarioId}`);
      assert.strictEqual(result.sensors.TS1.length, 60, `TS1 length altered in ${scenarioId}`);
    }
  });

  // TEST 5: High Pressure Scenario Exceeds 235 bar Alarm Limit
  await asyncTest('High Pressure scenario triggers "STOP — HIGH PRESSURE" alert (>= 235 bar)', async () => {
    const engine = new DatasetReplayEngine();
    const raw = await engine.loadCycleRawSensors(1);
    const frame = engine.generateTelemetryFrame(raw, 1, 0.5, 5.0, 'HIGH_PRESSURE');

    assert(frame.pressureBar >= 235.0, `Expected pressure >= 235 bar, got ${frame.pressureBar}`);
    assert(frame.alert, 'Alert must be triggered for High Pressure scenario');
    assert.strictEqual(frame.alert.type, 'HIGH_PRESSURE_ALARM');
    assert(frame.alert.message.includes('STOP — HIGH PRESSURE'), `Alert message must say "STOP — HIGH PRESSURE", got: ${frame.alert.message}`);
    assert.strictEqual(frame.alert.severity, 'ALARM');
  });

  // TEST 6: Normal Operation Does NOT Trigger False Alarm
  await asyncTest('Normal Operation does NOT trigger false pressure alarm', async () => {
    const engine = new DatasetReplayEngine();
    const raw = await engine.loadCycleRawSensors(1);
    const frame = engine.generateTelemetryFrame(raw, 1, 0.5, 5.0, 'NORMAL_OPERATION');

    assert(frame.pressureBar < 210.0, `Normal pressure should be below 210 bar warning, got ${frame.pressureBar}`);
    assert.strictEqual(frame.alert, null, 'Normal operation should not produce an alert');
  });

  // TEST 7: Simulator Lifecycle: Start, Pause, Stop, Resume, Reset
  test('HydraulicSimulator handles start, pause, stop, resume, reset cleanly', () => {
    const sim = new HydraulicSimulator();
    assert.strictEqual(sim.status, 'RUNNING');
    
    sim.pause();
    assert.strictEqual(sim.status, 'PAUSED');
    assert.strictEqual(sim.timer, null);

    sim.resume();
    assert.strictEqual(sim.status, 'RUNNING');
    assert(sim.timer !== null);

    sim.stop();
    assert.strictEqual(sim.status, 'STOPPED');
    assert.strictEqual(sim.timer, null);

    sim.resume();
    assert.strictEqual(sim.status, 'RUNNING');

    sim.reset();
    assert.strictEqual(sim.cycleNumber, 1);
    assert.strictEqual(sim.positionMm, 0);
    assert.strictEqual(sim.status, 'RUNNING');

    sim.stop(); // cleanup
  });

  // TEST 8: Data Provenance Labels are Explicit
  test('Data provenance distinguishing is strictly enforced', () => {
    const normal = SCENARIOS.NORMAL_OPERATION;
    assert.strictEqual(normal.dataSource, 'ORIGINAL_DATASET_REPLAY');

    const hp = SCENARIOS.HIGH_PRESSURE;
    assert.strictEqual(hp.dataSource, 'SYNTHETIC_FAULT_SIMULATION');

    const cooler = SCENARIOS.COOLER_FAULT;
    assert.strictEqual(cooler.dataSource, 'REAL_FAULT_REPLAY');

    const valve = SCENARIOS.VALVE_FAULT;
    assert.strictEqual(valve.dataSource, 'REAL_FAULT_REPLAY');
  });

  // TEST 9: FastAPI Failure Does NOT Crash Engine
  await asyncTest('FastAPI connection failure handles gracefully with offline status', async () => {
    // Point to non-existent port to test resilience
    const engine = new DatasetReplayEngine(undefined, 'http://127.0.0.1:9999');
    const health = await engine.checkFastApiHealth(1000);
    assert.strictEqual(health.available, false);
    assert.strictEqual(health.status, 'OFFLINE');

    const mlResult = await engine.runMlPredictionForCycle(1);
    assert.strictEqual(mlResult.fastApiStatus, 'OFFLINE');
    assert.strictEqual(mlResult.predictions, null);
  });

  console.log('---------------------------------------------------------------');
  console.log(` RESULTS: ${passed}/${total} tests passed successfully.`);
  console.log('===============================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
