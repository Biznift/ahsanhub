-- Marks the coupon a listing owner sent with the product, separate from deals an admin adds later.
ALTER TABLE "CouponDeal" ADD COLUMN "fromListing" BOOLEAN NOT NULL DEFAULT false;
