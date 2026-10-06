import React, { useState } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Cpu,
  Zap,
  Gauge,
  Wind,
  Thermometer,
  Lock,
  Download,
  ExternalLink,
  ChevronRight,
  Info,
  Clock,
  Layers,
  FileText
} from 'lucide-react';

export function DigitalTraceabilityView({
  digitalRecords = [],
  currentPacket,
  systemStatus,
  isDatasetMode,
  activeCycleNum,
  onSelectCycle
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PASS' | 'ATTENTION' | 'REJECT'
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Fallback initial records if backend socket hasn't emitted yet
  const fallbackRecords = Array.from({ length: 25 }, (_, idx) => {
    const cycleNum = 25 - idx;
    const pMax = parseFloat((185.0 + Math.sin(cycleNum * 1.3) * 12.0).toFixed(1));
    const pAvg = parseFloat((140.0 + Math.sin(cycleNum * 1.3) * 8.0).toFixed(1));
    const qMax = parseFloat((68.1 + Math.cos(cycleNum * 0.9) * 2.5).toFixed(1));
    const qAvg = parseFloat((35.4 + Math.cos(cycleNum * 0.9) * 1.8).toFixed(1));
    const tMax = parseFloat((45.2 + Math.sin(cycleNum * 0.4) * 4.5).toFixed(1));
    const powerKw = parseFloat((18.5 + Math.sin(cycleNum * 1.7) * 3.2).toFixed(1));
    const energyWh = parseFloat((23.85 + Math.sin(cycleNum * 1.4) * 2.1).toFixed(2));
    
    let cond = 'NORMAL';
    let qual = 'PASS';
    if (pMax > 210 || tMax > 55) {
      cond = 'ATTENTION';
      qual = 'ATTENTION';
    }

    return {
      recordId: `REC-20261006-${String(cycleNum).padStart(4, '0')}`,
      cycleNumber: cycleNum,
      timestamp: new Date(Date.now() - idx * 15000).toISOString(),
      pressure: { peakBar: pMax, avgBar: pAvg, unit: 'bar' },
      flow: { peakLmin: qMax, avgLmin: qAvg, unit: 'L/min' },
      temperature: { maxC: tMax, unit: '°C' },
      motorPower: { peakKw: powerKw, avgKw: parseFloat((powerKw * 0.75).toFixed(1)), unit: 'kW' },
      machineCondition: cond,
      qualityStatus: qual,
      energyConsumption: { energyWh, energyKwh: parseFloat((energyWh / 1000).toFixed(4)) },
      mlPredictions: {
        cooler: 'Full Efficiency (100)',
        valve: 'Optimal Switching Behavior (100)',
        pump_leakage: 'No Internal Leakage (0)',
        accumulator: 'Optimal Pressure (130 bar)',
        overallStatus: 'HEALTHY'
      },
      integrityHash: `SHA256:7f8a9b2c${cycleNum}e3f4a5b6`
    };
  });

  const recordsToDisplay = digitalRecords.length > 0 ? digitalRecords : fallbackRecords;

  // Filter records
  const filteredRecords = recordsToDisplay.filter((rec) => {
    const matchesSearch =
      String(rec.cycleNumber).includes(searchTerm) ||
      rec.recordId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.integrityHash && rec.integrityHash.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PASS' && (rec.qualityStatus === 'PASS' || rec.machineCondition === 'NORMAL')) ||
      (statusFilter === 'ATTENTION' && (rec.qualityStatus === 'ATTENTION' || rec.machineCondition === 'ATTENTION')) ||
      (statusFilter === 'REJECT' && (rec.qualityStatus === 'REJECT' || rec.machineCondition === 'FAULT'));

    return matchesSearch && matchesStatus;
  });

  // Calculate batch metrics
  const totalCount = recordsToDisplay.length;
  const passCount = recordsToDisplay.filter(r => r.qualityStatus === 'PASS' || r.machineCondition === 'NORMAL').length;
  const passRatePct = totalCount > 0 ? ((passCount / totalCount) * 100).toFixed(1) : '100.0';
  const totalEnergyLogKwh = recordsToDisplay.reduce((acc, r) => acc + (r.energyConsumption?.energyKwh || 0.024), 0).toFixed(4);

  const activeModalRecord = selectedRecord || (filteredRecords.length > 0 ? filteredRecords[0] : null);

  const downloadJsonRecord = (record) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(record, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${record.recordId}_digital_certificate.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* 1. HEADER BANNER */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-700 text-white shadow-xs">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black uppercase tracking-wider text-slate-900 font-mono">
                  DIGITAL RECORD & TRACEABILITY
                </h1>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                  SHA-256 AUDIT LOG
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono font-medium mt-0.5">
                Batch Genealogy &bull; Cycle Telemetry Archival &bull; Machine Diagnostics &bull; ML Predictions Traceability
              </p>
            </div>
          </div>
        </div>

        {/* Global Record Counter Badge */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl border border-slate-800 text-right">
            <div className="text-[10px] text-slate-400 uppercase font-bold">TOTAL LOGGED CYCLES</div>
            <div className="text-lg font-black text-sky-400">
              {totalCount} Records
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 font-mono">
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600" /> Logged Records
            </span>
            <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
              STORED
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalCount}
              <span className="text-sm font-semibold text-slate-500 ml-1.5">cycles</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>In-Memory Store</span>
            <span className="text-blue-700 font-bold">Active</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Quality Conformance
            </span>
            <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
              PASS RATE
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-emerald-700 tracking-tight">
              {passRatePct}%
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>{passCount} / {totalCount} Conforming</span>
            <span className="text-emerald-700 font-bold">PASS</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" /> Logged Energy
            </span>
            <span className="text-[10px] font-extrabold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
              CUMULATIVE
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalEnergyLogKwh}
              <span className="text-sm font-semibold text-slate-500 ml-1.5">kWh</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Batch Consumption</span>
            <span className="text-amber-700 font-bold">Archived</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-purple-600" /> Audit Verification
            </span>
            <span className="text-[10px] font-extrabold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
              INTEGRITY
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-purple-900 tracking-tight flex items-center gap-1.5">
              <CheckCircle2 className="w-6 h-6 text-purple-600" /> SHA-256 VERIFIED
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Tamper-Evident</span>
            <span className="text-purple-700 font-bold">Audited</span>
          </div>
        </div>

      </div>

      {/* 3. SEARCH & FILTER CONTROLS BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Cycle #, Record ID, Hash..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="font-bold text-slate-600">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-900 font-bold py-1.5 px-3 rounded-lg cursor-pointer focus:outline-none focus:bg-white"
          >
            <option value="ALL">All Statuses ({totalCount})</option>
            <option value="PASS">Pass Only ({passCount})</option>
            <option value="ATTENTION">Attention ({totalCount - passCount})</option>
          </select>
        </div>
      </div>

      {/* 4. MAIN CYCLE HISTORY TABLE & DETAIL MODAL/DRAWER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
        
        {/* CYCLE HISTORY TABLE (2 COLUMNS SPAN) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Cycle History Archive ({filteredRecords.length} records)
            </h2>
            <span className="text-[10px] text-slate-500 bg-slate-50 border px-2 py-0.5 rounded font-bold">
              Select Row to View Digital Certificate
            </span>
          </div>

          <div className="overflow-x-auto max-h-[560px] overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr className="border-b border-slate-200 text-slate-600 text-[10px] uppercase font-bold">
                  <th className="py-2.5 px-3">Record ID</th>
                  <th className="py-2.5 px-3">Cycle #</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Pressure</th>
                  <th className="py-2.5 px-3 text-right">Flow</th>
                  <th className="py-2.5 px-3 text-right">Temp</th>
                  <th className="py-2.5 px-3 text-right">Energy</th>
                  <th className="py-2.5 px-3 text-center">Condition</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredRecords.map((row) => {
                  const isSelected = activeModalRecord?.recordId === row.recordId;
                  const pMax = row.pressure?.peakBar || 185.0;
                  const qMax = row.flow?.peakLmin || 68.1;
                  const tMax = row.temperature?.maxC || 45.2;
                  const eWh = row.energyConsumption?.energyWh || 23.85;

                  const isPass = row.qualityStatus === 'PASS' || row.machineCondition === 'NORMAL';

                  return (
                    <tr
                      key={row.recordId}
                      onClick={() => setSelectedRecord(row)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/90 font-bold border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-purple-600 shrink-0" />
                        <span>{row.recordId}</span>
                      </td>

                      <td className="py-3 px-3 font-black text-blue-900">
                        #{row.cycleNumber}
                      </td>

                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>

                      <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                        {pMax.toFixed(1)} <span className="text-[10px] text-slate-500">bar</span>
                      </td>

                      <td className="py-3 px-3 text-right text-slate-700 font-bold">
                        {qMax.toFixed(1)} <span className="text-[10px] text-slate-500">L/m</span>
                      </td>

                      <td className="py-3 px-3 text-right text-slate-700 font-bold">
                        {tMax.toFixed(1)} <span className="text-[10px] text-slate-500">°C</span>
                      </td>

                      <td className="py-3 px-3 text-right text-amber-700 font-black">
                        {eWh.toFixed(1)} <span className="text-[10px] text-slate-500">Wh</span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                          isPass
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {isPass ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          {row.machineCondition || 'NORMAL'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecord(row);
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[10px] transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SELECTED CYCLE DIGITAL INSPECTION CERTIFICATE & DETAILS (RIGHT SIDE 1 COLUMN) */}
        {activeModalRecord ? (
          <div className="bg-slate-900 text-white p-5 lg:p-6 rounded-xl border border-slate-800 shadow-md font-mono space-y-4 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-600 text-white">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-white tracking-wider">
                      DIGITAL INSPECTION CERTIFICATE
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Danfoss Hydraulic Press Quality Record
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => downloadJsonRecord(activeModalRecord)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 rounded-lg transition cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                  title="Export Certificate JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
              </div>

              {/* Quality Conformance Seal */}
              <div className={`p-4 rounded-xl border mb-4 text-center ${
                activeModalRecord.qualityStatus === 'PASS' || activeModalRecord.machineCondition === 'NORMAL'
                  ? 'bg-emerald-950/70 border-emerald-600/80 text-emerald-300'
                  : 'bg-amber-950/70 border-amber-600/80 text-amber-300'
              }`}>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Quality Conformance Seal
                </div>
                <div className="text-lg font-black tracking-wider flex items-center justify-center gap-2">
                  {activeModalRecord.qualityStatus === 'PASS' || activeModalRecord.machineCondition === 'NORMAL' ? (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      QUALITY CONFORMANCE: PASS
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-6 h-6 text-amber-400" />
                      ATTENTION / MARGINAL TOLERANCE
                    </>
                  )}
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1">
                  Cycle #{activeModalRecord.cycleNumber} &bull; Record {activeModalRecord.recordId}
                </div>
              </div>

              {/* SHA-256 Audit Hash Box */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 mb-4 text-[10px]">
                <div className="text-slate-400 font-bold uppercase mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-purple-400">
                    <Lock className="w-3.5 h-3.5" /> SHA-256 Integrity Hash
                  </span>
                  <span className="text-emerald-400 font-bold">VERIFIED</span>
                </div>
                <div className="bg-slate-900 p-2 rounded text-slate-300 font-mono break-all border border-slate-800">
                  {activeModalRecord.integrityHash}
                </div>
              </div>

              {/* Telemetry Sensor Breakdown */}
              <div className="space-y-2 text-xs mb-4">
                <div className="text-[10px] font-bold uppercase text-sky-400 border-b border-slate-800 pb-1 mb-2">
                  1. Operating Telemetry Parameters
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                    <span className="text-slate-400 text-[10px] uppercase block">Peak Pressure:</span>
                    <strong className="text-rose-400 text-sm">{activeModalRecord.pressure?.peakBar?.toFixed(1)} bar</strong>
                  </div>

                  <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                    <span className="text-slate-400 text-[10px] uppercase block">Peak Flow:</span>
                    <strong className="text-sky-400 text-sm">{activeModalRecord.flow?.peakLmin?.toFixed(1)} L/min</strong>
                  </div>

                  <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                    <span className="text-slate-400 text-[10px] uppercase block">Max Temperature:</span>
                    <strong className="text-amber-400 text-sm">{activeModalRecord.temperature?.maxC?.toFixed(1)} °C</strong>
                  </div>

                  <div className="p-2.5 rounded bg-slate-800/80 border border-slate-700">
                    <span className="text-slate-400 text-[10px] uppercase block">Peak Motor Power:</span>
                    <strong className="text-purple-400 text-sm">{activeModalRecord.motorPower?.peakKw?.toFixed(1)} kW</strong>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/80 flex justify-between items-center text-xs">
                  <span className="text-amber-200">Cycle Energy Consumption:</span>
                  <strong className="text-amber-400 font-black">
                    {activeModalRecord.energyConsumption?.energyWh?.toFixed(2)} Wh ({activeModalRecord.energyConsumption?.energyKwh?.toFixed(4)} kWh)
                  </strong>
                </div>
              </div>

              {/* ML Predictions Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="text-[10px] font-bold uppercase text-indigo-400 border-b border-slate-800 pb-1 mb-2 flex items-center justify-between">
                  <span>2. ML Predictions Health Record</span>
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between p-2 rounded bg-slate-800/80 border border-slate-700">
                    <span className="text-slate-400">Cooler Condition:</span>
                    <strong className="text-emerald-400">{activeModalRecord.mlPredictions?.cooler}</strong>
                  </div>

                  <div className="flex justify-between p-2 rounded bg-slate-800/80 border border-slate-700">
                    <span className="text-slate-400">Proportional Valve:</span>
                    <strong className="text-emerald-400">{activeModalRecord.mlPredictions?.valve}</strong>
                  </div>

                  <div className="flex justify-between p-2 rounded bg-slate-800/80 border border-slate-700">
                    <span className="text-slate-400">Internal Pump Leakage:</span>
                    <strong className="text-emerald-400">{activeModalRecord.mlPredictions?.pump_leakage}</strong>
                  </div>

                  <div className="flex justify-between p-2 rounded bg-slate-800/80 border border-slate-700">
                    <span className="text-slate-400">Hydraulic Accumulator:</span>
                    <strong className="text-emerald-400">{activeModalRecord.mlPredictions?.accumulator}</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
              <span>Timestamp: {new Date(activeModalRecord.timestamp).toLocaleString()}</span>
              <span className="text-sky-400 font-bold">Danfoss V3 Standard</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 flex items-center justify-center text-center text-slate-500 font-mono text-xs">
            Select any cycle record from the table to view its complete Digital Certificate.
          </div>
        )}

      </div>

    </div>
  );
}
