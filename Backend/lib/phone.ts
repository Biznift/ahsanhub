import { HttpError } from "@/lib/http";

/** Keeps the digits only, so +880 and 880 match the same account. */
export function normalizePhone(raw: string) {
  const digits = raw.trim().replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) throw new HttpError(400, "Enter a valid phone number.");
  return digits;
}
