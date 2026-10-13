import React, { useState } from 'react';
import { useRealtimeData } from '../hooks/useRealtimeData';
import { Header } from '../components/Header';
import { MainDashboardView } from '../components/MainDashboardView';
import { CycleAnalysisView } from '../components/CycleAnalysisView';
import { EnergyAnalyticsView } from '../components/EnergyAnalyticsView';
import { ParameterOptimizationView } from '../components/ParameterOptimizationView';
import { DigitalTraceabilityView } from '../components/DigitalTraceabilityView';
import { MLPredictionsView } from '../components/MLPredictionsView';
import { CriticalAlertModal } from '../components/CriticalAlertModal';
import { CriticalStatusBanner } from '../components/CriticalStatusBanner';
import { AlertReviewModal } from '../components/AlertReviewModal';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('main'); // 'main' | 'cycle' | 'energy' | 'optimization' | 'traceability' | 'ml'
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const {
    connected,
    systemStatus,
    currentPacket,
    chartHistory,
    performanceStats,
    analyticsReport,
    mlPrediction,
    optimizationReport,
    digitalRecords,
    alerts,
    criticalAlert,
    controls
  } = useRealtimeData();

  const isDatasetMode = (systemStatus.mode || systemStatus.dataMode) === 'DATASET_REPLAY';
  const activeCycleNum = currentPacket?.cycleNumber || systemStatus.cycleNumber || 1;

  const isCriticalModalOpen = criticalAlert.state === 'CRITICAL_ALERT' || criticalAlert.state === 'STOPPING';
  const isSimulationStoppedByAlarm = criticalAlert.state === 'SIMULATION_STOPPED';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col selection:bg-blue-600 selection:text-white w-full">
      
      {/* 1. Top Clean Header with Navigation & Primary Controls */}
      <Header
        connected={connected}
        systemStatus={systemStatus}
        controls={controls}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* 2. Persistent Blocking Critical High-Pressure Alert Modal */}
      <CriticalAlertModal
        isOpen={isCriticalModalOpen}
        alertData={criticalAlert.alertData}
        isStopping={criticalAlert.state === 'STOPPING'}
        stopError={criticalAlert.stopError}
        onStop={controls.stopSimulation}
      />

      {/* 3. Post-Stop Alert Review Modal */}
      <AlertReviewModal
        isOpen={isReviewOpen}
        alertData={criticalAlert.alertData}
        onClose={() => setIsReviewOpen(false)}
        onReset={controls.resetSimulation}
      />

      {/* 4. Full-Width Main Dashboard Shell */}
      <main className="w-full flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Persistent High-Pressure Stopped Status Banner */}
        {isSimulationStoppedByAlarm && (
          <CriticalStatusBanner
            alertData={criticalAlert.alertData}
            onReview={() => setIsReviewOpen(true)}
            onReset={controls.resetSimulation}
          />
        )}

        {/* SECTION A: MAIN DASHBOARD */}
        {activeTab === 'main' && (
          <MainDashboardView
            connected={connected}
            systemStatus={systemStatus}
            currentPacket={currentPacket}
            chartHistory={chartHistory}
            performanceStats={performanceStats}
            analyticsReport={analyticsReport}
            alerts={alerts}
            isDatasetMode={isDatasetMode}
            activeCycleNum={activeCycleNum}
            controls={controls}
          />
        )}

        {/* SECTION B: CYCLE ANALYSIS */}
        {activeTab === 'cycle' && (
          <CycleAnalysisView
            currentPacket={currentPacket}
            chartHistory={chartHistory}
            systemStatus={systemStatus}
            isDatasetMode={isDatasetMode}
            activeCycleNum={activeCycleNum}
          />
        )}

        {/* SECTION C: ENERGY ANALYTICS */}
        {activeTab === 'energy' && (
          <EnergyAnalyticsView
            performanceStats={performanceStats}
            currentPacket={currentPacket}
            chartHistory={chartHistory}
            systemStatus={systemStatus}
            isDatasetMode={isDatasetMode}
            activeCycleNum={activeCycleNum}
          />
        )}

        {/* SECTION D: PARAMETER OPTIMIZATION */}
        {activeTab === 'optimization' && (
          <ParameterOptimizationView
            optimizationReport={optimizationReport}
            performanceStats={performanceStats}
            currentPacket={currentPacket}
            systemStatus={systemStatus}
            activeCycleNum={activeCycleNum}
          />
        )}

        {/* SECTION E: DIGITAL TRACEABILITY */}
        {activeTab === 'traceability' && (
          <DigitalTraceabilityView
            digitalRecords={digitalRecords}
            currentPacket={currentPacket}
            systemStatus={systemStatus}
            isDatasetMode={isDatasetMode}
            activeCycleNum={activeCycleNum}
            onSelectCycle={controls.selectDatasetCycle}
          />
        )}

        {/* SECTION F: COMPONENT CONDITION (ML PREDICTIONS) */}
        {activeTab === 'ml' && (
          <MLPredictionsView
            mlPrediction={mlPrediction}
            isDatasetMode={isDatasetMode}
            activeCycleNum={activeCycleNum}
          />
        )}

      </main>

      {/* 5. Full-Width Footer */}
      <footer className="w-full py-4 px-4 sm:px-6 lg:px-8 text-xs font-mono text-slate-500 border-t border-slate-200 bg-white mt-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>DANFOSS HYDRAULIC PRESS MONITORING SYSTEM</span>
        <span>Real-Time Telemetry &bull; Condition Monitoring &bull; Software Simulation Control</span>
      </footer>

    </div>
  );
}
