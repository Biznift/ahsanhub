# Smart Admin Kit

Shared admin dashboard for the screens that repeat across products. It was built so two products (Al Amin SI and a social-media content tool) do not each grow their own users, orders, coupons, referrals, email, and settings screens. Copy this kit into a product, keep the common screens, and leave product-only editors outside it.

This file is an implementation spec. An agent that reads it should be able to rebuild the dashboard in another Next.js app without rediscovering the rules from the source.

## What to copy and what to replace

Copy these as the source of truth:

| Path | Role |
| --- | --- |
| `lib/catalog.ts` | Every admin screen, its nav group, the functions on that screen, and the API contract |
| `lib/referrals.ts` | Pure affiliate, quote, checkout, credit, refund, and withdrawal rules |
| `lib/crm.ts` | Packages, stages, filters, export, campaign audience, `{{name}}` / `{{plan}}` |
| `lib/history.ts` | Per-person history, scoped by the person's current package |
| `components/shell.tsx` | Left nav, groups, badges, collapse |
| `components/frame.tsx` | Page title, "On this page" list, sticky API card |
| `components/ui.tsx` | Button, field, input, select, badge |
| `app/admin/**` | The screens |
| `app/login/page.tsx` | Admin sign-in |
| `app/checkout/page.tsx`, `app/register/page.tsx`, `app/dashboard/referrals/page.tsx` | Buyer-facing flows that share the same store |

Replace `components/store.tsx` when wiring a real backend. The store is an in-memory React context. It is the demo stand-in for the endpoints listed in `lib/catalog.ts`. A full page reload resets everything except the admin session.

Do not copy product-specific page builders into the kit. Content here is a generic draft/publish list. Branding, blog, media, and settings are the shared shells only.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, lucide-react
- Dev server: `npm run dev` on port **3020**
- `GET /api/catalog` is the only implemented HTTP route. It returns the module map as JSON
- Every other path in the catalog is the contract a real API should grow into. The screens call the store, not `fetch`

Demo admin: `admin@kit.local` / `kit-demo`. The password is shown on the login screen. Session is `{ name, email }` in `sessionStorage` key `sak-session`.

`/` redirects to `/admin`. `app/admin/layout.tsx` sends an unsigned visitor to `/login`. Public buyer pages (`/checkout`, `/register`, `/dashboard/referrals`) do not use that layout. They use `components/desk.tsx`.

## How a screen is built

1. Look up the module with `moduleBySlug("users")`.
2. Wrap the page in `ModuleFrame`. That renders the group, title, summary, the function list, and the API card from the catalog.
3. Read and write through `useStore()`.
4. Add the slug to `components/shell.tsx` `ICONS` if it appears in the nav (`inNav: true`).
5. Nav groups, in order: Overview, Commerce, People, Content, System.

The shell shows a red count on Orders (pending orders) and Affiliates (pending withdrawals). The nav can collapse; the choice is `localStorage` key `sak-nav-collapsed`.

Visual language: page background `#f5f6fa`, cards white, line `#e6e8ef`, accent `#6d4aff`, accent wash `#ede9fe`. Primary buttons are dark ink with lime text (`--ink`, `--lime` in `app/globals.css`).

## Data the store holds

`UserRow`: `id`, `name`, `email`, `role` (`admin` | `customer`), `status` (`active` | `disabled`).

`OrderRow`: `id`, `number`, `customer` (display name, not user id), `item`, `amount`, `currency` (`USD` | `BDT`), `status` (`pending` | `paid` | `cancelled`), `createdAt` (display string), `at` (ISO).

`CouponRow`: `code`, `type` (`percent` | `fixed`), `value`, `maxUses` (null means unlimited), `used`, `active`.

Affiliate profile (`AffiliateUser` in `lib/referrals.ts`) is a second record with the same `id` as `UserRow`:

- `referral_code`, `referred_by`, `saved_ref`
- `referral_commission_rate`, `referral_discount_rate`, `referral_commission_duration_months` — null means "use the global default"
- `referred_commission_until`, `referral_balance_usd`, `completed_payments`, `plan` (string or null; null means Free)

Also in the affiliate database: settings, withdrawals, commission ledger, payments.

CRM mail and campaigns live beside that:

- `MailRecord`: `userId`, `campaignId` or null, personalized `subject` and `body`, `sentAt` ISO
- `CampaignRecord`: name, subject, body, audience, `draft` | `sent`, `recipientIds`

Creating a user always creates both the `UserRow` and the affiliate profile. Deleting a user removes both and rejects that user's pending withdrawals.

Backups snapshot users, orders, coupons, content, media, gateway, storage, affiliates, mails, and campaigns. Restore of an older snapshot without mail or campaigns falls back to empty arrays. Seed snapshots have `snapshot: null` and cannot be restored.

