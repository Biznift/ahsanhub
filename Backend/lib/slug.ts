export function slugify(text: string) {
  const base = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "listing";
}

/** Appends -2, -3, ... until `taken` says the slug is free. */
export async function uniqueSlug(text: string, taken: (slug: string) => Promise<boolean>) {
  const base = slugify(text);
  let slug = base;
  for (let n = 2; await taken(slug); n++) slug = `${base}-${n}`;
  return slug;
}
