# ChinaLowCost application review

15 October 2026

**Follow-up:** several local prototype gaps identified here have since been addressed. See Configuration-Free-Improvements.md for saved addresses/products, notifications, job checklists and attachments, unique archived orders, order-scoped dispatch checks, supplier records and catalog import/export. Production services and security remain outstanding.

## Scope and conclusion

Reviewed the editable application source, 86-screen inventory, latest verification report, account/job controls and integration handoff documents. This was a source review, not a new live-browser, penetration or production-integration test. Prior automated checks cover generated page markup, simulated document behavior and selected business transitions; passing them does not establish production readiness. Visual/device review remains outstanding.

The screen coverage is broad. The highest priority is completing the underlying operational records and secure server behavior. A database connection alone will not complete the application. Suppliers remain staff-managed with no logins.

## Confirmed corrections and gaps

| Priority | Finding from current implementation | Required correction |
|---|---|---|
| Before launch | Staff rendering selects the last shared sample customer workspace rather than deriving each job's customer/order context. | Store explicit job → order → customer relationships and authorize every read. Test two customers and two workers concurrently. |
| Before launch | Packing checks accepted receipts by SKU and quantity, without matching the order/allocation. Dispatch and delivery use global flags. | Scope receipts, allocations, inventory, shipments and milestones to each order/shipment. A receipt from another order for the same SKU must not authorize dispatch. |
| Before launch | Evidence submission accepts a typed reference; it does not establish ownership or existence of a stored evidence file. Delivery still uses sample code 123456. | Add private, job-linked uploads and verified evidence IDs; implement expiring, attempt-limited delivery codes per shipment. |
| Before launch | Accounts, permissions, password/session checks, jobs and audit history are browser-local. Only Manager and Catalog reviewer admin scopes have concrete account examples. | Implement server identity, admin MFA, verified recovery, session revocation and distinct finance/support/operations permissions. Enforce independent approval on sensitive changes and money movements. |
| Before launch | Payments, transfers, refunds, settlements and reconciliation remain simulations. | Add verified payment-provider callbacks, idempotency, accurate ledger records, finance review and reconciliation. Browser buttons must not mark funds paid. |
| Before launch | Supplier contact creation and role-change forms record sample actions rather than maintaining complete operational records. | Make supplier onboarding, premises verification, contact editing, contracts, supplier-product mapping and approved role changes durable workflows. Supplier banking requires restricted access and independent verification. |
| Before launch | Orders use fixed demo identifiers and sample history; staff synchronization has sample worker IDs. | Add unique order/reference IDs, full per-customer order history, validated worker selection and reliable allocations across multiple suppliers. Preserve frozen quote and paid-order values. |
| Before launch | Media metadata persists but attached file previews are session-local. | Add private durable storage, file validation/scanning, consent records, processing status and reviewed public catalog assets. |
| Before launch | Nigerian transport rates and town suggestions are illustrative; specialist goods require manual handling. | Load actual supported service areas, verified carrier rates, weight/dimension rules and a staff transport-quote workflow for heavy/vehicle orders. |
| Before launch | Returns/refunds include sample cases rather than complete linked transactions. | Link return eligibility, collected goods, inspection, refund approval, executed payment refund and supplier recovery. Support partial quantities and rejected returns. |
| Before launch | Real-browser mobile/accessibility review has not been completed. | Test navigation, dialogs, keyboard focus, labels, contrast, touch targets, slow connections, upload interruptions and small screens on actual devices. |
| Prototype cleanup | Screen inventory still describes worker signup requests and admin invitations on W19/A39/A41, although runtime registration is disabled. | Align the inventory and supporting documentation with login-only staff access and Manager-issued worker credentials. |

## Useful additions

- Notification center: new job assignments, corrections, revocations, overdue work, quote expiry and order changes; include read/unread status and delivery preferences.
- Customer address book: multiple saved addresses, landmarks and separate business/contact details; the current profile primarily edits one delivery address.
- Bulk catalog import/export: validated spreadsheet upload, duplicate SKU checks, error report and independent publication review for large supplier catalogs.
- Configurable job checklists: required evidence by job type, overdue escalation and priority. Preserve the existing acceptance/review workflow.
- In-stock alternatives and reorder/saved-list actions for repeat wholesale customers. These are lower priority than stock accuracy and payment correctness.

## Planned integrations still unconnected

AI photo matching and catalog extraction require real services, human review, usage limits and quality tests. Video needs durable media processing and delivery. WhatsApp currently offers configurable customer-opened chat drafts only; automated notifications and synchronized inbox need server integration. Worker tracking uses consented local check-ins rather than a live courier/location service.

## Recommended delivery order

1. Correct customer/order/job/shipment relationships and complete durable supplier, permission and evidence workflows.
2. Implement server authentication, authorization, sessions, private storage and audit records alongside database transactions.
3. Integrate payment, stock reservation, delivery pricing, shipments and returns, then test concurrent orders and retries.
4. Add operational notifications and required integrations.
5. Conduct real-device, accessibility, backup/restore, monitoring and security testing, then run a small controlled pilot.

## External references

OWASP's object-level authorization guidance requires checking the authenticated user's access to each requested record: https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/

W3C WCAG 2.2 provides the accessibility reference for the device/browser review: https://www.w3.org/TR/WCAG22/

No application behavior was changed during this review.
