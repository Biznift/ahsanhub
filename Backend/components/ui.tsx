import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import type { HttpMethod } from "@/lib/catalog";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-[var(--line)] bg-[var(--card)]", className)}>
      {children}
    </div>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-base font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

export function Button({
  tone = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" | "danger" | "lime" }) {
  const tones = {
    primary: "bg-[var(--ink)] text-[var(--lime)] hover:bg-[var(--ink-2)]",
    lime: "bg-[var(--lime)] text-[var(--ink)] hover:brightness-95",
    ghost: "border border-[var(--line)] bg-white text-[var(--text)] hover:bg-[#f3f9f6]",
    danger: "text-[var(--danger)] hover:bg-[#fde8e4]",
  };
  return <button className={cn(buttonBase, tones[tone], className)} {...props} />;
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-sm font-semibold text-[#344054]">{label}</span>
      {children}
    </label>
  );
}

export const controlClass =
  "w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-base text-[var(--text)] outline-none ring-[var(--ink)] focus:ring-2";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClass, props.className)} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(controlClass, props.className)} />;
}

const tones = {
  ok: "bg-[#e7f6ec] text-[#1f6b3a]",
  warn: "bg-[#fff3d8] text-[#8a5a10]",
  danger: "bg-[#fde8e4] text-[#9a3412]",
  muted: "bg-[#efece4] text-[#5c665f]",
  info: "bg-[#e7f1f8] text-[#1e5278]",
};

export function Badge({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", tones[tone])}>{children}</span>;
}

export function methodTone(method: HttpMethod): keyof typeof tones {
  if (method === "GET") return "ok";
  if (method === "POST") return "info";
  if (method === "PATCH" || method === "PUT") return "warn";
  return "danger";
}
