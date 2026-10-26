-- Reason and optional screenshot shown to the submitter when a listing is rejected.
ALTER TABLE "Listing" ADD COLUMN "rejectNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Listing" ADD COLUMN "rejectImage" TEXT;
