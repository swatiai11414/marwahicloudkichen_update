import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// ============================================
// SHOP THEMES
// ============================================
export const shopThemes = pgTable("shop_themes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  primaryColor: varchar("primary_color", { length: 7 }).notNull().default("#2563eb"),
  secondaryColor: varchar("secondary_color", { length: 7 }).notNull().default("#f59e0b"),
  fontFamily: varchar("font_family", { length: 100 }).notNull().default("Plus Jakarta Sans"),
  buttonStyle: varchar("button_style", { length: 20 }).notNull().default("rounded"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shopThemesRelations = relations(shopThemes, ({ many }) => ({
  shops: many(shops),
}));

// ============================================
// SHOPS (Multi-tenant core)
// ============================================
export const shops = pgTable("shops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  shopName: varchar("shop_name", { length: 200 }).notNull(),
  logo: text("logo"),
  banner: text("banner"),
  whatsappNumber: varchar("whatsapp_number", { length: 20 }),
  superAdminWhatsapp: varchar("super_admin_whatsapp", { length: 20 }),
  address: text("address"),
  about: text("about"),
  themeId: varchar("theme_id").references(() => shopThemes.id),
  adminPassword: varchar("admin_password", { length: 100 }).notNull().default("shop123"),
  upiId: varchar("upi_id", { length: 255 }),
  upiQrImage: text("upi_qr_image"),
  gstNumber: varchar("gst_number", { length: 20 }),
  deliveryCharge: decimal("delivery_charge", { precision: 10, scale: 2 }).default("0"),
  deliveryChargeReason: varchar("delivery_charge_reason", { length: 255 }),
  freeDeliveryThreshold: decimal("free_delivery_threshold", { precision: 10, scale: 2 }),
  allowedPinCodes: text("allowed_pin_codes").default("495118"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_shops_slug").on(table.slug),
]);

export const shopsRelations = relations(shops, ({ one, many }) => ({
  theme: one(shopThemes, {
    fields: [shops.themeId],
    references: [shopThemes.id],
  }),
  sections: many(shopSections),
  menuCategories: many(menuCategories),
  menuItems: many(menuItems),
  orders: many(orders),
  offers: many(offers),
  profiles: many(profiles),
  customers: many(customers),
  availability: many(storeAvailability),
  holidays: many(storeHolidays),
}));

// ============================================
// SHOP SECTIONS (No-code page builder)
// ============================================
export const shopSections = pgTable("shop_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  sectionType: varchar("section_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }),
  description: text("description"),
  imageUrl: text("image_url"),
  orderNo: integer("order_no").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_shop_sections_shop").on(table.shopId),
]);

export const shopSectionsRelations = relations(shopSections, ({ one }) => ({
  shop: one(shops, {
    fields: [shopSections.shopId],
    references: [shops.id],
  }),
}));

// ============================================
// MENU CATEGORIES
// ============================================
export const menuCategories = pgTable("menu_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  orderNo: integer("order_no").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  // Delivery charge settings per category
  deliveryCharge: decimal("delivery_charge", { precision: 10, scale: 2 }).default("0"),
  deliveryChargeLabel: varchar("delivery_charge_label", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_menu_categories_shop").on(table.shopId),
]);

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  shop: one(shops, {
    fields: [menuCategories.shopId],
    references: [shops.id],
  }),
  items: many(menuItems),
}));

// ============================================
// MENU ITEMS
// ============================================
export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").references(() => menuCategories.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  image: text("image"),
  isAvailable: boolean("is_available").notNull().default(true),
  isVeg: boolean("is_veg").default(false),
  isBestseller: boolean("is_bestseller").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_menu_items_shop").on(table.shopId),
  index("idx_menu_items_category").on(table.categoryId),
]);

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  shop: one(shops, {
    fields: [menuItems.shopId],
    references: [shops.id],
  }),
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
  orderItems: many(orderItems),
}));

