import type { Metadata } from "next";
import { getCategories } from "@/lib/api";
import { Container } from "@/components/section";
import { PageHeader } from "@/components/page-header";
import { SubmitForm } from "@/components/submit-form";

export const metadata: Metadata = {
  title: "Submit a listing",
  description: "List halal software, a service, or an online shop on Ahsan Hub for free. Pick your categories, or suggest a new one for review.",
  alternates: { canonical: "/submit" },
};

export default async function SubmitPage() {
  const categories = await getCategories();
  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Home" }, { label: "Submit" }]}
        title="Submit a listing"
        description="Software, a service, or a shop. Categories are a dropdown and you can select more than one. If yours is missing, add it and an admin will approve it."
      />
      <Container className="py-10">
        <SubmitForm categories={categories} />
      </Container>
    </>
  );
}
