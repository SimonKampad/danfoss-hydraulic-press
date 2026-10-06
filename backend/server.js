import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { HydraulicSimulator } from './simulation/hydraulicSimulator.js';
import { PerformanceService } from './services/performanceService.js';
import { AnalyticsService } from './services/analyticsService.js';
import { DatasetReplayEngine } from './services/datasetReplayEngine.js';
import { TraceabilityService } from './services/traceabilityService.js';
import { OptimizationService } from './services/optimizationService.js';
import { setupSocketHandler } from './socket/socketHandler.js';
import { GROUP_2_SPECIFICATIONS, SIMULATION_THRESHOLDS, CYCLE_PHASES } from './config/pressConfig.js';

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Initialize Core Engine Services
const simulator = new HydraulicSimulator();
const performanceService = new PerformanceService();
const analyticsService = new AnalyticsService();
const datasetEngine = new DatasetReplayEngine();
const traceabilityService = new TraceabilityService();
const optimizationService = new OptimizationService();

// System mode state: 'SIMULATION' | 'DATASET_REPLAY'
let systemMode = 'SIMULATION';

// Initialize Socket.IO Server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

setupSocketHandler(io, simulator, performanceService, analyticsService, datasetEngine, traceabilityService, optimizationService, () => systemMode, (newMode) => { systemMode = newMode; });

// REST API Endpoints for Dashboard / External Integrations / Future Hardware
app.get('/api/status', (req, res) => {
  res.json({
    system: 'Hydraulic Press Real-Time Monitoring System',
    vendor: 'Danfoss Assignment Concept',
    group: 'Group 2',
    mode: systemMode,
    status: simulator.status,
    speedMultiplier: simulator.speedMultiplier,
    cycleNumber: systemMode === 'DATASET_REPLAY' ? datasetEngine.currentCycleNumber : simulator.cycleNumber,
    currentPhase: simulator.currentPhaseKey,
    activeFault: simulator.activeFault,
    uptimeSeconds: Math.round(simulator.totalElapsedTime)
  });
});

app.get('/api/specifications', (req, res) => {
  res.json({
    group2: GROUP_2_SPECIFICATIONS,
    phases: CYCLE_PHASES,
    thresholds: SIMULATION_THRESHOLDS
  });
});

app.get('/api/performance', (req, res) => {
  res.json(performanceService.getStats());
});

app.get('/api/analytics', (req, res) => {
  res.json(analyticsService.getAnalyticsReport());
});

app.get('/api/optimization', (req, res) => {
  res.json(optimizationService.generateOptimizationReport(performanceService.getStats()));
});

app.get('/api/traceability/records', (req, res) => {
  res.json(traceabilityService.getRecords());
});

app.get('/api/traceability/record/:cycle', (req, res) => {
  const rec = traceabilityService.getRecordByCycle(req.params.cycle);
  if (!rec) return res.status(404).json({ error: 'Record not found' });
  res.json(rec);
});

app.get('/api/ml-prediction', async (req, res) => {
  const cycle = parseInt(req.query.cycle, 10) || datasetEngine.currentCycleNumber;
  try {
    const prediction = await datasetEngine.runMlPredictionForCycle(cycle);
    res.json(prediction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dataset/select-cycle', async (req, res) => {
  const cycleNumber = parseInt(req.body.cycleNumber, 10) || 1;
  datasetEngine.currentCycleNumber = Math.max(1, Math.min(2205, cycleNumber));
  
  // Trigger ML prediction for the newly selected cycle
  const mlResult = await datasetEngine.runMlPredictionForCycle(datasetEngine.currentCycleNumber);
  
  // Broadcast update to socket clients
  io.emit('ml_prediction', mlResult);
  io.emit('system_status', {
    mode: systemMode,
    cycleNumber: datasetEngine.currentCycleNumber
  });

  res.json({ success: true, cycleNumber: datasetEngine.currentCycleNumber, mlResult });
});

app.post('/api/diagnostic-test', (req, res) => {
  const { testType, scenario, value } = req.body;
  
  if (testType === 'RESET' || scenario === 'RECOVERY' || scenario === 'NORMAL') {
    simulator.clearDiagnosticOverride();
    simulator.clearFault();
    analyticsService.resetHistory();
  } else {
    simulator.setDiagnosticOverride(testType, scenario, value);
  }

  // Force single tick to generate telemetry packet
  simulator.tick();
  
  const report = analyticsService.getAnalyticsReport();
  
  // Broadcast update to sockets
  io.emit('system_status', { mode: systemMode, activeFault: simulator.activeFault, diagnosticTest: testType });
  io.emit('analytics_update', report);

  res.json({
    success: true,
    testType,
    scenario,
    input: value,
    actual: {
      machineCondition: report.machineCondition,
      anomalyStatus: report.anomalyStatus,
      maintenanceIndicator: report.maintenanceIndicator,
      confidenceScore: report.confidenceScore
    }
  });
});

app.post('/api/control', (req, res) => {
  const { action, value } = req.body;
  if (action === 'start') simulator.start();
  else if (action === 'pause') simulator.pause();
  else if (action === 'reset') {
    simulator.clearDiagnosticOverride();
    simulator.reset();
    performanceService.reset();
  } else if (action === 'setSpeed') {
    simulator.setSpeedMultiplier(parseFloat(value) || 1.0);
  } else if (action === 'injectFault') {
    simulator.injectFault(value.type, value.severity, value.duration);
  } else if (action === 'clearFault') {
    simulator.clearDiagnosticOverride();
    simulator.clearFault();
  } else if (action === 'setMode') {
    systemMode = value;
    io.emit('system_status', { mode: systemMode });
  }
  res.json({ success: true, status: simulator.status, mode: systemMode });
});

// Start simulator loop
simulator.start();

httpServer.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Danfoss Hydraulic Press Backend Running on Port ${PORT}`);
  console.log(` Real-Time Socket.IO stream initialized at http://localhost:${PORT}`);
  console.log(` Mode: SIMULATION / DATASET REPLAY Engine Active`);
  console.log(`=======================================================`);
});

