import type { Metadata } from "next";
import { getCategories } from "@/lib/api";
import { Container } from "@/components/section";
import { PageHeader } from "@/components/page-header";
import { SubmitForm } from "@/components/submit-form";

export const metadata: Metadata = {
  title: "Submit your product",
  description: "List your halal software, SaaS or business on Ahsan Hub for free. Add your company, founders and links, and we review it by hand.",
  alternates: { canonical: "/submit" },
};

export default async function SubmitPage() {
  const categories = await getCategories();
  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "Home" }, { label: "Submit" }]}
        title="Submit your product"
        description="Free to list. Fill in what you can, every field marked with a star is required. A person reviews each submission before it goes live."
      />
      <Container className="py-10">
        <SubmitForm categories={categories} />
      </Container>
    </>
  );
}
