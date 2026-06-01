import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Import modular API handlers
import healthHandler from "./api/health";
import aiParseHandler from "./api/ai-parse";
import aiParseBulkHandler from "./api/ai-parse-bulk";
import pricesHandler from "./api/prices";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Log all incoming API requests to the console for easy debugging
app.use("/api", (req, res, next) => {
  console.log(`[API-ROUTE-INCOMING] ${req.method} ${req.originalUrl}`);
  next();
});

// Mount modular API handlers
app.get("/api/health", healthHandler);
app.post("/api/ai-parse", aiParseHandler);
app.post("/api/ai-parse-bulk", aiParseBulkHandler);
app.post("/api/prices", pricesHandler);

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
