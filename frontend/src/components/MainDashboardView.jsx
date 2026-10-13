import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import {
  Activity,
  Gauge,
  Wind,
  Thermometer,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Radio,
  Clock,
  Layers
} from 'lucide-react';
import { ScenarioControlPanel } from './ScenarioControlPanel';

const CustomChartTooltip = ({ active, payload, label, unit, color }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white border border-slate-700 p-3 rounded-lg shadow-xl text-xs font-mono">
        <div className="text-slate-400 font-semibold mb-1 border-b border-slate-800 pb-1 flex justify-between gap-4">
          <span>Time: {label}</span>
          {data.cycle && <span>Cycle #{data.cycle}</span>}
        </div>
        <div className="flex items-center justify-between gap-4 my-1">
          <span className="text-slate-400">Phase:</span>
          <span className="font-bold text-sky-400">{data.phase || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Value:</span>
          <span className="font-bold text-sm" style={{ color: color }}>
            {payload[0].value} {unit}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Generates continuous theoretical operating cycle trajectory (0 -> 9.25s)
function getCycleTrajectory() {
  const points = [];
  const total = 9.25;
  for (let i = 0; i <= 60; i++) {
    const t = parseFloat(((i / 60) * total).toFixed(2));
    let pos = 0;
    let phase = 'FAST_DOWN';
    if (t <= 1.0) {
      pos = (t / 1.0) * 200;
      phase = 'Fast Down';
    } else if (t <= 6.0) {
      pos = 200 + ((t - 1.0) / 5.0) * 50;
      phase = 'Working Stroke';
    } else if (t <= 8.0) {
      pos = 250;
      phase = 'Holding Load (9 Ton)';
    } else {
      pos = 250 - ((t - 8.0) / 1.25) * 250;
      phase = 'Fast Return';
    }
    points.push({
      timeSec: t,
      positionMm: parseFloat(pos.toFixed(1)),
      phase
    });
  }
  return points;
}

export function MainDashboardView({
  connected,
  systemStatus,
  currentPacket,
  chartHistory,
  performanceStats,
  analyticsReport,
  alerts,
  isDatasetMode,
  activeCycleNum,
  controls
}) {
  const machineCondition = analyticsReport?.machineCondition || 'NORMAL';
  const anomalyStatus = analyticsReport?.anomalyStatus || 'NO ANOMALY';
  const diagnosticScore = analyticsReport?.confidenceScore ?? 98.5;

  // Energy consumption summary estimates
  const currentCycleWh = performanceStats?.currentCycleEnergyWh ?? currentPacket?.currentCycleEnergyWh ?? 18.40;
  const avgEnergyWh = performanceStats?.avgEnergyPerCycleWh ?? 23.85;
  const totalEnergyKwh = performanceStats?.totalCumulativeEnergyKwh ?? performanceStats?.estimatedEnergyKwh ?? 1.4820;

  // Key sensor values with fallbacks
  const pressureVal = currentPacket?.pressureBar ?? 185.4;
  const flowVal = currentPacket?.flowLmin ?? 42.1;
  const tempVal = currentPacket?.temperatureC ?? 45.2;
  const motorPowerVal = currentPacket?.rawSensorsSnapshot?.EPS1 !== undefined
    ? (currentPacket.rawSensorsSnapshot.EPS1 / 1000).toFixed(1)
    : (currentPacket?.motorCurrentA ? (currentPacket.motorCurrentA * 0.7).toFixed(1) : '9.8');

  // Active scenario metadata
  const activeScenarioName = currentPacket?.scenarioName || systemStatus.scenarioName || 'Normal Operation';

  // High pressure limit checks (thresholds: Warning 210 bar, Alarm 235 bar)
  const isHighPressureAlarm = pressureVal >= 235.0 || currentPacket?.alert?.type === 'HIGH_PRESSURE_ALARM';
  const isHighPressureWarning = pressureVal >= 210.0;
  const isHighTempAlarm = tempVal >= 65.0;
  const isHighTempWarn = tempVal >= 55.0;
  const isLowFlowWarn = flowVal <= 5.0 && (currentPacket?.phase === 'FAST_DOWN' || currentPacket?.phase === 'FAST_UP');

  // Chart data helpers
  const recentHistory = useMemo(() => chartHistory.slice(-40), [chartHistory]);
  const cycleTrajectoryData = useMemo(() => getCycleTrajectory(), []);

  const currentPhaseName = currentPacket?.phaseName || currentPacket?.phase || 'Fast Down';
  const currentPos = currentPacket?.positionMm ?? 150.0;

  return (
    <div className="space-y-6 w-full font-sans">
      
      {/* 2. SCENARIO SELECTION PANEL */}
      <section aria-label="Scenario Selection">
        <ScenarioControlPanel
          systemStatus={systemStatus}
          currentPacket={currentPacket}
          controls={controls}
          alerts={alerts}
        />
      </section>

      {/* 3. CURRENT SYSTEM STATUS (4 Overview Cards) */}
      <section aria-label="Current System Status" className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Connection Status */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className={`p-3 rounded-xl border shrink-0 ${
              connected ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}>
              <Radio className={`w-5 h-5 ${connected ? 'animate-pulse' : ''}`} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Connection Status
              </div>
              <div className="text-sm sm:text-base font-extrabold font-mono text-slate-900 flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span>{connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
              </div>
            </div>
          </div>

          {/* Active Operating Scenario */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Operating Scenario
              </div>
              <div className="text-sm font-extrabold font-mono text-blue-900 mt-0.5 truncate" title={activeScenarioName}>
                {activeScenarioName}
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                Cycle #{activeCycleNum}
              </div>
            </div>
          </div>

          {/* Machine Condition Status */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className={`p-3 rounded-xl border shrink-0 ${
              isHighPressureAlarm
                ? 'bg-rose-50 text-rose-600 border-rose-300 ring-2 ring-rose-200'
                : machineCondition === 'NORMAL'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Machine Condition
              </div>
              <div className={`text-sm sm:text-base font-extrabold font-mono mt-0.5 ${
                isHighPressureAlarm ? 'text-rose-700 animate-pulse' : (machineCondition === 'NORMAL' ? 'text-emerald-700' : 'text-amber-700')
              }`}>
                {isHighPressureAlarm ? 'CRITICAL ALARM' : machineCondition}
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                Score: {diagnosticScore}% &bull; {anomalyStatus}
              </div>
            </div>
          </div>

          {/* Current Warnings / Active Alerts */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className={`p-3 rounded-xl border shrink-0 ${
              isHighPressureAlarm || alerts.length > 0
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              {alerts.length === 0 && !isHighPressureAlarm
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                : <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Current Warnings
              </div>
              <div className={`text-sm sm:text-base font-extrabold font-mono mt-0.5 ${
                alerts.length === 0 && !isHighPressureAlarm ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {isHighPressureAlarm ? '1 HIGH PRESSURE STOP' : `${alerts.length} Warnings`}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. ACTIVE WARNINGS SUMMARY (When warnings exist) */}
      {alerts.length > 0 && (
        <section aria-label="Active Warnings" className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 font-mono">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Current Active Warnings ({alerts.length})
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Live Threshold Evaluation</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto">
            {alerts.slice(0, 4).map((alt, idx) => (
              <div
                key={alt.id || idx}
                className={`p-2.5 rounded-lg border font-mono text-xs flex items-start gap-2.5 ${
                  alt.severity === 'ALARM'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span>{alt.type || 'WARNING'}</span>
                    <span className="text-slate-500">{new Date(alt.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] truncate mt-0.5">{alt.message}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. PRIMARY SENSOR READINGS (4 Cards per row on desktop, 2 on tablet, 1 on mobile) */}
      <section aria-label="Primary Sensor Readings">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Primary Sensor Readings
          </h2>
          <span className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-md font-semibold">
            Live Telemetry Stream
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Sensor 1: Oil Pressure */}
          <div className={`p-5 rounded-xl border shadow-xs transition flex flex-col justify-between ${
            isHighPressureAlarm
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-400 shadow-rose-100'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg border ${
                    isHighPressureAlarm
                      ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                      : 'bg-rose-50 text-rose-600 border-rose-200'
                  }`}>
                    <Gauge className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold font-mono uppercase text-slate-800">
                    Oil Pressure
                  </span>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  isHighPressureAlarm
                    ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                    : isHighPressureWarning
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isHighPressureAlarm ? 'CRITICAL' : (isHighPressureWarning ? 'WARNING' : 'NORMAL')}
                </span>
              </div>

              <div className="my-2">
                <div className={`text-3xl lg:text-4xl font-black font-mono tracking-tight ${
                  isHighPressureAlarm ? 'text-rose-700' : 'text-slate-900'
                }`}>
                  {typeof pressureVal === 'number' ? pressureVal.toFixed(1) : pressureVal}
                  <span className="text-sm font-semibold text-slate-500 ml-1.5">bar</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-mono text-slate-500">
              <span>Sensor: PS1</span>
              <span>Limit: 235 bar</span>
            </div>
          </div>

          {/* Sensor 2: Oil Flow */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
                    <Wind className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold font-mono uppercase text-slate-800">
                    Oil Flow
                  </span>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  isLowFlowWarn
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isLowFlowWarn ? 'LOW FLOW' : 'NORMAL'}
                </span>
              </div>

              <div className="my-2">
                <div className="text-3xl lg:text-4xl font-black font-mono text-slate-900 tracking-tight">
                  {typeof flowVal === 'number' ? flowVal.toFixed(1) : flowVal}
                  <span className="text-sm font-semibold text-slate-500 ml-1.5">L/min</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-mono text-slate-500">
              <span>Sensor: FS1</span>
              <span>Nominal: 0–68 L/min</span>
            </div>
          </div>

          {/* Sensor 3: Oil Temperature */}
          <div className={`p-5 rounded-xl border shadow-xs transition flex flex-col justify-between ${
            isHighTempAlarm
              ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-300'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                    <Thermometer className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold font-mono uppercase text-slate-800">
                    Oil Temperature
                  </span>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  isHighTempAlarm
                    ? 'bg-rose-600 text-white border-rose-700'
                    : isHighTempWarn
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isHighTempAlarm ? 'CRITICAL' : (isHighTempWarn ? 'WARM' : 'NORMAL')}
                </span>
              </div>

              <div className="my-2">
                <div className={`text-3xl lg:text-4xl font-black font-mono tracking-tight ${
                  isHighTempAlarm ? 'text-orange-700' : 'text-slate-900'
                }`}>
                  {typeof tempVal === 'number' ? tempVal.toFixed(1) : tempVal}
                  <span className="text-sm font-semibold text-slate-500 ml-1.5">°C</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-mono text-slate-500">
              <span>Sensor: TS1</span>
              <span>Optimal: 40–50 °C</span>
            </div>
          </div>

          {/* Sensor 4: Motor Power */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold font-mono uppercase text-slate-800">
                    Motor Power
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                  NORMAL
                </span>
              </div>

              <div className="my-2">
                <div className="text-3xl lg:text-4xl font-black font-mono text-slate-900 tracking-tight">
                  {motorPowerVal}
                  <span className="text-sm font-semibold text-slate-500 ml-1.5">kW</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-mono text-slate-500">
              <span>Sensor: EPS1</span>
              <span>Power Input</span>
            </div>
          </div>

        </div>
      </section>

      {/* 6. LIVE SENSOR GRAPHS (3 Charts across full width) */}
      <section aria-label="Live Sensor Graphs" className="bg-white p-5 lg:p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Live Sensor Graphs
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Continuous telemetry stream for primary operating metrics
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1 rounded border border-slate-200 font-bold">
            Live Stream
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Graph 1: Oil Pressure vs Time */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
            isHighPressureAlarm
              ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-300'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase font-mono text-rose-700 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-rose-600" /> Oil Pressure vs Time
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-bold">bar</span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recentHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mainPressureGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 260]} />
                  <Tooltip content={<CustomChartTooltip unit="bar" color="#e11d48" />} />
                  <ReferenceLine y={210} stroke="#f59e0b" strokeDasharray="3 3" />
                  <ReferenceLine y={235} stroke="#dc2626" strokeWidth={2} strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="pressure" stroke="#e11d48" strokeWidth={2} fillOpacity={1} fill="url(#mainPressureGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 2: Oil Flow vs Time */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase font-mono text-sky-700 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-sky-600" /> Oil Flow vs Time
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-bold">L/min</span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recentHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mainFlowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 70]} />
                  <Tooltip content={<CustomChartTooltip unit="L/min" color="#0284c7" />} />
                  <Area type="monotone" dataKey="flow" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#mainFlowGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graph 3: Oil Temperature vs Time */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase font-mono text-amber-700 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-amber-600" /> Oil Temperature vs Time
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-bold">°C</span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recentHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mainTempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[30, 75]} />
                  <Tooltip content={<CustomChartTooltip unit="°C" color="#ea580c" />} />
                  <ReferenceLine y={65} stroke="#dc2626" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="temperature" stroke="#ea580c" strokeWidth={2} fillOpacity={1} fill="url(#mainTempGrad)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </section>

      {/* 7. HYDRAULIC PRESS OPERATING-CYCLE GRAPH */}
      <section aria-label="Operating Cycle Graph" className="bg-white p-5 lg:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Hydraulic Press Operating Cycle Trajectory
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Cylinder position & stroke trajectory across 4 pressing phases (Cycle duration: 9.25 s)
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold">
            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded">
              Current Phase: {currentPhaseName}
            </span>
            <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded">
              Pos: {typeof currentPos === 'number' ? currentPos.toFixed(1) : currentPos} mm
            </span>
          </div>
        </div>

        {/* Phase Badges Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center text-xs">
          <div className="p-2 rounded-lg bg-sky-50 text-sky-900 border border-sky-200 font-bold">
            1. Fast Down (0–1.0s, 0→200 mm)
          </div>
          <div className="p-2 rounded-lg bg-rose-50 text-rose-900 border border-rose-200 font-bold">
            2. Working (1.0–6.0s, 200→250 mm)
          </div>
          <div className="p-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-bold">
            3. Holding (6.0–8.0s, 250 mm 9T)
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
            4. Fast Up (8.0–9.25s, 250→0 mm)
          </div>
        </div>

        {/* Operating Cycle Trajectory Chart */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cycleTrajectoryData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="strokeTrajGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis
                dataKey="timeSec"
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                unit="s"
                domain={[0, 9.25]}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                domain={[0, 260]}
                unit=" mm"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white border border-slate-700 p-2.5 rounded-lg text-xs font-mono">
                        <div className="text-slate-400">Time: {d.timeSec} s</div>
                        <div className="text-sky-400 font-bold my-0.5">{d.phase}</div>
                        <div className="text-amber-400 font-black">Cylinder Stroke: {d.positionMm} mm</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceArea x1={0} x2={1.0} fill="#0284c7" fillOpacity={0.07} />
              <ReferenceArea x1={1.0} x2={6.0} fill="#e11d48" fillOpacity={0.07} />
              <ReferenceArea x1={6.0} x2={8.0} fill="#ea580c" fillOpacity={0.07} />
              <ReferenceArea x1={8.0} x2={9.25} fill="#10b981" fillOpacity={0.07} />
              <Area
                type="monotone"
                dataKey="positionMm"
                stroke="#2563eb"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#strokeTrajGrad)"
                name="Stroke Position (mm)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 8. COMPACT SUMMARY OF CURRENT ENERGY CONSUMPTION */}
      <section aria-label="Energy Consumption Summary" className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl p-5 shadow-xs font-mono">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-xs text-white shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-wider uppercase">
                  ENERGY CONSUMPTION SUMMARY
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-white/20 border border-white/30 text-white">
                  CALCULATED ESTIMATE
                </span>
              </div>
              <p className="text-xs text-amber-100 font-medium mt-0.5 font-sans">
                Energy metrics calculated from measured hydraulic pressure, volume flow rate, and motor output
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-white/10 p-2.5 rounded-lg border border-white/20">
              <span className="text-[10px] uppercase text-amber-200 block font-bold">Current Cycle Energy</span>
              <strong className="text-base lg:text-lg font-black block text-white mt-0.5">
                {currentCycleWh.toFixed(2)} Wh
              </strong>
            </div>

            <div className="bg-white/10 p-2.5 rounded-lg border border-white/20">
              <span className="text-[10px] uppercase text-amber-200 block font-bold">Avg Energy / Cycle</span>
              <strong className="text-base lg:text-lg font-black block text-white mt-0.5">
                {avgEnergyWh.toFixed(2)} Wh
              </strong>
            </div>

            <div className="bg-white/10 p-2.5 rounded-lg border border-white/20">
              <span className="text-[10px] uppercase text-amber-200 block font-bold">Total Cumulative</span>
              <strong className="text-base lg:text-lg font-black block text-white mt-0.5">
                {totalEnergyKwh.toFixed(4)} kWh
              </strong>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
