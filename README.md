# Hydraulic Press Real-Time Monitoring & Analysis Dashboard

> **Danfoss Hydraulic Assignment Concept — Group 2 Specifications**  
> *A professional industrial digital monitoring, real-time telemetry, and smart analytics platform.*

---

## 1. Project Overview
This project presents a full-stack industrial monitoring solution for a hydraulic press system. It serves as the **Digital Monitoring & Data Analysis layer** designed to capture real-time sensor parameters, analyze pressure/flow/speed profiles, evaluate machine performance, and demonstrate the value of Data Science, Artificial Intelligence, and Predictive Maintenance.

---

## 2. Assignment Requirements Addressed

| Assignment Requirement | Implementation / Dashboard Solution |
|---|---|
| **1. Hydraulic Concepts** | Group 2 nominal press specs (85mm Bore, 50mm Rod, 3T Dead Load, 9T Holding Load). |
| **2. Pressure, Flow & Speed Analysis** | Physics-based dynamic engine generating synchronized pressure, flow, and speed trajectories. |
| **3. Real-Time Sensor Capture** | 6 live parameter channels: Pressure, Flow, Speed, Position, Oil Temp, and Motor Current. |
| **4. System Performance Visualization** | Recharts real-time graphs, rolling history, timeline execution state machine, and KPI cards. |
| **5. Data Science / AI / ML Value** | Smart rule-based classifier proxy with dynamic telemetry insights & predictive maintenance. |
| **6. Professional Presentation** | High-contrast industrial dark theme engineered specifically for projector presentations. |

---

## 3. Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Recharts, Lucide React icons
- **Backend**: Node.js, Express.js, Socket.IO
- **Communication Protocol**: Socket.IO WebSockets (Real-time telemetry stream)
- **Database Architecture**: Designed for in-memory rolling buffer with easy plug-and-play MongoDB hook interface.

---

## 4. System Architecture

```
[ Hydraulic Simulator Engine ]
             │ (Physics & Correlation Calculations)
             ▼
[ Node.js + Express Backend ] ──(Port 5000)
             │
      ┌──────┴────────────────────────┐
      │ Socket.IO Real-Time Stream    │ REST API (/api/status, /api/performance)
      └──────┬────────────────────────┘
             ▼
[ React + Vite Frontend Dashboard ] ──(Port 5173)
```

---

## 5. Folder Structure

```
version3/
├── backend/
│   ├── config/
│   │   └── pressConfig.js        # Group 2 specifications & nominal thresholds
│   ├── services/
│   │   ├── analyticsService.js   # Smart rule-based AI/ML classifier engine
│   │   └── performanceService.js # Rolling averages & hydraulic energy integration
│   ├── simulation/
│   │   └── hydraulicSimulator.js # Realistic correlated 4-phase hydraulic cycle simulator
│   ├── socket/
│   │   └── socketHandler.js      # Socket.IO event handlers & client commands
│   ├── server.js                 # Express server entrypoint (Port 5000)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── StatusBanner.jsx
│   │   │   ├── SensorCard.jsx
│   │   │   ├── CycleTimeline.jsx
│   │   │   ├── RealtimeCharts.jsx
│   │   │   ├── SystemPerformance.jsx
│   │   │   ├── AlertPanel.jsx
│   │   │   ├── SmartAnalytics.jsx
│   │   │   ├── SensorTable.jsx
│   │   │   ├── SimulationControls.jsx
│   │   │   └── HardwareArchitectureNotice.jsx
│   │   ├── hooks/
│   │   │   └── useRealtimeData.js # Socket.IO state management hook
│   │   ├── pages/
│   │   │   └── Dashboard.jsx
│   │   ├── services/
│   │   │   └── socket.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── vite.config.js            # Vite + Tailwind plugin config
│   └── package.json
│
├── package.json                   # Root scripts
└── README.md                      # Documentation
```

---

## 6. Group 2 Hydraulic Cycle Parameters

### Machine Specifications:
- **Dead Load**: 3 Ton
- **Holding Load**: 9 Ton
- **Cylinder Bore**: 85 mm ($A_{cap} \approx 56.75\text{ cm}^2$)
- **Cylinder Rod**: 50 mm ($A_{annulus} \approx 37.11\text{ cm}^2$)
- **Motor RPM**: 1500 RPM
- **Pump Efficiency**: 0.9 (90%)
- **System Pressure Loss**: 10 bar (Pump to cylinder loss)

