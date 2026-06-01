export default function handler(req: any, res: any) {
  console.log(`[API-HEALTH] Request received: ${req.method} ${req.url || ""}`);
  return res.status(200).json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
}
