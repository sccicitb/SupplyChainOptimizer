import React from "react";
import { X, Printer, FileText } from "lucide-react";
import { formatIDR, formatNumber } from "../utils/format";
import { CRITERIA } from "../utils/mcdm";

// Dokumen yang bisa dicetak: metodologi, sumber data, dan hasil pemilihan.
// Disusun agar dapat dilampirkan ke laporan tanpa perlu menulis ulang
// asal-usul setiap angka.

export default function SopDocModal({ isOpen, onClose, analysis, selection, ahp }) {
  if (!isOpen || !analysis || !selection) return null;

  const { company, profile, bom } = analysis;
  const generated = new Date(analysis.generatedAt).toLocaleString("id-ID");

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm overflow-y-auto p-4 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto my-6 print:my-0 bg-white text-slate-900 rounded-2xl print:rounded-none shadow-2xl">
        {/* Toolbar — disembunyikan saat mencetak */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-3 bg-slate-100 border-b border-slate-300 rounded-t-2xl print:hidden">
          <div className="flex items-center gap-2 font-bold text-sm">
            <FileText className="w-4 h-4 text-cyan-700" />
            Dokumen Metodologi & Hasil Analisis
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-cyan-700 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-cyan-800"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200" aria-label="Tutup">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-8 py-8 space-y-7 text-sm leading-relaxed">
          <header className="border-b-2 border-slate-800 pb-4">
            <h1 className="text-2xl font-extrabold">Pemetaan Rantai Pasok Berbasis Geodata</h1>
            <p className="text-slate-600 mt-1">
              Studi kasus: <strong>{company.name}</strong> — {bom.industry}
            </p>
            <p className="text-xs text-slate-500 mt-2">Dibuat {generated}</p>
          </header>

          {/* 1. Objek analisis */}
          <section className="space-y-2">
            <h2 className="text-base font-bold border-b border-slate-300 pb-1">1. Objek Analisis</h2>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-1.5 pr-4 font-semibold w-40">Perusahaan</td>
                  <td className="py-1.5">{company.name}</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-semibold">Alamat (OSM)</td>
                  <td className="py-1.5">{company.displayName}</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-semibold">Koordinat</td>
                  <td className="py-1.5 font-mono">
                    {company.lat.toFixed(6)}, {company.lng.toFixed(6)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-semibold">Referensi OSM</td>
                  <td className="py-1.5 font-mono text-xs break-all">{company.osmUrl}</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-semibold">Model bisnis</td>
                  <td className="py-1.5">{bom.businessModel || "—"}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 2. Sumber data */}
          <section className="space-y-2">
            <h2 className="text-base font-bold border-b border-slate-300 pb-1">2. Sumber Data</h2>
            <p className="text-xs">
              Semua lokasi berasal dari OpenStreetMap dan dapat diperiksa lewat tautan yang
              disertakan. Profil perusahaan diambil dari mesin pencari dan situs resminya.
            </p>
            <ul className="text-xs list-disc pl-5 space-y-1">
              <li><strong>Geocoding:</strong> Nominatim (OpenStreetMap)</li>
              <li><strong>Pencarian pemasok:</strong> Nominatim (pencarian teks berbatas wilayah) + Overpass API (pencarian berbasis tag)</li>
              <li><strong>Jarak & waktu tempuh:</strong> OSRM di atas jaringan jalan OpenStreetMap</li>
              <li><strong>Profil perusahaan:</strong> {profile.searchEngine}{profile.siteRead ? `, serta situs resmi ${profile.siteRead.url}` : ""}</li>
              <li><strong>Penurunan BOM:</strong> {bom.method}</li>
            </ul>

            {profile.sources.length > 0 && (
              <>
                <h3 className="text-xs font-bold mt-3">Halaman yang dibaca:</h3>
                <ol className="text-xs list-decimal pl-5 space-y-0.5 text-slate-700">
                  {profile.sources.map((s) => (
                    <li key={s.url} className="break-all">
                      {s.title} — <span className="font-mono">{s.url}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>

          {/* 3. Metode */}
          <section className="space-y-2">
            <h2 className="text-base font-bold border-b border-slate-300 pb-1">3. Metode Pengambilan Keputusan</h2>

            <h3 className="text-sm font-bold mt-2">3.1 AHP — pembobotan kriteria</h3>
            <p className="text-xs">
              Bobot kriteria diturunkan dengan Analytic Hierarchy Process (Saaty, 1980) dari
              matriks perbandingan berpasangan berskala 1–9. Vektor prioritas dihitung dengan
              rata-rata geometris baris yang dinormalisasi.
            </p>
            <table className="w-full text-xs border border-slate-300 mt-2">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 text-left">Kriteria</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Jenis</th>
                  <th className="border border-slate-300 px-2 py-1 text-right">Bobot</th>
                </tr>
              </thead>
              <tbody>
                {CRITERIA.map((criterion, index) => (
                  <tr key={criterion.id}>
                    <td className="border border-slate-300 px-2 py-1">{criterion.label}</td>
                    <td className="border border-slate-300 px-2 py-1">
                      {criterion.type === "cost" ? "cost (minimasi)" : "benefit (maksimasi)"}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                      {selection.weights[index]?.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ahp && (
              <p className="text-xs mt-1">
                Uji konsistensi: λmax = {ahp.lambdaMax.toFixed(4)}, CI = {ahp.consistencyIndex.toFixed(4)},
                RI = {ahp.randomIndex}, <strong>CR = {ahp.consistencyRatio.toFixed(4)}</strong>{" "}
                ({ahp.isConsistent ? "konsisten, CR ≤ 0,10" : "TIDAK konsisten, CR > 0,10"}).
              </p>
            )}

            <h3 className="text-sm font-bold mt-3">3.2 TOPSIS — pemeringkatan alternatif</h3>
            <ol className="text-xs list-decimal pl-5 space-y-0.5">
              <li>Susun matriks keputusan X (alternatif × kriteria)</li>
              <li>Normalisasi vektor: r<sub>ij</sub> = x<sub>ij</sub> / √(Σ<sub>i</sub> x<sub>ij</sub>²)</li>
              <li>Pembobotan: v<sub>ij</sub> = w<sub>j</sub> · r<sub>ij</sub></li>
              <li>Solusi ideal positif A⁺ dan negatif A⁻ per kriteria menurut jenisnya</li>
              <li>Jarak Euclidean D<sub>i</sub>⁺ dan D<sub>i</sub>⁻ ke kedua solusi ideal</li>
              <li>Kedekatan relatif: C<sub>i</sub> = D<sub>i</sub>⁻ / (D<sub>i</sub>⁺ + D<sub>i</sub>⁻); alternatif dengan C<sub>i</sub> terbesar dipilih</li>
            </ol>
          </section>

          {/* 4. Hasil */}
          <section className="space-y-2">
            <h2 className="text-base font-bold border-b border-slate-300 pb-1">4. Hasil Pemilihan Pemasok</h2>
            <p className="text-xs">
              Strategi: <strong>{selection.strategy === "topsis" ? "TOPSIS + AHP" : selection.strategy === "nearest" ? "Jarak terdekat" : "Biaya terendah"}</strong>
            </p>

            <table className="w-full text-xs border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-2 py-1 text-left">Komponen</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Pemasok terpilih</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Koordinat</th>
                  <th className="border border-slate-300 px-2 py-1 text-right">Jarak</th>
                  <th className="border border-slate-300 px-2 py-1 text-right">Biaya~</th>
                  <th className="border border-slate-300 px-2 py-1 text-right">Cᵢ</th>
                </tr>
              </thead>
              <tbody>
                {selection.results.map((entry) => (
                  <tr key={entry.component.id}>
                    <td className="border border-slate-300 px-2 py-1">{entry.component.name}</td>
                    <td className="border border-slate-300 px-2 py-1">
                      {entry.selected ? entry.selected.name : <em className="text-slate-500">tidak ada kandidat</em>}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 font-mono text-[10px]">
                      {entry.selected ? `${entry.selected.lat.toFixed(5)}, ${entry.selected.lng.toFixed(5)}` : "—"}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                      {entry.selected ? `${formatNumber(entry.selected.distanceKm)} km` : "—"}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                      {entry.selected ? formatIDR(entry.selected.totalCost) : "—"}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                      {entry.selected?.topsis ? entry.selected.topsis.closeness.toFixed(4) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold">
                <tr>
                  <td className="border border-slate-300 px-2 py-1" colSpan={3}>Total</td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                    {formatNumber(selection.summary.totalDistanceKm)} km
                  </td>
                  <td className="border border-slate-300 px-2 py-1 text-right font-mono">
                    {formatIDR(selection.summary.grandTotalCost)}
                  </td>
                  <td className="border border-slate-300 px-2 py-1" />
                </tr>
              </tfoot>
            </table>

            <h3 className="text-xs font-bold mt-3">Tautan verifikasi pemasok terpilih:</h3>
            <ol className="text-[10px] list-decimal pl-5 space-y-0.5 text-slate-700">
              {selection.results.filter((e) => e.selected).map((entry) => (
                <li key={entry.component.id} className="break-all">
                  {entry.selected.name} — <span className="font-mono">{entry.selected.osmUrl}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* 5. Batasan */}
          <section className="space-y-2">
            <h2 className="text-base font-bold border-b border-slate-300 pb-1">5. Batasan & Keabsahan</h2>
            <ul className="text-xs list-disc pl-5 space-y-1">
              <li>
                <strong>Harga dan ongkos angkut adalah estimasi model</strong>, ditandai dengan
                simbol ~ di seluruh dokumen. Harga bahan baku industri B2B tidak dipublikasikan
                terbuka sehingga tidak dapat diambil dari web secara sah. Ganti dengan penawaran
                resmi pemasok sebelum dipakai untuk keputusan pengadaan.
              </li>
              <li>
                <strong>Cakupan bergantung pada kelengkapan OpenStreetMap.</strong> Pemasok yang
                belum terpetakan di OSM tidak akan muncul, dan sebagian entitas yang muncul mungkin
                bukan pemasok komponen yang dimaksud meski tag-nya cocok. Kolom "Keyakinan Data"
                menyatakan tingkat kepercayaan ini secara eksplisit.
              </li>
              <li>
                <strong>BOM adalah taksiran struktur produk</strong>, bukan BOM resmi perusahaan.
                Metode penurunan tercantum pada bagian 2.
              </li>
              <li>
                Jarak dihitung untuk kendaraan penumpang oleh OSRM; rute truk dengan pembatasan
                tonase dan jam operasional dapat berbeda.
              </li>
            </ul>
          </section>

          <footer className="border-t border-slate-300 pt-3 text-[10px] text-slate-500">
            Data lokasi: © Kontributor OpenStreetMap, ODbL. Routing: OSRM.
            Dokumen dihasilkan otomatis oleh SupplyChainAI.
          </footer>
        </div>
      </div>
    </div>
  );
}
