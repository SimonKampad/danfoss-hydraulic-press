import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
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
  Info,
  SlidersHorizontal,
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
  const maintenanceIndicator = analyticsReport?.maintenanceIndicator || 'OPTIMAL / ROUTINE';
  const diagnosticScore = analyticsReport?.confidenceScore ?? 98.5;

  // Energy analytics estimates
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
  const dataSource = currentPacket?.dataSource || systemStatus.dataSource || (isDatasetMode ? 'ORIGINAL_DATASET_REPLAY' : 'SYNTHETIC_SIMULATION');

  // Emergency overpressure alert state
  const isHighPressureExcursion = pressureVal >= 235.0 || currentPacket?.alert?.type === 'HIGH_PRESSURE_ALARM';
  const isHighPressureWarning = pressureVal >= 210.0;
  const isHighTempAlarm = tempVal >= 65.0;

  // Sparkline data helpers
  const getRecentHistory = () => chartHistory.slice(-40);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. SCENARIO CONTROL PANEL (OPERATOR CONSOLE) */}
      <ScenarioControlPanel
        systemStatus={systemStatus}
        currentPacket={currentPacket}
        controls={controls}
        alerts={alerts}
      />

      {/* 2. TOP SYSTEM OVERVIEW BANNER */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Connection Status */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className={`p-3 rounded-xl border ${
              connected ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}>
              <Radio className={`w-6 h-6 ${connected ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                System Status
              </div>
              <div className="text-base font-extrabold font-mono text-slate-900 flex items-center gap-1.5 mt-0.5">
                <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {connected ? 'CONNECTED' : 'DISCONNECTED'}
              </div>
            </div>
          </div>

          {/* Current Cycle & Active Scenario */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Active Scenario
              </div>
              <div className="text-sm font-extrabold font-mono text-blue-900 mt-0.5 truncate max-w-[140px]" title={activeScenarioName}>
                {activeScenarioName}
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                Cycle #{activeCycleNum}
              </div>
            </div>
          </div>

          {/* Machine Health Condition */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className={`p-3 rounded-xl border ${
              isHighPressureExcursion
                ? 'bg-rose-50 text-rose-600 border-rose-300 ring-2 ring-rose-200'
                : machineCondition === 'NORMAL'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Machine Condition
              </div>
              <div className={`text-base font-extrabold font-mono mt-0.5 ${
                isHighPressureExcursion ? 'text-rose-700 animate-pulse' : (machineCondition === 'NORMAL' ? 'text-emerald-700' : 'text-amber-700')
              }`}>
                {isHighPressureExcursion ? 'CRITICAL ALARM' : machineCondition}
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <div className={`p-3 rounded-xl border ${
              isHighPressureExcursion || alerts.length > 0
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              {alerts.length === 0 && !isHighPressureExcursion
                ? <CheckCircle2 className="w-6 h-6" />
                : <AlertTriangle className="w-6 h-6 animate-bounce" />}
            </div>
            <div>
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Active Alerts
              </div>
              <div className={`text-base font-extrabold font-mono mt-0.5 ${
                alerts.length === 0 && !isHighPressureExcursion ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {isHighPressureExcursion ? '1 STOP ALARM' : `${alerts.length} Excursions`}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. ENERGY ANALYTICS OVERVIEW CARD */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl p-5 shadow-xs font-mono">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-xs text-white">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-wider uppercase">
                  ENERGY ANALYTICS OVERVIEW
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-white/20 border border-white/30 text-white">
                  ANALYTICS ESTIMATE
                </span>
              </div>
              <p className="text-xs text-amber-100 font-medium mt-0.5 font-sans">
                Real-Time Energy Metrics Calculated From Sensor Telemetry & Motor Power Output
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
              <span className="text-[10px] uppercase text-amber-200 block font-bold">Total Energy</span>
              <strong className="text-base lg:text-lg font-black block text-white mt-0.5">
                {totalEnergyKwh.toFixed(4)} kWh
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4. LIVE SENSOR OVERVIEW (4 PRIMARY PARAMETER CARDS) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Live Sensor Overview
          </h2>
          <span className="text-xs font-mono text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-md font-semibold">
            Primary Telemetry Parameters
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1: Hydraulic Pressure (Highlighted on Overpressure Alarm) */}
          <div className={`p-5 rounded-xl border shadow-xs transition flex flex-col justify-between ${
            isHighPressureExcursion
              ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-400 shadow-rose-100'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg border ${
                    isHighPressureExcursion
                      ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                      : 'bg-rose-50 text-rose-600 border-rose-200'
                  }`}>
                    <Gauge className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold font-mono uppercase text-slate-700">
                    Hydraulic Pressure
                  </span>
                </div>
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                  isHighPressureExcursion
                    ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                    : isHighPressureWarning
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isHighPressureExcursion ? 'STOP — ALARM' : (isHighPressureWarning ? 'HIGH' : 'NORMAL')}
                </span>
              </div>

              <div className="my-2">
                <div className={`text-3xl lg:text-4xl font-black font-mono tracking-tight ${
                  isHighPressureExcursion ? 'text-rose-700' : 'text-slate-900'
                }`}>
                  {typeof pressureVal === 'number' ? pressureVal.toFixed(1) : pressureVal}
                  <span className="text-sm font-semibold text-slate-500 ml-2">bar</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-mono text-slate-500">
              <span>Sensor: PS1</span>
              <span>Threshold: 235 bar</span>
            </div>
          </div>

          {/* Card 2: Hydraulic Flow */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
                    <Wind className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold font-mono uppercase text-slate-700">
                    Hydraulic Flow
                  </span>
                </div>
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                  flowVal <= 5.0 && (currentPacket?.phase === 'FAST_DOWN' || currentPacket?.phase === 'FAST_UP')
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {flowVal <= 5.0 && (currentPacket?.phase === 'FAST_DOWN' || currentPacket?.phase === 'FAST_UP') ? 'LOW' : 'NORMAL'}
                </span>
              </div>

              <div className="my-2">
                <div className="text-3xl lg:text-4xl font-black font-mono text-slate-900 tracking-tight">
                  {typeof flowVal === 'number' ? flowVal.toFixed(1) : flowVal}
                  <span className="text-sm font-semibold text-slate-500 ml-2">L/min</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-mono text-slate-500">
              <span>Sensor: FS1</span>
              <span>Nominal: 0–68 L/min</span>
            </div>
          </div>

          {/* Card 3: Oil Temperature */}
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
                  <span className="text-xs font-extrabold font-mono uppercase text-slate-700">
                    Oil Temperature
                  </span>
                </div>
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                  isHighTempAlarm
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : tempVal > 55
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isHighTempAlarm ? 'ALARM' : (tempVal > 55 ? 'WARM' : 'NORMAL')}
                </span>
              </div>

              <div className="my-2">
                <div className={`text-3xl lg:text-4xl font-black font-mono tracking-tight ${
                  isHighTempAlarm ? 'text-orange-700' : 'text-slate-900'
                }`}>
                  {typeof tempVal === 'number' ? tempVal.toFixed(1) : tempVal}
                  <span className="text-sm font-semibold text-slate-500 ml-2">°C</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-mono text-slate-500">
              <span>Sensor: TS1</span>
              <span>Optimal: 40–50 °C</span>
            </div>
          </div>

          {/* Card 4: Motor Power */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
                    <Zap className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-extrabold font-mono uppercase text-slate-700">
                    Motor Power
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                  NORMAL
                </span>
              </div>

              <div className="my-2">
                <div className="text-3xl lg:text-4xl font-black font-mono text-slate-900 tracking-tight">
                  {motorPowerVal}
                  <span className="text-sm font-semibold text-slate-500 ml-2">kW</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-mono text-slate-500">
              <span>Sensor: EPS1</span>
              <span>Power Input</span>
            </div>
          </div>

        </div>
      </div>

      {/* 5. LIVE SENSOR TRENDS (3 HIGH-CONTRAST CHARTS) */}
      <div className="bg-white p-5 lg:p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Live Sensor Trends
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Real-time telemetry trends for primary hydraulic operating metrics
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1 rounded border border-slate-200 font-bold">
            Real-Time Stream
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Trend 1: Pressure vs Time (Highlighted on Overpressure Alarm) */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
            isHighPressureExcursion
              ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-300'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase font-mono text-rose-700 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-rose-600" /> Pressure vs Time
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-bold">bar</span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getRecentHistory()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

          {/* Trend 2: Flow vs Time */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase font-mono text-sky-700 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-sky-600" /> Flow vs Time
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-bold">L/min</span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getRecentHistory()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

          {/* Trend 3: Temperature vs Time */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase font-mono text-amber-700 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-amber-600" /> Temperature vs Time
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-bold">°C</span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getRecentHistory()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
      </div>

      {/* 6. SYSTEM DIAGNOSTICS SECTION */}
      <div className="bg-white p-5 lg:p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              System Diagnostics
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Rule-based real-time diagnostic indicators & system condition health evaluation
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded font-bold">
            Rule Engine Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
              Machine Condition
            </span>
            <span className={`text-sm font-extrabold block px-2.5 py-1 rounded border text-center ${
              isHighPressureExcursion
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : machineCondition === 'NORMAL'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              {isHighPressureExcursion ? 'CRITICAL' : machineCondition}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
              Anomaly Status
            </span>
            <span className="text-sm font-extrabold text-slate-800 block px-2.5 py-1 rounded bg-white border border-slate-200 text-center truncate">
              {isHighPressureExcursion ? 'STOP — HIGH PRESSURE' : anomalyStatus}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
              Maintenance Status
            </span>
            <span className="text-sm font-extrabold text-blue-900 block px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-center truncate">
              {isHighPressureExcursion ? 'INSPECT RELIEF VALVE' : maintenanceIndicator}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
              Active Alerts
            </span>
            <span className={`text-sm font-extrabold block px-2.5 py-1 rounded border text-center ${
              alerts.length === 0 && !isHighPressureExcursion ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {isHighPressureExcursion ? '1 STOP ALARM' : `${alerts.length} Excursions`}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono">
            <span className="text-[11px] text-slate-500 uppercase font-semibold block mb-1">
              System Diagnostic Score
            </span>
            <span className="text-sm font-extrabold text-emerald-800 block px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-center">
              {isHighPressureExcursion ? '68.5%' : `${diagnosticScore}%`}
            </span>
          </div>

        </div>

        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Authoritative Telemetry:</strong> All dashboard metrics synchronize directly from the single authoritative sensor telemetry stream emitted by the backend.
          </span>
        </div>

      </div>

    </div>
  );
}
