-- Add missing delivery charge related columns to shops table
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "delivery_charge_reason" varchar(255);
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "free_delivery_threshold" decimal(10, 2);

-- Add delivery charge columns to menu_categories table
ALTER TABLE "menu_categories" ADD COLUMN IF NOT EXISTS "delivery_charge" decimal(10, 2) DEFAULT '0';
ALTER TABLE "menu_categories" ADD COLUMN IF NOT EXISTS "delivery_charge_label" varchar(100);
