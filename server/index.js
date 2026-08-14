// Server proxy untuk AI Supply Chain Mapper.
//
// Browser tidak bisa memanggil Nominatim, Overpass, OSRM, atau mesin pencari
// secara langsung: kebijakan CORS memblokirnya, dan User-Agent berisi kontak
// yang diwajibkan Nominatim tidak dapat diatur dari sisi browser. Server ini
// menjadi perantaranya, sekaligus tempat rate limit dan cache ditegakkan.

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";

// Muat .env dari folder server, bukan dari direktori kerja. `npm run server`
// dijalankan dari root proyek, sehingga `dotenv/config` bawaan akan mencari
// .env di tempat yang salah dan diam-diam tidak menemukan apa pun.
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });

import { analyzeSupplyChain, geocodeCompany } from "./lib/supplyChain.js";
import { PRICE_MODEL_DISCLOSURE } from "./lib/priceModel.js";
import { isAiAvailable } from "./lib/bomAi.js";
import { isGoogleMapsAvailable } from "./lib/googleMaps.js";

function supplierSourceLabel() {
  const mode = (process.env.SUPPLIER_SOURCE || "auto").toLowerCase();
  if (mode === "osm") return "OpenStreetMap saja (dikunci)";
  if (!isGoogleMapsAvailable()) return "OpenStreetMap (SERPAPI_KEY belum diisi)";
  if (mode === "google") return "Google Maps saja (dikunci)";
  return "Google Maps utama, OpenStreetMap cadangan";
}

const app = express();
const PORT = process.env.PORT || 5174;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

if (!process.env.CONTACT_EMAIL) {
  console.warn(
    "\n[peringatan] CONTACT_EMAIL belum diisi di server/.env.\n"
    + "Kebijakan Nominatim mewajibkan alamat kontak yang valid pada User-Agent;\n"
    + "tanpa itu request Anda bisa dibatasi atau diblokir.\n"
  );
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    sources: {
      geocoding: "Nominatim (OpenStreetMap)",
      supplierDiscovery: supplierSourceLabel(),
      routing: "OSRM (jaringan jalan OpenStreetMap)",
      webSearch: process.env.SERPAPI_KEY ? "Google via SerpAPI" : "DuckDuckGo HTML",
      bomDerivation: isAiAvailable() ? "Claude (claude-opus-5)" : "Aturan taksonomi kata kunci"
    },
    disclosure: PRICE_MODEL_DISCLOSURE
  });
});

/** Pencarian perusahaan — mengembalikan kandidat agar pengguna memilih. */
app.get("/api/company/search", async (req, res) => {
  const q = (req.query.q || "").toString().trim();
  if (q.length < 3) {
    return res.status(400).json({ error: "Kata kunci minimal 3 karakter." });
  }

  try {
    const results = await geocodeCompany(q, { limit: 6 });
    res.json({
      query: q,
      count: results.length,
      source: "Nominatim (OpenStreetMap)",
      results: results.map((r) => ({
        name: r.name,
        displayName: r.displayName,
        lat: r.lat,
        lng: r.lng,
        city: r.city,
        province: r.province,
        category: r.category,
        type: r.type,
        website: r.website,
        osmType: r.osmType,
        osmId: r.osmId,
        osmUrl: r.osmUrl
      }))
    });
  } catch (err) {
    console.error("[company/search]", err);
    res.status(502).json({ error: `Gagal menghubungi Nominatim: ${err.message}` });
  }
});

/** Analisis rantai pasok, hasil sekali kirim. */
app.post("/api/analyze", async (req, res) => {
  const { company } = req.body || {};
  if (!company?.name || !Number.isFinite(company.lat) || !Number.isFinite(company.lng)) {
    return res.status(400).json({ error: "Butuh objek company dengan name, lat, dan lng." });
  }

  try {
    const result = await analyzeSupplyChain({ company });
    res.json(result);
  } catch (err) {
    console.error("[analyze]", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Analisis dengan pelaporan kemajuan langsung (Server-Sent Events).
 * Dipakai antarmuka untuk menampilkan proses yang benar-benar berjalan,
 * bukan animasi yang diatur timer.
 */
app.post("/api/analyze/stream", async (req, res) => {
  const { company } = req.body || {};
  if (!company?.name || !Number.isFinite(company.lat) || !Number.isFinite(company.lng)) {
    return res.status(400).json({ error: "Butuh objek company dengan name, lat, dan lng." });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await analyzeSupplyChain({
      company,
      onProgress: (p) => send("progress", { ...p, at: new Date().toISOString() })
    });
    send("result", result);
  } catch (err) {
    console.error("[analyze/stream]", err);
    send("error", { message: err.message });
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`\n  Supply Chain Mapper API berjalan di http://localhost:${PORT}`);
  console.log(`  Pemasok      : ${supplierSourceLabel()}`);
  console.log(`  Rute & profil: OSRM, ${process.env.SERPAPI_KEY ? "Google Search via SerpAPI" : "DuckDuckGo"}`);
  console.log(`  Penurunan BOM: ${isAiAvailable() ? "Claude claude-opus-5" : "aturan taksonomi (set ANTHROPIC_API_KEY untuk mode AI)"}`);
  console.log(`  Kontak UA    : ${process.env.CONTACT_EMAIL || "BELUM DIISI — lihat server/.env.example"}\n`);
});
