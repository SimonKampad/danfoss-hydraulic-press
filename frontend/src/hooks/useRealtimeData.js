import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../services/socket';

const getBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000`;
};

export function useRealtimeData() {
  const [connected, setConnected] = useState(socket.connected);
  const [systemStatus, setSystemStatus] = useState({
    status: 'RUNNING',
    speedMultiplier: 1.0,
    mode: 'DATASET_REPLAY',
    dataMode: 'DATASET_REPLAY',
    cycleNumber: 1,
    activeFault: null,
    scenarioId: 'NORMAL_OPERATION',
    scenarioName: 'Normal Operation',
    dataSource: 'ORIGINAL_DATASET_REPLAY',
    fastApiStatus: 'UNKNOWN',
    fastApiAvailable: false
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

  // Critical Alert State Machine:
  // 'NORMAL' -> 'CRITICAL_ALERT' -> 'STOPPING' -> 'SIMULATION_STOPPED'
  const [criticalAlert, setCriticalAlert] = useState({
    state: 'NORMAL',
    alertData: null,
    stopError: null,
    acknowledgedExcursionId: null
  });

  const isPausedTableRef = useRef(isPausedTable);
  const criticalAlertRef = useRef(criticalAlert);
  const systemStatusRef = useRef(systemStatus);

  useEffect(() => {
    isPausedTableRef.current = isPausedTable;
    criticalAlertRef.current = criticalAlert;
    systemStatusRef.current = systemStatus;
  }, [isPausedTable, criticalAlert, systemStatus]);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onSystemStatus(data) {
      setSystemStatus((prev) => ({ ...prev, ...data }));

      // If backend confirms STOPPED and we were in active alert or stopping,
      // transition to SIMULATION_STOPPED and close the blocking modal
      if (data.status === 'STOPPED') {
        setCriticalAlert((prev) => {
          if (prev.state === 'CRITICAL_ALERT' || prev.state === 'STOPPING') {
            return {
              ...prev,
              state: 'SIMULATION_STOPPED',
              stopError: null
            };
          }
          return prev;
        });
      }
    }

    function onSensorData(data) {
      // If simulation is stopped because of high pressure, do not advance incoming telemetry
      if (criticalAlertRef.current.state === 'SIMULATION_STOPPED') {
        return;
      }

      setCurrentPacket(data);

      // High pressure alarm evaluation (threshold: 235.0 bar)
      const pressureVal = typeof data.pressureBar === 'number' ? data.pressureBar : 0;
      const P_ALARM_LIMIT = 235.0;

      if (pressureVal >= P_ALARM_LIMIT || data.alert?.type === 'HIGH_PRESSURE_ALARM') {
        // Only trigger initial critical alert if currently NORMAL (prevents duplicate spam/popups)
        if (criticalAlertRef.current.state === 'NORMAL') {
          const excursionId = `excursion-${data.cycleNumber || 1}-${Date.now()}`;
          const alertRecord = {
            id: excursionId,
            title: 'HIGH PRESSURE DETECTED — STOP THE MACHINE SIMULATION',
            measuredPressure: Number(pressureVal.toFixed(1)),
            thresholdLimit: P_ALARM_LIMIT,
            cycleNumber: data.cycleNumber || systemStatusRef.current.cycleNumber || 1,
            timestamp: data.timeMs
              ? new Date(data.timeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : new Date().toLocaleTimeString(),
            isoTimestamp: new Date().toISOString(),
            message: 'Pressure is above the permitted limit. Stop the simulation and inspect the system.',
            sensor: 'PS1'
          };

          setCriticalAlert({
            state: 'CRITICAL_ALERT',
            alertData: alertRecord,
            stopError: null,
            acknowledgedExcursionId: excursionId
          });

          // Log into historical alerts list
          setAlerts((prev) => [
            {
              id: alertRecord.id,
              type: 'HIGH_PRESSURE_ALARM',
              severity: 'ALARM',
              message: `STOP — HIGH PRESSURE: Measured ${alertRecord.measuredPressure} bar exceeds permitted limit (${P_ALARM_LIMIT} bar)`,
              timestamp: alertRecord.isoTimestamp,
              source: 'PS1'
            },
            ...prev.slice(0, 49)
          ]);

          // Log into system event sequence
          setEventLog((prev) => [
            {
              id: `evt-${Date.now()}`,
              timestamp: alertRecord.isoTimestamp,
              timeFormatted: alertRecord.timestamp,
              event: `HIGH PRESSURE EXCURSION (${alertRecord.measuredPressure} bar) - STOP REQUIRED`,
              severity: 'ALARM',
              source: 'PS1'
            },
            ...prev.slice(0, 49)
          ]);
        }
      }

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
          cycle: data.cycleNumber,
          scenarioId: data.scenarioId
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
      setAlerts((prev) => {
        // Prevent duplicate alert spam within 5 seconds
        const isDuplicate = prev.some(a => a.message === alert.message && (Date.now() - new Date(a.timestamp).getTime()) < 5000);
        if (isDuplicate) return prev;
        return [alert, ...prev.slice(0, 49)];
      });

      setEventLog((prev) => [{
        id: alert.id || `alt-${Date.now()}`,
        timestamp: alert.timestamp || new Date().toISOString(),
        timeFormatted: new Date(alert.timestamp || Date.now()).toLocaleTimeString(),
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

  const startSimulation = useCallback(() => {
    socket.emit('simulation:start');
    try {
      fetch(`${getBackendUrl()}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      }).catch(() => {});
    } catch (_) {}
  }, []);

  const pauseSimulation = useCallback(() => {
    socket.emit('simulation:pause');
    try {
      fetch(`${getBackendUrl()}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' })
      }).catch(() => {});
    } catch (_) {}
  }, []);

  const resumeSimulation = useCallback(() => {
    socket.emit('simulation:resume');
    try {
      fetch(`${getBackendUrl()}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' })
      }).catch(() => {});
    } catch (_) {}
  }, []);

  // Single authoritative stop simulation handler
  const stopSimulation = useCallback(async () => {
    // If in critical alert state, switch to STOPPING
    if (criticalAlertRef.current.state === 'CRITICAL_ALERT') {
      setCriticalAlert((prev) => ({ ...prev, state: 'STOPPING', stopError: null }));
    }

    try {
      // 1. Send via Socket.IO
      socket.emit('simulation:stop');

      // 2. Also send via REST API with timeout to confirm backend response
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${getBackendUrl()}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error('Backend failed to confirm simulation stop');
      }

      // Backend stop confirmed!
      setSystemStatus((prev) => ({ ...prev, status: 'STOPPED' }));

      // Close blocking modal and transition to persistent SIMULATION_STOPPED state
      setCriticalAlert((prev) => {
        if (prev.state === 'CRITICAL_ALERT' || prev.state === 'STOPPING') {
          return {
            ...prev,
            state: 'SIMULATION_STOPPED',
            stopError: null
          };
        }
        return prev;
      });

      return { success: true };
    } catch (err) {
      console.error('[useRealtimeData] Stop simulation request failed:', err);
      // Keep alert visible and display clear error
      setCriticalAlert((prev) => {
        if (prev.state === 'STOPPING' || prev.state === 'CRITICAL_ALERT') {
          return {
            ...prev,
            state: 'CRITICAL_ALERT',
            stopError: err.message || 'Network error: backend did not confirm stop'
          };
        }
        return prev;
      });
      return { success: false, error: err.message };
    }
  }, []);

  // Reset handler: sends reset to backend, resets charts, preserves historical records
  const resetSimulation = useCallback(async () => {
    socket.emit('simulation:reset');
    try {
      await fetch(`${getBackendUrl()}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });
    } catch (err) {
      console.warn('[useRealtimeData] REST reset call error:', err);
    }

    // Reset rolling live chart window and table
    setChartHistory([]);
    setDataTable([]);

    // NOTE: Preserving historical alert records and digital records
    // Returning criticalAlert state to NORMAL so future runs can operate cleanly
    setCriticalAlert({
      state: 'NORMAL',
      alertData: null,
      stopError: null,
      acknowledgedExcursionId: null
    });
  }, []);

  const selectScenario = useCallback((scenarioId) => socket.emit('scenario:select', scenarioId), []);
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
    criticalAlert,
    controls: {
      startSimulation,
      pauseSimulation,
      stopSimulation,
      resumeSimulation,
      resetSimulation,
      selectScenario,
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
