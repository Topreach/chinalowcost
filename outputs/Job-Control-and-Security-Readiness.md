# ChinaLowCost job control and production readiness

15 October 2026

## Implemented in the browser prototype

Admin → Assign work (A06) supports supplier visits, photos/video, catalog entry, pickup, inspection, packing, delivery and returns. Only a signed-in Manager can create, reassign, revoke or approve a job. Workers can act only on their own active assignments with the appropriate role. A26 includes work awaiting review. Open a task to see its evidence and history.

Assigned → Accepted → In progress → Submitted for review → Completed (Manager approved).
Submitted for review → Needs correction → In progress → resubmitted for review.
Accepted / In progress / Needs correction → Blocked → In progress.
Open assignments can be reassigned to an active compatible worker, returning to Assigned. Open jobs can be revoked with a reason. Closed jobs require a follow-up assignment. Reassignment retains prior evidence and reviews; the new worker must submit fresh work. Stale modal actions are rejected using the job revision. Reasons are required for correction, reassignment and revocation.

Each submission records the worker account, assigned worker, time, work summary, evidence reference, units and assignment revision. Manager review is recorded separately. Existing task history is retained. Legacy completed records without admin review become Needs correction so the assigned worker can resume and submit fresh evidence. Product publication still requires independent catalog approval; job approval never publishes products or approves a refund.

Pickup submission requires a recorded goods receipt. Delivery submission requires dispatched shipment and sample customer-code verification. Delivery verification alone does not set customer delivery complete: job approval does. Generic work evidence is a reference and written report; external storage and evidence integrity verification are not connected. Production must validate referenced media/receipts belong to this task, rather than trusting text entered by a worker.

## Security boundary

This remains an editable, browser-local demonstration. It is not ready for real customers, payments, staff identities or private data. Password hashes, role checks, revision checks and audit events in local JavaScript can be altered by the device owner. They are workflow demonstrations, not trusted access controls. Connecting a database directly to these pages would not resolve that limitation.

## Required production implementation

1. Serve the application over HTTPS with a server API. Remove public demo credentials and sample recovery codes. Bootstrap the first administrator through a controlled deployment process, with no public admin signup.
2. Implement identity on the server or a managed identity provider. Hash passwords using the provider's current supported secure policy, rate-limit login/recovery, require admin MFA, issue HttpOnly Secure SameSite cookies, protect mutations against CSRF, and revoke sessions server-side on worker access removal or password reset. Never trust a role or worker ID supplied by the browser.
3. Store customers, staff identities, assignments, submissions, reviews and events in a transactional database. Authorize every read and mutation from the authenticated identity. Workers see only assigned job/customer information needed for their work; customers see only their own orders, addresses and quotes. Separate finance, catalog reviewer and Manager permissions on the server.
4. Apply the transition rules above in a database transaction. Lock the job or compare its version. Recheck assignment, role, worker access and current status before committing. Require a unique request key for retried mutations. Save review and immutable audit events in the same transaction. Revoke/reassign must invalidate previously issued upload authorizations and pending job actions.
5. Use private object storage and short-lived, task-scoped upload/download authorization. Validate size, type and file signature, scan uploads, remove sensitive metadata as appropriate, record supplier usage consent, and block public access before catalog approval. Evidence IDs must identify stored, authorized objects with integrity metadata. Retain evidence after access removal according to the retention policy.
6. Verify payments through the provider on the server. Validate webhook signatures, amount, currency and order identity; deduplicate provider events. Browser success screens must never mark an order paid. Keep receipts, cash collection, finance reconciliation and supplier liabilities separate. Job approval alone must not post money movements.
7. Implement real delivery verification with expiring, rate-limited, task-specific customer codes; remove the sample code 123456. Supplier pickup, inspection and packing approval must control inventory and dispatch through explicitly validated server transitions. Physical events and administrative acceptance are separate records; corrections should create exceptions, not erase physical history.
8. Connect AI and WhatsApp only through the server with protected credentials, usage controls and human review. Validate AI output as untrusted data. Verify integration callbacks; record customer messaging consent and implement operational retry/error handling.
9. Add monitoring, durable audit storage, encrypted backups and tested restore procedures. Limit location collection to consented shifts, enforce retention, and remove unnecessary customer/staff fields from API responses and logs.
10. Complete real-browser mobile/accessibility review, integration tests, cross-account authorization tests, concurrency/replay tests, upload tests, payment sandbox verification, recovery/MFA tests and a security review before launch.

## Suggested API contract

| Action | Endpoint | Authorized identity |
|---|---|---|
| Create worker | POST /staff | Manager |
| Remove / restore staff access | POST /staff/:id/access | Manager |
| Create job | POST /jobs | Manager |
| List / view jobs | GET /jobs; GET /jobs/:id | Manager or currently assigned active worker |
| Accept / start / issue / submit | POST /jobs/:id/actions | Currently assigned active worker |
| Approve / correction / revoke / reassign | POST /jobs/:id/actions | Manager |
| Upload evidence | POST /jobs/:id/evidence-upload | Active assigned worker for an editable job |

Mutation body: action, expectedVersion, requestId and the action-specific fields. Server obtains actor ID and role from the session. Return 401 for unauthenticated access, 403 for unauthorized identity, 409 for stale version or invalid transition, and 422 for invalid evidence or input. Do not leak job details to an unauthorized caller.

Core tables: accounts, staff_profiles, sessions, jobs, job_assignment_events, job_submissions, job_reviews, job_evidence, audit_events, idempotency_requests. Link jobs to supplier/order/product records and snapshot relevant destination and scope. Use database foreign keys, enum/check constraints, integer quantities, timestamps and optimistic versions. Store password/identity data separately from operational profile fields. Evidence, submissions and reviews are append-only records; audit actors remain attributable after access removal.

## Acceptance checks before launch

A removed worker cannot read private job details, mutate work, upload evidence or reuse an existing session. An old assignee cannot submit after reassignment. A worker cannot approve their own work, impersonate another worker or read another customer's order. A reviewer cannot create staff, assign jobs or operate finance. Replayed submissions, reviews, payments and receipts cannot duplicate effects. Simultaneous revoke/submit or reassign/submit accepts only a valid serialized outcome. Corrections preserve all earlier evidence. Approved catalog changes do not alter frozen quotes or paid order totals.
