import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient, type Pricing } from "@prisma/client";

const db = new PrismaClient();
const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR ?? path.join(process.cwd(), "storage"));
export const DEMO_EMAIL = "demo@ahsanhub.com";

const CATEGORY_GROUPS = [
  {
    kind: "software" as const,
    names: [
      "Productivity",
      "Marketing",
      "Finance and Bookkeeping",
      "E-commerce",
      "Education",
      "Health",
      "Communication",
      "Developer Tools",
      "Design",
      "Analytics",
      "HR and Hiring",
      "Customer Support",
      "No-code",
      "Security",
      "Content",
      "Islamic Finance",
      "Halal Food and Lifestyle",
      "Community",
    ],
  },
  { kind: "service" as const, names: ["Consulting", "Tutoring", "Translation", "Web development", "Accounting", "Marketing services", "Design services"] },
  { kind: "ecommerce" as const, names: ["Islamic books", "Modest fashion", "Halal groceries", "Home and living", "Gifts", "Health and wellness"] },
];

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

type Demo = {
  name: string;
  overview: string;
  pricing: Pricing;
  categories: string[];
  color: string;
  founder: [string, string];
  votes: number;
  featured?: boolean;
  sponsored?: boolean;
  halal?: boolean;
  country: string;
  platforms: string[];
  points: string[];
};

const DEMOS: Demo[] = [
  { name: "Qibla Ledger", overview: "Bookkeeping for small businesses that keeps interest out of the books and zakat ready at year end.", pricing: "freemium", categories: ["Finance and Bookkeeping", "Islamic Finance"], color: "#0B6E4F", founder: ["Aisha Rahman", "Founder & CEO"], votes: 214, featured: true, halal: true, country: "United Kingdom", platforms: ["web", "ios", "android"], points: ["Automatic zakat estimate from your balance sheet", "Flags interest income and keeps it out of profit", "Invoices in 30 currencies"] },
  { name: "Sadaqa Box", overview: "Collect and track donations for masjids and charities with clear receipts for every giver.", pricing: "free", categories: ["Community", "Finance and Bookkeeping"], color: "#1E3A8A", founder: ["Yusuf Karim", "Co-founder"], votes: 168, featured: true, sponsored: true, halal: true, country: "Canada", platforms: ["web"], points: ["Donation pages in under five minutes", "Receipts sent by email automatically", "Separate funds for zakat, sadaqa and waqf"] },
  { name: "Hikmah Notes", overview: "A calm note-taking app for students with spaced review built in.", pricing: "freemium", categories: ["Education", "Productivity"], color: "#7C2D12", founder: ["Maryam Siddiqui", "Founder"], votes: 142, featured: true, country: "Malaysia", platforms: ["web", "macos", "windows"], points: ["Turn any note into review cards", "Works offline and syncs later", "Arabic and Urdu right-to-left support"] },
  { name: "Barakah CRM", overview: "A simple CRM for service businesses: pipeline, follow-ups and invoices in one place.", pricing: "paid", categories: ["Marketing", "Customer Support"], color: "#111827", founder: ["Omar Farooq", "CEO"], votes: 121, featured: true, country: "United Arab Emirates", platforms: ["web", "android"], points: ["Kanban pipeline with reminders", "WhatsApp and email in one inbox", "Quotes that turn into invoices"] },
  { name: "Noor Analytics", overview: "Privacy-first website analytics without cookies or personal data.", pricing: "open_source", categories: ["Analytics", "Developer Tools"], color: "#0F766E", founder: ["Bilal Ahmed", "Maintainer"], votes: 198, featured: true, country: "Pakistan", platforms: ["web"], points: ["One script tag, under 2 KB", "Self-host or use the cloud", "No cookie banner needed"] },
  { name: "Tayyib Menu", overview: "QR menus and online ordering for halal restaurants, with ingredient notes per dish.", pricing: "freemium", categories: ["Halal Food and Lifestyle", "E-commerce"], color: "#B45309", founder: ["Hamza Ali", "Founder"], votes: 87, sponsored: true, halal: true, country: "Bangladesh", platforms: ["web", "ios", "android"], points: ["Menus update instantly", "Certificate number shown on every page", "Orders straight to the kitchen"] },
  { name: "Murabaha Desk", overview: "Contract and payment tracking for Islamic finance teams, built around murabaha and ijara.", pricing: "paid", categories: ["Islamic Finance", "Finance and Bookkeeping"], color: "#312E81", founder: ["Fatima Noor", "Managing Director"], votes: 64, halal: true, country: "Saudi Arabia", platforms: ["web"], points: ["Contract templates reviewed by scholars", "Payment schedules with reminders", "Audit trail for every change"] },
  { name: "Salah Focus", overview: "A focus timer that plans deep-work blocks around prayer times.", pricing: "free", categories: ["Productivity", "Health"], color: "#065F46", founder: ["Ibrahim Hassan", "Indie maker"], votes: 156, sponsored: true, country: "Egypt", platforms: ["ios", "android", "macos"], points: ["Prayer times for your exact location", "Work blocks that pause for salah", "Weekly focus report"] },
  { name: "Amanah Vault", overview: "A password manager for families and small teams, with end-to-end encryption.", pricing: "freemium", categories: ["Security"], color: "#374151", founder: ["Zainab Malik", "CTO"], votes: 93, country: "Germany", platforms: ["web", "chrome", "ios", "android"], points: ["Zero-knowledge encryption", "Shared vaults for family members", "Breach alerts for saved logins"] },
  { name: "Ilm Path", overview: "A learning platform for madrasas and Quran schools: classes, attendance and progress.", pricing: "paid", categories: ["Education", "Community"], color: "#9A3412", founder: ["Abdullah Khan", "Founder"], votes: 72, country: "Indonesia", platforms: ["web", "android"], points: ["Hifz progress per student", "Attendance by SMS for parents", "Fee tracking without interest"] },
  { name: "Ummah Hire", overview: "A job board for Muslim-owned companies and the people who want to work there.", pricing: "free", categories: ["HR and Hiring", "Community"], color: "#1D4ED8", founder: ["Sara Iqbal", "Co-founder"], votes: 58, country: "United States", platforms: ["web"], points: ["Prayer-friendly workplace badge", "Remote and on-site roles", "Free for job seekers"] },
  { name: "Sunnah Design Kit", overview: "Islamic geometric patterns, icons and type pairings for product teams.", pricing: "free", categories: ["Design", "Content"], color: "#4C1D95", founder: ["Khalid Mansour", "Designer"], votes: 109, country: "Morocco", platforms: ["web"], points: ["400+ vector patterns", "Figma and SVG downloads", "Licensed for commercial use"] },
];

