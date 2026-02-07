import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In Vercel/serverless, __dirname points to the compiled location
  // Try multiple possible paths
  let distPath: string | null = null;
  
  const possiblePaths = [
    path.resolve(__dirname, "../dist/public"),
    path.resolve(__dirname, "public"),
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(process.cwd(), "dist", "public"),
  ];
  
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      distPath = testPath;
      break;
    }
  }
  
  if (!distPath) {
    // Try to use process.cwd() as fallback
    distPath = path.resolve(process.cwd(), "dist/public");
    console.warn(`Using fallback dist path: ${distPath}`);
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    res.sendFile(indexPath);
  });
}
