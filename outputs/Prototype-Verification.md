# ChinaLowCost prototype verification

Verified 15 October 2026.

- All 86 page routes render: 25 customer, 21 worker, 40 admin.
- Empty, error and offline previews are checked for each route (258 alternate states).
- Internal route targets, unique element IDs and inline handler syntax pass.
- Every page passes the structural HTML balance check.
- Wholesale tier boundaries, MOQ/pack validation, quotation acceptance and expiry pass.
- Sample PDF header and cross-reference structure pass.
- Independent approval, catalog submission/consent gates and inspection validation pass.
- Simulated payment creates a frozen order total; repeated simulation does not change it.
- All 36 states plus FCT are available, with representative town suggestions and custom entry.
- Location and chargeable-weight transport estimates, unknown-route payment blocking and separate discount lines pass.
- Promo eligibility, minimum spend, caps, expiry, inactive status and redemption limits pass.
- Changed destination or rate invalidates quote acceptance; original quotation and paid totals remain frozen.
- All 32 departments have sample product coverage (33 products total).
- Category, design/style, price range, quality grade, condition, search and price sorting pass.
- Three distinct illustrative gallery views and four product-detail tabs pass.
- Vehicles/specialist goods cannot enter ordinary checkout; tyre-specific MOQ, pack and tier validation pass.
- Visible previous-page navigation and customer/worker/admin home fallbacks pass.
- Worker activation and role gates, media permission, multi-image drafts and independent publication into customer views pass.
- Published customer fields exclude supplier cost; receipt retries cannot duplicate accepted goods.
- Assigned delivery requires dispatch and OTP; shift consent, manual check-ins and location clearing pass.
- Duplicate cash collection references do not post twice; cash variance blocks finance reconciliation.
- Customer, worker and admin credentials/sessions are separate; private customer workspaces remain isolated.
- Worker and admin signup are disabled. A Manager creates worker logins; removing access revokes sessions and blocks login.
- Password change validates the current password, revokes old account sessions and leaves other application accounts unaffected.
- Recovery requires the matching account code, rotates it, and preserves unrelated sessions.
- Signed-in worker identities and restricted catalog-reviewer admin scopes are enforced by the prototype UI.
- Unified job acceptance, evidence, correction/resubmission, Manager approval, reassignment, role restrictions, revocation and stale-action checks pass.
- WhatsApp dummy mode creates no external link; Manager settings, number validation, prepared messages, disabled mode and live-link encoding pass.
- Private saved addresses/products, archived orders, reorder cart reset, order-linked task synchronization, checklist gating, CSV validation and draft-only import pass.
- Standalone HTML embeds its style and scripts; source archive integrity passes.

These are code-level prototype checks using generated markup and a simulated document environment. They do not validate a production backend or every native browser behavior. Automated visual browser inspection remains unavailable because the browser URL policy denied local-file observation. Responsive CSS is included, but device screenshots and production accessibility testing remain outstanding.
