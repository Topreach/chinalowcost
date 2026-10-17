# Configuration-free improvements

15 October 2026

## Added to the local prototype

- **Notifications:** account-specific assignment, review, issue, revocation/reassignment and simulated order-confirmation notices. Open Notifications from the signed-in application. Read state persists locally. External delivery of notifications is not connected.
- **Address book:** save up to 20 named delivery addresses under C11/C20; select or remove them. Selecting an address requires reviewing transportation again. Each account has its own list.
- **Saved products:** save/unsave from C07 and view the list in C20.
- **Repeat ordering:** C15 shows account-specific archived orders with unique references. Reordering asks before replacing the cart and uses current product pricing; previous paid snapshots remain retained. Specialist/unavailable goods require support/new quotation.
- **Job checklists:** eight task-specific checklists; submission is blocked until completed. Reassignment clears checklist completion. Priority and overdue indication are shown in job detail.
- **Local evidence files:** attach up to ten JPEG/PNG/WebP/PDF/MP4 files under 10 MB each in job detail. Previews last for this browser session; metadata and submission attachment references are retained. Reattach after refresh. No durable/private upload service is connected.
- **Order-linked fieldwork:** A12 lists customer orders; open one before synchronizing pickup and delivery tasks. Tasks retain order/customer references and use approved compatible workers. A06 can link additional packing/inspection jobs to an order. Duplicate synchronization preserves existing jobs. Staff order summaries resolve the linked order. Packing checks require that order's approved receipt, not another order's receipt for the same SKU. Tracking milestones are stored per order.
- **Supplier records:** A04 saves staff-managed contacts, premises and evidence references; Managers can verify or place records on hold. Suppliers have no accounts. Evidence references still require real-world verification.
- **Catalog import/export:** A07 accepts a CSV file or pasted CSV for up to 200 new draft SKUs. Validate and preview before committing. Invalid/duplicate SKUs and invalid selling rules block the import. Drafts inherit a category template but require individual checks of specifications, costs, weights, rights and media. Import never publishes products. Export downloads the current public catalog as CSV.
- **Screen inventory:** removed outdated worker-signup/admin-invitation descriptions.

## Try it

Refresh Screen-Blueprint.html. Customer: C07 save product, C11 save address, C20 view saved lists, C15 reorder. Worker: W02 open a job, accept/start it, complete the checklist and add evidence before submission. Admin: A04 supplier records, A07 import/export, A12 choose an order and create tasks, A06 linked jobs and priority, A26 review submissions.

## Deferred configuration and implementation

Database/server deployment, trusted authentication/authorization, MFA, real verification/recovery, durable private media storage, real payment/refund/settlement providers, courier rates and callbacks, real delivery codes, AI services, automated WhatsApp/inbox synchronization, and external notifications remain for later. Browser-local role checks and file previews are not production security.

Real-device/accessibility testing, concurrency/security tests, monitoring, backups and launch verification remain required. Supplier banking, independent finance approvals, detailed supplier-product mapping and robust warehouse allocations still need further implementation. This update does not claim those are complete.
