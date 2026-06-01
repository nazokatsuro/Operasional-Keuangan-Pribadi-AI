import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini SDK with telemetry header according to guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Resilient helper to handle model overload or 503 errors dynamically
function analyzeAndLogGeminiError(err: any, modelName: string) {
  const errMsg = String(err?.message || "").toLowerCase();
  const errStatus = err?.status || err?.statusCode || err?.code;
  const errStatusStr = String(errStatus || "").toLowerCase();
  
  console.error("==================================================");
  console.error("[GEMINI-ERROR] Terjadi error pada API Gemini:");
  console.error(`- Model yang digunakan: ${modelName}`);
  console.error(`- Status Code / Error Code: ${errStatus || "N/A"}`);
  console.error(`- Error message asli: ${err.message || err}`);

  // Test for network error / connection error
  const isNetwork = 
    errMsg.includes("fetch failed") || 
    errMsg.includes("net::err") || 
    errMsg.includes("enotfound") || 
    errMsg.includes("econnrefused") || 
    errMsg.includes("network") || 
    errMsg.includes("timeout") ||
    errMsg.includes("socket");

  if (isNetwork) {
    console.error(`- Jenis Error: [Error Koneksi Jaringan] Gagal menghubungi endpoint API Gemini.`);
    console.error("==================================================");
    return {
      status: 502,
      error: "GEMINI_NETWORK_ERROR",
      message: "Terjadi kesalahan koneksi jaringan saat menghubungi API Gemini."
    };
  }

  // API Key Invalid
  const isKeyInvalid = 
    errMsg.includes("api_key_invalid") || 
    errMsg.includes("api key not valid") || 
    errMsg.includes("api key is not valid") || 
    errMsg.includes("invalid api key") || 
    errMsg.includes("api key expired") || 
    errMsg.includes("invalid_argument") && errMsg.includes("api") ||
    errStatus === 400 && errMsg.includes("api key") ||
    errStatus === "INVALID_ARGUMENT" && errMsg.includes("api key") ||
    errMsg.includes("key is not valid");

  if (isKeyInvalid) {
    console.error(`- Jenis Error: [API Key Tidak Valid]`);
    console.error("==================================================");
    return {
      status: 401,
      error: "GEMINI_API_KEY_INVALID",
      message: "API Key Gemini tidak valid atau belum dikonfigurasi."
    };
  }

  // Quota Exceeded
  const isQuotaExceeded = 
    errMsg.includes("resource_exhausted") || 
    errMsg.includes("quota") || 
    errMsg.includes("rate limit") || 
    errMsg.includes("rate_limit") || 
    errMsg.includes("exhausted") || 
    errStatus === 429 || 
    errStatusStr.includes("resource_exhausted");

  if (isQuotaExceeded) {
    console.error(`- Jenis Error: [Kuota Habis]`);
    console.error("==================================================");
    return {
      status: 429,
      error: "GEMINI_QUOTA_EXHAUSTED",
      message: "Kuota Gemini habis/melebihi batas (Rate Limit)."
    };
  }

  // Model Not Found
  const isModelNotFound = 
    errMsg.includes("not found") || 
    errMsg.includes("model not found") || 
    errMsg.includes("model is not found") || 
    errStatus === 404 || 
    errStatusStr.includes("not_found");

  if (isModelNotFound) {
    console.error(`- Jenis Error: [Model Tidak Ditemukan]`);
    console.error("==================================================");
    return {
      status: 404,
      error: "GEMINI_MODEL_NOT_FOUND",
      message: `Model '${modelName}' gagal digunakan karena tidak ditemukan.`
    };
  }

  console.error("==================================================");
  return {
    status: 500,
    error: "AI_BUSY",
    message: "AI sedang sibuk, silakan coba lagi beberapa saat."
  };
}

