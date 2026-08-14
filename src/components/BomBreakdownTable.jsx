import React, { useState } from "react";
import {
  Layers, ChevronDown, ChevronRight, Trophy, AlertTriangle, Wrench, Box, Cpu, Disc, Shield
} from "lucide-react";
import SourceBadge from "./SourceBadge";
import { formatIDR, formatNumber, formatDuration } from "../utils/format";
import { CRITERIA } from "../utils/mcdm";

const ICONS = { Wrench, Box, Cpu, Disc, Shield, Layers };

function CandidateRow({ candidate, isSelected, strategy }) {
  return (
    <tr className={isSelected ? "bg-cyan-500/5" : ""}>
      <td className="px-3 py-2.5 align-top">
        <div className="flex items-start gap-2">
          {isSelected ? (
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <span className="w-3.5 text-center text-[11px] text-slate-600 shrink-0">{candidate.rank}</span>
          )}
          <div className="min-w-0">
            <div className={`text-xs font-semibold truncate ${isSelected ? "text-cyan-200" : "text-slate-200"}`}>
              {candidate.name}
            </div>
            <div className="text-[10px] text-slate-500 truncate">{candidate.city || candidate.address}</div>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <SourceBadge
                variant={candidate.placeId ? "google" : "osm"}
                label={candidate.osmTag || candidate.sourceLabel}
                href={candidate.osmUrl}
              />
              {candidate.rating != null && (
                <span
                  className="text-[10px] text-amber-300 font-semibold"
                  title={candidate.relevanceReason}
                >
                  ★ {candidate.rating} ({candidate.reviews})
                </span>
              )}
              <span className="text-[9px] text-slate-600">{candidate.scaleLabel}</span>
            </div>
          </div>
        </div>
      </td>

      <td className="px-3 py-2.5 align-top text-right">
        <div className="text-xs font-mono text-sky-300">{formatNumber(candidate.distanceKm)} km</div>
        <div className="text-[10px] text-slate-500">{formatDuration(candidate.travelMinutes)}</div>
        <SourceBadge
          variant={candidate.distanceMethod === "osrm-road" ? "osrm" : "haversine"}
          label={candidate.distanceMethod === "osrm-road" ? "jalan" : "estimasi"}
          className="mt-1"
        />
      </td>

      <td className="px-3 py-2.5 align-top text-right">
        <div
          className="text-xs font-mono text-amber-300"
          title={`Basis: ${candidate.priceBreakdown?.basis}\nHarga acuan ${formatIDR(candidate.priceBreakdown?.basePrice)} x skala ${candidate.priceBreakdown?.scaleFactor} x wilayah ${candidate.priceBreakdown?.regionFactor}`}
        >
          {formatIDR(candidate.pricePerUnit)}
        </div>
        <div className="text-[10px] text-slate-500">MOQ {candidate.moq} · {candidate.leadTimeDays} hari</div>
      </td>

      <td className="px-3 py-2.5 align-top text-right">
        <div className="text-xs font-mono text-slate-200">{formatIDR(candidate.totalCost)}</div>
        <div className="text-[10px] text-slate-500">
          bahan {formatIDR(candidate.materialCost)} + ongkir {formatIDR(candidate.freightCost)}
        </div>
      </td>

      <td className="px-3 py-2.5 align-top text-right">
        {candidate.topsis ? (
          <>
            <div className="text-xs font-mono font-bold text-emerald-300">
              {candidate.topsis.closeness.toFixed(4)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              D+ {candidate.topsis.distanceToBest.toFixed(4)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              D− {candidate.topsis.distanceToWorst.toFixed(4)}
            </div>
          </>
        ) : (
          <span className="text-[10px] text-slate-600">
            {strategy === "nearest" ? "urut jarak" : "urut biaya"}
          </span>
        )}
      </td>
    </tr>
  );
}

export default function BomBreakdownTable({ selection }) {
  const [expanded, setExpanded] = useState({});

  if (!selection) return null;

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="glass-panel rounded-2xl border border-slate-800/90 shadow-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-sm text-slate-100">Bill of Materials & Kandidat Pemasok</h3>
        </div>
        <div className="text-[11px] text-slate-400">
          {selection.strategy === "topsis"
            ? "Peringkat menurut kedekatan relatif TOPSIS (Cᵢ), bobot dari AHP"
            : `Peringkat menurut kriteria tunggal: ${selection.strategy === "nearest" ? "jarak" : "biaya"}`}
        </div>
      </div>

      <div className="divide-y divide-slate-800/70">
        {selection.results.map((entry) => {
          const { component, selected, candidates, note } = entry;
          const Icon = ICONS[component.icon] || Layers;
          const isOpen = expanded[component.id];

          return (
            <div key={component.id}>
              <button
                onClick={() => toggle(component.id)}
                className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-slate-800/30 transition text-left"
              >
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                )}

                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${component.color}22`, border: `1px solid ${component.color}55` }}
                >
                  <Icon className="w-4 h-4" style={{ color: component.color }} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-100 truncate">{component.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {component.qtyPerUnit} {component.unit} / unit — {component.spec}
                  </div>
                </div>

                <div className="shrink-0 text-right hidden sm:block">
                  {selected ? (
                    <>
                      <div className="text-xs font-semibold text-cyan-300 truncate max-w-[200px]">
                        {selected.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {formatNumber(selected.distanceKm)} km · {formatIDR(selected.totalCost)}
                      </div>
                    </>
                  ) : (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      tidak ada kandidat
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-slate-600 shrink-0">
                  {candidates.length} kandidat
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-4 bg-slate-950/40">
                  {note && (
                    <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        {note} Komponen ini dilewati dalam perhitungan total — sistem tidak
                        mengarang pemasok pengganti.
                      </span>
                    </div>
                  )}

                  {candidates.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                      <table className="w-full min-w-[720px] text-left">
                        <thead className="bg-slate-900/80">
                          <tr className="text-[10px] uppercase tracking-wider text-slate-500">
                            <th className="px-3 py-2 font-semibold">Pemasok</th>
                            <th className="px-3 py-2 font-semibold text-right">Jarak</th>
                            <th className="px-3 py-2 font-semibold text-right">Harga~ / satuan</th>
                            <th className="px-3 py-2 font-semibold text-right">Biaya total~</th>
                            <th className="px-3 py-2 font-semibold text-right">Skor Cᵢ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {candidates.map((candidate) => (
                            <CandidateRow
                              key={candidate.id}
                              candidate={candidate}
                              isSelected={selected && candidate.id === selected.id}
                              strategy={selection.strategy}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {entry.topsisSteps && (
                    <details className="mt-3 group">
                      <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-slate-200 select-none">
                        Lihat langkah perhitungan TOPSIS untuk komponen ini
                      </summary>
                      <div className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono space-y-2 overflow-x-auto">
                        <div className="text-slate-400">
                          Bobot AHP:{" "}
                          {entry.topsisSteps.weights
                            .map((w, i) => `${CRITERIA[i].label}=${w.toFixed(4)}`)
                            .join("  ")}
                        </div>
                        <div className="text-emerald-400">
                          A⁺ (solusi ideal positif): [{entry.topsisSteps.idealBest.join(", ")}]
                        </div>
                        <div className="text-rose-400">
                          A⁻ (solusi ideal negatif): [{entry.topsisSteps.idealWorst.join(", ")}]
                        </div>
                        <div className="text-slate-500">
                          Matriks ternormalisasi terbobot (baris = kandidat, kolom ={" "}
                          {CRITERIA.map((c) => c.label).join(" / ")}):
                        </div>
                        {entry.topsisSteps.weighted.map((row, i) => (
                          <div key={i} className="text-slate-300">
                            v[{i + 1}] = [{row.join(", ")}]
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ringkasan */}
      <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total bahan~</div>
          <div className="text-sm font-bold text-slate-100 font-mono">
            {formatIDR(selection.summary.totalMaterialCost)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total ongkir~</div>
          <div className="text-sm font-bold text-slate-100 font-mono">
            {formatIDR(selection.summary.totalFreightCost)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide">Grand total~</div>
          <div className="text-sm font-bold text-amber-400 font-mono">
            {formatIDR(selection.summary.grandTotalCost)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total jarak</div>
          <div className="text-sm font-bold text-sky-300 font-mono">
            {formatNumber(selection.summary.totalDistanceKm)} km
          </div>
        </div>
      </div>

      {selection.summary.unresolvedCount > 0 && (
        <div className="px-5 py-2.5 bg-amber-500/10 border-t border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {selection.summary.unresolvedCount} komponen tidak memiliki pemasok di OpenStreetMap dan
          tidak dihitung dalam total di atas.
        </div>
      )}
    </div>
  );
}