// ============================================
// CUSTOMERS (No password, just visit tracking)
// ============================================
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  firstVisit: timestamp("first_visit").defaultNow(),
  lastVisit: timestamp("last_visit").defaultNow(),
  lastOrderAt: timestamp("last_order_at"),
  totalVisits: integer("total_visits").notNull().default(1),
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).notNull().default("0"),
  avgBill: decimal("avg_bill", { precision: 10, scale: 2 }).notNull().default("0"),
  deviceType: varchar("device_type", { length: 50 }),
  os: varchar("os", { length: 50 }),
  browser: varchar("browser", { length: 50 }),
  screenWidth: integer("screen_width"),
  screenHeight: integer("screen_height"),
  language: varchar("language", { length: 10 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  city: varchar("city", { length: 100 }),
  hasConsent: boolean("has_consent").notNull().default(false),
  lastOfferSent: timestamp("last_offer_sent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_customers_shop").on(table.shopId),
  index("idx_customers_phone").on(table.phone),
]);

export const customersRelations = relations(customers, ({ one, many }) => ({
  shop: one(shops, {
    fields: [customers.shopId],
    references: [shops.id],
  }),
  orders: many(orders),
  sessions: many(customerSessions),
  behaviors: many(userBehaviors),
}));

// ============================================
// CUSTOMER SESSIONS (Device tracking per visit)
// ============================================
export const customerSessions = pgTable("customer_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  sessionToken: varchar("session_token", { length: 64 }).notNull().unique(),
  deviceFingerprint: varchar("device_fingerprint", { length: 64 }),
  deviceType: varchar("device_type", { length: 50 }),
  os: varchar("os", { length: 50 }),
  browser: varchar("browser", { length: 50 }),
  userAgent: text("user_agent"),
  screenWidth: integer("screen_width"),
  screenHeight: integer("screen_height"),
  language: varchar("language", { length: 10 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  city: varchar("city", { length: 100 }),
  startedAt: timestamp("started_at").defaultNow(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  endedAt: timestamp("ended_at"),
}, (table) => [
  index("idx_sessions_shop").on(table.shopId),
  index("idx_sessions_customer").on(table.customerId),
  index("idx_sessions_token").on(table.sessionToken),
]);

export const customerSessionsRelations = relations(customerSessions, ({ one, many }) => ({
  shop: one(shops, {
    fields: [customerSessions.shopId],
    references: [shops.id],
  }),
  customer: one(customers, {
    fields: [customerSessions.customerId],
    references: [customers.id],
  }),
  behaviors: many(userBehaviors),
}));

// ============================================
// USER BEHAVIORS (Event tracking)
// ============================================
export const userBehaviors = pgTable("user_behaviors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").references(() => customerSessions.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  itemId: varchar("item_id").references(() => menuItems.id, { onDelete: "cascade" }),
  page: varchar("page", { length: 100 }),
  timeSpent: integer("time_spent"),
  metadata: jsonb("metadata"),
  occurredAt: timestamp("occurred_at").defaultNow(),
}, (table) => [
  index("idx_behaviors_shop").on(table.shopId),
  index("idx_behaviors_customer").on(table.customerId),
  index("idx_behaviors_session").on(table.sessionId),
  index("idx_behaviors_event").on(table.eventType),
  index("idx_behaviors_occurred").on(table.occurredAt),
]);

export const userBehaviorsRelations = relations(userBehaviors, ({ one }) => ({
  shop: one(shops, {
    fields: [userBehaviors.shopId],
    references: [shops.id],
  }),
  customer: one(customers, {
    fields: [userBehaviors.customerId],
    references: [customers.id],
  }),
  session: one(customerSessions, {
    fields: [userBehaviors.sessionId],
    references: [customerSessions.id],
  }),
  item: one(menuItems, {
    fields: [userBehaviors.itemId],
    references: [menuItems.id],
  }),
}));

// ============================================
// ORDERS
// ============================================
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: "cascade" }),
  orderNumber: varchar("order_number", { length: 20 }),
  tableQr: varchar("table_qr", { length: 50 }),
  deliveryAddress: text("delivery_address"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  deliveryCharge: decimal("delivery_charge", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending_payment"),
  paymentMode: varchar("payment_mode", { length: 30 }),
  paymentReference: varchar("payment_reference", { length: 100 }),
  paymentVerifiedAt: timestamp("payment_verified_at"),
  paymentVerifiedBy: varchar("payment_verified_by"),
  billNumber: varchar("bill_number", { length: 20 }),
  billUrl: text("bill_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_orders_shop").on(table.shopId),
  index("idx_orders_customer").on(table.customerId),
  index("idx_orders_status").on(table.status),
  index("idx_orders_created").on(table.createdAt),
]);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  shop: one(shops, {
    fields: [orders.shopId],
    references: [shops.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

// ============================================
// ORDER ITEMS
// ============================================
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  itemName: varchar("item_name", { length: 200 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
}, (table) => [
  index("idx_order_items_order").on(table.orderId),
]);

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  item: one(menuItems, {
    fields: [orderItems.itemId],
    references: [menuItems.id],
  }),
}));

