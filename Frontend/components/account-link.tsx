"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Account } from "@/lib/types";

/** Header link that becomes "My listings" once the visitor is signed in. */
export function AccountLink({ className }: { className?: string }) {
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { user: null }))
      .then((body: { user: Account | null }) => setAccount(body.user))
      .catch(() => setAccount(null));
  }, []);

  return (
    <Link href={account ? "/account" : "/login"} className={className}>
      {account ? "My listings" : "Sign in"}
    </Link>
  );
}
