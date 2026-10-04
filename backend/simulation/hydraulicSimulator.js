import { GROUP_2_SPECIFICATIONS, CYCLE_PHASES, SIMULATION_THRESHOLDS, DEFAULT_SIMULATION_CONFIG } from '../config/pressConfig.js';

export class HydraulicSimulator {
  constructor() {
    this.status = 'RUNNING'; // 'RUNNING' | 'PAUSED' | 'IDLE' | 'FAULT'
    this.speedMultiplier = DEFAULT_SIMULATION_CONFIG.speedMultiplier;
    this.updateIntervalMs = DEFAULT_SIMULATION_CONFIG.updateIntervalMs;
    this.noiseEnabled = DEFAULT_SIMULATION_CONFIG.noiseEnabled;
    this.dataMode = DEFAULT_SIMULATION_CONFIG.dataMode;

    // Cycle tracking
    this.cycleNumber = 1;
    this.currentPhaseKey = 'FAST_DOWN';
    this.phaseElapsedTime = 0; // seconds within current phase
    this.cycleElapsedTime = 0; // seconds within current overall cycle
    this.totalElapsedTime = 0; // total simulation seconds

    // Dynamic physical state variables
    this.positionMm = 0;
    this.pressureBar = CYCLE_PHASES.FAST_DOWN.basePressureBar;
    this.flowLmin = CYCLE_PHASES.FAST_DOWN.baseFlowLmin;
    this.speedMmS = CYCLE_PHASES.FAST_DOWN.targetSpeedMmS;
    this.temperatureC = 42.5; // Initial oil temp °C
    this.motorCurrentA = CYCLE_PHASES.FAST_DOWN.baseMotorCurrentA;

    // Active Fault Injection state & Controlled Diagnostic Override
    this.activeFault = null; // { type: 'OVERPRESSURE' | 'THERMAL_SPIKE' | 'VALVE_LEAK' | 'LOW_FLOW' | 'SLOW_CYLINDER' | 'FAST_CYLINDER' | 'HIGH_CURRENT', severity: 'WARNING'|'ALARM', durationSec: number }
    this.faultTimeRemaining = 0;
    this.diagnosticOverride = null; // { metric: 'PRESSURE'|'TEMPERATURE'|'FLOW'|'CYLINDER_SPEED'|'MOTOR_CURRENT', scenario: string, value: number }

    // Callbacks
    this.onDataListeners = [];
    this.onPhaseChangeListeners = [];
    this.onAlertListeners = [];

    this.timer = null;
  }

  setDiagnosticOverride(metric, scenario, value) {
    this.diagnosticOverride = { metric, scenario, value };
    if (metric === 'PRESSURE') this.pressureBar = parseFloat(value);
    else if (metric === 'TEMPERATURE') this.temperatureC = parseFloat(value);
    else if (metric === 'FLOW') this.flowLmin = parseFloat(value);
    else if (metric === 'CYLINDER_SPEED') this.speedMmS = parseFloat(value);
    else if (metric === 'MOTOR_CURRENT') this.motorCurrentA = parseFloat(value);
  }

  clearDiagnosticOverride() {
    this.diagnosticOverride = null;
  }

  start() {
    if (this.timer) clearInterval(this.timer);
    this.status = 'RUNNING';
    this.timer = setInterval(() => this.tick(), this.updateIntervalMs);
  }

