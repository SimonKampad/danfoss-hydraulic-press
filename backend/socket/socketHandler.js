import { SCENARIOS } from '../services/scenarioEngine.js';

export function setupSocketHandler(io, simulator, performanceService, analyticsService, datasetEngine, traceabilityService, optimizationService, getMode, setMode) {
  
  async function triggerMlPrediction(cycleNum, scenarioId = datasetEngine?.currentScenarioId) {
    if (!datasetEngine) return;
    try {
      const mlResult = await datasetEngine.runMlPredictionForCycle(cycleNum, scenarioId);
      io.emit('ml_prediction', mlResult);

      if (traceabilityService) {
        traceabilityService.recordCycle({
          cycleNumber: cycleNum,
          stats: performanceService.getStats(),
          analytics: analyticsService.getAnalyticsReport(),
          mlPrediction: mlResult
        });
        io.emit('digital_records_update', traceabilityService.getRecords());
      }
    } catch (err) {
      console.error(`[SocketHandler] Error triggering ML prediction for cycle ${cycleNum}:`, err.message);
    }
  }

  // Initial trigger on server startup
  triggerMlPrediction(1);

  // Background FastAPI Health Check Polling (Every 15s)
  // This automatically recovers status to ONLINE when Render FastAPI wakes up from inactivity
  setInterval(async () => {
    if (datasetEngine) {
      const prevAvailable = datasetEngine.isFastApiAvailable;
      const health = await datasetEngine.checkFastApiHealth(3000);
      
      // If FastAPI just recovered from offline, broadcast update and run prediction
      if (health.available && !prevAvailable) {
        console.log(`[SocketHandler] FastAPI service detected ONLINE at ${health.url} (${health.latencyMs}ms). Triggering ML update.`);
        io.emit('system_status', {
          fastApiStatus: 'ONLINE',
          fastApiAvailable: true,
          modelsLoaded: health.modelsLoaded
        });
        const activeCycle = getMode() === 'DATASET_REPLAY' ? datasetEngine.currentCycleNumber : simulator.cycleNumber;
        triggerMlPrediction(activeCycle);
      }
    }
  }, 15000);

  // Simulator event subscriptions
  simulator.onData(async (sensorPacket) => {
    const mode = getMode ? getMode() : 'SIMULATION';
    const activeScenarioId = datasetEngine?.currentScenarioId || 'NORMAL_OPERATION';
    const activeScenario = SCENARIOS[activeScenarioId] || SCENARIOS.NORMAL_OPERATION;

    if (mode === 'SIMULATION') {
      const enhancedPacket = {
        ...sensorPacket,
        scenarioId: activeScenario.id,
        scenarioName: activeScenario.name,
        dataSource: 'SYNTHETIC_SIMULATION'
      };

      performanceService.recordData(enhancedPacket);
      analyticsService.processSample(enhancedPacket);
      io.emit('sensor_data', enhancedPacket);
    } else if (mode === 'DATASET_REPLAY') {
      try {
        const cycleNum = datasetEngine.currentCycleNumber;
        const rawSensors = await datasetEngine.loadCycleRawSensors(cycleNum);
        
        const totalCycleDuration = 9.25; // seconds
        const progressRatio = (simulator.cycleElapsedTime % totalCycleDuration) / totalCycleDuration;
        const frame = datasetEngine.generateTelemetryFrame(rawSensors, cycleNum, progressRatio, simulator.totalElapsedTime, activeScenarioId);
        
        performanceService.recordData(frame);
        analyticsService.processSample(frame);
        
        // Single authoritative telemetry emission for all frontend consumers
        io.emit('sensor_data', frame);

        // If an immediate alert was triggered in frame, broadcast alert_event
        if (frame.alert) {
          io.emit('alert_event', frame.alert);
        }
      } catch (err) {
        // Safe fallback if raw dataset read hiccup
        io.emit('sensor_data', {
          ...sensorPacket,
          dataMode: 'DATASET_REPLAY',
          scenarioId: activeScenario.id,
          scenarioName: activeScenario.name,
          dataSource: activeScenario.dataSource
        });
      }
    }
  });

  simulator.onPhaseChange((event) => {
    const mode = getMode ? getMode() : 'SIMULATION';
    io.emit('cycle_event', event);
    io.emit('performance_update', performanceService.getStats());
    io.emit('analytics_update', analyticsService.getAnalyticsReport());

    if (optimizationService) {
      io.emit('optimization_update', optimizationService.generateOptimizationReport(performanceService.getStats()));
    }

    // When a cycle completes (transitions back to FAST_DOWN), trigger ML prediction and record digital cycle trace
    if (event.phase === 'FAST_DOWN') {
      const cycleToPredict = mode === 'DATASET_REPLAY' ? datasetEngine.currentCycleNumber : simulator.cycleNumber;
      triggerMlPrediction(cycleToPredict);
      
      if (traceabilityService) {
        traceabilityService.recordCycle({
          cycleNumber: cycleToPredict,
          stats: performanceService.getStats(),
          analytics: analyticsService.getAnalyticsReport(),
          mlPrediction: datasetEngine?.lastMlPrediction
        });
        io.emit('digital_records_update', traceabilityService.getRecords());
      }
    }
  });

  simulator.onAlert((alertObj) => {
    io.emit('alert_event', alertObj);
  });

  // Socket connection handling
  io.on('connection', async (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    const mode = getMode ? getMode() : 'SIMULATION';
    const activeScenarioId = datasetEngine?.currentScenarioId || 'NORMAL_OPERATION';
    const activeScenario = SCENARIOS[activeScenarioId] || SCENARIOS.NORMAL_OPERATION;

    // Send initial snapshot
    socket.emit('system_status', {
      status: simulator.status,
      speedMultiplier: simulator.speedMultiplier,
      mode: mode,
      dataMode: mode,
      cycleNumber: mode === 'DATASET_REPLAY' ? datasetEngine.currentCycleNumber : simulator.cycleNumber,
      activeFault: simulator.activeFault,
      scenarioId: activeScenario.id,
      scenarioName: activeScenario.name,
      dataSource: activeScenario.dataSource,
      fastApiStatus: datasetEngine?.fastApiStatus || 'UNKNOWN',
      fastApiAvailable: datasetEngine?.isFastApiAvailable || false
    });

    socket.emit('performance_update', performanceService.getStats());
    socket.emit('analytics_update', analyticsService.getAnalyticsReport());

    if (optimizationService) {
      socket.emit('optimization_update', optimizationService.generateOptimizationReport(performanceService.getStats()));
    }

    if (traceabilityService) {
      socket.emit('digital_records_update', traceabilityService.getRecords());
    }

    // Send last cached ML prediction on connect
    if (datasetEngine && datasetEngine.lastMlPrediction) {
      socket.emit('ml_prediction', datasetEngine.lastMlPrediction);
    } else {
      triggerMlPrediction(1);
    }

    // --- CLIENT UI CONTROLS ---

    socket.on('simulation:start', () => {
      simulator.start();
      io.emit('system_status', {
        status: simulator.status,
        speedMultiplier: simulator.speedMultiplier,
        mode: getMode()
      });
    });

    socket.on('simulation:pause', () => {
      simulator.pause();
      io.emit('system_status', {
        status: simulator.status,
        speedMultiplier: simulator.speedMultiplier,
        mode: getMode()
      });
    });

    socket.on('simulation:stop', () => {
      simulator.stop();
      console.log(`[SocketHandler] Simulation stopped by operator control.`);
      io.emit('system_status', {
        status: 'STOPPED',
        speedMultiplier: simulator.speedMultiplier,
        mode: getMode()
      });
    });

    socket.on('simulation:resume', () => {
      simulator.resume();
      console.log(`[SocketHandler] Simulation resumed.`);
      io.emit('system_status', {
        status: simulator.status,
        speedMultiplier: simulator.speedMultiplier,
        mode: getMode()
      });
    });

    socket.on('simulation:reset', () => {
      simulator.reset();
      performanceService.reset();
      io.emit('system_status', {
        status: simulator.status,
        speedMultiplier: simulator.speedMultiplier,
        mode: getMode()
      });
      io.emit('performance_update', performanceService.getStats());
      io.emit('analytics_update', analyticsService.getAnalyticsReport());
      triggerMlPrediction(getMode() === 'DATASET_REPLAY' ? datasetEngine.currentCycleNumber : 1);
    });

    socket.on('scenario:select', async (scenarioId) => {
      const selected = datasetEngine.setScenario(scenarioId);
      console.log(`[SocketHandler] Operator selected scenario: ${selected.name}`);

      // Auto-switch mode to DATASET_REPLAY if component fault or normal replay
      if (setMode && (selected.dataSource === 'REAL_FAULT_REPLAY' || selected.dataSource === 'ORIGINAL_DATASET_REPLAY' || selected.dataSource === 'SYNTHETIC_FAULT_SIMULATION')) {
        setMode('DATASET_REPLAY');
      }

      // Trigger immediate ML prediction for the active scenario
      triggerMlPrediction(datasetEngine.currentCycleNumber, selected.id);

      io.emit('system_status', {
        mode: getMode(),
        dataMode: getMode(),
        scenarioId: selected.id,
        scenarioName: selected.name,
        dataSource: selected.dataSource,
        cycleNumber: datasetEngine.currentCycleNumber,
        status: simulator.status
      });
    });

    socket.on('simulation:setMode', async (newMode) => {
      if (setMode) setMode(newMode);
      console.log(`[SocketHandler] System mode changed to: ${newMode}`);
      io.emit('system_status', {
        mode: newMode,
        dataMode: newMode,
        cycleNumber: newMode === 'DATASET_REPLAY' ? datasetEngine.currentCycleNumber : simulator.cycleNumber
      });
      if (newMode === 'DATASET_REPLAY') {
        triggerMlPrediction(datasetEngine.currentCycleNumber);
      }
    });

    socket.on('simulation:selectCycle', async (cycleNum) => {
      const parsedCycle = Math.max(1, Math.min(datasetEngine.maxCycles, parseInt(cycleNum, 10) || 1));
      datasetEngine.currentCycleNumber = parsedCycle;
      console.log(`[SocketHandler] Dataset cycle selected: ${parsedCycle}`);
      
      io.emit('system_status', {
        mode: getMode(),
        cycleNumber: parsedCycle
      });

      triggerMlPrediction(parsedCycle);
    });

    socket.on('simulation:setSpeed', (multiplier) => {
      simulator.setSpeedMultiplier(multiplier);
      io.emit('system_status', { status: simulator.status, speedMultiplier: simulator.speedMultiplier });
    });

    socket.on('simulation:injectFault', (data) => {
      const { type, severity, duration } = data || {};
      simulator.injectFault(type || 'OVERPRESSURE', severity || 'WARNING', duration || 10);
      io.emit('system_status', { status: simulator.status, activeFault: simulator.activeFault });
    });

    socket.on('simulation:clearFault', () => {
      simulator.clearDiagnosticOverride();
      simulator.clearFault();
      io.emit('system_status', { status: simulator.status, activeFault: null });
      io.emit('analytics_update', analyticsService.getAnalyticsReport());
    });

    socket.on('simulation:runDiagnosticTest', (data) => {
      const { testType, scenario, value } = data || {};
      if (testType === 'RESET' || scenario === 'RECOVERY') {
        simulator.clearDiagnosticOverride();
        simulator.clearFault();
      } else {
        simulator.setDiagnosticOverride(testType, scenario, value);
      }
      simulator.tick();
      io.emit('system_status', { status: simulator.status, activeFault: simulator.activeFault, diagnosticTest: testType });
      io.emit('analytics_update', analyticsService.getAnalyticsReport());
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
}
