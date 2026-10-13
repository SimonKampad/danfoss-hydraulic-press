/**
 * Danfoss Hydraulic Press - Scenario Generation & Mapping Engine
 * 
 * Defines 8 operational and fault scenarios for condition monitoring:
 * 1. NORMAL_OPERATION: Nominal cycle within operating envelope
 * 2. HIGH_PRESSURE: Relief valve failure / over-pressurization (>235 bar alarm limit)
 * 3. HIGH_TEMPERATURE: Oil cooling circuit degradation (>65°C alarm limit)
 * 4. LOW_FLOW: Suction line restriction / pump cavitation (<5 L/min flow drop)
 * 5. COOLER_FAULT: Heat exchanger efficiency degradation (ZeMA Ground Truth: Cooler Condition 3)
 * 6. VALVE_FAULT: Proportional valve switching lag (ZeMA Ground Truth: Valve Condition 73)
 * 7. PUMP_LEAKAGE: Internal pump leakage & volumetric slip (ZeMA Ground Truth: Pump Leakage 2)
 * 8. ACCUMULATOR_FAULT: Hydraulic accumulator precharge gas loss (ZeMA Ground Truth: Accumulator 90 bar)
 * 
 * Ensures all raw sensor arrays strictly preserve expected sample counts:
 * - PS1–PS6, EPS1: 6,000 samples
 * - FS1–FS2: 600 samples
 * - TS1–TS4, VS1, CE, CP, SE: 60 samples
 */

export const SCENARIOS = {
  NORMAL_OPERATION: {
    id: 'NORMAL_OPERATION',
    name: 'Normal Operation',
    category: 'NOMINAL',
    shortDescription: 'Nominal operating envelope',
    operatorDescription: 'System operates within certified pressure, flow, and temperature boundaries.',
    expectedAnomaly: 'NO ANOMALY',
    dataSource: 'ORIGINAL_DATASET_REPLAY',
    defaultCycle: 1, // Will replay nominal cycle from available data
    color: 'emerald',
    physicsLimits: {
      maxPressureBar: 195.0,
      nominalFlowLmin: 68.1,
      nominalTempC: 45.0
    }
  },
  HIGH_PRESSURE: {
    id: 'HIGH_PRESSURE',
    name: 'High Pressure Fault',
    category: 'PROCESS_EXCURSION',
    shortDescription: 'Pressure exceeds 235 bar alarm limit',
    operatorDescription: 'Relief valve bypass failure causing dangerous system over-pressurization above safety limit.',
    expectedAnomaly: 'STOP — HIGH PRESSURE',
    dataSource: 'SYNTHETIC_FAULT_SIMULATION',
    defaultCycle: 1,
    color: 'rose',
    physicsLimits: {
      maxPressureBar: 248.5,
      alarmThresholdBar: 235.0
    }
  },
  HIGH_TEMPERATURE: {
    id: 'HIGH_TEMPERATURE',
    name: 'High Temperature Fault',
    category: 'PROCESS_EXCURSION',
    shortDescription: 'Oil temp exceeds 65°C alarm limit',
    operatorDescription: 'Thermal runaway in hydraulic oil reservoir creating severe cavitation and viscosity loss risk.',
    expectedAnomaly: 'HIGH OIL TEMPERATURE ALARM',
    dataSource: 'SYNTHETIC_FAULT_SIMULATION',
    defaultCycle: 1,
    color: 'orange',
    physicsLimits: {
      maxTempC: 68.5,
      alarmThresholdC: 65.0
    }
  },
  LOW_FLOW: {
    id: 'LOW_FLOW',
    name: 'Low Hydraulic Flow',
    category: 'PROCESS_EXCURSION',
    shortDescription: 'Volume flow drops below 5 L/min during stroke',
    operatorDescription: 'Suction filter blockage or severe flow restriction reducing cylinder actuation speed.',
    expectedAnomaly: 'LOW HYDRAULIC FLOW ANOMALY',
    dataSource: 'SYNTHETIC_FAULT_SIMULATION',
    defaultCycle: 1,
    color: 'amber',
    physicsLimits: {
      minFlowLmin: 2.8,
      warningThresholdLmin: 5.0
    }
  },
  COOLER_FAULT: {
    id: 'COOLER_FAULT',
    name: 'Cooler Efficiency Fault',
    category: 'COMPONENT_FAULT',
    shortDescription: 'Heat exchanger near total failure (Condition 3)',
    operatorDescription: 'Cooling system heat transfer rate severely degraded; thermal dissipation efficiency dropped.',
    expectedAnomaly: 'COOLER FAILURE (3)',
    dataSource: 'REAL_FAULT_REPLAY',
    defaultCycle: 1, // Cycle 1 in deployment dataset has Cooler = 3
    color: 'blue',
    groundTruthTarget: 'cooler',
    groundTruthValue: 3
  },
  VALVE_FAULT: {
    id: 'VALVE_FAULT',
    name: 'Proportional Valve Fault',
    category: 'COMPONENT_FAULT',
    shortDescription: 'Directional valve switching lag (Condition 73)',
    operatorDescription: 'Proportional valve spool sticky or worn; slow response creating mechanical hysteresis.',
    expectedAnomaly: 'VALVE FAILURE (73)',
    dataSource: 'REAL_FAULT_REPLAY',
    defaultCycle: 8, // Cycle 8 in deployment dataset has Valve = 73
    color: 'purple',
    groundTruthTarget: 'valve',
    groundTruthValue: 73
  },
  PUMP_LEAKAGE: {
    id: 'PUMP_LEAKAGE',
    name: 'Internal Pump Leakage',
    category: 'COMPONENT_FAULT',
    shortDescription: 'Severe internal slippage (Condition 2)',
    operatorDescription: 'Hydraulic axial piston pump clearances enlarged; internal slip reduces volumetric efficiency.',
    expectedAnomaly: 'PUMP LEAKAGE (2)',
    dataSource: 'REAL_FAULT_REPLAY',
    defaultCycle: 3, // Cycle 3 in deployment dataset has Pump = 2
    color: 'amber',
    groundTruthTarget: 'pump_leakage',
    groundTruthValue: 2
  },
  ACCUMULATOR_FAULT: {
    id: 'ACCUMULATOR_FAULT',
    name: 'Accumulator Pressure Fault',
    category: 'COMPONENT_FAULT',
    shortDescription: 'Nitrogen precharge pressure dropped to 90 bar',
    operatorDescription: 'Bladder accumulator nitrogen loss; inability to dampen pressure shocks and support peak flow.',
    expectedAnomaly: 'ACCUMULATOR DAMAGED (90 bar)',
    dataSource: 'REAL_FAULT_REPLAY',
    defaultCycle: 4, // Cycle 4 in deployment dataset has Accumulator = 90
    color: 'slate',
    groundTruthTarget: 'accumulator',
    groundTruthValue: 90
  }
};