## Packages and CRM stages

Packages live in `CRM_PACKAGES` inside `lib/crm.ts`. Replace this list with the host product's plans. Match `name` to the string stored on `AffiliateUser.plan` and on order `item`.

| Package | Paid | Price label | Features |
| --- | --- | --- | --- |
| Free | no | ৳0 | Account, Dashboard |
| Monthly plan | yes | ৳2,500 | Dashboard, Orders, Coupons, Email support |
| Brand kit | yes | ৳15,000 | Brand assets, Landing page, Media library, Priority support |
| Studio plan | yes | $29 | Monthly features, API access, Team seats, White label |

`plan === null` or `"Free"` resolves to the Free package. An unknown plan name becomes a paid custom package whose only feature is "Custom package".

Stage is derived. Nothing is dragged onto a status column.

1. Account `disabled` → **Disabled**. This wins over everything else.
2. Else if `plan` is a paid package → **Paid**.
3. Else if that person has an order with `status === "pending"` (matched by customer name) → **Pending**.
4. Else → **Free**.

A paying customer with a newer unpaid order stays **Paid**. The card shows `Waiting · {item}`.

Checkout sets `plan` to the purchased item and increments `completed_payments`. Refunding the last completed payment sets `plan` back to null. The board moves on the next render. No extra sync job.

Purchase counts are not the same as "who sits in the column".

- A column's people count is who has that package now.
- A column's purchase count is completed affiliate payments for that item, plus paid orders for that item whose number is not already that payment. `INV-1041` and order `1041` are one sale. Compare keys after stripping a leading `inv-`.
- Pending orders add to the waiting count, not the purchase count.
- Dragging a card, or changing the package select, calls `setUserPlan`. That writes `plan` (Free writes null). It does not create a payment and does not change the purchase count.

Kanban columns are the catalog packages, then any extra plan someone is on, then any item that has a purchase or a pending order (Logo pack appears this way). Empty columns stay so the pipeline is visible. Filters hide cards, not the column itself. The status board always has Free, Pending, Paid, Disabled.

List mode is the default. One row per person shows the package select, every feature chip, the stage badge, payment count, a pending item, and the last email time. Paid people with no email show "no email yet".

Filters combine with AND: search on name or email, package, stage, feature. Feature options are the union of catalog features and features on current people.

Export downloads `crm-users.csv` for the current filter only. Columns: Name, Email, Role, Account, Package, Status, Features, Payments, Pending order, Last email.

## Email and campaigns

Direct mail from the CRM:

- One person, the checked selection, or everyone in the current filter.
- Disabled accounts can be included when the admin picks them on purpose. The composer says so.
- Tokens `{{name}}` and `{{plan}}` are replaced per recipient before the row is stored. `{{plan}}` is the package name, so Free is the word Free.
- The demo queues mail in the browser. It does not open an SMTP socket. The Email screen is where a real sender would be configured.

Campaigns (`/admin/campaigns`):

- Audience is one of: all active users, a set of package names, a set of stages, or a set of user ids.
- Stages offered are Free, Pending, and Paid. Disabled is not a campaign stage.
- `audiencePeople` drops every disabled account, even if their id was checked.
- The screen shows the live recipient count and the first recipient's subject.
- Send uses the form values in that click, so an unsaved edit is what gets sent.
- A sent campaign cannot be edited or sent again. Delete removes the record. Already queued mail stays in the log.
- A draft with an empty audience can be saved. Send refuses when zero active people match.

SMTP presets on the Email screen: Gmail, Brevo, Resend, Zoho. Password is masked after save. Transactional toggles: verify, order placed, payment reminder, payment receipt, order status, order replies. Password reset is described as always on when sending is on. Test send is also a local toast in this demo.

## Person history

An eye button sits beside the name on Users, the CRM list, and CRM Kanban cards. It opens a drawer.

`buildUserHistory` in `lib/history.ts`:

- **Purchases** always show. They are that person's affiliate payments plus orders with the same customer name that were not already counted as the same sale.
- **Activity** is limited to areas unlocked by the current package. Account is always unlocked.
- Feature to area: Account/Dashboard → account. Orders → orders. Coupons → coupons. Email support → email. Brand assets, Landing page, Media library, White label → brand. Priority support → support. Monthly features → orders, coupons, and email. API access → api. Team seats → team.
- Account activity includes status, referral code, balance, who invited them, commission ledger lines, withdrawals, and admin activity lines that contain their name.
- If the user is the referrer, the line is "Commission from {buyer}". If the user is the buyer, the line is "{referrer} earned commission on this purchase".
- An unlocked area with no rows gets one empty line ("No API activity yet", and the same pattern for the others).
- Areas the package does not include are listed once at the bottom as "Not on this package".
- Orders match people by display name. Payments match by `buyer_id`. Prefer `buyer_id` when you add a real schema, and store `userId` on orders.

