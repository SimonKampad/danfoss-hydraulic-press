/**
 * Danfoss Hydraulic Press - Group 2 Machine & Simulation Parameters
 * 
 * Machine Specifications (Group 2):
 * - Dead Load: 3 Ton
 * - Holding Load: 9 Ton
 * - Cylinder Bore: 85 mm (0.085 m)
 * - Cylinder Rod: 50 mm (0.05 m)
 * - Motor RPM: 1500 RPM
 * - Pump Efficiency: 0.9 (90%)
 * - System Pressure Loss (Pump to Cylinder): 10 bar
 */

export const GROUP_2_SPECIFICATIONS = {
  deadLoadTon: 3,
  holdingLoadTon: 9,
  cylinderBoreMm: 85,
  cylinderRodMm: 50,
  motorRpm: 1500,
  pumpEfficiency: 0.9,
  systemLossBar: 10,

  // Calculated Areas
  // Cap area (full bore): pi * (8.5 cm / 2)^2 = 56.745 cm2 = 0.005675 m2
  capAreaCm2: Math.PI * Math.pow(8.5 / 2, 2), // ~56.745 cm2
  // Rod area: pi * (5.0 cm / 2)^2 = 19.635 cm2
  rodAreaCm2: Math.PI * Math.pow(5.0 / 2, 2), // ~19.635 cm2
  // Annulus area (rod side): Cap Area - Rod Area = ~37.110 cm2
  annulusAreaCm2: Math.PI * Math.pow(8.5 / 2, 2) - Math.PI * Math.pow(5.0 / 2, 2)
};

export const CYCLE_PHASES = {
  FAST_DOWN: {
    id: 'FAST_DOWN',
    name: 'Fast Down',
    durationSec: 1.0,
    targetSpeedMmS: 200.0,
    targetStrokeMm: 200.0,
    startPositionMm: 0.0,
    endPositionMm: 200.0,
    basePressureBar: 35.0, // Friction + dead load + system loss (~10 bar)
    // Flow required for 200 mm/s = 56.745 cm2 * 20 cm/s = 1134.9 cm3/s = 68.09 L/min
    baseFlowLmin: (GROUP_2_SPECIFICATIONS.capAreaCm2 * 20.0 * 60) / 1000.0, // ~68.1 L/min
    baseMotorCurrentA: 14.5,
    description: 'Rapid extend phase to approach workpiece'
  },
  WORKING: {
    id: 'WORKING',
    name: 'Working Cycle',
    durationSec: 5.0,
    targetSpeedMmS: 10.0,
    targetStrokeMm: 50.0,
    startPositionMm: 200.0,
    endPositionMm: 250.0,
    basePressureBar: 175.0, // High load compression (up to ~185-195 bar including loss)
    // Flow required for 10 mm/s = 56.745 cm2 * 1 cm/s = 56.745 cm3/s = 3.40 L/min
    baseFlowLmin: (GROUP_2_SPECIFICATIONS.capAreaCm2 * 1.0 * 60) / 1000.0, // ~3.41 L/min
    baseMotorCurrentA: 32.0,
    description: 'Slow pressing movement applying high hydraulic force'
  },
  HOLDING: {
    id: 'HOLDING',
    name: 'Holding',
    durationSec: 2.0,
    targetSpeedMmS: 0.0,
    targetStrokeMm: 0.0,
    startPositionMm: 250.0,
    endPositionMm: 250.0,
    basePressureBar: 195.0, // Peak holding load (~9 Ton hold pressure + system loss)
    baseFlowLmin: 0.8, // Micro pump leakage / bypass flow
    baseMotorCurrentA: 26.0, // Holding motor current
    description: 'Zero velocity dwell while holding 9 Ton load'
  },
  FAST_UP: {
    id: 'FAST_UP',
    name: 'Fast Up',
    durationSec: 1.25,
    targetSpeedMmS: 200.0, // Upward return velocity magnitude
    targetStrokeMm: -250.0,
    startPositionMm: 250.0,
    endPositionMm: 0.0,
    basePressureBar: 45.0, // Annulus side retraction pressure
    // Flow required for 200 mm/s retraction = annulus area * 20 cm/s = 37.11 * 20 = 742.2 cm3/s = 44.53 L/min
    baseFlowLmin: (GROUP_2_SPECIFICATIONS.annulusAreaCm2 * 20.0 * 60) / 1000.0, // ~44.5 L/min
    baseMotorCurrentA: 16.0,
    description: 'Rapid retraction return phase'
  }
};

export const SIMULATION_THRESHOLDS = {
  pressureWarningBar: 210.0,
  pressureAlarmBar: 235.0,
  temperatureWarningC: 55.0,
  temperatureAlarmC: 65.0,
  motorCurrentWarningA: 35.0,
  motorCurrentAlarmA: 42.0,
  speedDeviationMaxMmS: 50.0
};

export const DEFAULT_SIMULATION_CONFIG = {
  updateIntervalMs: 100, // 100ms emission rate
  speedMultiplier: 1.0, // 1x, 2x, 5x
  noiseEnabled: true,
  dataMode: 'SIMULATION' // 'SIMULATION' | 'REAL_SENSOR'
};