/**
 * Returns scenario definition list for UI dropdown and API consumers
 */
export function getScenariosList() {
  return Object.values(SCENARIOS).map(s => ({
    id: s.id,
    name: s.name,
    category: s.category,
    shortDescription: s.shortDescription,
    operatorDescription: s.operatorDescription,
    expectedAnomaly: s.expectedAnomaly,
    dataSource: s.dataSource,
    defaultCycle: s.defaultCycle,
    color: s.color
  }));
}

/**
 * Applies deterministic, scenario-aware modifications to raw 17-sensor arrays.
 * Preserves exact array dimensions, counts, and numeric formats.
 * 
 * @param {string} scenarioId 
 * @param {object} baseSensors Object containing arrays for all 17 sensors
 * @returns {object} Modified or original sensor arrays with metadata
 */
export function applyScenarioToSensors(scenarioId, baseSensors) {
  const scenario = SCENARIOS[scenarioId] || SCENARIOS.NORMAL_OPERATION;

  // Clone sensor arrays to prevent mutating cache
  const resultSensors = {};
  for (const [key, arr] of Object.entries(baseSensors)) {
    resultSensors[key] = Array.isArray(arr) ? [...arr] : arr;
  }

  // If real dataset replay or normal operation without synthetic overrides, return original
  if (scenario.dataSource === 'ORIGINAL_DATASET_REPLAY' || scenario.dataSource === 'REAL_FAULT_REPLAY') {
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      dataSource: scenario.dataSource,
      sensors: resultSensors,
      isSynthetic: false
    };
  }

  // --- SYNTHETIC FAULT SIMULATION LAYER ---

  if (scenario.id === 'HIGH_PRESSURE') {
    // Modify PS1 (6000 samples): Boost pressure during working and holding stages (samples 900 to 5100)
    // Nominal working pressure is ~175–195 bar; boost by +45–55 bar to peak at ~240–250 bar (exceeding 235 bar limit)
    const ps1 = resultSensors.PS1;
    const len = ps1.length;
    for (let i = 0; i < len; i++) {
      const progress = i / len;
      // Excursion occurs during working stroke (0.15 to 0.70) and holding (0.70 to 0.85)
      if (progress >= 0.15 && progress <= 0.88) {
        const envelope = Math.sin(((progress - 0.15) / 0.73) * Math.PI);
        const boost = 78.0 * Math.max(0.2, envelope);
        ps1[i] = parseFloat((ps1[i] + boost).toFixed(2));
      }
    }

    // Correlate secondary pressure sensors PS2, PS3, PS5 proportionally
    if (resultSensors.PS2) {
      resultSensors.PS2 = resultSensors.PS2.map(val => parseFloat((val * 1.15).toFixed(2)));
    }
    if (resultSensors.PS3) {
      resultSensors.PS3 = resultSensors.PS3.map(val => parseFloat((val * 1.12).toFixed(2)));
    }

    // Motor electrical power EPS1 (W) increases proportionally with hydraulic load (P = p * Q)
    if (resultSensors.EPS1) {
      resultSensors.EPS1 = resultSensors.EPS1.map(val => parseFloat((val * 1.25).toFixed(1)));
    }
  } else if (scenario.id === 'HIGH_TEMPERATURE') {
    // Modify TS1–TS4 (60 samples): Elevate reservoir oil temperature to 66–68°C (above 65°C alarm)
    if (resultSensors.TS1) {
      resultSensors.TS1 = resultSensors.TS1.map(val => parseFloat((val + 22.5).toFixed(2)));
    }
    if (resultSensors.TS2) {
      resultSensors.TS2 = resultSensors.TS2.map(val => parseFloat((val + 21.0).toFixed(2)));
    }
    if (resultSensors.TS3) {
      resultSensors.TS3 = resultSensors.TS3.map(val => parseFloat((val + 20.0).toFixed(2)));
    }
    if (resultSensors.TS4) {
      resultSensors.TS4 = resultSensors.TS4.map(val => parseFloat((val + 19.5).toFixed(2)));
    }
  } else if (scenario.id === 'LOW_FLOW') {
    // Modify FS1 & FS2 (600 samples): Reduce volume flow rate significantly (suction line restriction)
    if (resultSensors.FS1) {
      resultSensors.FS1 = resultSensors.FS1.map((val) => {
        return parseFloat((val * 0.12).toFixed(2));
      });
    }
    if (resultSensors.FS2) {
      resultSensors.FS2 = resultSensors.FS2.map(val => parseFloat((val * 0.15).toFixed(2)));
    }
  }

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    dataSource: scenario.dataSource,
    sensors: resultSensors,
    isSynthetic: true
  };
}
