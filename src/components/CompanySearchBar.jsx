import React, { useState } from "react";
import { Search, Building2, Loader2, AlertCircle, Navigation, ArrowRight } from "lucide-react";
import SourceBadge from "./SourceBadge";
import { searchCompanies } from "../api/client";

// Contoh untuk mempercepat pengujian. Ini hanya teks kueri — koordinatnya
// tetap diambil dari Nominatim saat dicari, tidak ada yang di-hardcode.
const EXAMPLE_QUERIES = [
  "PT Mega Andalan Kalasan",
  "PT Dirgantara Indonesia",
  "Krakatau Steel",
  "Polygon Bikes"
];

export default function CompanySearchBar({ selectedCompany, onSelectCompany, isWorking }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  const runSearch = async (searchTerm) => {
    const term = (searchTerm ?? query).trim();
    if (term.length < 3 || isSearching) return;

    setQuery(term);
    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      const data = await searchCompanies(term);
      setResults(data);

      // Satu hasil berarti tidak ada yang perlu dipilih — langsung analisis.
      // Meminta klik kedua di sini membuat tombol "Cari" terasa tidak berfungsi.
      if (data.results.length === 1) {
        onSelectCompany(data.results[0]);
        return;
      }

      if (data.results.length === 0) {
        setError(
          `"${term}" tidak ditemukan. Coba nama resmi lengkapnya, atau tambahkan nama kotanya `
          + '— misalnya "Nangkring Seblak Bandung".'
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800/90 shadow-2xl space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-slate-100">Cari Perusahaan atau Usaha</h2>
        </div>
        <span className="text-xs text-slate-400">
          Koordinat dan kategori usaha diambil langsung dari sumbernya, bukan simulasi
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch();
        }}
        className="relative flex items-center"
      >
        <div className="absolute left-4 text-slate-400 pointer-events-none">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ketik nama perusahaan, mis. PT Mega Andalan Kalasan"
          disabled={isWorking}
          className="w-full pl-12 pr-28 py-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSearching || isWorking || query.trim().length < 3}
          className="absolute right-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>{isSearching ? "Mencari…" : "Cari"}</span>
        </button>
      </form>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contoh:</span>
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example}
            onClick={() => runSearch(example)}
            disabled={isSearching || isWorking}
            className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-900/60 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200 disabled:opacity-40 transition"
          >
            {example}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {results?.results?.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wider">
            {results.count} hasil dari {results.source} — klik lokasi yang benar untuk memulai analisis
          </div>
          <div className="grid gap-2 max-h-64 overflow-y-auto pr-1">
            {results.results.map((r) => {
              const isSelected = selectedCompany?.osmId === r.osmId;
              return (
                <button
                  key={`${r.osmType}-${r.osmId}`}
                  onClick={() => onSelectCompany(r)}
                  disabled={isWorking}
                  className={`text-left p-3 rounded-xl border transition-all disabled:opacity-50 ${
                    isSelected
                      ? "bg-cyan-500/10 border-cyan-400/60"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-100 truncate">{r.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{r.displayName}</div>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <div className="font-mono text-[11px] text-cyan-400">
                        {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                      </div>
                      <SourceBadge
                        variant={r.placeId ? "google" : "osm"}
                        label={r.placeId ? r.type || "Google Maps" : `${r.osmType}/${r.osmId}`}
                        href={r.osmUrl}
                      />
                      {r.rating != null && (
                        <div className="text-[10px] text-amber-300 font-semibold">
                          ★ {r.rating} ({r.reviews})
                        </div>
                      )}
                      <div className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1 justify-end">
                        Analisis rantai pasok <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedCompany && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-cyan-300">{selectedCompany.name}</h3>
              {selectedCompany.city && (
                <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded border border-slate-700">
                  {selectedCompany.city}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 flex items-start gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>{selectedCompany.displayName}</span>
            </p>
          </div>

          <div className="shrink-0 space-y-1.5 text-right">
            <div className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
              <div className="text-[10px] text-slate-500">Koordinat pabrik</div>
              <div className="text-cyan-400 font-bold">
                {selectedCompany.lat.toFixed(6)}, {selectedCompany.lng.toFixed(6)}
              </div>
            </div>
            <SourceBadge variant="osm" label="Verifikasi di osm.org" href={selectedCompany.osmUrl} />
          </div>
        </div>
      )}
    </div>
  );
}
