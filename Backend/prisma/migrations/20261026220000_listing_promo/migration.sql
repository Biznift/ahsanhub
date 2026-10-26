-- Public page views, ad rotation counters, and admin pins. Daily events keep a refresh from counting twice.
ALTER TABLE "Listing" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Listing" ADD COLUMN "promoImpressions" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Listing" ADD COLUMN "promoClicks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Listing" ADD COLUMN "couponClicks" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ListingEvent" (
    "listingId" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "kind" TEXT NOT NULL,
    CONSTRAINT "ListingEvent_pkey" PRIMARY KEY ("listingId","visitorKey","day","kind")
);

CREATE INDEX "ListingEvent_listingId_day_idx" ON "ListingEvent"("listingId", "day");

ALTER TABLE "ListingEvent" ADD CONSTRAINT "ListingEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ListingMetric" (
    "listingId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "couponClicks" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ListingMetric_pkey" PRIMARY KEY ("listingId","day")
);

ALTER TABLE "ListingMetric" ADD CONSTRAINT "ListingMetric_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PromoPin" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromoPin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromoPin_listingId_key" ON "PromoPin"("listingId");

ALTER TABLE "PromoPin" ADD CONSTRAINT "PromoPin_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
