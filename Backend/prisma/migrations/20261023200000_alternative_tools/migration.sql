-- Named alternative tools are their own list, so a name can be reused on later listings.
CREATE TABLE "AlternativeTool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlternativeTool_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AlternativeTool_slug_key" ON "AlternativeTool"("slug");

-- Keep any listing-to-listing links by turning the target listing into a saved tool name.
INSERT INTO "AlternativeTool" ("id", "name", "slug", "createdAt")
SELECT "id", "name", "slug", CURRENT_TIMESTAMP
FROM "Listing"
WHERE "id" IN (SELECT "alternativeId" FROM "ListingAlternative")
ON CONFLICT ("slug") DO NOTHING;

CREATE TABLE "ListingAlternative_new" (
    "listingId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,

    CONSTRAINT "ListingAlternative_new_pkey" PRIMARY KEY ("listingId", "toolId")
);

INSERT INTO "ListingAlternative_new" ("listingId", "toolId")
SELECT la."listingId", t."id"
FROM "ListingAlternative" la
JOIN "Listing" l ON l."id" = la."alternativeId"
JOIN "AlternativeTool" t ON t."slug" = l."slug";

DROP TABLE "ListingAlternative";

ALTER TABLE "ListingAlternative_new" RENAME TO "ListingAlternative";

ALTER TABLE "ListingAlternative" ADD CONSTRAINT "ListingAlternative_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ListingAlternative" ADD CONSTRAINT "ListingAlternative_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "AlternativeTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ListingAlternative_toolId_idx" ON "ListingAlternative"("toolId");