// ============================================
// OFFERS
// ============================================
export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  discountType: varchar("discount_type", { length: 20 }).notNull().default("percentage"),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minVisits: integer("min_visits").default(0),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  expiryDate: timestamp("expiry_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_offers_shop").on(table.shopId),
]);

export const offersRelations = relations(offers, ({ one }) => ({
  shop: one(shops, {
    fields: [offers.shopId],
    references: [shops.id],
  }),
}));

// ============================================
// DELIVERY CHARGE REASONS
// ============================================
export const deliveryChargeReasons = pgTable("delivery_charge_reasons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  reason: varchar("reason", { length: 255 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_delivery_reasons_shop").on(table.shopId),
]);

export const deliveryChargeReasonsRelations = relations(deliveryChargeReasons, ({ one }) => ({
  shop: one(shops, {
    fields: [deliveryChargeReasons.shopId],
    references: [shops.id],
  }),
}));

// ============================================
// PAGE VISITS (Visitor tracking for Super Admin)
// ============================================
export const pageVisits = pgTable("page_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  page: varchar("page", { length: 200 }).notNull(),
  shopId: varchar("shop_id").references(() => shops.id, { onDelete: "set null" }),
  os: varchar("os", { length: 50 }),
  browser: varchar("browser", { length: 50 }),
  deviceType: varchar("device_type", { length: 20 }),
  userAgent: text("user_agent"),
  ipHash: varchar("ip_hash", { length: 64 }),
  city: varchar("city", { length: 100 }),
  visitedAt: timestamp("visited_at").defaultNow(),
}, (table) => [
  index("idx_page_visits_shop").on(table.shopId),
  index("idx_page_visits_page").on(table.page),
  index("idx_page_visits_visited").on(table.visitedAt),
]);

export const pageVisitsRelations = relations(pageVisits, ({ one }) => ({
  shop: one(shops, {
    fields: [pageVisits.shopId],
    references: [shops.id],
  }),
}));

// ============================================
// PROFILES (Admin roles - extends auth users)
// ============================================
export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("shop_admin"),
  shopId: varchar("shop_id").references(() => shops.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_profiles_user").on(table.userId),
  index("idx_profiles_shop").on(table.shopId),
]);

export const profilesRelations = relations(profiles, ({ one }) => ({
  shop: one(shops, {
    fields: [profiles.shopId],
    references: [shops.id],
  }),
}));

// ============================================
// STORE AVAILABILITY (Timing & Manual Override)
// ============================================
export const storeAvailability = pgTable("store_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  openingTime: varchar("opening_time", { length: 5 }).notNull().default("09:00"), // HH:MM format
  closingTime: varchar("closing_time", { length: 5 }).notNull().default("22:00"), // HH:MM format
  timezone: varchar("timezone", { length: 50 }).notNull().default("Asia/Kolkata"),
  manualOverride: varchar("manual_override", { length: 20 }).notNull().default("none"), // "none" | "force_open" | "force_close"
  overrideReason: text("override_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_store_availability_shop").on(table.shopId),
]);

export const storeAvailabilityRelations = relations(storeAvailability, ({ one, many }) => ({
  shop: one(shops, {
    fields: [storeAvailability.shopId],
    references: [shops.id],
  }),
  holidays: many(storeHolidays),
}));

// ============================================
// STORE HOLIDAYS
// ============================================
export const storeHolidays = pgTable("store_holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  holidayDate: varchar("holiday_date", { length: 10 }).notNull(), // YYYY-MM-DD format
  name: varchar("name", { length: 100 }).notNull(), // Holiday name like "Republic Day"
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_store_holidays_shop").on(table.shopId),
  index("idx_store_holidays_date").on(table.holidayDate),
]);

export const storeHolidaysRelations = relations(storeHolidays, ({ one }) => ({
  shop: one(shops, {
    fields: [storeHolidays.shopId],
    references: [shops.id],
  }),
}));

