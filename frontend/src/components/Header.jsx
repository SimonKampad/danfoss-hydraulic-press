import React from 'react';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Octagon,
  Database,
  LayoutDashboard,
  LineChart,
  Cpu,
  Zap,
  FileCheck,
  Sliders
} from 'lucide-react';

export function Header({
  connected,
  systemStatus,
  controls,
  activeTab,
  setActiveTab
}) {
  const isRunning = systemStatus.status === 'RUNNING';
  const isPaused = systemStatus.status === 'PAUSED';
  const isStopped = systemStatus.status === 'STOPPED';
  const isDatasetMode = (systemStatus.mode || systemStatus.dataMode) === 'DATASET_REPLAY';
  const activeCycleNum = systemStatus.cycleNumber || 1;
  const activeScenarioName = systemStatus.scenarioName || 'Normal Operation';

  const navItems = [
    { id: 'main', label: 'Main Dashboard', icon: LayoutDashboard },
    { id: 'cycle', label: 'Cycle Analysis', icon: LineChart },
    { id: 'energy', label: 'Energy Analytics', icon: Zap },
    { id: 'optimization', label: 'Parameter Optimization', icon: Sliders },
    { id: 'traceability', label: 'Digital Traceability', icon: FileCheck },
    { id: 'ml', label: 'Component Condition (ML)', icon: Cpu }
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs w-full">
      
      {/* Top Control Bar: Branding, System State & Authoritative Controls */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Left: Modest, Professional Branding */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl font-bold shadow-xs shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-none uppercase font-mono">
                DANFOSS HYDRAULIC PRESS
              </h1>
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 hidden sm:inline-block">
                MONITORING
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium font-mono mt-0.5">
              Hydraulic Press Condition Monitoring & Cycle Telemetry
            </p>
          </div>
        </div>

        {/* Center: Connection Status, Operating Mode, Scenario & Cycle Picker */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          
          {/* Connection Status Badge */}
          <div
            title={connected ? "Connected to backend telemetry stream" : "Disconnected from backend server"}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-bold transition ${
              connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span>{connected ? 'CONNECTED' : 'OFFLINE'}</span>
          </div>

          {/* Operating Mode Toggle (Simulation vs Recorded Data) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 font-bold">
            <button
              type="button"
              onClick={() => controls.setSystemMode('SIMULATION')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer text-[11px] ${
                !isDatasetMode ? 'bg-white text-blue-700 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Simulation
            </button>
            <button
              type="button"
              onClick={() => controls.setSystemMode('DATASET_REPLAY')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer text-[11px] flex items-center gap-1 ${
                isDatasetMode ? 'bg-white text-blue-700 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="w-3 h-3 text-blue-600" />
              Recorded Data
            </button>
          </div>

          {/* Compact Cycle Indicator & Dataset Cycle Selector */}
          <div className="flex items-center gap-1 bg-slate-50 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-[11px]">
            <span className="text-slate-500">Cycle:</span>
            {isDatasetMode ? (
              <select
                value={activeCycleNum}
                onChange={(e) => controls.selectDatasetCycle(parseInt(e.target.value, 10))}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[11px] font-bold text-slate-900 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                title="Select recorded cycle"
              >
                {[1, 5, 10, 21, 50, 100, 250, 500, 1000, 1500, 2000, 2205].map((num) => (
                  <option key={num} value={num}>#{num}</option>
                ))}
              </select>
            ) : (
              <span className="text-blue-700 font-black">#{activeCycleNum}</span>
            )}
          </div>

          {/* Compact Active Scenario Pill */}
          <div className="hidden md:flex items-center gap-1 bg-blue-50 text-blue-900 px-2.5 py-1 rounded-lg border border-blue-200 font-bold text-[11px]">
            <span className="text-blue-500 font-normal">Scenario:</span>
            <span className="truncate max-w-[130px]" title={activeScenarioName}>{activeScenarioName}</span>
          </div>

        </div>

        {/* Right: Authoritative Primary Simulation Controls */}
        <div className="flex items-center gap-2">
          
          {/* Start / Resume Button */}
          {isRunning ? (
            <button
              type="button"
              onClick={controls.pauseSimulation}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-2xs active:scale-95 cursor-pointer font-mono"
              title="Pause Simulation"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if ((isStopped || isPaused) && controls.resumeSimulation) controls.resumeSimulation();
                else controls.startSimulation();
              }}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-2xs active:scale-95 cursor-pointer font-mono"
              title={isStopped || isPaused ? "Resume Simulation" : "Start Simulation"}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isStopped || isPaused ? 'RESUME' : 'START'}</span>
            </button>
          )}

          {/* STOP Button (Authoritative Software Stop) */}
          <button
            type="button"
            onClick={controls.stopSimulation}
            disabled={isStopped}
            className={`flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-lg transition shadow-2xs font-mono ${
              isStopped
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white active:scale-95 cursor-pointer ring-1 ring-rose-400 shadow-rose-600/20'
            }`}
            title="Stop Software Simulation"
          >
            <Octagon className="w-3.5 h-3.5 fill-current" />
            <span>STOP</span>
          </button>

          {/* RESET Button */}
          <button
            type="button"
            onClick={controls.resetSimulation}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition active:scale-95 cursor-pointer font-mono"
            title="Reset Simulation Clock"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESET</span>
          </button>

        </div>

      </div>

      {/* Clean Navigation Bar - Strictly Operational, No Unnecessary Judge/Presentation Text */}
      <div className="w-full px-4 sm:px-6 lg:px-8 bg-slate-50 border-t border-slate-100 overflow-x-auto">
        <nav className="flex items-center space-x-1.5 py-1.5 font-mono min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`
                  flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs transition cursor-pointer
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }
                `}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

    </header>
  );
}
