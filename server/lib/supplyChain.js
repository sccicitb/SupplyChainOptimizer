// Orkestrator: dari nama perusahaan sampai daftar kandidat pemasok bergeodata.
//
// Alurnya:
//   1. Geocode perusahaan (Nominatim)            → koordinat pabrik yang nyata
//   2. Scraping profil (mesin pencari + situs)   → teks model bisnis
//   3. Penurunan BOM (AI atau aturan taksonomi)  → komponen yang dibutuhkan
//   4. Pencarian pemasok (Nominatim + Overpass)  → kandidat nyata per komponen
//   5. Jarak jalan (OSRM) + estimasi biaya       → atribut untuk pemeringkatan
//
// Setiap tahap melaporkan kemajuannya lewat callback `onProgress`, sehingga
// konsol di antarmuka menampilkan proses yang benar-benar berjalan.

import { geocodeCompany, searchSuppliers, boundingBox } from "./nominatim.js";
import { findByTags } from "./overpass.js";
import { searchPlaces, isGoogleMapsAvailable } from "./googleMaps.js";
import { roadDistance, haversineKm } from "./osrm.js";
import { buildCompanyProfile } from "./profile.js";
import { deriveBomByRules } from "./bomTaxonomy.js";
import { deriveBomWithAi, isAiAvailable } from "./bomAi.js";
import { estimateUnitPrice, estimateFreight } from "./priceModel.js";
import { dedupe } from "./relevance.js";

// Cincin pencarian: lokal dulu, lalu regional. Dua cincin adalah kompromi
// antara cakupan dan jumlah request — Nominatim dibatasi 1 request/detik.
const SEARCH_RINGS = [
  { radiusKm: 150, label: "regional" },
  { radiusKm: 600, label: "lintas provinsi" }
];

const MAX_CANDIDATES_PER_COMPONENT = 4;

// Google Maps mengabaikan batas wilayah secara longgar: kueri di sekitar
// Yogyakarta bisa mengembalikan hasil di Cirebon dan Malang. Kandidat di luar
// radius ini dibuang sebelum jarak jalannya dihitung, supaya panggilan OSRM
// tidak terbuang untuk pemasok yang jelas tidak masuk akal.
const MAX_SUPPLIER_RADIUS_KM = 700;

/** Sumber utama: Google Maps via SerpAPI. */
async function findViaGoogleMaps(component, factory, onProgress) {
  const collected = [];

  // Satu kueri di tingkat regional. Melebar hanya bila hasilnya sedikit —
  // tiap panggilan menagih kuota SerpAPI.
  for (const zoom of [9, 7]) {
    onProgress?.({
      stage: "suppliers",
      message: `Google Maps: "${component.googleQuery}" (zoom ${zoom})`
    });

    const places = await searchPlaces(component.googleQuery, factory, {
      zoom,
      keywords: component.keywords
    });

    collected.push(...places);

    const withinRange = dedupe(collected).filter(
      (p) => haversineKm(factory.lat, factory.lng, p.lat, p.lng) <= MAX_SUPPLIER_RADIUS_KM
    );

    if (withinRange.length >= MAX_CANDIDATES_PER_COMPONENT) break;
  }

  return collected;
}

/** Sumber cadangan: OpenStreetMap (Nominatim + Overpass). */
async function findViaOpenStreetMap(component, factory, onProgress) {
  const collected = [];

  // Sumber A — pencarian teks Nominatim di dalam kotak wilayah.
  for (const ring of SEARCH_RINGS) {
    const box = boundingBox(factory.lat, factory.lng, ring.radiusKm);

    for (const term of component.searchTerms.slice(0, 2)) {
      onProgress?.({
        stage: "suppliers",
        message: `Menelusuri OpenStreetMap: "${term}" dalam radius ${ring.radiusKm} km (${ring.label})`
      });

      try {
        const hits = await searchSuppliers(term, box, {
          limit: 12,
          keywords: component.keywords
        });
        collected.push(...hits);
      } catch (err) {
        onProgress?.({ stage: "suppliers", level: "warn", message: `Pencarian "${term}" gagal: ${err.message}` });
      }
    }

    // Cukup kandidat dari cincin lokal berarti tidak perlu melebar.
    if (dedupe(collected).length >= MAX_CANDIDATES_PER_COMPONENT * 2) break;
  }

  // Sumber B — pencarian berbasis tag Overpass, menangkap pabrik yang namanya
  // tidak menyebut komoditas sama sekali.
  onProgress?.({
    stage: "suppliers",
    message: `Query Overpass berdasarkan tag industri untuk ${component.name}`
  });

  const overpassHits = await findByTags({
    lat: factory.lat,
    lng: factory.lng,
    radiusM: 200_000,
    tagFilters: component.osmTags,
    nameRegex: component.nameRegex,
    keywords: component.keywords,
    limit: 30
  });

  if (overpassHits.length === 0) {
    onProgress?.({
      stage: "suppliers",
      level: "warn",
      message: "Overpass tidak memberi hasil (server sibuk atau tidak ada yang cocok) — memakai hasil Nominatim saja"
    });
  }

  collected.push(...overpassHits);
  return collected;
}

