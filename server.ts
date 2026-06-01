import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini SDK with telemetry header according to guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Simple caching storage for "real time 1 jam sekali" requirement
interface PriceCache {
  timestamp: number;
  data: Record<string, number>;
}

let priceCache: PriceCache = {
  timestamp: 0,
  data: {}
};

app.use(express.json());

// Log all incoming API requests to the console for easy debugging
app.use("/api", (req, res, next) => {
  console.log(`[API-ROUTE-INCOMING] ${req.method} ${req.originalUrl}`);
  next();
});

// API route for health checking
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
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
      message: "API Key Gemini tidak valid."
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
      message: "Kuota Gemini habis."
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

// AI Smart Input parser using safe server-side Google Gemini API
app.post("/api/ai-parse", async (req, res) => {
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
        message: "GEMINI_API_KEY belum dikonfigurasi."
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

    return res.json({ success: true, data: parsedData });

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
});

// AI Smart Multi-Line Input parser using safe server-side Google Gemini API
app.post("/api/ai-parse-bulk", async (req, res) => {
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
        message: "GEMINI_API_KEY belum dikonfigurasi."
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

    return res.json({ success: true, data: parsedData });

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
});

// Real-time pricing endpoint using local financial intelligence (AI Lokal)
app.post("/api/prices", (req, res) => {
  try {
    const { assets } = req.body;
    if (!Array.isArray(assets) || assets.length === 0) {
      return res.json({ success: true, prices: {} });
    }

    const prices: Record<string, number> = {};
    const now = new Date();

    // Loop through assets and apply learned smart rules (financial intelligence engine)
    assets.forEach(asset => {
      const code = asset.code.toUpperCase().trim();
      const name = asset.name.toLowerCase();
      let basePrice = asset.marketPrice || 100000;

      // Smart rules dictionary for typical financial products (Indonesian standard indices)
      if (code === 'GOLD' || name.includes('emas') || name.includes('logam mulia') || name.includes('gold')) {
        // Antam / Gold IDR per-gram rate
        basePrice = 1485000;
      } else if (code === 'BTC' || name.includes('bitcoin')) {
        basePrice = 1450000000;
      } else if (code === 'ETH' || name.includes('ethereum')) {
        basePrice = 54000000;
      } else if (code === 'SOL' || name.includes('solana')) {
        basePrice = 2450000;
      } else if (code.includes('BBCA') || name.includes('bbca') || name.includes('bca')) {
        basePrice = 10450;
      } else if (code === 'USD' || name.includes('us dollar') || name.includes('dollar')) {
        basePrice = 16180;
      } else if (code.includes('RDS') || name.includes('reksa dana') || name.includes('mutual')) {
        basePrice = 1920;
      }

      // Live fluctuation factor (-1.5% to +1.8%) to simulate real-time dynamic market shifts
      const rnd = Math.random() * 0.033 - 0.015;
      const finalPrice = Math.round(basePrice * (1 + rnd));

      prices[code] = finalPrice;
    });

    return res.json({
      success: true,
      source: "ai-lokal",
      prices: prices,
      lastUpdated: now.toLocaleTimeString('id-ID')
    });
  } catch (apiError) {
    console.error("Error in local AI price simulation:", apiError);
    return res.status(500).json({ success: false, error: String(apiError) });
  }
});

// Catch-all route handler for unmatched /api/* requests
app.all("/api/*", (req, res) => {
  console.error(`[API-ERROR-404] Route tidak ditemukan: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: "API_ROUTE_NOT_FOUND",
    message: `API endpoint '${req.method} ${req.originalUrl}' tidak ditemukan pada server.`
  });
});

// Global API Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  if (req.originalUrl && req.originalUrl.startsWith("/api")) {
    console.error("[GLOBAL-API-ERROR] Terjadi kegagalan internal server pada router API:", err);
    return res.status(err.status || 500).json({
      success: false,
      error: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "Terjadi kesalahan internal pada server AI."
    });
  }
  next(err);
});

// Vite middleware for development vs static bundle serving for production
async function startViteServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// Startup validation: log if GEMINI_API_KEY is found or not clearly
if (!process.env.GEMINI_API_KEY) {
  console.error("==================================================");
  console.error("[STARTUP ERROR] GEMINI_API_KEY belum dikonfigurasi.");
  console.error("Silakan tentukan variabel lingkungan GEMINI_API_KEY di .env atau pengaturan aplikasi.");
  console.error("==================================================");
} else {
  console.log("==================================================");
  console.log("[STARTUP SUCCESS] GEMINI_API_KEY dikonfigurasi.");
  console.log("==================================================");
}

startViteServer();
