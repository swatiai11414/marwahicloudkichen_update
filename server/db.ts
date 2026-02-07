import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env file manually if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  try {
    const envPath = resolve(process.cwd(), ".env");
    const envContent = readFileSync(envPath, "utf-8");
    const lines = envContent.split("\n");
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      
      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) continue;
      
      const key = trimmed.substring(0, equalsIndex).trim();
      const value = trimmed.substring(equalsIndex + 1).trim();
      
      if (key && value) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    // Silently continue - env file is optional
  }
}

// Set default environment variables if not set
if (!process.env.SUPER_ADMIN_PASSWORD) {
  process.env.SUPER_ADMIN_PASSWORD = "Codex@2003";
  console.warn("WARNING: SUPER_ADMIN_PASSWORD not set. Using default 'Codex@2003' (OK for development only)");
}

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "dev-secret-change-in-production-0d30d9ade1002580c7b3d528963206b9";
  console.warn("WARNING: SESSION_SECRET not set. Using insecure default (OK for development only)");
}

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set!");
  console.error("Please create a .env file with DATABASE_URL or set it as an environment variable.");
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: databaseUrl,
  // Add connection timeout settings for production
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});
export const db = drizzle(pool, { schema });
