import React, { useState, useEffect, useMemo, useCallback } from "react";

import Navbar from "./components/Navbar";
import CompanySearchBar from "./components/CompanySearchBar";
import OptimizationControls, { PAIRS, PRESETS, sliderToSaaty } from "./components/OptimizationControls";
import SupplyChainMap from "./components/SupplyChainMap";
import BomBreakdownTable from "./components/BomBreakdownTable";
import LiveScrapingConsole from "./components/LiveScrapingConsole";
import SopDocModal from "./components/SopDocModal";
import { DisclosurePanel } from "./components/SourceBadge";

import { getHealth, analyzeSupplyChain } from "./api/client";
import { CRITERIA, buildPairwiseMatrix, ahpWeights, selectSuppliers } from "./utils/mcdm";

export default function App() {
  const [health, setHealth] = useState(null);
  const [serverError, setServerError] = useState(null);

  const [company, setCompany] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [events, setEvents] = useState([]);
  const [isWorking, setIsWorking] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const [strategy, setStrategy] = useState("topsis");
  const [pairValues, setPairValues] = useState(PRESETS.seimbang.values);
  const [isDocOpen, setIsDocOpen] = useState(false);

  // Cek ketersediaan server proxy saat halaman dibuka.
  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() =>
        setServerError(
          "Server proxy tidak merespons di http://localhost:5174. "
          + "Jalankan `npm run server` di terminal terpisah, atau `npm start` untuk menjalankan keduanya."
        )
      );
  }, []);

  // Bobot AHP dihitung ulang setiap perbandingan berpasangan berubah.
  const ahp = useMemo(() => {
    const comparisons = PAIRS.map((pair, index) => ({
      i: pair.i,
      j: pair.j,
      value: sliderToSaaty(pairValues[index])
    }));
    return ahpWeights(buildPairwiseMatrix(CRITERIA.length, comparisons));
  }, [pairValues]);

  // Pemilihan pemasok murni perhitungan sisi klien: mengubah strategi atau
  // bobot tidak memicu pengambilan data ulang, sehingga responsnya seketika.
  const selection = useMemo(() => {
    if (!analysis) return null;
    return selectSuppliers({
      components: analysis.components,
      strategy,
      weights: ahp.weights
    });
  }, [analysis, strategy, ahp.weights]);

  const runAnalysis = useCallback(async (target) => {
    setCompany(target);
    setAnalysis(null);
    setAnalysisError(null);
    setEvents([{ stage: "profile", message: `Memulai analisis untuk ${target.name}`, at: new Date().toISOString() }]);
    setIsWorking(true);

    try {
      const result = await analyzeSupplyChain(target, (event) =>
        setEvents((prev) => [...prev, event])
      );
      setAnalysis(result);
    } catch (err) {
      setAnalysisError(err.message);
      setEvents((prev) => [
        ...prev,
        { stage: "done", level: "warn", message: `Analisis gagal: ${err.message}`, at: new Date().toISOString() }
      ]);
    } finally {
      setIsWorking(false);
    }
  }, []);

  const handlePairChange = (index, value) =>
    setPairValues((prev) => prev.map((v, i) => (i === index ? value : v)));

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      <Navbar isWorking={isWorking} health={health} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        {serverError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-sm text-rose-200">
            {serverError}
          </div>
        )}

        <CompanySearchBar
          selectedCompany={company}
          onSelectCompany={runAnalysis}
          isWorking={isWorking}
        />

        {isWorking && (
          <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-start gap-3">
            <span className="relative flex h-3 w-3 mt-1 shrink-0">
              <span className="animate-radar absolute inline-flex h-full w-full rounded-full bg-cyan-400" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-cyan-200">
                Menganalisis {company?.name}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {events[events.length - 1]?.message}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Analisis pertama untuk sebuah perusahaan memakan waktu 30–90 detik: sumber data
                terbuka membatasi 1 permintaan per detik. Hasilnya di-cache, jadi pencarian
                berikutnya jauh lebih cepat.
              </p>
            </div>
          </div>
        )}

        {analysisError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-sm text-rose-200">
            {analysisError}
          </div>
        )}

        {analysis?.bom?.notApplicable && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-2">
            <div className="text-sm font-bold text-amber-200">
              Analisis rantai pasok tidak berlaku untuk entitas ini
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              <strong>{company?.name}</strong> terdeteksi sebagai{" "}
              <strong>{analysis.bom.industry}</strong>, bukan usaha yang memproduksi barang.
              Sistem ini memetakan pemasok bahan baku, sehingga tidak ada rantai pasok
              produksi yang bisa dipetakan di sini.
            </p>
            <p className="text-[11px] text-slate-400">
              Dasar: {analysis.bom.evidence}
            </p>
          </div>
        )}

        {analysis && !analysis.bom.notApplicable && (
          <div className="glass-panel p-4 rounded-2xl border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-500 uppercase tracking-wide">Model bisnis terdeteksi</div>
              <p className="text-sm text-slate-200 mt-0.5">{analysis.bom.businessModel || "—"}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Industri: <strong className="text-slate-300">{analysis.bom.industry}</strong> · Satuan acuan:{" "}
                {analysis.bom.productUnit} · Metode penurunan BOM: {analysis.bom.method}
              </p>
              {analysis.bom.evidence && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Dasar klasifikasi: {analysis.bom.evidence}
                  {analysis.bom.runnerUp && ` · pesaing terdekat: ${analysis.bom.runnerUp}`}
                </p>
              )}
            </div>
            {analysis.bom.generic && (
              <div className="shrink-0 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 max-w-xs">
                Teks profil tidak cukup spesifik untuk menentukan produk; BOM memakai pola
                manufaktur umum.
              </div>
            )}
          </div>
        )}

        <OptimizationControls
          strategy={strategy}
          onStrategyChange={setStrategy}
          pairValues={pairValues}
          onPairChange={handlePairChange}
          onPreset={setPairValues}
          onOpenSop={() => setIsDocOpen(true)}
          disabled={isWorking}
          hasResult={Boolean(analysis)}
        />

        <SupplyChainMap company={company} selection={selection} />

        {selection && selection.results.length > 0 && <BomBreakdownTable selection={selection} />}

        <LiveScrapingConsole events={events} isWorking={isWorking} />

        <DisclosurePanel disclosure={health?.disclosure} />
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 space-y-1">
        <div>SupplyChainAI — pemetaan rantai pasok dari data terbuka</div>
        <div className="text-[11px] text-slate-600">
          Data lokasi © Kontributor OpenStreetMap (ODbL) · Routing oleh OSRM
        </div>
      </footer>

      <SopDocModal
        isOpen={isDocOpen}
        onClose={() => setIsDocOpen(false)}
        analysis={analysis}
        selection={selection}
        ahp={ahp}
      />
    </div>
  );
}