async function generateWithModelFallback(params: {
  contents: string;
  config: any;
}) {
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;
  let lastModelTried = "";

  for (const model of modelsToTry) {
    lastModelTried = model;
    let attemptsLeft = 2; // Up to 2 attempts per model for transient errors
    let attemptDelay = 600; // Start with 600ms delay

    while (attemptsLeft > 0) {
      try {
        console.log(`[GEMINI-REQUEST] Mengirim API request menggunakan model: ${model} (Sisa Percobaan: ${attemptsLeft})...`);
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return { response, modelUsed: model };
      } catch (err: any) {
        lastError = err;
        
        const errMsg = String(err?.message || "").toLowerCase();
        const errStatus = err?.status || err?.statusCode || err?.code;
        
        const isTemporary = 
          errStatus === "UNAVAILABLE" || 
          errStatus === 503 || 
          errMsg.includes("experiencing high demand") || 
          errMsg.includes("503") || 
          errMsg.includes("unavailable") || 
          errMsg.includes("busy") ||
          errMsg.includes("overload");

        // For invalid keys, quota exceeded, or models not found, don't waste time trying fallback models or retrying!
        const isFatal = 
          errMsg.includes("api key") || 
          errMsg.includes("invalid key") || 
          errMsg.includes("key is not valid") ||
          errMsg.includes("quota") || 
          errMsg.includes("exhausted") || 
          errStatus === 429 || 
          errStatus === 400 || 
          errStatus === 401;

        if (isTemporary && !isFatal && attemptsLeft > 1) {
          console.warn(`[GEMINI-RETRY] Model ${model} sibuk/overload (503/UNAVAILABLE). Menunggu ${attemptDelay}ms sebelum mencoba kembali...`);
          await new Promise((resolve) => setTimeout(resolve, attemptDelay));
          attemptDelay *= 2; // Exponential backoff
          attemptsLeft--;
          continue;
        }

        console.error(`[GEMINI-ERROR-TEMP] Gagal menggunakan model ${model}:`, err.message || err);
        
        if (isTemporary && !isFatal) {
          console.warn(`[GEMINI-FALLBACK] Model ${model} tetap sibuk/overload setelah dicoba. Mencoba model cadangan berikutnya...`);
          break; // Break the retry loop, move to next model in the modelsToTry list
        }
        
        throw { originalError: err, modelTried: model };
      }
    }
  }
  throw { originalError: lastError, modelTried: lastModelTried };
}

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
  console.log(`[GEMINI-INIT] [ai-parse-bulk] Apakah GEMINI_API_KEY ditemukan: ${keyExists ? "YA (Ada)" : "TIDAK (Kosong)"}`);

  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ success: false, error: "Teks input kosong atau tidak valid" });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("[GEMINI-ERROR] [ai-parse-bulk] GEMINI_API_KEY belum dikonfigurasi.");
      return res.status(400).json({
        success: false,
        error: "GEMINI_API_KEY_MISSING",
        message: "GEMINI_API_KEY belum dikonfigurasi di lingkungan server."
      });
    }

    const systemInstruction = `Anda adalah AI pencatat keuangan perorangan dan retail. Urutkan atau pecah kalimat/paragraf teks kas pembukuan bebas pengguna (bisa terdiri atas beberapa baris/kejadian transaksi) dan ekstrak SETIAP transaksi yang ada ke dalam daftar JSON terstruktur. Untuk setiap transaksi, tentukan tipe transaksi (pemasukan atau pengeluaran), nominal, kategori, wallet, deskripsi, dan teks kalimat asli baris tersebut sebagai rawText. Jika kategori tidak diketahui gunakan "Lainnya". Output merupakan JSON valid tanpa markdown, tanpa penjelasan tambahan, tanpa karakter lain di luar JSON.

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
          contents: `Teks/catatan pembukuan pengguna:\n"${text}"`,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                transactions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      tipe: {
                        type: Type.STRING,
                        description: "pemasukan atau pengeluaran"
                      },
                      nominal: {
                        type: Type.NUMBER,
                        description: "angka nominal transaksi"
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
                        description: "Deskripsi singkat dari kegiatan transaksi tersebut"
                      },
                      rawText: {
                        type: Type.STRING,
                        description: "kalimat baris asli transaksi ini"
                      }
                    },
                    required: ["tipe", "nominal", "kategori", "wallet", "deskripsi", "rawText"]
                  }
                }
              },
              required: ["transactions"]
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
        
        // Validation check to make sure transactions is a valid array
        if (parsedData && Array.isArray(parsedData.transactions)) {
          success = true;
        } else {
          throw new Error("Struktur JSON bulk tidak sesuai");
        }
      } catch (parseErr: any) {
        attempts--;
        console.warn(`[GEMINI-JSON-RECOVERY] Sisa percobaan pemulihan otomatis JSON bulk: ${attempts}. Error:`, parseErr.message || parseErr);
        if (attempts === 0) {
          throw parseErr;
        }
      }
    }

    return res.status(200).json({ success: true, data: parsedData });

  } catch (error: any) {
    const originalError = error.originalError || error;

    if (originalError instanceof SyntaxError) {
      console.error("[GEMINI-ERROR] [ai-parse-bulk] Gagal mengurai JSON bulk dari respon Gemini:", originalError.message);
      return res.status(500).json({
        success: false,
        error: "GEMINI_JSON_PARSE_ERROR",
        message: "Gagal memparsing struktur JSON finansial massal dari respon AI. Silakan sesuaian teks Anda."
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
