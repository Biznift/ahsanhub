"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import type { Site } from "@/lib/types";

export function SiteWidgets({ site }: { site: Site }) {
  const [proof, setProof] = useState<{ id: string; message: string } | null>(null);
  const whatsapp = /^\d{8,15}$/.test(site.whatsapp ?? "") ? site.whatsapp : "";

  useEffect(() => {
    let gone = false;
    fetch("/api/public/social-proof", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { items?: { id: string; message: string }[] } | null) => {
        const first = body?.items?.[0];
        if (!gone && first) setProof(first);
      })
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, []);

  useEffect(() => {
    if (!proof) return;
    const timer = window.setTimeout(() => setProof(null), 7000);
    return () => window.clearTimeout(timer);
  }, [proof]);

  return (
    <>
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(site.whatsappMessage || "Assalamu alaikum")}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-[#128C7E] px-4 text-sm font-semibold text-white shadow-lg"
        >
          <MessageCircle size={18} /> WhatsApp
        </a>
      )}
      {proof && (
        <div className="fixed bottom-5 left-5 z-40 max-w-xs rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-lg">
          {proof.message}
        </div>
      )}
    </>
  );
}
