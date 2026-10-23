CREATE TABLE "ListingAlternative" (
    "listingId" TEXT NOT NULL,
    "alternativeId" TEXT NOT NULL,

    CONSTRAINT "ListingAlternative_pkey" PRIMARY KEY ("listingId", "alternativeId")
);

CREATE INDEX "ListingAlternative_alternativeId_idx" ON "ListingAlternative"("alternativeId");

ALTER TABLE "ListingAlternative" ADD CONSTRAINT "ListingAlternative_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ListingAlternative" ADD CONSTRAINT "ListingAlternative_alternativeId_fkey" FOREIGN KEY ("alternativeId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
