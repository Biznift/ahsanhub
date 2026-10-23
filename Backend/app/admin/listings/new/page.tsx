"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/components/store";
import { api } from "@/components/admin-kit";
import { ListingEditor, type EditableListing } from "@/components/listing-editor";

const BLANK: EditableListing = {
  name: "",
  overview: "",
  description: "",
  website: "",
  logo: null,
  banner: null,
  pricing: "free",
  country: "",
  platforms: ["web"],
  halalNote: "",
  socials: {},
  contactEmail: "",
  kind: "software",
  categoryIds: [],
  founders: [],
  alternatives: [],
};

export default function NewListingPage() {
  const router = useRouter();
  const { notify } = useStore();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/listings" className="inline-flex items-center gap-1 text-sm font-medium text-[#667085] hover:text-[#0b6e4f]">
        <ArrowLeft size={15} /> Listings
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#1d2939]">Add a listing</h1>
      <p className="mt-1 text-sm text-[#667085]">This listing is published right away. You can still change its status afterwards.</p>
      <div className="mt-6">
        <ListingEditor
          listing={BLANK}
          onSave={async (form) => {
            const created = await api<EditableListing & { id: string }>("/api/admin/listings", { method: "POST", body: form });
            notify(`${created.name} is live`);
            router.replace(`/admin/listings/${created.id}`);
          }}
        />
      </div>
    </div>
  );
}