### Hydraulic Cycle Execution Stages:
1. **FAST DOWN** (Duration: 1.0 s)
   - Target Speed: ~200 mm/s
   - Target Stroke: +200 mm (Position 0 → 200 mm)
   - High Flow (~68.1 L/min), Low-Moderate Pressure (~35 bar)
2. **WORKING CYCLE** (Duration: 5.0 s)
   - Target Speed: ~10 mm/s
   - Target Stroke: +50 mm (Position 200 → 250 mm)
   - Low Flow (~3.4 L/min), High Pressure Build-up (~175–195 bar)
3. **HOLDING** (Duration: 2.0 s)
   - Target Speed: 0 mm/s
   - Target Stroke: 0 mm (Position 250 mm constant holding 9 Ton load)
   - Micro Leakage Flow (~0.6–0.8 L/min), Peak Pressure (~195 bar)
4. **FAST UP** (Duration: 1.25 s)
   - Target Speed: ~200 mm/s (upward return)
   - Target Stroke: -250 mm (Position 250 → 0 mm)
   - Annulus Return Flow (~44.5 L/min), Return Pressure (~45 bar)

Nominal Total Cycle Time: **9.25 seconds**.

---

## 7. How to Run the Application

### Prerequisites:
- Node.js (v18+)
- npm

### Step 1: Start Backend Server
```bash
cd backend
npm install
npm start
```
*Backend will run on `http://localhost:5000` with real-time Socket.IO socket streams.*

### Step 2: Start Frontend Dashboard
In a second terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 8. Real-Time Telemetry & Socket.IO Events

| Event Name | Direction | Payload Description |
|---|---|---|
| `sensor_data` | Server → Client | High-frequency telemetry packet emitted every ~100ms. |
| `cycle_event` | Server → Client | Emitted when press transitions between phases. |
| `alert_event` | Server → Client | Emitted on threshold excursion or fault injection. |
| `performance_update` | Server → Client | Emitted with rolling averages and energy integration. |
| `simulation:start` | Client → Server | Resumes simulator execution loop. |
| `simulation:pause` | Client → Server | Pauses simulation clock. |
| `simulation:setSpeed` | Client → Server | Changes cycle speed multiplier (1x, 2x, 5x). |
| `simulation:injectFault` | Client → Server | Simulates Overpressure, Thermal Spike, or Valve Leak. |

---

## 9. Connecting Physical Hardware Sensors in the Future

The architecture decouples the frontend visualization from the data provider. To connect physical hardware (e.g. ESP32, Arduino, or Modbus TCP PLC):

1. **Hardware Setup**:
   - Pressure Sensor: 0–250 bar Piezoelectric (4–20 mA or 0–10 V)
   - Flow Meter: Turbine flow sensor (Pulse output)
   - Position Sensor: Magnetostrictive / LVDT (0–300 mm)
   - Temp Sensor: PT100 RTD
   - Motor Current: Hall-Effect CT Clamp
2. **Backend Adapter**:
   - In `backend/server.js`, replace or wrap `simulator.onData()` with a serial port / MQTT / Modbus listener (e.g. using `node-modbus` or `mqtt`).
   - Format incoming payload to match the standard `{ timestamp, cycleNumber, phase, pressureBar, flowLmin, speedMmS, positionMm, temperatureC, motorCurrentA }` interface.
3. **No Frontend Code Modifications Needed**: The React dashboard immediately renders live hardware telemetry.

---

## 10. Summary of Dashboard Sections
- **Header & Control Console**: Danfoss industrial branding, Socket.IO status, clock, play/pause/reset, 1x/2x/5x speed selector, and Fault Injector.
- **Machine Status Banner**: Live phase indicator, cycle count, cylinder position, and progress bar.
- **Real-Time Sensor Cards**: 6 responsive KPI cards with sparkline micro-charts and delta trend arrows.
- **Real-Time Graphs**: High-contrast Recharts visualizations for Pressure, Flow, Speed, and Position vs Time.
- **Cycle Timeline**: Visual 4-stage execution stepper with progress indicators.
- **System Performance Section**: Average/Max values, energy consumption estimation explicitly labeled as `"Simulation Estimate"`.
- **Alerts & Event Log**: Automated simulation threshold warnings and chronological event sequence table.
- **Smart Analytics Engine**: Rule-based AI/ML proxy explaining how Data Science adds value to hydraulic operations.
- **Live Telemetry Table**: Scrollable table with pause, clear, and CSV export capabilities.
