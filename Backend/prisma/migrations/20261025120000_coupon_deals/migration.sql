-- Special deals that point at a listing already on the site.
CREATE TABLE "CouponDeal" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "ctaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ctaLabel" TEXT NOT NULL DEFAULT '',
    "ctaUrl" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouponDeal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CouponDeal_active_sortOrder_idx" ON "CouponDeal"("active", "sortOrder");

CREATE INDEX "CouponDeal_listingId_idx" ON "CouponDeal"("listingId");

ALTER TABLE "CouponDeal" ADD CONSTRAINT "CouponDeal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
