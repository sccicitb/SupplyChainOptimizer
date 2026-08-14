import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { Compass, Navigation } from "lucide-react";
import { formatIDR, formatNumber, formatDuration } from "../utils/format";

// Peta hanya menggambar apa yang benar-benar ada di hasil analisis. Tidak ada
// titik yang dihasilkan sendiri oleh komponen ini; setiap penanda pemasok
// membawa tautan ke entitas OpenStreetMap asalnya di dalam popup-nya.

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function SupplyChainMap({ company, selection }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  // Inisialisasi peta sekali saja.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: false }).setView([-7.5, 110.5], 7);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Gambar ulang penanda setiap kali perusahaan atau pilihan pemasok berubah.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer || !company) return;

    layer.clearLayers();
    const bounds = L.latLngBounds([]);

    // Pabrik target.
    const factoryIcon = L.divIcon({
      className: "",
      html: '<div class="custom-factory-pin">🏭</div>',
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    L.marker([company.lat, company.lng], { icon: factoryIcon })
      .addTo(layer)
      .bindPopup(`
        <div style="font-family: system-ui, sans-serif; padding: 2px; max-width: 260px;">
          <div style="font-size: 10px; color: #ef4444; font-weight: 800; text-transform: uppercase; letter-spacing: .4px;">Pabrik target</div>
          <div style="font-size: 14px; font-weight: 800; color: #f8fafc; margin-top: 2px;">${escapeHtml(company.name)}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${escapeHtml(company.displayName || "")}</div>
          <div style="font-size: 11px; font-family: monospace; color: #38bdf8; margin-top: 6px; background: rgba(2,132,199,.12); padding: 4px 8px; border-radius: 4px;">
            ${company.lat.toFixed(6)}, ${company.lng.toFixed(6)}
          </div>
          ${company.osmUrl
            ? `<a href="${company.osmUrl}" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;font-size:10px;color:#34d399;">Verifikasi di OpenStreetMap →</a>`
            : ""}
        </div>
      `);

    bounds.extend([company.lat, company.lng]);

    // Pemasok terpilih per komponen.
    for (const entry of selection?.results || []) {
      const supplier = entry.selected;
      if (!supplier) continue;

      const color = entry.component.color || "#38bdf8";

      const supplierIcon = L.divIcon({
        className: "",
        html: `<div class="custom-supplier-pin" style="background:${color};box-shadow:0 0 12px ${color}80;">📦</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const distanceNote = supplier.distanceMethod === "osrm-road"
        ? "jarak jalan (OSRM)"
        : "estimasi jarak (OSRM tidak tersedia)";

      L.marker([supplier.lat, supplier.lng], { icon: supplierIcon })
        .addTo(layer)
        .bindPopup(`
          <div style="font-family: system-ui, sans-serif; padding: 2px; max-width: 280px;">
            <div style="font-size: 10px; color: ${color}; font-weight: 800; text-transform: uppercase;">
              ${escapeHtml(entry.component.name)}
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #f8fafc; margin-top: 2px;">
              ${escapeHtml(supplier.name)}
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;">
              ${escapeHtml(supplier.address || supplier.city || "")}
            </div>

            <div style="margin-top:8px;font-size:11px;display:grid;grid-template-columns:1fr 1fr;gap:4px;background:#1e293b;padding:6px;border-radius:6px;">
              <div><span style="color:#64748b;">Jarak:</span> <b style="color:#38bdf8;">${formatNumber(supplier.distanceKm)} km</b></div>
              <div><span style="color:#64748b;">Tempuh:</span> <b style="color:#cbd5e1;">${formatDuration(supplier.travelMinutes)}</b></div>
              <div><span style="color:#64748b;">Harga~:</span> <b style="color:#fbbf24;">${formatIDR(supplier.pricePerUnit)}</b></div>
              <div><span style="color:#64748b;">Ongkir~:</span> <b style="color:#fbbf24;">${formatIDR(supplier.freightCost)}</b></div>
            </div>

            <div style="margin-top:6px;font-size:10px;color:#94a3b8;line-height:1.5;">
              <div>📍 <span style="font-family:monospace;">${supplier.lat.toFixed(6)}, ${supplier.lng.toFixed(6)}</span></div>
              <div>📏 ${distanceNote} — garis lurus ${formatNumber(supplier.straightLineKm)} km</div>
              <div>🏷️ ${escapeHtml(supplier.sourceLabel || "OSM")}: <span style="font-family:monospace;">${escapeHtml(supplier.osmTag || "—")}</span></div>
              ${supplier.rating != null
                ? `<div>⭐ ${supplier.rating} dari ${supplier.reviews} ulasan</div>`
                : ""}
              <div style="color:#fbbf24;">~ harga & ongkir adalah estimasi model, bukan penawaran</div>
            </div>

            ${supplier.osmUrl
              ? `<a href="${supplier.osmUrl}" target="_blank" rel="noopener" style="display:inline-block;margin-top:6px;font-size:10px;color:#34d399;">Verifikasi di ${escapeHtml(supplier.sourceLabel || "OpenStreetMap")} →</a>`
              : ""}
          </div>
        `);

      L.polyline(
        [[company.lat, company.lng], [supplier.lat, supplier.lng]],
        { color, weight: 3, opacity: 0.75, dashArray: "6, 10" }
      ).addTo(layer);

      bounds.extend([supplier.lat, supplier.lng]);
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [company, selection]);

  const summary = selection?.summary;

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800/90 shadow-2xl space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-sm text-slate-100">Peta Rantai Pasok</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            Pabrik target
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            Pemasok terpilih
          </span>
        </div>
      </div>

      <div className="relative w-full h-[440px] rounded-xl overflow-hidden border border-slate-800 shadow-inner">
        <div ref={containerRef} className="w-full h-full" />

        {!company && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-sm text-slate-400 z-[400]">
            Cari sebuah perusahaan untuk memulai
          </div>
        )}

        {summary && (
          <div className="absolute bottom-4 left-4 z-[400] glass-panel px-4 py-2.5 rounded-xl border border-slate-700/80 shadow-2xl text-xs space-y-1">
            <div className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              Rute terpilih ({summary.supplierCount} dari {summary.componentCount} komponen)
            </div>
            <div className="text-slate-300 font-mono flex items-center gap-3 text-[11px] flex-wrap">
              <span>
                Rata-rata jarak: <strong className="text-white">{formatNumber(summary.averageDistanceKm)} km</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span>
                Total biaya~: <strong className="text-amber-400">{formatIDR(summary.grandTotalCost)}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
