-- Add new columns to shops table
ALTER TABLE "shops" ADD COLUMN "super_admin_whatsapp" varchar(20);
ALTER TABLE "shops" ADD COLUMN "allowed_pin_codes" text DEFAULT '495118';