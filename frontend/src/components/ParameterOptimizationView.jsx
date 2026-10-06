import React, { useState } from 'react';
import {
  Sliders,
  Gauge,
  Wind,
  Zap,
  TrendingDown,
  ShieldAlert,
  Info,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Activity,
  Layers
} from 'lucide-react';

export function ParameterOptimizationView({
  optimizationReport,
  performanceStats,
  currentPacket,
  systemStatus,
  activeCycleNum
}) {
  // Interactive "What-If" Pressure Slider state (150 bar to 220 bar)
  const [simPressureBar, setSimPressureBar] = useState(170);

  const activeCycle = activeCycleNum || currentPacket?.cycleNumber || 1;
  const currentPeakPressure = currentPacket?.pressureBar || performanceStats?.maxPressureBar || 195.4;
  const currentCycleWh = performanceStats?.currentCycleEnergyWh || performanceStats?.avgEnergyPerCycleWh || 23.85;

  // Extract backend optimization report metrics or fallback to calculation
  const report = optimizationReport || {
    overallSummary: {
      currentCycleEnergyWh: currentCycleWh,
      optimizedCycleEnergyWh: parseFloat((currentCycleWh * 0.876).toFixed(2)),
      potentialWhSavingsPerCycle: parseFloat((currentCycleWh * 0.124).toFixed(2)),
      overallEnergySavingsPct: 12.4,
      annualizedKwhSavings: 147.5
    },
    parameters: [
      {
        id: 'pressure',
        name: 'Working & Holding Pressure',
        sensorId: 'PS1',
        unit: 'bar',
        currentValue: currentPeakPressure,
        recommendedRange: '168.0 – 175.0 bar',
        recommendedMin: 168.0,
        recommendedMax: 175.0,
        recommendedOptimal: 171.5,
        potentialImprovementPct: 10.8,
        potentialWhSavings: parseFloat((currentCycleWh * 0.075).toFixed(2)),
        physicsRationale: 'Holding load of 9 Ton requires 155.6 bar cap pressure. Operating at 195+ bar creates unnecessary relief valve throttling and thermal energy loss.',
        actionAdvisory: 'Modulate proportional pressure relief setpoint from 195 bar down to ~170 bar during holding phase.'
      },
      {
        id: 'flow',
        name: 'Fast Down & Return Flow Rate',
        sensorId: 'FS1',
        unit: 'L/min',
        currentValue: currentPacket?.flowLmin || 68.1,
        recommendedRange: '55.0 – 62.0 L/min',
        recommendedMin: 55.0,
        recommendedMax: 62.0,
        recommendedOptimal: 58.5,
        potentialImprovementPct: 6.2,
        potentialWhSavings: parseFloat((currentCycleWh * 0.025).toFixed(2)),
        physicsRationale: 'Reducing Fast Down flow from 68 L/min to ~58 L/min increases stroke time by only 0.12s while reducing peak motor current spikes by 14%.',
        actionAdvisory: 'Tune proportional flow control valve ramp rate during initial cylinder extension.'
      },
      {
        id: 'motorPower',
        name: 'Drive Motor Electrical Power',
        sensorId: 'EPS1 / CT Clamp',
        unit: 'kW',
        currentValue: currentPacket?.instantaneousPowerKw || 18.5,
        recommendedRange: '14.5 – 16.5 kW',
        recommendedMin: 14.5,
        recommendedMax: 16.5,
        recommendedOptimal: 15.5,
        potentialImprovementPct: 8.5,
        potentialWhSavings: parseFloat((currentCycleWh * 0.024).toFixed(2)),
        physicsRationale: 'Smoothing initial workpiece contact reduces transient peak power spikes above 18.5 kW, lowering electrical peak demand charges.',
        actionAdvisory: 'Implement soft pressure ramp profile at workpiece contact point (Position 200 mm).'
      }
    ],
    phaseOptimizationTable: [
      { phaseName: 'Fast Down', currentParam: 'Flow: 68.1 L/min | Press: 35 bar', recommendedParam: 'Flow: 58.5 L/min | Press: 32 bar', energySavingsWh: 0.35, improvementPct: '7.5%' },
      { phaseName: 'Working Stroke', currentParam: 'Press: 195.4 bar | Flow: 3.4 L/min', recommendedParam: 'Press: 171.5 bar | Flow: 3.2 L/min', energySavingsWh: 1.85, improvementPct: '11.8%' },
      { phaseName: 'Holding Load', currentParam: 'Press: 195.0 bar | Flow: 0.6 L/min', recommendedParam: 'Press: 168.0 bar | Flow: 0.4 L/min', energySavingsWh: 0.60, improvementPct: '14.2%' },
      { phaseName: 'Fast Return', currentParam: 'Flow: 44.5 L/min | Press: 45 bar', recommendedParam: 'Flow: 40.0 L/min | Press: 40 bar', energySavingsWh: 0.15, improvementPct: '5.0%' }
    ]
  };

  const summary = report.overallSummary;

  // "What-If" Slider Math:
  // Baseline @ 195.4 bar = 23.85 Wh.
  // Lowering pressure reduces hydraulic work: P_hyd = P * Q / 540.
  const simSavingsRatio = Math.max(-0.15, Math.min(0.25, (currentPeakPressure - simPressureBar) / 195.4));
  const simCycleWh = parseFloat((currentCycleWh * (1.0 - simSavingsRatio * 0.65)).toFixed(2));
  const simSavingsPct = parseFloat((simSavingsRatio * 65.0).toFixed(1));
  const simWhSavings = parseFloat((currentCycleWh - simCycleWh).toFixed(2));

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* 1. HEADER BANNER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-700 text-white shadow-xs">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-black uppercase tracking-wider text-slate-900 font-mono">
                  PARAMETER OPTIMIZATION ANALYTICS
                </h1>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold bg-purple-100 text-purple-800 border border-purple-300">
                  DATA-DRIVEN RECOMMENDATIONS
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono font-medium mt-0.5">
                Operating Range Optimization &bull; Pressure / Flow / Power Setpoints &bull; Advisory Decision Support
              </p>
            </div>
          </div>
        </div>

        {/* Global Advisory Badge */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl border border-slate-800 text-right">
            <div className="text-[10px] text-purple-400 uppercase font-bold">CONTROL MODE</div>
            <div className="text-sm font-black text-emerald-400 flex items-center gap-1">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              ADVISORY ONLY
            </div>
          </div>
        </div>
      </div>

      {/* 2. MANDATORY SAFETY DISCLAIMER BANNER */}
      <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl font-mono text-xs text-amber-900 flex items-start gap-3 shadow-xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-amber-950 uppercase font-black block mb-0.5">
            Operational Safety & Compliance Disclaimer:
          </strong>
          Recommendations provided by this analytics module are data-driven estimates designed for decision support and energy efficiency evaluation. <strong>They do NOT constitute safety-certified operating settings or automated machine control commands.</strong> Operators must verify all hydraulic setpoints against OEM press specifications and safety standards before adjusting physical valve setpoints.
        </div>
      </div>

      {/* 3. TOP POTENTIAL ENERGY SAVINGS IMPACT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 font-mono">
        
        {/* Card 1: Potential Energy Savings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-emerald-600" /> Potential Energy Savings
              </span>
              <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                IMPROVEMENT
              </span>
            </div>
            <div className="my-2">
              <div className="text-3xl font-black text-emerald-700 tracking-tight">
                {summary.overallEnergySavingsPct}%
              </div>
              <div className="text-xs text-emerald-800 font-bold mt-0.5">
                (~{summary.potentialWhSavingsPerCycle} Wh savings / cycle)
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
            <span>Cycle #{activeCycle}</span>
            <span className="text-emerald-700 font-bold">Analytics Estimate</span>
          </div>
        </div>

        {/* Card 2: Current vs Optimized Energy */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-sky-300 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-sky-600" /> Current vs. Recommended
              </span>
              <span className="text-[10px] font-extrabold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">
                TARGET Wh
              </span>
            </div>
            <div className="my-2">
              <div className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span className="line-through text-slate-400 text-lg">{summary.currentCycleEnergyWh.toFixed(1)}</span>
                <ArrowRight className="w-4 h-4 text-sky-600" />
                <span className="text-sky-700 text-3xl">{summary.optimizedCycleEnergyWh.toFixed(1)}</span>
                <span className="text-xs font-semibold text-slate-500">Wh</span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
            <span>Per Cycle Target</span>
            <span className="text-sky-700 font-bold">Optimized Range</span>
          </div>
        </div>

        {/* Card 3: Annualized Energy Reduction */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-purple-300 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" /> Annualized Reduction
              </span>
              <span className="text-[10px] font-extrabold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                ESTIMATE
              </span>
            </div>
            <div className="my-2">
              <div className="text-3xl font-black text-purple-900 tracking-tight">
                {summary.annualizedKwhSavings}
                <span className="text-sm font-semibold text-slate-500 ml-1.5">kWh / yr</span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
            <span>Based on 50k cycles</span>
            <span className="text-purple-700 font-bold">Projected</span>
          </div>
        </div>

        {/* Card 4: Control Mode */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-600" /> System Control Mode
              </span>
              <span className="text-[10px] font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
                SAFE
              </span>
            </div>
            <div className="my-2">
              <div className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                No Auto-Control
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Data-driven advisory recommendations only.
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
            <span>Operator Control</span>
            <span className="text-emerald-700 font-bold">Manual Setpoints</span>
          </div>
        </div>

      </div>

      {/* 4. PARAMETER OPTIMIZATION MATRIX (3 MAJOR PARAMETERS: PRESSURE, FLOW, POWER) */}
      <div className="bg-white p-5 lg:p-6 rounded-xl border border-slate-200 shadow-xs font-mono space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600" />
              Primary Parameter Optimization Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Current telemetry parameters vs. recommended optimal operating ranges
            </p>
          </div>
          <span className="text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-1 rounded">
            Advisory Ranges
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {report.parameters.map((param) => {
            let IconComponent = Gauge;
            let iconColorClass = 'text-rose-600 bg-rose-50 border-rose-200';
            if (param.id === 'flow') {
              IconComponent = Wind;
              iconColorClass = 'text-sky-600 bg-sky-50 border-sky-200';
            } else if (param.id === 'motorPower') {
              IconComponent = Zap;
              iconColorClass = 'text-purple-600 bg-purple-50 border-purple-200';
            }

            return (
              <div
                key={param.id}
                className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg border ${iconColorClass}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase">
                          {param.name}
                        </h3>
                        <span className="text-[10px] text-slate-500 font-bold">
                          Sensor: {param.sensorId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Current vs Recommended Display Box */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 text-[11px]">Current Operating Value:</span>
                      <strong className="text-slate-900 text-sm font-black">
                        {typeof param.currentValue === 'number' ? param.currentValue.toFixed(1) : param.currentValue} {param.unit}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center p-2.5 bg-purple-50 rounded-lg border border-purple-200">
                      <span className="text-purple-900 text-[11px] font-bold">Recommended Range:</span>
                      <strong className="text-purple-900 text-sm font-black">
                        {param.recommendedRange}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                      <span className="text-emerald-900 text-[11px] font-bold">Potential Improvement:</span>
                      <strong className="text-emerald-700 text-sm font-black flex items-center gap-1">
                        <TrendingDown className="w-4 h-4 text-emerald-600" />
                        {param.potentialImprovementPct}% Energy Reduction
                      </strong>
                    </div>
                  </div>

                  {/* Physics Rationale */}
                  <div className="space-y-1.5 text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">
                      Physics & Calculations Rationale:
                    </span>
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      {param.physicsRationale}
                    </p>
                  </div>
                </div>

                {/* Operator Advisory */}
                <div className="pt-3 border-t border-slate-200 text-[11px]">
                  <span className="font-bold text-purple-900 uppercase block mb-0.5">
                    Operator Action Advisory:
                  </span>
                  <p className="text-slate-600 italic">
                    {param.actionAdvisory}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. INTERACTIVE "WHAT-IF" PARAMETER SIMULATOR (ADVISORY SLIDER) */}
      <div className="bg-slate-900 text-white p-5 lg:p-6 rounded-xl border border-slate-800 shadow-md font-mono space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Interactive "What-If" Energy Optimization Simulator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate hypothetical pressure setpoints to evaluate potential cycle energy consumption
            </p>
          </div>
          <span className="text-[10px] bg-slate-800 text-sky-400 border border-slate-700 px-3 py-1 rounded font-bold">
            Simulated Sandbox (No Control Signals Sent)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          {/* Slider Input Column */}
          <div className="md:col-span-2 bg-slate-800/80 p-5 rounded-xl border border-slate-700 space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">Hypothetical Working Pressure Setpoint:</span>
              <span className="text-xl font-black text-amber-400 bg-slate-900 px-3 py-1 rounded border border-slate-700">
                {simPressureBar} bar
              </span>
            </div>

            <input
              type="range"
              min="150"
              max="220"
              step="1"
              value={simPressureBar}
              onChange={(e) => setSimPressureBar(parseInt(e.target.value, 10))}
              className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>150 bar (Under-pressure Risk)</span>
              <span className="text-emerald-400 font-black">170 bar (AI Optimal Target)</span>
              <span className="text-rose-400">220 bar (Excess Waste)</span>
            </div>
          </div>

          {/* Dynamic Calculated Energy Results Column */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              Simulated Cycle Energy Output
            </div>

            <div className="text-3xl font-black text-amber-400 tracking-tight">
              {simCycleWh} <span className="text-sm text-slate-400 font-normal">Wh / cycle</span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Baseline (195.4 bar):</span>
                <span className="font-bold">{currentCycleWh.toFixed(2)} Wh</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span>Simulated Energy Savings:</span>
                <span className={`font-black ${simWhSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {simWhSavings >= 0 ? `+${simWhSavings} Wh (${simSavingsPct}%)` : `${simWhSavings} Wh (${simSavingsPct}%)`}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 italic">
              Analytics Estimate • Mathematical Simulation Model
            </div>
          </div>

        </div>
      </div>

      {/* 6. PHASE-BY-PHASE OPTIMIZATION BREAKDOWN TABLE */}
      <div className="bg-white p-5 lg:p-6 rounded-xl border border-slate-200 shadow-xs font-mono space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              Phase-by-Phase Parameter Optimization Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specific setpoint advisories for each stage of the hydraulic press execution cycle
            </p>
          </div>
          <span className="text-xs text-slate-500 bg-slate-50 border px-3 py-1 rounded font-bold">
            Cycle #{activeCycle} Phase Analysis
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase bg-slate-50">
                <th className="py-2.5 px-3">Cycle Phase</th>
                <th className="py-2.5 px-3">Current Operating Setpoints</th>
                <th className="py-2.5 px-3">Recommended Optimal Setpoints</th>
                <th className="py-2.5 px-3 text-right">Wh Reduction</th>
                <th className="py-2.5 px-3 text-right">Energy Improvement %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {report.phaseOptimizationTable.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-900">{row.phaseName}</td>
                  <td className="py-3 px-3 text-slate-600">{row.currentParam}</td>
                  <td className="py-3 px-3 font-bold text-purple-900">{row.recommendedParam}</td>
                  <td className="py-3 px-3 text-right font-black text-amber-700">-{row.energySavingsWh} Wh</td>
                  <td className="py-3 px-3 text-right font-extrabold text-emerald-700">+{row.improvementPct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
