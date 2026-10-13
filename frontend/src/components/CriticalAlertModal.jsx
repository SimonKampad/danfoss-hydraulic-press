import React from 'react';
import { Octagon, AlertTriangle, ShieldAlert, Clock, Gauge, Loader2 } from 'lucide-react';

export function CriticalAlertModal({
  isOpen,
  alertData,
  isStopping,
  stopError,
  onStop
}) {
  if (!isOpen || !alertData) return null;

  const {
    measuredPressure,
    thresholdLimit = 235.0,
    cycleNumber = 1,
    timestamp = new Date().toLocaleTimeString(),
    sensor = 'PS1'
  } = alertData;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="critical-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl border-4 border-rose-600 shadow-2xl max-w-xl w-full overflow-hidden text-slate-900 font-sans">
        
        {/* Top Warning Banner Bar */}
        <div className="bg-rose-600 text-white px-6 py-4 flex items-center gap-3 shadow-inner">
          <div className="p-2 bg-white/20 rounded-xl text-white shrink-0 animate-pulse">
            <Octagon className="w-8 h-8 fill-white/20 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-mono font-black uppercase tracking-widest text-rose-200">
              CRITICAL SAFETY ALARM
            </div>
            <h2 id="critical-alert-title" className="text-lg sm:text-xl font-black uppercase tracking-tight leading-tight text-white">
              HIGH PRESSURE DETECTED — STOP THE MACHINE SIMULATION
            </h2>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* Simple Operator Explanation */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm text-rose-950 font-medium leading-relaxed">
              <strong className="font-bold text-rose-900 block mb-0.5">
                Pressure is above the permitted limit. Stop the simulation and inspect the system.
              </strong>
              The hydraulic line pressure has exceeded the safety boundary. Telemetry replay must be halted immediately to prevent equipment simulation damage and evaluate relief valve performance.
            </div>
          </div>

          {/* Key Measurement Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 font-mono text-center">
            
            {/* Current Pressure */}
            <div className="p-3.5 bg-rose-100/70 border-2 border-rose-400 rounded-xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 block mb-1">
                Measured Oil Pressure
              </span>
              <div className="text-3xl sm:text-4xl font-black text-rose-700 tracking-tight">
                {typeof measuredPressure === 'number' ? measuredPressure.toFixed(1) : measuredPressure}
                <span className="text-sm font-bold text-rose-600 ml-1.5">bar</span>
              </div>
              <span className="text-[10px] text-rose-700 font-semibold block mt-1">
                Sensor: {sensor}
              </span>
            </div>

            {/* Configured Pressure Limit */}
            <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                Permitted Pressure Limit
              </span>
              <div className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                {typeof thresholdLimit === 'number' ? thresholdLimit.toFixed(1) : thresholdLimit}
                <span className="text-sm font-bold text-slate-500 ml-1.5">bar</span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                Max Allowed Limit
              </span>
            </div>

          </div>

          {/* Cycle & Timestamp Info */}
          <div className="flex items-center justify-between text-xs font-mono bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600">
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
              <Gauge className="w-4 h-4 text-blue-600" />
              Cycle #{cycleNumber}
            </span>
            <span className="flex items-center gap-1.5 text-slate-500 font-semibold">
              <Clock className="w-4 h-4 text-slate-400" />
              Recorded: {timestamp}
            </span>
          </div>

          {/* Error Message if Stop Request Failed */}
          {stopError && (
            <div className="p-3 bg-red-100 border-2 border-red-400 rounded-xl text-xs font-mono text-red-900 flex items-start gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Stop request failed to confirm:</strong>
                <span>{stopError}. Please press STOP SIMULATION again.</span>
              </div>
            </div>
          )}

          {/* Single Large Red STOP Button */}
          <div>
            <button
              type="button"
              onClick={onStop}
              disabled={isStopping}
              className={`w-full py-4 px-6 rounded-xl font-black text-base sm:text-lg uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-3 cursor-pointer ${
                isStopping
                  ? 'bg-rose-400 text-white cursor-wait opacity-90'
                  : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-600/30 hover:scale-[1.01] active:scale-[0.99] ring-2 ring-rose-400'
              }`}
            >
              {isStopping ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>STOPPING SIMULATION...</span>
                </>
              ) : (
                <>
                  <Octagon className="w-6 h-6 fill-white" />
                  <span>STOP SIMULATION</span>
                </>
              )}
            </button>
          </div>

          {/* Software vs Physical Safety Limitation Disclaimer */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 leading-normal flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Simulation Safety Boundary:</strong> This action halts the software simulation engine and telemetry replay. It does not replace physical machine emergency stop circuits or mechanical relief valves.
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
