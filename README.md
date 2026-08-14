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

## Deploy ke internet / domain

Di produksi server Node sekaligus menyajikan hasil build frontend, jadi cukup
**satu layanan di satu port** — tidak perlu dua proses seperti saat pengembangan.

```bash
npm install
npm run build
npm run start:prod        # membaca PORT dari environment
```

### API key di hosting: pakai environment variable, jangan ditulis di kode

Aplikasi membaca `SERPAPI_KEY` dari environment. File `server/.env` hanya alat
bantu pengembangan lokal — **di hosting file itu tidak perlu ada sama sekali**.

> ⚠️ **Jangan pernah commit API key ke repositori publik.** Repo publik dipindai
> bot pencari kredensial secara terus-menerus, umumnya dalam hitungan menit
> setelah commit. Akibatnya kuota Anda habis dipakai orang lain, dan GitHub
> secret scanning sering otomatis melaporkannya sehingga kunci dicabut penyedia
> — aplikasi Anda justru mati di domain. Menyimpan kunci sebagai environment
> variable di panel hosting lebih aman *dan* lebih praktis: menggantinya tidak
> perlu commit ulang.

Variabel yang perlu diatur di panel hosting:

| Variabel | Nilai | Wajib |
|---|---|---|
| `NODE_ENV` | `production` | ya |
| `CONTACT_EMAIL` | email Anda (kebijakan Nominatim) | ya |
| `SERPAPI_KEY` | kunci SerpAPI Anda | tidak (tanpa ini sistem memakai OpenStreetMap) |
| `PORT` | biasanya diisi otomatis oleh hosting | tidak |
| `SUPPLIER_SOURCE` | `auto` / `google` / `osm` | tidak |
| `ANTHROPIC_API_KEY` | kunci Claude untuk penurunan BOM | tidak |

### Cara mengatur di beberapa platform

**Railway / Render / Fly.io** — buka Settings → Variables (atau Environment),
tambahkan tiap variabel di atas. Build command `npm install && npm run build`,
start command `npm run start:prod`.

**VPS dengan systemd** — taruh di unit file, bukan di repo:

```ini
[Service]
Environment=NODE_ENV=production
Environment=CONTACT_EMAIL=email-anda@contoh.com
Environment=SERPAPI_KEY=kunci-anda-di-sini
ExecStart=/usr/bin/node /var/www/app/server/index.js
```

**cPanel / shared hosting Node** — menu "Setup Node.js App" punya bagian
Environment Variables; isikan di sana.

**Docker** — jangan tulis di `Dockerfile`. Pakai `docker run --env-file` atau
`environment:` di `docker-compose.yml` yang tidak ikut di-commit.

### Kalau kunci terlanjur bocor

Rotate di dashboard SerpAPI, lalu perbarui environment variable di hosting.
Menghapus commit saja tidak cukup — riwayat git dan cache GitHub tetap
menyimpannya.

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
