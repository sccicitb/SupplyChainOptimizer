// Taksonomi komponen dan penurunan Bill of Materials dari model bisnis.
//
// Setiap komponen membawa tiga hal yang dibutuhkan pipeline: kata kunci untuk
// mencari pemasoknya di OpenStreetMap, tag OSM untuk pencarian berbasis
// atribut, dan dasar harga acuan untuk model estimasi biaya.
//
// PENTING soal `priceBasis`: angka-angka ini adalah harga acuan pasar
// industri Indonesia, bukan hasil scraping. Harga bahan baku B2B tidak
// dipublikasikan secara terbuka dan tidak dapat diambil secara sah dari web.
// Setiap angka di sini wajib diganti dengan penawaran resmi pemasok sebelum
// dipakai untuk keputusan pengadaan; sistem menandainya sebagai "estimasi"
// di seluruh antarmuka agar tidak tertukar dengan data terverifikasi.

export const COMPONENT_LIBRARY = {
  "baja-struktur": {
    name: "Besi & Baja Struktur",
    category: "Bahan Baku Logam",
    color: "#3b82f6",
    icon: "Wrench",
    unit: "Meter",
    keywords: ["besi", "baja", "steel", "logam", "cor", "hollow", "pipa"],
    searchTerms: ["besi", "baja", "logam"],
    osmTags: [["craft", "metal_construction"], ["craft", "blacksmith"], ["shop", "hardware"], ["shop", "trade"]],
    nameRegex: "besi|baja|steel|logam|cor|foundry",
    basePricePerUnit: 46000,
    priceBasis: "Acuan pipa baja hollow 40x40x2.3mm grade Q235, harga distributor regional Jawa"
  },

  "plastik-injeksi": {
    name: "Komponen Plastik Injection Moulding",
    category: "Komponen Plastik",
    color: "#10b981",
    icon: "Box",
    unit: "Set",
    keywords: ["plastik", "plastic", "injection", "moulding", "molding", "polimer"],
    searchTerms: ["plastik", "plastic"],
    osmTags: [["craft", "plastics"], ["man_made", "works"], ["shop", "trade"]],
    nameRegex: "plastik|plastic|moulding|molding|injeksi|polymer",
    basePricePerUnit: 230000,
    priceBasis: "Acuan set ABS medical grade hasil injection moulding, order menengah"
  },

  "elektronik-kontrol": {
    name: "Modul Elektronik & Chip Controller",
    category: "Elektronika & Embedded",
    color: "#a855f7",
    icon: "Cpu",
    unit: "Unit Kit",
    keywords: ["elektronik", "electronic", "chip", "controller", "komputer", "digital", "panel"],
    searchTerms: ["elektronik", "electronic", "komputer"],
    osmTags: [["shop", "electronics"], ["craft", "electronics_repair"], ["office", "it"]],
    nameRegex: "elektronik|electronic|komputer|chip|digital|teknik",
    basePricePerUnit: 870000,
    priceBasis: "Acuan kit layar kontrol 7 inci + board mikrokontroler + driver aktuator"
  },

  "busa-tekstil": {
    name: "Busa, Foam & Pelapis Tekstil",
    category: "Tekstil & Foam",
    color: "#eab308",
    icon: "Layers",
    unit: "Unit",
    keywords: ["busa", "foam", "kasur", "spon", "tekstil", "kain", "jok", "matras"],
    searchTerms: ["busa", "foam", "kasur"],
    osmTags: [["shop", "furniture"], ["shop", "fabric"], ["craft", "upholsterer"], ["man_made", "works"]],
    nameRegex: "busa|foam|kasur|spon|matras|jok|tekstil",
    basePricePerUnit: 315000,
    priceBasis: "Acuan matras busa high-density anti-decubitus dengan pelapis PU waterproof"
  },

  "hardware-mekanikal": {
    name: "Hardware Mekanikal (Roda, Engsel, Baut)",
    category: "Mekanikal & Hardware",
    color: "#f97316",
    icon: "Disc",
    unit: "Pcs",
    keywords: ["roda", "caster", "hardware", "baut", "mur", "engsel", "onderdil", "sparepart"],
    searchTerms: ["baut", "hardware", "onderdil"],
    osmTags: [["shop", "hardware"], ["shop", "doityourself"], ["shop", "car_parts"], ["craft", "metal_construction"]],
    nameRegex: "roda|caster|baut|mur|hardware|onderdil|sparepart|teknik",
    basePricePerUnit: 65000,
    priceBasis: "Acuan roda caster heavy duty 5 inci dengan central locking brake"
  },

  "aluminium": {
    name: "Aluminium & Paduan Ringan",
    category: "Bahan Baku Logam Presisi",
    color: "#38bdf8",
    icon: "Shield",
    unit: "Kg",
    keywords: ["aluminium", "aluminum", "alumunium", "alloy", "logam"],
    searchTerms: ["aluminium", "alumunium"],
    osmTags: [["craft", "metal_construction"], ["shop", "trade"], ["man_made", "works"]],
    nameRegex: "alumin|alloy|logam|cor",
    basePricePerUnit: 62000,
    priceBasis: "Acuan plat aluminium alloy per kg, harga distributor"
  },

  "karet-ban": {
    name: "Karet & Komponen Ban",
    category: "Karet & Elastomer",
    color: "#64748b",
    icon: "Disc",
    unit: "Pcs",
    keywords: ["karet", "rubber", "ban", "tire", "seal", "gasket"],
    searchTerms: ["karet", "ban"],
    osmTags: [["shop", "car_parts"], ["craft", "tyres"], ["man_made", "works"]],
    nameRegex: "karet|rubber|ban|vulkanisir|seal",
    basePricePerUnit: 185000,
    priceBasis: "Acuan komponen karet teknis / ban per unit, harga distributor"
  },

  "kayu-furnitur": {
    name: "Kayu & Panel Furnitur",
    category: "Kayu & Panel",
    color: "#b45309",
    icon: "Layers",
    unit: "Lembar",
    keywords: ["kayu", "wood", "triplek", "plywood", "mebel", "furniture", "panel"],
    searchTerms: ["kayu", "triplek", "mebel"],
    osmTags: [["craft", "carpenter"], ["craft", "sawmill"], ["shop", "doityourself"], ["shop", "furniture"]],
    nameRegex: "kayu|wood|triplek|plywood|mebel|furniture|meubel",
    basePricePerUnit: 195000,
    priceBasis: "Acuan lembar plywood / panel kayu olahan ukuran standar"
  },

  "cat-kimia": {
    name: "Cat, Coating & Bahan Kimia",
    category: "Kimia & Finishing",
    color: "#ec4899",
    icon: "Box",
    unit: "Kg",
    keywords: ["cat", "paint", "coating", "kimia", "chemical", "powder"],
    searchTerms: ["cat", "kimia"],
    osmTags: [["shop", "paint"], ["shop", "trade"], ["man_made", "works"]],
    nameRegex: "cat|paint|coating|kimia|chemical",
    basePricePerUnit: 78000,
    priceBasis: "Acuan powder coating / cat industri per kg"
  },

  "kemasan": {
    name: "Kemasan & Packaging",
    category: "Kemasan",
    color: "#14b8a6",
    icon: "Box",
    unit: "Set",
    keywords: ["kemasan", "packaging", "karton", "kardus", "box", "percetakan"],
    searchTerms: ["kardus", "kemasan", "percetakan"],
    osmTags: [["shop", "trade"], ["craft", "printer"], ["man_made", "works"]],
    nameRegex: "kemasan|packaging|karton|kardus|percetakan|printing",
    basePricePerUnit: 42000,
    priceBasis: "Acuan set kemasan karton bergelombang untuk produk besar"
  },

  "baterai-daya": {
    name: "Baterai & Sistem Daya",
    category: "Elektronika Daya",
    color: "#8b5cf6",
    icon: "Cpu",
    unit: "Kit",
    keywords: ["baterai", "battery", "aki", "listrik", "elektrik", "power", "motor"],
    searchTerms: ["baterai", "aki", "listrik"],
    osmTags: [["shop", "electronics"], ["shop", "car_parts"], ["craft", "electrician"]],
    nameRegex: "baterai|battery|aki|listrik|elektrik|power",
    basePricePerUnit: 1250000,
    priceBasis: "Acuan paket baterai lithium + motor penggerak kelas ringan"
  }
};

