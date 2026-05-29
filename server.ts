import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
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

// API route for health checking
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Real-time pricing endpoint using Gemini search grounding
app.post("/api/prices", async (req, res) => {
  try {
    const { assets } = req.body;
    if (!Array.isArray(assets) || assets.length === 0) {
      return res.json({ success: true, prices: {} });
    }

    const now = Date.now();
    const ONE_HOUR = 3600000; // 1 hour in miliseconds

    // Check if cache is still valid
    const cacheAge = now - priceCache.timestamp;
    const allKeyInCache = assets.every(asset => {
      const code = asset.code.toUpperCase();
      return priceCache.data[code] !== undefined;
    });

    if (cacheAge < ONE_HOUR && allKeyInCache && Object.keys(priceCache.data).length > 0) {
      const responseData: Record<string, number> = {};
      assets.forEach(asset => {
        const code = asset.code.toUpperCase();
        responseData[code] = priceCache.data[code];
      });
      return res.json({ 
        success: true, 
        source: "cache", 
        prices: responseData, 
        lastUpdated: new Date(priceCache.timestamp).toLocaleTimeString() 
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined in environment variables. Falling back to default mock market data.");
      const mockPrices: Record<string, number> = {
        "GOLD": 1455000,
        "BTC": 1412000000,
        "ETH": 52400000,
        "SOL": 2350000
      };
      assets.forEach(asset => {
        const code = asset.code.toUpperCase();
        if (!mockPrices[code]) {
          mockPrices[code] = 120000; 
        }
      });
      return res.json({ 
        success: true, 
        source: "mock", 
        prices: mockPrices, 
        lastUpdated: new Date().toLocaleTimeString() 
      });
    }

    // Build lists of names & codes for Gemini to query
    const assetDescriptions = assets.map(asset => `${asset.name} (${asset.code})`).join(", ");
    
    const prompt = `You are a financial data retrieval AI. Find the current real-time market price or index value in Indonesian Rupiah (IDR) for the following assets: ${assetDescriptions}.
    Ensure you search the latest web pricing (Indonesian exchanges, gold price indices, crypto prices).
    
    Respond STRICTLY in a JSON object format. No conversational text, no markdown other than raw JSON encoding.
    The keys of the JSON object must match the EXACT uppercase codes provided: ${assets.map(a => a.code.toUpperCase()).join(", ")}.
    The values must be numbers (e.g., 1410000 instead of "1.410.000" or "Rp 1,4jt"). If you cannot find the price, use a reasonable estimate or fallback to its last common value.
    
    Example output format:
    {
      "GOLD": 1450000,
      "BTC": 1410000000,
      "ETH": 52000000
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const responseText = response.text || "";
    const cleanedText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    try {
      const parsedPrices = JSON.parse(cleanedText);
      
      // Update cache
      priceCache.timestamp = now;
      priceCache.data = {
        ...priceCache.data,
        ...parsedPrices
      };

      const responseData: Record<string, number> = {};
      assets.forEach(asset => {
        const code = asset.code.toUpperCase();
        responseData[code] = priceCache.data[code] || asset.marketPrice;
      });

      return res.json({ 
        success: true, 
        source: "gemini", 
        prices: responseData, 
        lastUpdated: new Date(now).toLocaleTimeString() 
      });
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON response:", cleanedText, parseError);
      
      // Failover to mock prices if any or existing asset info
      const failoverData: Record<string, number> = {};
      assets.forEach(asset => {
        const code = asset.code.toUpperCase();
        failoverData[code] = priceCache.data[code] || asset.marketPrice;
      });
      return res.json({ 
        success: true, 
        source: "failover", 
        prices: failoverData, 
        lastUpdated: new Date().toLocaleTimeString() 
      });
    }
  } catch (apiError) {
    console.error("Error calling Gemini API for prices:", apiError);
    return res.status(500).json({ success: false, error: String(apiError) });
  }
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

startViteServer();
