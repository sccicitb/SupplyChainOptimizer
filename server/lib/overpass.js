// Overpass API — pencarian pemasok berbasis tag OpenStreetMap.
//
// Pelengkap Nominatim: Nominatim unggul mencari entitas yang namanya memuat
// kata kunci, Overpass unggul menemukan entitas yang tag industrinya cocok
// meski namanya tidak menyebut komoditas apa pun (mis. "CV Tridodo Jaya"
// yang bertag craft=foundry). Server publik Overpass sering sibuk, jadi
// kegagalan di sini diperlakukan sebagai non-fatal.

import { politeFetch } from "./http.js";
import { cached, TTL } from "./cache.js";
import { scoreCandidate, inferScale } from "./relevance.js";

const ENDPOINT = process.env.OVERPASS_ENDPOINT || "https://overpass-api.de/api/interpreter";

// Overpass adalah sumber pelengkap, bukan sumber utama — Nominatim sudah
// menemukan sebagian besar kandidat. Karena itu ia harus gagal cepat.
//
// Tanpa pembatas ini, server Overpass publik yang sedang sibuk membuat setiap
// komponen menunggu sampai timeout penuh: pada satu pengujian, 103 detik untuk
// komponen pertama saja, dan diulang untuk tiap komponen berikutnya karena
// kegagalan tidak diingat. Satu analisis bisa memakan lebih dari lima menit.
const REQUEST_TIMEOUT_MS = 20000;
const CIRCUIT_OPEN_MS = 5 * 60 * 1000;
const FAILURES_BEFORE_OPEN = 2;

const circuit = { failures: 0, openedAt: 0 };

function circuitIsOpen() {
  if (circuit.failures < FAILURES_BEFORE_OPEN) return false;
  if (Date.now() - circuit.openedAt > CIRCUIT_OPEN_MS) {
    circuit.failures = 0;
    return false;
  }
  return true;
}

function recordFailure() {
  circuit.failures += 1;
  if (circuit.failures >= FAILURES_BEFORE_OPEN) circuit.openedAt = Date.now();
}

function buildQuery({ lat, lng, radiusM, tagFilters, nameRegex, limit }) {
  const around = `(around:${Math.round(radiusM)},${lat},${lng})`;
  const nameClause = nameRegex ? `["name"~"${nameRegex}",i]` : "";

  const clauses = tagFilters
    .map(([k, v]) => (v === "*" ? `nwr["${k}"]${nameClause}${around};` : `nwr["${k}"="${v}"]${nameClause}${around};`))
    .join("\n  ");

  // Batas waktu di dalam query harus lebih pendek dari timeout HTTP kita,
  // supaya server sempat membalas "sibuk" alih-alih menggantung koneksi.
  return `[out:json][timeout:15];\n(\n  ${clauses}\n);\nout center tags ${limit};`;
}

function normalizeElement(el) {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const tags = el.tags || {};

  // Overpass mengembalikan tag mentah, bukan pasangan category/type seperti
  // Nominatim. Kita turunkan sendiri agar penyaring relevansi bisa dipakai
  // untuk kedua sumber tanpa cabang khusus.
  const CATEGORY_KEYS = ["craft", "industrial", "shop", "man_made", "office", "building", "landuse", "amenity"];
  let category = null;
  let type = null;
  for (const k of CATEGORY_KEYS) {
    if (tags[k]) {
      category = k;
      type = tags[k];
      break;
    }
  }

  return {
    osmType: el.type,
    osmId: el.id,
    osmUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    name: tags.name || tags["name:id"] || tags.operator || "",
    displayName: tags.name || "",
    lat,
    lng,
    category,
    type,
    tags,
    city: tags["addr:city"] || tags["addr:subdistrict"] || null,
    address: tags["addr:full"]
      || [tags["addr:street"], tags["addr:housenumber"], tags["addr:city"]].filter(Boolean).join(" ")
      || null,
    source: "openstreetmap-overpass"
  };
}

/**
 * Mencari entitas ber-tag industri di sekitar sebuah titik.
 * Mengembalikan array kosong (bukan melempar error) bila Overpass sedang
 * sibuk — sistem tetap berjalan dengan hasil Nominatim saja.
 */
export async function findByTags({ lat, lng, radiusM, tagFilters, nameRegex = null, keywords = [], limit = 40 }) {
  if (!tagFilters || tagFilters.length === 0) return [];

  if (circuitIsOpen()) {
    // Sudah gagal berturut-turut; jangan buat komponen berikutnya menunggu
    // timeout yang sama.
    return [];
  }

  const query = buildQuery({ lat, lng, radiusM, tagFilters, nameRegex, limit });
  const key = `overpass:${query}`;

  let elements;
  try {
    elements = await cached(key, TTL.SUPPLIERS, async () => {
      const res = await politeFetch(ENDPOINT, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeoutMs: REQUEST_TIMEOUT_MS,
        retries: 0
      });

      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

      const text = await res.text();
      // Saat kelebihan beban, Overpass membalas halaman HTML dengan status 200.
      if (!text.trim().startsWith("{")) throw new Error("Overpass sedang sibuk");
      return JSON.parse(text).elements || [];
    });
    circuit.failures = 0;
  } catch (err) {
    recordFailure();
    console.warn(
      `[overpass] dilewati: ${err.message}`
      + (circuitIsOpen() ? " — sumber ini dinonaktifkan sementara untuk analisis berikutnya" : "")
    );
    return [];
  }

  const out = [];
  for (const el of elements) {
    const entity = normalizeElement(el);
    if (!entity) continue;

    const verdict = scoreCandidate(entity, keywords);
    if (!verdict.accepted) continue;

    out.push({
      ...entity,
      relevance: verdict.score,
      relevanceReason: verdict.reason,
      scale: inferScale(entity.name, entity.category, entity.type),
      website: entity.tags.website || entity.tags["contact:website"] || null
    });
  }

  return out;
}
