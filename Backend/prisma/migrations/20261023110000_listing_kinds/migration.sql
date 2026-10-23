-- CreateEnum
CREATE TYPE "ListingKind" AS ENUM ('software', 'service', 'ecommerce');
CREATE TYPE "CategoryStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "kind" "ListingKind" NOT NULL DEFAULT 'software';
ALTER TABLE "Category" ADD COLUMN "status" "CategoryStatus" NOT NULL DEFAULT 'approved';
DROP INDEX "Category_name_key";
CREATE UNIQUE INDEX "Category_kind_name_key" ON "Category"("kind", "name");
CREATE INDEX "Category_kind_status_idx" ON "Category"("kind", "status");

ALTER TABLE "Listing" ADD COLUMN "kind" "ListingKind" NOT NULL DEFAULT 'software';
CREATE INDEX "Listing_status_kind_idx" ON "Listing"("status", "kind");

-- Starter categories for the two new listing types. Existing software categories stay as they are.
INSERT INTO "Category" ("id", "name", "slug", "description", "hidden", "sortOrder", "createdAt", "kind", "status")
VALUES
  ('cat_service_consulting', 'Consulting', 'consulting', '', false, 0, CURRENT_TIMESTAMP, 'service', 'approved'),
  ('cat_service_tutoring', 'Tutoring', 'tutoring', '', false, 1, CURRENT_TIMESTAMP, 'service', 'approved'),
  ('cat_service_translation', 'Translation', 'translation', '', false, 2, CURRENT_TIMESTAMP, 'service', 'approved'),
  ('cat_service_web_development', 'Web development', 'web-development', '', false, 3, CURRENT_TIMESTAMP, 'service', 'approved'),
  ('cat_service_accounting', 'Accounting', 'accounting', '', false, 4, CURRENT_TIMESTAMP, 'service', 'approved'),
  ('cat_service_marketing', 'Marketing services', 'marketing-services', '', false, 5, CURRENT_TIMESTAMP, 'service', 'approved'),
  ('cat_service_design', 'Design services', 'design-services', '', false, 6, CURRENT_TIMESTAMP, 'service', 'approved'),
  ('cat_shop_books', 'Islamic books', 'islamic-books', '', false, 0, CURRENT_TIMESTAMP, 'ecommerce', 'approved'),
  ('cat_shop_fashion', 'Modest fashion', 'modest-fashion', '', false, 1, CURRENT_TIMESTAMP, 'ecommerce', 'approved'),
  ('cat_shop_groceries', 'Halal groceries', 'halal-groceries', '', false, 2, CURRENT_TIMESTAMP, 'ecommerce', 'approved'),
  ('cat_shop_home', 'Home and living', 'home-and-living', '', false, 3, CURRENT_TIMESTAMP, 'ecommerce', 'approved'),
  ('cat_shop_gifts', 'Gifts', 'gifts', '', false, 4, CURRENT_TIMESTAMP, 'ecommerce', 'approved'),
  ('cat_shop_wellness', 'Health and wellness', 'health-and-wellness', '', false, 5, CURRENT_TIMESTAMP, 'ecommerce', 'approved')
ON CONFLICT ("slug") DO NOTHING;
