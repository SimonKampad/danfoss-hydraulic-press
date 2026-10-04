import React from 'react';
import { AlertTriangle, ShieldAlert, Bell, Info, Trash2, ShieldCheck } from 'lucide-react';

export function AlertPanel({ alerts, eventLog, controls }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      
      {/* Left Column: Active Alerts */}
      <div className="industrial-card p-4 lg:p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Active System Alerts & Warnings
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500">
                Threshold Monitoring
              </span>
              {alerts.length > 0 && (
                <button
                  onClick={controls.clearAlerts}
                  className="text-[10px] text-slate-600 hover:text-rose-600 flex items-center gap-1 border border-slate-300 px-2 py-0.5 rounded cursor-pointer transition bg-white"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-mono text-xs flex flex-col items-center gap-2">
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
                <span className="font-semibold text-slate-700">No Active Threshold Excursions</span>
                <span className="text-[10px] text-slate-400">All hydraulic metrics operating within normal parameters</span>
              </div>
            ) : (
              alerts.map((alt) => {
                const isAlarm = alt.severity === 'ALARM';
                return (
                  <div
                    key={alt.id || Math.random()}
                    className={`p-3 rounded-lg border font-mono text-xs flex items-start gap-3 transition-all ${
                      isAlarm
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${isAlarm ? 'text-rose-600 animate-pulse' : 'text-amber-600'}`} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-bold uppercase tracking-wide text-[11px]">
                          {alt.type || 'SYSTEM ALERT'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(alt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 leading-tight font-medium">
                        {alt.message}
                      </p>
                      {alt.source && (
                        <span className="inline-block mt-1 text-[9px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-500">
                          Source: {alt.source}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Live Event Log */}
      <div className="industrial-card p-4 lg:p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                System Event Sequence Log
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              Latest {eventLog.length} events
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto pr-1">
            <table className="w-full text-left font-mono text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-[10px] uppercase font-bold">
                  <th className="py-2 px-2.5">Time</th>
                  <th className="py-2 px-2.5">Event Description</th>
                  <th className="py-2 px-2.5">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {eventLog.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-6 text-center text-slate-400">
                      Listening for cycle transitions & system events...
                    </td>
                  </tr>
                ) : (
                  eventLog.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-2 px-2.5 text-slate-500 whitespace-nowrap">
                        {log.timeFormatted || new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-2.5 text-slate-800 font-medium">
                        {log.event}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          log.severity === 'ALARM'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : (log.severity === 'WARNING'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200')
                        }`}>
                          {log.severity || 'INFO'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}

