import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../services/socket';

export function useRealtimeData() {
  const [connected, setConnected] = useState(socket.connected);
  const [systemStatus, setSystemStatus] = useState({
    status: 'RUNNING',
    speedMultiplier: 1.0,
    mode: 'SIMULATION',
    dataMode: 'SIMULATION',
    cycleNumber: 1,
    activeFault: null
  });

  const [currentPacket, setCurrentPacket] = useState(null);
  const [chartHistory, setChartHistory] = useState([]);
  const [dataTable, setDataTable] = useState([]);
  const [isPausedTable, setIsPausedTable] = useState(false);

  const [performanceStats, setPerformanceStats] = useState(null);
  const [analyticsReport, setAnalyticsReport] = useState(null);
  const [mlPrediction, setMlPrediction] = useState(null);
  const [optimizationReport, setOptimizationReport] = useState(null);
  const [digitalRecords, setDigitalRecords] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [eventLog, setEventLog] = useState([]);

  const isPausedTableRef = useRef(isPausedTable);
  isPausedTableRef.current = isPausedTable;

  useEffect(() => {
    function onConnect() {
      setConnected(true);
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onSystemStatus(data) {
      setSystemStatus((prev) => ({ ...prev, ...data }));
    }

    function onSensorData(data) {
      setCurrentPacket(data);

      // Rolling chart window (max 120 data points)
      setChartHistory((prev) => {
        const next = [...prev, {
          time: new Date(data.timeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 }),
          pressure: data.pressureBar,
          flow: data.flowLmin,
          speed: data.speedMmS,
          position: data.positionMm,
          temperature: data.temperatureC,
          motorCurrent: data.motorCurrentA,
          phase: data.phase,
          cycle: data.cycleNumber
        }];
        if (next.length > 120) next.shift();
        return next;
      });

      // Data table history
      if (!isPausedTableRef.current) {
        setDataTable((prev) => [data, ...prev.slice(0, 49)]);
      }
    }

    function onCycleEvent(event) {
      setEventLog((prev) => [{
        id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        timestamp: event.timestamp,
        timeFormatted: new Date(event.timestamp).toLocaleTimeString(),
        event: `${event.phaseName} (Cycle #${event.cycleNumber})`,
        severity: 'INFO',
        cycleNumber: event.cycleNumber
      }, ...prev.slice(0, 49)]);
    }

    function onAlertEvent(alert) {
      setAlerts((prev) => [alert, ...prev.slice(0, 49)]);
      setEventLog((prev) => [{
        id: alert.id,
        timestamp: alert.timestamp,
        timeFormatted: new Date(alert.timestamp).toLocaleTimeString(),
        event: alert.message,
        severity: alert.severity,
        source: alert.source
      }, ...prev.slice(0, 49)]);
    }

    function onPerformanceUpdate(stats) {
      setPerformanceStats(stats);
    }

    function onAnalyticsUpdate(report) {
      setAnalyticsReport(report);
    }

    function onMlPrediction(data) {
      setMlPrediction(data);
    }

    function onOptimizationUpdate(report) {
      setOptimizationReport(report);
    }

    function onDigitalRecords(records) {
      if (Array.isArray(records)) {
        setDigitalRecords(records);
      }
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('system_status', onSystemStatus);
    socket.on('sensor_data', onSensorData);
    socket.on('cycle_event', onCycleEvent);
    socket.on('alert_event', onAlertEvent);
    socket.on('performance_update', onPerformanceUpdate);
    socket.on('analytics_update', onAnalyticsUpdate);
    socket.on('ml_prediction', onMlPrediction);
    socket.on('optimization_update', onOptimizationUpdate);
    socket.on('digital_records_update', onDigitalRecords);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('system_status', onSystemStatus);
      socket.off('sensor_data', onSensorData);
      socket.off('cycle_event', onCycleEvent);
      socket.off('alert_event', onAlertEvent);
      socket.off('performance_update', onPerformanceUpdate);
      socket.off('analytics_update', onAnalyticsUpdate);
      socket.off('ml_prediction', onMlPrediction);
      socket.off('optimization_update', onOptimizationUpdate);
      socket.off('digital_records_update', onDigitalRecords);
    };
  }, []);

  const startSimulation = useCallback(() => socket.emit('simulation:start'), []);
  const pauseSimulation = useCallback(() => socket.emit('simulation:pause'), []);
  const resetSimulation = useCallback(() => {
    socket.emit('simulation:reset');
    setChartHistory([]);
    setDataTable([]);
    setAlerts([]);
    setEventLog([]);
  }, []);
  const setSpeedMultiplier = useCallback((mult) => socket.emit('simulation:setSpeed', mult), []);
  const injectFault = useCallback((type, severity = 'WARNING') => socket.emit('simulation:injectFault', { type, severity }), []);
  const clearFault = useCallback(() => socket.emit('simulation:clearFault'), []);
  const clearAlerts = useCallback(() => setAlerts([]), []);
  const clearDataTable = useCallback(() => setDataTable([]), []);

  const setSystemMode = useCallback((mode) => socket.emit('simulation:setMode', mode), []);
  const selectDatasetCycle = useCallback((cycleNum) => socket.emit('simulation:selectCycle', cycleNum), []);
  const runDiagnosticTest = useCallback((testType, scenario, value) => {
    socket.emit('simulation:runDiagnosticTest', { testType, scenario, value });
  }, []);

  return {
    connected,
    systemStatus,
    currentPacket,
    chartHistory,
    dataTable,
    isPausedTable,
    setIsPausedTable,
    performanceStats,
    analyticsReport,
    mlPrediction,
    optimizationReport,
    digitalRecords,
    alerts,
    eventLog,
    controls: {
      startSimulation,
      pauseSimulation,
      resetSimulation,
      setSpeedMultiplier,
      injectFault,
      clearFault,
      clearAlerts,
      clearDataTable,
      setSystemMode,
      selectDatasetCycle,
      runDiagnosticTest
    }
  };
}

