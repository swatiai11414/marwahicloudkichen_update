-- ============================================
-- Store Availability & Holidays Tables
-- ============================================

-- Create store_availability table
CREATE TABLE "store_availability" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar NOT NULL REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action,
	"opening_time" varchar(5) NOT NULL DEFAULT '09:00',
	"closing_time" varchar(5) NOT NULL DEFAULT '22:00',
	"timezone" varchar(50) NOT NULL DEFAULT 'Asia/Kolkata',
	"manual_override" varchar(20) NOT NULL DEFAULT 'none',
	"override_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Create index for store_availability
CREATE INDEX "idx_store_availability_shop" ON "store_availability" USING btree ("shop_id");

-- Create store_holidays table
CREATE TABLE "store_holidays" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar NOT NULL REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action,
	"holiday_date" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Create indexes for store_holidays
CREATE INDEX "idx_store_holidays_shop" ON "store_holidays" USING btree ("shop_id");
CREATE INDEX "idx_store_holidays_date" ON "store_holidays" USING btree ("holiday_date");

-- Create delivery_charge_reasons table
CREATE TABLE "delivery_charge_reasons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_id" varchar NOT NULL REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action,
	"reason" varchar(255) NOT NULL,
	"is_default" boolean NOT NULL DEFAULT false,
	"is_active" boolean NOT NULL DEFAULT true,
	"created_at" timestamp DEFAULT now()
);

-- Create index for delivery_charge_reasons
CREATE INDEX "idx_delivery_reasons_shop" ON "delivery_charge_reasons" USING btree ("shop_id");
