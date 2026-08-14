import React, { useEffect, useRef } from "react";
import { Terminal, CheckCircle, Loader2, AlertTriangle } from "lucide-react";

// Konsol ini menampilkan peristiwa yang benar-benar dikirim server saat
// analisis berjalan. Versi sebelumnya memakai setTimeout untuk memunculkan
// teks yang sudah ditulis lebih dulu — tidak ada request apa pun di baliknya.

const STAGE_STYLE = {
  profile: "text-cyan-300",
  bom: "text-purple-300",
  suppliers: "text-blue-300",
  distance: "text-sky-300",
  done: "text-emerald-400 font-bold"
};

export default function LiveScrapingConsole({ events, isWorking }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [events]);

  return (
    <div className="glass-panel rounded-2xl border border-slate-800/90 shadow-2xl overflow-hidden font-mono">
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-200">Log Proses Pengambilan Data</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {isWorking ? (
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Loader2 className="w-3 h-3 animate-spin" />
              Sedang mengambil data
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle className="w-3 h-3" />
              Idle
            </span>
          )}
        </div>
      </div>

      <div className="p-4 h-48 overflow-y-auto space-y-1 text-[11px] bg-slate-950/80 leading-relaxed">
        {events.length === 0 && (
          <div className="text-slate-600">
            Belum ada proses berjalan. Pilih sebuah perusahaan untuk memulai analisis.
          </div>
        )}

        {events.map((event, index) => {
          const isWarn = event.level === "warn";
          const time = event.at ? new Date(event.at).toLocaleTimeString("id-ID") : "";

          return (
            <div key={index} className="flex items-start gap-2">
              <span className="text-slate-700 select-none shrink-0">{time}</span>
              <span className={`shrink-0 uppercase text-[9px] mt-0.5 ${STAGE_STYLE[event.stage] || "text-slate-500"}`}>
                [{event.stage}]
              </span>
              <span className={isWarn ? "text-amber-300 flex items-start gap-1" : STAGE_STYLE[event.stage] || "text-slate-300"}>
                {isWarn && <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />}
                {event.message}
              </span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
