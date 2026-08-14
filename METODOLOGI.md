# Metodologi

Dokumen ini menjelaskan cara sistem bekerja, metode yang dipakai beserta
alasannya, dan — sama pentingnya — apa yang **tidak** bisa dilakukannya.

---

## 1. Arsitektur

```
Browser (React)
   │  /api/*  (proxy Vite)
   ▼
Server proxy (Node/Express, port 5174)
   │
   ├── Google Maps via SerpAPI ......... pencarian pemasok (SUMBER UTAMA)
   ├── Nominatim (OpenStreetMap) ....... geocoding perusahaan + pemasok (cadangan)
   ├── Overpass API .................... pencarian pemasok berbasis tag (cadangan)
   ├── OSRM ............................ jarak & waktu tempuh jaringan jalan
   ├── Google Search / DuckDuckGo ...... pencarian profil perusahaan
   └── Claude API (opsional) ........... penurunan Bill of Materials
```

**Mengapa perlu server proxy.** Browser tidak dapat memanggil sumber-sumber itu
langsung karena dua alasan teknis: kebijakan CORS memblokir permintaan lintas
asal ke sebagian besar layanan tersebut, dan Nominatim mewajibkan `User-Agent`
berisi alamat kontak yang valid — header yang tidak dapat diatur dari kode
browser. Server proxy juga menjadi tempat pembatasan laju (1 permintaan/detik
untuk Nominatim) dan cache ditegakkan di satu titik.

---

## 2. Alur pemrosesan

### Tahap 1 — Geocoding perusahaan

Nama perusahaan dikirim ke Nominatim. Yang dikembalikan bukan satu jawaban,
melainkan **daftar kandidat** untuk dipilih pengguna. Ini disengaja: menebak
satu hasil lalu menyebutnya pasti adalah cara paling mudah menghasilkan peta
yang salah dengan percaya diri.

Setiap kandidat membawa `osm_type/osm_id`, sehingga titiknya dapat dibuka di
`openstreetmap.org` dan diperiksa.

### Tahap 2 — Scraping profil perusahaan

Kueri `"<nama> produk"` dan `"<nama> profil perusahaan"` dikirim ke mesin
pencari (SerpAPI/Google bila ada API key, selain itu DuckDuckGo HTML). Situs
resmi yang ditemukan lalu diambil dan `<title>`, `<meta description>`, serta
paragraf awalnya diurai.

Seluruh URL yang benar-benar dibaca disimpan dan ditampilkan di dokumen hasil,
sehingga setiap kesimpulan tentang model bisnis dapat ditelusuri.

### Tahap 3 — Penurunan Bill of Materials

Dua jalur, dipilih otomatis:

**Jalur bawaan — aturan taksonomi berbasis skor bukti.** Setiap industri punya
daftar kata kunci dan BOM baku. Semua aturan **dinilai**, lalu yang berskor
tertinggi dipilih:

```
skor = Σ min(kemunculan_kata_kunci, 3)  +  bonus_keluasan
```

Kemunculan tiap kata kunci dibatasi 3 supaya satu kata yang diulang-ulang tidak
mendominasi; bonus keluasan diberikan bila ada ≥2 kata kunci berbeda, karena
dua istilah berbeda lebih meyakinkan daripada satu istilah berulang. Bila skor
tertinggi di bawah ambang 3, sistem memakai pola manufaktur umum dan menandainya
generik — lebih baik mengaku tidak tahu daripada memberi jawaban spesifik yang
keliru.

> **Mengapa berbasis skor, bukan "aturan pertama yang cocok".** Versi pertama
> memakai pencocokan berurutan, dan itu gagal nyata: teks profil PT Dirgantara
> Indonesia menyebut "dirgantara" 13 kali, "pesawat" 9 kali, dan "aerospace"
> 3 kali — tetapi **satu** kemunculan kata "truk" membuat aturan otomotif
> menang lebih dulu, sehingga perusahaan pesawat terbang diklasifikasikan
> sebagai industri karoseri. Dengan penilaian berbasis skor, dirgantara meraih
> 22 sementara otomotif hanya 1.

Bukti yang mendasari setiap klasifikasi ditampilkan di antarmuka dan dokumen
hasil, sehingga keputusannya dapat diaudit dan tidak sekadar muncul begitu saja.

Deterministik, tanpa API key, dan hasilnya sama setiap kali dijalankan — cocok
untuk laporan yang harus bisa direplikasi.

