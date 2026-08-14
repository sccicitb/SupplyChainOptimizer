// Multi-Criteria Decision Making: AHP untuk bobot, TOPSIS untuk peringkat.
//
// Versi sebelumnya menyebut dirinya TOPSIS tetapi yang dijalankan adalah
// Simple Additive Weighting: normalisasi min-max lalu penjumlahan terbobot.
// Berkas ini mengimplementasikan kedua metode sesuai rumus aslinya, dan
// mengembalikan langkah antaranya agar hasil bisa diperiksa dan ditulis
// ulang di laporan.
//
// Rujukan:
//   Hwang & Yoon (1981), Multiple Attribute Decision Making — TOPSIS
//   Saaty (1980), The Analytic Hierarchy Process — AHP

// ---------------------------------------------------------------------------
// Kriteria keputusan
// ---------------------------------------------------------------------------
// `type` menentukan arah preferensi: 'cost' = makin kecil makin baik,
// 'benefit' = makin besar makin baik.

export const CRITERIA = [
  {
    id: "distance",
    label: "Jarak Tempuh",
    unit: "km",
    type: "cost",
    description: "Jarak jalan sungguhan dari OSRM. Memengaruhi ongkir, lead time, dan risiko gangguan pasokan.",
    accessor: (s) => s.distanceKm
  },
  {
    id: "cost",
    label: "Biaya Total",
    unit: "Rp",
    type: "cost",
    description: "Harga material (estimasi model) + ongkos angkut (estimasi model) per unit produk.",
    accessor: (s) => s.totalCost
  },
  {
    id: "leadTime",
    label: "Lead Time",
    unit: "hari",
    type: "cost",
    description: "Perkiraan waktu pemenuhan order, diturunkan dari skala usaha pemasok.",
    accessor: (s) => s.leadTimeDays
  },
  {
    id: "confidence",
    label: "Keyakinan Data",
    unit: "0-1",
    type: "benefit",
    description: "Seberapa yakin entitas OSM ini benar-benar pemasok komponen tersebut, dari tag dan nama usahanya.",
    accessor: (s) => s.relevance
  }
];

// ---------------------------------------------------------------------------
// AHP — Analytic Hierarchy Process
// ---------------------------------------------------------------------------

// Random Index Saaty, untuk menghitung Consistency Ratio.
const RANDOM_INDEX = [0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];

/**
 * Membangun matriks perbandingan berpasangan n x n dari daftar perbandingan.
 * Nilai mengikuti skala Saaty 1-9: 1 = sama penting, 9 = jauh lebih penting.
 * Elemen resiprokal diisi otomatis (a_ji = 1 / a_ij).
 *
 * @param {number} n jumlah kriteria
 * @param {Array<{i:number, j:number, value:number}>} comparisons
 */
export function buildPairwiseMatrix(n, comparisons) {
  const matrix = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => (r === c ? 1 : 0))
  );

  for (const { i, j, value } of comparisons) {
    if (i === j) continue;
    matrix[i][j] = value;
    matrix[j][i] = 1 / value;
  }

  // Sel yang belum terisi dianggap sama penting.
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c] === 0) matrix[r][c] = 1;
    }
  }

  return matrix;
}

/**
 * Menurunkan vektor prioritas (bobot) dari matriks perbandingan berpasangan
 * dengan metode rata-rata geometris baris, lalu menghitung rasio konsistensi.
 *
 * Rata-rata geometris dipakai alih-alih eigenvector karena hasilnya sangat
 * dekat, dapat dihitung tanpa iterasi, dan direkomendasikan Saaty sendiri
 * sebagai pendekatan praktis.
 */
