# ChinaLowCost connected prototype guide

Open **Screen-Blueprint.html** in a browser. Refresh an already-open tab after the update.

**Separate accounts are now enabled.** Use Accounts-and-Access-Guide.md for demo credentials, signup, worker approval, admin invitations, password changes and recovery. Older sample-identity switching instructions below are superseded by signed-in account identities.

Use the **← Back** button above the page breadcrumb to return to the previous application page. A directly opened page without an in-session previous page returns to that application's home. The button is disabled at an initial home page.

## Find every page

The prototype supports 86 routes across the three applications. **App pages** opens a searchable index for the current application. Worker/admin routes and private customer pages require that application’s own sign-in. Every page has a bookmarkable route. Browser Back and Forward work between routes.

Customer navigation focuses on shopping, videos, quotations, orders and support. Worker and admin pages have their own task-oriented navigation. On smaller screens, a page selector replaces the sidebar. The page register consists of 22 customer, 18 worker and 36 admin screens. Staff workflows now include complete catalog drafts, multi-image/video capture, teams, check-ins and worker tracking.

## Suggested demonstrations

### Customer purchase

1. Open Customer → Categories → a product.
2. Choose Retail or Wholesale. Wholesale quantity must be at least 10 and a multiple of 5.
3. Open the calculator, update the quantity and create a quotation.
4. Download its sample PDF, accept it and review the cart.
5. Choose a Nigerian state and town, confirm the delivery estimate and simulate payment. Towns without configured rates require a staff transportation quotation before payment.
6. Open Orders and Tracking. No real funds are collected.

### Supplier capture and catalog approval

1. Open Worker → Supplier visit and record sample content permission.
2. Select a local photo, or continue using sample illustrations.
3. Review simulated AI suggestions and verify the fields.
4. Submit a catalog draft.
5. Open Admin → Catalog review and approve as the sample Manager.
6. Inspect the local audit trail. Suppliers never receive credentials.

### Fulfillment

1. Open Worker → Inspect goods and accept the 30 sample units.
2. Record supplier pickup.
3. Complete packing and record dispatch.
4. Confirm delivery with sample OTP **123456**.
5. Return to customer tracking to see the updated milestones.

### Independent approval and cash control

1. Open Admin → Approval center and choose Chidi as the sample reviewer.
2. Try approving Chidi’s catalog request: self-approval is blocked.
3. Switch to Manager to demonstrate authorized independent approval, after submission and consent.
4. Open Worker → Cash collection and record the separate sample COD collection.
5. Open Admin → Cash reconciliation and verify the demo handover. Collection and reconciliation remain separate.

## Preview states and local data

The state selector offers normal, empty, error and offline design states. These are controlled demonstrations, not detection of actual service/network status. **Reset demo** clears only this prototype’s locally saved sample workspace after an in-page confirmation.

Use fictional details. Demo state is saved in browser local storage where available; browser settings can prevent persistence. Selected image previews remain in memory, are not uploaded, and do not survive a refresh. Photo matches are curated examples, AI extraction uses sample suggestions, and video shopping uses an interactive storyboard rather than recorded footage.

The page switcher deliberately exposes all application layouts for review. It is not authentication or production authorization. Financial actions record local demo states only. No real bank account, API key, card details or WhatsApp destination is provided.

## Editable files

- **prototype.css:** layout, colors, typography and responsive rules.
- **prototype.js:** page content, routing, sample data and interactions.
- **commerce.js:** Nigerian destinations, transportation estimates, promotional rules and quotation/order pricing snapshots.
- **catalog.js:** 32 departments, 33 sample products, product galleries, specifications, discovery filters and specialist quotation controls.
- **operations.js:** connected catalog capture/review, staff teams, assignments, worker check-ins and order operations.
- **accounts.js:** separate account signup/login, worker approval binding, admin invitations, account security and private customer workspaces.
- **navigation.js:** previous-page controls.
- **Screen-Blueprint.html:** standalone preview with embedded source.
- **Screen-Inventory.csv:** original editable 66-screen register.
- **Prototype-Page-Map.json:** machine-readable route list.
- **Wholesale-Design-Research.md:** reference findings and design decisions.
- **Location-Delivery-and-Promotions.md:** detailed transport/discount rules and sample scenarios.
- **Catalog-Categories-and-Product-Design.md:** category framework, product detail design and attribute/filter schema.
- **Worker-and-Admin-Operations.md:** complete staff workflows and a full demonstration guide; supersedes the earlier basic catalog/fulfillment walkthrough.

The standalone HTML must be regenerated after editing the separate source files; the matching build helper is supplied in the source archive. The final source package also includes checks and the screen register.

## Current staff access policy

Customers can register. Worker and admin applications are login-only; public worker signup and admin invitation signup are disabled. A signed-in Manager creates worker login credentials from A02, A33 or A39, then gives the email, initial password and recovery code directly to the worker. Remove access immediately revokes the worker session and blocks login while retaining work history; Restore access reinstates it. Workers can change their own password. A41 contains admin account security. This policy supersedes earlier staff signup or invitation references. Suppliers have no logins.

## Unified job review update

A06 now supports acceptance, progress, evidence submission, Manager review, corrections, reassignment and revocation across eight job types. A26 lists work awaiting review. Workers cannot mark work officially complete. See Job-Control-and-Security-Readiness.md for the workflow and required server-side security implementation. This remains a local prototype; a database connection alone does not make it production-ready.

## Configurable WhatsApp handoff

A23 now contains Manager-only WhatsApp settings. Default number +234 000 000 0000 uses Demo preview and never opens an external conversation. C07, C16 and C18 preview prepared messages. Replace the number and choose Live chat link later to enable customer-opened chat drafts. Automation and inbox synchronization remain unconnected. See WhatsApp-Configuration-Guide.md.

## Configuration-free operational improvements

See Configuration-Free-Improvements.md for account-specific notifications, saved addresses/products, archived orders and repeat purchasing, job checklists and local evidence attachments, order-linked tasks, supplier records and CSV draft import/export. Live services and production security remain deferred.
