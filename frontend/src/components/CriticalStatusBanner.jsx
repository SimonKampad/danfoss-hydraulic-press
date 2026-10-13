import React from 'react';
import { ShieldAlert, RotateCcw, Eye, Octagon } from 'lucide-react';

export function CriticalStatusBanner({
  alertData,
  onReview,
  onReset
}) {
  if (!alertData) return null;

  const {
    measuredPressure,
    thresholdLimit = 235.0,
    cycleNumber = 1,
    timestamp = new Date().toLocaleTimeString()
  } = alertData;

  return (
    <aside
      aria-label="Critical safety status"
      className="bg-amber-500 text-white p-4 rounded-xl shadow-md border-2 border-amber-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono animate-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-start md:items-center gap-3.5">
        <div className="p-2.5 bg-white/20 rounded-xl text-white shrink-0 mt-0.5 md:mt-0">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <div className="text-sm md:text-base font-black tracking-wide flex items-center gap-2">
            <span>SIMULATION STOPPED DUE TO HIGH PRESSURE</span>
            <span className="text-[10px] bg-white/25 text-white px-2 py-0.5 rounded uppercase font-bold">
              SAFE STOP CONFIRMED
            </span>
          </div>
          <p className="text-xs text-amber-100 font-sans mt-0.5 leading-relaxed">
            Oil pressure reached <strong className="font-mono text-white">{typeof measuredPressure === 'number' ? measuredPressure.toFixed(1) : measuredPressure} bar</strong> (Limit: {thresholdLimit} bar) at Cycle #{cycleNumber} [{timestamp}]. Telemetry stream is halted.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
        <button
          type="button"
          onClick={onReview}
          className="flex-1 sm:flex-initial bg-white/20 hover:bg-white/30 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/30"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Review Alert</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="flex-1 sm:flex-initial bg-white text-amber-900 hover:bg-amber-50 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-800" />
          <span>Reset Simulation</span>
        </button>
      </div>
    </aside>
  );
}