async function writeLogo(name: string, color: string) {
  const dir = path.join(STORAGE_DIR, "demo");
  await mkdir(dir, { recursive: true });
  const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${color}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="200" fill="#FFFFFF" letter-spacing="-8">${initials}</text></svg>`;
  const file = `${slugify(name)}.svg`;
  await writeFile(path.join(dir, file), svg);
  return `/files/demo/${file}`;
}

function description(demo: Demo) {
  return [
    `<p>${demo.name} was built for teams who want modern tools without compromising on their values. ${demo.overview}</p>`,
    `<h2>What you get</h2>`,
    `<ul>${demo.points.map((point) => `<li>${point}</li>`).join("")}</ul>`,
    `<h2>Who it is for</h2>`,
    `<p>Founders, operators and communities who need something reliable today and want a team that answers their email. Start on the free tier where one exists and upgrade when it earns its place.</p>`,
  ].join("");
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@ahsanhub.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ahsanhub-admin";
  const passwordHash = await bcrypt.hash(password, 10);
  const previous = await db.user.findUnique({ where: { email: "admin@ahsanhub.com" } });
  if (previous && previous.email !== email) {
    await db.user.update({ where: { id: previous.id }, data: { email, role: "admin", status: "active", passwordHash } });
  } else {
    await db.user.upsert({
      where: { email },
      update: { role: "admin", status: "active", passwordHash },
      create: { email, name: "Ahsan Hub Admin", role: "admin", passwordHash },
    });
  }
  console.log(`Admin: ${email}`);

  for (const group of CATEGORY_GROUPS) {
    for (const [index, name] of group.names.entries()) {
      await db.category.upsert({
        where: { slug: slugify(name) },
        update: {},
        create: { name, slug: slugify(name), sortOrder: index, kind: group.kind, status: "approved" },
      });
    }
  }
  console.log(`Categories: ${CATEGORY_GROUPS.reduce((sum, group) => sum + group.names.length, 0)}`);

  if (!process.argv.includes("--demo")) return;
  const categories = new Map((await db.category.findMany()).map((row) => [row.name, row.id]));
  for (const [index, demo] of DEMOS.entries()) {
    const slug = slugify(demo.name);
    if (await db.listing.findUnique({ where: { slug } })) continue;
    const publishedAt = new Date(Date.now() - index * 26 * 60 * 60 * 1000);
    await db.listing.create({
      data: {
        slug,
        name: demo.name,
        overview: demo.overview,
        description: description(demo),
        website: `https://example.com/${slug}`,
        logo: await writeLogo(demo.name, demo.color),
        pricing: demo.pricing,
        country: demo.country,
        platforms: demo.platforms,
        halalNote: demo.halal ? "No interest-based features. Payments processed without riba." : "",
        socials: { x: `https://x.com/${slug.replace(/-/g, "")}`, linkedin: `https://www.linkedin.com/company/${slug}` },
        contactEmail: DEMO_EMAIL,
        status: "published",
        featured: demo.featured ?? false,
        sponsored: demo.sponsored ?? false,
        halalVerified: demo.halal ?? false,
        voteCount: demo.votes,
        publishedAt,
        createdAt: publishedAt,
        categories: { create: demo.categories.map((name) => ({ categoryId: categories.get(name)! })) },
        founders: {
          create: [
            {
              name: demo.founder[0],
              role: demo.founder[1],
              bio: `${demo.founder[0].split(" ")[0]} started ${demo.name} after years of building software for others. Previously led product at a fintech startup.`,
              socials: { linkedin: `https://www.linkedin.com/in/${slugify(demo.founder[0])}`, x: `https://x.com/${slugify(demo.founder[0]).replace(/-/g, "")}` },
            },
          ],
        },
        reviews: {
          create: index % 2 === 0
            ? [
                { name: "Hassan R.", rating: 5, body: `We moved our whole team to ${demo.name} in a weekend. Support answered within the hour.`, status: "approved" },
                { name: "Nadia K.", rating: 4, body: "Does exactly what it says. A couple of features I want are on the roadmap.", status: "approved" },
              ]
            : [],
        },
      },
    });
  }
  console.log(`Demo listings: ${DEMOS.length} (contact email ${DEMO_EMAIL})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
