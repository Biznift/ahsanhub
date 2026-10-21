import type { Metadata } from "next";
import { Container } from "@/components/section";
import { AccountListings } from "@/components/account-listings";

export const metadata: Metadata = { title: "My listings", robots: { index: false } };

export default function AccountPage() {
  return (
    <Container className="py-12">
      <AccountListings />
    </Container>
  );
}