## Referral and checkout rules

Implement these in one place. `lib/referrals.ts` is that place. Do not re-code them inside a page.

Defaults: 10% commission, 10% buyer discount, 24 month window, minimum withdrawal $1, 110 BDT per USD.

Money is rounded to cents with `money()`. USD conversion is `amount / usd_conversion_rate`.

Codes are 4–16 lowercase letters or digits. A new code is the name stripped to those characters, or a random code if the name is shorter than 4 or the code is taken.

One code box at checkout. Classification checks coupons first, then referral codes. Coupons win when the text matches both.

Quote:

- Percent coupon is `listPrice * value / 100`.
- Fixed coupon values are in BDT. On a USD checkout, divide the fixed value by the conversion rate. The discount cannot exceed the list price.
- Referral percent applies to the price after the coupon.
- Referral discount is refused after `completed_payments > 0`, on your own code, or when paying with referral balance. Balance payment forces the referral percent to 0 but can still record the referrer.
- A disabled account cannot check out and cannot request a withdrawal.

Completed checkout:

- Increments `completed_payments`, sets `plan` to the item name, increments coupon `used`, writes a payment.
- Paying with balance subtracts `priceUsd` from `referral_balance_usd` only when the spendable balance covers it. Pending withdrawals stay reserved: spendable = balance minus pending withdrawal amounts.
- Commission uses the referrer's effective percent. BDT commission is converted to USD.
- The window starts on the first credit: `referred_commission_until = paidAt + duration months`. Duration `0` means no end. A later payment after the window does not credit.
- The same invoice is credited once per referrer.
- If the buyer had no `referred_by`, the first credited referrer is stored.

Failed checkout writes a failed payment and an order marked cancelled. No plan change, no coupon use, no commission.

Refund of a completed payment:

- Status becomes `refunded`. `completed_payments` drops by one. If it hits zero, `plan` becomes null.
- Balance payments are added back to `referral_balance_usd`.
- Coupon `used` drops by one when a matching code still has uses.
- The commission ledger gets one reversal and the referrer's balance drops by that commission. A second refund of the same invoice is refused.

Withdrawal:

- Requesting does not deduct the balance. It only checks the minimum and the spendable amount.
- Approve deducts only if the balance still covers the amount. Reject leaves the balance unchanged. A request that is no longer pending cannot be decided again.
- Payout methods: bKash, Nagad, Bank, PayPal, Wise, Binance.

Admin can credit a missed completed invoice again through `creditPayment`. That no-ops when the invoice was already credited. Admin can override one user's commission, discount, and duration; null restores the default.

`?ref=` on checkout is stored in `sessionStorage` key `sak-ref`. It applies only while the buyer still has zero completed payments and the admin has not overridden the code. The buyer id for the public desk is `sak-buyer`.

Checkout plans in the demo form: Monthly plan ৳2,500, Brand kit ৳15,000, Studio plan $29.

## Dashboard

`/admin` filters orders by an inclusive date range on `order.at`. Revenue sums paid orders in that range. USD amounts are multiplied by `usd_conversion_rate` so the total is in BDT. Paid rate is paid ÷ all orders in the range.

Range chips (day, week, month) change how the chart buckets time. They do not change which orders are included; the date inputs do. Category filter and the Overview / Orders / People / Activity tabs slice the same orders. Export CSV uses the rows on screen. "Send to email" in this demo is a toast, not SMTP.

Cancelling an order from the Orders screen refunds a matching completed affiliate payment when one exists. A cancelled order cannot later be marked paid.

## Other screens

These are real interactions on demo state. Secrets are masked in the UI. Nothing is sent to PayStation, Cloudinary, Telegram, or an SMTP server.

