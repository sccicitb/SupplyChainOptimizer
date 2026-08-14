# SupplyChainAI — Pemetaan Rantai Pasok Berbasis Geodata

Cari sebuah perusahaan manufaktur, dan sistem akan memetakan calon pemasok
komponennya di peta: lokasi nyata dari OpenStreetMap, jarak jalan sungguhan
dari OSRM, lalu diperingkat dengan AHP + TOPSIS.

Setiap titik di peta membawa tautan ke entitas OpenStreetMap asalnya. Klik,
dan Anda bisa memeriksa sendiri bahwa tempat itu memang ada.

## Menjalankan

```bash
npm install                       # sekaligus memasang dependensi server
cp server/.env.example server/.env
```

Isi `CONTACT_EMAIL` di `server/.env` — **ini wajib**. Kebijakan Nominatim
mensyaratkan alamat kontak yang valid pada setiap permintaan; tanpa itu akses
Anda bisa dibatasi.

```bash
npm start                         # menjalankan server proxy + antarmuka web
```

Buka http://localhost:5173

Perintah lain:

```bash
npm run server   # hanya server proxy (port 5174)
npm run dev      # hanya antarmuka web (port 5173)
npm test         # 14 uji kebenaran implementasi AHP & TOPSIS
npm run build    # build produksi
```

## Konfigurasi opsional

Semua fitur berikut punya jalur cadangan tanpa API key:

| Variabel | Tanpa key | Dengan key |
|---|---|---|
| `SERPAPI_KEY` | Pemasok dari OpenStreetMap, profil dari DuckDuckGo | **Pemasok dari Google Maps** (cakupan jauh lebih lengkap, ada rating asli) + profil dari Google |
| `ANTHROPIC_API_KEY` | Aturan taksonomi berbasis skor bukti | Claude menurunkan BOM secara semantik |
| `SUPPLIER_SOURCE` | `auto` — Google utama, OSM cadangan | `google` atau `osm` untuk mengunci satu sumber |
| `OVERPASS_ENDPOINT` | `overpass-api.de` | Endpoint alternatif bila yang utama sibuk |

**Kuota SerpAPI:** free plan 250 pencarian/bulan; satu analisis penuh memakai
~6 pencarian (≈40 analisis/bulan). Hasil di-cache, jadi menganalisis ulang
perusahaan yang sama tidak menagih kuota. Saat kuota habis, sistem otomatis
turun ke OpenStreetMap alih-alih berhenti.

## Cara kerja singkat

```
Nama perusahaan
      │
      ├─ Nominatim ─────────► koordinat pabrik (dapat diverifikasi)
      ├─ Mesin pencari ─────► teks profil & model bisnis
      ├─ Taksonomi / Claude ► Bill of Materials
      ├─ Nominatim+Overpass ► kandidat pemasok nyata per komponen
      ├─ OSRM ──────────────► jarak & waktu tempuh jalan
      └─ AHP + TOPSIS ──────► peringkat dan pemasok terpilih
```

Penjelasan lengkap metode, rumus, dan batasannya ada di
**[METODOLOGI.md](METODOLOGI.md)**.

## Yang terukur dan yang diestimasi

Pembedaan ini ditegakkan di seluruh antarmuka. Angka estimasi diberi tanda `~`.

**Terukur** — lokasi, alamat, dan tag pemasok (OpenStreetMap); jarak dan waktu
tempuh (OSRM); sumber-sumber profil perusahaan (URL tercantum semua).

**Estimasi model** — harga satuan, ongkos angkut, MOQ, dan lead time. Harga
bahan baku industri B2B tidak dipublikasikan terbuka sehingga tidak dapat
di-scrape secara sah; sistem memakai model estimasi yang asumsinya tertulis di
`server/lib/priceModel.js`. **Ganti dengan penawaran resmi pemasok sebelum
dipakai untuk keputusan pengadaan.**

## Struktur

```
server/
  index.js              rute API + Server-Sent Events untuk laporan kemajuan
  lib/
    http.js             pembatasan laju & User-Agent per kebijakan Nominatim
    cache.js            cache memori + disk
    nominatim.js        geocoding & pencarian pemasok berbatas wilayah
    overpass.js         pencarian pemasok berbasis tag OSM
    osrm.js             jarak jaringan jalan (fallback Haversine)
    relevance.js        penyaring derau & skor keyakinan entitas OSM
    profile.js          scraping mesin pencari & situs perusahaan
    bomTaxonomy.js      pustaka komponen & aturan penurunan BOM
    bomAi.js            penurunan BOM dengan Claude (opsional)
    priceModel.js       model estimasi harga & ongkos angkut
    supplyChain.js      orkestrator seluruh alur

src/
  utils/mcdm.js         AHP + TOPSIS
  api/client.js         klien API dengan pembacaan aliran SSE
  components/           antarmuka

test/mcdm.test.mjs      uji kebenaran matematis MCDM
```

## Batasan

Sistem hanya menemukan pemasok yang **sudah terpetakan di OpenStreetMap**.
Kelengkapan data industri Indonesia di OSM tidak merata. Kecocokan tag juga
bukan jaminan kecocokan usaha — karena itu setiap kandidat membawa skor
"Keyakinan Data" yang ikut diperhitungkan sebagai kriteria keputusan.

Daftar batasan lengkap ada di [METODOLOGI.md](METODOLOGI.md#5-batasan-yang-diketahui).

## Lisensi data

Data lokasi © Kontributor OpenStreetMap, tersedia di bawah
[ODbL](https://www.openstreetmap.org/copyright). Routing oleh
[OSRM](http://project-osrm.org/).
