// Cache dua lapis (memori + disk) untuk hasil sumber eksternal.
//
// Tujuannya bukan kecepatan semata: Nominatim dan Overpass adalah layanan
// gratis dengan kebijakan penggunaan wajar. Mengulang query yang sama saat
// pengembangan tanpa cache adalah cara tercepat untuk diblokir.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(here, "..", ".cache");

const memory = new Map();

function diskEnabled() {
  return !process.env.DISABLE_DISK_CACHE;
}

function keyToFile(key) {
  const hash = crypto.createHash("sha1").update(key).digest("hex");
  return path.join(CACHE_DIR, `${hash}.json`);
}

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export function cacheGet(key, ttlMs) {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;

  if (!diskEnabled()) return null;

  try {
    const file = keyToFile(key);
    if (!fs.existsSync(file)) return null;
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Date.now() - raw.at >= ttlMs) return null;
    memory.set(key, raw);
    return raw.value;
  } catch {
    return null;
  }
}

export function cacheSet(key, value) {
  const entry = { at: Date.now(), value };
  memory.set(key, entry);

  if (!diskEnabled()) return;
  try {
    ensureDir();
    fs.writeFileSync(keyToFile(key), JSON.stringify(entry), "utf8");
  } catch {
    // Cache disk bersifat best-effort; kegagalan menulis tidak boleh
    // menggagalkan request yang sedang berjalan.
  }
}

/** Bungkus sebuah fungsi async dengan cache. */
export async function cached(key, ttlMs, producer) {
  const hit = cacheGet(key, ttlMs);
  if (hit !== null) return hit;
  const value = await producer();
  cacheSet(key, value);
  return value;
}

export const TTL = {
  GEOCODE: 30 * 24 * 60 * 60 * 1000, // 30 hari — lokasi pabrik jarang pindah
  SUPPLIERS: 7 * 24 * 60 * 60 * 1000, // 7 hari
  ROUTE: 30 * 24 * 60 * 60 * 1000, // 30 hari — jaringan jalan stabil
  PROFILE: 24 * 60 * 60 * 1000 // 1 hari — profil web lebih sering berubah
};
