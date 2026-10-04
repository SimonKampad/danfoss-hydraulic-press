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
  ReferenceLine
} from 'recharts';
import { Gauge, Wind, Activity, Navigation } from 'lucide-react';

const CustomTooltip = ({ active, payload, label, unit, color }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-md text-xs font-mono">
        <div className="text-slate-500 font-semibold mb-1 border-b border-slate-100 pb-1">
          Time: {label} | Cycle #{data.cycle}
        </div>
        <div className="flex items-center justify-between gap-4 my-1">
          <span className="text-slate-600">Phase:</span>
          <span className="font-bold text-blue-600">{data.phase}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-600">Value:</span>
          <span className="font-bold text-base" style={{ color: color }}>
            {payload[0].value} {unit}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function RealtimeCharts({ chartHistory, currentPacket }) {
  return (
    <div className="mb-6 space-y-6">
      
      {/* Grid 1: Pressure & Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart A: Pressure vs Time */}
        <div className="industrial-card p-4 lg:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Hydraulic Pressure vs. Time
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  Current: <strong className="text-rose-600">{currentPacket?.pressureBar ?? 0} bar</strong> | Limit: 210 bar
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 font-semibold">
              Unit: bar
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartHistory} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 240]} />
                <Tooltip content={<CustomTooltip unit="bar" color="#e11d48" />} />
                <ReferenceLine y={210} stroke="#dc2626" strokeDasharray="3 3" label={{ value: 'MAX 210 bar', fill: '#dc2626', fontSize: 9 }} />
                <Area type="monotone" dataKey="pressure" stroke="#e11d48" strokeWidth={2} fillOpacity={1} fill="url(#pressureGrad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Flow vs Time */}
        <div className="industrial-card p-4 lg:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-sky-50 text-sky-600 border border-sky-200">
                <Wind className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Hydraulic Flow vs. Time
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  Current: <strong className="text-sky-600">{currentPacket?.flowLmin ?? 0} L/min</strong> | High: Fast Down, Low: Working
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200 font-semibold">
              Unit: L/min
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartHistory} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 80]} />
                <Tooltip content={<CustomTooltip unit="L/min" color="#0284c7" />} />
                <Area type="monotone" dataKey="flow" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#flowGrad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Grid 2: Speed & Position */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart C: Cylinder Speed vs Time */}
        <div className="industrial-card p-4 lg:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Cylinder Speed vs. Time
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  Target: Fast Down (200 mm/s) | Working (10 mm/s) | Holding (0 mm/s)
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200 font-semibold">
              Unit: mm/s
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartHistory} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 220]} />
                <Tooltip content={<CustomTooltip unit="mm/s" color="#d97706" />} />
                <Line type="monotone" dataKey="speed" stroke="#d97706" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart D: Cylinder Position vs Time */}
        <div className="industrial-card p-4 lg:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Cylinder Position vs. Time
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  Profile: Fast Extend (200mm) → Working Extend (50mm) → Hold → Retract (250mm)
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
              Unit: mm
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartHistory} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="posGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={[0, 270]} />
                <Tooltip content={<CustomTooltip unit="mm" color="#059669" />} />
                <Area type="monotone" dataKey="position" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#posGrad)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}

