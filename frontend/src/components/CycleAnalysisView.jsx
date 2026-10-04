import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot
} from 'recharts';
import {
  Clock,
  FastForward,
  Wrench,
  PauseCircle,
  ArrowUpCircle,
  Activity,
  Gauge,
  Wind,
  Database,
  Layers,
  Info,
  Sliders,
  CheckCircle2,
  PlayCircle
} from 'lucide-react';

// Dense profile generator for cycle N: returns dense points (t=0 to T_total) + timings
function generateDenseCycleProfile(cycleNum) {
  const c = parseInt(cycleNum, 10) || 1;

  // Realistic per-cycle timing variations around assignment base profile
  const tFastDown = parseFloat((1.00 + Math.sin(c * 1.7) * 0.04).toFixed(2));
  const tWorking = parseFloat((5.00 + Math.cos(c * 0.9) * 0.15).toFixed(2));
  const tHolding = parseFloat((2.00 + Math.sin(c * 0.5) * 0.08).toFixed(2));
  const tFastUp = parseFloat((1.25 + Math.cos(c * 1.3) * 0.05).toFixed(2));

  const t1 = tFastDown;
  const t2 = parseFloat((t1 + tWorking).toFixed(2));
  const t3 = parseFloat((t2 + tHolding).toFixed(2));
  const t4 = parseFloat((t3 + tFastUp).toFixed(2)); // Total cycle time

  // Key stroke height positions from press bed (250 mm TOP -> ~50 mm workpiece contact -> ~0 mm BDC -> 250 mm TOP)
  const topPos = 250.0;
  const fastDownPos = parseFloat((50.0 + Math.sin(c * 2.1) * 2.5).toFixed(1)); // ~50 mm
  const bottomPos = parseFloat((0.0 + Math.abs(Math.cos(c * 1.1)) * 1.5).toFixed(1)); // ~0 mm

  // Helper to calculate theoretical position & speed at any time t
  const getPointAtTime = (t) => {
    if (t <= 0) return { position: topPos, speed: 200.0, phase: 'FAST_DOWN', phaseName: 'FAST DOWN' };
    
    if (t <= t1) {
      const ratio = t / t1;
      const pos = topPos - ratio * (topPos - fastDownPos);
      return { position: parseFloat(pos.toFixed(1)), speed: 200.0, phase: 'FAST_DOWN', phaseName: 'FAST DOWN' };
    } else if (t <= t2) {
      const ratio = (t - t1) / (t2 - t1);
      const pos = fastDownPos - ratio * (fastDownPos - bottomPos);
      return { position: parseFloat(pos.toFixed(1)), speed: 10.0, phase: 'WORKING', phaseName: 'WORKING' };
    } else if (t <= t3) {
      return { position: bottomPos, speed: 0.0, phase: 'HOLDING', phaseName: 'HOLDING' };
    } else {
      const clampedT = Math.min(t, t4);
      const ratio = (clampedT - t3) / (t4 - t3);
      const pos = bottomPos + ratio * (topPos - bottomPos);
      return { position: parseFloat(pos.toFixed(1)), speed: 200.0, phase: 'FAST_UP', phaseName: 'FAST UP' };
    }
  };

  // Generate ~100 dense sample points across total cycle time for fluid progressive drawing
  const numSamples = 100;
  const denseProfile = [];
  for (let i = 0; i <= numSamples; i++) {
    const t = parseFloat(((i / numSamples) * t4).toFixed(2));
    const pt = getPointAtTime(t);
    denseProfile.push({
      time: t,
      position: pt.position,
      speed: pt.speed,
      phase: pt.phase,
      phaseName: pt.phaseName
    });
  }

  return {
    cycleNumber: c,
    totalCycleTime: t4,
    phaseDurations: {
      fastDown: tFastDown,
      working: tWorking,
      holding: tHolding,
      fastUp: tFastUp
    },
    phaseTimings: { t1, t2, t3, t4 },
    topPos,
    fastDownPos,
    bottomPos,
    denseProfile,
    getPointAtTime
  };
}

const CycleChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white border border-slate-700 p-3 rounded-lg shadow-xl text-xs font-mono">
        <div className="text-sky-400 font-bold mb-1 border-b border-slate-800 pb-1">
          Time: {label} s &bull; Phase: {data.phaseName || data.phase}
        </div>
        <div className="flex justify-between gap-4 my-1">
          <span className="text-slate-400">Stroke Height:</span>
          <span className="font-bold text-emerald-400">{data.position} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Target Speed:</span>
          <span className="font-bold text-amber-400">{data.speed} mm/s</span>
        </div>
      </div>
    );
  }
  return null;
};

const SensorChartTooltip = ({ active, payload, label, unit, color }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white border border-slate-700 p-3 rounded-lg shadow-xl text-xs font-mono">
        <div className="text-slate-400 font-semibold mb-1 border-b border-slate-800 pb-1 flex justify-between gap-4">
          <span>Timestamp: {label}</span>
          {data.cycle && <span>Cycle #{data.cycle}</span>}
        </div>
        <div className="flex justify-between gap-4 my-1">
          <span className="text-slate-400">Phase:</span>
          <span className="font-bold text-sky-400">{data.phase || 'RUNNING'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Measured Value:</span>
          <span className="font-bold text-sm" style={{ color: color }}>
            {payload[0].value} {unit}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function CycleAnalysisView({
  currentPacket,
  chartHistory,
  systemStatus,
  isDatasetMode,
  activeCycleNum
}) {
  const cycleNumber = activeCycleNum || currentPacket?.cycleNumber || 1;
  const cycleProfile = generateDenseCycleProfile(cycleNumber);
  const { totalCycleTime, phaseDurations, phaseTimings, denseProfile, getPointAtTime } = cycleProfile;

  // Active live phase information
  const activePhaseKey = currentPacket?.phase || 'FAST_DOWN';
  const progressRatio = Math.min(1.0, Math.max(0.0, (currentPacket?.phaseProgressPct ?? 0) / 100.0));

  // Calculate exact current elapsed cycle time T_elapsed (0.00s to totalCycleTime)
  let elapsedTime = 0.0;
  if (activePhaseKey === 'FAST_DOWN') {
    elapsedTime = progressRatio * phaseTimings.t1;
  } else if (activePhaseKey === 'WORKING') {
    elapsedTime = phaseTimings.t1 + progressRatio * phaseDurations.working;
  } else if (activePhaseKey === 'HOLDING') {
    elapsedTime = phaseTimings.t2 + progressRatio * phaseDurations.holding;
  } else if (activePhaseKey === 'FAST_UP') {
    elapsedTime = phaseTimings.t3 + progressRatio * phaseDurations.fastUp;
  }
  elapsedTime = parseFloat(Math.min(totalCycleTime, Math.max(0.0, elapsedTime)).toFixed(2));

  // Calculate overall cycle progress percentage (0% to 100%)
  const cycleProgressPct = Math.min(100, Math.max(0, Math.round((elapsedTime / totalCycleTime) * 100)));
  const isCycleComplete = cycleProgressPct >= 99 || (activePhaseKey === 'FAST_UP' && progressRatio >= 0.98);

  // PROGRESSIVE GRAPH DATA FILTER:
  // Filter denseProfile points so ONLY points with time <= elapsedTime are included!
  // Future trajectory after elapsedTime is NOT rendered ahead of time.
  let visibleProfileData = denseProfile.filter((d) => d.time <= elapsedTime);

  // If at start (elapsedTime === 0), show starting point at t=0
  if (visibleProfileData.length === 0) {
    const pt0 = getPointAtTime(0);
    visibleProfileData = [{ time: 0, position: pt0.position, speed: pt0.speed, phase: pt0.phase, phaseName: 'FAST DOWN' }];
  }

  // Ensure current live tip point is appended for exact smooth line connection
  const ptCurrent = getPointAtTime(elapsedTime);
  const livePositionMm = currentPacket?.positionMm !== undefined ? currentPacket.positionMm : ptCurrent.position;
  const liveSpeedMmS = currentPacket?.speedMmS !== undefined ? currentPacket.speedMmS : ptCurrent.speed;

  if (visibleProfileData.length > 0 && visibleProfileData[visibleProfileData.length - 1].time !== elapsedTime) {
    visibleProfileData = [
      ...visibleProfileData,
      {
        time: elapsedTime,
        position: parseFloat(livePositionMm.toFixed(1)),
        speed: liveSpeedMmS,
        phase: activePhaseKey,
        phaseName: activePhaseKey.replace('_', ' ')
      }
    ];
  }

  // Current Phase Display Details for Information Panel
  let currentPhaseLabel = 'FAST DOWN';
  let targetSpeedDisplay = '200 mm/s';
  let targetStrokeDisplay = '200 mm (Downward Stroke)';
  let activePhaseColorClass = 'bg-sky-600 text-white';

  if (isCycleComplete) {
    currentPhaseLabel = 'CYCLE COMPLETE';
    targetSpeedDisplay = '0 mm/s';
    targetStrokeDisplay = 'Cycle Complete';
    activePhaseColorClass = 'bg-emerald-600 text-white animate-pulse';
  } else if (activePhaseKey === 'WORKING') {
    currentPhaseLabel = 'WORKING';
    targetSpeedDisplay = '10 mm/s';
    targetStrokeDisplay = '50 mm (High Force Pressing)';
    activePhaseColorClass = 'bg-rose-600 text-white';
  } else if (activePhaseKey === 'HOLDING') {
    currentPhaseLabel = 'HOLDING';
    targetSpeedDisplay = '0 mm/s';
    targetStrokeDisplay = '0 mm (9 Ton Load Hold)';
    activePhaseColorClass = 'bg-amber-600 text-white';
  } else if (activePhaseKey === 'FAST_UP') {
    currentPhaseLabel = 'FAST UP';
    targetSpeedDisplay = '200 mm/s';
    targetStrokeDisplay = '250 mm (Return to Home)';
    activePhaseColorClass = 'bg-emerald-600 text-white';
  }

  // Extract recent history for actual sensor data charts
  const getRecentHistory = () => chartHistory.slice(-60);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. TOP LIVE CYCLE MONITOR & PROGRESSIVE GRAPH CONTAINER */}
      <div className="bg-white p-5 lg:p-7 rounded-xl border border-slate-200 shadow-xs space-y-6">
        
        {/* Header & Subtitle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-base lg:text-lg font-black uppercase tracking-wider text-slate-900 font-mono">
                HYDRAULIC PRESS OPERATING CYCLE
              </h2>
              <span className="px-3 py-1 rounded-lg text-xs font-mono font-black bg-blue-600 text-white shadow-xs">
                CURRENT CYCLE: {cycleNumber}
              </span>
              <span className={`px-3 py-1 rounded-lg text-xs font-mono font-black shadow-xs ${activePhaseColorClass}`}>
                CURRENT PHASE: {currentPhaseLabel}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-500 font-semibold mt-1">
              Assignment Cycle Profile / Cycle Simulation &bull; Progressive Live Machine Trace
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono">
            <div className="bg-slate-900 text-white border border-slate-800 px-4 py-2 rounded-xl text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold">CURRENT TIME</div>
              <div className="text-xl font-black text-sky-400">
                {elapsedTime.toFixed(2)} / {totalCycleTime.toFixed(2)} s
              </div>
            </div>
          </div>
        </div>

        {/* REQ #5: CLEAR LIVE CYCLE PROGRESS BAR */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
            <span className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-blue-600 animate-pulse" />
              CYCLE PROGRESS
            </span>
            <span className="text-sm font-black text-blue-700">{cycleProgressPct}%</span>
          </div>

          <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden border border-slate-300">
            <div
              className={`h-full transition-all duration-200 rounded-full ${
                isCycleComplete
                  ? 'bg-emerald-600'
                  : (activePhaseKey === 'WORKING' ? 'bg-rose-600' : (activePhaseKey === 'HOLDING' ? 'bg-amber-500' : 'bg-blue-600'))
              }`}
              style={{ width: `${cycleProgressPct}%` }}
            />
          </div>
        </div>

        {/* REQ #8: PHASE BACKGROUND HEADER REGIONS WITH ACTIVE PHASE HIGHLIGHT */}
        <div className="grid grid-cols-4 gap-2 font-mono text-center">
          <div className={`py-2 px-2 rounded-lg text-xs font-black uppercase transition-all border ${
            !isCycleComplete && activePhaseKey === 'FAST_DOWN'
              ? 'bg-sky-600 text-white border-sky-700 shadow-md ring-2 ring-sky-400/40 scale-[1.02]'
              : 'bg-sky-50 text-sky-900 border-sky-200 opacity-70'
          }`}>
            FAST DOWN ({phaseDurations.fastDown.toFixed(2)}s)
          </div>

          <div className={`py-2 px-2 rounded-lg text-xs font-black uppercase transition-all border ${
            !isCycleComplete && activePhaseKey === 'WORKING'
              ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-400/40 scale-[1.02]'
              : 'bg-rose-50 text-rose-900 border-rose-200 opacity-70'
          }`}>
            WORKING ({phaseDurations.working.toFixed(2)}s)
          </div>

          <div className={`py-2 px-2 rounded-lg text-xs font-black uppercase transition-all border ${
            !isCycleComplete && activePhaseKey === 'HOLDING'
              ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400/40 scale-[1.02]'
              : 'bg-amber-50 text-amber-900 border-amber-200 opacity-70'
          }`}>
            HOLDING ({phaseDurations.holding.toFixed(2)}s)
          </div>

          <div className={`py-2 px-2 rounded-lg text-xs font-black uppercase transition-all border ${
            !isCycleComplete && activePhaseKey === 'FAST_UP'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/40 scale-[1.02]'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200 opacity-70'
          }`}>
            FAST UP ({phaseDurations.fastUp.toFixed(2)}s)
          </div>
        </div>

        {/* REQ #1, #6: LARGE PROGRESSIVE GRAPH (DRAWN LIVE FROM START -> END) */}
        <div className="h-[420px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={visibleProfileData} margin={{ top: 25, right: 25, left: 10, bottom: 25 }}>
              <defs>
                <linearGradient id="liveCycleStrokeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              
              {/* Fixed X-Axis Domain (0 to totalCycleTime) so grid remains stationary */}
              <XAxis
                dataKey="time"
                stroke="#334155"
                tick={{ fontSize: 12, fontWeight: 'bold' }}
                unit="s"
                type="number"
                domain={[0, totalCycleTime]}
                ticks={[0, phaseTimings.t1, phaseTimings.t2, phaseTimings.t3, phaseTimings.t4]}
                label={{ value: 'Time (seconds)', position: 'bottom', offset: 10, fontSize: 13, fontWeight: 'bold', fill: '#1e293b' }}
              />
              
              {/* Fixed Y-Axis Domain (0 to 270 mm) */}
              <YAxis
                stroke="#334155"
                tick={{ fontSize: 12, fontWeight: 'bold' }}
                domain={[0, 270]}
                ticks={[0, 50, 100, 150, 200, 250]}
                unit=" mm"
                label={{ value: 'Stroke / Position (mm)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 13, fontWeight: 'bold', fill: '#1e293b' }}
              />

              <Tooltip content={<CycleChartTooltip />} />

              {/* Shaded Background Phase Regions */}
              <ReferenceArea x1={0} x2={phaseTimings.t1} fill="#0284c7" fillOpacity={!isCycleComplete && activePhaseKey === 'FAST_DOWN' ? 0.18 : 0.06} />
              <ReferenceArea x1={phaseTimings.t1} x2={phaseTimings.t2} fill="#e11d48" fillOpacity={!isCycleComplete && activePhaseKey === 'WORKING' ? 0.18 : 0.06} />
              <ReferenceArea x1={phaseTimings.t2} x2={phaseTimings.t3} fill="#d97706" fillOpacity={!isCycleComplete && activePhaseKey === 'HOLDING' ? 0.18 : 0.06} />
              <ReferenceArea x1={phaseTimings.t3} x2={phaseTimings.t4} fill="#059669" fillOpacity={!isCycleComplete && activePhaseKey === 'FAST_UP' ? 0.18 : 0.06} />

              {/* Phase Boundary Divider Lines */}
              <ReferenceLine x={phaseTimings.t1} stroke="#0284c7" strokeWidth={2} strokeDasharray="4 4" label={{ value: `${phaseTimings.t1.toFixed(2)}s`, fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'bottom' }} />
              <ReferenceLine x={phaseTimings.t2} stroke="#e11d48" strokeWidth={2} strokeDasharray="4 4" label={{ value: `${phaseTimings.t2.toFixed(2)}s`, fill: '#e11d48', fontSize: 11, fontWeight: 'bold', position: 'bottom' }} />
              <ReferenceLine x={phaseTimings.t3} stroke="#d97706" strokeWidth={2} strokeDasharray="4 4" label={{ value: `${phaseTimings.t3.toFixed(2)}s`, fill: '#d97706', fontSize: 11, fontWeight: 'bold', position: 'bottom' }} />
              <ReferenceLine x={phaseTimings.t4} stroke="#059669" strokeWidth={2} strokeDasharray="4 4" label={{ value: `${phaseTimings.t4.toFixed(2)}s`, fill: '#059669', fontSize: 11, fontWeight: 'bold', position: 'bottom' }} />

              {/* Position Reference Levels */}
              <ReferenceLine y={250} stroke="#475569" strokeDasharray="2 2" label={{ value: 'TOP Home (250 mm)', fill: '#475569', fontSize: 10, position: 'right' }} />
              <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="2 2" label={{ value: 'Bottom Dead Center (0 mm)', fill: '#dc2626', fontSize: 10, position: 'right' }} />

              {/* PROGRESSIVELY DRAWN TRAJECTORY LINE */}
              <Area
                type="linear"
                dataKey="position"
                stroke="#1d4ed8"
                strokeWidth={3.5}
                fillOpacity={1}
                fill="url(#liveCycleStrokeGrad)"
                dot={false}
                isAnimationActive={false}
              />

              {/* REQ #7: SMALL LEADING CURRENT POSITION DOT */}
              {elapsedTime > 0 && (
                <ReferenceDot
                  x={elapsedTime}
                  y={parseFloat(livePositionMm.toFixed(1))}
                  r={7}
                  fill="#dc2626"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Live Trace Behavior Notice */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs font-mono text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Live Machine Trace Mode:</strong> Trajectory curve is progressively generated live from <strong>START &rarr; END</strong>. Clears automatically when Cycle #{cycleNumber} completes and transitions to Cycle #{cycleNumber + 1}.
            </span>
          </div>
          <span className="font-bold text-blue-800 bg-white border border-blue-300 px-2.5 py-0.5 rounded text-[11px] shrink-0">
            Progressive Draw
          </span>
        </div>

      </div>

      {/* 2. REQ #9: CURRENT PHASE & CYCLE INFORMATION PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CURRENT PHASE PANEL */}
        <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md font-mono flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" /> CURRENT PHASE PANEL
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                Live State
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between p-2 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400">CURRENT CYCLE:</span>
                <strong className="text-white text-sm">Cycle #{cycleNumber}</strong>
              </div>

              <div className="flex justify-between p-2 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400">CURRENT PHASE:</span>
                <strong className="text-sky-400 font-extrabold">{currentPhaseLabel}</strong>
              </div>

              <div className="flex justify-between p-2 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400">ELAPSED TIME:</span>
                <strong className="text-amber-400">{elapsedTime.toFixed(2)} / {totalCycleTime.toFixed(2)} s</strong>
              </div>

              <div className="flex justify-between p-2 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400">TARGET SPEED:</span>
                <strong className="text-emerald-400">{targetSpeedDisplay}</strong>
              </div>

              <div className="flex justify-between p-2 rounded bg-slate-800/80 border border-slate-700">
                <span className="text-slate-400">CURRENT POSITION:</span>
                <strong className="text-white">{livePositionMm.toFixed(1)} mm</strong>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Cycle Status:</span>
            <strong className="text-sky-300">{isCycleComplete ? 'CYCLE COMPLETE' : 'IN PROGRESS'}</strong>
          </div>
        </div>

        {/* 4 PHASE SPECIFICATION CARDS */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Phase Sequence & Target Parameters
              </h3>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Exact Danfoss assignment sequence specifications for Cycle #{cycleNumber}
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-900 text-white px-3 py-1 rounded">
              TOTAL: {totalCycleTime.toFixed(2)} s
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            
            {/* Fast Down Card */}
            <div className={`p-3 rounded-xl border text-xs transition-all ${
              !isCycleComplete && activePhaseKey === 'FAST_DOWN'
                ? 'bg-sky-100 border-sky-400 ring-2 ring-sky-300'
                : 'bg-sky-50/80 border-sky-200'
            }`}>
              <div className="flex justify-between items-center mb-1 text-sky-900 font-black">
                <span>FAST DOWN</span>
                <span className="text-[10px] bg-sky-200 px-1.5 py-0.5 rounded">1.00s</span>
              </div>
              <div className="space-y-1 text-slate-700 text-[11px]">
                <div>Speed: <strong>200 mm/s</strong></div>
                <div>Stroke: <strong>200 mm</strong></div>
                <div>Time: <strong className="text-sky-700">{phaseDurations.fastDown.toFixed(2)} s</strong></div>
              </div>
            </div>

            {/* Working Card */}
            <div className={`p-3 rounded-xl border text-xs transition-all ${
              !isCycleComplete && activePhaseKey === 'WORKING'
                ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-300'
                : 'bg-rose-50/80 border-rose-200'
            }`}>
              <div className="flex justify-between items-center mb-1 text-rose-900 font-black">
                <span>WORKING</span>
                <span className="text-[10px] bg-rose-200 px-1.5 py-0.5 rounded">5.00s</span>
              </div>
              <div className="space-y-1 text-slate-700 text-[11px]">
                <div>Speed: <strong>10 mm/s</strong></div>
                <div>Stroke: <strong>50 mm</strong></div>
                <div>Time: <strong className="text-rose-700">{phaseDurations.working.toFixed(2)} s</strong></div>
              </div>
            </div>

            {/* Holding Card */}
            <div className={`p-3 rounded-xl border text-xs transition-all ${
              !isCycleComplete && activePhaseKey === 'HOLDING'
                ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300'
                : 'bg-amber-50/80 border-amber-200'
            }`}>
              <div className="flex justify-between items-center mb-1 text-amber-900 font-black">
                <span>HOLDING</span>
                <span className="text-[10px] bg-amber-200 px-1.5 py-0.5 rounded">2.00s</span>
              </div>
              <div className="space-y-1 text-slate-700 text-[11px]">
                <div>Speed: <strong>0 mm/s</strong></div>
                <div>Stroke: <strong>0 mm</strong></div>
                <div>Time: <strong className="text-amber-700">{phaseDurations.holding.toFixed(2)} s</strong></div>
              </div>
            </div>

            {/* Fast Up Card */}
            <div className={`p-3 rounded-xl border text-xs transition-all ${
              !isCycleComplete && activePhaseKey === 'FAST_UP'
                ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-300'
                : 'bg-emerald-50/80 border-emerald-200'
            }`}>
              <div className="flex justify-between items-center mb-1 text-emerald-900 font-black">
                <span>FAST UP</span>
                <span className="text-[10px] bg-emerald-200 px-1.5 py-0.5 rounded">1.25s</span>
              </div>
              <div className="space-y-1 text-slate-700 text-[11px]">
                <div>Speed: <strong>200 mm/s</strong></div>
                <div>Stroke: <strong>250 mm</strong></div>
                <div>Time: <strong className="text-emerald-700">{phaseDurations.fastUp.toFixed(2)} s</strong></div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 3. ACTUAL SENSOR DATA (3 LARGE GRAPHS) */}
      <div className="bg-white p-5 lg:p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              ACTUAL SENSOR DATA
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Live physical sensor measurements recorded from the hydraulic press test rig
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1 rounded font-bold">
            Live Streamed Sensors (Cycle #{cycleNumber})
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Graph 1: Hydraulic Pressure vs Time */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase font-mono text-slate-800 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-rose-600" /> 1. Hydraulic Pressure vs Time
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Sensor: PS1 (Main Pressure)</span>
              </div>
              <span className="text-[10px] font-mono bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 font-bold">
                bar
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getRecentHistory()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualPressureGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 240]} />
                  <Tooltip content={<SensorChartTooltip unit="bar" color="#e11d48" />} />
                  <Area type="monotone" dataKey="pressure" stroke="#e11d48" strokeWidth={2} fillOpacity={1} fill="url(#actualPressureGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 2: Hydraulic Flow vs Time */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase font-mono text-slate-800 flex items-center gap-1.5">
                  <Wind className="w-4 h-4 text-sky-600" /> 2. Hydraulic Flow vs Time
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Sensor: FS1 (Volume Flow)</span>
              </div>
              <span className="text-[10px] font-mono bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200 font-bold">
                L/min
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getRecentHistory()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualFlowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 70]} />
                  <Tooltip content={<SensorChartTooltip unit="L/min" color="#0284c7" />} />
                  <Area type="monotone" dataKey="flow" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#actualFlowGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 3: VS1 Signal vs Time */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase font-mono text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-600" /> 3. VS1 Signal vs Time
                </h3>
                <span className="text-[10px] font-mono text-slate-500">Sensor: VS1 (Vibration Signal)</span>
              </div>
              <span className="text-[10px] font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-bold">
                mm/s
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getRecentHistory()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 220]} />
                  <Tooltip content={<SensorChartTooltip unit="mm/s" color="#d97706" />} />
                  <Line type="monotone" dataKey="speed" stroke="#d97706" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>

      {/* 4. CYCLE DATA SOURCE PANEL */}
      <div className="bg-slate-900 text-white p-5 lg:p-6 rounded-xl border border-slate-800 shadow-md font-mono">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              DATA SOURCE ARCHITECTURE
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-bold">
            Data Provenance
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
            <div className="text-sky-400 font-bold flex items-center gap-2 border-b border-slate-700 pb-2">
              <Layers className="w-4 h-4 text-sky-400" /> Assignment Operating Cycle Source
            </div>
            <div className="text-slate-300 leading-relaxed">
              <strong>Source:</strong> Hydraulic Press Cycle Specification (Danfoss Assignment Document)
            </div>
            <div className="text-slate-400">
              <strong>Phase Sequence:</strong> Fast Down (1.00s) &rarr; Working (5.00s) &rarr; Holding (2.00s) &rarr; Fast Up (1.25s) | Total Time: ~9.25 s
            </div>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
            <div className="text-emerald-400 font-bold flex items-center gap-2 border-b border-slate-700 pb-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Live / Recorded Telemetry Data Path
            </div>
            <div className="text-slate-300">
              <strong>Data Path:</strong>
            </div>
            <div className="text-slate-300 bg-slate-900/90 p-2.5 rounded border border-slate-700 text-[11px] font-bold text-center">
              Physical Sensors / UCI Dataset &rarr; Node.js Backend &rarr; Socket.IO / FastAPI &rarr; Frontend Visualizations
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