// Aturan pemetaan model bisnis → BOM.
//
// Setiap aturan dinilai dengan menghitung bukti, bukan sekadar dicocokkan.
// Versi pertama memakai "aturan pertama yang cocok menang", dan itu gagal
// nyata: teks profil PT Dirgantara Indonesia menyebut "dirgantara" 12 kali dan
// "pesawat" 9 kali, tetapi satu kemunculan kata "truk" membuatnya
// diklasifikasikan sebagai industri otomotif. Satu kata sambil lalu tidak
// boleh mengalahkan bukti yang menumpuk.
//
// `qty` adalah taksiran kebutuhan per unit produk jadi.
export const BUSINESS_MODEL_RULES = [
  {
    id: "dirgantara",
    keywords: ["dirgantara", "pesawat terbang", "pesawat", "aerospace", "aircraft", "penerbangan", "aviasi", "helikopter", "avionik"],
    industry: "Dirgantara & Kedirgantaraan",
    productUnit: "unit pesawat",
    bom: [
      { component: "aluminium", qty: 150, spec: "Plat dan sheet aluminium alloy aerospace grade untuk aerostruktur" },
      { component: "baja-struktur", qty: 40, spec: "Komponen struktur berkekuatan tinggi dan perkakas jig" },
      { component: "elektronik-kontrol", qty: 1, spec: "Unit display kokpit, avionik, dan sistem kendali penerbangan" },
      { component: "hardware-mekanikal", qty: 80, spec: "Fastener presisi, aktuator, dan komponen hidrolik" },
      { component: "cat-kimia", qty: 25, spec: "Coating anti-korosi dan cat livery pesawat" }
    ]
  },
  {
    id: "alat-kesehatan",
    keywords: ["rumah sakit", "hospital", "medis", "medical", "alat kesehatan", "alkes", "ranjang", "tempat tidur", "hospital bed", "klinik"],
    industry: "Alat Kesehatan & Manufaktur Medis",
    productUnit: "unit hospital bed",
    bom: [
      { component: "baja-struktur", qty: 18, spec: "Rangka pipa baja hollow 40x40mm untuk base & side frame" },
      { component: "plastik-injeksi", qty: 1, spec: "Headboard, footboard, dan foldable side rail ABS medical grade" },
      { component: "elektronik-kontrol", qty: 1, spec: "Panel kontrol elektrik + aktuator linear penggerak ranjang" },
      { component: "busa-tekstil", qty: 1, spec: "Matras anti-decubitus dengan pelapis waterproof" },
      { component: "hardware-mekanikal", qty: 4, spec: "Roda caster medis dengan central locking" }
    ]
  },
  {
    id: "otomotif",
    keywords: ["otomotif", "automotive", "kendaraan bermotor", "karoseri", "mobil", "sepeda motor", "bus", "truk"],
    industry: "Otomotif & Karoseri",
    productUnit: "unit kendaraan",
    bom: [
      { component: "baja-struktur", qty: 120, spec: "Rangka chassis dan struktur bodi" },
      { component: "aluminium", qty: 45, spec: "Panel bodi dan komponen ringan" },
      { component: "karet-ban", qty: 6, spec: "Ban, seal pintu, dan komponen karet teknis" },
      { component: "busa-tekstil", qty: 8, spec: "Jok, plafon, dan pelapis interior" },
      { component: "elektronik-kontrol", qty: 1, spec: "Panel instrumen dan wiring harness" }
    ]
  },
  {
    id: "sepeda",
    keywords: ["sepeda", "bicycle", "bike", "e-bike", "ebike", "gowes"],
    industry: "Transportasi & Olahraga",
    productUnit: "unit sepeda",
    bom: [
      { component: "aluminium", qty: 2.8, spec: "Tubing alloy hydroformed untuk frame set" },
      { component: "baterai-daya", qty: 1, spec: "Baterai integrated down-tube + mid-drive motor (varian e-bike)" },
      { component: "hardware-mekanikal", qty: 1, spec: "Set rem cakram hidrolik dan shifter" },
      { component: "karet-ban", qty: 2, spec: "Ban dan velg tubeless" },
      { component: "cat-kimia", qty: 0.4, spec: "Powder coating frame" }
    ]
  },
  {
    id: "furnitur",
    keywords: ["furnitur", "furniture", "mebel", "meubel", "kursi", "meja", "lemari"],
    industry: "Furnitur & Interior",
    productUnit: "unit furnitur",
    bom: [
      { component: "kayu-furnitur", qty: 2.5, spec: "Panel kayu olahan / plywood badan produk" },
      { component: "baja-struktur", qty: 6, spec: "Rangka logam penopang" },
      { component: "busa-tekstil", qty: 1, spec: "Busa dudukan dan kain pelapis" },
      { component: "cat-kimia", qty: 0.8, spec: "Finishing dan coating permukaan" },
      { component: "hardware-mekanikal", qty: 12, spec: "Engsel, rel laci, baut perakitan" }
    ]
  },
  {
    id: "elektronik",
    keywords: ["elektronik", "electronic", "perangkat elektronik", "gadget", "komputer", "panel surya", "iot"],
    industry: "Elektronika & Perangkat",
    productUnit: "unit perangkat",
    bom: [
      { component: "elektronik-kontrol", qty: 1, spec: "PCB utama, mikrokontroler, dan modul kendali" },
      { component: "plastik-injeksi", qty: 1, spec: "Enclosure dan casing hasil injection moulding" },
      { component: "baterai-daya", qty: 1, spec: "Modul catu daya / baterai" },
      { component: "kemasan", qty: 1, spec: "Kemasan retail dan pelindung transportasi" }
    ]
  },
  {
    id: "makanan-kemasan",
    keywords: ["makanan", "minuman", "food", "beverage", "pangan", "snack", "kuliner"],
    industry: "Makanan & Minuman",
    productUnit: "batch produksi",
    bom: [
      { component: "kemasan", qty: 100, spec: "Kemasan primer dan sekunder produk" },
      { component: "plastik-injeksi", qty: 50, spec: "Wadah dan tutup plastik food grade" },
      { component: "baja-struktur", qty: 4, spec: "Peralatan dan rak produksi stainless" }
    ]
  },
  {
    id: "tekstil-garmen",
    keywords: ["tekstil", "garmen", "garment", "pakaian", "konveksi", "kain", "sepatu", "alas kaki"],
    industry: "Tekstil & Garmen",
    productUnit: "lot produksi",
    bom: [
      { component: "busa-tekstil", qty: 20, spec: "Bahan kain dan material pelapis" },
      { component: "cat-kimia", qty: 3, spec: "Pewarna dan bahan kimia finishing" },
      { component: "hardware-mekanikal", qty: 50, spec: "Aksesori: kancing, resleting, ring logam" },
      { component: "kemasan", qty: 20, spec: "Kemasan dan label produk" }
    ]
  }
];

