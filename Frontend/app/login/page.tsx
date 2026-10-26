import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { LogoMark } from "@/components/logo";
import { getSite } from "@/lib/api";
import { safeNext } from "@/lib/return-path";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, site] = await Promise.all([searchParams, getSite()]);
  return (
    <div className="grid min-h-[70vh] place-items-center px-5 py-16">
      <div className="w-full max-w-sm">
        <LogoMark src={site.logo} className="h-10 w-10" />
        <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.025em] text-ink">Sign in</h1>
        <p className="mt-2 text-[15px] text-muted">Use the email and password on your account. New here? Create an account below.</p>
        <LoginForm next={safeNext(next)} />
      </div>
    </div>
  );
}
