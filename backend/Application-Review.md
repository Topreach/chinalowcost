# Application review ? 17 October 2026

Scope: local source, original-interface adapters, backend routes, SQLite rules and automated verification. This does not inspect the running Contabo installation, actual provider credentials or browser/device behavior. The original homepage is unchanged. Prior reports contain stale WhatsApp/notification descriptions; the current implementation is summarized below.

## Highest priority before taking real orders

| Priority | Gap | Evidence / consequence | Required work |
|---|---|---|---|
| 1 | Live commerce remains disabled | config.cjs only accepts sk_test_ keys; Payments.verify requires domain=test; referral wallet and COD settlement remain test records. | Design a distinct live environment, complete provider acceptance and financial reconciliation, prevent mixing test/live orders, credit and commission records. Simply accepting a live key is insufficient. |
| 1 | Inventory quantities and reservations | Business.product checks published/out-of-stock flags but checkout has no transactional available/reserved stock ledger. Supplier availability checks are task evidence, not reservations. | Add per-SKU/supplier available/reserved/received adjustments, reservation expiry/release and concurrent oversell tests. |
| 1 | Refunds and cancellation reconciliation | Return review can reach Accepted for refund but does not execute a provider refund. Non-wallet cancellation and already-attempted payment resolution lack a complete workflow. | Refund requests, independent approval, idempotent provider execution, verified settlement, partial refund limits and proportional wallet/referral reversals. |
| 1 | Deployment and perimeter behavior | server.cjs derives the IP limit from socket.remoteAddress. Behind Nginx, traffic shares a proxy address; the 120/minute bucket and login IP bucket can group unrelated customers. Current source also has no health/readiness endpoint. | Explicit trusted-proxy/CIDR handling with spoofing tests, origin lockdown/edge limits, monitored health checks and provider acceptance on Contabo. Never trust arbitrary forwarded headers. |
| 1 | Backups and operational recovery | backup.cjs makes a local SQLite snapshot. Upload files and environment encryption keys require a separate protected plan. Queues assume one application process; explicit signal-aware shutdown is absent. | Automated encrypted off-server DB/files/key backups, retention and restore drill, disk alerts, single-process service configuration and graceful SIGTERM handling. |

## Other unfinished business sections

- A13 procurement purchase orders and supplier purchasing approvals: the existing screen still shows PO-DEMO-001. Pickup/inspection/packing evidence does not replace a PO and its approved supplier terms.
- A20 supplier liabilities, advances and settlements: no complete payable ledger, receipt matching, independent settlement approval or verified supplier payment execution.
- A09 dedicated price-change requests: still opens a prototype action form. Actual product prices can be edited through saved catalog drafts and independent publication, but this specific price-book action is not connected.
- A10 stock/reservations: still contains fixed sample quantities and freshness metrics; replace them with the inventory implementation above.
- A11 negotiated discount form: approved quote shipping/tax works; the separate negotiation/discount exception form still calls the blocked prototype record handler.
- A19 refund approval screen and A27 reports/export: contain sample finance records. The payment ledger exists, but complete financial statements, exports, date filters, refund/fee treatment and payable reporting are not connected.
- A28 general business settings: proposed quote-validity/PO thresholds/terms form does not persist policy. Quote validity remains fixed in backend logic. Tax is approved per quote, not a full tax rules engine.
- W15 offline/sync screen: fixed demo queue/status remains. There is no durable offline worker submission queue or conflict resolution. Authenticated pages are deliberately not cached by the notification service worker.
- Bulk catalog import and category/specification administration: bulk import explicitly declines saving; dynamic category schemas and validated import preview/error reporting remain incomplete.
- Fine Admin permissions: server authorization generally distinguishes Admin/customer/worker plus worker work roles. Finance/catalog/support-specific Admin scopes are not implemented, despite some independent review checks.
- Lost-MFA recovery: enrolled users have recovery codes, but independent recovery for users who lose both their authenticator and recovery codes is not complete. Passkeys and a substantial compromised-password blocklist remain future work.

## Integrations and user experience requiring acceptance

- Internal tracking, delivery codes, reviewed proof and returns collection work. Courier provider webhooks, split shipments and comprehensive multi-SKU shipment acceptance remain to be completed/tested.
- Google customer sign-in and reCAPTCHA use configured Admin values. Maps links/GPS check-ins work without an embedded Google Maps key; embedded Maps/Places/autocomplete remains unimplemented.
- WhatsApp now has verified incoming-text AI replies, queue/deduplication and Admin credentials. It does not have a synchronized staff conversation inbox, approved business-initiated order templates, or delivery/read callbacks.
- Branded operational/account emails and queued notifications are implemented. SMTP authentication/deliverability, SPF/DKIM/DMARC and bounce processing still require provider/deployment work.
- Browser/mobile web push is implemented, but actual HTTPS/browser permissions, installed iOS behavior and delivery have not been accepted on real devices. Native mobile apps are not implemented.
- Yoruba/Hausa/Igbo cover core navigation and requested AI language. Advanced forms, validation messages, email chrome and operational notifications still use English in many places.
- Account-scoped support and Admin broadcasts are implemented. A synchronized multi-agent support inbox with ownership, escalation and service-time tracking is not.
- Accessibility, keyboard/mobile layouts, camera behavior and loading/error/slow-network flows still need real-browser acceptance. Rendering all 86 screens in Node/VM does not test every button or establish usability.
- Placeholder/sample metrics should be replaced with database values or clear unavailable states. Do not remove warning labels from financial sample records until their workflows are connected.

## Confirmed implemented areas

Database accounts and profiles, password change/reset, Admin MFA, account isolation, catalog draft/publication and scanned media gates, server pricing/cart/address/quote/checkout rules, Paystack test verification, referral codes/promotions/test store credit, worker tasks/evidence, internal fulfillment and tracking, OpenAI chat/product discovery, Admin messages, HTML email templates, automatic event notifications and opt-in web push.

## Suggested implementation order

1. Inventory quantities/reservations and real purchase orders.
2. Refund/cancellation, supplier payables and test/live financial separation.
3. Database-backed reports, business policies, price-change requests and fine Admin scopes.
4. Deployment hardening, off-server recovery, live provider checks and browser/device acceptance.
5. Offline worker sync, courier/split shipments, complete translations and remaining convenience integrations.

The web application should remain in a test/pilot stage until the first four groups are resolved. No production change or real external transaction is performed by this review.
