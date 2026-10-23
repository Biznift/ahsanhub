import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, limitClient, ok, rateLimit, route } from "@/lib/http";
import { currentUser, hashPassword, passwordMatches, startSession } from "@/lib/auth";
import { PRICING, cardInclude, parseListingForm, prepareListing, ratingsFor, revalidate, toCard, writeRelations } from "@/lib/directory";
import { LISTING_KINDS } from "@/lib/kinds";
import { uniqueSlug } from "@/lib/slug";
import { recordActivity, sendVerification } from "@/lib/activity";
import { alert } from "@/lib/telegram";

const querySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().max(80).optional(),
  kind: z.enum(LISTING_KINDS).optional(),
  pricing: z.enum(PRICING).optional(),
  sort: z.enum(["new", "top", "featured"]).default("new"),
  featured: z.enum(["1"]).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  alternative: z.string().trim().max(80).optional(),
});

/** Published listings for explore, search, and the alternative picker. */
export const GET = route(async (request) => {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const query = querySchema.parse(params);
  const where: Prisma.ListingWhereInput = { status: "published" };
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { overview: { contains: query.q, mode: "insensitive" } },
    ];
  }
  if (query.kind) where.kind = query.kind;
  if (query.category) where.categories = { some: { category: { slug: query.category, hidden: false, status: "approved" } } };
  if (query.pricing) where.pricing = query.pricing;
  if (query.alternative) where.alternatives = { some: { tool: { slug: query.alternative } } };
  if (query.featured || query.sort === "featured") where.featured = true;

  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    query.sort === "top" ? [{ voteCount: "desc" }, { publishedAt: "desc" }] : [{ publishedAt: "desc" }];

  const [rows, total] = await Promise.all([
    db.listing.findMany({ where, include: cardInclude, orderBy, skip: (query.page - 1) * query.limit, take: query.limit }),
    db.listing.count({ where }),
  ]);
  const ratings = await ratingsFor(rows.map((row) => row.id));
  return ok({
    items: rows.map((row) => ({ ...toCard(row, { includeHidden: false }), rating: ratings.get(row.id) ?? null })),
    total,
    page: query.page,
    pages: Math.max(1, Math.ceil(total / query.limit)),
  });
});

const ownerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().max(200).optional(),
  contactName: z.string().trim().max(80).optional(),
});

export const POST = route(async (request) => {
  limitClient(request, "submit", 8, 60 * 60 * 1000);
  const form = await request.formData();
  const input = parseListingForm(form);
  const signedIn = await currentUser();
  const owner = ownerSchema.parse({
    email: signedIn?.email ?? form.get("email"),
    password: (form.get("password") as string | null) || undefined,
    contactName: (form.get("contactName") as string | null) || undefined,
  });

  let ownerId: string | null = signedIn?.id ?? null;
  const password = !signedIn ? owner.password : undefined;
  if (password) {
    if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");
    rateLimit(`auth-email:${owner.email}`, 10, 15 * 60 * 1000);
    const existing = await db.user.findUnique({ where: { email: owner.email } });
    if (existing?.role === "admin") {
      await passwordMatches(password, existing.passwordHash);
      throw new HttpError(400, "This email already has an account. Sign in, or leave the password empty.");
    }
    if (existing) {
      if (existing.status !== "active" || !(await passwordMatches(password, existing.passwordHash))) {
        throw new HttpError(400, "This email already has an account. Enter that account's password, or leave the password empty.");
      }
      ownerId = existing.id;
    }
  }

  const prepared = await prepareListing(form, input, null);
  const createdAccount = Boolean(password) && ownerId === null;
  if (password && createdAccount) {
    const user = await db.user.create({
      data: {
        email: owner.email,
        name: owner.contactName || input.founders[0]?.name || input.name,
        passwordHash: await hashPassword(password),
        role: "owner",
        emailVerified: false,
      },
    });
    ownerId = user.id;
  }
  const slug = await uniqueSlug(input.name, async (candidate) => (await db.listing.count({ where: { slug: candidate } })) > 0);
  const listing = await db.listing.create({
    data: { ...prepared.columns, slug, contactEmail: owner.email, ownerId, status: "pending" },
  });
  await writeRelations(listing.id, prepared);

  if (ownerId && !signedIn) {
    const account = await db.user.findUnique({ where: { id: ownerId } });
    if (account?.status === "active" && account.role === "owner") await startSession(account);
    if (createdAccount && account) {
      await recordActivity("signup", `${account.name.split(" ")[0]} just joined the directory`);
      alert("user.registered", `${account.name} created an account while submitting ${input.name}.`);
      await sendVerification(account);
    }
  }
  alert("listing.submitted", `New listing waiting for review: ${input.name}`);
  revalidate("admin");
  return ok({ id: listing.id, slug, status: listing.status, hasAccount: ownerId !== null, createdAccount }, { status: 201 });
});
