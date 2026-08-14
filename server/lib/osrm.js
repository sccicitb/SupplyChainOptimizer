// OSRM — jarak dan waktu tempuh melalui jaringan jalan sungguhan.
//
// Haversine mengukur garis lurus di atas permukaan bumi; truk tidak bisa
// menempuhnya. Untuk rute Kalasan → Semarang, Haversine memberi ~90 km
// sementara jalan sebenarnya 119,6 km — selisih 33% yang langsung
// mendistorsi perhitungan ongkos angkut. Karena itu jarak jalan dipakai
// sebagai nilai utama, dan Haversine hanya jadi cadangan bila OSRM gagal.

import { fetchJson } from "./http.js";
import { cached, TTL } from "./cache.js";

const BASE = "https://router.project-osrm.org/route/v1/driving";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Jarak jalan antara dua titik. Selalu mengembalikan hasil: bila OSRM tidak
 * bisa dihubungi, nilainya berasal dari Haversine dan ditandai demikian
 * lewat field `method`.
 */
export async function roadDistance(fromLat, fromLng, toLat, toLng) {
  const straightKm = haversineKm(fromLat, fromLng, toLat, toLng);
  const coords = `${fromLng.toFixed(5)},${fromLat.toFixed(5)};${toLng.toFixed(5)},${toLat.toFixed(5)}`;
  const key = `osrm:${coords}`;

  try {
    const data = await cached(key, TTL.ROUTE, async () => {
      const url = `${BASE}/${coords}?overview=false`;
      const json = await fetchJson(url, { timeoutMs: 25000 });
      if (json.code !== "Ok" || !json.routes?.length) throw new Error(`OSRM: ${json.code}`);
      return {
        distanceKm: json.routes[0].distance / 1000,
        durationMin: json.routes[0].duration / 60
      };
    });

    return {
      distanceKm: Number(data.distanceKm.toFixed(1)),
      durationMin: Math.round(data.durationMin),
      straightLineKm: Number(straightKm.toFixed(1)),
      method: "osrm-road",
      source: "OSRM (OpenStreetMap road network)"
    };
  } catch (err) {
    console.warn(`[osrm] fallback ke haversine: ${err.message}`);
    // Faktor 1,3 adalah rasio jalan-terhadap-garis-lurus yang lazim untuk
    // jaringan jalan Jawa; ditandai eksplisit agar tidak disalahartikan
    // sebagai hasil pengukuran.
    return {
      distanceKm: Number((straightKm * 1.3).toFixed(1)),
      durationMin: Math.round((straightKm * 1.3) / 45 * 60),
      straightLineKm: Number(straightKm.toFixed(1)),
      method: "haversine-estimasi",
      source: "Estimasi Haversine x1.3 (OSRM tidak tersedia)"
    };
  }
}
