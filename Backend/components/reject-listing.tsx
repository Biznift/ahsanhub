"use client";

import { useEffect, useState } from "react";
import { Button, Field, controlClass } from "@/components/ui";

type RejectionNotice = { emailed: string[]; failed: string[]; skipped: boolean };

export function rejectionResultMessage(name: string, notice: RejectionNotice) {
  if (notice.skipped) return `${name} rejected. The note is on their account. Rejection emails are turned off.`;
  if (notice.failed.length && notice.emailed.length === 0) return `${name} rejected. The note is on their account. The email could not be sent.`;
  if (notice.failed.length) return `${name} rejected. Sent to ${notice.emailed.join(", ")}. Could not reach ${notice.failed.join(", ")}.`;
  if (notice.emailed.length) return `${name} rejected. Note sent to ${notice.emailed.join(", ")}.`;
  return `${name} rejected. The note is on their account.`;
}

export function RejectListingDialog({
  name,
  busy,
  updating,
  initialNote = "",
  existingImage = null,
  onCancel,
  onConfirm,
}: {
  name: string;
  busy: boolean;
  updating?: boolean;
  initialNote?: string;
  existingImage?: string | null;
  onCancel: () => void;
  onConfirm: (note: string, image: File | null) => void;
}) {
  const [note, setNote] = useState(initialNote);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/40 p-4" onClick={() => !busy && onCancel()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
        className="w-full max-w-lg rounded-xl border border-[#e6e8ef] bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          const reason = note.trim();
          if (!reason) {
            setError("Add a reason before rejecting.");
            return;
          }
          setError(null);
          onConfirm(reason, image);
        }}
      >
        <h2 id="reject-title" className="text-lg font-semibold text-[#1d2939]">
          {updating ? `Update the note for ${name}` : `Reject ${name}`}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#475467]">
          This reason is saved on their account and emailed to the owner and the address used on the submission, when that email is turned on.
        </p>
        <div className="mt-4">
          <Field label="Why it was rejected">
            <textarea
              value={note}
              rows={5}
              maxLength={4000}
              required
              autoFocus
              onChange={(event) => setNote(event.target.value)}
              placeholder="What needs to change before this can be approved"
              className={controlClass}
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Image (optional)">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => setImage(event.target.files?.[0] ?? null)}
              className="block w-full text-sm text-[#475467] file:mr-3 file:rounded-lg file:border-0 file:bg-[#f5f6fa] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#344054]"
            />
          </Field>
          {updating && existingImage && !preview && <p className="mt-2 text-xs text-[#667085]">Leave this empty to keep the current image.</p>}
          {(preview || (updating && existingImage)) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview ?? existingImage ?? ""} alt="" className="mt-3 max-h-48 max-w-full rounded-lg border border-[#e6e8ef] object-contain" />
          )}
        </div>
        {error && <p className="mt-3 text-sm text-[#b42318]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" tone="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center rounded-lg bg-[#b42318] px-3.5 py-2.5 text-sm font-medium text-white hover:bg-[#912018] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving…" : updating ? "Save and send" : "Reject and send"}
          </button>
        </div>
      </form>
    </div>
  );
}
