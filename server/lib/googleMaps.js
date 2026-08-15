// Google Maps melalui SerpAPI — sumber utama pencarian pemasok.
//
// Cakupan Google Maps untuk badan usaha di Indonesia jauh melampaui
// OpenStreetMap, dan hasilnya membawa dua hal yang tidak ada di OSM: rating
// dan jumlah ulasan. Keduanya adalah bukti nyata bahwa sebuah usaha benar-benar
// beroperasi, bukan sekadar poligon yang pernah digambar seseorang.
//
// Dua batasan yang harus diingat:
//   1. Kuota. Free plan SerpAPI 250 pencarian/bulan. Modul ini memakai satu
//      pencarian per komponen (melebar hanya bila hasilnya terlalu sedikit),
//      dan hasilnya di-cache agar analisis berulang tidak menagih kuota lagi.
//   2. Lisensi. Data OSM berlisensi ODbL dan bebas disebarkan; data Google
//      terikat ToS Google yang membatasi penyimpanan dan redistribusi. Karena
//      itu OSM tetap dipertahankan sebagai sumber cadangan, bukan dibuang.

import { fetchJson, buildUrl } from "./http.js";
import { cached, TTL } from "./cache.js";

const ENDPOINT = "https://serpapi.com/search.json";

// Rata-rata rating bisnis di Google dan bobot prior, untuk penyusutan Bayesian.
const PRIOR_RATING = 4.0;
const PRIOR_WEIGHT = 10;

export function isGoogleMapsAvailable() {
  return Boolean(process.env.SERPAPI_KEY);
}

/**
 * Skor keyakinan dari rating dan jumlah ulasan.
 *
 * Rata-rata mentah menyesatkan: satu ulasan bintang 5 tidak lebih meyakinkan
 * daripada 300 ulasan bintang 4,7. Karena itu rating disusutkan ke arah
 * rata-rata umum sebanding dengan sedikitnya ulasan (Bayesian shrinkage,
 * teknik yang sama dipakai peringkat berbobot IMDb):
 *
 *   rating_terkoreksi = (R x v + m x w) / (v + w)
 *
 * dengan R = rating, v = jumlah ulasan, m = prior, w = bobot prior.
 */
export function ratingConfidence(rating, reviews = 0) {
  if (!rating) {
    // Terdaftar di Google Maps sudah menjadi bukti keberadaan, tetapi tanpa
    // sinyal kualitas apa pun — diberi nilai netral, tidak diistimewakan.
    return { score: 0.6, adjustedRating: null, basis: "terdaftar di Google Maps, tanpa rating" };
  }

  const volume = reviews || 0;
  const adjusted = (rating * volume + PRIOR_RATING * PRIOR_WEIGHT) / (volume + PRIOR_WEIGHT);

  return {
    score: Number(Math.min(1, adjusted / 5).toFixed(3)),
    adjustedRating: Number(adjusted.toFixed(2)),
    basis: `rating ${rating} dari ${volume} ulasan, disusutkan ke prior ${PRIOR_RATING} (bobot ${PRIOR_WEIGHT})`
  };
}

// Kategori Google (field `type`/`types`) untuk menaksir skala usaha. Ini lebih
// dapat diandalkan daripada menebak dari nama seperti pada jalur OSM.
const SCALE_FROM_TYPE = [
  { match: /manufacturer|factory|mill|foundry|plant|industrial/i, scale: "factory" },
  { match: /wholesal|distributor|supplier|exporter|importer|trading/i, scale: "distributor" },
  { match: /store|shop|retail|market/i, scale: "retail" }
];

function inferScaleFromGoogle(types = [], title = "") {
  const haystack = [...types, title].join(" ");
  const hit = SCALE_FROM_TYPE.find((s) => s.match.test(haystack));
  if (hit) return hit.scale;
  return /\b(pt|tbk|persero)\b/i.test(title) ? "factory" : "distributor";
}

/** Seberapa cocok hasil ini dengan komponen yang dicari. */
function keywordRelevance(place, keywords = []) {
  const haystack = [place.title, place.type, ...(place.types || [])].join(" ").toLowerCase();
  const matched = keywords.filter((kw) => kw && haystack.includes(kw.toLowerCase()));
  return {
    factor: matched.length > 0 ? 1 : 0.7,
    matched
  };
}

