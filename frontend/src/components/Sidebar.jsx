import React from 'react';
import { 
  LayoutDashboard, 
  LineChart, 
  SlidersHorizontal, 
  FileText, 
  Activity,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen, systemStatus, connected }) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Real-time live feeds & key metrics'
    },
    {
      id: 'analytics',
      label: 'Analytics & Graphs',
      icon: LineChart,
      description: 'Detailed interactive time-series charts'
    },
    {
      id: 'operations',
      label: 'Operations & Controls',
      icon: SlidersHorizontal,
      description: 'System controls, logs & telemetry table'
    },
    {
      id: 'settings',
      label: 'Settings & Reports',
      icon: FileText,
      description: 'AI Diagnostics & Hardware spec matrix'
    }
  ];

  const isRunning = systemStatus?.status === 'RUNNING';

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Left Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'}
      `}>
        <div>
          {/* Top Brand Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm tracking-tight block leading-none">
                  Press Telemetry
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Control System v3.0</span>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Section */}
          <div className="p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2 font-mono">
              Main Menu
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition cursor-pointer group
                      ${isActive 
                        ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/80 shadow-2xs' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{item.label}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer System Status */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 font-medium">System Telemetry</span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              isRunning ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isRunning ? 'RUNNING' : 'IDLE'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span>{connected ? 'Socket Live' : 'Offline'}</span>
          </div>
        </div>

      </aside>
    </>
  );
}
