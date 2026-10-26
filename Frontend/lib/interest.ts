import { cookies } from "next/headers";

/** Categories this browser opened recently. Set by the product view counter. */
export async function interestParam() {
  const raw = (await cookies()).get("ah_interest")?.value ?? "";
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => /^[a-z0-9-]{1,80}$/.test(part))
    .slice(0, 8)
    .join(",");
}
