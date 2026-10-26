-- Admin-only flag: this product was already posted on social media.
ALTER TABLE "Listing" ADD COLUMN "socialPosted" BOOLEAN NOT NULL DEFAULT false;
