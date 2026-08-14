// Penurunan Bill of Materials dengan Claude, opsional.
//
// Jalur bawaan sistem adalah aturan taksonomi di bomTaxonomy.js — deterministik
// dan tidak butuh API key. Modul ini dipakai hanya bila ANTHROPIC_API_KEY diisi:
// Claude membaca teks profil hasil scraping lalu memilih komponen dari pustaka
// yang sama, sehingga hasilnya tetap terikat pada komponen yang punya kata
// kunci pencarian pemasok dan dasar harga.

import { COMPONENT_LIBRARY, COMPONENT_IDS, expandComponent } from "./bomTaxonomy.js";

const MODEL = "claude-opus-5";

const BOM_SCHEMA = {
  type: "object",
  properties: {
    industry: {
      type: "string",
      description: "Kategori industri perusahaan, dalam Bahasa Indonesia"
    },
    productUnit: {
      type: "string",
      description: "Satuan produk jadi yang menjadi acuan BOM, mis. 'unit hospital bed'"
    },
    businessModel: {
      type: "string",
      description: "Satu kalimat model bisnis perusahaan berdasarkan teks yang diberikan"
    },
    components: {
      type: "array",
      description: "3 sampai 6 komponen utama penyusun produk",
      items: {
        type: "object",
        properties: {
          component: {
            type: "string",
            enum: COMPONENT_IDS,
            description: "ID komponen dari pustaka yang tersedia"
          },
          qty: {
            type: "number",
            description: "Perkiraan kebutuhan per satu unit produk jadi"
          },
          spec: {
            type: "string",
            description: "Spesifikasi teknis singkat komponen ini pada produk tersebut"
          }
        },
        required: ["component", "qty", "spec"],
        additionalProperties: false
      }
    }
  },
  required: ["industry", "productUnit", "businessModel", "components"],
  additionalProperties: false
};

function componentCatalogue() {
  return COMPONENT_IDS
    .map((id) => `- ${id}: ${COMPONENT_LIBRARY[id].name} (satuan ${COMPONENT_LIBRARY[id].unit})`)
    .join("\n");
}

export function isAiAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Menurunkan BOM dari teks profil hasil scraping.
 * Mengembalikan null bila API key tidak ada atau panggilan gagal — pemanggil
 * lalu memakai aturan taksonomi.
 */
export async function deriveBomWithAi(companyName, profileText) {
  if (!isAiAvailable()) return null;
  if (!profileText || profileText.length < 40) return null;

  let Anthropic;
  try {
    ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
  } catch {
    console.warn("[bom-ai] @anthropic-ai/sdk belum terpasang; memakai aturan taksonomi");
    return null;
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: BOM_SCHEMA }
      },
      system:
        "Anda menganalisis rantai pasok manufaktur Indonesia. Dari teks profil perusahaan "
        + "hasil scraping web, tentukan model bisnisnya dan susun Bill of Materials komponen "
        + "utamanya.\n\nPilih komponen HANYA dari katalog berikut:\n"
        + componentCatalogue()
        + "\n\nDasarkan kesimpulan pada teks yang diberikan. Bila teks tidak cukup untuk "
        + "memastikan produk perusahaan, pilih komponen manufaktur umum dan katakan "
        + "ketidakpastian itu pada field businessModel. Jangan mengarang nama produk yang "
        + "tidak disebut dalam teks.",
      messages: [
        {
          role: "user",
          content:
            `Perusahaan: ${companyName}\n\n`
            + `Teks hasil scraping (mesin pencari + situs resmi):\n"""\n${profileText}\n"""`
        }
      ]
    });

    if (response.stop_reason === "refusal") {
      console.warn("[bom-ai] permintaan ditolak; memakai aturan taksonomi");
      return null;
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) return null;

    const parsed = JSON.parse(textBlock.text);

    const components = parsed.components
      .map((entry) => expandComponent(entry))
      .filter(Boolean);

    if (components.length === 0) return null;

    return {
      industry: parsed.industry,
      productUnit: parsed.productUnit,
      businessModel: parsed.businessModel,
      generic: false,
      method: `AI (${MODEL})`,
      components
    };
  } catch (err) {
    console.warn(`[bom-ai] gagal, memakai aturan taksonomi: ${err.message}`);
    return null;
  }
}