// Digunakan bila tidak ada aturan yang cocok. Ditandai `generic: true` supaya
// antarmuka bisa mengatakan terus terang bahwa BOM ini belum spesifik.
export const GENERIC_BOM = {
  id: "manufaktur-umum",
  industry: "Manufaktur Umum",
  productUnit: "unit produk",
  generic: true,
  bom: [
    { component: "baja-struktur", qty: 20, spec: "Rangka dan struktur logam utama" },
    { component: "plastik-injeksi", qty: 1, spec: "Komponen plastik, casing, dan penutup" },
    { component: "elektronik-kontrol", qty: 1, spec: "Modul kendali dan kelistrikan" },
    { component: "hardware-mekanikal", qty: 10, spec: "Komponen sambungan dan hardware" },
    { component: "kemasan", qty: 1, spec: "Kemasan dan pelindung pengiriman" }
  ]
};

// Ambang bukti minimum sebelum sebuah industri boleh diklaim. Di bawah ini,
// sistem lebih baik mengaku tidak tahu dan memakai pola manufaktur umum
// daripada memberi jawaban spesifik yang keliru.
const MIN_EVIDENCE_SCORE = 3;

/** Menghitung berapa kali sebuah frasa muncul dalam teks. */
function countOccurrences(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (text.match(new RegExp(`\\b${escaped}`, "gi")) || []).length;
}

