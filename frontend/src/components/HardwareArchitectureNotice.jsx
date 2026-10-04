import React from 'react';
import { Server } from 'lucide-react';

export function HardwareArchitectureNotice() {
  return (
    <div className="industrial-card p-4 lg:p-6 mb-6">
      
      <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
        <Server className="w-4 h-4 text-blue-600" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Hardware Abstraction & Sensor Ingestion Architecture
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
        
        {/* Architectural Flow Diagram */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
            Decoupled Modular Data Pipeline
          </div>

          <div className="space-y-2 text-[10px]">
            <div className="p-2.5 rounded bg-white border border-blue-200 flex items-center justify-between shadow-2xs">
              <span className="font-bold text-blue-700">SIMULATED STREAM:</span>
              <span className="text-slate-600">Hydraulic Simulator → Node.js → Socket.IO → React</span>
            </div>

            <div className="p-2.5 rounded bg-white border border-emerald-200 flex items-center justify-between shadow-2xs">
              <span className="font-bold text-emerald-700">HARDWARE HOOK:</span>
              <span className="text-slate-600">Physical Sensors → ESP32 / PLC → Node.js → Socket.IO → React</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed">
            The frontend dashboard consumes standardized JSON telemetry packages. Swapping from simulated generator to physical sensor hardware or Modbus TCP PLCs requires zero layout changes.
          </p>
        </div>

        {/* Planned Sensor Hardware Table */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2">
            Hardware Sensor Specification Matrix
          </div>

          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between p-2 bg-white rounded border border-slate-100">
              <span className="text-rose-600 font-bold">1. Pressure Transducer:</span>
              <span className="text-slate-600">Piezoelectric 0–250 bar (4–20mA / Modbus)</span>
            </div>
            <div className="flex justify-between p-2 bg-white rounded border border-slate-100">
              <span className="text-sky-600 font-bold">2. Flow Meter:</span>
              <span className="text-slate-600">Turbine / Oval Gear 0–100 L/min (Pulse Output)</span>
            </div>
            <div className="flex justify-between p-2 bg-white rounded border border-slate-100">
              <span className="text-emerald-600 font-bold">3. Linear Position Transducer:</span>
              <span className="text-slate-600">LVDT / Magnetostrictive 0–300 mm (0–10V)</span>
            </div>
            <div className="flex justify-between p-2 bg-white rounded border border-slate-100">
              <span className="text-orange-600 font-bold">4. Temperature Sensor:</span>
              <span className="text-slate-600">PT100 RTD Thermocouple (-50 to 150 °C)</span>
            </div>
            <div className="flex justify-between p-2 bg-white rounded border border-slate-100">
              <span className="text-purple-600 font-bold">5. Motor Current CT:</span>
              <span className="text-slate-600">Hall-Effect Current Clamp 0–50A AC</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

