// Klien untuk server proxy.

const BASE = "/api";

async function asJson(response) {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Respons server tidak valid (${response.status}): ${text.slice(0, 160)}`);
  }
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

export async function getHealth() {
  return asJson(await fetch(`${BASE}/health`));
}

/** Mencari perusahaan berdasarkan nama; mengembalikan daftar kandidat lokasi. */
export async function searchCompanies(query) {
  const url = `${BASE}/company/search?q=${encodeURIComponent(query)}`;
  return asJson(await fetch(url));
}

/**
 * Menjalankan analisis rantai pasok sambil menerima laporan kemajuan.
 * Server mengirim Server-Sent Events; karena permintaannya POST, aliran
 * dibaca langsung dari body respons alih-alih memakai EventSource.
 *
 * @param {object} company
 * @param {(progress: {stage:string, message:string, level?:string}) => void} onProgress
 */
export async function analyzeSupplyChain(company, onProgress) {
  const response = await fetch(`${BASE}/analyze/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company })
  });

  if (!response.ok || !response.body) {
    return asJson(response);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let result = null;
  let failure = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Setiap event SSE dipisahkan baris kosong ganda.
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";

    for (const chunk of chunks) {
      const eventName = chunk.match(/^event:\s*(.+)$/m)?.[1]?.trim();
      const dataLine = chunk.match(/^data:\s*([\s\S]+)$/m)?.[1];
      if (!dataLine) continue;

      let payload;
      try {
        payload = JSON.parse(dataLine);
      } catch {
        continue;
      }

      if (eventName === "progress") onProgress?.(payload);
      else if (eventName === "result") result = payload;
      else if (eventName === "error") failure = payload.message;
    }
  }

  if (failure) throw new Error(failure);
  if (!result) throw new Error("Server menutup koneksi sebelum mengirim hasil.");
  return result;
}