/**
 * Mencari kandidat pemasok untuk sebuah komponen.
 *
 * Google Maps dipakai lebih dulu karena cakupannya untuk badan usaha di
 * Indonesia jauh lebih lengkap dan hasilnya membawa rating asli. OpenStreetMap
 * tetap dipertahankan sebagai cadangan: saat kuota SerpAPI habis atau kuerinya
 * tidak membuahkan hasil, sistem turun ke OSM alih-alih berhenti bekerja.
 *
 * Diatur lewat SUPPLIER_SOURCE: "auto" (bawaan), "google", atau "osm".
 */
async function findCandidatesFor(component, factory, onProgress) {
  const mode = (process.env.SUPPLIER_SOURCE || "auto").toLowerCase();
  const canUseGoogle = isGoogleMapsAvailable() && mode !== "osm";

  let collected = [];
  let sourceUsed = null;

  if (canUseGoogle) {
    collected = await findViaGoogleMaps(component, factory, onProgress);
    sourceUsed = "Google Maps";

    if (collected.length === 0 && mode === "google") {
      onProgress?.({
        stage: "suppliers",
        level: "warn",
        message: "Google Maps tidak memberi hasil dan mode dikunci ke 'google' — komponen dilewati"
      });
    }
  }

  // Turun ke OSM bila Google tidak tersedia atau tidak membuahkan hasil.
  if (collected.length === 0 && mode !== "google") {
    if (canUseGoogle) {
      onProgress?.({
        stage: "suppliers",
        level: "warn",
        message: "Google Maps kosong (kuota habis atau tak ada yang cocok) — beralih ke OpenStreetMap"
      });
    }
    collected = await findViaOpenStreetMap(component, factory, onProgress);
    sourceUsed = "OpenStreetMap";
  }

  const unique = dedupe(collected)
    .filter((c) => haversineKm(factory.lat, factory.lng, c.lat, c.lng) <= MAX_SUPPLIER_RADIUS_KM)
    // Urutkan menurut keyakinan, lalu kedekatan. Ini hanya menentukan kandidat
    // mana yang layak dihitung jarak jalannya; pemeringkatan sesungguhnya
    // dilakukan TOPSIS di sisi klien.
    .sort((a, b) => {
      if (Math.abs(b.relevance - a.relevance) > 0.05) return b.relevance - a.relevance;
      return haversineKm(factory.lat, factory.lng, a.lat, a.lng)
        - haversineKm(factory.lat, factory.lng, b.lat, b.lng);
    });

  if (unique.length > 0) {
    onProgress?.({
      stage: "suppliers",
      message: `${unique.length} kandidat dari ${sourceUsed}, mengambil ${Math.min(unique.length, MAX_CANDIDATES_PER_COMPONENT)} teratas`
    });
  }

  return unique.slice(0, MAX_CANDIDATES_PER_COMPONENT);
}

async function enrichCandidate(candidate, component, factory) {
  const distance = await roadDistance(factory.lat, factory.lng, candidate.lat, candidate.lng);
  const price = estimateUnitPrice(component, candidate);
  const freight = estimateFreight(distance.distanceKm, component.category);

  const qty = component.qtyPerUnit || 1;
  const materialCost = price.pricePerUnit * qty;

  const isGoogle = candidate.source === "google-maps-serpapi";

  return {
    id: candidate.placeId || `${candidate.osmType}-${candidate.osmId}`,
    name: candidate.name,
    city: candidate.city,
    address: candidate.address || candidate.displayName,
    lat: candidate.lat,
    lng: candidate.lng,

    // Provenance — inilah yang membuat titik ini dapat diperiksa.
    placeId: candidate.placeId || null,
    osmType: candidate.osmType || null,
    osmId: candidate.osmId || null,
    osmUrl: candidate.osmUrl,
    dataSource: candidate.source,
    sourceLabel: isGoogle ? "Google Maps" : "OpenStreetMap",
    osmTag: isGoogle
      ? candidate.googleType
      : candidate.category && candidate.type
        ? `${candidate.category}=${candidate.type}`
        : null,
    website: candidate.website || null,
    phone: candidate.phone || null,

    // Data kualitas asli — hanya ada pada hasil Google Maps.
    rating: candidate.rating ?? null,
    reviews: candidate.reviews ?? null,
    adjustedRating: candidate.adjustedRating ?? null,

    relevance: candidate.relevance,
    relevanceReason: candidate.relevanceReason,

    // Terukur (jaringan jalan nyata).
    distanceKm: distance.distanceKm,
    straightLineKm: distance.straightLineKm,
    travelMinutes: distance.durationMin,
    distanceMethod: distance.method,
    distanceSource: distance.source,

    // Estimasi model — ditandai jelas.
    scale: candidate.scale,
    scaleLabel: price.breakdown.scaleLabel,
    pricePerUnit: price.pricePerUnit,
    priceConfidence: price.confidence,
    priceBreakdown: price.breakdown,
    moq: price.moq,
    leadTimeDays: price.leadTimeDays,
    qty,
    materialCost,
    freightCost: freight.cost,
    freightBreakdown: freight.breakdown,
    totalCost: materialCost + freight.cost
  };
}

