import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Octagon,
  AlertTriangle,
  Database,
  SlidersHorizontal,
  Layers,
  Thermometer,
  Gauge,
  Wind,
  Wrench,
  CheckCircle2,
  ShieldAlert,
  Info
} from 'lucide-react';

export const SCENARIO_OPTIONS = [
  {
    id: 'NORMAL_OPERATION',
    name: 'Normal Operation',
    tag: 'Baseline',
    icon: CheckCircle2,
    badgeColor: 'emerald',
    description: 'Nominal operating cycle within verified standard operating envelope (ZeMA baseline).',
    dataSource: 'ORIGINAL_DATASET_REPLAY'
  },
  {
    id: 'HIGH_PRESSURE',
    name: 'High Pressure Fault',
    tag: 'Critical Process Excursion',
    icon: Gauge,
    badgeColor: 'rose',
    description: 'Relief valve bypass failure causing system pressure excursion above 235 bar alarm limit.',
    dataSource: 'SYNTHETIC_FAULT_SIMULATION'
  },
  {
    id: 'HIGH_TEMPERATURE',
    name: 'High Temperature Fault',
    tag: 'Thermal Excursion',
    icon: Thermometer,
    badgeColor: 'orange',
    description: 'Thermal management degradation; oil temperature rises above 65°C alarm boundary.',
    dataSource: 'SYNTHETIC_FAULT_SIMULATION'
  },
  {
    id: 'LOW_FLOW',
    name: 'Low Hydraulic Flow',
    tag: 'Flow Anomaly',
    icon: Wind,
    badgeColor: 'amber',
    description: 'Suction line restriction / pump cavitation; volume flow rate drops below 5 L/min during stroke.',
    dataSource: 'SYNTHETIC_FAULT_SIMULATION'
  },
  {
    id: 'COOLER_FAULT',
    name: 'Cooler Fault',
    tag: 'ZeMA Component Fault',
    icon: Thermometer,
    badgeColor: 'blue',
    description: 'Heat exchanger efficiency degraded to near total failure (ZeMA Ground Truth: Cooler Condition 3).',
    dataSource: 'REAL_FAULT_REPLAY'
  },
  {
    id: 'VALVE_FAULT',
    name: 'Proportional Valve Fault',
    tag: 'ZeMA Component Fault',
    icon: Wrench,
    badgeColor: 'purple',
    description: 'Directional valve switching lag & spool friction (ZeMA Ground Truth: Valve Condition 73).',
    dataSource: 'REAL_FAULT_REPLAY'
  },
  {
    id: 'PUMP_LEAKAGE',
    name: 'Internal Pump Leakage',
    tag: 'ZeMA Component Fault',
    icon: Layers,
    badgeColor: 'amber',
    description: 'Volumetric slip & seal clearance degradation (ZeMA Ground Truth: Pump Leakage 2).',
    dataSource: 'REAL_FAULT_REPLAY'
  },
  {
    id: 'ACCUMULATOR_FAULT',
    name: 'Accumulator Pressure Fault',
    tag: 'ZeMA Component Fault',
    icon: Gauge,
    badgeColor: 'indigo',
    description: 'Nitrogen precharge pressure dropped to 90 bar (ZeMA Ground Truth: Accumulator 90 bar).',
    dataSource: 'REAL_FAULT_REPLAY'
  }
];