export function ahpWeights(matrix) {
  const n = matrix.length;

  // w_i = (prod_j a_ij)^(1/n), lalu dinormalisasi agar berjumlah 1.
  const geometricMeans = matrix.map((row) =>
    Math.pow(row.reduce((product, value) => product * value, 1), 1 / n)
  );

  const sumGeo = geometricMeans.reduce((a, b) => a + b, 0);
  const weights = geometricMeans.map((g) => g / sumGeo);

  // lambda_max = sum_j ( (sum_i a_ij) * w_j )
  let lambdaMax = 0;
  for (let j = 0; j < n; j++) {
    let columnSum = 0;
    for (let i = 0; i < n; i++) columnSum += matrix[i][j];
    lambdaMax += columnSum * weights[j];
  }

  const consistencyIndex = n > 1 ? (lambdaMax - n) / (n - 1) : 0;
  const randomIndex = RANDOM_INDEX[n] ?? 1.49;
  const consistencyRatio = randomIndex > 0 ? consistencyIndex / randomIndex : 0;

  return {
    weights: weights.map((w) => Number(w.toFixed(4))),
    lambdaMax: Number(lambdaMax.toFixed(4)),
    consistencyIndex: Number(consistencyIndex.toFixed(4)),
    randomIndex,
    consistencyRatio: Number(consistencyRatio.toFixed(4)),
    // Saaty: CR <= 0.1 berarti penilaian cukup konsisten untuk dipakai.
    isConsistent: consistencyRatio <= 0.1
  };
}

// ---------------------------------------------------------------------------
// TOPSIS — Technique for Order Preference by Similarity to Ideal Solution
// ---------------------------------------------------------------------------

/**
 * Memeringkat alternatif dengan TOPSIS sesuai prosedur aslinya.
 *
 * Langkah:
 *   1. Matriks keputusan X (m alternatif x n kriteria)
 *   2. Normalisasi vektor: r_ij = x_ij / sqrt( sum_i x_ij^2 )
 *   3. Matriks terbobot: v_ij = w_j * r_ij
 *   4. Solusi ideal positif A+ dan negatif A- per kriteria
 *   5. Jarak Euclidean D+ dan D- tiap alternatif ke A+ dan A-
 *   6. Kedekatan relatif: C_i = D- / (D+ + D-),  0 <= C_i <= 1
 *
 * @returns alternatif terurut menurun berdasarkan C_i, plus langkah antara.
 */
export function topsis(alternatives, criteria, weights) {
  if (!alternatives || alternatives.length === 0) {
    return { ranked: [], steps: null };
  }

  const m = alternatives.length;
  const n = criteria.length;

  // Langkah 1 — matriks keputusan.
  const decisionMatrix = alternatives.map((alt) =>
    criteria.map((c) => {
      const value = c.accessor(alt);
      return Number.isFinite(value) ? value : 0;
    })
  );

  // Langkah 2 — normalisasi vektor (akar jumlah kuadrat per kolom).
  const columnNorms = Array.from({ length: n }, (_, j) => {
    const sumSquares = decisionMatrix.reduce((sum, row) => sum + row[j] ** 2, 0);
    return Math.sqrt(sumSquares);
  });

  const normalized = decisionMatrix.map((row) =>
    row.map((value, j) => (columnNorms[j] === 0 ? 0 : value / columnNorms[j]))
  );

  // Langkah 3 — pembobotan.
  const weighted = normalized.map((row) => row.map((value, j) => value * weights[j]));

  // Langkah 4 — solusi ideal positif dan negatif.
  const idealBest = Array.from({ length: n }, (_, j) => {
    const column = weighted.map((row) => row[j]);
    return criteria[j].type === "benefit" ? Math.max(...column) : Math.min(...column);
  });

  const idealWorst = Array.from({ length: n }, (_, j) => {
    const column = weighted.map((row) => row[j]);
    return criteria[j].type === "benefit" ? Math.min(...column) : Math.max(...column);
  });

  // Langkah 5 & 6 — jarak ke kedua solusi ideal, lalu kedekatan relatif.
  const scored = alternatives.map((alt, i) => {
    let sumBest = 0;
    let sumWorst = 0;

    for (let j = 0; j < n; j++) {
      sumBest += (weighted[i][j] - idealBest[j]) ** 2;
      sumWorst += (weighted[i][j] - idealWorst[j]) ** 2;
    }

    const distanceToBest = Math.sqrt(sumBest);
    const distanceToWorst = Math.sqrt(sumWorst);
    const denominator = distanceToBest + distanceToWorst;

    // Semua alternatif identik pada tiap kriteria: tidak ada yang menonjol.
    const closeness = denominator === 0 ? 0.5 : distanceToWorst / denominator;

    return {
      ...alt,
      topsis: {
        distanceToBest: Number(distanceToBest.toFixed(5)),
        distanceToWorst: Number(distanceToWorst.toFixed(5)),
        closeness: Number(closeness.toFixed(4)),
        weightedRow: weighted[i].map((v) => Number(v.toFixed(5)))
      }
    };
  });

  const ranked = [...scored]
    .sort((a, b) => b.topsis.closeness - a.topsis.closeness)
    .map((alt, index) => ({ ...alt, rank: index + 1 }));

  return {
    ranked,
    steps: {
      criteria: criteria.map((c) => ({ id: c.id, label: c.label, type: c.type })),
      weights,
      decisionMatrix,
      columnNorms: columnNorms.map((v) => Number(v.toFixed(5))),
      normalized: normalized.map((r) => r.map((v) => Number(v.toFixed(5)))),
      weighted: weighted.map((r) => r.map((v) => Number(v.toFixed(5)))),
      idealBest: idealBest.map((v) => Number(v.toFixed(5))),
      idealWorst: idealWorst.map((v) => Number(v.toFixed(5)))
    }
  };
}