/**
 * Menilai satu aturan terhadap teks profil.
 *
 * Skor menggabungkan dua sinyal: berapa banyak kata kunci berbeda yang muncul
 * (keluasan bukti) dan berapa sering (kekuatan bukti). Kemunculan tiap kata
 * kunci dibatasi 3 supaya satu kata yang diulang-ulang tidak mendominasi.
 */
export function scoreRule(rule, text) {
  let score = 0;
  const matched = [];

  for (const keyword of rule.keywords) {
    const count = countOccurrences(text, keyword);
    if (count > 0) {
      matched.push(`${keyword} (${count}x)`);
      score += Math.min(count, 3);
    }
  }

  // Bonus keluasan: dua kata kunci berbeda lebih meyakinkan daripada satu.
  if (matched.length >= 2) score += matched.length;

  return { score, matched };
}

/**
 * Menurunkan BOM dari teks model bisnis menggunakan aturan taksonomi.
 * Deterministik dan tidak memerlukan API key — inilah jalur bawaan sistem.
 *
 * Semua aturan dinilai, lalu yang berskor tertinggi dipilih. Ini menggantikan
 * "aturan pertama yang cocok menang", yang membuat satu kata sambil lalu bisa
 * mengalahkan bukti yang jauh lebih kuat.
 */
