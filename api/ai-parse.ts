import { Type } from "@google/genai";
import { generateWithModelFallback, analyzeAndLogGeminiError } from "./_gemini";

export default async function handler(req: any, res: any) {
  // Check if method is POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Endpoint ini hanya mendukung metode POST."
    });
  }

  const keyExists = !!process.env.GEMINI_API_KEY;
  console.log(`[GEMINI-INIT] [ai-parse] Apakah GEMINI_API_KEY ditemukan: ${keyExists ? "YA (Ada)" : "TIDAK (Kosong)"}`);

  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ success: false, error: "Teks input kosong atau tidak valid" });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("[GEMINI-ERROR] [ai-parse] GEMINI_API_KEY belum dikonfigurasi.");
      return res.status(400).json({
        success: false,
        error: "GEMINI_API_KEY_MISSING",
        message: "GEMINI_API_KEY belum dikonfigurasi di lingkungan server."
      });
    }

    const systemInstruction = `Anda adalah AI pencatat keuangan pribadi dan bisnis. Analisa kalimat pengguna dan ubah menjadi JSON valid. Tentukan tipe transaksi (pemasukan atau pengeluaran), nominal, kategori, wallet, dan deskripsi. Jika kategori tidak diketahui gunakan "Lainnya". Output harus berupa JSON valid tanpa markdown, tanpa penjelasan tambahan, tanpa karakter lain di luar JSON.

Kategori Yang Tersedia:
- Makan
- Transport
- Belanja
- Internet
- Listrik
- Investasi
- Top Up
- Gaji
- Penjualan
- Kesehatan
- Hiburan
- Produksi
- Operasional
- Lainnya

Wallet Yang Tersedia:
- Cash
- BCA
- Mandiri
- BRI
- BNI
- Dana
- OVO
- GoPay
- SeaBank`;

    let responseText = "";
    let attempts = 2;
    let success = false;
    let parsedData = null;
    let fallbackResult: any = null;

    while (attempts > 0 && !success) {
      try {
        fallbackResult = await generateWithModelFallback({
          contents: `Teks pengguna: "${text}"`,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                tipe: {
                  type: Type.STRING,
                  description: "Tipe transaksi, harus 'pemasukan' atau 'pengeluaran'"
                },
                nominal: {
                  type: Type.NUMBER,
                  description: "Angka nominal transaksi tanpa rupiah"
                },
                kategori: {
                  type: Type.STRING,
                  description: "Makan, Transport, Belanja, Internet, Listrik, Investasi, Top Up, Gaji, Penjualan, Kesehatan, Hiburan, Produksi, Operasional, Lainnya"
                },
                wallet: {
                  type: Type.STRING,
                  description: "Cash, BCA, Mandiri, BRI, BNI, Dana, OVO, GoPay, SeaBank"
                },
                deskripsi: {
                  type: Type.STRING,
                  description: "Deskripsi singkat dari kegiatan transaksi tersebut, misal 'Makan bakso'"
                }
              },
              required: ["tipe", "nominal", "kategori", "wallet", "deskripsi"]
            }
          }
        });

        responseText = fallbackResult.response.text || "";
        if (!responseText.trim()) {
          throw new Error("Respon kosong");
        }

        try {
          parsedData = JSON.parse(responseText);
        } catch (jsonErr: any) {
          console.error(`[GEMINI-ERROR] Error parsing JSON: ${jsonErr.message}`);
          throw jsonErr;
        }
        
        // Validation check to make sure proper keys exist
        if (parsedData && parsedData.tipe && typeof parsedData.nominal === 'number') {
          success = true;
        } else {
          throw new Error("Struktur JSON tidak sesuai");
        }
      } catch (parseErr: any) {
        attempts--;
        console.warn(`[GEMINI-JSON-RECOVERY] Sisa percobaan pemulihan otomatis JSON: ${attempts}. Error:`, parseErr.message || parseErr);
        if (attempts === 0) {
          throw parseErr;
        }
      }
    }

    return res.status(200).json({ success: true, data: parsedData });

  } catch (error: any) {
    const originalError = error.originalError || error;

    if (originalError instanceof SyntaxError) {
      console.error("[GEMINI-ERROR] [ai-parse] Gagal mengurai JSON dari respon Gemini:", originalError.message);
      return res.status(500).json({
        success: false,
        error: "GEMINI_JSON_PARSE_ERROR",
        message: "Gagal memparsing struktur JSON finansial dari respon AI. Silakan coba sesuaikan kalimat Anda."
      });
    }

    const modelTried = error.modelTried || "gemini-3.5-flash";

    const errorDetails = analyzeAndLogGeminiError(originalError, modelTried);
    return res.status(errorDetails.status).json({
      success: false,
      error: errorDetails.error,
      message: errorDetails.message
    });
  }
}
