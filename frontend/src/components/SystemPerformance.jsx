import React from 'react';
import { BarChart3, Zap, Gauge, Wind, Activity, CheckCircle2 } from 'lucide-react';

export function SystemPerformance({ stats }) {
  const avgPressure = stats?.avgPressureBar ?? 0;
  const maxPressure = stats?.maxPressureBar ?? 0;
  const avgFlow = stats?.avgFlowLmin ?? 0;
  const maxFlow = stats?.maxFlowLmin ?? 0;
  const avgSpeed = stats?.avgSpeedMmS ?? 0;
  const cycleTime = stats?.cycleTimeSec ?? 9.25;
  const completedCycles = stats?.completedCycles ?? 0;
  const energyKwh = stats?.estimatedEnergyKwh ?? 0;

  return (
    <div className="industrial-card p-4 lg:p-6 mb-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            System Performance Analysis
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded">
            SIMULATION METRICS
          </span>
        </div>
      </div>

      {/* Grid of KPI Performance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        
        {/* 1. Avg Pressure */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-[10px] uppercase font-mono text-slate-500 mb-1 flex items-center gap-1 font-semibold">
            <Gauge className="w-3 h-3 text-rose-600" /> Avg Press.
          </div>
          <div className="text-lg font-bold text-rose-600 font-mono">
            {avgPressure} <span className="text-xs text-slate-500 font-normal">bar</span>
          </div>
          <div className="text-[9px] text-slate-400 font-mono">Rolling Average</div>
        </div>

        {/* 2. Max Pressure */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-[10px] uppercase font-mono text-slate-500 mb-1 flex items-center gap-1 font-semibold">
            <Gauge className="w-3 h-3 text-rose-700" /> Peak Press.
          </div>
          <div className="text-lg font-bold text-rose-700 font-mono">
            {maxPressure} <span className="text-xs text-slate-500 font-normal">bar</span>
          </div>
          <div className="text-[9px] text-slate-400 font-mono">Max Observed</div>
        </div>

        {/* 3. Avg Flow */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-[10px] uppercase font-mono text-slate-500 mb-1 flex items-center gap-1 font-semibold">
            <Wind className="w-3 h-3 text-sky-600" /> Avg Flow
          </div>
          <div className="text-lg font-bold text-sky-600 font-mono">
            {avgFlow} <span className="text-xs text-slate-500 font-normal">L/m</span>
          </div>
          <div className="text-[9px] text-slate-400 font-mono">Volumetric Avg</div>
        </div>

        {/* 4. Max Flow */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-[10px] uppercase font-mono text-slate-500 mb-1 flex items-center gap-1 font-semibold">
            <Wind className="w-3 h-3 text-sky-700" /> Peak Flow
          </div>
          <div className="text-lg font-bold text-sky-700 font-mono">
            {maxFlow} <span className="text-xs text-slate-500 font-normal">L/m</span>
          </div>
          <div className="text-[9px] text-slate-400 font-mono">Fast Down Peak</div>
        </div>

        {/* 5. Avg Speed */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-[10px] uppercase font-mono text-slate-500 mb-1 flex items-center gap-1 font-semibold">
            <Activity className="w-3 h-3 text-amber-600" /> Avg Speed
          </div>
          <div className="text-lg font-bold text-amber-600 font-mono">
            {avgSpeed} <span className="text-xs text-slate-500 font-normal">mm/s</span>
          </div>
          <div className="text-[9px] text-slate-400 font-mono">Mean Velocity</div>
        </div>

        {/* 6. Cycle Time */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-[10px] uppercase font-mono text-slate-500 mb-1 font-semibold">
            Cycle Time
          </div>
          <div className="text-lg font-bold text-purple-600 font-mono">
            {cycleTime} <span className="text-xs text-slate-500 font-normal">s</span>
          </div>
          <div className="text-[9px] text-slate-400 font-mono">Target Cycle</div>
        </div>

        {/* 7. Completed Cycles */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-[10px] uppercase font-mono text-slate-500 mb-1 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cycles
          </div>
          <div className="text-lg font-bold text-emerald-600 font-mono">
            {completedCycles}
          </div>
          <div className="text-[9px] text-slate-400 font-mono">Total Completed</div>
        </div>

        {/* 8. Est. Energy */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-[10px] uppercase font-mono text-slate-500 mb-1 flex items-center gap-1 font-semibold">
            <Zap className="w-3 h-3 text-amber-600" /> Est. Energy
          </div>
          <div className="text-lg font-bold text-amber-600 font-mono">
            {energyKwh.toFixed(3)} <span className="text-xs text-slate-500 font-normal">kWh</span>
          </div>
          <div className="text-[9px] text-slate-400 font-mono">Power Est.</div>
        </div>

      </div>

    </div>
  );
}

