/**
 * Performance Calculations & Energy Analytics Service
 * 
 * Computes rolling averages, peak values, hydraulic power, motor power,
 * current cycle energy consumption, average energy per cycle, total energy,
 * and per-phase energy breakdown.
 * 
 * Label: All output metrics are explicitly flagged as "Analytics Estimate".
 */

export class PerformanceService {
  constructor() {
    this.reset();
  }

  reset() {
    this.buffer = [];
    this.maxBufferSize = 600; // ~60 seconds at 100ms
    this.totalSamples = 0;

    this.maxPressureBar = 0;
    this.sumPressureBar = 0;

    this.maxFlowLmin = 0;
    this.sumFlowLmin = 0;

    this.sumSpeedMmS = 0;

    this.completedCycles = 0;
    this.cycleStartTime = Date.now();
    this.lastCycleTimeSec = 9.25; // default nominal target: 1.0 + 5.0 + 2.0 + 1.25 = 9.25s
    this.cumulativeEnergyKwh = 0.0;

    // --- Energy Analytics Module State ---
    this.currentCycleNumber = 1;
    this.currentCycleEnergyWh = 0.0;
    this.currentCycleSamples = 0;
    this.currentCyclePowerSumKw = 0.0;
    this.currentCyclePeakPowerKw = 0.0;

    this.currentCyclePhaseEnergiesWh = {
      FAST_DOWN: 0.0,
      WORKING: 0.0,
      HOLDING: 0.0,
      FAST_UP: 0.0
    };

    this.cycleEnergyHistory = []; // Historical array of completed cycles { cycleNumber, energyWh, energyKwh, peakPowerKw, avgPowerKw, phaseEnergiesWh }
    this.avgEnergyPerCycleWh = 0.0;
  }

  recordData(packet) {
    this.buffer.push(packet);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    this.totalSamples += 1;
    this.sumPressureBar += packet.pressureBar;
    this.maxPressureBar = Math.max(this.maxPressureBar, packet.pressureBar);

    this.sumFlowLmin += packet.flowLmin;
    this.maxFlowLmin = Math.max(this.maxFlowLmin, packet.flowLmin);

    this.sumSpeedMmS += packet.speedMmS;

    const cycleNum = packet.cycleNumber || 1;

    // Cycle transition detection: record completed cycle energy metrics
    if (cycleNum > this.currentCycleNumber) {
      if (this.currentCycleSamples > 0) {
        const avgPowerKw = this.currentCyclePowerSumKw / this.currentCycleSamples;
        const cycleRecord = {
          cycleNumber: this.currentCycleNumber,
          energyWh: parseFloat(this.currentCycleEnergyWh.toFixed(2)),
          energyKwh: parseFloat((this.currentCycleEnergyWh / 1000.0).toFixed(4)),
          peakPowerKw: parseFloat(this.currentCyclePeakPowerKw.toFixed(2)),
          avgPowerKw: parseFloat(avgPowerKw.toFixed(2)),
          phaseEnergiesWh: {
            FAST_DOWN: parseFloat(this.currentCyclePhaseEnergiesWh.FAST_DOWN.toFixed(2)),
            WORKING: parseFloat(this.currentCyclePhaseEnergiesWh.WORKING.toFixed(2)),
            HOLDING: parseFloat(this.currentCyclePhaseEnergiesWh.HOLDING.toFixed(2)),
            FAST_UP: parseFloat(this.currentCyclePhaseEnergiesWh.FAST_UP.toFixed(2))
          }
        };

        this.cycleEnergyHistory.push(cycleRecord);
        if (this.cycleEnergyHistory.length > 100) {
          this.cycleEnergyHistory.shift();
        }

        const totalHistWh = this.cycleEnergyHistory.reduce((acc, c) => acc + c.energyWh, 0);
        this.avgEnergyPerCycleWh = totalHistWh / this.cycleEnergyHistory.length;
      }

      // Reset current cycle counters for new cycle
      this.currentCycleNumber = cycleNum;
      this.currentCycleEnergyWh = 0.0;
      this.currentCycleSamples = 0;
      this.currentCyclePowerSumKw = 0.0;
      this.currentCyclePeakPowerKw = 0.0;
      this.currentCyclePhaseEnergiesWh = {
        FAST_DOWN: 0.0,
        WORKING: 0.0,
        HOLDING: 0.0,
        FAST_UP: 0.0
      };
    } else if (cycleNum < this.currentCycleNumber) {
      // System reset or manual cycle jump
      this.currentCycleNumber = cycleNum;
      this.currentCycleEnergyWh = 0.0;
      this.currentCycleSamples = 0;
      this.currentCyclePowerSumKw = 0.0;
      this.currentCyclePeakPowerKw = 0.0;
      this.currentCyclePhaseEnergiesWh = {
        FAST_DOWN: 0.0,
        WORKING: 0.0,
        HOLDING: 0.0,
        FAST_UP: 0.0
      };
    }

    this.completedCycles = Math.max(0, cycleNum - 1);

    // Instantaneous Electrical & Hydraulic Motor Power (kW)
    let instantaneousPowerKw = 0.0;
    if (packet.rawSensorsSnapshot?.EPS1 !== undefined) {
      // EPS1 from dataset replay is motor power in Watts
      instantaneousPowerKw = packet.rawSensorsSnapshot.EPS1 / 1000.0;
    } else if (packet.motorCurrentA !== undefined && packet.motorCurrentA > 0) {
      // 3-Phase electrical motor power formula: P = sqrt(3) * V * I * pf / 1000 (380V, pf=0.85)
      instantaneousPowerKw = (1.732 * 380.0 * 0.85 * packet.motorCurrentA) / 1000.0;
    } else {
      // Hydraulic power P = (Pressure * Flow) / (600 * efficiency)
      const pumpEfficiency = 0.9;
      instantaneousPowerKw = (packet.pressureBar * packet.flowLmin) / (600.0 * pumpEfficiency);
    }

    const dtSec = 0.1 * (packet.speedMultiplier || 1.0); // 100ms sample tick
    const dE_Wh = (instantaneousPowerKw * dtSec * 1000.0) / 3600.0;
    const dE_Kwh = dE_Wh / 1000.0;

    this.cumulativeEnergyKwh += dE_Kwh;
    this.currentCycleEnergyWh += dE_Wh;

    this.currentCycleSamples += 1;
    this.currentCyclePowerSumKw += instantaneousPowerKw;
    this.currentCyclePeakPowerKw = Math.max(this.currentCyclePeakPowerKw, instantaneousPowerKw);

    const phaseKey = packet.phase || 'FAST_DOWN';
    if (this.currentCyclePhaseEnergiesWh[phaseKey] !== undefined) {
      this.currentCyclePhaseEnergiesWh[phaseKey] += dE_Wh;
    }

    // Attach computed real-time analytics estimates directly to telemetry packet
    packet.instantaneousPowerKw = parseFloat(instantaneousPowerKw.toFixed(2));
    packet.currentCycleEnergyWh = parseFloat(this.currentCycleEnergyWh.toFixed(2));
    packet.currentCycleEnergyKwh = parseFloat((this.currentCycleEnergyWh / 1000.0).toFixed(4));
  }

