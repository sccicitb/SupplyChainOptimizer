// Outbound HTTP untuk semua sumber data eksternal.
//
// Nominatim membatasi 1 request/detik dan mewajibkan User-Agent berisi alamat
// kontak yang valid; Overpass juga meminta kesopanan serupa. Karena itu tidak
// ada satu pun modul yang memanggil fetch() langsung — semuanya lewat sini,
// supaya batasan itu ditegakkan di satu tempat.

const CONTACT = process.env.CONTACT_EMAIL || "";

export function userAgent() {
  const contact = CONTACT || "no-contact-configured";
  return `SupplyChainMapper/1.0 (AI supply chain research; contact: ${contact})`;
}

// Jeda minimum antar request untuk tiap host.
const HOST_INTERVALS = [
  [/nominatim/i, 1100],
  [/overpass/i, 1500],
  [/osrm/i, 350],
  [/duckduckgo/i, 900],
  [/serpapi/i, 250]
];

function intervalFor(host) {
  for (const [pattern, ms] of HOST_INTERVALS) {
    if (pattern.test(host)) return ms;
  }
  return 250;
}

const lastCallAt = new Map();
const hostChains = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function doFetch(url, { timeoutMs = 30000, retries = 1, headers = {}, ...rest } = {}) {
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...rest,
        headers: {
          "User-Agent": userAgent(),
          "Accept-Language": "id,en;q=0.8",
          ...headers
        },
        signal: AbortSignal.timeout(timeoutMs)
      });

      // 429/5xx layak dicoba ulang; 4xx lain berarti request kita yang salah.
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await sleep(1500 * (attempt + 1));
          continue;
        }
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
    }
  }

  throw lastErr || new Error(`Gagal mengambil ${url}`);
}

/**
 * fetch() yang menghormati rate limit per host. Request ke host yang sama
 * diantrikan berurutan; host berbeda tetap berjalan paralel.
 */
export function politeFetch(url, options = {}) {
  const host = new URL(url).host;
  const minGap = intervalFor(host);

  const previous = hostChains.get(host) || Promise.resolve();

  const current = previous.then(async () => {
    const elapsed = Date.now() - (lastCallAt.get(host) || 0);
    if (elapsed < minGap) await sleep(minGap - elapsed);
    lastCallAt.set(host, Date.now());
    return doFetch(url, options);
  });

  // Rantai antrian tidak boleh putus gara-gara satu request gagal.
  hostChains.set(host, current.then(() => {}, () => {}));
  return current;
}

export async function fetchJson(url, options = {}) {
  const res = await politeFetch(url, options);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} dari ${new URL(url).host}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function fetchText(url, options = {}) {
  const res = await politeFetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} dari ${new URL(url).host}`);
  return res.text();
}

export function buildUrl(base, params) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}
