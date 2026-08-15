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

  "bahan-pangan": {
    name: "Bahan Baku Pangan",
    category: "Pangan & Bahan Segar",
    color: "#ef4444",
    icon: "Box",
    unit: "Kg",
    keywords: ["daging", "sapi", "ayam", "sayur", "tepung", "beras", "bumbu", "sembako", "pangan", "grosir"],
    searchTerms: ["daging", "sembako", "grosir"],
    osmTags: [["shop", "butcher"], ["shop", "greengrocer"], ["shop", "wholesale"], ["amenity", "marketplace"], ["shop", "supermarket"]],
    nameRegex: "daging|sapi|ayam|sayur|tepung|beras|sembako|grosir|pasar",
    basePricePerUnit: 85000,
    priceBasis: "Acuan campuran bahan baku pangan per kg (daging, tepung, bumbu), harga grosir"
  },

  "gas-energi": {
    name: "Gas LPG & Energi Dapur",
    category: "Energi & Utilitas",
    color: "#f59e0b",
    icon: "Cpu",
    unit: "Tabung",
    keywords: ["gas", "lpg", "elpiji", "tabung", "energi"],
    searchTerms: ["gas lpg", "elpiji"],
    osmTags: [["shop", "gas"], ["shop", "trade"], ["amenity", "fuel"]],
    nameRegex: "gas|lpg|elpiji|tabung",
    basePricePerUnit: 220000,
    priceBasis: "Acuan tabung LPG 12 kg, harga agen resmi"
  },

  "peralatan-dapur": {
    name: "Peralatan Dapur & Perlengkapan Saji",
    category: "Peralatan Usaha",
    color: "#06b6d4",
    icon: "Disc",
    unit: "Set",
    keywords: ["peralatan", "dapur", "masak", "panci", "kompor", "etalase", "gerobak", "stainless"],
    searchTerms: ["peralatan dapur", "kompor", "stainless"],
    osmTags: [["shop", "houseware"], ["shop", "kitchen"], ["shop", "trade"], ["shop", "hardware"]],
    nameRegex: "peralatan|dapur|masak|panci|kompor|etalase|gerobak|stainless|catering",
    basePricePerUnit: 1450000,
    priceBasis: "Acuan set peralatan dapur usaha (kompor, panci, etalase), harga distributor"
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
    strong: ["dirgantara", "pesawat terbang", "aerospace", "aircraft", "helikopter", "avionik"],
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
    strong: ["rumah sakit", "hospital bed", "alat kesehatan", "alkes"],
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
    strong: ["otomotif", "karoseri", "kendaraan bermotor"],
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
    strong: ["sepeda", "bicycle", "e-bike", "ebike"],
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
    strong: ["furnitur", "furniture", "mebel", "meubel"],
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
    // Usaha kuliner / jasa boga. Rantai pasoknya nyata, tetapi sama sekali
    // bukan rantai pasok manufaktur: warung bakso membeli daging dan gas LPG,
    // bukan pipa baja dan mikrokontroler.
    id: "kuliner",
    keywords: [
      "bakso", "mie ayam", "mie", "soto", "sate", "nasi goreng", "gudeg", "pecel",
      "rumah makan", "warung", "warteg", "kedai", "restoran", "restaurant", "depot",
      "katering", "catering", "kafe", "cafe", "coffee", "kopi", "roti", "bakery",
      "kue", "es krim", "juice", "jus", "ayam goreng", "seafood", "masakan", "kuliner"
    ],
    strong: ["bakso", "mie ayam", "soto", "sate", "gudeg", "pecel", "nasi goreng", "rumah makan", "warteg", "restoran", "restaurant", "katering", "catering", "bakery", "kedai", "depot", "ayam goreng"],
    industry: "Kuliner & Jasa Boga",
    productUnit: "porsi / hari operasional",
    bom: [
      { component: "bahan-pangan", qty: 25, spec: "Bahan baku utama harian: daging, mie, sayur, tepung, dan bumbu" },
      { component: "gas-energi", qty: 2, spec: "Gas LPG untuk memasak" },
      { component: "kemasan", qty: 100, spec: "Kemasan bawa pulang, mangkuk, dan kantong" },
      { component: "peralatan-dapur", qty: 1, spec: "Peralatan masak, etalase, dan perlengkapan saji" }
    ]
  },
  {
    // Pabrik pengolahan makanan — berbeda dari usaha kuliner di atas.
    id: "makanan-olahan",
    keywords: ["pabrik makanan", "industri makanan", "makanan olahan", "food manufacturing", "food industry", "minuman kemasan", "pangan olahan", "snack", "biskuit", "mi instan"],
    strong: ["pabrik makanan", "industri makanan", "food manufacturing", "mi instan", "biskuit"],
    industry: "Industri Makanan & Minuman",
    productUnit: "batch produksi",
    bom: [
      { component: "bahan-pangan", qty: 500, spec: "Bahan baku pangan skala industri" },
      { component: "kemasan", qty: 1000, spec: "Kemasan primer dan sekunder produk" },
      { component: "plastik-injeksi", qty: 200, spec: "Wadah dan tutup plastik food grade" },
      { component: "baja-struktur", qty: 15, spec: "Peralatan dan rak produksi stainless" }
    ]
  },
  {
    id: "tekstil-garmen",
    keywords: ["tekstil", "garmen", "garment", "pakaian", "konveksi", "kain", "sepatu", "alas kaki"],
    strong: ["tekstil", "garmen", "garment", "konveksi", "alas kaki"],
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

// Kategori entitas dari Nominatim/Google yang menandakan usaha ini BUKAN
// pabrik. Sistem sebelumnya mengabaikan sinyal ini dan memaksakan BOM
// manufaktur ke apa pun yang dicari — sehingga pencarian "bakso" menghasilkan
// daftar pemasok besi. Kategori entitas adalah bukti yang jauh lebih kuat
// daripada teks profil, jadi ia diperiksa lebih dulu.
export const NON_MANUFACTURING_CATEGORIES = [
  { match: /^(amenity=(restaurant|cafe|fast_food|food_court|bar|pub|ice_cream)|shop=(bakery|butcher|deli|confectionery|greengrocer|coffee))$/i, ruleId: "kuliner" },
  { match: /^amenity=(school|university|college|kindergarten)$/i, ruleId: null, label: "Institusi Pendidikan" },
  { match: /^amenity=(hospital|clinic|doctors|pharmacy)$/i, ruleId: null, label: "Fasilitas Kesehatan" },
  { match: /^amenity=(bank|police|fire_station|place_of_worship|townhall)$/i, ruleId: null, label: "Fasilitas Publik & Jasa" },
  { match: /^tourism=(hotel|guest_house|hostel|motel)$/i, ruleId: null, label: "Akomodasi & Perhotelan" }
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
  const strong = new Set(rule.strong || []);

  for (const keyword of rule.keywords) {
    const count = countOccurrences(text, keyword);
    if (count > 0) {
      // Sebagian kata kunci nyaris tidak mungkin bermakna lain: "bakso" hanya
      // muncul pada usaha kuliner, "dirgantara" hanya pada industri pesawat.
      // Satu kemunculan saja sudah cukup menjadi bukti, sehingga nama pendek
      // seperti "Bakso Malang" tidak jatuh ke kategori manufaktur umum.
      const weight = strong.has(keyword) ? 3 : 1;
      matched.push(`${keyword} (${count}x)`);
      score += Math.min(count, 3) * weight;
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
export function deriveBomByRules(businessModelText = "", entityCategory = "") {
  const text = businessModelText.toLowerCase();

  // Langkah 1 — kategori entitas lebih dulu. Tag OSM `amenity=restaurant` atau
  // kategori Google "Rumah Makan" adalah pernyataan langsung tentang jenis
  // usahanya, jauh lebih andal daripada menebak dari teks profil.
  const categoryHit = entityCategory
    ? NON_MANUFACTURING_CATEGORIES.find((c) => c.match.test(entityCategory))
    : null;

  if (categoryHit && !categoryHit.ruleId) {
    // Bukan usaha produksi sama sekali, dan tidak ada BOM yang masuk akal.
    // Lebih baik mengatakannya terus terang daripada menyodorkan daftar
    // pemasok baja untuk sebuah sekolah atau rumah sakit.
    return {
      industry: categoryHit.label,
      productUnit: null,
      generic: true,
      notApplicable: true,
      method: "kategori entitas",
      evidence: `Kategori entitas "${entityCategory}" menunjukkan ini bukan usaha produksi`,
      runnerUp: null,
      components: []
    };
  }

  const scored = BUSINESS_MODEL_RULES
    .map((rule) => ({ rule, ...scoreRule(rule, text) }))
    .sort((a, b) => b.score - a.score);

  let best = scored[0];
  let categoryOverride = null;

  // Kategori entitas yang jelas mengalahkan skor teks: pencarian "Bakso Pak
  // Kumis" pada entitas `amenity=restaurant` adalah usaha kuliner, apa pun
  // isi teks profilnya.
  if (categoryHit?.ruleId) {
    const forced = BUSINESS_MODEL_RULES.find((r) => r.id === categoryHit.ruleId);
    if (forced) {
      categoryOverride = entityCategory;
      best = { rule: forced, score: Math.max(best?.score || 0, MIN_EVIDENCE_SCORE), matched: [`kategori entitas ${entityCategory}`] };
    }
  }

  const useGeneric = !best || best.score < MIN_EVIDENCE_SCORE;
  const rule = useGeneric ? GENERIC_BOM : best.rule;

  return {
    industry: rule.industry,
    productUnit: rule.productUnit,
    generic: Boolean(rule.generic) || useGeneric,
    notApplicable: false,
    method: categoryOverride ? "kategori entitas + taksonomi" : "aturan-taksonomi",
    // Bukti yang mendasari keputusan, supaya klasifikasi bisa diaudit dan
    // tidak sekadar muncul begitu saja.
    evidence: useGeneric
      ? `Bukti terkuat (${best?.rule.industry || "tidak ada"}, skor ${best?.score || 0}) di bawah ambang ${MIN_EVIDENCE_SCORE}`
      : categoryOverride
        ? `Kategori entitas "${categoryOverride}" menentukan jenis usaha`
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
  "baterai-daya": "distributor baterai dan motor listrik",
  "bahan-pangan": "grosir sembako dan bahan makanan",
  "gas-energi": "agen gas lpg elpiji",
  "peralatan-dapur": "toko peralatan dapur dan stainless"
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