function normalize(place, keywords) {
  const coords = place.gps_coordinates;
  if (!coords || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
    return null;
  }

  const quality = ratingConfidence(place.rating, place.reviews);
  const relevance = keywordRelevance(place, keywords);

  return {
    // Provenance — setiap titik tetap dapat dibuka dan diperiksa.
    placeId: place.place_id,
    osmType: null,
    osmId: null,
    osmUrl: place.place_id
      ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
      : null,
    source: "google-maps-serpapi",

    name: place.title,
    displayName: place.title,
    address: place.address || null,
    city: (place.address || "").split(",").slice(-3, -2)[0]?.trim() || null,
    lat: coords.latitude,
    lng: coords.longitude,

    website: place.website || null,
    phone: place.phone || null,

    // Data kualitas asli dari Google.
    rating: place.rating || null,
    reviews: place.reviews || 0,
    googleType: place.type || (place.types || [])[0] || null,

    // Skor keyakinan gabungan — dipakai TOPSIS sebagai kriteria benefit.
    relevance: Number(Math.min(1, quality.score * relevance.factor).toFixed(2)),
    relevanceReason: relevance.matched.length
      ? `${quality.basis}; kategori/nama cocok: ${relevance.matched.join(", ")}`
      : `${quality.basis}; kategori tidak menyebut komponen secara eksplisit`,
    qualityBasis: quality.basis,
    adjustedRating: quality.adjustedRating,

    scale: inferScaleFromGoogle(place.types, place.title)
  };
}

/** Google mengembalikan `type` kadang sebagai string, kadang sebagai array. */
function firstType(place) {
  const raw = place.type ?? place.types;
  if (Array.isArray(raw)) return raw[0] || null;
  return raw || null;
}

/**
 * Mencari perusahaan berdasarkan nama di Google Maps.
 *
 * Dipakai menggantikan geocoding Nominatim karena mengembalikan **kategori
 * usaha yang sebenarnya** — "Restoran seblak", "Produsen", "Distributor Baja"
 * — bukan sekadar tag geometri OSM seperti `building=yes`. Kategori itulah
 * yang menentukan jenis rantai pasok yang relevan, dan tanpanya sebuah warung
 * seblak bisa diperlakukan sebagai pabrik.
 */
export async function geocodeViaGoogle(query, { limit = 6 } = {}) {
  if (!isGoogleMapsAvailable()) return [];

  // Kotak pandang selebar Indonesia; nama perusahaan biasanya cukup khas
  // sehingga tidak perlu dibatasi wilayah.
  const ll = "@-2.5,118.0,5z";
  const key = `serpapi:geocode:${query.toLowerCase().trim()}`;

  let places;
  try {
    places = await cached(key, TTL.GEOCODE, async () => {
      const url = buildUrl(ENDPOINT, {
        engine: "google_maps",
        type: "search",
        q: query,
        ll,
        hl: "id",
        gl: "id",
        api_key: process.env.SERPAPI_KEY
      });

      const json = await fetchJson(url, { timeoutMs: 35000, retries: 0 });
      if (json.error) throw new Error(json.error);

      // Kueri yang sangat spesifik kadang langsung mengembalikan satu tempat.
      if (json.place_results) return [json.place_results];
      return json.local_results || [];
    });
  } catch (err) {
    console.warn(`[google-maps] geocoding "${query}" gagal: ${err.message}`);
    return [];
  }

  return places
    .slice(0, limit)
    .map((place) => {
      const coords = place.gps_coordinates;
      if (!coords) return null;

      const type = firstType(place);

      return {
        name: place.title,
        displayName: place.address ? `${place.title}, ${place.address}` : place.title,
        lat: coords.latitude,
        lng: coords.longitude,
        city: (place.address || "").split(",").slice(-3, -2)[0]?.trim() || null,
        province: null,

        // Kategori usaha versi Google — inilah nilai tambah utamanya.
        category: "google",
        type,

        website: place.website || null,
        rating: place.rating || null,
        reviews: place.reviews || 0,

        placeId: place.place_id || null,
        osmType: null,
        osmId: null,
        osmUrl: place.place_id
          ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
          : null,
        source: "google-maps-serpapi",
        sourceLabel: "Google Maps"
      };
    })
    .filter(Boolean);
}

/**
 * Mencari pemasok di Google Maps di sekitar sebuah titik.
 *
 * @param {string} query   frasa bahasa alami, mis. "distributor besi baja"
 * @param {object} center  { lat, lng }
 * @param {object} options { zoom, keywords, minResults }
 */
export async function searchPlaces(query, center, { zoom = 9, keywords = [], limit = 20 } = {}) {
  if (!isGoogleMapsAvailable()) return [];

  const ll = `@${center.lat.toFixed(6)},${center.lng.toFixed(6)},${zoom}z`;
  // Kunci cache sengaja tidak memuat API key.
  const key = `serpapi:maps:${query}:${ll}`;

  let places;
  try {
    places = await cached(key, TTL.SUPPLIERS, async () => {
      const url = buildUrl(ENDPOINT, {
        engine: "google_maps",
        type: "search",
        q: query,
        ll,
        hl: "id",
        gl: "id",
        api_key: process.env.SERPAPI_KEY
      });

      const json = await fetchJson(url, { timeoutMs: 35000, retries: 0 });

      if (json.error) throw new Error(json.error);
      return json.local_results || [];
    });
  } catch (err) {
    console.warn(`[google-maps] "${query}" gagal: ${err.message}`);
    return [];
  }

  return places
    .slice(0, limit)
    .map((place) => normalize(place, keywords))
    .filter(Boolean);
}
