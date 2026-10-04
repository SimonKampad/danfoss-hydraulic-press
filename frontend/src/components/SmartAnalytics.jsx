import React from 'react';
import { Brain, ShieldCheck, Activity, Wrench, Lightbulb } from 'lucide-react';

export function SmartAnalytics({ report }) {
  const machineCondition = report?.machineCondition || 'NORMAL';
  const anomalyStatus = report?.anomalyStatus || 'NO ANOMALY';
  const maintenanceIndicator = report?.maintenanceIndicator || 'NORMAL';
  const cycleConsistency = report?.cycleConsistency || 'STABLE (98.8%)';
  const confidence = report?.confidenceScore || 98.5;
  const insights = report?.insights || [];
  const aiValueAdd = report?.aiValueAdd || [];

  const conditionColor = machineCondition === 'NORMAL' 
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
    : (machineCondition === 'ATTENTION' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200');

  return (
    <div className="industrial-card p-4 lg:p-6 mb-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              Smart Analytics & Diagnostic Engine
            </h2>
            <p className="text-[10px] text-slate-500 font-mono">
              Intelligent Real-Time Health & Performance Classifier
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded font-semibold">
          Confidence Score: <strong className="text-slate-900">{confidence}%</strong>
        </span>
      </div>

      {/* 4 Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Card 1: Machine Condition */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-[10px] font-mono uppercase text-slate-500 mb-1 flex items-center gap-1.5 font-bold">
            <Activity className="w-3.5 h-3.5 text-blue-600" /> Machine Condition
          </div>
          <div className={`inline-block px-2.5 py-1 rounded text-xs font-mono font-bold border mt-1 ${conditionColor}`}>
            {machineCondition}
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-2">Overall operational health</p>
        </div>

        {/* Card 2: Anomaly Status */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-[10px] font-mono uppercase text-slate-500 mb-1 flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Anomaly Status
          </div>
          <div className="text-sm font-bold font-mono text-slate-800 mt-1">
            {anomalyStatus}
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-2">Phase profile trajectory</p>
        </div>

        {/* Card 3: Maintenance Indicator */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-[10px] font-mono uppercase text-slate-500 mb-1 flex items-center gap-1.5 font-bold">
            <Wrench className="w-3.5 h-3.5 text-amber-600" /> Maintenance Status
          </div>
          <div className="text-sm font-bold font-mono text-amber-700 mt-1">
            {maintenanceIndicator}
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-2">Predictive servicing alert</p>
        </div>

        {/* Card 4: Cycle Consistency */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="text-[10px] font-mono uppercase text-slate-500 mb-1 flex items-center gap-1.5 font-bold">
            <Brain className="w-3.5 h-3.5 text-purple-600" /> Cycle Consistency
          </div>
          <div className="text-sm font-bold font-mono text-purple-700 mt-1">
            {cycleConsistency}
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-2">Nominal envelope correlation</p>
        </div>

      </div>

      {/* Dynamic Telemetry Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Insights */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2 font-mono">
            <Lightbulb className="w-4 h-4 text-amber-600" /> Dynamic Telemetry Insights
          </h4>

          <div className="space-y-2.5">
            {insights.map((ins, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 text-xs font-mono shadow-2xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-800">{ins.title}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {ins.category}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {ins.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Operational System Benefits */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2 font-mono">
            <Brain className="w-4 h-4 text-indigo-600" /> Real-Time Analytics Benefits
          </h4>

          <ul className="space-y-2.5 text-xs font-mono">
            {aiValueAdd.map((val, idx) => (
              <li key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-start gap-2 text-slate-700 shadow-2xs">
                <span className="text-blue-600 font-bold">0{idx + 1}.</span>
                <span className="text-[11px] text-slate-700">{val}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

    </div>
  );
}

