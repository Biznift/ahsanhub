-- Short offer line shown before a visitor opens the code. Instructions stay in "note".
ALTER TABLE "CouponDeal" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';