| Screen | Behavior worth keeping |
| --- | --- |
| Users | Search, create, role, enable/disable, delete, history. Duplicate email is refused. |
| Feedback | Status open, replied, closed. A reply marks the thread replied. |
| Orders | Filter by status. Mark paid or cancel, with the refund rule above. |
| Coupons | Percent cannot exceed 100. Value must be above zero. Max uses is null or an integer above zero. Codes are stored uppercase. |
| Affiliates | Global settings, per-user overrides, withdrawal decisions, credit, refund. |
| Payments | Gateway enabled, sandbox or live, merchant id. Password is never returned by the contract. Test is refused while the gateway is off. |
| Reviews | Status pending, approved, hidden. Featured flag. Manual testimonials. |
| Branding | Identity, logo, icons, SEO title, description, keywords. |
| Blog | Markdown body, cover, tags, draft or published. |
| Content | Generic pages and posts. Search plus draft/published filter. |
| Media | Library plus Cloudinary cloud name, API key, and API secret. Key and secret stay masked. |
| Notifications | Telegram on/off, bot token never returned, chat id, detect recent chats, event toggles, test message. |
| Social proof | Cards on or off, how long a card stays, gap, how many times one log plays, signup versus purchase, hide one log. Public `GET /api/social-proof` is the feed a site toaster would read. |
| Settings | Contact, theme, maintenance, social links, WhatsApp, analytics ids, invoice text, and which features stay in the menu. Hiding a feature removes it from the menu and keeps its data. Dashboard and Settings stay visible. |
| Backups | Create, download, delete. Restore requires the confirmation text `RESTORE`. |
| API map | Search and filter the catalog. Copy a path. Same data as `GET /api/catalog`. |

## API contract

Paths below are what `lib/catalog.ts` promises. Implement them server-side when the store is replaced. Keep admin routes behind the session. Never return SMTP passwords, gateway passwords, Telegram tokens, or Cloudinary secrets.

Auth: `POST /api/admin/login`, `GET /api/admin/me`, `POST /api/admin/logout`.

Stats: `GET /api/admin/stats`.

Users: `GET /api/admin/users?q`, `POST /api/admin/users`, `PATCH /api/admin/users/:id`, `DELETE /api/admin/users/:id`, `GET /api/admin/users/:id/history`, `PATCH /api/admin/users/:id/plan` (Free clears the plan).

CRM: `GET /api/admin/crm/people?q&package&stage&feature`, `GET /api/admin/crm/export` (same filter, CSV), `POST /api/admin/crm/messages` with `userIds`, `subject`, `body`.

Campaigns: list, create, `PATCH /api/admin/campaigns/:id`, `POST /api/admin/campaigns/:id/send`, delete.

Feedback: list `?status`, unread count, one thread, reply `{ feedbackId, body }`, patch status.

Orders: list `?status`, one order, patch status to paid or cancelled.

Coupons: list, create, patch, delete.

Referrals: settings GET/PUT, `PATCH /api/admin/users/:id/referral`, withdrawals list and approve/reject, `POST /api/admin/referrals/payments/:invoice/credit`, `POST .../refund`. Public: `POST /api/register`, `GET /api/referrals/me`, `PUT /api/referrals/code`, `POST /api/referrals/withdrawals`, `POST /api/checkout/code`, `POST /api/checkout/pay`.

The remaining screens follow the same shape as their catalog entries: GET the current settings with secrets omitted, PUT the settings, POST a test where the screen has one.

`GET /api/catalog` returns `{ name, description, modules: [{ slug, label, group, summary, functions, endpoints }] }`.

## Porting checklist

1. Add the four `lib` modules and point package names at the host product. Keep feature names stable or update `FEATURE_AREAS` in `lib/history.ts` to match.
2. Put `StoreProvider` around the app, or replace `useStore()` with the host's data client. Every screen should keep calling the same function names (`addUser`, `checkout`, `setUserPlan`, `sendMail`, `sendCampaign`, and the rest on the store type).
3. Gate `/admin` with the host's real session. Keep buyer pages outside that gate.
4. Persist `UserRow` and `AffiliateUser` as one account. Store `userId` on orders so history does not depend on display names.
5. On a successful payment, set `plan` to the product name and let the CRM derive the column. Do not also hand-move the card.
6. Run quote, credit, refund, and withdrawal only through `lib/referrals.ts`.
7. Send CRM and campaign mail through the SMTP settings. Keep the `{{name}}` and `{{plan}}` replacement, the disabled-account skip on campaigns, and the send-once lock.
8. Leave product-only editors out of `MODULES`. Register each shared screen in the catalog and in the nav icon map.
9. When a screen's behavior changes, change its `functions` and `endpoints` in the catalog so the on-page list and `GET /api/catalog` stay true.

## File map

```
app/admin/            admin screens, one folder per module
app/login             admin sign-in
app/checkout          buyer payment
app/register          buyer sign-up
app/dashboard/referrals   buyer referral desk
app/api/catalog       JSON module map
components/store.tsx  demo state and actions
components/shell.tsx  admin nav
components/frame.tsx  page chrome and API card
components/user-history.tsx   history drawer
components/desk.tsx   chrome for buyer pages
lib/catalog.ts        screens and API contract
lib/crm.ts            packages, stages, filters, mail tokens
lib/history.ts        package-scoped history
lib/referrals.ts      money, coupons, referrals, checkout
```
