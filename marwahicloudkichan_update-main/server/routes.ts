import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { storage } from "./storage";
import { authLimiter, orderLimiter, trackingLimiter } from "./index";
import { db } from "./db";
import { sql, eq } from "drizzle-orm";
import { shops, type ManualOverride } from "@shared/schema";

// Configure multer for image uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
});

// Super Admin password from environment variable
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const isProduction = process.env.NODE_ENV === "production";

if (!SUPER_ADMIN_PASSWORD && isProduction) {
  console.error("FATAL: SUPER_ADMIN_PASSWORD environment variable is required in production");
  process.exit(1);
}
if (!SUPER_ADMIN_PASSWORD) {
  console.warn("WARNING: SUPER_ADMIN_PASSWORD not set. Using default 'Codex@2003' (OK for development only)");
}

const ADMIN_PASSWORD = SUPER_ADMIN_PASSWORD || "Codex@2003";

// Extend session type
declare module "express-session" {
  interface SessionData {
    auth?: {
      role: "super_admin" | "shop_admin";
      shopId?: string;
    };
  }
}

// Middleware to check if user is authenticated via session
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.auth) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

// Middleware to check if user is shop admin with access to shop
function shopAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.session?.auth;
  
  if (!auth) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (auth.role === "super_admin") {
    return next();
  }
  
  if (auth.role !== "shop_admin" || !auth.shopId) {
    return res.status(403).json({ message: "Access denied" });
  }
  
  (req as any).shopId = auth.shopId;
  next();
}

