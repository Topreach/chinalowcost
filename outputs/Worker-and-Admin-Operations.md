# ChinaLowCost worker and admin operations update

15 October 2026 · Editable prototype and implementation notes

## What is now connected

The prototype has 76 pages: 22 customer, 18 worker and 36 admin. Staff screens now use the expanded departments, product specifications, declared quality, conditions, location-based transportation and promotional adjustments introduced in the customer app.

New pages: worker shift/check-ins (W16), assigned order workspace (W17), catalog draft library (W18), admin workers/teams (A33), worker tracking (A34), image/video collection (A35), category schemas (A36). Existing worker and admin pages link to these workflows and show the relevant operational records.

## How admin collects product images

1. Open Admin → Images & video capture (A35).
2. Select a sample product and Create new version, or resume a draft.
3. Record supplier/content permission and its agreement or visit reference.
4. Select several JPG, PNG or WebP photos and optionally MP4/WebM video. Up to 8 images and 2 videos can belong to one draft. Choose a primary image. Front, back, labels, packaging and close-up details should be included.
5. Enter department, product type, design, grade, condition, variant, SKU, MOQ, pack multiple, quantity threshold, private supplier cost, selling tiers and shipping measurements. Complete the category-specific specification fields.
6. Save a draft or submit for independent review.
7. Open Catalog review (A08), choose a different authorized reviewer, inspect media/rights/specifications/prices, then publish or request correction.
8. Open the customer product. Approved attached photos appear in its gallery and product cards; approved specifications and pricing appear in product details and filters.

Approved attached clips also appear on the customer product and video-commerce screens with playback controls. Draft media remains staff-only. Reattaching the same missing local file restores its existing metadata entry rather than adding a duplicate.

Actual files stay on the device. They are not uploaded to a cloud service in this prototype. File previews survive navigation in the current browser session, but must be reattached after refresh. Metadata and approved product versions persist in browser local storage where available. Missing files show “reattach”; the customer gallery falls back to clearly illustrative reference images. This is not durable production media storage.

## Worker catalog workflow

Manager approves a worker and assigns a supplier visit → worker records permission → captures multiple photos/clips → inspects sample AI suggestions → completes full product fields → submits → independent catalog reviewer publishes. Suppliers have no accounts.

Chidi is the sample Fieldworker; Musa is the sample Delivery worker; Amina is the sample Catalog worker. Use Worker → Profile to select the sample identity. This identity switch is a prototype review control, not real authentication. Pending/suspended workers cannot perform protected write actions.

The draft library supports multiple products rather than overwriting a single capture. Supplier cost stays out of published customer fields. Grade declaration is kept separate from review evidence and certification. Vehicles and specialist equipment remain quote-only. Ordinary parcel goods need actual and carrier-volumetric unit weight before publication.

## Teams and assignments

Workers & teams shows approval state, role, team, base state/town, workload and shift status. New sample workers start Pending approval. Manager activation enables role-scoped actions; suspension blocks mutations and ends location sharing.

Assignments include task type, approved worker, supplier/order reference, SKU, unit quantity, state/town, due time and status. Catalog workers receive visits; procurement workers receive pickups; delivery workers receive delivery/return tasks. The combined Fieldworker demonstration role supports those functions but does not grant finance verification.

The current customer order can be synchronized into staff tasks from Admin → Orders. Each line gets a pickup assignment and the delivery task receives the order’s destination. Staff order screens display goods, grade/condition, destination, product discount, transport charge, transport discount, promo and the frozen paid total. Updating a task does not reprice a paid order.

## Tracking and check-ins

Worker → Shift & check-ins provides explicit consent, Start shift, manual state/town check-ins, optional device location and End shift. Manual check-ins work without granting device permission. Device coordinates are requested only after the worker clicks the location action, remain in browser memory, and are discarded when the shift ends or the worker is suspended.

Admin → Worker tracking shows last known town/state, last update time, on/off-shift state, active tasks and stale indicators after 15 minutes. The location board is a schematic, not a live street map. No coordinates are sent to third-party maps and no background GPS service is running. A browser may refuse device location for a local file; manual check-ins remain available.

Production tracking needs authenticated worker sessions, per-shift consent, assignment-scoped access, recorded purpose and retention, a secured location ingestion endpoint, freshness/accuracy controls and clear off-shift behavior. Precise worker coordinates must never appear in customer APIs or public media. Real-time street maps and automated route optimization are subsequent integrations, not included in this local prototype.

## Procurement and fulfillment

Assigned pickup screens use the task’s SKU and quantity. Accepted plus rejected units must equal the assigned quantity. Receipts record worker, time and discrepancy note; rejected units block the task. Admin receipts show these records. Packing/dispatch requires accepted goods. Delivery proof requires an active assigned delivery worker, dispatched state and the sample customer OTP 123456. Completion updates the shared delivery state.

COD collection and returns remain role-scoped. A worker cash record is unreconciled until finance verifies handover. The historical COD example remains separate from an online-paid current order. Returns require an assigned collection task and do not automatically refund the customer.

## Review and production boundaries

Independent publication prevents requester self-approval, requires a submitted version, attached image and content rights, and rejects selling tiers below the recorded supplier cost pending separate margin-exception approval. Approved customer metadata excludes supplier purchase cost.

The prototype’s role checks and audit records demonstrate behavior; they are not a production security boundary. The page/app/identity switchers intentionally let reviewers inspect layouts. Production must enforce authorization and ownership on the server for every read, write, export and file operation.

Production media needs private staged object storage, validated signed uploads, content scanning, image/video processing, per-asset rights, durable approved versions and cache invalidation. Publication must bind approvals to immutable product/media versions and a transactional outbox. Device blobs and browser local storage must be replaced for deployment.

Suggested backend additions: StaffTeam, StaffRoleGrant, WorkerShift, Assignment, AssignmentEvent, WorkerCheckIn, LocationConsent, MediaUploadSession, ProductMediaVersion, CatalogDraftVersion, SpecificationEvidence, GoodsReceipt and DeliveryProof. Link these to the existing users, suppliers, products, orders, shipments and audit records.

## Suggested full demonstration

1. Manager approves Chidi in Staff approvals.
2. Chidi starts a shift and records a manual visit check-in.
3. Create a product draft, confirm rights, add several local images or sample illustrations, enter specifications and submit.
4. A different catalog reviewer publishes; inspect the customer product gallery and filters.
5. In Orders, assign the current order to field tasks.
6. Chidi records an inspected pickup and dispatch.
7. Switch Worker Profile to Musa; record a check-in and delivery OTP.
8. Review Worker tracking, Goods receipts, Orders, team reports and the audit trail in Admin.

## Current staff access policy

Customers can register. Worker and admin applications are login-only; public worker signup and admin invitation signup are disabled. A signed-in Manager creates worker login credentials from A02, A33 or A39, then gives the email, initial password and recovery code directly to the worker. Remove access immediately revokes the worker session and blocks login while retaining work history; Restore access reinstates it. Workers can change their own password. A41 contains admin account security. This policy supersedes earlier staff signup or invitation references. Suppliers have no logins.

## Unified job review update

A06 now supports acceptance, progress, evidence submission, Manager review, corrections, reassignment and revocation across eight job types. A26 lists work awaiting review. Workers cannot mark work officially complete. See Job-Control-and-Security-Readiness.md for the workflow and required server-side security implementation. This remains a local prototype; a database connection alone does not make it production-ready.
