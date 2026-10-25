-- Phone is the extra detail a visitor gives when creating an account to see coupon codes.
ALTER TABLE "User" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';
