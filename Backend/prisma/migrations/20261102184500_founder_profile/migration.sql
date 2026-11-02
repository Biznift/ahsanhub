-- Personal founder details live on the account. Linked founder rows reuse them across listings.
ALTER TABLE "User" ADD COLUMN "photo" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "socials" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "Founder" ADD COLUMN "userId" TEXT;

CREATE INDEX "Founder_userId_idx" ON "Founder"("userId");

ALTER TABLE "Founder" ADD CONSTRAINT "Founder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
