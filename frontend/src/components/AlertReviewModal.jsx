import React from 'react';
import { ShieldAlert, X, Clock, Gauge, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';

export function AlertReviewModal({
  isOpen,
  alertData,
  onClose,
  onReset
}) {
  if (!isOpen || !alertData) return null;

  const {
    measuredPressure,
    thresholdLimit = 235.0,
    cycleNumber = 1,
    timestamp = new Date().toLocaleTimeString(),
    sensor = 'PS1',
    message
  } = alertData;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-lg w-full overflow-hidden text-slate-900 font-sans">
        
        {/* Header */}
        <div className="bg-amber-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6" />
            <h3 className="text-base font-bold uppercase tracking-wider font-mono">
              High Pressure Event Review
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition cursor-pointer"
            title="Close review"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed font-medium">
            <strong className="block font-bold text-amber-950 mb-1">
              Simulation Stopped — High Pressure Excursion Review
            </strong>
            {message || "Pressure exceeded the permitted threshold. Simulation was safely halted by operator."}
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-center">
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl">
              <span className="text-[10px] text-rose-700 font-bold uppercase block mb-1">
                Recorded Peak Pressure
              </span>
              <span className="text-2xl font-black text-rose-800">
                {typeof measuredPressure === 'number' ? measuredPressure.toFixed(1) : measuredPressure} bar
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Sensor: {sensor}</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                Configured Limit
              </span>
              <span className="text-2xl font-black text-slate-800">
                {typeof thresholdLimit === 'number' ? thresholdLimit.toFixed(1) : thresholdLimit} bar
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Permitted Limit</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono space-y-1.5 text-slate-600">
            <div className="flex justify-between">
              <span>Operating Cycle:</span>
              <strong className="text-slate-900">Cycle #{cycleNumber}</strong>
            </div>
            <div className="flex justify-between">
              <span>Recorded Timestamp:</span>
              <strong className="text-slate-900">{timestamp}</strong>
            </div>
            <div className="flex justify-between">
              <span>Simulation Status:</span>
              <span className="text-rose-700 font-bold">STOPPED (Safe State)</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs font-mono transition cursor-pointer"
            >
              Close Review
            </button>
            <button
              type="button"
              onClick={() => {
                onReset();
                onClose();
              }}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs font-mono transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Simulation
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
