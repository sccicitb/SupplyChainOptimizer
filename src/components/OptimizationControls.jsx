import React, { useMemo } from "react";
import { SlidersHorizontal, FileText, Route, Wallet, Scale, AlertTriangle, CheckCircle2 } from "lucide-react";
import { CRITERIA, buildPairwiseMatrix, ahpWeights } from "../utils/mcdm";

// Bobot kriteria diturunkan dengan AHP, bukan diatur langsung lewat slider
// persentase. Alasannya: manusia lebih andal membandingkan dua hal sekaligus
// ("jarak seberapa lebih penting dibanding biaya?") daripada membagi 100%
// ke empat kriteria. AHP juga memberi Consistency Ratio, sehingga penilaian
// yang saling bertentangan bisa terdeteksi, bukan diam-diam terpakai.

// Enam pasangan untuk empat kriteria: C(4,2) = 6.
export const PAIRS = [
  { i: 0, j: 1 },
  { i: 0, j: 2 },
  { i: 0, j: 3 },
  { i: 1, j: 2 },
  { i: 1, j: 3 },
  { i: 2, j: 3 }
];

/**
 * Memetakan posisi slider (-8..8) ke skala Saaty 1-9.
 * Nilai 0 berarti kedua kriteria sama penting; positif berarti kriteria kiri
 * lebih penting, negatif berarti kriteria kanan yang lebih penting.
 */
export function sliderToSaaty(value) {
  return value >= 0 ? value + 1 : 1 / (1 - value);
}

function saatyLabel(value) {
  const intensity = Math.abs(value) + 1;
  const words = {
    1: "sama penting",
    2: "sedikit lebih",
    3: "cukup lebih",
    4: "lebih",
    5: "jelas lebih",
    6: "sangat lebih",
    7: "amat sangat lebih",
    8: "mutlak mendekati",
    9: "mutlak lebih"
  };
  return words[intensity] || `${intensity}x`;
}

export const PRESETS = {
  seimbang: { label: "Seimbang", values: [0, 0, 0, 0, 0, 0] },
  terdekat: { label: "Utamakan jarak", values: [4, 5, 4, 1, 0, -1] },
  termurah: { label: "Utamakan biaya", values: [-4, 2, 3, 5, 5, 0] },
  cepat: { label: "Utamakan lead time", values: [-2, -4, 1, -3, 2, 4] }
};

export default function OptimizationControls({
  strategy,
  onStrategyChange,
  pairValues,
  onPairChange,
  onPreset,
  onOpenSop,
  disabled,
  hasResult
}) {
  const ahp = useMemo(() => {
    const comparisons = PAIRS.map((p, index) => ({
      i: p.i,
      j: p.j,
      value: sliderToSaaty(pairValues[index])
    }));
    const matrix = buildPairwiseMatrix(CRITERIA.length, comparisons);
    return ahpWeights(matrix);
  }, [pairValues]);

  const strategies = [
    { id: "topsis", label: "TOPSIS + AHP", icon: Scale, hint: "Peringkat multi-kriteria dengan bobot dari perbandingan berpasangan" },
    { id: "nearest", label: "Terdekat", icon: Route, hint: "Kriteria tunggal: jarak jalan terpendek" },
    { id: "cheapest", label: "Termurah", icon: Wallet, hint: "Kriteria tunggal: biaya total terendah" }
  ];

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 shadow-2xl space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-slate-100">Metode Pemilihan Pemasok</h2>
        </div>

        <button
          onClick={onOpenSop}
          disabled={!hasResult}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900/80 border border-slate-700 text-slate-200 hover:border-cyan-500/50 disabled:opacity-40 transition flex items-center gap-2"
        >
          <FileText className="w-4 h-4 text-cyan-400" />
          Dokumen Metodologi & Hasil
        </button>
      </div>

      {/* Pemilihan strategi */}
      <div className="grid sm:grid-cols-3 gap-2">
        {strategies.map((s) => {
          const Icon = s.icon;
          const active = strategy === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onStrategyChange(s.id)}
              disabled={disabled}
              title={s.hint}
              className={`p-3 rounded-xl border text-left transition-all disabled:opacity-50 ${
                active
                  ? "bg-cyan-500/10 border-cyan-400/60 text-cyan-200"
                  : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <Icon className={`w-4 h-4 ${active ? "text-cyan-400" : "text-slate-500"}`} />
                {s.label}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">{s.hint}</p>
            </button>
          );
        })}
      </div>

      {/* Perbandingan berpasangan AHP */}
      {strategy === "topsis" && (
        <div className="space-y-4 border-t border-slate-800 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Perbandingan Berpasangan (AHP)</h3>
              <p className="text-[11px] text-slate-400">
                Geser ke arah kriteria yang Anda anggap lebih penting. Skala Saaty 1–9.
              </p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => onPreset(preset.values)}
                  disabled={disabled}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-900/70 border border-slate-800 text-slate-300 hover:border-cyan-500/40 disabled:opacity-40 transition"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {PAIRS.map((pair, index) => {
              const left = CRITERIA[pair.i];
              const right = CRITERIA[pair.j];
              const value = pairValues[index];

              return (
                <div key={`${pair.i}-${pair.j}`} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={value > 0 ? "text-cyan-300 font-semibold" : "text-slate-400"}>
                      {left.label}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {value === 0 ? "sama penting" : `${saatyLabel(value)} →`}
                    </span>
                    <span className={value < 0 ? "text-cyan-300 font-semibold" : "text-slate-400"}>
                      {right.label}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-8}
                    max={8}
                    step={1}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onPairChange(index, Number(e.target.value))}
                    className="w-full accent-cyan-500 disabled:opacity-40"
                  />
                </div>
              );
            })}
          </div>

          {/* Bobot hasil dan konsistensi */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CRITERIA.map((criterion, index) => (
                <div key={criterion.id} className="text-center" title={criterion.description}>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide">{criterion.label}</div>
                  <div className="text-lg font-bold text-cyan-300 font-mono">
                    {(ahp.weights[index] * 100).toFixed(1)}%
                  </div>
                  <div className="text-[9px] text-slate-600">
                    {criterion.type === "cost" ? "makin kecil makin baik" : "makin besar makin baik"}
                  </div>
                </div>
              ))}
            </div>

            <div
              className={`flex items-start gap-2 text-[11px] p-2 rounded-lg border ${
                ahp.isConsistent
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-200"
              }`}
            >
              {ahp.isConsistent ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">
                <strong>Consistency Ratio = {ahp.consistencyRatio.toFixed(3)}</strong>{" "}
                (λmax {ahp.lambdaMax.toFixed(3)}, CI {ahp.consistencyIndex.toFixed(3)}, RI {ahp.randomIndex}).{" "}
                {ahp.isConsistent
                  ? "CR ≤ 0,10 — penilaian konsisten dan bobot layak dipakai."
                  : "CR > 0,10 — penilaian saling bertentangan (mis. A > B, B > C, tetapi C > A). Sesuaikan kembali agar hasilnya sah menurut Saaty."}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
