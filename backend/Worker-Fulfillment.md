# Worker operations and order tracking

These changes connect the original worker screens to operational database records.
They preserve the original homepage and styling. All financial transactions remain
test transactions; this release is not authorization to fulfill real purchases.

## Workflow and screen locations

1. Admin creates active workers with Catalog, Procurement, Delivery or Fieldworker
   roles. Admin assigns tasks on A06 with an order, SKU, quantity and destination.
   Fulfillment work requires a paid test order or an enabled/approved test COD order.
2. Workers accept and start their task, complete the three checks, and upload actual
   JPEG/PNG/PDF evidence (maximum 5 MB) through the configured malware scanner.
   Supplier visits first record the representative, permission reference and
   consent/refusal on W03. Catalog/media task evidence must name the worker's saved
   product draft with the matching SKU; completing that task requires independent
   publication of the actual product, not just a claimed text reference.
3. W07 records supplier availability against the assigned procurement order. A
   shortfall/unavailability blocks the task for resolution rather than changing stock.
4. W08 records pickup; W09 records accepted/rejected inspection quantities. Admin
   independently reviews submissions on A14/A15/A26 before quantities count.
   Replacement pickups can cover reviewed rejected units without double-counting.
5. W10 records packing of accepted inspected units. Admin A15 dispatch requires
   every ordered unit packed, a unique tracking number/carrier, scanned handover
   evidence and an accepted delivery task for the full shipment quantity.
6. W11/W12 record in-transit/out-for-delivery/failed-attempt updates and delivery
   proof. Delivery requires the customer's current six-digit code, receiving-person
   name, scanned evidence and independent Admin review. No sample OTP works.
7. Customer C16 displays carrier, tracking number, progress history and the private
   delivery code. The customer can replace an expired/compromised code. Codes
   expire after seven days, are encrypted/hashed on the server, and are omitted
   from worker/Admin snapshots. The tracking screen refreshes every 30 seconds.
8. Customer C19 requests returns within 14 days, with item quantity and scanned
   evidence. Admin A21 authorizes collection. Admin assigns the approved case to
   a Return collection task; W14 submits the collected goods. Admin reviews receipt
   and inspects the return before marking it accepted for refund.

Each task/submission/shipment has revision checks. Accepted counts cannot exceed
received units; packing cannot exceed inspected accepted units; dispatch cannot
skip packing. Duplicate/stale actions fail without updating the order. Normal job
approval cannot bypass the specialized fulfillment checks. Order-file access is
scoped to the customer, Admin, and assigned workers. Task reassignment/revocation
updates automatically granted order access.

## Cash on delivery

Admin A30 can enable test COD. Customer quotation review offers COD separately
from Paystack/store credit. COD cannot use wallet credit. A COD order is explicitly
unpaid until reconciliation and cannot be charged through Paystack.

After reviewed delivery, W13 records the exact collected amount and evidence.
Admin A18 independently confirms cash handover with their own scanned evidence.
Discrepancies remain unresolved rather than creating a payment. Confirmation
records one settlement and any eligible test referral reward atomically.

## Catalog, AI, clips and location

Worker W05 can request AI specification suggestions through Admin-configured
OpenAI. Catalog/Fieldworker role, photo consent, validated image bytes, usage limits
and manual review apply. Suggested title/description/specifications are copied to a
local editable draft, never automatically published or treated as verified prices.

W04 now stores up to two short MP4 clips per product (5 MB each). Clips are scanned;
quarantined/rejected files cannot play. Upload/removal withdraws publication and
requires renewed rights confirmation and independent product review. Clean clips
are private until publication; reviewed clips can play on the product page.

Worker GPS check-ins now use the application's confirmation dialog rather than a
browser-native confirm blocked by the iframe sandbox. They remain explicit,
on-shift, role-scoped check-ins; no background GPS or live courier map is enabled.

## Setup and practical limits

Configure and verify the malware scanner, real SMTP and OpenAI credentials before
operator acceptance testing. Without a working scanner, evidence/media uploads
fail closed. No provider calls, physical cash handovers or real deliveries were
performed during development. Automated tests use mocked scans/providers.

This is an internal whole-order shipment workflow. External courier webhooks,
split shipments, stock reservations, structured purchase-order finance and supplier
settlements remain separate work. Returns can reach **Accepted for refund**;
actual refund execution, bank transfer reconciliation, refund/commission reversals,
live payments and cash payouts are not implemented by these worker controls.
Some unrelated reports/settings still contain prototype metrics or placeholder text.

Run `npm run build` and restart locally, then upload the updated archive to Contabo
using `Deploy-Original-Application.md`. Preserve database, uploads and encryption key.