// Middleware to check if user is super admin
function superAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  const auth = req.session?.auth;
  
  if (!auth || auth.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin access required" });
  }
  
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============================================
  // AUTH ROUTES - Password-based authentication
  // ============================================
  
  // Super Admin Login (rate limited to prevent brute force)
  app.post("/api/auth/super-admin/login", authLimiter, (req, res) => {
    const { password } = req.body;
    
    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Password required" });
    }
    
    // Use timing-safe comparison to prevent timing attacks
    const inputBuffer = Buffer.from(password);
    const adminBuffer = Buffer.from(ADMIN_PASSWORD);
    
    if (inputBuffer.length === adminBuffer.length && 
        crypto.timingSafeEqual(inputBuffer, adminBuffer)) {
      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ message: "Session error" });
        }
        req.session.auth = { role: "super_admin" };
        return res.json({ success: true, role: "super_admin" });
      });
    } else {
      return res.status(401).json({ message: "Invalid password" });
    }
  });

  // Shop Admin Login (rate limited to prevent brute force)
  app.post("/api/auth/shop-admin/login", authLimiter, async (req, res) => {
    const { shopId, password } = req.body;
    
    if (!shopId || !password) {
      return res.status(400).json({ message: "Shop and password required" });
    }
    
    if (typeof password !== "string" || typeof shopId !== "string") {
      return res.status(400).json({ message: "Invalid input" });
    }
    
    try {
      const shop = await storage.getShopById(shopId);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }
      
      // Use timing-safe comparison for password
      const inputBuffer = Buffer.from(password);
      const storedBuffer = Buffer.from(shop.adminPassword || "");
      
      if (inputBuffer.length !== storedBuffer.length || 
          !crypto.timingSafeEqual(inputBuffer, storedBuffer)) {
        return res.status(401).json({ message: "Invalid password" });
      }
      
      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ message: "Session error" });
        }
        req.session.auth = { role: "shop_admin", shopId: shop.id };
        return res.json({ success: true, role: "shop_admin", shopId: shop.id, shopName: shop.shopName });
      });
    } catch {
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Check auth status
  app.get("/api/auth/status", (req, res) => {
    if (req.session?.auth) {
      return res.json({ authenticated: true, ...req.session.auth });
    }
    return res.json({ authenticated: false });
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Serve uploaded files
  app.use("/uploads", (await import("express")).default.static(uploadDir));

  // Image upload endpoint
  app.post("/api/upload", isAuthenticated, upload.single("image"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ url: imageUrl, filename: req.file.filename });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Get list of shops for login dropdown and homepage (public)
  app.get("/api/shops/list", async (req, res) => {
    try {
      // Temporarily use raw SQL to avoid column issues
      const result = await db.execute(sql`
        SELECT id, slug, shop_name as "shopName", logo, address
        FROM shops 
        WHERE is_active = true 
        ORDER BY created_at DESC
      `);
      const publicShops = result.rows.map(row => ({
        id: row.id,
        slug: row.slug,
        shopName: row.shopName,
        logo: row.logo,
        address: row.address
      }));
      res.json(publicShops);
    } catch (error) {
      console.error("Error fetching shops list:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // PUBLIC ROUTES - Shop page by slug
  // ============================================
  
  app.get("/api/shops/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const shop = await storage.getShopBySlug(slug);
      
      if (!shop || !shop.isActive) {
        return res.status(404).json({ message: "Shop not found" });
      }

      const theme = shop.themeId ? await storage.getThemeById(shop.themeId) : null;
      const sections = await storage.getSectionsByShopId(shop.id);
      const categories = await storage.getCategoriesByShopId(shop.id);
      const menuItems = await storage.getItemsByShopId(shop.id);
      const offers = await storage.getActiveOffersByShopId(shop.id);

      res.json({
        shop,
        theme,
        sections: sections.filter(s => s.isVisible),
        categories: categories.filter(c => c.isVisible),
        menuItems: menuItems.filter(i => i.isAvailable),
        offers,
      });
    } catch (error) {
      console.error("Error fetching shop:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public order creation (rate limited to prevent spam)
  app.post("/api/shops/:slug/orders", orderLimiter, async (req, res) => {
    try {
      const { slug } = req.params;
      const shop = await storage.getShopBySlug(slug);
      
      if (!shop || !shop.isActive) {
        return res.status(404).json({ message: "Shop not found" });
      }

      // Check store availability before accepting order
      const storeStatus = await storage.getStoreStatus(shop.id);
      if (!storeStatus.isOpen) {
        return res.status(403).json({ 
          message: "Store is currently closed", 
          status: storeStatus.status,
          messageText: storeStatus.message
        });
      }

      const { items, customer, tableQr, notes, deliveryAddress } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Items required" });
      }

      // Handle customer (upsert)
      let customerId: string | undefined;
      if (customer?.name && customer?.phone) {
        let existingCustomer = await storage.getCustomerByPhone(shop.id, customer.phone);
        if (existingCustomer) {
          existingCustomer = await storage.updateCustomer(existingCustomer.id, {
            lastVisit: new Date(),
            totalVisits: existingCustomer.totalVisits + 1,
          });
          customerId = existingCustomer?.id;
        } else {
          const newCustomer = await storage.createCustomer({
            shopId: shop.id,
            name: customer.name,
            phone: customer.phone,
            hasConsent: customer.hasConsent || false,
          });
          customerId = newCustomer.id;
        }
      }

      // Calculate total and create order
      let subtotal = 0;
      const orderItemsData: Array<{ itemId: string; itemName: string; price: string; quantity: number }> = [];
      
      for (const item of items) {
        const menuItem = await storage.getItemById(item.itemId);
        if (!menuItem || menuItem.shopId !== shop.id) {
          return res.status(400).json({ message: `Invalid item: ${item.itemId}` });
        }
        const quantity = item.quantity || 1;
        subtotal += Number(menuItem.price) * quantity;
        orderItemsData.push({
          itemId: menuItem.id,
          itemName: menuItem.name,
          price: menuItem.price,
          quantity,
        });
      }

      const deliveryCharge = Number(shop.deliveryCharge || 0);
      const totalAmount = subtotal + deliveryCharge;

      const order = await storage.createOrder({
        shopId: shop.id,
        subtotal: subtotal.toFixed(2),
        discountAmount: "0",
        deliveryCharge: deliveryCharge.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        status: "pending_payment",
        ...(customerId && { customerId }),
        ...(tableQr && { tableQr }),
        ...(deliveryAddress && { deliveryAddress }),
        ...(notes && { notes }),
      });

      // Create order items
      for (const item of orderItemsData) {
        await storage.createOrderItem({
          orderId: order.id,
          itemId: item.itemId,
          itemName: item.itemName,
          price: item.price,
          quantity: item.quantity,
        });
      }

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get customer orders by phone (public - for "My Orders" page)
  app.get("/api/shops/:slug/my-orders", async (req, res) => {
    try {
      const { slug } = req.params;
      const { phone } = req.query;

      if (!phone || typeof phone !== "string") {
        return res.status(400).json({ message: "Phone number required" });
      }

      const shop = await storage.getShopBySlug(slug);
      if (!shop || !shop.isActive) {
        return res.status(404).json({ message: "Shop not found" });
      }

      const customerOrders = await storage.getOrdersByCustomerPhone(shop.id, phone);
      
      // Get order items for each order
      // Bill download is only allowed after payment is confirmed (not pending_payment or cancelled)
      const ordersWithItems = await Promise.all(
        customerOrders.map(async (order) => {
          const items = await storage.getOrderItemsByOrderId(order.id);
          const canDownloadBill = order.status !== "pending_payment" && order.status !== "cancelled";
          return { 
            ...order, 
            items,
            canDownloadBill 
          };
        })
      );

      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // CUSTOMER SESSION ROUTES (Public)
  // ============================================

  // Initialize customer session with device info
  app.post("/api/shops/:slug/session", async (req, res) => {
    try {
      const { slug } = req.params;
      const shop = await storage.getShopBySlug(slug);
      
      if (!shop || !shop.isActive) {
        return res.status(404).json({ message: "Shop not found" });
      }

      const { 
        deviceFingerprint, deviceType, os, browser, userAgent,
        screenWidth, screenHeight, language 
      } = req.body;

      // Generate session token
      const crypto = await import("crypto");
      const sessionToken = crypto.randomBytes(32).toString("hex");

      // Get IP from request
      const ipAddress = req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.ip || "";

      const session = await storage.createSession({
        shopId: shop.id,
        sessionToken,
        deviceFingerprint,
        deviceType,
        os,
        browser,
        userAgent,
        screenWidth,
        screenHeight,
        language,
        ipAddress,
      });

      res.status(201).json({ session, sessionToken });
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Customer login (name + phone, links to session)
  app.post("/api/shops/:slug/customer-login", async (req, res) => {
    try {
      const { slug } = req.params;
      const shop = await storage.getShopBySlug(slug);
      
      if (!shop || !shop.isActive) {
        return res.status(404).json({ message: "Shop not found" });
      }

      const { name, phone, hasConsent, sessionToken, deviceInfo } = req.body;
      
      if (!name || !phone) {
        return res.status(400).json({ message: "Name and phone are required" });
      }

      // Find or create customer
      let customer = await storage.getCustomerByPhone(shop.id, phone);
      
      if (customer) {
        // Update existing customer
        customer = await storage.updateCustomer(customer.id, {
          name,
          lastVisit: new Date(),
          totalVisits: customer.totalVisits + 1,
          hasConsent: hasConsent || customer.hasConsent,
          ...(deviceInfo?.deviceType && { deviceType: deviceInfo.deviceType }),
          ...(deviceInfo?.os && { os: deviceInfo.os }),
          ...(deviceInfo?.browser && { browser: deviceInfo.browser }),
          ...(deviceInfo?.screenWidth && { screenWidth: deviceInfo.screenWidth }),
          ...(deviceInfo?.screenHeight && { screenHeight: deviceInfo.screenHeight }),
          ...(deviceInfo?.language && { language: deviceInfo.language }),
        });
      } else {
        // Create new customer
        customer = await storage.createCustomer({
          shopId: shop.id,
          name,
          phone,
          hasConsent: hasConsent || false,
          deviceType: deviceInfo?.deviceType,
          os: deviceInfo?.os,
          browser: deviceInfo?.browser,
          screenWidth: deviceInfo?.screenWidth,
          screenHeight: deviceInfo?.screenHeight,
          language: deviceInfo?.language,
        });
      }

      // Link session to customer if provided
      if (sessionToken) {
        const session = await storage.getSessionByToken(sessionToken);
        if (session && session.shopId === shop.id) {
          await storage.updateSession(session.id, { customerId: customer!.id });
        }
      }

      res.json({ customer });
    } catch (error) {
      console.error("Error customer login:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Log behavior event
  app.post("/api/shops/:slug/events", async (req, res) => {
    try {
      const { slug } = req.params;
      const shop = await storage.getShopBySlug(slug);
      
      if (!shop || !shop.isActive) {
        return res.status(404).json({ message: "Shop not found" });
      }

      const { eventType, itemId, page, timeSpent, metadata, sessionToken, customerId } = req.body;
      
      if (!eventType) {
        return res.status(400).json({ message: "Event type required" });
      }

      let sessionId: string | undefined;
      let resolvedCustomerId: string | undefined = customerId;

      if (sessionToken) {
        const session = await storage.getSessionByToken(sessionToken);
        if (session && session.shopId === shop.id) {
          sessionId = session.id;
          resolvedCustomerId = resolvedCustomerId || session.customerId || undefined;
          // Update session activity
          await storage.updateSession(session.id, {});
        }
      }

      const behavior = await storage.createBehavior({
        shopId: shop.id,
        customerId: resolvedCustomerId,
        sessionId,
        eventType,
        itemId,
        page,
        timeSpent,
        metadata,
      });

      res.status(201).json({ success: true, behavior });
    } catch (error) {
      console.error("Error logging event:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Alias for behavior tracking (same as events)
  app.post("/api/shops/:slug/behavior", async (req, res) => {
    try {
      const { slug } = req.params;
      const shop = await storage.getShopBySlug(slug);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      const { eventType, itemId, page, timeSpent, metadata, sessionToken, customerId } = req.body;
      if (!eventType) {
        return res.status(400).json({ message: "Event type required" });
      }

      let sessionId: string | undefined;
      let resolvedCustomerId: string | undefined = customerId;

      if (sessionToken) {
        const session = await storage.getSessionByToken(sessionToken);
        if (session && session.shopId === shop.id) {
          sessionId = session.id;
          resolvedCustomerId = resolvedCustomerId || session.customerId || undefined;
          await storage.updateSession(session.id, {});
        }
      }

      const behavior = await storage.createBehavior({
        shopId: shop.id,
        customerId: resolvedCustomerId,
        sessionId,
        eventType,
        itemId,
        page,
        timeSpent,
        metadata,
      });

      res.status(201).json({ success: true, behavior });
    } catch (error) {
      console.error("Error logging behavior:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Customer feedback endpoint
  app.post("/api/shops/:slug/feedback", async (req, res) => {
    try {
      const { slug } = req.params;
      const shop = await storage.getShopBySlug(slug);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      const { rating, feedback, name, orderId } = req.body;
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Valid rating (1-5) required" });
      }

      // Store feedback as a behavior event with metadata
      const feedbackEvent = await storage.createBehavior({
        shopId: shop.id,
        eventType: "feedback",
        metadata: {
          rating,
          feedback: feedback || "",
          name: name || "Anonymous",
          orderId: orderId || null,
          submittedAt: new Date().toISOString(),
        },
      });

      res.status(201).json({ success: true, feedback: feedbackEvent });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // PUBLIC STORE AVAILABILITY ROUTES
  // ============================================

  // Get store availability status (public)
  app.get("/api/shops/:slug/availability", async (req, res) => {
    try {
      const { slug } = req.params;
      const shop = await storage.getShopBySlug(slug);
      
      if (!shop || !shop.isActive) {
        return res.status(404).json({ message: "Shop not found" });
      }

      const status = await storage.getStoreStatus(shop.id);
      res.json(status);
    } catch (error) {
      console.error("Error fetching store availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // PROFILE ROUTE
  // ============================================

  app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      let profile = await storage.getProfileByUserId(user.claims.sub);
      
      if (!profile) {
        // Auto-create profile for first user as super_admin
        const allShops = await storage.getAllShops();
        const isSuperAdmin = allShops.length === 0;
        
        profile = await storage.createProfile({
          id: user.claims.sub,
          userId: user.claims.sub,
          role: isSuperAdmin ? "super_admin" : "shop_admin",
          shopId: undefined,
        });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // SHOP ADMIN ROUTES
  // ============================================

  // Dashboard
  app.get("/api/admin/dashboard", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      if (!shopId) {
        return res.status(400).json({ message: "No shop assigned" });
      }

      const shop = await storage.getShopById(shopId);
      const stats = await storage.getShopStats(shopId);
      const allOrders = await storage.getOrdersByShopId(shopId);
      const recentOrders = allOrders.slice(0, 5);

      res.json({
        ...stats,
        recentOrders,
        shop,
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Today Dashboard - Real-time analytics
  app.get("/api/admin/dashboard/today", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      if (!shopId) {
        return res.status(400).json({ message: "No shop assigned" });
      }

      const todayStats = await storage.getTodayDashboard(shopId);
      res.json(todayStats);
    } catch (error) {
      console.error("Error fetching today dashboard:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Menu management
  app.get("/api/admin/menu", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const categories = await storage.getCategoriesByShopId(shopId);
      const items = await storage.getItemsByShopId(shopId);
      res.json({ categories, items });
    } catch (error) {
      console.error("Error fetching menu:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/categories", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const category = await storage.createCategory({ ...req.body, shopId });
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/categories/:id", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const category = await storage.updateCategory(req.params.id, req.body);
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/categories/:id", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/items", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const item = await storage.createItem({ ...req.body, shopId });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating item:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/items/:id", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const item = await storage.updateItem(req.params.id, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/items/:id", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      await storage.deleteItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Orders
  app.get("/api/admin/orders", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const orders = await storage.getOrdersByShopId(shopId);
      
      // Fetch order items and customers for each order
      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          const items = await storage.getOrderItemsByOrderId(order.id);
          const customers = await storage.getCustomersByShopId(shopId);
          const customer = order.customerId 
            ? customers.find(c => c.id === order.customerId)
            : undefined;
          return { ...order, items, customer };
        })
      );
      
      res.json(ordersWithDetails);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/orders/:id", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const order = await storage.updateOrder(req.params.id, req.body);
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Payment Verification - Admin confirms payment received
  app.post("/api/admin/orders/:id/verify-payment", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId;
      const { paymentMode, paymentReference, deliveryCharge } = req.body;

      if (!paymentMode || !["cash", "upi"].includes(paymentMode)) {
        return res.status(400).json({ message: "Valid payment mode required (cash or upi)" });
      }

      // Validate delivery charge - must be a non-negative finite number
      let validatedDeliveryCharge = 0;
      if (deliveryCharge !== undefined && deliveryCharge !== null && deliveryCharge !== "") {
        const parsed = Number(deliveryCharge);
        if (isNaN(parsed) || !isFinite(parsed)) {
          return res.status(400).json({ message: "Delivery charge must be a valid number" });
        }
        if (parsed < 0) {
          return res.status(400).json({ message: "Delivery charge cannot be negative" });
        }
        validatedDeliveryCharge = Math.round(parsed * 100) / 100; // Round to 2 decimal places
      }

      const order = await storage.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.shopId !== shopId) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (order.status !== "pending_payment") {
        return res.status(400).json({ message: "Order is not pending payment" });
      }

      // Generate bill number (format: BILL-YYYYMMDD-XXXX)
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
      const billNumber = `BILL-${dateStr}-${randomSuffix}`;

      // Calculate new total with validated delivery charge
      const newTotalAmount = Number(order.subtotal) - Number(order.discountAmount || 0) + validatedDeliveryCharge;

      // Update order with payment verification
      const updatedOrder = await storage.updateOrder(order.id, {
        status: "paid",
        paymentMode,
        paymentReference: paymentReference || undefined,
        paymentVerifiedAt: now,
        paymentVerifiedBy: shopId,
        billNumber,
        deliveryCharge: validatedDeliveryCharge.toFixed(2),
        totalAmount: newTotalAmount.toFixed(2),
      });

      // Update customer stats if customer exists
      if (order.customerId) {
        const customer = await storage.getCustomerById(order.customerId);
        if (customer) {
          const newTotalOrders = customer.totalOrders + 1;
          const newTotalSpent = Number(customer.totalSpent) + newTotalAmount;
          const newAvgBill = newTotalSpent / newTotalOrders;

          await storage.updateCustomer(customer.id, {
            totalOrders: newTotalOrders,
            totalSpent: newTotalSpent.toFixed(2),
            avgBill: newAvgBill.toFixed(2),
            lastOrderAt: now,
          });
        }
      }

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get order with items for bill generation
  app.get("/api/admin/orders/:id/bill", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId;
      const order = await storage.getOrderById(req.params.id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.shopId !== shopId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const shop = await storage.getShopById(shopId);
      const items = await storage.getOrderItemsByOrderId(order.id);
      let customer = null;
      if (order.customerId) {
        customer = await storage.getCustomerById(order.customerId);
      }

      res.json({
        order,
        shop,
        items,
        customer,
      });
    } catch (error) {
      console.error("Error fetching bill:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Customers
  app.get("/api/admin/customers", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const customers = await storage.getCustomersByShopId(shopId);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Offers
  app.get("/api/admin/offers", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const offers = await storage.getOffersByShopId(shopId);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/offers", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const offer = await storage.createOffer({ ...req.body, shopId });
      res.status(201).json(offer);
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/offers/:id", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const offer = await storage.updateOffer(req.params.id, req.body);
      res.json(offer);
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/offers/:id", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      await storage.deleteOffer(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Sections
  app.get("/api/admin/sections", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const sections = await storage.getSectionsByShopId(shopId);
      res.json(sections);
    } catch (error) {
      console.error("Error fetching sections:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/admin/sections", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const section = await storage.createSection({ ...req.body, shopId });
      res.status(201).json(section);
    } catch (error) {
      console.error("Error creating section:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/sections/:id", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const section = await storage.updateSection(req.params.id, req.body);
      res.json(section);
    } catch (error) {
      console.error("Error updating section:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/admin/sections/:id", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      await storage.deleteSection(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting section:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Settings
  app.get("/api/admin/settings", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const shop = await storage.getShopById(shopId);
      const theme = shop?.themeId ? await storage.getThemeById(shop.themeId) : null;
      res.json({ shop, theme });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/shop", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      
      // First, try to add the missing columns
      try {
        await db.execute(sql`
          ALTER TABLE shops 
          ADD COLUMN IF NOT EXISTS super_admin_whatsapp varchar(20),
          ADD COLUMN IF NOT EXISTS allowed_pin_codes text DEFAULT '495118',
          ADD COLUMN IF NOT EXISTS delivery_charge_reason varchar(255),
          ADD COLUMN IF NOT EXISTS free_delivery_threshold decimal(10, 2)
        `);
      } catch (alterError) {
        // Ignore alter errors
      }
      
      // Update the shop
      const updateData = { ...req.body, updatedAt: new Date() };
      const [updated] = await db
        .update(shops)
        .set(updateData)
        .where(eq(shops.id, shopId))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating shop:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // DELIVERY CHARGE MANAGEMENT ROUTES
  // ============================================

  // Get delivery settings and reasons
  app.get("/api/admin/delivery-settings", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const shop = await storage.getShopById(shopId);
      const reasons = await storage.getDeliveryChargeReasons(shopId);
      res.json({
        deliveryCharge: shop?.deliveryCharge || "0",
        deliveryChargeReason: shop?.deliveryChargeReason || null,
        freeDeliveryThreshold: shop?.freeDeliveryThreshold || null,
        reasons,
      });
    } catch (error) {
      console.error("Error fetching delivery settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update delivery settings (charge and threshold)
  app.patch("/api/admin/delivery-settings", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const { deliveryCharge, deliveryChargeReason, freeDeliveryThreshold } = req.body;

      // Validate delivery charge
      let validatedDeliveryCharge = "0";
      if (deliveryCharge !== undefined && deliveryCharge !== null && deliveryCharge !== "") {
        const parsed = Number(deliveryCharge);
        if (isNaN(parsed) || !isFinite(parsed)) {
          return res.status(400).json({ message: "Delivery charge must be a valid number" });
        }
        if (parsed < 0) {
          return res.status(400).json({ message: "Delivery charge cannot be negative" });
        }
        validatedDeliveryCharge = (Math.round(parsed * 100) / 100).toFixed(2);
      }

      // Validate free delivery threshold
      let validatedThreshold: string | undefined;
      if (freeDeliveryThreshold !== undefined && freeDeliveryThreshold !== null && freeDeliveryThreshold !== "") {
        const parsed = Number(freeDeliveryThreshold);
        if (isNaN(parsed) || !isFinite(parsed)) {
          return res.status(400).json({ message: "Free delivery threshold must be a valid number" });
        }
        if (parsed < 0) {
          return res.status(400).json({ message: "Free delivery threshold cannot be negative" });
        }
        validatedThreshold = (Math.round(parsed * 100) / 100).toFixed(2);
      }

      const [updated] = await db
        .update(shops)
        .set({
          deliveryCharge: validatedDeliveryCharge,
          deliveryChargeReason: deliveryChargeReason || null,
          freeDeliveryThreshold: validatedThreshold || null,
          updatedAt: new Date(),
        })
        .where(eq(shops.id, shopId))
        .returning();

      res.json({
        deliveryCharge: updated.deliveryCharge,
        deliveryChargeReason: updated.deliveryChargeReason,
        freeDeliveryThreshold: updated.freeDeliveryThreshold,
      });
    } catch (error) {
      console.error("Error updating delivery settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get delivery charge reasons
  app.get("/api/admin/delivery-reasons", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const reasons = await storage.getDeliveryChargeReasons(shopId);
      res.json(reasons);
    } catch (error) {
      console.error("Error fetching delivery reasons:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create delivery charge reason
  app.post("/api/admin/delivery-reasons", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const { reason, isDefault } = req.body;

      if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
        return res.status(400).json({ message: "Reason is required" });
      }

      if (reason.length > 255) {
        return res.status(400).json({ message: "Reason must be 255 characters or less" });
      }

      // If this is set as default, unset other defaults
      if (isDefault) {
        await storage.setDefaultDeliveryChargeReason(shopId, "");
      }

      const newReason = await storage.createDeliveryChargeReason({
        shopId,
        reason: reason.trim(),
        isDefault: isDefault || false,
        isActive: true,
      });

      res.status(201).json(newReason);
    } catch (error) {
      console.error("Error creating delivery reason:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update delivery charge reason
  app.patch("/api/admin/delivery-reasons/:id", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const { id } = req.params;
      const { reason, isDefault, isActive } = req.body;

      // Get the reason to verify ownership
      const existingReasons = await storage.getDeliveryChargeReasons(shopId);
      const existingReason = existingReasons.find((r: any) => r.id === id);

      if (!existingReason) {
        return res.status(404).json({ message: "Reason not found" });
      }

      // If setting as default, unset other defaults first
      if (isDefault && !existingReason.isDefault) {
        await storage.setDefaultDeliveryChargeReason(shopId, id);
      }

      const updatedReason = await storage.updateDeliveryChargeReason(id, {
        reason: reason ? reason.trim() : undefined,
        isDefault: isDefault !== undefined ? isDefault : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      });

      res.json(updatedReason);
    } catch (error) {
      console.error("Error updating delivery reason:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete delivery charge reason
  app.delete("/api/admin/delivery-reasons/:id", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const { id } = req.params;

      // Get the reason to verify ownership
      const existingReasons = await storage.getDeliveryChargeReasons(shopId);
      const existingReason = existingReasons.find((r: any) => r.id === id);

      if (!existingReason) {
        return res.status(404).json({ message: "Reason not found" });
      }

      // Prevent deleting if it's the only reason
      if (existingReasons.length === 1) {
        return res.status(400).json({ message: "Cannot delete the only delivery reason" });
      }

      await storage.deleteDeliveryChargeReason(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting delivery reason:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Set default delivery charge reason
  app.post("/api/admin/delivery-reasons/:id/set-default", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const { id } = req.params;

      // Get the reason to verify ownership
      const existingReasons = await storage.getDeliveryChargeReasons(shopId);
      const existingReason = existingReasons.find((r: any) => r.id === id);

      if (!existingReason) {
        return res.status(404).json({ message: "Reason not found" });
      }

      await storage.setDefaultDeliveryChargeReason(shopId, id);
      res.json({ success: true, message: "Default reason updated" });
    } catch (error) {
      console.error("Error setting default reason:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Calculate delivery charge for cart
  app.post("/api/admin/delivery/calculate", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const { subtotal } = req.body;

      if (subtotal === undefined || subtotal === null) {
        return res.status(400).json({ message: "Subtotal is required" });
      }

      const subtotalNum = Number(subtotal);
      if (isNaN(subtotalNum) || !isFinite(subtotalNum)) {
        return res.status(400).json({ message: "Subtotal must be a valid number" });
      }

      const shop = await storage.getShopById(shopId);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }

      const deliveryCharge = Number(shop.deliveryCharge || 0);
      const freeDeliveryThreshold = shop.freeDeliveryThreshold ? Number(shop.freeDeliveryThreshold) : null;

      // Check if free delivery applies
      if (freeDeliveryThreshold !== null && subtotalNum >= freeDeliveryThreshold) {
        res.json({
          amount: 0,
          reason: "Free delivery on orders above ₹" + freeDeliveryThreshold.toFixed(2),
          isFree: true,
          threshold: freeDeliveryThreshold,
        });
      } else {
        // Get default reason
        const reasons = await storage.getDeliveryChargeReasons(shopId);
        const defaultReason = reasons.find((r: any) => r.isDefault) || reasons[0];
        
        res.json({
          amount: deliveryCharge,
          reason: defaultReason?.reason || shop.deliveryChargeReason || "Standard delivery charge",
          isFree: false,
          threshold: freeDeliveryThreshold,
        });
      }
    } catch (error) {
      console.error("Error calculating delivery charge:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Temporary endpoint to fix database schema
  app.post("/api/admin/fix-schema", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      await db.execute(sql`
        ALTER TABLE shops 
        ADD COLUMN IF NOT EXISTS super_admin_whatsapp varchar(20),
        ADD COLUMN IF NOT EXISTS allowed_pin_codes text DEFAULT '495118'
      `);
      res.json({ message: "Database schema updated successfully" });
    } catch (error) {
      console.error("Error updating schema:", error);
      res.status(500).json({ message: "Failed to update schema" });
    }
  });

  app.get("/api/super-admin/dashboard", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const stats = await storage.getSuperAdminStats();
      const allShops = await storage.getAllShops();
      res.json({
        ...stats,
        recentShops: allShops.slice(0, 5),
      });
    } catch (error) {
      console.error("Error fetching super admin dashboard:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Shops management
  app.get("/api/super-admin/shops", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const shops = await storage.getAllShops();
      const themes = await storage.getAllThemes();
      res.json({ shops, themes });
    } catch (error) {
      console.error("Error fetching shops:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/super-admin/shops", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { shopName, slug } = req.body;
      if (!shopName || !slug) {
        return res.status(400).json({ message: "shopName and slug are required" });
      }
      const shop = await storage.createShop(req.body);
      
      // Create default sections for the shop
      const defaultSections = [
        { sectionType: "hero", title: "Welcome", orderNo: 0, isVisible: true },
        { sectionType: "menu", title: "Our Menu", orderNo: 1, isVisible: true },
        { sectionType: "offers", title: "Special Offers", orderNo: 2, isVisible: true },
        { sectionType: "whatsapp", title: "Contact Us", orderNo: 3, isVisible: true },
      ];
      
      for (const section of defaultSections) {
        await storage.createSection({ ...section, shopId: shop.id });
      }
      
      // Create default categories for the shop
      const defaultCategories = [
        { name: "Starters", orderNo: 0, isVisible: true },
        { name: "Main Course", orderNo: 1, isVisible: true },
        { name: "Breads", orderNo: 2, isVisible: true },
        { name: "Rice", orderNo: 3, isVisible: true },
        { name: "Beverages", orderNo: 4, isVisible: true },
        { name: "Desserts", orderNo: 5, isVisible: true },
        { name: "Snacks", orderNo: 6, isVisible: true },
        { name: "Combo Meals", orderNo: 7, isVisible: true },
      ];
      
      for (const category of defaultCategories) {
        await storage.createCategory({ ...category, shopId: shop.id });
      }
      
      res.status(201).json(shop);
    } catch (error) {
      console.error("Error creating shop:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/super-admin/shops/:id", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const shop = await storage.updateShop(req.params.id, req.body);
      res.json(shop);
    } catch (error) {
      console.error("Error updating shop:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/super-admin/shops/:id", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      await storage.deleteShop(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shop:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // SUPER ADMIN STORE AVAILABILITY ROUTES
  // ============================================

  // Get store availability settings
  app.get("/api/super-admin/shops/:id/availability", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { id: shopId } = req.params;
      
      const availability = await storage.getStoreAvailability(shopId);
      const holidays = await storage.getStoreHolidays(shopId);
      
      res.json({
        availability,
        holidays,
      });
    } catch (error) {
      console.error("Error fetching store availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update store availability settings
  app.put("/api/super-admin/shops/:id/availability", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { id: shopId } = req.params;
      const { openingTime, closingTime, timezone, manualOverride, overrideReason } = req.body;
      
      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (openingTime && !timeRegex.test(openingTime)) {
        return res.status(400).json({ message: "Invalid opening time format. Use HH:MM" });
      }
      if (closingTime && !timeRegex.test(closingTime)) {
        return res.status(400).json({ message: "Invalid closing time format. Use HH:MM" });
      }
      
      // Validate manual override
      if (manualOverride && !["none", "force_open", "force_close"].includes(manualOverride)) {
        return res.status(400).json({ message: "Invalid manual override value" });
      }
      
      const availability = await storage.createOrUpdateStoreAvailability(shopId, {
        openingTime,
        closingTime,
        timezone,
        manualOverride,
        overrideReason: overrideReason || null,
      });
      
      res.json(availability);
    } catch (error) {
      console.error("Error updating store availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add store holiday
  app.post("/api/super-admin/shops/:id/holidays", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { id: shopId } = req.params;
      const { holidayDate, name } = req.body;
      
      if (!holidayDate || !name) {
        return res.status(400).json({ message: "holidayDate and name are required" });
      }
      
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(holidayDate)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      // Check if holiday already exists
      const existingHolidays = await storage.getStoreHolidays(shopId);
      const exists = existingHolidays.some(h => h.holidayDate === holidayDate);
      if (exists) {
        return res.status(400).json({ message: "Holiday for this date already exists" });
      }
      
      const holiday = await storage.addStoreHoliday({
        shopId,
        holidayDate,
        name,
      });
      
      res.status(201).json(holiday);
    } catch (error) {
      console.error("Error adding store holiday:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete store holiday
  app.delete("/api/super-admin/holidays/:id", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      await storage.deleteStoreHoliday(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting store holiday:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // SUPER ADMIN BULK AVAILABILITY ROUTES
  // ============================================

  // Get all shops availability (for bulk management)
  app.get("/api/super-admin/availability/all", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const allShops = await storage.getAllShops();
      const shopsAvailability = await Promise.all(
        allShops.map(async (shop) => {
          const availability = await storage.getStoreAvailability(shop.id);
          const holidays = await storage.getStoreHolidays(shop.id);
          return {
            shopId: shop.id,
            shopName: shop.shopName,
            availability,
            holidays,
          };
        })
      );
      res.json(shopsAvailability);
    } catch (error) {
      console.error("Error fetching all shops availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update single shop availability (toggle open/close)
  app.put("/api/super-admin/shops/:shopId/availability", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { shopId } = req.params;
      const { manualOverride, overrideReason } = req.body;

      // Validate manualOverride
      if (!manualOverride || !["force_open", "force_close", "none"].includes(manualOverride)) {
        return res.status(400).json({ message: "Invalid manual override value. Use 'force_open', 'force_close', or 'none'" });
      }

      // Get current availability or create new
      const existingAvailability = await storage.getStoreAvailability(shopId);
      
      if (existingAvailability) {
        // Update existing
        await storage.updateStoreAvailability(existingAvailability.id, {
          manualOverride,
          overrideReason: overrideReason || null,
        });
      } else {
        // Create new availability with defaults
        await storage.createOrUpdateStoreAvailability(shopId, {
          openingTime: "09:00",
          closingTime: "22:00",
          timezone: "Asia/Kolkata",
          manualOverride,
          overrideReason: overrideReason || null,
        });
      }

      const statusText = manualOverride === "force_open" ? "opened" : manualOverride === "force_close" ? "closed" : "reset to normal hours";

      res.json({
        success: true,
        message: `Shop ${statusText} successfully`,
        manualOverride,
      });
    } catch (error) {
      console.error("Error updating shop availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Apply availability settings to ALL shops (Bulk Update)
  app.put("/api/super-admin/availability/bulk", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { openingTime, closingTime, timezone, overrideReason } = req.body;
      
      // Validate time format (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (openingTime && !timeRegex.test(openingTime)) {
        return res.status(400).json({ message: "Invalid opening time format. Use HH:MM" });
      }
      if (closingTime && !timeRegex.test(closingTime)) {
        return res.status(400).json({ message: "Invalid closing time format. Use HH:MM" });
      }

      const allShops = await storage.getAllShops();
      let updated = 0;
      let failed = 0;

      for (const shop of allShops) {
        try {
          await storage.createOrUpdateStoreAvailability(shop.id, {
            openingTime,
            closingTime,
            timezone: timezone || "Asia/Kolkata",
            manualOverride: "none", // Reset override when applying bulk settings
            overrideReason: overrideReason || null,
          });
          updated++;
        } catch (err) {
          console.error(`Failed to update availability for shop ${shop.id}:`, err);
          failed++;
        }
      }

      res.json({
        success: true,
        message: `Updated availability for ${updated} shops${failed > 0 ? `, ${failed} failed` : ""}`,
        updated,
        failed,
      });
    } catch (error) {
      console.error("Error bulk updating availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add holidays to ALL shops (Bulk Add)
  app.post("/api/super-admin/holidays/bulk/all", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { holidays } = req.body;
      
      if (!Array.isArray(holidays) || holidays.length === 0) {
        return res.status(400).json({ message: "Holidays array is required" });
      }
      
      // Validate all holidays
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      for (const holiday of holidays) {
        if (!holiday.holidayDate || !holiday.name) {
          return res.status(400).json({ message: "Each holiday must have holidayDate and name" });
        }
        if (!dateRegex.test(holiday.holidayDate)) {
          return res.status(400).json({ message: `Invalid date format for ${holiday.name}. Use YYYY-MM-DD` });
        }
      }

      const allShops = await storage.getAllShops();
      let totalCreated = 0;
      let totalSkipped = 0;

      for (const shop of allShops) {
        try {
          // Get existing holidays to filter duplicates
          const existingHolidays = await storage.getStoreHolidays(shop.id);
          const existingDates = new Set(existingHolidays.map(h => h.holidayDate));
          
          // Filter out duplicates
          const newHolidays = holidays.filter(h => !existingDates.has(h.holidayDate));
          
          if (newHolidays.length > 0) {
            const created = await storage.bulkAddStoreHolidays(shop.id, newHolidays);
            totalCreated += created.length;
            totalSkipped += (holidays.length - newHolidays.length);
          } else {
            totalSkipped += holidays.length;
          }
        } catch (err) {
          console.error(`Failed to add holidays for shop ${shop.id}:`, err);
        }
      }

      res.json({
        success: true,
        message: `Added ${totalCreated} holidays across all shops (${totalSkipped} duplicates skipped)`,
        created: totalCreated,
        skipped: totalSkipped,
      });
    } catch (error) {
      console.error("Error bulk adding holidays:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // SHOP ADMIN QUICK TOGGLE ROUTES
  // ============================================

  // Quick toggle store status (force_open / force_close / none)
  app.put("/api/admin/availability/toggle", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const { manualOverride, overrideReason } = req.body;

      // Validate manual override
      if (!manualOverride || !["none", "force_open", "force_close"].includes(manualOverride)) {
        return res.status(400).json({ message: "Valid manualOverride required (none, force_open, force_close)" });
      }

      const availability = await storage.createOrUpdateStoreAvailability(shopId, {
        manualOverride,
        overrideReason: overrideReason || null,
      });

      res.json({
        success: true,
        availability,
        message: manualOverride === "force_open" 
          ? "Store is now OPEN (orders can be placed)" 
          : manualOverride === "force_close"
          ? "Store is now CLOSED (orders are blocked)"
          : "Store timing is now normal",
      });
    } catch (error) {
      console.error("Error toggling store availability:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current store status for shop admin
  app.get("/api/admin/availability/status", isAuthenticated, shopAdminMiddleware, async (req, res) => {
    try {
      const shopId = (req as any).shopId || (req as any).profile.shopId;
      const storeStatus = await storage.getStoreStatus(shopId);
      res.json(storeStatus);
    } catch (error) {
      console.error("Error fetching store status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Bulk add store holidays
  app.post("/api/super-admin/shops/:id/holidays/bulk", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { id: shopId } = req.params;
      const { holidays } = req.body;
      
      if (!Array.isArray(holidays) || holidays.length === 0) {
        return res.status(400).json({ message: "Holidays array is required" });
      }
      
      // Validate all holidays
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      for (const holiday of holidays) {
        if (!holiday.holidayDate || !holiday.name) {
          return res.status(400).json({ message: "Each holiday must have holidayDate and name" });
        }
        if (!dateRegex.test(holiday.holidayDate)) {
          return res.status(400).json({ message: `Invalid date format for ${holiday.name}. Use YYYY-MM-DD` });
        }
      }
      
      // Get existing holidays to filter duplicates
      const existingHolidays = await storage.getStoreHolidays(shopId);
      const existingDates = new Set(existingHolidays.map(h => h.holidayDate));
      
      // Filter out duplicates
      const newHolidays = holidays.filter(h => !existingDates.has(h.holidayDate));
      
      if (newHolidays.length === 0) {
        return res.status(400).json({ message: "All holidays already exist" });
      }
      
      const created = await storage.bulkAddStoreHolidays(shopId, newHolidays);
      
      res.status(201).json({
        created,
        skipped: holidays.length - newHolidays.length,
        message: `Added ${created.length} holidays, skipped ${holidays.length - newHolidays.length} duplicates`,
      });
    } catch (error) {
      console.error("Error bulk adding store holidays:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Themes management
  app.get("/api/super-admin/themes", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const themes = await storage.getAllThemes();
      res.json(themes);
    } catch (error) {
      console.error("Error fetching themes:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/super-admin/themes", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const theme = await storage.createTheme(req.body);
      res.status(201).json(theme);
    } catch (error) {
      console.error("Error creating theme:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/super-admin/themes/:id", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const theme = await storage.updateTheme(req.params.id, req.body);
      res.json(theme);
    } catch (error) {
      console.error("Error updating theme:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/super-admin/themes/:id", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      await storage.deleteTheme(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting theme:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Super Admin Analytics - Get all orders with shop and customer details
  app.get("/api/super-admin/analytics/orders", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { shopId, startDate, endDate, status } = req.query;
      const analyticsData = await storage.getAnalyticsOrders({
        shopId: shopId as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as string | undefined,
      });
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Super Admin Analytics - Export orders as CSV
  app.get("/api/super-admin/analytics/export", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { shopId, startDate, endDate, status } = req.query;
      const analyticsData = await storage.getAnalyticsOrders({
        shopId: shopId as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as string | undefined,
      });

      // Build CSV
      const headers = ["Shop Name", "Shop Phone", "Customer Name", "Customer Phone", "Order Number", "Items", "Total Amount", "Payment Mode", "Status", "Order Date"];
      const rows = analyticsData.map(order => [
        order.shopName,
        order.shopPhone || "",
        order.customerName || "",
        order.customerPhone || "",
        order.orderNumber || order.id.slice(-8),
        order.items.map(i => `${i.itemName} x${i.quantity}`).join("; "),
        order.totalAmount,
        order.paymentMode || "",
        order.status,
        order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : ""
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=orders-export-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting analytics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Super Admin User Data - Get all page visits
  app.get("/api/super-admin/user-data", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { startDate, endDate, page, deviceType } = req.query;
      const visits = await storage.getAllPageVisits({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page as string | undefined,
        deviceType: deviceType as string | undefined,
      });
      res.json(visits);
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Super Admin User Data - Export as CSV
  app.get("/api/super-admin/user-data/export", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { startDate, endDate, page, deviceType } = req.query;
      const visits = await storage.getAllPageVisits({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page as string | undefined,
        deviceType: deviceType as string | undefined,
      });

      // Build CSV
      const headers = ["ID", "Page", "Shop ID", "OS", "Browser", "Device Type", "User Agent", "IP Hash", "City", "Visited At"];
      const rows = visits.map(v => [
        v.id,
        v.page,
        v.shopId || "",
        v.os || "",
        v.browser || "",
        v.deviceType || "",
        v.userAgent || "",
        v.ipHash || "",
        v.city || "",
        v.visitedAt ? new Date(v.visitedAt).toLocaleString("en-IN") : ""
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=user-data-export-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting user data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============================================
  // SUPER ADMIN OFFERS ROUTES
  // ============================================

  // Get all offers across all shops with shop details
  app.get("/api/super-admin/offers", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { shopId, isActive, search } = req.query;
      
      let offers = await storage.getAllOffersWithShopDetails();
      
      // Filter by shop
      if (shopId && typeof shopId === "string") {
        offers = offers.filter((o: any) => o.shopId === shopId);
      }
      
      // Filter by active status
      if (isActive !== undefined) {
        const activeFilter = isActive === "true";
        offers = offers.filter((o: any) => o.isActive === activeFilter);
      }
      
      // Search by title
      if (search && typeof search === "string" && search.trim()) {
        const searchLower = search.toLowerCase();
        offers = offers.filter((o: any) => 
          o.title.toLowerCase().includes(searchLower) ||
          o.shopName.toLowerCase().includes(searchLower)
        );
      }
      
      res.json(offers);
    } catch (error) {
      console.error("Error fetching all offers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get offer statistics
  app.get("/api/super-admin/offers/stats", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const stats = await storage.getOfferStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching offer stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get offers for a specific shop (super admin view)
  app.get("/api/super-admin/shops/:shopId/offers", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { shopId } = req.params;
      const offers = await storage.getOffersByShopId(shopId);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching shop offers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create offer for a specific shop (super admin)
  app.post("/api/super-admin/shops/:shopId/offers", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { shopId } = req.params;
      const { title, description, discountType, discountValue, minVisits, minOrderAmount, expiryDate, isActive } = req.body;
      
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ message: "Title is required" });
      }
      
      const offer = await storage.createOffer({
        shopId,
        title: title.trim(),
        description: description || undefined,
        discountType: discountType || "percentage",
        discountValue: discountValue || "0",
        minVisits: minVisits || 0,
        minOrderAmount: minOrderAmount || undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        isActive: isActive !== false,
      });
      
      res.status(201).json(offer);
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update any offer (super admin)
  app.patch("/api/super-admin/offers/:id", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, discountType, discountValue, minVisits, minOrderAmount, expiryDate, isActive } = req.body;
      
      const updateData: any = {};
      if (title !== undefined) updateData.title = title.trim();
      if (description !== undefined) updateData.description = description || null;
      if (discountType !== undefined) updateData.discountType = discountType;
      if (discountValue !== undefined) updateData.discountValue = discountValue;
      if (minVisits !== undefined) updateData.minVisits = minVisits;
      if (minOrderAmount !== undefined) updateData.minOrderAmount = minOrderAmount || null;
      if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
      if (isActive !== undefined) updateData.isActive = isActive;
      
      const offer = await storage.updateOffer(id, updateData);
      
      if (!offer) {
        return res.status(404).json({ message: "Offer not found" });
      }
      
      res.json(offer);
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete any offer (super admin)
  app.delete("/api/super-admin/offers/:id", isAuthenticated, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteOffer(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Public API - Track page visit (rate limited to prevent spam)
  app.post("/api/track-visit", trackingLimiter, async (req, res) => {
    try {
      const { page, shopId, os, browser, deviceType, userAgent, city } = req.body;
      
      // Validate input
      if (page && typeof page !== "string") {
        return res.status(400).json({ message: "Invalid page" });
      }
      
      // Create IP hash for privacy
      const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
      const ipHash = crypto.createHash('sha256').update(ip + new Date().toDateString()).digest('hex').slice(0, 16);
      
      await storage.createPageVisit({
        page: page || '/',
        shopId: shopId || null,
        os: os || null,
        browser: browser || null,
        deviceType: deviceType || null,
        userAgent: userAgent || null,
        ipHash,
        city: city || null,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking visit:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