**Jalur AI — Claude.** Bila `ANTHROPIC_API_KEY` diisi, Claude membaca teks
profil dan memilih komponen dari **pustaka yang sama**, dibatasi lewat JSON
Schema (`enum` berisi ID komponen yang valid). Batasan ini penting: model tidak
boleh mengarang komponen yang tidak punya kata kunci pencarian pemasok maupun
dasar harga. Bila teks tidak cukup untuk memastikan produknya, model diminta
menyatakan ketidakpastian itu, bukan menebak.

Bila tidak ada aturan yang cocok dan AI tidak tersedia, sistem memakai pola
manufaktur umum dan **menandainya** di antarmuka sebagai BOM generik.

### Tahap 4 — Pencarian pemasok

**Sumber utama: Google Maps via SerpAPI.** Cakupan Google Maps untuk badan
usaha di Indonesia jauh melampaui OpenStreetMap. Satu kueri bahasa alami
(`"distributor besi baja"`) di sekitar pabrik mengembalikan 20 hasil dengan
alamat, kategori usaha (`type: "Distributor Baja"`), rating, dan jumlah ulasan.
Setiap tempat membawa `place_id`, sehingga tetap dapat dibuka dan diperiksa
lewat `google.com/maps/place/?q=place_id:...`.

**Rating diubah menjadi skor keyakinan dengan penyusutan Bayesian.** Rating
mentah menyesatkan: satu ulasan bintang 5 tidak lebih meyakinkan daripada 300
ulasan bintang 4,7. Karena itu rating disusutkan ke arah rata-rata umum
sebanding dengan sedikitnya ulasan — teknik yang sama dipakai peringkat
berbobot IMDb:

```
rating_terkoreksi = (R x v + m x w) / (v + w)
```

dengan R = rating, v = jumlah ulasan, m = 4,0 (prior), w = 10 (bobot prior).
Hasilnya dinormalisasi ke 0–1 dan menjadi kriteria **Keyakinan Data** dalam
TOPSIS. Pemasok tanpa rating diberi nilai netral 0,6 — terdaftar di Google Maps
adalah bukti keberadaan, tetapi bukan bukti kualitas.

**Sumber cadangan: OpenStreetMap.** Dipertahankan, bukan dibuang, karena tiga
alasan: kuota SerpAPI terbatas (250 pencarian/bulan pada free plan) dan sistem
harus tetap bekerja saat habis; data OSM berlisensi ODbL sehingga bebas
dicantumkan dan disebarkan di laporan, sementara data Google terikat ToS yang
membatasi penyimpanan dan redistribusi; dan memiliki dua sumber independen
membuat hasil dapat disilangperiksa.

Diatur lewat `SUPPLIER_SOURCE`: `auto` (bawaan), `google`, atau `osm`.

Kandidat di luar radius 700 km dibuang sebelum jarak jalannya dihitung — Google
Maps menafsirkan batas wilayah secara longgar dan bisa mengembalikan hasil di
Cirebon untuk kueri di sekitar Yogyakarta.

#### Jalur OpenStreetMap

Saat OSM dipakai, dua sumber digabung karena masing-masing menangkap hal
berbeda:

**Sumber A — Nominatim, pencarian teks berbatas wilayah.** Kata kunci pendek
(`"besi"`, `"plastik"`) dicari di dalam kotak wilayah 150 km lalu 600 km dari
pabrik. Unggul menemukan entitas yang namanya menyebut komoditasnya.

> Catatan implementasi: Nominatim hanya bekerja baik dengan kueri 1–2 kata.
> Frasa panjang seperti `"distributor besi baja Semarang"` mengembalikan nol
> hasil, sementara `"besi"` dengan viewbox mengembalikan hasil yang relevan.

**Sumber B — Overpass, pencarian berbasis tag.** Query tag OSM
(`craft=metal_construction`, `man_made=works`, `shop=hardware`, …) dalam radius
200 km. Unggul menemukan pabrik yang namanya tidak menyebut komoditas sama
sekali — misalnya sebuah pengecoran logam yang hanya bernama "CV Tridodo Jaya".

**Penyaringan relevansi.** Kedua sumber menghasilkan derau yang harus dibuang:

| Masalah | Contoh nyata | Penanganan |
|---|---|---|
| Kategori bukan usaha | "Jalan Besi Raya" (`highway=tertiary`) | Daftar tolak kategori: `highway`, `place`, `waterway`, dll. |
| Tag benar, entitas salah | "Gardu Ronda" (`man_made=works`) | Daftar tolak nama untuk fasilitas non-komersial |
| Entitas tanpa nama | poligon industri kosong | Ditolak — tidak bisa diverifikasi |
| Duplikat lintas sumber | entitas sama sebagai node dan way | Dedup berdasar `osm_id`, lalu koordinat 4 desimal (~11 m) |

Kandidat yang lolos diberi **skor keyakinan 0–1** dari bobot kategori tag,
kecocokan nama dengan kata kunci komponen, penanda badan usaha (PT, CV, pabrik,
industri), dan keberadaan tag kontak. Skor ini masuk sebagai kriteria keputusan
tersendiri, bukan disembunyikan.

### Tahap 5 — Jarak dan estimasi biaya

Jarak dihitung OSRM di atas jaringan jalan sungguhan. Ini bukan detail sepele:
untuk rute Kalasan → Semarang, garis lurus Haversine memberi ~90 km sedangkan
jalan sebenarnya **119,6 km** — selisih 33% yang langsung mendistorsi ongkos
angkut. Haversine hanya dipakai sebagai cadangan bila OSRM tidak dapat
dihubungi, dan hasilnya ditandai berbeda di antarmuka.

Model biaya dijelaskan di bagian 4.

### Tahap 6 — Pemilihan pemasok

Dilakukan di sisi klien, sehingga mengubah bobot atau strategi tidak memicu
pengambilan data ulang. Metodenya dijelaskan di bagian 3.

---

## 3. Metode pengambilan keputusan

### Mengapa AHP + TOPSIS

Memilih pemasok bukan masalah satu kriteria. "Terdekat" dan "termurah" sering
berbeda pemasoknya, dan keduanya bisa kalah oleh pemasok yang sedikit lebih
jauh tetapi lead time-nya separuh. Ini persoalan **Multi-Criteria Decision
Making** (MCDM), dan dua metodenya menjawab dua pertanyaan berbeda:

- **AHP menjawab "seberapa penting tiap kriteria?"** Membagi 100% ke empat
  kriteria lewat slider adalah tugas yang buruk bagi manusia. Membandingkan dua
  hal sekaligus ("jarak seberapa lebih penting dibanding biaya?") jauh lebih
  andal, dan AHP menyusun perbandingan-perbandingan itu menjadi bobot yang
  konsisten secara matematis.

- **TOPSIS menjawab "alternatif mana yang terbaik?"** Ia tidak sekadar
  menjumlahkan skor terbobot, melainkan mengukur jarak tiap alternatif ke
  solusi ideal positif dan negatif. Alternatif yang menang adalah yang paling
  dekat ke yang terbaik **sekaligus** paling jauh dari yang terburuk — sifat
  yang tidak dimiliki penjumlahan sederhana.

### Kriteria

| Kriteria | Jenis | Sumber nilai |
|---|---|---|
| Jarak tempuh | cost (minimasi) | OSRM — terukur |
| Biaya total | cost (minimasi) | Model estimasi |
| Lead time | cost (minimasi) | Model estimasi dari skala usaha |
| Keyakinan data | benefit (maksimasi) | Skor relevansi OSM — terukur |

### AHP — Analytic Hierarchy Process (Saaty, 1980)

1. Pengguna mengisi 6 perbandingan berpasangan (C(4,2) = 6) pada skala Saaty
   1–9 lewat slider.
2. Matriks perbandingan A disusun, dengan a<sub>ji</sub> = 1/a<sub>ij</sub>.
3. Vektor prioritas dihitung dengan **rata-rata geometris baris**:
   w<sub>i</sub> = (∏<sub>j</sub> a<sub>ij</sub>)<sup>1/n</sup>, lalu
   dinormalisasi agar Σw = 1.
4. Konsistensi diuji:
   - λ<sub>max</sub> = Σ<sub>j</sub> ( (Σ<sub>i</sub> a<sub>ij</sub>) · w<sub>j</sub> )
   - CI = (λ<sub>max</sub> − n) / (n − 1)
   - CR = CI / RI, dengan RI = 0,90 untuk n = 4 (tabel Random Index Saaty)
   - **CR ≤ 0,10 berarti penilaian cukup konsisten.**

