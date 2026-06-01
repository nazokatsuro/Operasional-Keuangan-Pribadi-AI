import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini SDK with telemetry header according to guidelines
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Resilient helper to handle model overload or 503 errors dynamically
export function analyzeAndLogGeminiError(err: any, modelName: string) {
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

export async function generateWithModelFallback(params: {
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
