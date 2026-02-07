CREATE TABLE "customer_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar NOT NULL,
	"customer_id" varchar,
	"session_token" varchar(64) NOT NULL,
	"device_fingerprint" varchar(64),
	"device_type" varchar(50),
	"os" varchar(50),
	"browser" varchar(50),
	"user_agent" text,
	"screen_width" integer,
	"screen_height" integer,
	"language" varchar(10),
	"ip_address" varchar(45),
	"city" varchar(100),
	"started_at" timestamp DEFAULT now(),
	"last_activity_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	CONSTRAINT "customer_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar NOT NULL,
	"name" varchar(200) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"first_visit" timestamp DEFAULT now(),
	"last_visit" timestamp DEFAULT now(),
	"last_order_at" timestamp,
	"total_visits" integer DEFAULT 1 NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_spent" numeric(10, 2) DEFAULT '0' NOT NULL,
	"avg_bill" numeric(10, 2) DEFAULT '0' NOT NULL,
	"device_type" varchar(50),
	"os" varchar(50),
	"browser" varchar(50),
	"screen_width" integer,
	"screen_height" integer,
	"language" varchar(10),
	"ip_address" varchar(45),
	"city" varchar(100),
	"has_consent" boolean DEFAULT false NOT NULL,
	"last_offer_sent" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar NOT NULL,
	"name" varchar(100) NOT NULL,
	"order_no" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar NOT NULL,
	"category_id" varchar,
	"name" varchar(200) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"image" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_veg" boolean DEFAULT false,
	"is_bestseller" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"discount_type" varchar(20) DEFAULT 'percentage' NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"min_visits" integer DEFAULT 0,
	"min_order_amount" numeric(10, 2),
	"expiry_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"item_id" varchar NOT NULL,
	"item_name" varchar(200) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar NOT NULL,
	"customer_id" varchar,
	"order_number" varchar(20),
	"table_qr" varchar(50),
	"delivery_address" text,
	"subtotal" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"delivery_charge" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(10, 2) NOT NULL,
	"status" varchar(30) DEFAULT 'pending_payment' NOT NULL,
	"payment_mode" varchar(30),
	"payment_reference" varchar(100),
	"payment_verified_at" timestamp,
	"payment_verified_by" varchar,
	"bill_number" varchar(20),
	"bill_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "page_visits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page" varchar(200) NOT NULL,
	"shop_id" varchar,
	"os" varchar(50),
	"browser" varchar(50),
	"device_type" varchar(20),
	"user_agent" text,
	"ip_hash" varchar(64),
	"city" varchar(100),
	"visited_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar(20) DEFAULT 'shop_admin' NOT NULL,
	"shop_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shop_sections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar NOT NULL,
	"section_type" varchar(50) NOT NULL,
	"title" varchar(200),
	"description" text,
	"image_url" text,
	"order_no" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shop_themes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"primary_color" varchar(7) DEFAULT '#2563eb' NOT NULL,
	"secondary_color" varchar(7) DEFAULT '#f59e0b' NOT NULL,
	"font_family" varchar(100) DEFAULT 'Plus Jakarta Sans' NOT NULL,
	"button_style" varchar(20) DEFAULT 'rounded' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"shop_name" varchar(200) NOT NULL,
	"logo" text,
	"banner" text,
	"whatsapp_number" varchar(20),
	"address" text,
	"about" text,
	"theme_id" varchar,
	"admin_password" varchar(100) DEFAULT 'shop123' NOT NULL,
	"upi_id" varchar(255),
	"upi_qr_image" text,
	"gst_number" varchar(20),
	"delivery_charge" numeric(10, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "shops_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_behaviors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar NOT NULL,
	"customer_id" varchar,
	"session_id" varchar,
	"event_type" varchar(50) NOT NULL,
	"item_id" varchar,
	"page" varchar(100),
	"time_spent" integer,
	"metadata" jsonb,
	"occurred_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_item_id_menu_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_visits" ADD CONSTRAINT "page_visits_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_sections" ADD CONSTRAINT "shop_sections_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_theme_id_shop_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."shop_themes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_behaviors" ADD CONSTRAINT "user_behaviors_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_behaviors" ADD CONSTRAINT "user_behaviors_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_behaviors" ADD CONSTRAINT "user_behaviors_session_id_customer_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."customer_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_behaviors" ADD CONSTRAINT "user_behaviors_item_id_menu_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sessions_shop" ON "customer_sessions" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_customer" ON "customer_sessions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_token" ON "customer_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "idx_customers_shop" ON "customers" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "idx_customers_phone" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_menu_categories_shop" ON "menu_categories" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "idx_menu_items_shop" ON "menu_items" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "idx_menu_items_category" ON "menu_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_offers_shop" ON "offers" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_shop" ON "orders" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "idx_orders_customer" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_orders_created" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_page_visits_shop" ON "page_visits" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "idx_page_visits_page" ON "page_visits" USING btree ("page");--> statement-breakpoint
CREATE INDEX "idx_page_visits_visited" ON "page_visits" USING btree ("visited_at");--> statement-breakpoint
CREATE INDEX "idx_profiles_user" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_profiles_shop" ON "profiles" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "idx_shop_sections_shop" ON "shop_sections" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "idx_shops_slug" ON "shops" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_behaviors_shop" ON "user_behaviors" USING btree ("shop_id");--> statement-breakpoint
CREATE INDEX "idx_behaviors_customer" ON "user_behaviors" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_behaviors_session" ON "user_behaviors" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_behaviors_event" ON "user_behaviors" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_behaviors_occurred" ON "user_behaviors" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");