export function ScenarioControlPanel({
  systemStatus,
  currentPacket,
  controls,
  alerts
}) {
  const currentScenarioId = systemStatus.scenarioId || currentPacket?.scenarioId || 'NORMAL_OPERATION';
  const activeScenario = SCENARIO_OPTIONS.find(s => s.id === currentScenarioId) || SCENARIO_OPTIONS[0];

  const status = systemStatus.status || 'RUNNING';
  const isRunning = status === 'RUNNING';
  const isPaused = status === 'PAUSED';
  const isStopped = status === 'STOPPED';

  const activeCycleNum = currentPacket?.cycleNumber || systemStatus.cycleNumber || 1;
  const currentPressure = currentPacket?.pressureBar ?? 0;
  const currentTemp = currentPacket?.temperatureC ?? 0;
  const currentFlow = currentPacket?.flowLmin ?? 0;

  // Active high pressure threshold alert check (>= 235 bar)
  const isHighPressureExcursion = currentPressure >= 235.0 || currentPacket?.alert?.type === 'HIGH_PRESSURE_ALARM';
  const isHighTempWarning = currentTemp >= 65.0;
  const isLowFlowWarning = currentFlow <= 5.0 && (currentPacket?.phase === 'FAST_DOWN' || currentPacket?.phase === 'FAST_UP');

  const dataSourceLabel = activeScenario.dataSource === 'REAL_FAULT_REPLAY'
    ? 'Real Fault Replay (ZeMA)'
    : activeScenario.dataSource === 'SYNTHETIC_FAULT_SIMULATION'
      ? 'Synthetic Fault Simulation'
      : 'Original Dataset Replay';

  const dataSourceColor = activeScenario.dataSource === 'REAL_FAULT_REPLAY'
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : activeScenario.dataSource === 'SYNTHETIC_FAULT_SIMULATION'
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 font-mono space-y-4 transition-all">
      
      {/* 1. HEADER ROW: TITLE & STATUS BADGES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600 text-white shadow-2xs">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 leading-tight">
              SCENARIO CONTROL & FAULT SIMULATION PANEL
            </h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Select verified operational scenarios to evaluate real-time telemetry, threshold alarms, and ML inference.
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Badge */}
          <span className={`px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 ${
            isRunning
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isPaused
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-emerald-500 animate-pulse' : isPaused ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
            {status}
          </span>

          {/* Cycle Badge */}
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-bold flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            Cycle #{activeCycleNum}
          </span>

          {/* Provenance Badge */}
          <span className={`px-2.5 py-1 rounded-lg border font-bold ${dataSourceColor}`}>
            {dataSourceLabel}
          </span>
        </div>
      </div>

      {/* 2. PROMINENT RED SAFETY ALERT BANNER (TRIGGERED ON OVERPRESSURE) */}
      {isHighPressureExcursion && (
        <div className="bg-rose-600 text-white p-4 rounded-xl shadow-md border-2 border-rose-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg text-white shrink-0">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="text-base font-black tracking-wide flex items-center gap-2">
                <span>STOP — HIGH PRESSURE EXCURSION DETECTED</span>
              </div>
              <p className="text-xs text-rose-100 font-sans mt-0.5">
                Measured system pressure of <strong>{currentPressure.toFixed(1)} bar</strong> exceeds maximum safety threshold (<strong>235.0 bar</strong>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => controls.stopSimulation && controls.stopSimulation()}
              className="bg-white text-rose-700 hover:bg-rose-50 px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer"
            >
              STOP SIMULATION NOW
            </button>
          </div>
        </div>
      )}

      {/* 3. TEMPERATURE WARNING BANNER */}
      {isHighTempWarning && !isHighPressureExcursion && (
        <div className="bg-amber-500 text-white p-3.5 rounded-xl shadow-xs border border-amber-600 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <strong className="tracking-wide">HIGH OIL TEMPERATURE WARNING:</strong>
              <span className="font-sans ml-1">
                Measured temperature <strong>{currentTemp.toFixed(1)} °C</strong> exceeds thermal warning limit (<strong>65.0 °C</strong>).
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. SCENARIO SELECTOR & OPERATOR CONTROLS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        
        {/* Left: Scenario Dropdown & Description (7 Cols) */}
        <div className="lg:col-span-7 space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Select Active Operating Scenario:
          </label>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={currentScenarioId}
              onChange={(e) => controls.selectScenario && controls.selectScenario(e.target.value)}
              className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              {SCENARIO_OPTIONS.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name} ({sc.tag})
                </option>
              ))}
            </select>

            <span className={`px-3 py-2 rounded-lg border text-xs font-bold shrink-0 text-center ${dataSourceColor}`}>
              {activeScenario.tag}
            </span>
          </div>

          <p className="text-xs text-slate-600 font-sans leading-relaxed pt-0.5">
            <strong className="text-slate-800 font-mono">Scenario Details:</strong> {activeScenario.description}
          </p>
        </div>

        {/* Right: Master Execution Controls (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase">
            <span>Execution Controls</span>
            <span className="text-slate-400">Software Engine</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {/* Play / Resume */}
            {isRunning ? (
              <button
                onClick={() => controls.pauseSimulation && controls.pauseSimulation()}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-95 cursor-pointer"
                title="Pause Simulation"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">PAUSE</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (isStopped && controls.resumeSimulation) controls.resumeSimulation();
                  else if (controls.startSimulation) controls.startSimulation();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-95 cursor-pointer"
                title={isPaused ? "Resume Simulation" : "Start Simulation"}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">{isPaused || isStopped ? 'RESUME' : 'START'}</span>
              </button>
            )}

            {/* Pause (direct) */}
            <button
              onClick={() => controls.pauseSimulation && controls.pauseSimulation()}
              disabled={isPaused || isStopped}
              className="bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-bold text-xs py-2 px-2 rounded-lg border border-slate-300 flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
              title="Pause Simulation Clock"
            >
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PAUSE</span>
            </button>

            {/* Reset */}
            <button
              onClick={() => controls.resetSimulation && controls.resetSimulation()}
              className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs py-2 px-2 rounded-lg border border-slate-300 flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
              title="Reset System Cycle & Buffers"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">RESET</span>
            </button>

            {/* Master Red STOP SIMULATION Button */}
            <button
              onClick={() => controls.stopSimulation && controls.stopSimulation()}
              className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs py-2 px-2 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ring-2 ring-rose-300"
              title="Emergency Stop Software Simulation"
            >
              <Octagon className="w-3.5 h-3.5 fill-current" />
              <span>STOP</span>
            </button>
          </div>
        </div>

      </div>

      {/* 5. QUICK SCENARIO SELECTOR BUTTON BAR */}
      <div className="pt-2 border-t border-slate-100">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Quick Scenario Selectors:</span>
          <span className="text-slate-400">8 Pre-Configured Operating Conditions</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {SCENARIO_OPTIONS.map((sc) => {
            const isSelected = sc.id === currentScenarioId;
            const Icon = sc.icon;
            return (
              <button
                key={sc.id}
                onClick={() => controls.selectScenario && controls.selectScenario(sc.id)}
                className={`p-2 rounded-lg border text-[11px] font-bold transition flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title={sc.description}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                <span className="truncate w-full text-[10px]">{sc.name.replace(' Fault', '')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. OPERATIONAL SAFETY BOUNDARY DISCLAIMER */}
      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-500 font-sans flex items-center gap-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          <strong>Operational Safety Notice:</strong> The red <strong>STOP SIMULATION</strong> control halts the software engine and telemetry feed. Physical machine safety remains independent and is governed by certified hardware emergency stop circuits and mechanical pressure relief valves.
        </span>
      </div>

    </div>
  );
}
