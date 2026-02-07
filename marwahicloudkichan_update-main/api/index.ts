import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../server/index";

// Cache the app to avoid re-initializing on every request
let cachedApp: any = null;

async function getApp() {
  if (!cachedApp) {
    cachedApp = await createApp();
  }
  return cachedApp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error("Error in serverless function:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