  pause() {
    this.status = 'PAUSED';
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  reset() {
    this.pause();
    this.cycleNumber = 1;
    this.currentPhaseKey = 'FAST_DOWN';
    this.phaseElapsedTime = 0;
    this.cycleElapsedTime = 0;
    this.totalElapsedTime = 0;
    this.positionMm = 0;
    this.pressureBar = CYCLE_PHASES.FAST_DOWN.basePressureBar;
    this.flowLmin = CYCLE_PHASES.FAST_DOWN.baseFlowLmin;
    this.speedMmS = CYCLE_PHASES.FAST_DOWN.targetSpeedMmS;
    this.temperatureC = 42.5;
    this.motorCurrentA = CYCLE_PHASES.FAST_DOWN.baseMotorCurrentA;
    this.activeFault = null;
    this.faultTimeRemaining = 0;
    this.status = 'RUNNING';
    this.start();
  }

  setSpeedMultiplier(multiplier) {
    this.speedMultiplier = Math.max(0.5, Math.min(10, multiplier));
  }

  injectFault(type, severity = 'WARNING', durationSec = 10) {
    this.activeFault = { type, severity, timestamp: new Date().toISOString() };
    this.faultTimeRemaining = durationSec;
    
    // Trigger alert callback immediately
    this.notifyAlert({
      id: `fault-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: type,
      severity: severity,
      message: `SIMULATION INJECTED FAULT: ${type.replace('_', ' ')} (${severity})`,
      source: 'SIMULATOR_FAULT_ENGINE'
    });
  }

  clearFault() {
    this.activeFault = null;
    this.faultTimeRemaining = 0;
  }

  tick() {
    if (this.status !== 'RUNNING') return;

    // Time delta in seconds accounting for speed multiplier
    const dt = (this.updateIntervalMs / 1000.0) * this.speedMultiplier;
    this.phaseElapsedTime += dt;
    this.cycleElapsedTime += dt;
    this.totalElapsedTime += dt;

    if (this.faultTimeRemaining > 0) {
      this.faultTimeRemaining -= dt;
      if (this.faultTimeRemaining <= 0) {
        this.clearFault();
      }
    }

    const currentPhase = CYCLE_PHASES[this.currentPhaseKey];

    // Check phase transition
    if (this.phaseElapsedTime >= currentPhase.durationSec) {
      this.transitionToNextPhase();
      return;
    }

    // Calculate phase progress (0 to 1)
    const phaseProgressRatio = Math.min(1.0, this.phaseElapsedTime / currentPhase.durationSec);

    // Calculate target parameters based on physics phase model
    this.updatePhysicsState(currentPhase, phaseProgressRatio, dt);

    // Build data packet
    const totalCycleDuration = CYCLE_PHASES.FAST_DOWN.durationSec + 
                                CYCLE_PHASES.WORKING.durationSec + 
                                CYCLE_PHASES.HOLDING.durationSec + 
                                CYCLE_PHASES.FAST_UP.durationSec;
    const cycleProgressPct = Math.min(100, Math.round((this.cycleElapsedTime / totalCycleDuration) * 100));

    const sensorPacket = {
      timestamp: new Date().toISOString(),
      timeMs: Date.now(),
      cycleNumber: this.cycleNumber,
      phase: this.currentPhaseKey,
      phaseName: currentPhase.name,
      phaseProgressPct: Math.round(phaseProgressRatio * 100),
      cycleProgressPct,
      pressureBar: parseFloat(this.pressureBar.toFixed(2)),
      flowLmin: parseFloat(this.flowLmin.toFixed(2)),
      speedMmS: parseFloat(this.speedMmS.toFixed(2)),
      positionMm: parseFloat(this.positionMm.toFixed(2)),
      temperatureC: parseFloat(this.temperatureC.toFixed(2)),
      motorCurrentA: parseFloat(this.motorCurrentA.toFixed(2)),
      status: this.status,
      speedMultiplier: this.speedMultiplier,
      fault: this.activeFault ? this.activeFault.type : null
    };

    // Evaluate live thresholds for automated simulation warnings
    this.checkThresholds(sensorPacket);

    // Broadcast data packet to subscribers
    this.onDataListeners.forEach(listener => listener(sensorPacket));
  }

  transitionToNextPhase() {
    let nextPhaseKey = 'FAST_DOWN';
    if (this.currentPhaseKey === 'FAST_DOWN') {
      nextPhaseKey = 'WORKING';
      this.positionMm = 200.0;
    } else if (this.currentPhaseKey === 'WORKING') {
      nextPhaseKey = 'HOLDING';
      this.positionMm = 250.0;
    } else if (this.currentPhaseKey === 'HOLDING') {
      nextPhaseKey = 'FAST_UP';
      this.positionMm = 250.0;
    } else if (this.currentPhaseKey === 'FAST_UP') {
      nextPhaseKey = 'FAST_DOWN';
      this.positionMm = 0.0;
      this.cycleNumber += 1;
      this.cycleElapsedTime = 0;
    }

    this.currentPhaseKey = nextPhaseKey;
    this.phaseElapsedTime = 0;

    const event = {
      timestamp: new Date().toISOString(),
      cycleNumber: this.cycleNumber,
      phase: this.currentPhaseKey,
      phaseName: CYCLE_PHASES[this.currentPhaseKey].name,
      message: `Phase shifted to ${CYCLE_PHASES[this.currentPhaseKey].name}`
    };

    this.onPhaseChangeListeners.forEach(listener => listener(event));
  }

  updatePhysicsState(phase, progress, dt) {
    const noise = (amplitude) => this.noiseEnabled ? (Math.random() - 0.5) * 2 * amplitude : 0;

    switch (this.currentPhaseKey) {
      case 'FAST_DOWN': {
        // Position: 0 -> 200 mm smoothly
        const targetPos = progress * 200.0;
        this.positionMm = Math.min(200.0, targetPos + noise(0.2));
        
        // Speed: Ramps up to ~200 mm/s and stays stable
        const ramp = Math.sin(progress * Math.PI); // smooth arc / trapezoid speed profile
        this.speedMmS = 200.0 * Math.min(1.0, progress * 4.0) * Math.min(1.0, (1.0 - progress) * 4.0 + 0.1) + noise(2.0);
        
        // Flow: High flow proportional to cylinder area * speed
        // Q = A * v = 56.75 cm2 * 20 cm/s = 68.1 L/min
        this.flowLmin = (this.speedMmS * GROUP_2_SPECIFICATIONS.capAreaCm2 * 60) / 10000.0 + noise(0.8);
        
        // Pressure: Low-moderate (~30-38 bar, fast move pressure)
        this.pressureBar = phase.basePressureBar + noise(1.2);
        
        // Motor current
        this.motorCurrentA = phase.baseMotorCurrentA + (this.pressureBar / 20.0) + noise(0.3);
        break;
      }

      case 'WORKING': {
        // Position: 200 -> 250 mm slowly over 5 seconds
        const targetPos = 200.0 + progress * 50.0;
        this.positionMm = Math.min(250.0, targetPos + noise(0.1));
        
        // Speed: ~10 mm/s constant
        this.speedMmS = 10.0 + noise(0.4);
        
        // Flow: Low flow (~3.4 L/min)
        this.flowLmin = (this.speedMmS * GROUP_2_SPECIFICATIONS.capAreaCm2 * 60) / 10000.0 + noise(0.15);
        
        // Pressure: Ramps up heavily as load increases (100 bar -> 185 bar)
        // Simulated pressing load buildup curve
        const loadBuildUp = Math.pow(progress, 0.7); // progressive resistance curve
        const pressTargetBar = 90.0 + loadBuildUp * 95.0 + GROUP_2_SPECIFICATIONS.systemLossBar; // up to ~195 bar
        this.pressureBar = pressTargetBar + noise(1.8);
        
        // Motor current increases with pressure
        this.motorCurrentA = 16.0 + (this.pressureBar / 185.0) * 17.0 + noise(0.5); // ~32-34A
        
        // Oil temp increases during working stroke
        this.temperatureC += dt * 0.08;
        break;
      }

      case 'HOLDING': {
        // Position: Constant 250 mm
        this.positionMm = 250.0 + noise(0.02);
        
        // Speed: 0 mm/s
        this.speedMmS = 0.0 + noise(0.05);
        
        // Flow: Micro leakage ~0.5 - 0.8 L/min
        this.flowLmin = 0.6 + noise(0.1);
        
        // Pressure: High holding load (~195 bar, holding 9 Ton load)
        this.pressureBar = 195.0 + noise(0.9);
        
        // Motor current: holding load
        this.motorCurrentA = phase.baseMotorCurrentA + noise(0.4);
        
        // Warm oil holds temp
        this.temperatureC += dt * 0.02;
        break;
      }

      case 'FAST_UP': {
        // Position: 250 -> 0 mm upward
        const targetPos = 250.0 - progress * 250.0;
        this.positionMm = Math.max(0.0, targetPos + noise(0.2));
        
        // Speed: ~200 mm/s retraction
        this.speedMmS = 200.0 * Math.min(1.0, progress * 4.0) * Math.min(1.0, (1.0 - progress) * 4.0 + 0.1) + noise(2.0);
        
        // Flow: Annulus area return flow (~44.5 L/min)
        this.flowLmin = (this.speedMmS * GROUP_2_SPECIFICATIONS.annulusAreaCm2 * 60) / 10000.0 + noise(0.7);
        
        // Pressure: Retraction return pressure (~45 bar)
        this.pressureBar = phase.basePressureBar + noise(1.1);
        
        // Motor current: moderate
        this.motorCurrentA = phase.baseMotorCurrentA + noise(0.3);
        
        // Slight cooling effect on return
        this.temperatureC = Math.max(40.0, this.temperatureC - dt * 0.04);
        break;
      }
    }

    // Apply Active Injected Fault Modifiers if any
    if (this.activeFault) {
      if (this.activeFault.type === 'OVERPRESSURE') {
        this.pressureBar += (this.activeFault.severity === 'ALARM' ? 50.0 : 30.0);
        this.motorCurrentA += 8.0;
      } else if (this.activeFault.type === 'THERMAL_SPIKE') {
        this.temperatureC += 0.8;
      } else if (this.activeFault.type === 'VALVE_LEAK') {
        this.flowLmin *= 0.3; // Sudden pressure drop/flow reduction
        this.pressureBar *= 0.6;
      }
    }

    // Apply Controlled Diagnostic Override if active
    if (this.diagnosticOverride) {
      const { metric, value } = this.diagnosticOverride;
      if (metric === 'PRESSURE') this.pressureBar = parseFloat(value);
      else if (metric === 'TEMPERATURE') this.temperatureC = parseFloat(value);
      else if (metric === 'FLOW') this.flowLmin = parseFloat(value);
      else if (metric === 'CYLINDER_SPEED') this.speedMmS = parseFloat(value);
      else if (metric === 'MOTOR_CURRENT') this.motorCurrentA = parseFloat(value);
    }

    // Natural oil temperature cooling loop (fan simulation)
    if (this.temperatureC > 58.0 && !this.diagnosticOverride) {
      this.temperatureC -= dt * 0.15; // cooling fan kicks in
    }
  }

  checkThresholds(data) {
    // Check Pressure threshold
    if (data.pressureBar > SIMULATION_THRESHOLDS.pressureAlarmBar) {
      this.notifyAlert({
        id: `alt-p-alarm-${Date.now()}`,
        timestamp: data.timestamp,
        type: 'HIGH_PRESSURE_ALARM',
        severity: 'ALARM',
        message: `High Pressure Warning: ${data.pressureBar} bar exceeds simulation threshold (${SIMULATION_THRESHOLDS.pressureAlarmBar} bar)`,
        value: `${data.pressureBar} bar`,
        source: 'PRESSURE_SENSOR'
      });
    } else if (data.pressureBar > SIMULATION_THRESHOLDS.pressureWarningBar) {
      this.notifyAlert({
        id: `alt-p-warn-${Date.now()}`,
        timestamp: data.timestamp,
        type: 'HIGH_PRESSURE_WARN',
        severity: 'WARNING',
        message: `Pressure Warning: ${data.pressureBar} bar near threshold (${SIMULATION_THRESHOLDS.pressureWarningBar} bar)`,
        value: `${data.pressureBar} bar`,
        source: 'PRESSURE_SENSOR'
      });
    }

    // Check Temperature threshold
    if (data.temperatureC > SIMULATION_THRESHOLDS.temperatureAlarmC) {
      this.notifyAlert({
        id: `alt-t-alarm-${Date.now()}`,
        timestamp: data.timestamp,
        type: 'HIGH_TEMP_ALARM',
        severity: 'ALARM',
        message: `Oil Temperature Alarm: ${data.temperatureC} °C exceeds threshold (${SIMULATION_THRESHOLDS.temperatureAlarmC} °C)`,
        value: `${data.temperatureC} °C`,
        source: 'TEMP_SENSOR'
      });
    } else if (data.temperatureC > SIMULATION_THRESHOLDS.temperatureWarningC) {
      this.notifyAlert({
        id: `alt-t-warn-${Date.now()}`,
        timestamp: data.timestamp,
        type: 'THERMAL_DRIFT',
        severity: 'WARNING',
        message: `Thermal Drift Warning: Oil temperature ${data.temperatureC} °C elevated above baseline`,
        value: `${data.temperatureC} °C`,
        source: 'TEMP_SENSOR'
      });
    }

    // Check Motor Current threshold
    if (data.motorCurrentA > SIMULATION_THRESHOLDS.motorCurrentAlarmA) {
      this.notifyAlert({
        id: `alt-i-alarm-${Date.now()}`,
        timestamp: data.timestamp,
        type: 'MOTOR_OVERCURRENT_ALARM',
        severity: 'ALARM',
        message: `Motor Overcurrent Alarm: ${data.motorCurrentA} A exceeds alarm threshold (${SIMULATION_THRESHOLDS.motorCurrentAlarmA} A)`,
        value: `${data.motorCurrentA} A`,
        source: 'CURRENT_SENSOR'
      });
    } else if (data.motorCurrentA > SIMULATION_THRESHOLDS.motorCurrentWarningA) {
      this.notifyAlert({
        id: `alt-i-warn-${Date.now()}`,
        timestamp: data.timestamp,
        type: 'MOTOR_OVERCURRENT_WARN',
        severity: 'WARNING',
        message: `Motor Current Warning: ${data.motorCurrentA} A near warning threshold (${SIMULATION_THRESHOLDS.motorCurrentWarningA} A)`,
        value: `${data.motorCurrentA} A`,
        source: 'CURRENT_SENSOR'
      });
    }

    // Check Hydraulic Flow threshold
    if (data.flowLmin <= 5.0 && (data.phase === 'FAST_DOWN' || data.phase === 'FAST_UP' || (this.diagnosticOverride && this.diagnosticOverride.metric === 'FLOW'))) {
      this.notifyAlert({
        id: `alt-q-warn-${Date.now()}`,
        timestamp: data.timestamp,
        type: 'LOW_FLOW_WARN',
        severity: 'WARNING',
        message: `Low Hydraulic Flow Warning: ${data.flowLmin} L/min significantly below nominal flow rate`,
        value: `${data.flowLmin} L/min`,
        source: 'FLOW_SENSOR'
      });
    }

    // Check Cylinder Speed threshold
    if (this.diagnosticOverride && this.diagnosticOverride.metric === 'CYLINDER_SPEED') {
      if (data.speedMmS <= 50.0) {
        this.notifyAlert({
          id: `alt-v-slow-${Date.now()}`,
          timestamp: data.timestamp,
          type: 'SLOW_CYLINDER_WARN',
          severity: 'WARNING',
          message: `Cylinder Speed Drop Warning: ${data.speedMmS} mm/s is below expected stroke velocity`,
          value: `${data.speedMmS} mm/s`,
          source: 'SPEED_CALCULATION'
        });
      } else if (data.speedMmS >= 250.0) {
        this.notifyAlert({
          id: `alt-v-fast-${Date.now()}`,
          timestamp: data.timestamp,
          type: 'FAST_CYLINDER_WARN',
          severity: 'WARNING',
          message: `Cylinder Overspeed Warning: ${data.speedMmS} mm/s exceeds upper stroke speed limit`,
          value: `${data.speedMmS} mm/s`,
          source: 'SPEED_CALCULATION'
        });
      }
    }
  }

  notifyAlert(alertObj) {
    this.onAlertListeners.forEach(listener => listener(alertObj));
  }

  onData(fn) { this.onDataListeners.push(fn); }
  onPhaseChange(fn) { this.onPhaseChangeListeners.push(fn); }
  onAlert(fn) { this.onAlertListeners.push(fn); }
}
