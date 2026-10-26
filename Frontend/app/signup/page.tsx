import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";
import { LogoMark } from "@/components/logo";
import { getSite } from "@/lib/api";
import { safeNext } from "@/lib/return-path";

export const metadata: Metadata = { title: "Sign up", robots: { index: false } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, site] = await Promise.all([searchParams, getSite()]);
  return (
    <div className="grid min-h-[70vh] place-items-center px-5 py-16">
      <div className="w-full max-w-sm">
        <LogoMark src={site.logo} className="h-10 w-10" />
        <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.025em] text-ink">Create an account</h1>
        <p className="mt-2 text-[15px] text-muted">Name, email, phone, and a password. That is the whole account.</p>
        <SignupForm next={safeNext(next)} />
      </div>
    </div>
  );
}
