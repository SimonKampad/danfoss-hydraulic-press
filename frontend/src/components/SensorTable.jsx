import React from 'react';
import { Table, Pause, Play, Trash2, Download, Database } from 'lucide-react';

export function SensorTable({ dataTable, isPaused, setIsPaused, onClear }) {
  const exportCSV = () => {
    if (!dataTable || dataTable.length === 0) return;

    const headers = ['Timestamp', 'Cycle', 'Phase', 'Pressure (bar)', 'Flow (L/min)', 'Speed (mm/s)', 'Position (mm)', 'Temperature (C)', 'Motor Current (A)'];
    const rows = dataTable.map(d => [
      d.timestamp,
      d.cycleNumber,
      d.phase,
      d.pressureBar,
      d.flowLmin,
      d.speedMmS,
      d.positionMm,
      d.temperatureC,
      d.motorCurrentA
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sensor_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="industrial-card p-4 lg:p-6 mb-6">
      
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Live Telemetry Data Ingestion Stream
          </h2>
          <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {dataTable.length} Records In-Memory
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5 border transition cursor-pointer ${
              isPaused
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
            {isPaused ? 'Resume Table' : 'Pause Table'}
          </button>

          <button
            onClick={exportCSV}
            disabled={dataTable.length === 0}
            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3 h-3 text-slate-500" /> Export CSV
          </button>

          <button
            onClick={onClear}
            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 className="w-3 h-3 text-slate-400" /> Clear
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg border border-slate-200">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-100 z-10 text-slate-600 text-[10px] uppercase border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 font-bold">Timestamp</th>
              <th className="py-2.5 px-3 font-bold">Cycle #</th>
              <th className="py-2.5 px-3 font-bold">Phase</th>
              <th className="py-2.5 px-3 font-bold">Pressure (bar)</th>
              <th className="py-2.5 px-3 font-bold">Flow (L/min)</th>
              <th className="py-2.5 px-3 font-bold">Speed (mm/s)</th>
              <th className="py-2.5 px-3 font-bold">Position (mm)</th>
              <th className="py-2.5 px-3 font-bold">Temp (°C)</th>
              <th className="py-2.5 px-3 font-bold">Current (A)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {dataTable.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-8 text-center text-slate-400 font-mono text-xs">
                  No telemetry logged yet. Ensure simulation is running.
                </td>
              </tr>
            ) : (
              dataTable.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                    {new Date(row.timeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 })}
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-800">
                    #{row.cycleNumber}
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {row.phase}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-bold text-rose-600">
                    {row.pressureBar.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 font-bold text-sky-600">
                    {row.flowLmin.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 font-bold text-amber-600">
                    {row.speedMmS.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 font-bold text-emerald-600">
                    {row.positionMm.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 text-slate-700">
                    {row.temperatureC.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 text-slate-700">
                    {row.motorCurrentA.toFixed(1)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