  getStats() {
    const count = this.buffer.length;
    const currentBufAvgP = count === 0 ? 0 : this.buffer.reduce((acc, d) => acc + d.pressureBar, 0) / count;
    const currentBufAvgQ = count === 0 ? 0 : this.buffer.reduce((acc, d) => acc + d.flowLmin, 0) / count;
    const currentBufAvgV = count === 0 ? 0 : this.buffer.reduce((acc, d) => acc + d.speedMmS, 0) / count;

    const currentCycleAvgPowerKw = this.currentCycleSamples > 0 
      ? this.currentCyclePowerSumKw / this.currentCycleSamples 
      : 0;

    const avgEnergyWh = this.cycleEnergyHistory.length > 0
      ? this.avgEnergyPerCycleWh
      : (this.currentCycleEnergyWh > 0 ? this.currentCycleEnergyWh : 24.50);

    const lastInstantPower = count > 0 ? (this.buffer[count - 1].instantaneousPowerKw || 0) : 0;

    return {
      avgPressureBar: parseFloat(currentBufAvgP.toFixed(1)),
      maxPressureBar: parseFloat(this.maxPressureBar.toFixed(1)),
      avgFlowLmin: parseFloat(currentBufAvgQ.toFixed(1)),
      maxFlowLmin: parseFloat(this.maxFlowLmin.toFixed(1)),
      avgSpeedMmS: parseFloat(currentBufAvgV.toFixed(1)),
      cycleTimeSec: 9.25,
      completedCycles: this.completedCycles,

      // --- ENERGY ANALYTICS MODULE METRICS (Analytics Estimates) ---
      currentCycleNumber: this.currentCycleNumber,
      currentCycleEnergyWh: parseFloat(this.currentCycleEnergyWh.toFixed(2)),
      currentCycleEnergyKwh: parseFloat((this.currentCycleEnergyWh / 1000.0).toFixed(4)),
      
      avgEnergyPerCycleWh: parseFloat(avgEnergyWh.toFixed(2)),
      avgEnergyPerCycleKwh: parseFloat((avgEnergyWh / 1000.0).toFixed(4)),
      
      totalCumulativeEnergyKwh: parseFloat(this.cumulativeEnergyKwh.toFixed(4)),
      estimatedEnergyKwh: parseFloat(this.cumulativeEnergyKwh.toFixed(4)), // backwards compatibility
      
      instantaneousPowerKw: parseFloat(lastInstantPower.toFixed(2)),
      currentCycleAvgPowerKw: parseFloat(currentCycleAvgPowerKw.toFixed(2)),
      currentCyclePeakPowerKw: parseFloat(this.currentCyclePeakPowerKw.toFixed(2)),
      
      currentCyclePhaseEnergiesWh: {
        FAST_DOWN: parseFloat(this.currentCyclePhaseEnergiesWh.FAST_DOWN.toFixed(2)),
        WORKING: parseFloat(this.currentCyclePhaseEnergiesWh.WORKING.toFixed(2)),
        HOLDING: parseFloat(this.currentCyclePhaseEnergiesWh.HOLDING.toFixed(2)),
        FAST_UP: parseFloat(this.currentCyclePhaseEnergiesWh.FAST_UP.toFixed(2))
      },
      
      cycleEnergyHistory: this.cycleEnergyHistory.slice(-50), // Last 50 cycles for Energy-vs-Cycle graph
      
      systemLossBar: 10.0,
      pumpEfficiency: 0.9,
      label: 'Analytics Estimate'
    };
  }
}