// ---------------------------------------------------------------------------
// Pemilihan pemasok per komponen
// ---------------------------------------------------------------------------

/**
 * Memilih satu pemasok untuk tiap komponen.
 *
 * Strategi:
 *   'nearest'  — jarak jalan terpendek (kriteria tunggal)
 *   'cheapest' — biaya total terendah (kriteria tunggal)
 *   'topsis'   — pemeringkatan multi-kriteria dengan bobot AHP
 *
 * Dua strategi pertama sengaja dipertahankan sebagai pembanding: laporan
 * yang menunjukkan bahwa TOPSIS memilih berbeda dari "termurah saja" jauh
 * lebih meyakinkan daripada TOPSIS yang berdiri sendiri.
 */
export function selectSuppliers({ components, strategy = "topsis", weights }) {
  const results = [];

  let totalMaterial = 0;
  let totalFreight = 0;
  let totalDistance = 0;
  let evaluatedCount = 0;

  for (const entry of components) {
    const candidates = entry.candidates || [];

    if (candidates.length === 0) {
      results.push({ component: entry.component, selected: null, candidates: [], note: entry.note, topsisSteps: null });
      continue;
    }

    let selected;
    let ranked = candidates;
    let steps = null;

    if (strategy === "nearest") {
      ranked = [...candidates].sort((a, b) => a.distanceKm - b.distanceKm)
        .map((c, i) => ({ ...c, rank: i + 1 }));
      selected = ranked[0];
    } else if (strategy === "cheapest") {
      ranked = [...candidates].sort((a, b) => a.totalCost - b.totalCost)
        .map((c, i) => ({ ...c, rank: i + 1 }));
      selected = ranked[0];
    } else {
      const out = topsis(candidates, CRITERIA, weights);
      ranked = out.ranked;
      steps = out.steps;
      selected = ranked[0];
    }

    totalMaterial += selected.materialCost;
    totalFreight += selected.freightCost;
    totalDistance += selected.distanceKm;
    evaluatedCount += 1;

    results.push({
      component: entry.component,
      selected,
      candidates: ranked,
      note: entry.note,
      topsisSteps: steps
    });
  }

  return {
    strategy,
    weights,
    results,
    summary: {
      totalMaterialCost: totalMaterial,
      totalFreightCost: totalFreight,
      grandTotalCost: totalMaterial + totalFreight,
      totalDistanceKm: Number(totalDistance.toFixed(1)),
      averageDistanceKm: evaluatedCount ? Number((totalDistance / evaluatedCount).toFixed(1)) : 0,
      supplierCount: evaluatedCount,
      componentCount: components.length,
      unresolvedCount: components.length - evaluatedCount
    }
  };
}
