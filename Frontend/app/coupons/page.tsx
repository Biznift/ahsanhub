import type { Metadata } from "next";
import { getCouponDeals } from "@/lib/api";
import { Container } from "@/components/section";
import { PageHeader } from "@/components/page-header";
import { CouponGrid } from "@/components/coupon-card";

export const metadata: Metadata = {
  title: "Coupon codes",
  description: "Special deals and coupon codes for products listed on Ahsan Hub.",
  alternates: { canonical: "/coupons" },
};

export default async function CouponsPage() {
  const deals = await getCouponDeals();
  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Home" }, { label: "Coupon codes" }]}
        title="Coupon codes"
        description="Special deals for products already on Ahsan Hub. The code stays hidden until you have an account. A new account only needs your name, email, and phone. The button opens the product website unless a special offer link is set."
      />
      <Container className="py-10">
        {deals.length === 0 ? (
          <p className="text-[15px] text-muted">No coupon codes are live right now.</p>
        ) : (
          <CouponGrid items={deals} />
        )}
      </Container>
    </>
  );
}
