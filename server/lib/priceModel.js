// Model estimasi harga dan ongkos angkut.
//
// Batas yang harus jelas bagi siapa pun yang membaca hasil sistem ini:
//
//   REAL      — nama, alamat, dan koordinat pemasok berasal dari OpenStreetMap
//               dan bisa diverifikasi lewat tautan osm.org yang disertakan.
//   REAL      — jarak dan waktu tempuh dihitung OSRM di atas jaringan jalan asli.
//   ESTIMASI  — harga satuan dan ongkos angkut dihitung model di bawah ini.
//
// Harga bahan baku industri B2B tidak dipublikasikan; tidak ada sumber web
// yang bisa di-scrape secara sah untuk mendapatkannya. Alih-alih mengarang
// angka dan menyebutnya hasil scraping, sistem memakai model terbuka yang
// asumsinya tertulis dan bisa dikoreksi.

// Pengali harga menurut skala usaha. Pabrik menjual lebih murah per unit
// dengan minimum order besar; toko eceran sebaliknya.
const SCALE_FACTORS = {
  factory: { price: 0.88, moq: 100, leadTimeDays: 3, label: "Pabrik / produsen" },
  distributor: { price: 1.0, moq: 25, leadTimeDays: 2, label: "Distributor / CV" },
  retail: { price: 1.22, moq: 5, leadTimeDays: 1, label: "Toko / eceran" }
};

// Indeks biaya wilayah, mengacu pada perbedaan UMK dan kepadatan industri.
// Kawasan industri Jabodetabek–Cikarang menjadi basis 1,00.
const REGION_INDEX = [
  { match: /jakarta|bekasi|cikarang|tangerang|banten|karawang|bogor|depok/i, factor: 1.0, label: "Jabodetabek & koridor industri Banten–Karawang" },
  { match: /bandung|cimahi|jawa barat|west java/i, factor: 1.03, label: "Bandung Raya" },
  { match: /semarang|kendal|demak|jawa tengah|central java|solo|surakarta|klaten|kudus/i, factor: 0.92, label: "Jawa Tengah" },
  { match: /yogyakarta|sleman|bantul|kulon progo|diy/i, factor: 0.9, label: "D.I. Yogyakarta" },
  { match: /surabaya|sidoarjo|gresik|pasuruan|jawa timur|east java|malang/i, factor: 0.95, label: "Jawa Timur" },
  { match: /sumatra|sumatera|medan|palembang|lampung|riau/i, factor: 1.12, label: "Sumatera" },
  { match: /kalimantan|balikpapan|banjarmasin|samarinda|pontianak/i, factor: 1.18, label: "Kalimantan" },
  { match: /sulawesi|makassar|manado/i, factor: 1.2, label: "Sulawesi" },
  { match: /bali|denpasar|lombok|nusa tenggara/i, factor: 1.15, label: "Bali & Nusa Tenggara" },
  { match: /papua|maluku|ambon|jayapura/i, factor: 1.35, label: "Indonesia Timur" }
];

function regionFactor(text = "") {
  const found = REGION_INDEX.find((r) => r.match.test(text));
  return found || { factor: 1.05, label: "Wilayah lain (indeks default)" };
}

/**
 * Estimasi harga satuan dari seorang pemasok untuk sebuah komponen.
 * Mengembalikan angka beserta rincian asumsi yang membentuknya, agar
 * antarmuka bisa menampilkan "kenapa segini" dan bukan hanya "segini".
 */
export function estimateUnitPrice(component, supplier) {
  const scale = SCALE_FACTORS[supplier.scale] || SCALE_FACTORS.distributor;
  const region = regionFactor(`${supplier.city || ""} ${supplier.address || ""} ${supplier.displayName || ""}`);

  const base = component.basePricePerUnit;
  const pricePerUnit = Math.round(base * scale.price * region.factor);

  return {
    pricePerUnit,
    moq: scale.moq,
    leadTimeDays: scale.leadTimeDays,
    confidence: "estimasi",
    breakdown: {
      basePrice: base,
      basis: component.priceBasis,
      scaleLabel: scale.label,
      scaleFactor: scale.price,
      regionLabel: region.label,
      regionFactor: region.factor
    }
  };
}

// Tarif angkutan darat. Basis adalah biaya tetap per pengiriman (muat, bongkar,
// administrasi); tarif per km mengikuti jenis muatan.
const FREIGHT_BASE_COST = 150000;

const FREIGHT_RATE_PER_KM = [
  { match: /logam|struktur|presisi/i, rate: 4500, label: "Muatan berat (truk tronton)" },
  { match: /elektronika|embedded|daya/i, rate: 2800, label: "Muatan sensitif (ekspedisi khusus)" },
  { match: /tekstil|foam|kemasan/i, rate: 2200, label: "Muatan ringan volumetrik" },
  { match: /kimia|finishing/i, rate: 3800, label: "Muatan B3 terbatas" }
];

/**
 * Estimasi ongkos angkut satu kali kirim, memakai jarak jalan sungguhan
 * bila tersedia.
 */
export function estimateFreight(distanceKm, componentCategory = "") {
  const tier = FREIGHT_RATE_PER_KM.find((t) => t.match.test(componentCategory))
    || { rate: 3500, label: "Muatan umum (truk box)" };

  const cost = Math.round(FREIGHT_BASE_COST + distanceKm * tier.rate);

  return {
    cost,
    confidence: "estimasi",
    breakdown: {
      baseCost: FREIGHT_BASE_COST,
      ratePerKm: tier.rate,
      tierLabel: tier.label,
      distanceKm
    }
  };
}

export const PRICE_MODEL_DISCLOSURE = {
  real: [
    "Nama, alamat, dan koordinat pemasok (OpenStreetMap, dapat diverifikasi via tautan osm.org)",
    "Jarak dan waktu tempuh jalan (OSRM di atas jaringan jalan OpenStreetMap)",
    "Lokasi dan profil perusahaan target (Nominatim + hasil pencarian web)"
  ],
  estimated: [
    "Harga satuan komponen — model: harga acuan x faktor skala usaha x indeks biaya wilayah",
    "Ongkos angkut — model: biaya tetap Rp150.000 + (jarak jalan x tarif per km menurut jenis muatan)",
    "MOQ dan lead time — diturunkan dari skala usaha yang ditaksir dari tag OSM dan nama badan usaha"
  ],
  caveat:
    "Harga bahan baku industri B2B tidak dipublikasikan secara terbuka sehingga tidak dapat "
    + "di-scrape secara sah. Angka harga di sistem ini adalah estimasi model, bukan penawaran. "
    + "Ganti dengan penawaran resmi pemasok sebelum dipakai untuk keputusan pengadaan."
};
