import React from 'react';
import { Cpu, CheckCircle2, XCircle, AlertTriangle, Database, Zap, Layers, FileText } from 'lucide-react';

export function MLPredictions({ mlPrediction, isDatasetReplayMode, activeCycleNumber }) {
  const isOnline = mlPrediction && mlPrediction.fastApiStatus === 'ONLINE' && mlPrediction.status === 'SUCCESS';
  const comparison = mlPrediction?.comparison || [];
  const cycleNum = mlPrediction?.cycleNumber || activeCycleNumber || 1;

  return (
    <div className="industrial-card p-4 lg:p-6 mb-6 border-indigo-100 shadow-md">
      
      {/* Header & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 font-mono">
                ML Component Predictions
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Random Forest (Stage 2)
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Live FastAPI Inference Engine Pipeline &bull; 85 & 109 Statistical Features
            </p>
          </div>
        </div>

        {/* FastAPI Status Badge */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 font-bold ${
            isOnline 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            FastAPI: {isOnline ? 'CONNECTED (Port 8000)' : 'UNAVAILABLE'}
          </div>

          {isDatasetReplayMode && (
            <span className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              Cycle #{cycleNum}
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: 4 Component Prediction Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {comparison.map((item, idx) => {
          const isMatch = item.match;
          const prob = item.predictedProbability || 0;
          
          return (
            <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative overflow-hidden flex flex-col justify-between">
              
              {/* Card Top: Component & Target */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-600" /> {item.targetKey}
                  </span>

                  {item.match !== null && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border ${
                      isMatch 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {isMatch ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                      {isMatch ? 'MATCH' : 'MISMATCH'}
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-bold text-slate-800 mb-2 font-mono line-clamp-1">
                  {item.componentName}
                </h3>

                {/* Predicted Value Badge */}
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 mb-3 shadow-2xs">
                  <div className="text-[9px] font-mono text-slate-400 uppercase">ML Predicted Class</div>
                  <div className="text-sm font-extrabold font-mono text-indigo-900 mt-0.5">
                    {item.predictedClassLabel}
                  </div>
                  <div className="text-[10px] font-mono text-indigo-600 font-semibold mt-1">
                    Class Probability: <strong>{prob}%</strong>
                  </div>
                </div>

                {/* Ground Truth Badge */}
                {isDatasetReplayMode && item.actualGroundTruth !== null && (
                  <div className="p-2 bg-slate-100/80 rounded-lg border border-slate-200 mb-3">
                    <div className="text-[9px] font-mono text-slate-500 uppercase flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-500" /> Ground Truth (profile.txt)
                    </div>
                    <div className="text-xs font-bold font-mono text-slate-700 mt-0.5">
                      {item.actualClassLabel}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Bottom: Probabilities Bar & Offline Accuracy */}
              <div>
                <div className="text-[9px] font-mono text-slate-500 mb-1 flex justify-between">
                  <span>Class Probability:</span>
                  <strong className="text-slate-800">{prob}%</strong>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-500 rounded-full" 
                    style={{ width: `${Math.min(100, Math.max(5, prob))}%` }} 
                  />
                </div>

                <div className="text-[9px] font-mono text-slate-400 pt-2 border-t border-slate-200">
                  Primary Offline Acc: <strong className="text-slate-600">{item.offlineAccuracy}</strong>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Ground Truth Validation Comparison Table */}
      {isDatasetReplayMode && comparison.length > 0 && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-mono flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Live Model Validation (Ground Truth vs ML Prediction)
            </h4>
            <span className="text-[10px] font-mono text-slate-500 bg-white border px-2 py-0.5 rounded">
              Dataset Cycle #{cycleNum}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase bg-slate-100">
                  <th className="py-2 px-3">Target Component</th>
                  <th className="py-2 px-3">Ground Truth (profile.txt)</th>
                  <th className="py-2 px-3">ML Prediction (FastAPI)</th>
                  <th className="py-2 px-3 text-right">Class Probability</th>
                  <th className="py-2 px-3 text-center">Validation Match</th>
                  <th className="py-2 px-3 text-right">Documented Primary Acc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {comparison.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800">{row.componentName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{row.actualClassLabel}</td>
                    <td className="py-2.5 px-3 font-bold text-indigo-900">{row.predictedClassLabel}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-700">{row.predictedProbability}%</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        row.match 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {row.match ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                        {row.match ? 'MATCH' : 'MISMATCH'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[10px] text-slate-500 font-semibold">{row.offlineAccuracy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-mono text-amber-800 leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Validation Methodology Notice:</strong> Ground Truth labels from <code className="bg-white px-1 py-0.5 rounded border border-amber-300 font-bold">profile.txt</code> are displayed exclusively for side-by-side validation evaluation. Ground Truth values are <strong>never</strong> provided to feature extraction or model inference to ensure strict prevention of target data leakage.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
