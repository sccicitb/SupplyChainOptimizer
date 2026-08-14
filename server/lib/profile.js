// Pengumpulan profil perusahaan dari mesin pencari dan situs resminya.
//
// Inilah bagian "scraping" yang sesungguhnya: kueri dikirim ke mesin pencari,
// hasilnya diurai, dan setiap potongan teks yang dipakai membawa URL asalnya
// sehingga bisa dibuka dan diperiksa.
//
// Urutan sumber: SerpAPI (bila ada key, kualitas terbaik) → DuckDuckGo HTML
// (gratis, tanpa key) → meta description situs resmi perusahaan.

import { fetchJson, fetchText, buildUrl } from "./http.js";
import { cached, TTL } from "./cache.js";

function stripTags(html = "") {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** DuckDuckGo membungkus URL hasil dalam redirect /l/?uddg=<encoded>. */
function unwrapDuckDuckGoUrl(href = "") {
  const match = href.match(/[?&]uddg=([^&]+)/);
  if (!match) return href.startsWith("//") ? `https:${href}` : href;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

async function searchDuckDuckGo(query) {
  const url = buildUrl("https://html.duckduckgo.com/html/", { q: query });

  const html = await fetchText(url, {
    timeoutMs: 25000,
    headers: {
      // Endpoint HTML DuckDuckGo membalas halaman kosong untuk User-Agent
      // yang tidak dikenalinya sebagai browser.
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    }
  });

  const titles = [...html.matchAll(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  const snippets = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)];

  return titles.slice(0, 8).map((m, i) => ({
    title: stripTags(m[2]),
    url: unwrapDuckDuckGoUrl(m[1]),
    snippet: snippets[i] ? stripTags(snippets[i][1]) : "",
    source: "duckduckgo"
  })).filter((r) => r.url && r.title);
}

async function searchSerpApi(query) {
  const url = buildUrl("https://serpapi.com/search.json", {
    q: query,
    engine: "google",
    hl: "id",
    gl: "id",
    num: 8,
    api_key: process.env.SERPAPI_KEY
  });

  const json = await fetchJson(url, { timeoutMs: 30000 });
  return (json.organic_results || []).slice(0, 8).map((r) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet || "",
    source: "google-serpapi"
  }));
}

/** Pencarian web dengan fallback berjenjang. */
export async function searchWeb(query) {
  const key = `search:${query.toLowerCase()}`;

  return cached(key, TTL.PROFILE, async () => {
    if (process.env.SERPAPI_KEY) {
      try {
        return await searchSerpApi(query);
      } catch (err) {
        console.warn(`[serpapi] gagal, beralih ke DuckDuckGo: ${err.message}`);
      }
    }
    try {
      return await searchDuckDuckGo(query);
    } catch (err) {
      console.warn(`[duckduckgo] gagal: ${err.message}`);
      return [];
    }
  });
}

/** Mengambil judul dan meta description dari situs resmi perusahaan. */
export async function fetchSiteSummary(websiteUrl) {
  if (!websiteUrl) return null;

  const normalized = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
  const key = `site:${normalized}`;

  return cached(key, TTL.PROFILE, async () => {
    try {
      const html = await fetchText(normalized, { timeoutMs: 20000, retries: 0 });

      const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
      const description = html.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
      )?.[1]
        || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
        || "";

      // Paragraf awal sering memuat deskripsi usaha ketika meta kosong.
      const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map((m) => stripTags(m[1]))
        .filter((t) => t.length > 60)
        .slice(0, 3);

      return { url: normalized, title, description: stripTags(description), paragraphs };
    } catch (err) {
      console.warn(`[site] tidak dapat dibaca ${normalized}: ${err.message}`);
      return null;
    }
  });
}

/**
 * Menyusun profil model bisnis sebuah perusahaan dari hasil pencarian dan
 * situs resminya. Selalu mengembalikan daftar `sources` berisi URL yang
 * benar-benar dibaca, agar klaim apa pun di antarmuka dapat ditelusuri.
 */
export async function buildCompanyProfile(companyName, { website = null } = {}) {
  const queries = [
    `${companyName} produk`,
    `${companyName} profil perusahaan`
  ];

  const results = [];
  for (const q of queries) {
    const hits = await searchWeb(q);
    results.push(...hits);
  }

  // Dedupe berdasar URL, pertahankan urutan relevansi.
  const seen = new Set();
  const unique = results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  const officialSite = website
    || unique.find((r) => /\.co\.id|\.com|\.id/.test(r.url) && !/wikipedia|linkedin|facebook|scribd|youtube|instagram/i.test(r.url))?.url
    || null;

  const site = await fetchSiteSummary(officialSite);

  const snippetText = unique.slice(0, 6).map((r) => `${r.title}. ${r.snippet}`).join(" ");
  const siteText = site ? [site.title, site.description, ...(site.paragraphs || [])].join(" ") : "";

  const combined = `${siteText} ${snippetText}`.trim();

  return {
    companyName,
    website: officialSite,
    // Teks mentah gabungan — dipakai sebagai masukan penurunan BOM.
    rawText: combined.slice(0, 4000),
    // Ringkasan pendek untuk ditampilkan.
    summary: (site?.description || unique[0]?.snippet || "").slice(0, 400) || null,
    sources: unique.slice(0, 6).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet.slice(0, 220),
      engine: r.source
    })),
    siteRead: site ? { url: site.url, title: site.title } : null,
    searchEngine: process.env.SERPAPI_KEY ? "Google via SerpAPI" : "DuckDuckGo HTML"
  };
}
