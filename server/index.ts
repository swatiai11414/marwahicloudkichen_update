import express, { type Request, Response, NextFunction, type Express } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { initializeDatabase } from "./init-db";
import { createServer } from "http";
import { pool } from "./db";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://api.ipify.org"],
    },
  } : false, // Disable CSP in development for Vite HMR
  crossOriginEmbedderPolicy: false,
}));

// Global rate limiter - 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: { message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.startsWith("/api"), // Only limit API routes
});

// Strict rate limiter for auth endpoints - 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: { message: "Too many login attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for order creation - 10 orders per hour per IP
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 orders per hour
  message: { message: "Too many orders, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for tracking - 60 requests per minute
const trackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 tracking requests per minute
  message: { message: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// Export rate limiters for use in routes
export { authLimiter, orderLimiter, trackingLimiter };

// CSRF protection middleware for API mutations
// Uses custom header check - works with SPA architecture
const csrfProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const method = req.method.toUpperCase();
  
  // Only check mutations (POST, PUT, PATCH, DELETE)
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return next();
  }
  
  // Skip CSRF for public API endpoints that are rate limited
  // Note: When using app.use("/api", ...), req.path doesn't include /api prefix
  const publicPaths = [
    "/track-visit", 
    "/auth/super-admin/login", 
    "/auth/shop-admin/login",
    "/auth/logout",
    "/shops/"  // Public shop endpoints
  ];
  if (publicPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  
  // Skip for order creation (public, rate limited)
  if (req.path.match(/\/shops\/[^/]+\/orders$/)) {
    return next();
  }
  
  // Skip for behavior tracking
  if (req.path.match(/\/shops\/[^/]+\/behavior$/)) {
    return next();
  }
  
  // Require custom header for authenticated API calls
  // This header cannot be set by cross-origin requests without CORS
  const csrfHeader = req.headers["x-requested-with"];
  if (csrfHeader !== "XMLHttpRequest") {
    return res.status(403).json({ message: "CSRF validation failed" });
  }
  
  next();
};

app.use("/api", csrfProtection);
const httpServer = createServer(app);
const PgSession = connectPg(session);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Session configuration

// Validate required environment variables in production
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && isProduction) {
  console.error("FATAL: SESSION_SECRET environment variable is required in production");
  process.exit(1);
}
if (!sessionSecret) {
  console.warn("WARNING: SESSION_SECRET not set. Using insecure default (OK for development only)");
}

app.set("trust proxy", 1); // Trust first proxy (required for secure cookies behind proxy)

// Add debug health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    // Test database connectivity
    await pool.query("SELECT 1");
    res.json({ 
      status: "ok",
      database: "connected",
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({ 
      status: "error",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.use(
  session({
    secret: sessionSecret || "hdos-dev-secret-key-not-for-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // HTTPS only in production
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax", // Required for cross-origin cookies
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    store: new PgSession({
      pool,
      tableName: 'sessions',
      createTableIfMissing: true
    }),
  })
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Export function to initialize the app (for Vercel serverless functions)
export async function createApp(): Promise<Express> {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  return app;
}

// Start server only if not in Vercel serverless environment
if (process.env.VERCEL !== "1") {
  (async () => {
    // Initialize database on startup
    await initializeDatabase();
    
    await createApp();

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // or command line argument --port, default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const portArg = process.argv.find(arg => arg.startsWith('--port='));
    const portFromArg = portArg ? parseInt(portArg.split('=')[1], 10) : null;
    const port = portFromArg || parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        log(`serving on port ${port}`);
      },
    );
  })();
}