export function deriveBomByRules(businessModelText = "") {
  const text = businessModelText.toLowerCase();

  const scored = BUSINESS_MODEL_RULES
    .map((rule) => ({ rule, ...scoreRule(rule, text) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const useGeneric = !best || best.score < MIN_EVIDENCE_SCORE;
  const rule = useGeneric ? GENERIC_BOM : best.rule;

  return {
    industry: rule.industry,
    productUnit: rule.productUnit,
    generic: Boolean(rule.generic) || useGeneric,
    method: "aturan-taksonomi",
    // Bukti yang mendasari keputusan, supaya klasifikasi bisa diaudit dan
    // tidak sekadar muncul begitu saja.
    evidence: useGeneric
      ? `Bukti terkuat (${best?.rule.industry || "tidak ada"}, skor ${best?.score || 0}) di bawah ambang ${MIN_EVIDENCE_SCORE}`
      : `${best.matched.slice(0, 5).join(", ")} — skor ${best.score}`,
    runnerUp: !useGeneric && scored[1]?.score > 0
      ? `${scored[1].rule.industry} (skor ${scored[1].score})`
      : null,
    components: rule.bom.map((entry) => expandComponent(entry))
  };
}

// Frasa pencarian untuk Google Maps. Berbeda dari `searchTerms` milik
// Nominatim, yang hanya bekerja dengan kata tunggal: Google memahami frasa
// bahasa alami, sehingga satu kueri yang lebih spesifik menggantikan beberapa
// kueri kata tunggal — sekaligus menghemat kuota SerpAPI.
export const GOOGLE_QUERIES = {
  "baja-struktur": "distributor besi baja",
  "plastik-injeksi": "pabrik plastik injection moulding",
  "elektronik-kontrol": "distributor komponen elektronik industri",
  "busa-tekstil": "pabrik busa foam",
  "hardware-mekanikal": "toko baut mur hardware teknik",
  "aluminium": "distributor aluminium",
  "karet-ban": "distributor karet industri",
  "kayu-furnitur": "supplier kayu plywood",
  "cat-kimia": "distributor cat industri",
  "kemasan": "pabrik kemasan karton",
  "baterai-daya": "distributor baterai dan motor listrik"
};

/** Menggabungkan entri BOM dengan definisi lengkap komponennya. */
export function expandComponent({ component, qty, spec }) {
  const lib = COMPONENT_LIBRARY[component];
  if (!lib) return null;

  return {
    id: component,
    name: lib.name,
    category: lib.category,
    color: lib.color,
    icon: lib.icon,
    unit: lib.unit,
    qtyPerUnit: qty,
    spec,
    keywords: lib.keywords,
    searchTerms: lib.searchTerms,
    googleQuery: GOOGLE_QUERIES[component] || lib.searchTerms[0],
    osmTags: lib.osmTags,
    nameRegex: lib.nameRegex,
    basePricePerUnit: lib.basePricePerUnit,
    priceBasis: lib.priceBasis
  };
}

export const COMPONENT_IDS = Object.keys(COMPONENT_LIBRARY);
