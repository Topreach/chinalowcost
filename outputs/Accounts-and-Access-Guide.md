# ChinaLowCost separate accounts and application access

15 October 2026 · Local prototype update

The application now has 86 pages: 25 customer, 21 worker and 40 admin. Customers can sign up. Worker and admin applications provide login, recovery and account-security screens only. A customer session cannot unlock staff or admin pages. Signing out of one application leaves the other application sessions separate.

## How to use it

Refresh Screen-Blueprint.html. Worker and admin pages now ask you to sign in. The sign-in header lets you choose Customer, Worker or Admin. **Use a sample account** fills demonstration details; click Sign in to continue.

| Application / account | Demo email | Initial demo password | Access |
|---|---|---|---|
| Customer | customer@demo.chinalowcost.local | DemoCustomer!26 | Own cart, quotes, addresses and orders |
| Catalog/field worker: Chidi | worker@demo.chinalowcost.local | DemoWorker!26 | Requires Manager activation if still pending |
| Delivery worker: Musa | delivery@demo.chinalowcost.local | DemoDelivery!26 | Assigned delivery and cash-role tasks |
| Manager admin | admin@demo.chinalowcost.local | DemoAdmin!26 | Operations and worker account management |
| Independent catalog reviewer | reviewer@demo.chinalowcost.local | DemoReview!26 | Catalog review pages; no staff/finance administration |

These are intentionally public, fictional prototype credentials. They must never be deployed as real default accounts. The fill buttons use the initial passwords; if you change a demo password, sign in with your changed password instead.

## Signup rules

**Customer:** open Customer signup (C23). Create a sample account with a display name, email and password. It gets a separate customer workspace; another customer’s cart, quotation, address, messages and order history are not loaded into it.

**Worker:** no public signup. A signed-in Manager opens Staff approvals (A02), Teams (A33), or Worker login management (A39), enters the worker name, email, role and initial password, then creates the login. Give those details and the displayed recovery code directly to the worker. The worker can change their password after signing in. Use **Remove access** to immediately revoke the worker session and block login while retaining work history; **Restore access** reinstates it. Existing pending sample workers still need activation.

**Admin:** login only using an existing administrator account. Admin invitation signup and invitation creation are disabled. Suppliers have no accounts.

## Passwords and recovery

Passwords must contain at least 10 characters, uppercase, lowercase and a number. Change password requires the current password and matching new-password confirmation. It updates only that account and invalidates that account’s older sessions.

At customer signup or admin creation of a worker login, the prototype shows a one-time recovery code. Save it if you want to test password recovery. The code is hashed rather than stored as readable text. Recovery requires the account’s role, email and recovery code; it rotates the recovery code and invalidates the recovered account’s old session. It does not activate pending/suspended workers or give customer credentials admin access.

For the seeded accounts only, initial demo recovery codes are Customer-Recover-26, Worker-Recover-26, Delivery-Recover-26, Admin-Recover-26 and Reviewer-Recover-26 in the same order as the table. After a recovery, the old code no longer works; save the replacement shown in the modal.

## Separate identities and shared business workflows

The public catalog remains shared. Worker publication, Manager approval and customer discovery still connect through business records. Private customer workspaces are account-specific. Worker task access follows the linked staff identity; the old arbitrary worker-profile switch is removed. Admin task inspection does not impersonate that worker.

Catalog approval uses the actual signed-in admin account. A preparer cannot approve their own submitted version; sign out of Admin and sign in as another authorized admin, such as the independent reviewer, to demonstrate approval. Customer, Worker and Admin sessions have independent keys and an illustrative eight-hour lifetime.

The App pages index shows the current application’s pages. Switching applications requires its matching session. A Catalog reviewer is redirected away from staff and finance administration. Signing out of Worker also ends its active shift/device-location sharing.

## Storage and production boundary

This is **browser-local prototype access**, not a production authentication system. It uses salted PBKDF2 hashes through browser Web Crypto, keeps role sessions in session storage, and demonstrates account-specific customer workspaces. Business data and account records still live on the same device and can be inspected or modified by someone who controls that browser. Local HTML and JavaScript cannot establish a trusted server-side security boundary.

Use fictional emails and demo passwords. No real email verification, SMS, email recovery, MFA, remote session store or cross-device authentication service is connected. Precise account and role enforcement, secure password policy, verified recovery, session revocation, server-side authorization, audit storage and private media access must be implemented and tested in the backend before real users or sensitive data are introduced.

The business-data reset retains account passwords and worker approval status. Clearing browser storage can remove the prototype accounts and sample data. Browser settings may disable local persistence; the prototype then works only for the available session. Web Crypto must be supported; no insecure plaintext-password fallback is provided.

## Routes

| Application | Login | Signup | Recovery | Security |
|---|---|---|---|---|
| Customer | C01 | C23 | C24 | C25 |
| Worker | W01 | None (W19 login help) | W20 | W21 |
| Admin | A38 | None (A39 manages worker logins) | A40 | A41 |

The editable implementation is accounts.js. It supersedes earlier guide instructions to switch sample worker identities or manually choose a reviewer name within a signed-in session.
