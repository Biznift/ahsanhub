"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/shell";
import { useStore } from "@/components/store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ready, session } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);

  if (!ready || !session) {
    return <div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">Opening admin…</div>;
  }

  return <Shell>{children}</Shell>;
}
