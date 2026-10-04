/**
 * Performance Calculations & Statistics Tracking Service
 * 
 * Computes rolling averages, peak values, hydraulic power, 
 * and estimated electrical energy consumption.
 * 
 * Label: All output metrics are explicitly flagged as "Simulation Estimate".
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

    this.completedCycles = Math.max(0, packet.cycleNumber - 1);

    // Energy consumption increment:
    // Hydraulic Power P (kW) = (Pressure (bar) * Flow (L/min)) / (600 * pumpEfficiency)
    // Energy dE (kWh) = P (kW) * (dt_sec / 3600)
    const dtSec = 0.1 * (packet.speedMultiplier || 1.0);
    const pumpEfficiency = 0.9;
    const hydraulicPowerKw = (packet.pressureBar * packet.flowLmin) / (600.0 * pumpEfficiency);
    const dE = (hydraulicPowerKw * dtSec) / 3600.0;
    this.cumulativeEnergyKwh += dE;
  }

  getStats() {
    const count = this.buffer.length;
    if (count === 0) {
      return {
        avgPressureBar: 0,
        maxPressureBar: 0,
        avgFlowLmin: 0,
        maxFlowLmin: 0,
        avgSpeedMmS: 0,
        cycleTimeSec: 9.25,
        completedCycles: 0,
        estimatedEnergyKwh: 0,
        label: 'Simulation Estimate'
      };
    }

    const currentBufAvgP = this.buffer.reduce((acc, d) => acc + d.pressureBar, 0) / count;
    const currentBufAvgQ = this.buffer.reduce((acc, d) => acc + d.flowLmin, 0) / count;
    const currentBufAvgV = this.buffer.reduce((acc, d) => acc + d.speedMmS, 0) / count;

    return {
      avgPressureBar: parseFloat(currentBufAvgP.toFixed(1)),
      maxPressureBar: parseFloat(this.maxPressureBar.toFixed(1)),
      avgFlowLmin: parseFloat(currentBufAvgQ.toFixed(1)),
      maxFlowLmin: parseFloat(this.maxFlowLmin.toFixed(1)),
      avgSpeedMmS: parseFloat(currentBufAvgV.toFixed(1)),
      cycleTimeSec: 9.25,
      completedCycles: this.completedCycles,
      estimatedEnergyKwh: parseFloat(this.cumulativeEnergyKwh.toFixed(4)),
      systemLossBar: 10.0,
      pumpEfficiency: 0.9,
      label: 'Simulation Estimate'
    };
  }
}
