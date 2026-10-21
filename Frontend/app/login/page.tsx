import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-5 py-16">
      <div className="w-full max-w-sm">
        <LogoMark className="h-10 w-10" />
        <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.025em] text-ink">Sign in to manage your listings</h1>
        <p className="mt-2 text-[15px] text-muted">Use the email and password you set when you submitted your product.</p>
        <LoginForm />
      </div>
    </div>
  );
}
