# Prototype to database integration

The frontend is the existing 86-screen prototype in `outputs/`. Its CSS, homepage
function, navigation and screen layout sources are retained. The connected build
substitutes server adapters for demo account and business mutations. It does not
use the separate account dashboard as the homepage.

## Architecture

- `/` and `/application`: original frontend, with a visually transparent host.
- `/application/frame`: original designed screens in an opaque sandbox. This
  preserves the prototype's inline handlers without granting them same-origin
  access to server cookies, storage or arbitrary network requests.
- `storefront-host.js`: exact-window message validation, explicit API allowlist,
  CSRF kept in host memory, bounded concurrent requests, restricted Paystack
  navigation. A sandbox is not a substitute for escaping database content; the
  connected build also escapes text that the demo assumed was trusted.
- `server-accounts.js` and `server-business.js`: adapt existing functions and forms.
- `business.cjs`: prepared SQLite queries and authoritative business rules.
- `/prototype`: retained standalone, isolated demonstration.
- `/secure`: retained maintenance interface, not the application homepage.

Do not copy the browser's complete `state` object to the database. It includes
sample finance events, fake accounts, provisional prices and client permissions.
Every mutation below derives identity from a validated server session instead.

## Connected workflows

| Existing screens | Data and actions | Backend |
|---|---|---|
| C01, C23, C24, C25; W01, W20, W21; A38, A40, A41 | Login, registration, reset request, logout, password changes, admin MFA | Existing `/api/auth/*`, users, hashed sessions and challenges |
| C02–C04, C07 | Published products, category/search filtering, details | Public `/api/storefront/catalog`; no private supplier costs or unpublished drafts |
| C10 | Add/remove/reorder cart lines | `/api/business/cart`; account isolation, revision checks, server prices and pack rules |
| C11, C20 | Current address, address book, saved products | `/api/business/address`, `/saved`; customer_profiles |
| C08, C09, C12; A11 | Quote request, frozen goods prices, transport/tax approval | `/quote`, `/quote-approve`; business_quotes |
| C09, C13, C15 | Accept approved quote, create order once, Paystack test checkout, order history | `/checkout`, `/api/orders`, existing Paystack APIs; quote_orders plus orders |
| A04 | Supplier contacts/evidence and verification | `/supplier`; independent verifier required |
| A02, A33, A39 | Create worker login, activate/suspend access | `/worker-create`, existing user-status API; sessions revoked on suspension |
| A06; W02 and existing job dialogs | Assignment, accept/start, checklist, issue, evidence submission, independent review, reassignment/revocation | `/task`, `/task-action`; business_tasks with revisions/history |
| W04, W06, W18; A07, A08, A35 | Persist full catalog drafts, scanned JPEG/PNG uploads, independent publication | `/catalog-draft`, `/catalog-review`, catalog image API; products/product_images |
| W16; A34 | Consented shifts and manual check-ins | `/shift`, `/checkin`; staff_profiles |
| A32 | Destination/weight rates | `/rate`; delivery_routes; unknown routes never become free delivery |
| C18, A22 | Account-scoped support messages | `/support-message`; support_messages |
| Existing notification control | Event + announcement inbox, unread totals, pagination, read-all, email/push preferences | /api/notifications; encrypted device subscriptions; durable background delivery |
| C18 | AI shopping chat, optional product photo, external price research, human support toggle | Existing `/api/ai/chat`, bounded transient history and consent |
| C05, C06 | Photo identification and approved product/price matches | Existing `/api/ai/chat`, compressed consented image |
| A30 | Add/remove encrypted OpenAI key, model/limits, web search setting, connection test | Existing admin OpenAI APIs; MFA plus current password |
| A25, A35 | Photo/QR discovery, candidate sources and external observations, draft review | Existing discovery API and source evidence, never automatic publication |
| A22 | Preview and send group announcements to workers/customers/both, optional email batches | Existing messages APIs; frozen recipients and idempotent publishing |
| Shared header | English/Yoruba/Hausa/Igbo choice | Core navigation labels and requested assistant language; advanced text stays English |

Quotes require staff confirmation of shipping, availability and tax even when a
route estimate exists. Checkout never accepts a client-supplied total. Repeated
acceptance of one quote returns the same order. Payment remains separate from
commercial acceptance and is only marked paid after provider verification.

## Still incomplete — not a full production launch

- Supplier stock reservations, procurement POs and purchase approval policies.
- Actual refund execution/reversals, bank-transfer matching and supplier settlements.
- Cash referral payouts; bulk imports; category-schema administration and static reports.
- External courier webhooks and split shipments. Internal whole-order fulfillment,
  delivery codes, returns collection and independently reconciled test COD now use
  the database. See Worker-Fulfillment.md.
- Real scanner, SMTP, OpenAI and payment-provider validation; browser/device testing,
  trusted proxy/IP configuration and off-server backups.
- Synchronized staff WhatsApp inbox and business-initiated order templates. A23
  configures contact plus verified incoming-text AI replies; see WhatsApp-Setup.md.

## Verification

`npm run build` builds both standalone and connected versions. `npm test` checks
the original route layouts, connected empty-database rendering for all 86
screens, escaped product titles, backend authorization and persistence. An
integration test runs the original frontend scripts through the host bridge into
a real HTTP server and SQLite database: login → cart → address → quote → staff
approval → checkout → reload → logout.

These are automated Node/VM checks, not a claim of visual browser testing or
live Paystack, SMTP, OpenAI or malware-scanner verification. The Contabo server
has not received this update yet.