Rata-rata geometris dipakai alih-alih eigenvector karena hasilnya sangat dekat,
dapat dihitung tanpa iterasi, dan direkomendasikan Saaty sendiri sebagai
pendekatan praktis.

Nilai CR ditampilkan di antarmuka. Bila pengguna memberi penilaian yang saling
bertentangan — misalnya jarak > biaya, biaya > lead time, tetapi lead time >
jarak — CR melonjak dan sistem memperingatkan, bukan diam-diam memakainya.

### TOPSIS — Technique for Order Preference by Similarity to Ideal Solution (Hwang & Yoon, 1981)

1. **Matriks keputusan** X (m alternatif × n kriteria).
2. **Normalisasi vektor:**
   r<sub>ij</sub> = x<sub>ij</sub> / √(Σ<sub>i</sub> x<sub>ij</sub>²)
3. **Pembobotan:** v<sub>ij</sub> = w<sub>j</sub> · r<sub>ij</sub>
4. **Solusi ideal:**
   - A⁺ = {max v<sub>ij</sub> untuk benefit, min v<sub>ij</sub> untuk cost}
   - A⁻ = kebalikannya
5. **Jarak Euclidean:**
   - D<sub>i</sub>⁺ = √(Σ<sub>j</sub> (v<sub>ij</sub> − A<sub>j</sub>⁺)²)
   - D<sub>i</sub>⁻ = √(Σ<sub>j</sub> (v<sub>ij</sub> − A<sub>j</sub>⁻)²)
6. **Kedekatan relatif:**
   C<sub>i</sub> = D<sub>i</sub>⁻ / (D<sub>i</sub>⁺ + D<sub>i</sub>⁻), dengan 0 ≤ C<sub>i</sub> ≤ 1

Alternatif dengan C<sub>i</sub> tertinggi dipilih. Seluruh langkah antara —
matriks ternormalisasi terbobot, A⁺, A⁻, D⁺, D⁻ — dapat dilihat di antarmuka
per komponen, sehingga angkanya bisa dihitung ulang dengan tangan untuk
lampiran laporan.

### Strategi pembanding

Mode "Terdekat" dan "Termurah" sengaja dipertahankan sebagai kriteria tunggal.
Laporan yang menunjukkan bahwa TOPSIS memilih pemasok **berbeda** dari sekadar
"yang termurah" jauh lebih meyakinkan daripada TOPSIS yang berdiri sendiri
tanpa pembanding.

### Verifikasi

`npm test` menjalankan 14 uji terhadap implementasi MCDM:

- AHP memulihkan bobot asli dari matriks yang konsisten sempurna
  (a<sub>ij</sub> = w<sub>i</sub>/w<sub>j</sub> → w kembali persis, λ<sub>max</sub> = n, CR = 0)
- AHP mendeteksi penilaian melingkar (CR > 0,1)
- TOPSIS memberi C<sub>i</sub> = 1 untuk alternatif dominan dan 0 untuk yang didominasi
- Tiap kolom matriks ternormalisasi bernorma Euclidean 1
- A⁺ mengambil minimum untuk kriteria cost dan maksimum untuk benefit
- Perubahan bobot benar-benar mengubah peringkat ke arah yang diharapkan

---

## 4. Data terukur vs estimasi

Pembedaan ini ditegakkan di seluruh sistem — di peta, di tabel, dan di dokumen
cetak. Angka estimasi selalu diberi tanda `~`.

### Terukur dan dapat diverifikasi

| Data | Sumber | Cara verifikasi |
|---|---|---|
| Nama, alamat, koordinat pemasok | Google Maps / OpenStreetMap | Tautan `place_id` atau `osm.org/{type}/{id}` di setiap entri |
| Rating & jumlah ulasan pemasok | Google Maps | Terlihat langsung di halaman tempatnya |
| Kategori usaha pemasok | Google Maps / tag OSM | Tercantum di tabel (`Distributor Baja`, `craft=metal_construction`) |
| Koordinat pabrik target | Nominatim | Tautan OSM |
| Jarak & waktu tempuh | OSRM | Bandingkan dengan aplikasi peta mana pun |
| Sumber profil perusahaan | Mesin pencari | Seluruh URL tercantum di dokumen hasil |
| Dasar klasifikasi industri | Skor bukti kata kunci | Kata kunci dan skornya ditampilkan di antarmuka |

