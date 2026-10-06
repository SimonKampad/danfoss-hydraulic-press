import React from 'react';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Radio,
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
  const isDatasetMode = (systemStatus.mode || systemStatus.dataMode) === 'DATASET_REPLAY';
  const activeCycleNum = systemStatus.cycleNumber || 1;

  const navItems = [
    { id: 'main', label: 'Main Dashboard', icon: LayoutDashboard },
    { id: 'cycle', label: 'Cycle Analysis', icon: LineChart },
    { id: 'energy', label: 'Energy Analytics', icon: Zap },
    { id: 'optimization', label: 'Parameter Optimization', icon: Sliders },
    { id: 'traceability', label: 'Digital Traceability', icon: FileCheck },
    { id: 'ml', label: 'ML Predictions', icon: Cpu }
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      
      {/* Top Bar: Title & Global Status Controls */}
      <div className="px-4 lg:px-8 py-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Brand & Main Title */}
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2.5 rounded-xl font-bold shadow-xs">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight leading-none uppercase font-mono">
              DANFOSS HYDRAULIC PRESS
            </h1>
            <p className="text-xs text-slate-500 font-medium font-mono mt-1">
              System Condition Monitoring & Hydraulic Press Cycle Analytics
            </p>
          </div>
        </div>

        {/* Center: System Status & Dataset Select */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          
          {/* Socket Connection Badge */}
          <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 font-bold ${
            connected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-50'}`} />
            <span>{connected ? 'CONNECTED' : 'DISCONNECTED'}</span>
          </div>

          {/* Mode Selector Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 font-bold">
            <button
              onClick={() => controls.setSystemMode('SIMULATION')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                !isDatasetMode ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Simulation
            </button>
            <button
              onClick={() => controls.setSystemMode('DATASET_REPLAY')}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                isDatasetMode ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              Dataset Replay
            </button>
          </div>

          {/* Dataset Cycle Picker Dropdown (when dataset mode active) */}
          {isDatasetMode && (
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-900 px-3 py-1 rounded-lg border border-blue-200 font-bold">
              <span>Cycle #:</span>
              <select
                value={activeCycleNum}
                onChange={(e) => controls.selectDatasetCycle(parseInt(e.target.value, 10))}
                className="bg-white border border-blue-300 rounded px-2 py-0.5 text-xs font-bold text-slate-900 cursor-pointer focus:outline-none"
              >
                {[1, 5, 10, 21, 50, 100, 250, 500, 1000, 1500, 2000, 2205].map((num) => (
                  <option key={num} value={num}>Cycle {num}</option>
                ))}
              </select>
            </div>
          )}

        </div>

        {/* Quick Simulation Controls */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={controls.pauseSimulation}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition shadow-2xs active:scale-95 cursor-pointer font-mono"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE</span>
            </button>
          ) : (
            <button
              onClick={controls.startSimulation}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition shadow-2xs active:scale-95 cursor-pointer font-mono"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START</span>
            </button>
          )}

          <button
            onClick={controls.resetSimulation}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition active:scale-95 cursor-pointer font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESET</span>
          </button>
        </div>

      </div>

      {/* Navigation Subheader Tab Bar (EXACTLY 3 MAJOR PAGES) */}
      <div className="px-4 lg:px-8 bg-slate-50 flex items-center justify-between border-t border-slate-100 font-mono">
        <nav className="flex items-center space-x-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer
                  ${isActive
                    ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700'
                    : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:block text-xs font-mono text-slate-500 font-semibold">
          Presentation Mode &bull; Danfoss Mentors & Judges Review
        </div>
      </div>

    </header>
  );
}
