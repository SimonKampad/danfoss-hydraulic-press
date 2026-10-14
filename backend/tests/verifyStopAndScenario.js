import { io } from '../../frontend/node_modules/socket.io-client/build/esm/index.js';

async function runVerification() {
  console.log('--- STARTING VERIFICATION OF STOP/RESUME AND SCENARIOS ---');
  
  const socket = io('http://localhost:5000', {
    transports: ['websocket'],
    timeout: 5000
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log('✓ Connected to Socket.IO backend on http://localhost:5000');
      resolve();
    });
    socket.on('connect_error', reject);
  });

  // Step 1: Wait for initial sensor data
  console.log('\n[TEST 1] Verifying initial live sensor data packets arrive when RUNNING...');
  let packetCountRunning = 0;
  const onDataRunning = (packet) => {
    packetCountRunning++;
    if (packetCountRunning === 1) {
      console.log(`  Received packet: Pressure=${packet.pressureBar} bar, Flow=${packet.flowLmin} L/min, Scenario=${packet.scenarioId}`);
    }
  };
  socket.on('sensor_data', onDataRunning);

  await new Promise((r) => setTimeout(r, 600));
  socket.off('sensor_data', onDataRunning);
  console.log(`✓ Received ${packetCountRunning} sensor data packets while running.`);
  if (packetCountRunning === 0) {
    throw new Error('FAIL: Expected sensor data packets while running, got 0');
  }

  // Step 2: Test STOP
  console.log('\n[TEST 2] Emitting simulation:stop and calling POST /api/control { action: "stop" }...');
  
  // Call REST
  const stopRes = await fetch('http://localhost:5000/api/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'stop' })
  });
  const stopData = await stopRes.json();
  console.log(`  REST Stop response:`, stopData);
  socket.emit('simulation:stop');

  // Verify status is STOPPED
  const statusRes = await fetch('http://localhost:5000/api/status');
  const statusData = await statusRes.json();
  console.log(`  Backend status check: status=${statusData.status}`);
  if (statusData.status !== 'STOPPED') {
    throw new Error(`FAIL: Expected status 'STOPPED', got ${statusData.status}`);
  }

  // Step 3: Verify NO MORE packets arrive while STOPPED
  console.log('\n[TEST 3] Verifying that ZERO packets arrive while STOPPED...');
  let packetCountStopped = 0;
  const onDataStopped = (packet) => {
    packetCountStopped++;
    console.error('  ERROR: Received unexpected packet while STOPPED:', packet);
  };
  socket.on('sensor_data', onDataStopped);

  await new Promise((r) => setTimeout(r, 1200));
  socket.off('sensor_data', onDataStopped);

  if (packetCountStopped > 0) {
    throw new Error(`FAIL: Expected 0 packets while STOPPED, but received ${packetCountStopped}`);
  }
  console.log('✓ Confirmed: 0 packets received while STOPPED. The simulation and stream are completely frozen.');

  // Step 4: Test RESUME
  console.log('\n[TEST 4] Emitting simulation:resume...');
  socket.emit('simulation:resume');
  await fetch('http://localhost:5000/api/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'resume' })
  });

  let packetCountResumed = 0;
  const onDataResumed = (packet) => {
    packetCountResumed++;
  };
  socket.on('sensor_data', onDataResumed);
  await new Promise((r) => setTimeout(r, 600));
  socket.off('sensor_data', onDataResumed);

  console.log(`✓ Received ${packetCountResumed} packets after RESUME.`);
  if (packetCountResumed === 0) {
    throw new Error('FAIL: Expected packets after RESUME, got 0');
  }

  // Step 5: Test Scenario Selection Dropdown
  console.log('\n[TEST 5] Testing Scenario selection to COOLER_FAULT...');
  socket.emit('scenario:select', 'COOLER_FAULT');
  await new Promise((r) => setTimeout(r, 400));
  
  let coolerPacket = null;
  const onDataCooler = (packet) => {
    if (!coolerPacket) coolerPacket = packet;
  };
  socket.on('sensor_data', onDataCooler);
  await new Promise((r) => setTimeout(r, 500));
  socket.off('sensor_data', onDataCooler);

  console.log(`  Selected scenario packet: scenarioId=${coolerPacket?.scenarioId}, name=${coolerPacket?.scenarioName}`);
  if (coolerPacket?.scenarioId !== 'COOLER_FAULT') {
    throw new Error(`FAIL: Expected COOLER_FAULT scenario, got ${coolerPacket?.scenarioId}`);
  }
  console.log('✓ Confirmed: Scenario dropdown selection works properly and updates telemetry.');

  // Step 6: Test STOP again to leave simulator clean
  console.log('\n[TEST 6] Stop again...');
  socket.emit('simulation:stop');
  await fetch('http://localhost:5000/api/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'stop' })
  });
  console.log('✓ Successfully stopped.');

  socket.disconnect();
  console.log('\n===============================================================');
  console.log(' ALL STOP / RESUME AND SCENARIO VERIFICATION TESTS PASSED! ');
  console.log('===============================================================');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
