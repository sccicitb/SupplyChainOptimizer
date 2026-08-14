// Penyaring relevansi untuk entitas OpenStreetMap.
//
// Pencarian teks bebas di OSM mengembalikan banyak derau: kata kunci "besi"
// mencocoki "Jalan Besi Raya" (sebuah jalan), dan tag `man_made=works` di
// Indonesia dipakai untuk apa saja mulai dari pabrik sampai gardu ronda.
// Modul ini memutuskan entitas mana yang masuk akal sebagai pemasok industri,
// dan seberapa yakin kita terhadapnya.

// Kategori OSM yang bisa menjadi pemasok. "*" berarti semua tipe diterima.
const ACCEPTED = {
  shop: [
    "hardware", "doityourself", "trade", "electronics", "paint", "car_parts",
    "industrial", "wholesale", "building_materials", "furniture", "fabric", "tool_hire"
  ],
  craft: ["*"],
  industrial: ["*"],
  man_made: ["works"],
  office: ["company", "industrial", "wholesale", "it"],
  building: ["industrial", "warehouse", "factory", "commercial", "manufacture", "retail"],
  landuse: ["industrial", "retail"],
  amenity: ["marketplace"]
};

// Kategori yang tidak akan pernah menjadi pemasok, berapa pun cocoknya nama.
const REJECTED = new Set([
  "highway", "place", "boundary", "natural", "waterway", "water", "railway",
  "route", "tourism", "leisure", "historic", "barrier", "aeroway", "power",
  "military", "healthcare", "emergency", "public_transport", "administrative"
]);

// Nama yang jelas bukan entitas komersial, walau tag-nya lolos.
const NAME_BLOCKLIST = [
  /gardu\s*ronda/i, /pos\s*kamling/i, /masjid/i, /musholla|mushola/i, /gereja/i,
  /sekolah|sd\s|smp\s|sma\s|smk\s/i, /puskesmas/i, /kantor\s*desa/i,
  /balai\s*(desa|rw|rt)/i, /makam|kuburan/i, /lapangan/i, /tugu/i
];

// Sinyal umum bahwa sebuah nama adalah badan usaha.
const BUSINESS_MARKERS = /\b(pt|cv|ud|pd|tbk|persero|inc|ltd|co|corp|industri|industry|manufaktur|manufacturing|pabrik|factory|works|distributor|supplier|toko|grosir|niaga|jaya|makmur|sentosa|abadi|mandiri)\b/i;

const SCALE_MARKERS = {
  factory: /\b(pt|tbk|persero|industri|industry|pabrik|factory|manufaktur|manufacturing|works|mill|foundry|pengecoran)\b/i,
  distributor: /\b(cv|ud|distributor|supplier|grosir|niaga|trading|agen)\b/i,
  retail: /\b(toko|kios|shop|store)\b/i
};

/**
 * Menaksir skala usaha dari nama dan tag OSM. Skala menentukan asumsi harga
 * dan MOQ pada model estimasi biaya — pabrik menjual lebih murah per unit
 * dengan minimum order lebih besar dibanding toko eceran.
 */
export function inferScale(name = "", category = "", type = "") {
  if (category === "landuse" && type === "industrial") return "factory";
  if (category === "man_made" && type === "works") return "factory";
  if (category === "industrial") return "factory";

  if (SCALE_MARKERS.factory.test(name)) return "factory";
  if (SCALE_MARKERS.distributor.test(name)) return "distributor";
  if (SCALE_MARKERS.retail.test(name)) return "retail";

  if (category === "shop") return "retail";
  if (category === "craft") return "distributor";
  return "distributor";
}

/**
 * Menilai sebuah entitas OSM sebagai kandidat pemasok.
 *
 * @param {object} entity  { name, category, type, tags }
 * @param {string[]} keywords  kata kunci komponen, mis. ["besi","baja","steel"]
 * @returns {{ accepted: boolean, score: number, reason: string }}
 *          score 0..1 — keyakinan bahwa entitas ini relevan.
 */
export function scoreCandidate(entity, keywords = []) {
  const name = (entity.name || "").trim();
  const category = entity.category || "";
  const type = entity.type || "";

  if (!name) {
    return { accepted: false, score: 0, reason: "tanpa nama" };
  }
  if (REJECTED.has(category)) {
    return { accepted: false, score: 0, reason: `kategori ${category} bukan entitas usaha` };
  }
  if (NAME_BLOCKLIST.some((re) => re.test(name))) {
    return { accepted: false, score: 0, reason: "nama menunjukkan fasilitas non-komersial" };
  }

  const allowedTypes = ACCEPTED[category];
  if (!allowedTypes) {
    return { accepted: false, score: 0, reason: `kategori ${category} di luar cakupan` };
  }
  if (!allowedTypes.includes("*") && !allowedTypes.includes(type)) {
    return { accepted: false, score: 0, reason: `${category}=${type} bukan tipe pemasok` };
  }

  // Bobot dasar per kategori: makin spesifik tag industrinya, makin yakin.
  let score = 0.3;
  if (category === "craft" || category === "industrial") score = 0.6;
  else if (category === "man_made" && type === "works") score = 0.55;
  else if (category === "landuse" && type === "industrial") score = 0.5;
  else if (category === "shop") score = 0.45;
  else if (category === "office") score = 0.4;

  // Nama yang mengandung kata kunci komponen adalah sinyal terkuat.
  const haystack = name.toLowerCase();
  const matched = keywords.filter((kw) => kw && haystack.includes(kw.toLowerCase()));
  if (matched.length > 0) score += Math.min(0.3, 0.15 * matched.length);

  if (BUSINESS_MARKERS.test(name)) score += 0.1;

  // Tag kontak menandakan entri yang dirawat, bukan poligon terlantar.
  const tags = entity.tags || {};
  if (tags.website || tags["contact:website"] || tags.phone || tags["contact:phone"]) {
    score += 0.05;
  }

  score = Math.min(1, score);

  // Tanpa kecocokan kata kunci maupun penanda badan usaha, entitas terlalu
  // generik untuk disebut pemasok komponen tertentu.
  if (matched.length === 0 && !BUSINESS_MARKERS.test(name) && score < 0.6) {
    return { accepted: false, score, reason: "tidak ada kaitan dengan komponen" };
  }

  return {
    accepted: true,
    score: Number(score.toFixed(2)),
    reason: matched.length ? `nama cocok: ${matched.join(", ")}` : `tag ${category}=${type}`
  };
}

/** Menghapus duplikat lintas sumber berdasarkan id, lalu koordinat. */
export function dedupe(candidates) {
  const byOsm = new Map();
  const byCoord = new Map();
  const out = [];

  for (const c of candidates) {
    const osmKey = c.placeId
      ? `google/${c.placeId}`
      : c.osmType && c.osmId
        ? `${c.osmType}/${c.osmId}`
        : null;
    if (osmKey && byOsm.has(osmKey)) continue;

    // Entitas yang sama sering muncul sebagai node dan way terpisah; 4 desimal
    // (~11 m) cukup untuk menganggapnya satu lokasi.
    const coordKey = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
    if (byCoord.has(coordKey)) continue;

    if (osmKey) byOsm.set(osmKey, true);
    byCoord.set(coordKey, true);
    out.push(c);
  }

  return out;
}
