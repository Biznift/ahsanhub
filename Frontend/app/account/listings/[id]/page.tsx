import type { Metadata } from "next";
import { getCategories } from "@/lib/api";
import { Container } from "@/components/section";
import { EditListing } from "@/components/edit-listing";

export const metadata: Metadata = { title: "Edit listing", robots: { index: false } };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, categories] = await Promise.all([params, getCategories()]);
  return (
    <Container className="py-12">
      <EditListing id={id} categories={categories} />
    </Container>
  );
}
