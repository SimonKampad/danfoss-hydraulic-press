import React from 'react';
import { Activity, Gauge, Navigation, Layers, AlertTriangle, Clock } from 'lucide-react';

export function StatusBanner({ currentPacket, systemStatus }) {
  const phase = currentPacket?.phase || 'FAST_DOWN';
  const phaseName = currentPacket?.phaseName || 'Fast Down';
  const cycleNumber = currentPacket?.cycleNumber || 1;
  const cycleProgressPct = currentPacket?.cycleProgressPct || 0;
  const positionMm = currentPacket?.positionMm ?? 0.0;
  const activeFault = currentPacket?.fault || systemStatus.activeFault;

  const isFault = !!activeFault;
  const statusLabel = isFault ? 'FAULT' : (systemStatus.status === 'RUNNING' ? 'RUNNING' : 'IDLE');
  const statusColor = isFault ? 'bg-rose-50 text-rose-700 border-rose-200' : (systemStatus.status === 'RUNNING' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200');

  const phaseColorMap = {
    FAST_DOWN: 'bg-sky-50 text-sky-700 border-sky-200',
    WORKING: 'bg-rose-50 text-rose-700 border-rose-200',
    HOLDING: 'bg-amber-50 text-amber-700 border-amber-200',
    FAST_UP: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  return (
    <div className="industrial-card p-4 lg:p-6 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
        
        {/* 1. System Status */}
        <div className="col-span-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1.5 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            System Status
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border font-mono font-bold text-xs ${statusColor}`}>
            <span className={`w-2 h-2 rounded-full ${isFault ? 'bg-rose-600 animate-ping' : (systemStatus.status === 'RUNNING' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')}`} />
            {statusLabel}
          </div>
          {activeFault && (
            <div className="text-[10px] text-rose-600 font-mono mt-1 font-bold truncate flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {activeFault}
            </div>
          )}
        </div>

        {/* 2. Current Cycle Number */}
        <div className="col-span-1 border-l border-slate-100 pl-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            Current Cycle
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            #{cycleNumber}
          </div>
        </div>

        {/* 3. Current Phase */}
        <div className="col-span-1 border-l border-slate-100 pl-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Current Phase
          </div>
          <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold font-mono border uppercase ${phaseColorMap[phase] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
            {phaseName}
          </div>
        </div>

        {/* 4. Cycle Progress */}
        <div className="col-span-1 border-l border-slate-100 pl-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-500 font-medium mb-1.5">
            <span>Cycle Progress</span>
            <span className="font-mono text-blue-600 font-bold">{cycleProgressPct}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-150 ease-out" 
              style={{ width: `${cycleProgressPct}%` }}
            />
          </div>
        </div>

        {/* 5. Cylinder Position */}
        <div className="col-span-2 md:col-span-1 border-l border-slate-100 pl-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-1.5 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            Cylinder Position
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono tracking-tight">
            {positionMm.toFixed(1)} <span className="text-xs text-slate-500 font-normal">mm</span>
          </div>
        </div>

      </div>
    </div>
  );
}

