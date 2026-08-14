import { ahpWeights, topsis, CRITERIA } from "../src/utils/mcdm.js";

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${detail ? "  " + detail : ""}`);
  ok ? pass++ : fail++;
};

console.log("\n=== UJI 1: AHP harus memulihkan bobot dari matriks yang konsisten sempurna ===");
// Jika a_ij = w_i/w_j, metode harus mengembalikan w persis dan lambda_max = n.
const w = [0.5, 0.25, 0.15, 0.10];
const perfect = w.map(wi => w.map(wj => wi / wj));
const r1 = ahpWeights(perfect);
check("bobot dipulihkan", r1.weights.every((v, i) => Math.abs(v - w[i]) < 1e-4), `-> [${r1.weights}]`);
check("lambda_max = n = 4", Math.abs(r1.lambdaMax - 4) < 1e-4, `-> ${r1.lambdaMax}`);
check("CR = 0 (konsisten sempurna)", Math.abs(r1.consistencyRatio) < 1e-6, `-> ${r1.consistencyRatio}`);

console.log("\n=== UJI 2: AHP harus mendeteksi ketidakkonsistenan ===");
// A>B kuat, B>C kuat, tetapi C>A kuat -> melingkar, harus CR > 0.1
const circular = [[1,9,1/9],[1/9,1,9],[9,1/9,1]];
const r2 = ahpWeights(circular);
check("CR > 0.1 terdeteksi", r2.consistencyRatio > 0.1, `-> CR=${r2.consistencyRatio}`);
check("isConsistent = false", r2.isConsistent === false);

console.log("\n=== UJI 3: TOPSIS - alternatif dominan harus Ci=1, terburuk Ci=0 ===");
// Alternatif A terbaik pada SEMUA kriteria, C terburuk pada semua.
const alts = [
  { id:"A", distanceKm:10,  totalCost:1000, leadTimeDays:1, relevance:0.9 },
  { id:"B", distanceKm:50,  totalCost:3000, leadTimeDays:2, relevance:0.7 },
  { id:"C", distanceKm:100, totalCost:5000, leadTimeDays:3, relevance:0.5 },
];
const weights = [0.25,0.25,0.25,0.25];
const t = topsis(alts, CRITERIA, weights);
check("A peringkat 1", t.ranked[0].id === "A", `-> ${t.ranked.map(a=>a.id+":"+a.topsis.closeness).join(" ")}`);
check("Ci(A) = 1.0", Math.abs(t.ranked[0].topsis.closeness - 1) < 1e-4);
check("Ci(C) = 0.0", Math.abs(t.ranked[2].topsis.closeness) < 1e-4);
check("semua Ci dalam [0,1]", t.ranked.every(a => a.topsis.closeness >= 0 && a.topsis.closeness <= 1));

console.log("\n=== UJI 4: TOPSIS - verifikasi normalisasi vektor ===");
// Kolom ternormalisasi harus punya norma Euclidean = 1.
const norms = CRITERIA.map((_, j) =>
  Math.sqrt(t.steps.normalized.reduce((s, row) => s + row[j] ** 2, 0)));
check("tiap kolom ternormalisasi bernorma 1", norms.every(n => Math.abs(n - 1) < 1e-3), `-> [${norms.map(n=>n.toFixed(4))}]`);

console.log("\n=== UJI 5: arah kriteria cost vs benefit ===");
// distance=cost -> A+ ambil MIN; confidence=benefit -> A+ ambil MAX.
const colDist = t.steps.weighted.map(r => r[0]);
const colConf = t.steps.weighted.map(r => r[3]);
check("A+ jarak = minimum (cost)", Math.abs(t.steps.idealBest[0] - Math.min(...colDist)) < 1e-6);
check("A+ keyakinan = maksimum (benefit)", Math.abs(t.steps.idealBest[3] - Math.max(...colConf)) < 1e-6);

console.log("\n=== UJI 6: bobot berpengaruh pada peringkat ===");
// Jika jarak berbobot ~100%, alternatif terdekat harus menang meski mahal.
const alts2 = [
  { id:"DEKAT_MAHAL", distanceKm:5,   totalCost:9000, leadTimeDays:3, relevance:0.6 },
  { id:"JAUH_MURAH",  distanceKm:600, totalCost:1000, leadTimeDays:1, relevance:0.9 },
];
const byDist = topsis(alts2, CRITERIA, [0.97,0.01,0.01,0.01]);
const byCost = topsis(alts2, CRITERIA, [0.01,0.97,0.01,0.01]);
check("bobot jarak -> pilih DEKAT_MAHAL", byDist.ranked[0].id === "DEKAT_MAHAL");
check("bobot biaya -> pilih JAUH_MURAH", byCost.ranked[0].id === "JAUH_MURAH");

console.log(`\n${fail === 0 ? "SEMUA LULUS" : "ADA YANG GAGAL"}: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail === 0 ? 0 : 1);
