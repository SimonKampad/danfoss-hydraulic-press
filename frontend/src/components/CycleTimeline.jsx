import React from 'react';
import { CheckCircle2, PlayCircle, Clock, FastForward, Wrench, PauseCircle, ArrowUpCircle } from 'lucide-react';

const TIMELINE_PHASES = [
  {
    key: 'FAST_DOWN',
    name: 'FAST DOWN',
    duration: '1.0 s',
    speed: '200 mm/s',
    stroke: '+200 mm',
    icon: FastForward,
    color: 'from-sky-500 to-blue-600',
    activeBg: 'bg-sky-50 border-sky-400 text-sky-900 shadow-sm'
  },
  {
    key: 'WORKING',
    name: 'WORKING CYCLE',
    duration: '5.0 s',
    speed: '10 mm/s',
    stroke: '+50 mm',
    icon: Wrench,
    color: 'from-rose-500 to-red-600',
    activeBg: 'bg-rose-50 border-rose-400 text-rose-900 shadow-sm'
  },
  {
    key: 'HOLDING',
    name: 'HOLDING',
    duration: '2.0 s',
    speed: '0 mm/s',
    stroke: '0 mm (9 Ton)',
    icon: PauseCircle,
    color: 'from-amber-500 to-orange-600',
    activeBg: 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm'
  },
  {
    key: 'FAST_UP',
    name: 'FAST UP',
    duration: '1.25 s',
    speed: '200 mm/s',
    stroke: '-250 mm',
    icon: ArrowUpCircle,
    color: 'from-emerald-500 to-teal-600',
    activeBg: 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm'
  }
];

export function CycleTimeline({ currentPhase, phaseProgress = 0 }) {
  const currentIdx = TIMELINE_PHASES.findIndex(p => p.key === currentPhase);

  return (
    <div className="industrial-card p-4 lg:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          Hydraulic Cycle Execution Timeline
        </h2>
        <span className="text-xs font-mono text-slate-500">
          Nominal Cycle Time: <strong className="text-slate-900">9.25 s</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {TIMELINE_PHASES.map((phaseItem, index) => {
          const isActive = phaseItem.key === currentPhase;
          const isCompleted = index < currentIdx;
          const Icon = phaseItem.icon;

          return (
            <div
              key={phaseItem.key}
              className={`p-4 rounded-xl border transition-all duration-200 relative ${
                isActive
                  ? `${phaseItem.activeBg} border-2 ring-1 ring-blue-400/20 scale-[1.02]`
                  : (isCompleted
                      ? 'bg-slate-50 border-slate-200 text-slate-800'
                      : 'bg-slate-50/60 border-slate-200 text-slate-400')
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-mono font-bold text-xs">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : isActive ? (
                    <PlayCircle className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                  )}
                  <span className={isActive ? 'text-slate-900' : 'text-slate-700'}>{phaseItem.name}</span>
                </div>
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>

              {/* Specs */}
              <div className="space-y-1 text-xs font-mono mb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-semibold text-slate-800">{phaseItem.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Speed:</span>
                  <span className="font-semibold text-slate-800">{phaseItem.speed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stroke:</span>
                  <span className="font-semibold text-slate-800">{phaseItem.stroke}</span>
                </div>
              </div>

              {/* Progress bar */}
              {isActive ? (
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-blue-700 font-bold mb-1">
                    <span>Phase Progress</span>
                    <span>{phaseProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${phaseItem.color} transition-all duration-150`}
                      style={{ width: `${phaseProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    style={{ width: isCompleted ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

