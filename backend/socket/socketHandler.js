export function setupSocketHandler(io, simulator, performanceService, analyticsService, datasetEngine, getMode, setMode) {
  let datasetReplayInterval = null;

  async function triggerMlPrediction(cycleNum) {
    if (!datasetEngine) return;
    try {
      const mlResult = await datasetEngine.runMlPredictionForCycle(cycleNum);
      io.emit('ml_prediction', mlResult);
    } catch (err) {
      console.error(`[SocketHandler] Error triggering ML prediction for cycle ${cycleNum}:`, err.message);
    }
  }

  // Initial trigger for cycle 1
  triggerMlPrediction(1);

  // Simulator event subscriptions
  simulator.onData(async (sensorPacket) => {
    const mode = getMode ? getMode() : 'SIMULATION';
    
    if (mode === 'SIMULATION') {
      performanceService.recordData(sensorPacket);
      analyticsService.processSample(sensorPacket);
      io.emit('sensor_data', sensorPacket);
    } else if (mode === 'DATASET_REPLAY') {
      // In dataset replay mode, generate realistic packet from raw sensor arrays
      try {
        const cycleNum = datasetEngine.currentCycleNumber;
        const rawSensors = await datasetEngine.loadCycleRawSensors(cycleNum);
        
        const totalCycleDuration = 9.25; // seconds
        const progressRatio = (simulator.cycleElapsedTime % totalCycleDuration) / totalCycleDuration;
        const frame = datasetEngine.generateTelemetryFrame(rawSensors, cycleNum, progressRatio, simulator.totalElapsedTime);
        
        performanceService.recordData(frame);
        analyticsService.processSample(frame);
        io.emit('sensor_data', frame);
      } catch (err) {
        // Fallback to simulator packet if dataset file issue
        io.emit('sensor_data', { ...sensorPacket, dataMode: 'DATASET_REPLAY' });
      }
    }
  });

  simulator.onPhaseChange((event) => {
    const mode = getMode ? getMode() : 'SIMULATION';
    io.emit('cycle_event', event);
    io.emit('performance_update', performanceService.getStats());
    io.emit('analytics_update', analyticsService.getAnalyticsReport());

    // When a cycle completes (transitions back to FAST_DOWN), trigger ML prediction for next/current cycle
    if (event.phase === 'FAST_DOWN') {
      const cycleToPredict = mode === 'DATASET_REPLAY' ? datasetEngine.currentCycleNumber : simulator.cycleNumber;
      triggerMlPrediction(cycleToPredict);
    }
  });

  simulator.onAlert((alertObj) => {
    io.emit('alert_event', alertObj);
  });

  // Socket connection handling
  io.on('connection', async (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    const mode = getMode ? getMode() : 'SIMULATION';

    // Send initial snapshot
    socket.emit('system_status', {
      status: simulator.status,
      speedMultiplier: simulator.speedMultiplier,
      mode: mode,
      dataMode: mode,
      cycleNumber: mode === 'DATASET_REPLAY' ? datasetEngine.currentCycleNumber : simulator.cycleNumber,
      activeFault: simulator.activeFault
    });

    socket.emit('performance_update', performanceService.getStats());
    socket.emit('analytics_update', analyticsService.getAnalyticsReport());

    // Send last cached ML prediction on connect
    if (datasetEngine && datasetEngine.lastMlPrediction) {
      socket.emit('ml_prediction', datasetEngine.lastMlPrediction);
    } else {
      triggerMlPrediction(1);
    }

    // Controls from client UI
    socket.on('simulation:start', () => {
      simulator.start();
      io.emit('system_status', { status: simulator.status, speedMultiplier: simulator.speedMultiplier, mode: getMode() });
    });

    socket.on('simulation:pause', () => {
      simulator.pause();
      io.emit('system_status', { status: simulator.status, speedMultiplier: simulator.speedMultiplier, mode: getMode() });
    });

    socket.on('simulation:reset', () => {
      simulator.reset();
      performanceService.reset();
      io.emit('system_status', { status: simulator.status, speedMultiplier: simulator.speedMultiplier, mode: getMode() });
      io.emit('performance_update', performanceService.getStats());
      io.emit('analytics_update', analyticsService.getAnalyticsReport());
      triggerMlPrediction(getMode() === 'DATASET_REPLAY' ? datasetEngine.currentCycleNumber : 1);
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
      const parsedCycle = Math.max(1, Math.min(2205, parseInt(cycleNum, 10) || 1));
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

