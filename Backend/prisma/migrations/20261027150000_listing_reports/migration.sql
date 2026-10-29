-- Private visitor reports about a listing. They stay off the public page.
CREATE TYPE "ListingReportReason" AS ENUM ('not_halal', 'halal_claim', 'wrong_info', 'broken_link', 'spam', 'other');

CREATE TYPE "ListingReportStatus" AS ENUM ('open', 'reviewed', 'dismissed', 'actioned');

CREATE TABLE "ListingReport" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "reason" "ListingReportReason" NOT NULL,
    "body" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "status" "ListingReportStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListingReport_listingId_status_idx" ON "ListingReport"("listingId", "status");

CREATE INDEX "ListingReport_status_createdAt_idx" ON "ListingReport"("status", "createdAt");

ALTER TABLE "ListingReport" ADD CONSTRAINT "ListingReport_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
