-- Additive and nullable: existing products retain all their current data.
ALTER TABLE "products" ADD COLUMN "price" DECIMAL(12,2);
