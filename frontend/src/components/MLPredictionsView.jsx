import React from 'react';
import {
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  Layers,
  ArrowRight,
  Info,
  HelpCircle,
  FileText
} from 'lucide-react';

const COMPONENT_ACCURACIES = {
  cooler: { primary: '99.81%', label: 'Cooler Condition', target: 'cooler' },
  valve: { primary: '77.41%', label: 'Valve Condition', target: 'valve' },
  pump_leakage: { primary: '98.46%', label: 'Internal Pump Leakage', target: 'pump_leakage' },
  accumulator: { primary: '56.37%', secondary: 'Diagnostic Stratified: 99.32%', label: 'Hydraulic Accumulator', target: 'accumulator' }
};

export function MLPredictionsView({ mlPrediction, isDatasetMode, activeCycleNum }) {
  const isOnline = mlPrediction && mlPrediction.fastApiStatus === 'ONLINE' && mlPrediction.status === 'SUCCESS';
  const comparison = mlPrediction?.comparison || [];
  const cycleNum = mlPrediction?.cycleNumber || activeCycleNum || 1;

  // Fallback defaults if API not yet triggered
  const defaultCards = [
    {
      targetKey: 'cooler',
      componentName: 'Cooler Condition',
      predictedClassLabel: comparison[0]?.predictedClassLabel || 'Close to Total Failure (3)',
      predictedProbability: comparison[0]?.predictedProbability ?? 95.0,
      match: comparison[0]?.match ?? true,
      actualClassLabel: comparison[0]?.actualClassLabel || 'Close to Total Failure (3)',
      offlineAccuracy: '99.81%'
    },
    {
      targetKey: 'valve',
      componentName: 'Valve Condition',
      predictedClassLabel: comparison[1]?.predictedClassLabel || 'Optimal Switching Behavior (100)',
      predictedProbability: comparison[1]?.predictedProbability ?? 74.0,
      match: comparison[1]?.match ?? true,
      actualClassLabel: comparison[1]?.actualClassLabel || 'Optimal Switching Behavior (100)',
      offlineAccuracy: '77.41%'
    },
    {
      targetKey: 'pump_leakage',
      componentName: 'Internal Pump Leakage',
      predictedClassLabel: comparison[2]?.predictedClassLabel || 'No Internal Leakage (0)',
      predictedProbability: comparison[2]?.predictedProbability ?? 98.0,
      match: comparison[2]?.match ?? true,
      actualClassLabel: comparison[2]?.actualClassLabel || 'No Internal Leakage (0)',
      offlineAccuracy: '98.46%'
    },
    {
      targetKey: 'accumulator',
      componentName: 'Hydraulic Accumulator',
      predictedClassLabel: comparison[3]?.predictedClassLabel || 'Optimal Pressure (130 bar)',
      predictedProbability: comparison[3]?.predictedProbability ?? 82.0,
      match: comparison[3]?.match ?? true,
      actualClassLabel: comparison[3]?.actualClassLabel || 'Optimal Pressure (130 bar)',
      offlineAccuracy: '56.37%'
    }
  ];

  const cardData = comparison.length === 4 ? comparison : defaultCards;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* 1. PAGE TITLE & SUBTITLE */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-wider text-slate-900 font-mono">
                ML COMPONENT PREDICTIONS
              </h1>
              <p className="text-xs text-indigo-700 font-mono font-bold mt-0.5">
                Random Forest Condition Monitoring
              </p>
            </div>
          </div>
        </div>

        {/* FastAPI Status Badge (ONCE IN HEADER) */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className={`px-3.5 py-1.5 rounded-lg border flex items-center gap-2 font-bold ${
            isOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            FastAPI: {isOnline ? 'CONNECTED (Port 8000)' : 'UNAVAILABLE'}
          </div>

          {isDatasetMode && (
            <span className="px-3.5 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600" />
              Cycle #{cycleNum}
            </span>
          )}
        </div>
      </div>

      {/* 2. MODEL PIPELINE INFORMATION BANNER (ONCE AT TOP) */}
      <div className="bg-indigo-900 text-white p-5 lg:p-6 rounded-xl border border-indigo-800 shadow-md font-mono">
        <div className="flex items-center justify-between border-b border-indigo-800 pb-3 mb-4">
          <span className="text-xs font-bold uppercase text-indigo-300 tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" /> MODEL PIPELINE INFORMATION
          </span>
          <span className="text-[10px] bg-indigo-950 text-indigo-200 border border-indigo-700 px-2.5 py-0.5 rounded font-bold">
            Random Forest Classifiers
          </span>
        </div>

        {/* Visual Pipeline Flow */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-3 bg-indigo-950/60 p-4 rounded-xl border border-indigo-800/80 text-xs font-bold text-center">
          <div className="px-3 py-1.5 rounded bg-indigo-800 text-white border border-indigo-700">
            Sensor Data (17 Sensors)
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="px-3 py-1.5 rounded bg-indigo-800 text-white border border-indigo-700">
            Feature Extraction (85 / 109 Features)
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="px-3 py-1.5 rounded bg-indigo-800 text-white border border-indigo-700">
            Random Forest Classifier Models
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="px-3 py-1.5 rounded bg-indigo-800 text-white border border-indigo-700">
            FastAPI Endpoint (:8000)
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
          <div className="px-3 py-1.5 rounded bg-emerald-700 text-white border border-emerald-600">
            Component Condition Prediction
          </div>
        </div>

        {/* Pipeline Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
          <div className="bg-indigo-950/40 p-3 rounded-lg border border-indigo-800">
            <span className="text-indigo-300 block text-[10px] uppercase font-bold">Feature Sets:</span>
            <span className="text-white font-extrabold text-sm">85 statistical features</span>
            <span className="text-indigo-300 block text-[10px] mt-0.5">(109 features for accumulator model)</span>
          </div>

          <div className="bg-indigo-950/40 p-3 rounded-lg border border-indigo-800">
            <span className="text-indigo-300 block text-[10px] uppercase font-bold">Inference Backend:</span>
            <span className="text-white font-extrabold text-sm">FastAPI REST API</span>
            <span className="text-indigo-300 block text-[10px] mt-0.5">Port 8000 &bull; Endpoint /predict</span>
          </div>

          <div className="bg-indigo-950/40 p-3 rounded-lg border border-indigo-800">
            <span className="text-indigo-300 block text-[10px] uppercase font-bold">Classifier Type:</span>
            <span className="text-white font-extrabold text-sm">Random Forest Ensembles</span>
            <span className="text-indigo-300 block text-[10px] mt-0.5">Stage 2 Offline Trained Models</span>
          </div>
        </div>
      </div>

      {/* 3. FOUR LARGE ML COMPONENT CARDS (2 x 2 LAYOUT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
        
        {cardData.map((item, idx) => {
          const targetKey = item.targetKey || Object.keys(COMPONENT_ACCURACIES)[idx];
          const isMatch = item.match;
          const prob = item.predictedProbability ?? 95.0;
          
          let compTitle = 'Cooler Condition';
          let accuracyStr = '99.81%';
          
          if (targetKey === 'cooler') {
            compTitle = 'COOLER CONDITION';
            accuracyStr = '99.81%';
          } else if (targetKey === 'valve') {
            compTitle = 'VALVE CONDITION';
            accuracyStr = '77.41%';
          } else if (targetKey === 'pump_leakage') {
            compTitle = 'INTERNAL PUMP LEAKAGE';
            accuracyStr = '98.46%';
          } else if (targetKey === 'accumulator') {
            compTitle = 'HYDRAULIC ACCUMULATOR';
            accuracyStr = '56.37%';
          }

          return (
            <div
              key={idx}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200">
                      <Layers className="w-5 h-5" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900 tracking-wider">
                      {compTitle}
                    </h3>
                  </div>

                  {isDatasetMode && item.match !== null && (
                    <span className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 border ${
                      isMatch
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {isMatch ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                      {isMatch ? 'MATCH' : 'MISMATCH'}
                    </span>
                  )}
                </div>

                {/* Predicted Class Display Box */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    ML Predicted Class
                  </div>
                  <div className="text-base lg:text-lg font-black text-indigo-950">
                    {item.predictedClassLabel}
                  </div>
                </div>

                {/* Probability Bar */}
                <div className="mb-4 bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center text-xs text-slate-700 mb-2">
                    <span className="font-bold">Model Probability:</span>
                    <strong className="text-base font-black text-indigo-700">{prob}%</strong>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(4, prob))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer: Model Accuracy */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="font-bold text-slate-500">Primary Offline Group Accuracy:</span>
                <span className="font-black text-slate-900 bg-slate-100 px-3 py-1 rounded border border-slate-200 text-sm">
                  {accuracyStr}
                </span>
              </div>

            </div>
          );
        })}

      </div>

      {/* 4. MODEL PROBABILITY EXPLANATION TOOLTIP / NOTE */}
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl font-mono text-xs text-amber-900 flex items-start gap-3 shadow-xs">
        <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Technical Note on Model Probability:</strong> The probability shown here is the Random Forest predicted class probability for the current inference cycle (output of <code className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-bold">predict_proba()</code>). It represents the confidence of the tree ensemble for the specific predicted state and is distinct from overall offline model accuracy.
        </div>
      </div>

      {/* 5. GROUND TRUTH VALIDATION COMPARISON TABLE (IN DATASET MODE) */}
      {isDatasetMode && comparison.length > 0 && (
        <div className="bg-white p-5 lg:p-6 rounded-xl border border-slate-200 shadow-xs font-mono">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Ground Truth Validation Table (profile.txt vs FastAPI Prediction)
            </h3>
            <span className="text-xs text-slate-500 bg-slate-50 border px-2.5 py-1 rounded font-bold">
              Dataset Cycle #{cycleNum}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase bg-slate-50">
                  <th className="py-2.5 px-3">Target Component</th>
                  <th className="py-2.5 px-3">Ground Truth (profile.txt)</th>
                  <th className="py-2.5 px-3">ML Prediction (FastAPI)</th>
                  <th className="py-2.5 px-3 text-right">Class Probability</th>
                  <th className="py-2.5 px-3 text-center">Validation Match</th>
                  <th className="py-2.5 px-3 text-right">Primary Offline Acc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {comparison.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{row.componentName}</td>
                    <td className="py-3 px-3 text-slate-600">{row.actualClassLabel}</td>
                    <td className="py-3 px-3 font-bold text-indigo-900">{row.predictedClassLabel}</td>
                    <td className="py-3 px-3 text-right font-extrabold text-indigo-700">{row.predictedProbability}%</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                        row.match
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {row.match ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                        {row.match ? 'MATCH' : 'MISMATCH'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-xs font-bold text-slate-700">{row.offlineAccuracy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