### Estimasi model

**Harga satuan:**

```
harga = harga_acuan × faktor_skala × indeks_wilayah
```

- `harga_acuan` — harga rujukan pasar per komponen, tercantum di
  `server/lib/bomTaxonomy.js` beserta dasar spesifikasinya
- `faktor_skala` — 0,88 pabrik · 1,00 distributor · 1,22 toko eceran, ditaksir
  dari tag OSM dan penanda badan usaha pada nama
- `indeks_wilayah` — 0,90 (DIY) sampai 1,35 (Indonesia Timur), mengacu pada
  perbedaan UMK dan kepadatan industri

**Ongkos angkut:**

```
ongkir = Rp150.000 + (jarak_jalan_km × tarif_per_km)
```

Tarif per km menurut jenis muatan: Rp4.500 logam berat, Rp3.800 kimia,
Rp3.500 umum, Rp2.800 elektronik sensitif, Rp2.200 ringan volumetrik.

**MOQ dan lead time** diturunkan dari skala usaha yang ditaksir.

### Mengapa harga tidak di-scrape

Harga bahan baku industri B2B tidak dipublikasikan secara terbuka. Tidak ada
sumber web yang dapat diambil secara sah untuk mendapatkannya — yang beredar
hanyalah harga eceran marketplace yang tidak mewakili pengadaan skala pabrik.

Pilihan yang ada: mengarang angka dan menyebutnya hasil scraping, atau memakai
model terbuka yang asumsinya tertulis dan bisa dikoreksi. Sistem ini memilih
yang kedua, dan menandainya di setiap tempat angka itu muncul.

**Ganti dengan penawaran resmi pemasok sebelum dipakai untuk keputusan
pengadaan.**

---

## 5. Batasan yang diketahui

1. **Kuota dan lisensi sumber utama.** Free plan SerpAPI dibatasi 250 pencarian
   per bulan (~40 analisis). Saat habis, sistem turun ke OpenStreetMap yang
   cakupannya lebih tipis. Selain itu data Google Maps terikat ToS Google yang
   membatasi penyimpanan dan redistribusi, sementara data OpenStreetMap
   berlisensi ODbL dan bebas dicantumkan. Untuk lampiran laporan yang akan
   disebarluaskan, jalankan ulang dengan `SUPPLIER_SOURCE=osm`.

2. **Kategori usaha bukan jaminan kecocokan komponen.** Sebuah tempat berkategori
   "Toko Elektronik" bisa jadi toko elektronik konsumen, bukan pemasok modul
   kontrol industri. Kolom "Keyakinan Data" menyatakan tingkat kepercayaan ini
   secara eksplisit dan ikut diperhitungkan sebagai kriteria keputusan — tetapi
   ia tidak menggantikan verifikasi manual. Rating tinggi menunjukkan usaha yang
   nyata dan aktif, bukan bahwa ia memasok komponen yang Anda butuhkan.

3. **Klasifikasi industri berbasis kata kunci punya batas.** Penilaian berbasis
   skor jauh lebih tahan derau daripada pencocokan berurutan, tetapi tetap
   bergantung pada kualitas teks profil yang berhasil di-scrape. Isi
   `ANTHROPIC_API_KEY` untuk penurunan BOM secara semantik oleh Claude bila
   ketepatan klasifikasi menjadi penting.

4. **BOM adalah taksiran struktur produk**, bukan BOM resmi perusahaan. Ia
   diturunkan dari deskripsi publik, bukan dari dokumen teknik.

5. **Rute OSRM dihitung untuk kendaraan penumpang.** Truk dengan pembatasan
   tonase, tinggi, dan jam operasional dapat menempuh rute berbeda.

6. **Komponen tanpa kandidat dilaporkan kosong**, tidak diisi pengganti. Total
   biaya kemudian hanya mencakup komponen yang punya pemasok, dan jumlah
   komponen yang terlewat ditampilkan di ringkasan.

---

## 6. Rujukan

- Saaty, T. L. (1980). *The Analytic Hierarchy Process*. McGraw-Hill.
- Hwang, C. L., & Yoon, K. (1981). *Multiple Attribute Decision Making: Methods and Applications*. Springer.
- OpenStreetMap Foundation. Nominatim Usage Policy — https://operations.osmfoundation.org/policies/nominatim/
- Project OSRM — http://project-osrm.org/
