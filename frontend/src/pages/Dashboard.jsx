import React, { useState } from 'react';
import { useRealtimeData } from '../hooks/useRealtimeData';
import { Header } from '../components/Header';
import { MainDashboardView } from '../components/MainDashboardView';
import { CycleAnalysisView } from '../components/CycleAnalysisView';
import { MLPredictionsView } from '../components/MLPredictionsView';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('main'); // 'main' | 'cycle' | 'ml'

  const {
    connected,
    systemStatus,
    currentPacket,
    chartHistory,
    analyticsReport,
    mlPrediction,
    alerts,
    controls
  } = useRealtimeData();

  const isDatasetMode = (systemStatus.mode || systemStatus.dataMode) === 'DATASET_REPLAY';
  const activeCycleNum = currentPacket?.cycleNumber || systemStatus.cycleNumber || 1;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Top Clean Header with Navigation Bar */}
      <Header
        connected={connected}
        systemStatus={systemStatus}
        controls={controls}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Presentation Container */}
      <main className="p-4 lg:p-8 flex-1 max-w-7xl w-full mx-auto space-y-6">
        
        {/* PAGE 1: MAIN DASHBOARD */}
        {activeTab === 'main' && (
          <MainDashboardView
            connected={connected}
            systemStatus={systemStatus}
            currentPacket={currentPacket}
            chartHistory={chartHistory}
            analyticsReport={analyticsReport}
            alerts={alerts}
            isDatasetMode={isDatasetMode}
            activeCycleNum={activeCycleNum}
          />
        )}

        {/* PAGE 2: HYDRAULIC CYCLE ANALYSIS */}
        {activeTab === 'cycle' && (
          <CycleAnalysisView
            currentPacket={currentPacket}
            chartHistory={chartHistory}
            systemStatus={systemStatus}
            isDatasetMode={isDatasetMode}
            activeCycleNum={activeCycleNum}
          />
        )}

        {/* PAGE 3: ML COMPONENT PREDICTIONS */}
        {activeTab === 'ml' && (
          <MLPredictionsView
            mlPrediction={mlPrediction}
            isDatasetMode={isDatasetMode}
            activeCycleNum={activeCycleNum}
          />
        )}

      </main>

      {/* Presentation Footer */}
      <footer className="py-4 px-6 text-center text-xs font-mono text-slate-500 border-t border-slate-200 bg-white mt-auto flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl w-full mx-auto">
        <span>DANFOSS HYDRAULIC PRESS SYSTEM &bull; VERSION 3</span>
        <span>Real-Time Telemetry & Condition Monitoring Dashboard</span>
      </footer>

    </div>
  );
}
