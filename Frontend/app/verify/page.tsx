"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/section";

function VerifyInner() {
  const token = useSearchParams().get("token") ?? "";
  const [message, setMessage] = useState("Checking the link…");

  useEffect(() => {
    if (!token) {
      setMessage("This verification link is missing its token.");
      return;
    }
    fetch("/api/public/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error || "This link is invalid or expired.");
        }
        setMessage("Email verified. You can keep using your account.");
      })
      .catch((problem: Error) => setMessage(problem.message));
  }, [token]);

  return <p className="rounded-2xl border border-line bg-surface p-5 text-ink">{message}</p>;
}

export default function VerifyPage() {
  return (
    <Container className="max-w-xl py-16">
      <h1 className="mb-4 text-2xl font-semibold text-ink">Verify email</h1>
      <Suspense fallback={<p>Checking the link…</p>}>
        <VerifyInner />
      </Suspense>
    </Container>
  );
}
