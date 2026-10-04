import React, { useState } from 'react';
import { Sliders, Play, Pause, RotateCcw, AlertTriangle, Database, Activity, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

export function SimulationControls({ systemStatus, controls }) {
  const isRunning = systemStatus.status === 'RUNNING';
  const currentSpeed = systemStatus.speedMultiplier || 1.0;
  const activeFault = systemStatus.activeFault;
  const currentMode = systemStatus.mode || systemStatus.dataMode || 'SIMULATION';
  const isDatasetMode = currentMode === 'DATASET_REPLAY';
  const activeCycle = systemStatus.cycleNumber || 1;

  const [cycleInput, setCycleInput] = useState(activeCycle);

  const handleCycleSelect = (num) => {
    const parsed = Math.max(1, Math.min(2205, parseInt(num, 10) || 1));
    setCycleInput(parsed);
    if (controls.selectDatasetCycle) {
      controls.selectDatasetCycle(parsed);
    }
  };

  return (
    <div className="industrial-card p-4 lg:p-6 mb-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono">
            System Execution & Data Stream Control Console
          </h2>
        </div>

        {/* Mode Switcher Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => controls.setSystemMode('SIMULATION')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 border cursor-pointer ${
              !isDatasetMode
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> SYNTHETIC SIMULATION
          </button>

          <button
            onClick={() => controls.setSystemMode('DATASET_REPLAY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 border cursor-pointer ${
              isDatasetMode
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> REAL DATASET REPLAY
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Panel 1: Execution & Cycle Selector */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="text-xs font-mono uppercase text-slate-500 font-bold mb-2 flex justify-between items-center">
            <span>Execution Controls</span>
            <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-bold">
              {isDatasetMode ? 'DATASET REPLAY' : 'SYNTHETIC PHYSICS'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                onClick={controls.pauseSimulation}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Pause className="w-4 h-4 fill-current" /> PAUSE
              </button>
            ) : (
              <button
                onClick={controls.startSimulation}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Play className="w-4 h-4 fill-current" /> START
              </button>
            )}

            <button
              onClick={controls.resetSimulation}
              className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs py-2 px-3 rounded-lg border border-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" /> RESET
            </button>
          </div>

          {/* Dataset Cycle Selector Controls */}
          {isDatasetMode && (
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="text-[11px] font-mono text-slate-600 font-bold flex justify-between items-center">
                <span>Dataset Cycle Selector (1–2205):</span>
                <span className="text-indigo-700 font-bold">Cycle #{activeCycle}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleCycleSelect(Math.max(1, activeCycle - 1))}
                  disabled={activeCycle <= 1}
                  className="p-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded disabled:opacity-40 transition cursor-pointer"
                  title="Previous Cycle"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-700" />
                </button>

                <input
                  type="number"
                  min="1"
                  max="2205"
                  value={cycleInput}
                  onChange={(e) => setCycleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCycleSelect(cycleInput)}
                  className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-center text-slate-800"
                />

                <button
                  onClick={() => handleCycleSelect(cycleInput)}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold rounded transition cursor-pointer"
                >
                  LOAD
                </button>

                <button
                  onClick={() => handleCycleSelect(Math.min(2205, activeCycle + 1))}
                  disabled={activeCycle >= 2205}
                  className="p-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded disabled:opacity-40 transition cursor-pointer"
                  title="Next Cycle"
                >
                  <ChevronRight className="w-4 h-4 text-slate-700" />
                </button>

                <button
                  onClick={() => handleCycleSelect(Math.floor(Math.random() * 2205) + 1)}
                  className="p-1.5 bg-slate-100 border border-slate-300 hover:bg-slate-200 rounded transition cursor-pointer"
                  title="Random Cycle"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Panel 2: Cycle Time Multiplier */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="text-xs font-mono uppercase text-slate-500 font-bold mb-2 flex justify-between">
            <span>Cycle Time Multiplier</span>
            <span className="text-blue-600 font-bold">{currentSpeed}x</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1.0, 2.0, 5.0].map((speed) => (
              <button
                key={speed}
                onClick={() => controls.setSpeedMultiplier(speed)}
                className={`py-1.5 px-2 rounded font-mono text-xs font-bold transition border cursor-pointer ${
                  currentSpeed === speed
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-500 leading-tight">
            Playback speed scales visual telemetry rendering without altering raw sample values.
          </div>
        </div>

        {/* Panel 3: Controlled Diagnostic Test Mode */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="text-xs font-mono uppercase text-slate-500 font-bold mb-1 flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Controlled Diagnostic Test Mode
            </span>
            <button
              onClick={() => controls.runDiagnosticTest ? controls.runDiagnosticTest('RESET', 'RECOVERY', 0) : controls.clearFault()}
              className="text-[10px] text-emerald-700 font-bold underline hover:text-emerald-800 cursor-pointer"
            >
              Reset Normal
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => controls.runDiagnosticTest && controls.runDiagnosticTest('PRESSURE', 'WARNING', 215.0)}
              className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-mono font-bold transition cursor-pointer text-center"
              title="Test High Pressure (215 bar)"
            >
              Test Press.
            </button>
            <button
              onClick={() => controls.runDiagnosticTest && controls.runDiagnosticTest('TEMPERATURE', 'THERMAL_DRIFT', 58.0)}
              className="p-1.5 rounded bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-mono font-bold transition cursor-pointer text-center"
              title="Test Thermal Drift (58°C)"
            >
              Test Temp.
            </button>
            <button
              onClick={() => controls.runDiagnosticTest && controls.runDiagnosticTest('FLOW', 'LOW_FLOW', 2.0)}
              className="p-1.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-mono font-bold transition cursor-pointer text-center"
              title="Test Low Flow (2 L/min)"
            >
              Test Flow
            </button>
            <button
              onClick={() => controls.runDiagnosticTest && controls.runDiagnosticTest('CYLINDER_SPEED', 'SLOW', 20.0)}
              className="p-1.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[10px] font-mono font-bold transition cursor-pointer text-center"
              title="Test Slow Cylinder (20 mm/s)"
            >
              Test Speed
            </button>
            <button
              onClick={() => controls.runDiagnosticTest && controls.runDiagnosticTest('MOTOR_CURRENT', 'WARNING', 37.0)}
              className="p-1.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-mono font-bold transition cursor-pointer text-center"
              title="Test Motor Current (37 A)"
            >
              Test Current
            </button>
            <button
              onClick={() => controls.runDiagnosticTest && controls.runDiagnosticTest('RESET', 'RECOVERY', 0)}
              className="p-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold transition cursor-pointer text-center"
              title="Recovery to Normal Operation"
            >
              Recovery
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}


