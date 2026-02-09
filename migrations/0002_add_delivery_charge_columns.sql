-- Add missing delivery charge related columns to shops table
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "delivery_charge_reason" varchar(255);
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "free_delivery_threshold" decimal(10, 2);
