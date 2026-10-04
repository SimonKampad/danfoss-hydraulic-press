import React from 'react';
import { TrendingUp, TrendingDown, Minus, Gauge, Wind, Zap, Thermometer, Navigation, Activity } from 'lucide-react';

const SENSOR_ICONS = {
  pressure: Gauge,
  flow: Wind,
  speed: Activity,
  position: Navigation,
  temperature: Thermometer,
  motorCurrent: Zap
};

const SENSOR_COLORS = {
  pressure: { text: 'text-rose-600', stroke: '#e11d48', bg: 'bg-rose-50', border: 'border-rose-200' },
  flow: { text: 'text-sky-600', stroke: '#0284c7', bg: 'bg-sky-50', border: 'border-sky-200' },
  speed: { text: 'text-amber-600', stroke: '#d97706', bg: 'bg-amber-50', border: 'border-amber-200' },
  position: { text: 'text-emerald-600', stroke: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  temperature: { text: 'text-orange-600', stroke: '#ea580c', bg: 'bg-orange-50', border: 'border-orange-200' },
  motorCurrent: { text: 'text-purple-600', stroke: '#9333ea', bg: 'bg-purple-50', border: 'border-purple-200' }
};

export function SensorCard({ title, value, unit, type, status = 'NORMAL', isProposed = false, timestamp, sparkline = [] }) {
  const Icon = SENSOR_ICONS[type] || Activity;
  const colors = SENSOR_COLORS[type] || SENSOR_COLORS.pressure;

  let trend = 'flat';
  if (sparkline.length >= 2) {
    const prev = sparkline[sparkline.length - 2];
    const curr = sparkline[sparkline.length - 1];
    if (curr > prev + 0.1) trend = 'up';
    else if (curr < prev - 0.1) trend = 'down';
  }

  const statusBadgeColor = status === 'NORMAL' || status === 'OK' 
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : (status === 'WARNING' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200');

  return (
    <div className="industrial-card p-4 relative overflow-hidden transition-all duration-200 hover:border-slate-300 shadow-xs">
      
      {isProposed && (
        <span className="absolute top-2 right-2 text-[9px] font-mono uppercase bg-slate-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-semibold">
          Auxiliary Parameter
        </span>
      )}

      {/* Header icon + Title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${colors.bg} ${colors.text} border ${colors.border}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            {title}
          </span>
        </div>

        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${statusBadgeColor}`}>
          {status}
        </span>
      </div>

      {/* Main Value Display */}
      <div className="flex items-baseline justify-between mt-1 mb-2">
        <div className="text-2xl lg:text-3xl font-bold font-mono text-slate-900 tracking-tight">
          {typeof value === 'number' ? value.toFixed(1) : value}
          <span className="text-xs text-slate-500 font-normal ml-1.5">{unit}</span>
        </div>

        {/* Trend Arrow */}
        <div className="flex items-center gap-1 text-xs font-mono font-semibold">
          {trend === 'up' && <span className="text-rose-600 flex items-center"><TrendingUp className="w-3.5 h-3.5 mr-0.5" /> UP</span>}
          {trend === 'down' && <span className="text-emerald-600 flex items-center"><TrendingDown className="w-3.5 h-3.5 mr-0.5" /> DOWN</span>}
          {trend === 'flat' && <span className="text-slate-400 flex items-center"><Minus className="w-3.5 h-3.5 mr-0.5" /> STABLE</span>}
        </div>
      </div>

      {/* Mini SVG Sparkline Trend */}
      {sparkline && sparkline.length > 5 && (
        <div className="w-full h-8 mt-2 mb-1">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 30" preserveAspectRatio="none">
            {(() => {
              const min = Math.min(...sparkline);
              const max = Math.max(...sparkline) || 1;
              const range = max - min || 1;
              const points = sparkline.map((val, idx) => {
                const x = (idx / (sparkline.length - 1)) * 100;
                const y = 28 - ((val - min) / range) * 24;
                return `${x},${y}`;
              }).join(' ');
              return (
                <polyline
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                />
              );
            })()}
          </svg>
        </div>
      )}

      {/* Footer Timestamp */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-100">
        <span>Updated</span>
        <span>{timestamp ? new Date(timestamp).toLocaleTimeString() : 'Live'}</span>
      </div>

    </div>
  );
}

export function SensorCardsGrid({ currentPacket, chartHistory }) {
  const getRecentValues = (key) => chartHistory.slice(-20).map(d => d[key]).filter(v => v !== undefined);

  return (
    <div className="mb-6">
      <h2 className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-3 flex items-center gap-2">
        <Gauge className="w-4 h-4 text-blue-600" />
        Real-Time Sensor Telemetry
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SensorCard
          title="Hydraulic Pressure"
          value={currentPacket?.pressureBar ?? 0.0}
          unit="bar"
          type="pressure"
          status={currentPacket?.pressureBar > 210 ? 'HIGH' : 'OK'}
          timestamp={currentPacket?.timestamp}
          sparkline={getRecentValues('pressure')}
        />

        <SensorCard
          title="Hydraulic Flow"
          value={currentPacket?.flowLmin ?? 0.0}
          unit="L/min"
          type="flow"
          status="OK"
          timestamp={currentPacket?.timestamp}
          sparkline={getRecentValues('flow')}
        />

        <SensorCard
          title="Cylinder Speed"
          value={currentPacket?.speedMmS ?? 0.0}
          unit="mm/s"
          type="speed"
          status="OK"
          timestamp={currentPacket?.timestamp}
          sparkline={getRecentValues('speed')}
        />

        <SensorCard
          title="Cylinder Position"
          value={currentPacket?.positionMm ?? 0.0}
          unit="mm"
          type="position"
          status="OK"
          timestamp={currentPacket?.timestamp}
          sparkline={getRecentValues('position')}
        />

        <SensorCard
          title="Oil Temperature"
          value={currentPacket?.temperatureC ?? 42.0}
          unit="°C"
          type="temperature"
          status={currentPacket?.temperatureC > 55 ? 'WARN' : 'NORMAL'}
          isProposed={true}
          timestamp={currentPacket?.timestamp}
          sparkline={getRecentValues('temperature')}
        />

        <SensorCard
          title="Motor Current"
          value={currentPacket?.motorCurrentA ?? 14.0}
          unit="A"
          type="motorCurrent"
          status={currentPacket?.motorCurrentA > 35 ? 'HIGH' : 'NORMAL'}
          isProposed={true}
          timestamp={currentPacket?.timestamp}
          sparkline={getRecentValues('motorCurrent')}
        />
      </div>
    </div>
  );
}

