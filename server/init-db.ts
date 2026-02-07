import { db, pool } from "./db";
import * as schema from "@shared/schema";

export async function initializeDatabase() {
  try {
    // Test connection
    await pool.query("SELECT 1");
    console.log("✓ Database connection successful");

    // Check if tables already exist
    const tablesResult = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tables = tablesResult.rows.map((row: any) => row.table_name);
    
    if (tables.length > 0) {
      console.log(`✓ Database tables already exist (${tables.length} tables)`);
    } else {
      console.log("No tables found, running migrations...");
      
      // Try to run migrations if they exist (only in development)
      if (process.env.NODE_ENV !== "production") {
        try {
          const { migrate } = await import("drizzle-orm/node-postgres/migrator");
          const { readdir, readFile } = await import("fs/promises");
          const { join, resolve } = await import("path");

          const migrationsDir = resolve(process.cwd(), "migrations");
          
          try {
            const files = await readdir(migrationsDir);
            if (files.length > 0) {
              console.log("Running database migrations...");
              await migrate(db, { migrationsFolder: migrationsDir });
              console.log("✓ Database migrations completed");
            }
          } catch (error: any) {
            if (error.code !== "ENOENT") {
              console.error("Migration error:", error);
            }
          }
        } catch (error) {
          // drizzle migrator might not be available, that's okay
          console.log("Note: drizzle migrations not available, using schema sync");
        }
      }
      
      // Log tables after migration
      const newTablesResult = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const newTables = newTablesResult.rows.map((row: any) => row.table_name);
      if (newTables.length > 0) {
        console.log("✓ Database tables:", newTables.join(", "));
      }
    }

    // Add missing columns to shops table (temporary fix)
    try {
      await pool.query(`
        ALTER TABLE shops 
        ADD COLUMN IF NOT EXISTS super_admin_whatsapp varchar(20),
        ADD COLUMN IF NOT EXISTS allowed_pin_codes text DEFAULT '495118'
      `);
      console.log("✓ Database schema updated with new columns");
    } catch (error: any) {
      // Ignore if columns already exist
      if (!error.message.includes("already exists")) {
        console.log("Note: Schema update may have failed, continuing...");
      }
    }

    return true;
  } catch (error) {
    console.error("Database initialization failed:", error);
    return false;
  }
}
