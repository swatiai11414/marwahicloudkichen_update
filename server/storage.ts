import { eq, desc, and, or, sql, count, sum, gte, lte, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  shops, shopThemes, shopSections, menuCategories, menuItems,
  customers, customerSessions, userBehaviors, orders, orderItems, offers, profiles, pageVisits,
  storeAvailability, storeHolidays, deliveryChargeReasons,
  type Shop, type InsertShop,
  type ShopTheme, type InsertShopTheme,
  type ShopSection, type InsertShopSection,
  type MenuCategory, type InsertMenuCategory,
  type MenuItem, type InsertMenuItem,
  type Customer, type InsertCustomer,
  type CustomerSession, type InsertCustomerSession,
  type UserBehavior, type InsertUserBehavior,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type Offer, type InsertOffer,
  type Profile, type InsertProfile,
  type PageVisit, type InsertPageVisit,
  type StoreAvailability, type InsertStoreAvailability,
  type StoreHoliday, type InsertStoreHoliday,
  type StoreStatusResponse,
  type ManualOverride,
  type DeliveryChargeReason, type InsertDeliveryChargeReason,
} from "@shared/schema";

export interface IStorage {
  // Shops
  getShopBySlug(slug: string): Promise<Shop | undefined>;
  getShopById(id: string): Promise<Shop | undefined>;
  getAllShops(): Promise<Shop[]>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: string, shop: Partial<InsertShop>): Promise<Shop | undefined>;
  deleteShop(id: string): Promise<void>;

  // Themes
  getThemeById(id: string): Promise<ShopTheme | undefined>;
  getAllThemes(): Promise<ShopTheme[]>;
  createTheme(theme: InsertShopTheme): Promise<ShopTheme>;
  updateTheme(id: string, theme: Partial<InsertShopTheme>): Promise<ShopTheme | undefined>;
  deleteTheme(id: string): Promise<void>;

  // Sections
  getSectionsByShopId(shopId: string): Promise<ShopSection[]>;
  createSection(section: InsertShopSection): Promise<ShopSection>;
  updateSection(id: string, section: Partial<InsertShopSection>): Promise<ShopSection | undefined>;
  deleteSection(id: string): Promise<void>;

  // Menu Categories
  getCategoriesByShopId(shopId: string): Promise<MenuCategory[]>;
  createCategory(category: InsertMenuCategory): Promise<MenuCategory>;
  updateCategory(id: string, category: Partial<InsertMenuCategory>): Promise<MenuCategory | undefined>;
  deleteCategory(id: string): Promise<void>;

  // Menu Items
  getItemsByShopId(shopId: string): Promise<MenuItem[]>;
  getItemById(id: string): Promise<MenuItem | undefined>;
  createItem(item: InsertMenuItem): Promise<MenuItem>;
  updateItem(id: string, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteItem(id: string): Promise<void>;

  // Customers
  getCustomersByShopId(shopId: string): Promise<Customer[]>;
  getCustomerById(id: string): Promise<Customer | undefined>;
  getCustomerByPhone(shopId: string, phone: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;

  // Customer Sessions
  getSessionByToken(token: string): Promise<CustomerSession | undefined>;
  createSession(session: InsertCustomerSession): Promise<CustomerSession>;
  updateSession(id: string, session: Partial<InsertCustomerSession>): Promise<CustomerSession | undefined>;

  // User Behaviors
  createBehavior(behavior: InsertUserBehavior): Promise<UserBehavior>;
  getBehaviorsByShopId(shopId: string, limit?: number): Promise<UserBehavior[]>;

  // Orders
  getOrdersByShopId(shopId: string): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrdersByCustomerPhone(shopId: string, phone: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined>;

  // Order Items
  getOrderItemsByOrderId(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;

  // Offers
  getOffersByShopId(shopId: string): Promise<Offer[]>;
  getActiveOffersByShopId(shopId: string): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: string, offer: Partial<InsertOffer>): Promise<Offer | undefined>;
  deleteOffer(id: string): Promise<void>;

  // Super Admin Offers
  getAllOffers(): Promise<Offer[]>;
  getAllOffersWithShopDetails(): Promise<Array<Offer & { shopName: string; shopSlug: string }>>;
  getOfferStats(): Promise<{
    totalOffers: number;
    activeOffers: number;
    expiringSoon: number;
    expiredOffers: number;
  }>;

  // Profiles
  getProfileByUserId(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, profile: Partial<InsertProfile>): Promise<Profile | undefined>;

  // Analytics
  getShopStats(shopId: string): Promise<{
    todayOrders: number;
    totalRevenue: number;
    activeMenuItems: number;
    totalCustomers: number;
  }>;
  getTodayDashboard(shopId: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    cashRevenue: number;
    upiRevenue: number;
    paidOrders: number;
    pendingOrders: number;
    uniqueCustomers: number;
    avgBillValue: number;
    topSellingItem: { name: string; count: number } | null;
    peakHour: { hour: string; count: number } | null;
    recentOrders: Order[];
  }>;
  getSuperAdminStats(): Promise<{
    totalShops: number;
    activeShops: number;
    totalOrders: number;
    totalRevenue: number;
  }>;
  
  // Analytics Orders for Super Admin
  getAnalyticsOrders(filters: {
    shopId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<{
    id: string;
    shopName: string;
    shopPhone: string | null;
    customerName: string | null;
    customerPhone: string | null;
    orderNumber: string | null;
    items: { itemName: string; quantity: number; price: string }[];
    totalAmount: string;
    paymentMode: string | null;
    status: string;
    createdAt: Date | null;
  }[]>;

  // Page Visits for Super Admin
  createPageVisit(visit: InsertPageVisit): Promise<PageVisit>;
  getAllPageVisits(filters?: {
    startDate?: Date;
    endDate?: Date;
    page?: string;
    deviceType?: string;
  }): Promise<PageVisit[]>;

  // Store Availability
  getStoreAvailability(shopId: string): Promise<StoreAvailability | undefined>;
  updateStoreAvailability(id: string, data: Partial<InsertStoreAvailability>): Promise<StoreAvailability>;
  createOrUpdateStoreAvailability(shopId: string, data: Partial<InsertStoreAvailability>): Promise<StoreAvailability>;
  getStoreHolidays(shopId: string): Promise<StoreHoliday[]>;
  addStoreHoliday(holiday: InsertStoreHoliday): Promise<StoreHoliday>;
  deleteStoreHoliday(id: string): Promise<void>;
  bulkAddStoreHolidays(shopId: string, holidays: Array<{ holidayDate: string; name: string }>): Promise<StoreHoliday[]>;
  getStoreStatus(shopId: string): Promise<StoreStatusResponse>;

  // Delivery Charge Reasons
  getDeliveryChargeReasons(shopId: string): Promise<DeliveryChargeReason[]>;
  createDeliveryChargeReason(reason: InsertDeliveryChargeReason): Promise<DeliveryChargeReason>;
  updateDeliveryChargeReason(id: string, reason: Partial<InsertDeliveryChargeReason>): Promise<DeliveryChargeReason | undefined>;
  deleteDeliveryChargeReason(id: string): Promise<void>;
  setDefaultDeliveryChargeReason(shopId: string, id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Shops
  async getShopBySlug(slug: string): Promise<Shop | undefined> {
    // Temporarily use raw SQL to avoid column issues until migration is run
    const result = await db.execute(sql`
      SELECT id, slug, shop_name as "shopName", logo, banner, whatsapp_number as "whatsappNumber",
             super_admin_whatsapp as "superAdminWhatsapp", address, about, theme_id as "themeId", 
             admin_password as "adminPassword", upi_id as "upiId", upi_qr_image as "upiQrImage", 
             gst_number as "gstNumber", delivery_charge as "deliveryCharge", 
             allowed_pin_codes as "allowedPinCodes", is_active as "isActive",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM shops WHERE slug = ${slug}
    `);
    return result.rows[0] as Shop | undefined;
  }

  async getShopById(id: string): Promise<Shop | undefined> {
    // Temporarily use raw SQL to avoid column issues until migration is run
    const result = await db.execute(sql`
      SELECT id, slug, shop_name as "shopName", logo, banner, whatsapp_number as "whatsappNumber",
             super_admin_whatsapp as "superAdminWhatsapp", address, about, theme_id as "themeId", 
             admin_password as "adminPassword", upi_id as "upiId", upi_qr_image as "upiQrImage", 
             gst_number as "gstNumber", delivery_charge as "deliveryCharge", 
             allowed_pin_codes as "allowedPinCodes", is_active as "isActive",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM shops WHERE id = ${id}
    `);
    return result.rows[0] as Shop | undefined;
  }

  async getAllShops(): Promise<Shop[]> {
    // Temporarily use raw SQL to avoid column issues until migration is run
    const result = await db.execute(sql`
      SELECT id, slug, shop_name as "shopName", logo, banner, whatsapp_number as "whatsappNumber",
             super_admin_whatsapp as "superAdminWhatsapp", address, about, theme_id as "themeId", 
             admin_password as "adminPassword", upi_id as "upiId", upi_qr_image as "upiQrImage", 
             gst_number as "gstNumber", delivery_charge as "deliveryCharge", 
             allowed_pin_codes as "allowedPinCodes", is_active as "isActive",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM shops ORDER BY created_at DESC
    `);
    return result.rows as Shop[];
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    // First, ensure all new columns exist
    try {
      await db.execute(sql`
        ALTER TABLE shops
        ADD COLUMN IF NOT EXISTS super_admin_whatsapp varchar(20),
        ADD COLUMN IF NOT EXISTS allowed_pin_codes text DEFAULT '495118',
        ADD COLUMN IF NOT EXISTS delivery_charge_reason varchar(255),
        ADD COLUMN IF NOT EXISTS free_delivery_threshold decimal(10, 2)
      `);
    } catch (alterError) {
      // Ignore alter errors - columns may already exist
    }
    
    const [created] = await db.insert(shops).values(shop).returning();
    return created;
  }

  async updateShop(id: string, shop: Partial<InsertShop>): Promise<Shop | undefined> {
    // Now that columns should exist, use the full update
    const [updated] = await db
      .update(shops)
      .set({ ...shop, updatedAt: new Date() })
      .where(eq(shops.id, id))
      .returning();
    return updated;
  }

  async deleteShop(id: string): Promise<void> {
    await db.delete(shops).where(eq(shops.id, id));
  }

  // Themes
  async getThemeById(id: string): Promise<ShopTheme | undefined> {
    const [theme] = await db.select().from(shopThemes).where(eq(shopThemes.id, id));
    return theme;
  }

  async getAllThemes(): Promise<ShopTheme[]> {
    return db.select().from(shopThemes).orderBy(desc(shopThemes.createdAt));
  }

  async createTheme(theme: InsertShopTheme): Promise<ShopTheme> {
    const [created] = await db.insert(shopThemes).values(theme).returning();
    return created;
  }

  async updateTheme(id: string, theme: Partial<InsertShopTheme>): Promise<ShopTheme | undefined> {
    const [updated] = await db
      .update(shopThemes)
      .set(theme)
      .where(eq(shopThemes.id, id))
      .returning();
    return updated;
  }

  async deleteTheme(id: string): Promise<void> {
    await db.delete(shopThemes).where(eq(shopThemes.id, id));
  }

  // Sections
  async getSectionsByShopId(shopId: string): Promise<ShopSection[]> {
    return db
      .select()
      .from(shopSections)
      .where(eq(shopSections.shopId, shopId))
      .orderBy(shopSections.orderNo);
  }

  async createSection(section: InsertShopSection): Promise<ShopSection> {
    const [created] = await db.insert(shopSections).values(section).returning();
    return created;
  }

  async updateSection(id: string, section: Partial<InsertShopSection>): Promise<ShopSection | undefined> {
    const [updated] = await db
      .update(shopSections)
      .set(section)
      .where(eq(shopSections.id, id))
      .returning();
    return updated;
  }

  async deleteSection(id: string): Promise<void> {
    await db.delete(shopSections).where(eq(shopSections.id, id));
  }

  // Menu Categories
  async getCategoriesByShopId(shopId: string): Promise<MenuCategory[]> {
    return db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.shopId, shopId))
      .orderBy(menuCategories.orderNo);
  }

  async createCategory(category: InsertMenuCategory): Promise<MenuCategory> {
    const [created] = await db.insert(menuCategories).values(category).returning();
    return created;
  }

  async updateCategory(id: string, category: Partial<InsertMenuCategory>): Promise<MenuCategory | undefined> {
    const [updated] = await db
      .update(menuCategories)
      .set(category)
      .where(eq(menuCategories.id, id))
      .returning();
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(menuCategories).where(eq(menuCategories.id, id));
  }

  // Menu Items
  async getItemsByShopId(shopId: string): Promise<MenuItem[]> {
    return db
      .select()
      .from(menuItems)
      .where(eq(menuItems.shopId, shopId))
      .orderBy(desc(menuItems.createdAt));
  }

  async getItemById(id: string): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async createItem(item: InsertMenuItem): Promise<MenuItem> {
    const [created] = await db.insert(menuItems).values(item).returning();
    return created;
  }

  async updateItem(id: string, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [updated] = await db
      .update(menuItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return updated;
  }

  async deleteItem(id: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // Customers
  async getCustomersByShopId(shopId: string): Promise<Customer[]> {
    return db
      .select()
      .from(customers)
      .where(eq(customers.shopId, shopId))
      .orderBy(desc(customers.lastVisit));
  }

  async getCustomerByPhone(shopId: string, phone: string): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.shopId, shopId), eq(customers.phone, phone)));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [created] = await db.insert(customers).values(customer).returning();
    return created;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db
      .update(customers)
      .set(customer)
      .where(eq(customers.id, id))
      .returning();
    return updated;
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  // Customer Sessions
  async getSessionByToken(token: string): Promise<CustomerSession | undefined> {
    const [session] = await db
      .select()
      .from(customerSessions)
      .where(eq(customerSessions.sessionToken, token));
    return session;
  }

  async createSession(session: InsertCustomerSession): Promise<CustomerSession> {
    const [created] = await db.insert(customerSessions).values(session).returning();
    return created;
  }

  async updateSession(id: string, session: Partial<InsertCustomerSession>): Promise<CustomerSession | undefined> {
    const [updated] = await db
      .update(customerSessions)
      .set({ ...session, lastActivityAt: new Date() })
      .where(eq(customerSessions.id, id))
      .returning();
    return updated;
  }

  // User Behaviors
  async createBehavior(behavior: InsertUserBehavior): Promise<UserBehavior> {
    const [created] = await db.insert(userBehaviors).values(behavior).returning();
    return created;
  }

  async getBehaviorsByShopId(shopId: string, limit = 100): Promise<UserBehavior[]> {
    return db
      .select()
      .from(userBehaviors)
      .where(eq(userBehaviors.shopId, shopId))
      .orderBy(desc(userBehaviors.occurredAt))
      .limit(limit);
  }

  // Orders
  async getOrdersByShopId(shopId: string): Promise<Order[]> {
    return db
      .select()
      .from(orders)
      .where(eq(orders.shopId, shopId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByCustomerPhone(shopId: string, phone: string): Promise<Order[]> {
    // First find the customer by phone
    const customer = await this.getCustomerByPhone(shopId, phone);
    if (!customer) {
      return [];
    }
    // Get orders for this customer
    return db
      .select()
      .from(orders)
      .where(and(eq(orders.shopId, shopId), eq(orders.customerId, customer.id)))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({ ...order, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  // Order Items
  async getOrderItemsByOrderId(orderId: string): Promise<OrderItem[]> {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    
    // Fetch menu items to get images for each order item
    const itemsWithImages = await Promise.all(
      items.map(async (item) => {
        const menuItem = await this.getItemById(item.itemId);
        // Return item with image as an extended OrderItem
        return {
          ...item,
          image: menuItem?.image || null,
        };
      })
    );
    
    // TypeScript cast - image is added but not in base OrderItem type
    return itemsWithImages as any;
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [created] = await db.insert(orderItems).values(item).returning();
    return created;
  }

  // Offers
  async getOffersByShopId(shopId: string): Promise<Offer[]> {
    return db
      .select()
      .from(offers)
      .where(eq(offers.shopId, shopId))
      .orderBy(desc(offers.createdAt));
  }

  async getActiveOffersByShopId(shopId: string): Promise<Offer[]> {
    return db
      .select()
      .from(offers)
      .where(and(eq(offers.shopId, shopId), eq(offers.isActive, true)))
      .orderBy(desc(offers.createdAt));
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    const [created] = await db.insert(offers).values(offer).returning();
    return created;
  }

  async updateOffer(id: string, offer: Partial<InsertOffer>): Promise<Offer | undefined> {
    const [updated] = await db
      .update(offers)
      .set(offer)
      .where(eq(offers.id, id))
      .returning();
    return updated;
  }

  async deleteOffer(id: string): Promise<void> {
    await db.delete(offers).where(eq(offers.id, id));
  }

  // Super Admin Offers
  async getAllOffers(): Promise<Offer[]> {
    return db
      .select()
      .from(offers)
      .orderBy(desc(offers.createdAt));
  }

  async getAllOffersWithShopDetails(): Promise<Array<Offer & { shopName: string; shopSlug: string }>> {
    const allOffers = await db
      .select({
        offer: offers,
        shopName: shops.shopName,
        shopSlug: shops.slug,
      })
      .from(offers)
      .leftJoin(shops, eq(offers.shopId, shops.id))
      .orderBy(desc(offers.createdAt));

    return allOffers.map((row) => ({
      ...row.offer,
      shopName: row.shopName || "Unknown Shop",
      shopSlug: row.shopSlug || "",
    })) as Array<Offer & { shopName: string; shopSlug: string }>;
  }

  async getOfferStats(): Promise<{
    totalOffers: number;
    activeOffers: number;
    expiringSoon: number;
    expiredOffers: number;
  }> {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const [totalResult] = await db.select({ count: count() }).from(offers);
    const [activeResult] = await db
      .select({ count: count() })
      .from(offers)
      .where(eq(offers.isActive, true));

    // Offers expiring within next 7 days (and still active)
    const [expiringResult] = await db
      .select({ count: count() })
      .from(offers)
      .where(
        and(
          eq(offers.isActive, true),
          sql`${offers.expiryDate} IS NOT NULL`,
          gte(offers.expiryDate, now),
          lte(offers.expiryDate, sevenDaysFromNow)
        )
      );

    // Expired offers (expiry date passed or isActive is false with expiry)
    const [expiredResult] = await db
      .select({ count: count() })
      .from(offers)
      .where(
        or(
          sql`${offers.expiryDate} IS NOT NULL AND ${offers.expiryDate} < ${now}`,
          and(eq(offers.isActive, false), sql`${offers.expiryDate} IS NOT NULL`)
        )
      );

    return {
      totalOffers: totalResult?.count || 0,
      activeOffers: activeResult?.count || 0,
      expiringSoon: expiringResult?.count || 0,
      expiredOffers: expiredResult?.count || 0,
    };
  }

  // Profiles
  async getProfileByUserId(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const [created] = await db.insert(profiles).values(profile).returning();
    return created;
  }

  async updateProfile(id: string, profile: Partial<InsertProfile>): Promise<Profile | undefined> {
    const [updated] = await db
      .update(profiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();
    return updated;
  }

  // Analytics
  async getShopStats(shopId: string): Promise<{
    todayOrders: number;
    totalRevenue: number;
    activeMenuItems: number;
    totalCustomers: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [ordersResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(and(eq(orders.shopId, shopId), sql`${orders.createdAt} >= ${today}`));

    const [revenueResult] = await db
      .select({ total: sum(orders.totalAmount) })
      .from(orders)
      .where(eq(orders.shopId, shopId));

    const [itemsResult] = await db
      .select({ count: count() })
      .from(menuItems)
      .where(and(eq(menuItems.shopId, shopId), eq(menuItems.isAvailable, true)));

    const [customersResult] = await db
      .select({ count: count() })
      .from(customers)
      .where(eq(customers.shopId, shopId));

    return {
      todayOrders: ordersResult?.count || 0,
      totalRevenue: Number(revenueResult?.total) || 0,
      activeMenuItems: itemsResult?.count || 0,
      totalCustomers: customersResult?.count || 0,
    };
  }

  async getTodayDashboard(shopId: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    cashRevenue: number;
    upiRevenue: number;
    paidOrders: number;
    pendingOrders: number;
    uniqueCustomers: number;
    avgBillValue: number;
    topSellingItem: { name: string; count: number } | null;
    peakHour: { hour: string; count: number } | null;
    recentOrders: Order[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's orders
    const todayOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.shopId, shopId),
          gte(orders.createdAt, today),
          lte(orders.createdAt, tomorrow)
        )
      )
      .orderBy(desc(orders.createdAt));

    const totalOrders = todayOrders.length;
    const totalRevenue = todayOrders
      .filter((o) => o.status === "paid" || o.status === "completed")
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const cashRevenue = todayOrders
      .filter((o) => o.paymentMode === "cash" && (o.status === "paid" || o.status === "completed"))
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const upiRevenue = todayOrders
      .filter((o) => o.paymentMode === "upi" && (o.status === "paid" || o.status === "completed"))
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const paidOrders = todayOrders.filter(
      (o) => o.status === "paid" || o.status === "completed"
    ).length;

    const pendingOrders = todayOrders.filter(
      (o) => o.status === "pending_payment"
    ).length;

    const uniqueCustomerIds = new Set(
      todayOrders.filter((o) => o.customerId).map((o) => o.customerId)
    );
    const uniqueCustomers = uniqueCustomerIds.size;

    const avgBillValue = paidOrders > 0 ? totalRevenue / paidOrders : 0;

    // Get top selling item today
    let topSellingItem: { name: string; count: number } | null = null;
    if (todayOrders.length > 0) {
      const orderIds = todayOrders.map((o) => o.id);
      const todayOrderItems = await db
        .select()
        .from(orderItems)
        .where(sql`${orderItems.orderId} = ANY(${orderIds})`);

      const itemCounts: Record<string, { name: string; count: number }> = {};
      for (const item of todayOrderItems) {
        if (itemCounts[item.itemName]) {
          itemCounts[item.itemName].count += item.quantity;
        } else {
          itemCounts[item.itemName] = { name: item.itemName, count: item.quantity };
        }
      }

      let maxCount = 0;
      for (const itemData of Object.values(itemCounts)) {
        if (itemData.count > maxCount) {
          maxCount = itemData.count;
          topSellingItem = itemData;
        }
      }
    }

    // Get peak hour
    let peakHour: { hour: string; count: number } | null = null;
    if (todayOrders.length > 0) {
      const hourCounts: Record<number, number> = {};
      for (const order of todayOrders) {
        if (order.createdAt) {
          const hour = new Date(order.createdAt).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      }

      let maxCount = 0;
      let peakHourNum = 0;
      for (const [hour, orderCount] of Object.entries(hourCounts)) {
        if (orderCount > maxCount) {
          maxCount = orderCount;
          peakHourNum = parseInt(hour, 10);
        }
      }
      
      if (maxCount > 0) {
        const hourStr = peakHourNum === 0 ? "12 AM" : 
                        peakHourNum < 12 ? `${peakHourNum} AM` :
                        peakHourNum === 12 ? "12 PM" :
                        `${peakHourNum - 12} PM`;
        peakHour = { hour: hourStr, count: maxCount };
      }
    }

    return {
      totalOrders,
      totalRevenue,
      cashRevenue,
      upiRevenue,
      paidOrders,
      pendingOrders,
      uniqueCustomers,
      avgBillValue,
      topSellingItem,
      peakHour,
      recentOrders: todayOrders.slice(0, 5),
    };
  }

  async getSuperAdminStats(): Promise<{
    totalShops: number;
    activeShops: number;
    totalOrders: number;
    totalRevenue: number;
  }> {
    const [shopsResult] = await db.select({ count: count() }).from(shops);
    const [activeShopsResult] = await db
      .select({ count: count() })
      .from(shops)
      .where(eq(shops.isActive, true));
    const [ordersResult] = await db.select({ count: count() }).from(orders);
    const [revenueResult] = await db.select({ total: sum(orders.totalAmount) }).from(orders);

    return {
      totalShops: shopsResult?.count || 0,
      activeShops: activeShopsResult?.count || 0,
      totalOrders: ordersResult?.count || 0,
      totalRevenue: Number(revenueResult?.total) || 0,
    };
  }

  async getAnalyticsOrders(filters: {
    shopId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<{
    id: string;
    shopId: string;
    shopName: string;
    shopLogo: string | null;
    shopPhone: string | null;
    shopAddress: string | null;
    shopUpiId: string | null;
    customerName: string | null;
    customerPhone: string | null;
    deliveryAddress: string | null;
    orderNumber: string | null;
    billNumber: string | null;
    items: { itemName: string; quantity: number; price: string }[];
    subtotal: string;
    discountAmount: string | null;
    deliveryCharge: string | null;
    totalAmount: string;
    paymentMode: string | null;
    status: string;
    createdAt: Date | null;
  }[]> {
    const conditions = [];
    
    if (filters.shopId) {
      conditions.push(eq(orders.shopId, filters.shopId));
    }
    if (filters.status) {
      conditions.push(eq(orders.status, filters.status));
    }
    if (filters.startDate) {
      conditions.push(gte(orders.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(orders.createdAt, endOfDay));
    }

    const ordersData = conditions.length > 0
      ? await db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt))
      : await db.select().from(orders).orderBy(desc(orders.createdAt));

    const result = await Promise.all(ordersData.map(async (order) => {
      const [shop] = await db.select().from(shops).where(eq(shops.id, order.shopId));
      const customer = order.customerId 
        ? (await db.select().from(customers).where(eq(customers.id, order.customerId)))[0]
        : null;
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

      return {
        id: order.id,
        shopId: order.shopId,
        shopName: shop?.shopName || "Unknown Shop",
        shopLogo: shop?.logo || null,
        shopPhone: shop?.whatsappNumber || null,
        shopAddress: shop?.address || null,
        shopUpiId: shop?.upiId || null,
        customerName: customer?.name || null,
        customerPhone: customer?.phone || null,
        deliveryAddress: order.deliveryAddress,
        orderNumber: order.orderNumber,
        billNumber: order.billNumber,
        items: items.map(i => ({ itemName: i.itemName, quantity: i.quantity, price: i.price })),
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        deliveryCharge: order.deliveryCharge,
        totalAmount: order.totalAmount,
        paymentMode: order.paymentMode,
        status: order.status,
        createdAt: order.createdAt,
      };
    }));

    return result;
  }

  // Page Visits
  async createPageVisit(visit: InsertPageVisit): Promise<PageVisit> {
    const [created] = await db.insert(pageVisits).values(visit).returning();
    return created;
  }

  async getAllPageVisits(filters?: {
    startDate?: Date;
    endDate?: Date;
    page?: string;
    deviceType?: string;
  }): Promise<PageVisit[]> {
    const conditions = [];
    
    if (filters?.page) {
      conditions.push(sql`${pageVisits.page} ILIKE ${'%' + filters.page + '%'}`);
    }
    if (filters?.deviceType) {
      conditions.push(eq(pageVisits.deviceType, filters.deviceType));
    }
    if (filters?.startDate) {
      conditions.push(gte(pageVisits.visitedAt, filters.startDate));
    }
    if (filters?.endDate) {
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(pageVisits.visitedAt, endOfDay));
    }

    if (conditions.length === 0) {
      return db.select().from(pageVisits).orderBy(desc(pageVisits.visitedAt)).limit(1000);
    } else if (conditions.length === 1) {
      return db.select().from(pageVisits).where(conditions[0]).orderBy(desc(pageVisits.visitedAt)).limit(1000);
    } else {
      return db.select().from(pageVisits).where(and(...conditions)).orderBy(desc(pageVisits.visitedAt)).limit(1000);
    }
  }

  // ============================================
  // STORE AVAILABILITY IMPLEMENTATION
  // ============================================

  async getStoreAvailability(shopId: string): Promise<StoreAvailability | undefined> {
    const result = await db.select().from(storeAvailability).where(eq(storeAvailability.shopId, shopId));
    return result[0] as StoreAvailability | undefined;
  }

  async updateStoreAvailability(id: string, data: Partial<InsertStoreAvailability>): Promise<StoreAvailability> {
    const [updated] = await db
      .update(storeAvailability)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(storeAvailability.id, id))
      .returning();
    return updated as StoreAvailability;
  }

  async createOrUpdateStoreAvailability(shopId: string, data: Partial<InsertStoreAvailability>): Promise<StoreAvailability> {
    const existing = await this.getStoreAvailability(shopId);
    
    if (existing) {
      const [updated] = await db
        .update(storeAvailability)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(storeAvailability.shopId, shopId))
        .returning();
      return updated as StoreAvailability;
    } else {
      const [created] = await db
        .insert(storeAvailability)
        .values({ shopId, ...data })
        .returning();
      return created as StoreAvailability;
    }
  }

  async getStoreHolidays(shopId: string): Promise<StoreHoliday[]> {
    const result = await db
      .select()
      .from(storeHolidays)
      .where(eq(storeHolidays.shopId, shopId))
      .orderBy(storeHolidays.holidayDate);
    return result as StoreHoliday[];
  }

  async addStoreHoliday(holiday: InsertStoreHoliday): Promise<StoreHoliday> {
    const [created] = await db.insert(storeHolidays).values(holiday).returning();
    return created as StoreHoliday;
  }

  async deleteStoreHoliday(id: string): Promise<void> {
    await db.delete(storeHolidays).where(eq(storeHolidays.id, id));
  }

  async bulkAddStoreHolidays(shopId: string, holidays: Array<{ holidayDate: string; name: string }>): Promise<StoreHoliday[]> {
    if (holidays.length === 0) return [];
    
    const values = holidays.map(h => ({
      shopId,
      holidayDate: h.holidayDate,
      name: h.name,
    }));
    
    const result = await db.insert(storeHolidays).values(values).returning();
    return result as StoreHoliday[];
  }

  async getStoreStatus(shopId: string): Promise<StoreStatusResponse> {
    // Get store availability settings
    const availability = await this.getStoreAvailability(shopId);
    
    // Default values if not set
    const openingTime = availability?.openingTime || "09:00";
    const closingTime = availability?.closingTime || "22:00";
    const timezone = availability?.timezone || "Asia/Kolkata";
    const manualOverride = availability?.manualOverride || "none";
    const overrideReason = availability?.overrideReason || null;

    // Get today's holidays
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const holidays = await this.getStoreHolidays(shopId);
    const todayHoliday = holidays.find(h => h.holidayDate === todayStr);

    // Get current time in store's timezone
    let currentTime: Date;
    try {
      // Use Intl.DateTimeFormat to get time in the store's timezone
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      
      // Create a date string in the target timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        ...options,
        timeZone: timezone,
      });
      
      // Parse the formatted date back to a Date object
      const parts = formatter.formatToParts(now);
      const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';
      
      currentTime = new Date(
        parseInt(getPart('year')),
        parseInt(getPart('month')) - 1,
        parseInt(getPart('day')),
        parseInt(getPart('hour')),
        parseInt(getPart('minute')),
        parseInt(getPart('second'))
      );
    } catch {
      // Fallback to server time if timezone is invalid
      currentTime = new Date();
    }

    // Calculate current minutes since midnight
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Parse opening and closing times
    const [openHour, openMin] = openingTime.split(':').map(Number);
    const [closeHour, closeMin] = closingTime.split(':').map(Number);
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;

    // Priority 1: Manual Override - Force Close
    if (manualOverride === 'force_close') {
      return {
        isOpen: false,
        status: 'force_close',
        message: overrideReason || 'Temporarily Closed',
        openingTime,
        closingTime,
        timezone,
      };
    }

    // Priority 2: Manual Override - Force Open
    if (manualOverride === 'force_open') {
      return {
        isOpen: true,
        status: 'force_open',
        message: overrideReason || 'Open (Manually Opened)',
        openingTime,
        closingTime,
        timezone,
      };
    }

    // Priority 3: Holiday Check
    if (todayHoliday) {
      return {
        isOpen: false,
        status: 'holiday',
        message: `Closed (${todayHoliday.name})`,
        holidayName: todayHoliday.name,
        openingTime,
        closingTime,
        timezone,
      };
    }

    // Priority 4: Time-based check - Before opening
    if (currentMinutes < openMinutes) {
      return {
        isOpen: false,
        status: 'opens_later',
        message: `Opens at ${openingTime}`,
        nextOpenTime: openingTime,
        openingTime,
        closingTime,
        timezone,
      };
    }

    // Priority 5: Time-based check - After closing
    if (currentMinutes >= closeMinutes) {
      return {
        isOpen: false,
        status: 'closed',
        message: 'Closed',
        openingTime,
        closingTime,
        timezone,
      };
    }

    // Store is open
    return {
      isOpen: true,
      status: 'open',
      message: 'Open',
      openingTime,
      closingTime,
      timezone,
    };
  }

  // ============================================
  // DELIVERY CHARGE REASONS IMPLEMENTATION
  // ============================================

  async getDeliveryChargeReasons(shopId: string): Promise<DeliveryChargeReason[]> {
    return db
      .select()
      .from(deliveryChargeReasons)
      .where(eq(deliveryChargeReasons.shopId, shopId))
      .orderBy(deliveryChargeReasons.createdAt);
  }

  async createDeliveryChargeReason(reason: InsertDeliveryChargeReason): Promise<DeliveryChargeReason> {
    const [created] = await db.insert(deliveryChargeReasons).values(reason).returning();
    return created;
  }

  async updateDeliveryChargeReason(id: string, reason: Partial<InsertDeliveryChargeReason>): Promise<DeliveryChargeReason | undefined> {
    const [updated] = await db
      .update(deliveryChargeReasons)
      .set(reason)
      .where(eq(deliveryChargeReasons.id, id))
      .returning();
    return updated;
  }

  async deleteDeliveryChargeReason(id: string): Promise<void> {
    await db.delete(deliveryChargeReasons).where(eq(deliveryChargeReasons.id, id));
  }

  async setDefaultDeliveryChargeReason(shopId: string, id: string): Promise<void> {
    // First, unset all defaults for this shop
    await db
      .update(deliveryChargeReasons)
      .set({ isDefault: false })
      .where(eq(deliveryChargeReasons.shopId, shopId));

    // Then set the new default
    await db
      .update(deliveryChargeReasons)
      .set({ isDefault: true })
      .where(eq(deliveryChargeReasons.id, id));
  }
}

export const storage = new DatabaseStorage();
