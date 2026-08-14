import React from "react";
import { Database, Zap, Loader2, CheckCircle2 } from "lucide-react";

export default function Navbar({ isWorking, health }) {
  const bomEngine = health?.sources?.bomDerivation || "—";
  const searchEngine = health?.sources?.webSearch || "—";

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-cyan-400">
                SupplyChain<span className="text-cyan-400">AI</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-full">
                AHP + TOPSIS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Pemetaan rantai pasok dari data OpenStreetMap yang dapat diverifikasi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap justify-end">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              isWorking
                ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}
          >
            {isWorking ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Mengambil data…</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Siap</span>
              </>
            )}
          </div>

          <div
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300"
            title={`Penurunan BOM: ${bomEngine}\nPencarian web: ${searchEngine}`}
          >
            <Database className="w-4 h-4 text-purple-400" />
            <span className="font-medium text-slate-200">{bomEngine}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