/**
 * Menjalankan seluruh analisis rantai pasok untuk sebuah perusahaan.
 *
 * @param {object} params
 * @param {object} params.company  hasil geocoding: { name, lat, lng, ... }
 * @param {function} params.onProgress  dipanggil di setiap tahap
 */
export async function analyzeSupplyChain({ company, onProgress }) {
  const report = (stage, message, level = "info") => onProgress?.({ stage, message, level });

  report("profile", `Mencari profil "${company.name}" di ${process.env.SERPAPI_KEY ? "Google (SerpAPI)" : "DuckDuckGo"}`);
  const profile = await buildCompanyProfile(company.name, { website: company.website });

  if (profile.sources.length === 0) {
    report("profile", "Tidak ada hasil pencarian yang dapat dibaca; BOM akan memakai asumsi umum", "warn");
  } else {
    report("profile", `${profile.sources.length} sumber terbaca${profile.siteRead ? `, termasuk situs resmi ${profile.siteRead.url}` : ""}`);
  }

  // Penurunan BOM: coba AI dulu bila tersedia, jika tidak pakai aturan.
  report("bom", isAiAvailable()
    ? "Menurunkan Bill of Materials dengan Claude dari teks hasil scraping"
    : "Menurunkan Bill of Materials dengan aturan taksonomi kata kunci");

  // Kategori entitas hasil geocoding (mis. "amenity=restaurant") adalah bukti
  // paling langsung tentang jenis usaha, jadi ikut disertakan.
  const entityCategory = company.category && company.type
    ? `${company.category}=${company.type}`
    : company.category || "";

  const rulesBom = deriveBomByRules(`${profile.rawText} ${company.name}`, entityCategory);

  // Bila entitasnya jelas bukan usaha produksi, hentikan di sini. Menyodorkan
  // daftar pemasok baja untuk sebuah sekolah atau rumah sakit lebih buruk
  // daripada mengaku tidak berlaku.
  if (rulesBom.notApplicable) {
    report("bom", `${rulesBom.evidence} — analisis rantai pasok tidak berlaku untuk entitas ini`, "warn");
    return {
      company,
      profile,
      bom: {
        industry: rulesBom.industry,
        productUnit: null,
        businessModel: profile.summary,
        generic: true,
        notApplicable: true,
        method: rulesBom.method,
        evidence: rulesBom.evidence,
        runnerUp: null
      },
      components: [],
      generatedAt: new Date().toISOString()
    };
  }

  const aiBom = await deriveBomWithAi(company.name, profile.rawText);
  const bom = aiBom || rulesBom;

  report("bom", `Industri terdeteksi: ${bom.industry} — ${bom.components.length} komponen utama (metode: ${bom.method})`);
  if (bom.evidence) {
    report("bom", `Dasar klasifikasi: ${bom.evidence}${bom.runnerUp ? ` · pesaing terdekat ${bom.runnerUp}` : ""}`);
  }
  if (bom.generic) {
    report("bom", "Teks profil tidak cukup spesifik; BOM memakai pola manufaktur umum", "warn");
  }

  // Pencarian pemasok per komponen.
  const componentResults = [];

  for (const component of bom.components) {
    report("suppliers", `— Komponen: ${component.name} —`);

    const candidates = await findCandidatesFor(component, company, onProgress);

    if (candidates.length === 0) {
      report("suppliers", `Tidak ditemukan pemasok ber-data OSM untuk ${component.name}`, "warn");
      componentResults.push({ component, candidates: [], note: "Tidak ada entitas OpenStreetMap yang cocok di wilayah pencarian." });
      continue;
    }

    report("distance", `Menghitung jarak jalan OSRM untuk ${candidates.length} kandidat ${component.name}`);

    const enriched = [];
    for (const candidate of candidates) {
      enriched.push(await enrichCandidate(candidate, component, company));
    }

    report("suppliers", `${enriched.length} kandidat terverifikasi untuk ${component.name}`);
    componentResults.push({ component, candidates: enriched, note: null });
  }

  const found = componentResults.filter((c) => c.candidates.length > 0).length;
  report("done", `Analisis selesai: ${found}/${componentResults.length} komponen memiliki kandidat pemasok bergeodata`);

  return {
    company,
    profile,
    bom: {
      industry: bom.industry,
      productUnit: bom.productUnit,
      businessModel: bom.businessModel || profile.summary,
      generic: bom.generic,
      notApplicable: false,
      method: bom.method,
      evidence: bom.evidence || null,
      runnerUp: bom.runnerUp || null
    },
    components: componentResults,
    generatedAt: new Date().toISOString()
  };
}

export { geocodeCompany };
