// Nominatim (OpenStreetMap) — geocoding perusahaan dan pencarian pemasok
// berbasis teks di dalam kotak wilayah.
//
// Setiap hasil membawa osm_type/osm_id sehingga bisa ditelusuri kembali ke
// https://www.openstreetmap.org/{type}/{id} — inilah yang membuat titik peta
// dapat diverifikasi, bukan sekadar angka yang muncul entah dari mana.

import { fetchJson, buildUrl } from "./http.js";
import { cached, TTL } from "./cache.js";
import { scoreCandidate, inferScale } from "./relevance.js";

const BASE = "https://nominatim.openstreetmap.org/search";

function normalize(raw) {
  return {
    osmType: raw.osm_type,
    osmId: raw.osm_id,
    osmUrl: raw.osm_type && raw.osm_id
      ? `https://www.openstreetmap.org/${raw.osm_type}/${raw.osm_id}`
      : null,
    name: raw.name || (raw.display_name || "").split(",")[0].trim(),
    displayName: raw.display_name,
    lat: parseFloat(raw.lat),
    lng: parseFloat(raw.lon),
    category: raw.category || raw.class,
    type: raw.type,
    address: raw.address || null,
    tags: raw.extratags || {},
    source: "openstreetmap-nominatim"
  };
}

/**
 * Mencari perusahaan berdasarkan nama, seperti kotak pencarian Google Maps.
 * Mengembalikan daftar kandidat agar pengguna memilih yang benar — bukan
 * menebak satu hasil dan menyebutnya pasti.
 */
export async function geocodeCompany(query, { limit = 6, countryCodes = "id" } = {}) {
  const key = `nominatim:geocode:${countryCodes}:${query.toLowerCase().trim()}`;

  return cached(key, TTL.GEOCODE, async () => {
    const url = buildUrl(BASE, {
      q: query,
      format: "jsonv2",
      limit,
      countrycodes: countryCodes,
      addressdetails: 1,
      extratags: 1
    });

    const raw = await fetchJson(url, { timeoutMs: 25000 });
    return raw.map(normalize).map((r) => ({
      ...r,
      city: [r.address?.city, r.address?.town, r.address?.county, r.address?.state]
        .filter(Boolean)[0] || null,
      province: r.address?.state || null,
      website: r.tags.website || r.tags["contact:website"] || null
    }));
  });
}

/** Kotak wilayah (bounding box) sejauh radiusKm dari sebuah titik. */
export function boundingBox(lat, lng, radiusKm) {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng
  };
}

/**
 * Mencari pemasok dengan satu kata kunci di dalam kotak wilayah.
 * Nominatim bekerja paling baik dengan kueri pendek (1–2 kata); frasa panjang
 * seperti "distributor besi baja Semarang" justru mengembalikan nol hasil.
 */
export async function searchSuppliers(keyword, box, { limit = 12, keywords = [] } = {}) {
  const viewbox = `${box.minLng},${box.maxLat},${box.maxLng},${box.minLat}`;
  const key = `nominatim:supplier:${keyword}:${viewbox}:${limit}`;

  const raw = await cached(key, TTL.SUPPLIERS, async () => {
    const url = buildUrl(BASE, {
      q: keyword,
      format: "jsonv2",
      limit,
      viewbox,
      bounded: 1,
      countrycodes: "id",
      extratags: 1,
      addressdetails: 1
    });
    return fetchJson(url, { timeoutMs: 25000 });
  });

  const out = [];
  for (const item of raw) {
    const entity = normalize(item);
    if (!Number.isFinite(entity.lat) || !Number.isFinite(entity.lng)) continue;

    const verdict = scoreCandidate(entity, keywords.length ? keywords : [keyword]);
    if (!verdict.accepted) continue;

    out.push({
      ...entity,
      city: [entity.address?.city, entity.address?.town, entity.address?.county]
        .filter(Boolean)[0] || entity.address?.state || null,
      relevance: verdict.score,
      relevanceReason: verdict.reason,
      scale: inferScale(entity.name, entity.category, entity.type),
      matchedKeyword: keyword
    });
  }

  return out;
}
