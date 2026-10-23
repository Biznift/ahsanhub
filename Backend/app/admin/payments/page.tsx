"use client";

import { FormEvent, useState } from "react";
import { moduleBySlug } from "@/lib/catalog";
import { ModuleFrame } from "@/components/frame";
import { useStore } from "@/components/store";
import { SecretInput } from "@/components/secret-input";
import { Badge, Button, Field, TextInput } from "@/components/ui";

export default function PaymentsPage() {
  const module = moduleBySlug("payments");
  const { gateway, saveGateway, testGateway } = useStore();
  const [enabled, setEnabled] = useState(gateway.enabled);
  const [mode, setMode] = useState(gateway.mode);
  const [merchantId, setMerchantId] = useState(gateway.merchantId);
  const [password, setPassword] = useState("");

  function save(event: FormEvent) {
    event.preventDefault();
    saveGateway({ enabled, mode, merchantId, password });
    setPassword("");
  }

  return (
    <ModuleFrame module={module}>
      <form onSubmit={save} className="max-w-xl space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">PayStation</h2>
            <p className="text-sm text-[var(--muted)]">Password stays masked after save.</p>
          </div>
          <Badge tone={gateway.enabled ? "ok" : "muted"}>{gateway.enabled ? "Enabled" : "Off"}</Badge>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          Accept payments
        </label>
        <div className="flex gap-2">
          {(["sandbox", "live"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`rounded-full px-3 py-1.5 text-sm capitalize ${
                mode === item ? "bg-[var(--ink)] text-[var(--lime)]" : "border border-[var(--line)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <Field label="Merchant ID">
          <TextInput value={merchantId} onChange={(event) => setMerchantId(event.target.value)} />
        </Field>
        <Field label="Password">
          <SecretInput saved={gateway.hasPassword} value={password} onChange={setPassword} placeholder="Not set" />
        </Field>
        {gateway.lastTest && <p className="text-sm text-[var(--ok)]">{gateway.lastTest}</p>}
        <div className="flex gap-2">
          <Button type="submit">Save gateway</Button>
          <Button type="button" tone="ghost" onClick={testGateway}>
            Test connection
          </Button>
        </div>
      </form>
    </ModuleFrame>
  );
}