// ============================================
// INSERT SCHEMAS
// ============================================
export const insertShopThemeSchema = createInsertSchema(shopThemes).omit({ id: true, createdAt: true });
export const insertShopSchema = createInsertSchema(shops).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShopSectionSchema = createInsertSchema(shopSections).omit({ id: true, createdAt: true });
export const insertMenuCategorySchema = createInsertSchema(menuCategories).omit({ id: true, createdAt: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertCustomerSessionSchema = createInsertSchema(customerSessions).omit({ id: true, startedAt: true, lastActivityAt: true });
export const insertUserBehaviorSchema = createInsertSchema(userBehaviors).omit({ id: true, occurredAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertOfferSchema = createInsertSchema(offers).omit({ id: true, createdAt: true });
export const insertDeliveryChargeReasonSchema = createInsertSchema(deliveryChargeReasons).omit({ id: true, createdAt: true });
export const insertPageVisitSchema = createInsertSchema(pageVisits).omit({ id: true, visitedAt: true });
export const insertProfileSchema = createInsertSchema(profiles).omit({ createdAt: true, updatedAt: true });
export const insertStoreAvailabilitySchema = createInsertSchema(storeAvailability).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStoreHolidaySchema = createInsertSchema(storeHolidays).omit({ id: true, createdAt: true });

// ============================================
// TYPES
// ============================================
export type InsertShopTheme = z.infer<typeof insertShopThemeSchema>;
export type ShopTheme = typeof shopThemes.$inferSelect;

export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shops.$inferSelect;

export type InsertShopSection = z.infer<typeof insertShopSectionSchema>;
export type ShopSection = typeof shopSections.$inferSelect;

export type InsertMenuCategory = z.infer<typeof insertMenuCategorySchema>;
export type MenuCategory = typeof menuCategories.$inferSelect;

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertCustomerSession = z.infer<typeof insertCustomerSessionSchema>;
export type CustomerSession = typeof customerSessions.$inferSelect;

export type InsertUserBehavior = z.infer<typeof insertUserBehaviorSchema>;
export type UserBehavior = typeof userBehaviors.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offers.$inferSelect;

export type InsertDeliveryChargeReason = z.infer<typeof insertDeliveryChargeReasonSchema>;
export type DeliveryChargeReason = typeof deliveryChargeReasons.$inferSelect;

export type InsertPageVisit = z.infer<typeof insertPageVisitSchema>;
export type PageVisit = typeof pageVisits.$inferSelect;

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

export type InsertStoreAvailability = z.infer<typeof insertStoreAvailabilitySchema>;
export type StoreAvailability = typeof storeAvailability.$inferSelect;

export type InsertStoreHoliday = z.infer<typeof insertStoreHolidaySchema>;
export type StoreHoliday = typeof storeHolidays.$inferSelect;

// User roles
export type UserRole = "super_admin" | "shop_admin";

// Section types for no-code builder
export type SectionType = "hero" | "offers" | "menu" | "about" | "feedback" | "whatsapp" | "gallery";

// Order statuses
export type OrderStatus = "pending_payment" | "paid" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";

// Payment modes
export type PaymentMode = "cash" | "upi";

// Behavior event types
export type BehaviorEventType = "page_view" | "item_view" | "add_to_cart" | "remove_from_cart" | "checkout_start" | "order_placed" | "payment_click" | "exit";

// Store availability status
export type StoreAvailabilityStatus = "open" | "closed" | "opens_later" | "holiday" | "force_open" | "force_close";

// Manual override types
export type ManualOverride = "none" | "force_open" | "force_close";

// Store status response (for API)
export interface StoreStatusResponse {
  isOpen: boolean;
  status: StoreAvailabilityStatus;
  message: string;
  nextOpenTime?: string;
  holidayName?: string;
  openingTime: string;
  closingTime: string;
  timezone: string;
}

// Delivery charge calculation result
export interface DeliveryChargeResult {
  amount: number;
  reason: string;
  isFree: boolean;
  threshold?: number;
}

// Delivery settings for a shop
export interface DeliverySettings {
  deliveryCharge: number;
  deliveryChargeReason: string | null;
  freeDeliveryThreshold: number | null;
}
