export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type Endpoint = {
  method: HttpMethod;
  path: string;
  summary: string;
};

export type KitModule = {
  slug: string;
  href: string;
  label: string;
  group: "Overview" | "Directory" | "Commerce" | "People" | "Content" | "System";
  summary: string;
  functions: string[];
  endpoints: Endpoint[];
  inNav: boolean;
};

export const MODULES: KitModule[] = [
  {
    slug: "auth",
    href: "/login",
    label: "Sign in",
    group: "Overview",
    summary: "Email and password session for the admin. Both panels gate every other screen behind this.",
    functions: ["Sign in with email and password", "Read the current session", "Sign out"],
    endpoints: [
      { method: "POST", path: "/api/admin/login", summary: "Exchange email and password for a session" },
      { method: "GET", path: "/api/admin/me", summary: "Return the signed-in admin" },
      { method: "POST", path: "/api/admin/logout", summary: "End the session" },
    ],
    inNav: false,
  },
  {
    slug: "dashboard",
    href: "/admin",
    label: "Dashboard",
    group: "Overview",
    summary: "What is waiting for review, what went live, and how visitors are voting this week.",
    functions: ["See pending listings and reviews", "See published listings and owners", "See this week's votes and submissions", "Open the latest submissions"],
    endpoints: [{ method: "GET", path: "/api/admin/stats", summary: "Totals for the dashboard cards" }],
    inNav: true,
  },
  {
    slug: "listings",
    href: "/admin/listings",
    label: "Listings",
    group: "Directory",
    summary: "Every submitted product. Approve or reject, feature it on the home page, mark it sponsored so it fills ad slots, and edit listings that have no owner account.",
    functions: ["Filter by status and search", "Approve, reject, or send back to pending", "Feature on the home page", "Mark a free listing as sponsored", "Mark halal verified", "Edit content and media", "Delete"],
    endpoints: [
      { method: "GET", path: "/api/admin/listings", summary: "List listings. Query: q, status" },
      { method: "GET", path: "/api/admin/listings/:id", summary: "One listing with founders and private fields" },
      { method: "PATCH", path: "/api/admin/listings/:id", summary: "Set status, featured, sponsored, halalVerified" },
      { method: "PUT", path: "/api/admin/listings/:id", summary: "Replace content. Multipart: data JSON, logo, banner, founderPhoto:n" },
      { method: "DELETE", path: "/api/admin/listings/:id", summary: "Delete a listing and its files" },
      { method: "GET", path: "/api/public/listings", summary: "Published listings. Query: q, category, pricing, sort, featured, page, limit" },
      { method: "POST", path: "/api/public/listings", summary: "Submit a listing. Multipart: data (optional coupon code and usage note), email, password, logo, banner, founderPhoto:n" },
      { method: "GET", path: "/api/public/listings/:slug", summary: "One published listing with rating and related" },
      { method: "POST", path: "/api/public/listings/:slug/vote", summary: "Toggle the visitor's upvote. No account." },
      { method: "GET", path: "/api/public/votes", summary: "Which listings this visitor upvoted. Query: ids" },
      { method: "GET", path: "/api/account/listings", summary: "The signed-in owner's listings" },
      { method: "PATCH", path: "/api/account/listings/:id", summary: "Owner edits content of their own listing" },
    ],
    inNav: true,
  },
  {
    slug: "categories",
    href: "/admin/categories",
    label: "Categories",
    group: "Directory",
    summary: "One flat list of categories. A listing can sit in up to five. Hidden categories disappear from the site but keep their links.",
    functions: ["Add a category", "Rename or describe", "Hide or show", "Reorder", "Delete"],
    endpoints: [
      { method: "GET", path: "/api/admin/categories", summary: "All categories with listing counts" },
      { method: "POST", path: "/api/admin/categories", summary: "Create a category" },
      { method: "PATCH", path: "/api/admin/categories/:id", summary: "Rename, describe, hide, or reorder" },
      { method: "DELETE", path: "/api/admin/categories/:id", summary: "Delete. Listings stay." },
      { method: "GET", path: "/api/public/categories", summary: "Visible categories with published counts" },
    ],
    inNav: true,
  },
  {
    slug: "ads",
    href: "/admin/ads",
    label: "Ads",
    group: "Directory",
    summary: "Banner, GIF, or video creatives per placement. An empty placement shows a sponsored free listing instead, and nothing at all if there is none.",
    functions: ["Upload a creative at the placement's exact size", "Turn a creative on or off", "Change title or link", "Delete"],
    endpoints: [
      { method: "GET", path: "/api/admin/ads", summary: "Creatives and placement sizes" },
      { method: "POST", path: "/api/admin/ads", summary: "Upload. Multipart: placement, title, url, file" },
      { method: "PATCH", path: "/api/admin/ads/:id", summary: "Update title, url, or active" },
      { method: "DELETE", path: "/api/admin/ads/:id", summary: "Delete a creative and its file" },
      { method: "GET", path: "/api/public/ads", summary: "Creatives and sponsored listings. Query: placement" },
    ],
    inNav: true,
  },
  {
    slug: "coupon-codes",
    href: "/admin/coupon-codes",
    label: "Coupon codes",
    group: "Directory",
    summary: "Special deals for products already on the site. Each deal shows a coupon code. The button uses the product website unless a special call to action is turned on.",
    functions: [
      "Pick a published listing",
      "Set the coupon code and an optional note",
      "Turn on a special link for an affiliate or offer URL",
      "Show, hide, or reorder a deal",
      "Leave the product page on its own website",
    ],
    endpoints: [
      { method: "GET", path: "/api/admin/coupon-codes", summary: "Every deal, including hidden ones" },
      { method: "POST", path: "/api/admin/coupon-codes", summary: "Create a deal for a published listing" },
      { method: "PATCH", path: "/api/admin/coupon-codes/:id", summary: "Update the code, note, call to action, order, or visibility" },
      { method: "DELETE", path: "/api/admin/coupon-codes/:id", summary: "Remove a deal. The listing stays." },
      { method: "GET", path: "/api/public/coupon-codes", summary: "Live deals without the code. Query: limit" },
      { method: "GET", path: "/api/account/coupon-codes", summary: "The codes, for a signed-in account only" },
      { method: "POST", path: "/api/auth/register", summary: "Create an account with name, email, and phone" },
    ],
    inNav: true,
  },
  {
    slug: "users",
    href: "/admin/users",
    label: "Users",
    group: "People",
    summary: "Admins and listing owners. An owner account is created when someone submits with a password.",
    functions: ["Search by name or email", "Create an admin or owner", "Change role", "Reset a password", "Disable or enable", "Delete"],
    endpoints: [
      { method: "GET", path: "/api/admin/users", summary: "List users. Query: q" },
      { method: "POST", path: "/api/admin/users", summary: "Create a user" },
      { method: "PATCH", path: "/api/admin/users/:id", summary: "Update role, status, or password" },
      { method: "DELETE", path: "/api/admin/users/:id", summary: "Delete a user. Their listings stay." },
      { method: "POST", path: "/api/auth/login", summary: "Owner sign-in" },
      { method: "GET", path: "/api/auth/me", summary: "The signed-in owner" },
      { method: "POST", path: "/api/auth/logout", summary: "Owner sign-out" },
    ],
    inNav: true,
  },
  {
    slug: "crm",
    href: "/admin/crm",
    label: "CRM",
    group: "People",
    summary: "One list of everyone, or a board that splits them by package and by status. A purchase moves the person and adds to that package’s count.",
    functions: [
      "Scan everyone in one list, with the features on their package",
      "Switch the board between package and status",
      "Move someone by drag, or let a completed purchase move them",
      "Export the people in the current filter",
      "Email one person, a selection, or everyone in the filter",
      "Open a person's history from the list or the board",
    ],
    endpoints: [
      { method: "GET", path: "/api/admin/crm/people", summary: "People with package, features, and status. Query: q, package, stage, feature" },
      { method: "GET", path: "/api/admin/crm/export", summary: "CSV of the same filter" },
      { method: "POST", path: "/api/admin/crm/messages", summary: "Email one person or many. Body: userIds, subject, body" },
      { method: "PATCH", path: "/api/admin/users/:id/plan", summary: "Set the current package. Free clears it." },
    ],
    inNav: true,
  },
  {
    slug: "campaigns",
    href: "/admin/campaigns",
    label: "Campaigns",
    group: "People",
    summary: "One email for many people. Pick everyone, a package, a status, or specific people, then send it once.",
    functions: [
      "Save a draft",
      "Choose all active users, a package, a status, or specific people",
      "See who will receive it before sending",
      "Fill in each person’s name and package",
      "Keep a sent campaign as a record",
    ],
    endpoints: [
      { method: "GET", path: "/api/admin/campaigns", summary: "List drafts and sent campaigns" },
      { method: "POST", path: "/api/admin/campaigns", summary: "Create a draft" },
      { method: "PATCH", path: "/api/admin/campaigns/:id", summary: "Update a draft" },
      { method: "POST", path: "/api/admin/campaigns/:id/send", summary: "Send once. Disabled accounts are skipped." },
      { method: "DELETE", path: "/api/admin/campaigns/:id", summary: "Delete a campaign record" },
    ],
    inNav: true,
  },
  {
    slug: "feedback",
    href: "/admin/feedback",
    label: "Feedback",
    group: "People",
    summary: "Bug reports, feature requests, and replies from people using the product.",
    functions: ["Filter open, replied, and closed", "Read a thread", "Reply to the user", "Change status"],
    endpoints: [
      { method: "GET", path: "/api/admin/feedback", summary: "List feedback. Query: status" },
      { method: "GET", path: "/api/admin/feedback/unread", summary: "Count of open items" },
      { method: "GET", path: "/api/admin/feedback/:id", summary: "One thread with messages" },
      { method: "POST", path: "/api/admin/feedback", summary: "Reply. Body: feedbackId, body" },
      { method: "PATCH", path: "/api/admin/feedback/:id", summary: "Set status to open, replied, or closed" },
    ],
    inNav: true,
  },
  {
    slug: "orders",
    href: "/admin/orders",
    label: "Orders",
    group: "Commerce",
    summary: "See who bought what, then mark an order paid or cancel it.",
    functions: ["List orders", "Filter by status", "Mark paid", "Cancel an order"],
    endpoints: [
      { method: "GET", path: "/api/admin/orders", summary: "List orders. Query: status" },
      { method: "GET", path: "/api/admin/orders/:id", summary: "One order" },
      { method: "PATCH", path: "/api/admin/orders/:id", summary: "Set status to paid or cancelled" },
    ],
    inNav: true,
  },
  {
    slug: "coupons",
    href: "/admin/coupons",
    label: "Coupons",
    group: "Commerce",
    summary: "Percent or fixed discount codes, with a usage cap and an on/off switch.",
    functions: ["Create a percent or fixed code", "Set a usage limit", "Turn a code on or off", "Delete a code"],
    endpoints: [
      { method: "GET", path: "/api/admin/coupons", summary: "List coupons and how many times each was used" },
      { method: "POST", path: "/api/admin/coupons", summary: "Create a coupon" },
      { method: "PATCH", path: "/api/admin/coupons/:id", summary: "Update a coupon or its active flag" },
      { method: "DELETE", path: "/api/admin/coupons/:id", summary: "Delete a coupon" },
    ],
    inNav: true,
  },
  {
    slug: "affiliates",
    href: "/admin/referrals",
    label: "Affiliates",
    group: "Commerce",
    summary: "Every account is an affiliate. Commission lands in USD after a completed payment, and a withdrawal stays pending until it is approved.",
    functions: [
      "Edit default commission, discount, duration, minimum, and the BDT rate",
      "Override one account’s commission, buyer discount, and duration",
      "Approve or reject a withdrawal",
      "Credit a missed invoice",
      "Refund a payment and reverse its commission",
    ],
    endpoints: [
      { method: "GET", path: "/api/admin/referrals/settings", summary: "Global commission, discount, duration, minimum, and BDT rate" },
      { method: "PUT", path: "/api/admin/referrals/settings", summary: "Save the global referral settings" },
      { method: "PATCH", path: "/api/admin/users/:id/referral", summary: "Override commission, discount, and duration. Null uses the default." },
      { method: "GET", path: "/api/admin/referrals/withdrawals", summary: "List withdrawal requests. Query: status" },
      { method: "POST", path: "/api/admin/referrals/withdrawals/:id/approve", summary: "Deduct the balance if it still covers the amount" },
      { method: "POST", path: "/api/admin/referrals/withdrawals/:id/reject", summary: "Leave the balance unchanged" },
      { method: "POST", path: "/api/admin/referrals/payments/:invoice/credit", summary: "Credit a missed invoice once" },
      { method: "POST", path: "/api/admin/referrals/payments/:invoice/refund", summary: "Mark a payment refunded and reverse its commission once" },
      { method: "POST", path: "/api/register", summary: "Create an account, a referral code, and keep ?ref= for checkout" },
      { method: "GET", path: "/api/referrals/me", summary: "Balance, net earnings, rate, and referred buyers" },
      { method: "PUT", path: "/api/referrals/code", summary: "Rename the code. 4–16 letters or numbers, unique" },
      { method: "POST", path: "/api/referrals/withdrawals", summary: "Request a payout. The balance is not deducted yet." },
      { method: "POST", path: "/api/checkout/code", summary: "Quote a coupon or referral code" },
      { method: "POST", path: "/api/checkout/pay", summary: "Complete or fail a payment, then credit commission if it completed" },
    ],
    inNav: true,
  },
  {
    slug: "payments",
    href: "/admin/payments",
    label: "Payments",
    group: "Commerce",
    summary: "PayStation gateway switch. Both projects collect payment through this provider.",
    functions: ["Enable or disable the gateway", "Choose sandbox or live", "Save merchant credentials", "Send a test check"],
    endpoints: [
      { method: "GET", path: "/api/admin/payments/gateway", summary: "Gateway settings. The password is never returned." },
      { method: "PUT", path: "/api/admin/payments/gateway", summary: "Save enabled, mode, merchant id, and password" },
      { method: "POST", path: "/api/admin/payments/gateway/test", summary: "Check that the saved credentials answer" },
    ],
    inNav: true,
  },
  {
    slug: "reviews",
    href: "/admin/reviews",
    label: "Reviews",
    group: "Directory",
    summary: "Visitor reviews on listings. Nothing shows on the site until it is approved.",
    functions: ["Filter by status", "Approve", "Hide", "Delete"],
    endpoints: [
      { method: "GET", path: "/api/admin/reviews", summary: "List reviews. Query: status" },
      { method: "PATCH", path: "/api/admin/reviews/:id", summary: "Set status to pending, approved, or hidden" },
      { method: "DELETE", path: "/api/admin/reviews/:id", summary: "Delete a review" },
      { method: "GET", path: "/api/public/listings/:slug/reviews", summary: "Approved reviews for one listing" },
      { method: "POST", path: "/api/public/listings/:slug/reviews", summary: "Submit a review. No account." },
    ],
    inNav: true,
  },
  {
    slug: "branding",
    href: "/admin/branding",
    label: "Branding & SEO",
    group: "Content",
    summary: "Site name, logo, favicon, share image, tagline, announcement bar, footer social links, and how the home page appears in Google.",
    functions: [
      "Edit name and tagline",
      "Upload logo, favicon, Apple icon, and social share image",
      "Set the announcement bar",
      "Write the SEO title and description",
      "Add keywords",
      "Save social links",
    ],
    endpoints: [
      { method: "GET", path: "/api/admin/site", summary: "Site config, including branding and SEO" },
      { method: "PUT", path: "/api/admin/site", summary: "Save branding and SEO" },
      { method: "GET", path: "/api/public/site", summary: "The same config for the public site" },
    ],
    inNav: true,
  },
  {
    slug: "blog",
    href: "/admin/blog",
    label: "Blog",
    group: "Content",
    summary: "Articles written in Markdown, with a cover, tags, and draft or publish.",
    functions: ["List posts", "Write a post", "Set a cover and tags", "Publish or unpublish", "Delete"],
    endpoints: [
      { method: "GET", path: "/api/admin/posts?type=blog", summary: "List blog posts" },
      { method: "POST", path: "/api/admin/posts", summary: "Create a post" },
      { method: "PATCH", path: "/api/admin/posts/:id", summary: "Update a post" },
      { method: "DELETE", path: "/api/admin/posts/:id", summary: "Delete a post" },
    ],
    inNav: true,
  },
  {
    slug: "content",
    href: "/admin/content",
    label: "Content",
    group: "Content",
    summary: "A list of pages and posts with draft and published. Product-specific editors stay outside the kit.",
    functions: ["Search titles", "Filter draft or published", "Add a draft", "Publish or unpublish", "Delete"],
    endpoints: [
      { method: "GET", path: "/api/admin/content", summary: "List content. Query: q, status, kind" },
      { method: "POST", path: "/api/admin/content", summary: "Create a draft" },
      { method: "PATCH", path: "/api/admin/content/:id", summary: "Change title or status" },
      { method: "DELETE", path: "/api/admin/content/:id", summary: "Delete an item" },
    ],
    inNav: true,
  },
  {
    slug: "media",
    href: "/admin/media",
    label: "Media",
    group: "Content",
    summary: "Every uploaded file: logos, banners, founder photos, ad creatives, and library files. Connect Cloudinary so new files go to your cloud; otherwise they stay on this server.",
    functions: ["Connect Cloudinary", "Save cloud name, API key, and API secret", "Test the connection", "Browse files", "Upload a file", "Copy a file link", "Delete an unused file"],
    endpoints: [
      { method: "GET", path: "/api/admin/storage", summary: "Cloudinary status. The API key and secret are never returned." },
      { method: "PUT", path: "/api/admin/storage", summary: "Save Cloudinary credentials and turn it on or off" },
      { method: "POST", path: "/api/admin/storage/test", summary: "Ping Cloudinary with the saved or typed credentials" },
      { method: "GET", path: "/api/admin/media", summary: "List files" },
      { method: "POST", path: "/api/admin/media", summary: "Upload an image, video, audio, PDF, or another Cloudinary-supported file" },
      { method: "DELETE", path: "/api/admin/media/:id", summary: "Delete a file no listing or ad uses" },
      { method: "GET", path: "/files/:path", summary: "Serve a file stored on this server" },
    ],
    inNav: true,
  },
  {
    slug: "notifications",
    href: "/admin/notifications",
    label: "Notifications",
    group: "System",
    summary: "Telegram alerts. Connect a bot, pick a chat, and choose which activities send a message.",
    functions: ["Turn Telegram on", "Save bot token and chat ID", "Find a chat", "Toggle events by group", "Send a test message"],
    endpoints: [
      { method: "GET", path: "/api/admin/notifications/telegram", summary: "Bot status, chat, and event switches. The token is never returned." },
      { method: "PUT", path: "/api/admin/notifications/telegram", summary: "Save the bot, chat, and events" },
      { method: "POST", path: "/api/admin/notifications/telegram/test", summary: "Send a test message" },
      { method: "POST", path: "/api/admin/notifications/telegram/detect-chat", summary: "List chats that recently messaged the bot" },
    ],
    inNav: true,
  },
  {
    slug: "email",
    href: "/admin/email",
    label: "Email",
    group: "System",
    summary: "Sender needs an API token. Other providers use SMTP, and IMAP when that server has a mailbox.",
    functions: ["Pick Sender and paste an API token, or pick an SMTP provider", "Test the connection", "Turn on IMAP and name the support inbox", "Read mail sent to that inbox", "Reply from the admin panel", "Choose which emails send", "Send a test email"],
    endpoints: [
      { method: "GET", path: "/api/admin/email", summary: "Email settings. The password or API token is never returned." },
      { method: "PUT", path: "/api/admin/email", summary: "Save the provider, from address, and which emails are on" },
      { method: "POST", path: "/api/admin/email/verify", summary: "Test the connection or send a test email with the form values" },
      { method: "POST", path: "/api/admin/email/test", summary: "Send a test email with the saved email settings" },
      { method: "GET", path: "/api/admin/inbox", summary: "Support inbox conversations" },
      { method: "POST", path: "/api/admin/inbox", summary: "Read new mail from the support inbox over IMAP" },
      { method: "PATCH", path: "/api/admin/inbox/:id", summary: "Mark a conversation read" },
      { method: "POST", path: "/api/admin/inbox/:id", summary: "Reply through the saved email settings and keep the answer on the thread" },
    ],
    inNav: true,
  },
  {
    slug: "social-proof",
    href: "/admin/social-proof",
    label: "Social proof",
    group: "System",
    summary: "The small activity cards on the public site. Choose what shows, how often, and which logs are included.",
    functions: ["Turn the cards on or off", "Set how long each card stays", "Set the gap between cards", "Set how many times one log shows", "Choose signups or purchases", "Hide a single log"],
    endpoints: [
      { method: "GET", path: "/api/admin/social-proof", summary: "Playback settings and the activity log" },
      { method: "PUT", path: "/api/admin/social-proof", summary: "Save timing, types, and which logs are on" },
      { method: "GET", path: "/api/social-proof", summary: "Public feed the site toaster reads" },
    ],
    inNav: true,
  },
  {
    slug: "settings",
    href: "/admin/settings",
    label: "Settings",
    group: "System",
    summary: "Contact details, theme, maintenance, social links, WhatsApp, analytics, invoice text, and which features stay in the menu.",
    functions: ["Set contact and theme", "Toggle maintenance", "Save social and WhatsApp", "Save analytics IDs", "Edit invoice details", "Show or hide a feature in the menu"],
    endpoints: [
      { method: "GET", path: "/api/admin/settings", summary: "General site settings" },
      { method: "PUT", path: "/api/admin/settings", summary: "Save general settings" },
    ],
    inNav: true,
  },
  {
    slug: "backups",
    href: "/admin/backups",
    label: "Backups",
    group: "System",
    summary: "Snapshot the database, download it, and restore only after typing RESTORE.",
    functions: ["Create a snapshot", "Download a snapshot", "Restore with confirmation", "Remove a snapshot"],
    endpoints: [
      { method: "GET", path: "/api/admin/backups", summary: "List snapshots on the server" },
      { method: "POST", path: "/api/admin/backups", summary: "Create a snapshot now" },
      { method: "GET", path: "/api/admin/backups/:id/download", summary: "Download one snapshot" },
      { method: "POST", path: "/api/admin/backups/:id/restore", summary: "Restore. Body must include confirm: RESTORE" },
      { method: "DELETE", path: "/api/admin/backups/:id", summary: "Delete a snapshot file" },
    ],
    inNav: true,
  },
  {
    slug: "api",
    href: "/admin/api",
    label: "API map",
    group: "Overview",
    summary: "Every endpoint this kit exposes, grouped by the admin screen that uses it.",
    functions: ["Search paths", "Filter by module", "Copy a path", "Open the live catalog"],
    endpoints: [{ method: "GET", path: "/api/catalog", summary: "The same map, as JSON" }],
    inNav: true,
  },
];

export const NAV_GROUPS = ["Overview", "Directory", "Commerce", "People", "Content", "System"] as const;

/** These stay in the menu so the admin can always get home and turn features back on. */
export const PINNED_NAV = ["dashboard", "settings"] as const;

export function isPinnedNav(slug: string) {
  return (PINNED_NAV as readonly string[]).includes(slug);
}

export function moduleBySlug(slug: string) {
  const found = MODULES.find((item) => item.slug === slug);
  if (!found) throw new Error(`Unknown module: ${slug}`);
  return found;
}

export function navModules() {
  return MODULES.filter((item) => item.inNav);
}
