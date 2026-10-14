import React from 'react';
import {
  SlidersHorizontal,
  CheckCircle2,
  Gauge,
  Thermometer,
  Wind,
  Wrench,
  Layers,
  Database,
  Info
} from 'lucide-react';

export const SCENARIO_OPTIONS = [
  {
    id: 'NORMAL_OPERATION',
    name: 'Normal Operation',
    tag: 'Baseline',
    icon: CheckCircle2,
    badgeColor: 'emerald',
    description: 'Standard pressing cycle operating within nominal limits (ZeMA baseline).',
    dataSource: 'ORIGINAL_DATASET_REPLAY'
  },
  {
    id: 'HIGH_PRESSURE',
    name: 'High Pressure Fault',
    tag: 'Critical Limit Excursion',
    icon: Gauge,
    badgeColor: 'rose',
    description: 'Relief valve bypass failure causing oil pressure to rise above 235 bar limit.',
    dataSource: 'SYNTHETIC_FAULT_SIMULATION'
  },
  {
    id: 'HIGH_TEMPERATURE',
    name: 'High Temperature Fault',
    tag: 'Thermal Warning',
    icon: Thermometer,
    badgeColor: 'orange',
    description: 'Cooling degradation; oil temperature rises above 65°C warning boundary.',
    dataSource: 'SYNTHETIC_FAULT_SIMULATION'
  },
  {
    id: 'LOW_FLOW',
    name: 'Low Hydraulic Flow',
    tag: 'Flow Anomaly',
    icon: Wind,
    badgeColor: 'amber',
    description: 'Suction line restriction; oil flow drops below 5 L/min during the pressing stroke.',
    dataSource: 'SYNTHETIC_FAULT_SIMULATION'
  },
  {
    id: 'COOLER_FAULT',
    name: 'Cooler Fault',
    tag: 'Recorded Fault Data',
    icon: Thermometer,
    badgeColor: 'blue',
    description: 'Heat exchanger efficiency degraded to near failure (ZeMA Dataset Cooler Condition 3).',
    dataSource: 'REAL_FAULT_REPLAY'
  },
  {
    id: 'VALVE_FAULT',
    name: 'Proportional Valve Fault',
    tag: 'Recorded Fault Data',
    icon: Wrench,
    badgeColor: 'purple',
    description: 'Directional valve switching lag & spool friction (ZeMA Dataset Valve Condition 73).',
    dataSource: 'REAL_FAULT_REPLAY'
  },
  {
    id: 'PUMP_LEAKAGE',
    name: 'Internal Pump Leakage',
    tag: 'Recorded Fault Data',
    icon: Layers,
    badgeColor: 'amber',
    description: 'Volumetric slip and internal pump seal wear (ZeMA Dataset Pump Leakage 2).',
    dataSource: 'REAL_FAULT_REPLAY'
  },
  {
    id: 'ACCUMULATOR_FAULT',
    name: 'Accumulator Pressure Fault',
    tag: 'Recorded Fault Data',
    icon: Gauge,
    badgeColor: 'indigo',
    description: 'Nitrogen precharge pressure dropped to 90 bar (ZeMA Dataset Accumulator 90 bar).',
    dataSource: 'REAL_FAULT_REPLAY'
  }
];

export function ScenarioControlPanel({
  systemStatus,
  currentPacket,
  controls
}) {
  const currentScenarioId = systemStatus.scenarioId || currentPacket?.scenarioId || 'NORMAL_OPERATION';
  const activeScenario = SCENARIO_OPTIONS.find(s => s.id === currentScenarioId) || SCENARIO_OPTIONS[0];

  const status = systemStatus.status || 'RUNNING';
  const isRunning = status === 'RUNNING';
  const isPaused = status === 'PAUSED';

  const activeCycleNum = currentPacket?.cycleNumber || systemStatus.cycleNumber || 1;

  const dataSourceLabel = activeScenario.dataSource === 'REAL_FAULT_REPLAY'
    ? 'Recorded Fault Data (ZeMA)'
    : activeScenario.dataSource === 'SYNTHETIC_FAULT_SIMULATION'
      ? 'Simulated Fault'
      : 'Recorded Baseline Data';

  const dataSourceColor = activeScenario.dataSource === 'REAL_FAULT_REPLAY'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : activeScenario.dataSource === 'SYNTHETIC_FAULT_SIMULATION'
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 font-mono space-y-3 w-full">
      
      {/* 1. Compact Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900 leading-tight">
              SCENARIO SELECTION & FAULT SIMULATION
            </h2>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className={`px-2.5 py-0.5 rounded-md border font-bold flex items-center gap-1.5 text-[11px] ${
            isRunning
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isPaused
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              isRunning ? 'bg-emerald-500 animate-pulse' : isPaused ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
            {status}
          </span>

          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] flex items-center gap-1">
            <Database className="w-3 h-3 text-blue-600" />
            Cycle #{activeCycleNum}
          </span>

          <span className={`px-2 py-0.5 rounded-md border font-bold text-[11px] ${dataSourceColor}`}>
            {dataSourceLabel}
          </span>
        </div>
      </div>

      {/* 2. Compact Scenario Dropdown Selector */}
      <div className="space-y-1.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <label htmlFor="scenario-select" className="text-[11px] font-bold text-slate-600 uppercase tracking-wider shrink-0">
            Select Condition:
          </label>
          <select
            id="scenario-select"
            value={currentScenarioId}
            onChange={(e) => controls.selectScenario && controls.selectScenario(e.target.value)}
            className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            {SCENARIO_OPTIONS.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name} — {sc.tag}
              </option>
            ))}
          </select>

          <span className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold shrink-0 text-center ${dataSourceColor}`}>
            {activeScenario.tag}
          </span>
        </div>

        {/* Short Single-Line Description */}
        <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg text-[11px] font-sans text-slate-600 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">
            <strong className="font-mono text-slate-900">{activeScenario.name}: </strong>
            {activeScenario.description}
          </span>
        </div>
      </div>

    </div>
  );
}
