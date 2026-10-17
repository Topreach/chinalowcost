# Server accounts, Paystack and SMTP

The backend provides SQLite accounts and orders, administrator MFA, secure sessions, owner-checked Paystack test checkout, a payment ledger, private scanned evidence and audit records. The original designed frontend now has server adapters; see [the integration map](Prototype-Backend-Map.md) for connected and remaining workflows. Demo credentials do not grant server access. Live Paystack keys remain rejected.

**New:** Admin OpenAI configuration, AI shopping/photo discovery, reviewed server catalog, core English/Yoruba/Hausa/Igbo labels and worker/customer announcements are described in [AI and messaging setup](AI-and-Messaging.md).

## First run

Use **Node.js 24.14+**. Its built-in SQLite API is experimental in the installed version; review this dependency before production rollout.

```powershell
npm install
# Copy only if .env does not exist yet.
Copy-Item .env.example .env
npm run account:create -- your-admin-email@example.com admin
npm start
```

The account command is a trusted local operator tool. It generates an initial password and prints it once; store it privately. It sends no email. Open **http://localhost:3000**, sign in, add the setup key to your authenticator app and confirm a code. Administration stays locked until MFA is enabled. Change the initial password; this signs out all sessions. Wait for a fresh authenticator code if the current code has already been consumed.

No browser accounts or sample products/orders are automatically imported. The original designed frontend is at `/` and `/application`; maintenance account/provider tools remain at `/secure`. Run `npm run build` after editing frontend sources. The standalone preview remains in `outputs/Screen-Blueprint.html`; `/prototype` is isolated and cannot call the backend.

## Environment

Edit `.env` locally. Do not commit secrets or enter provider keys in the browser.

| Variable | Purpose |
|---|---|
| `APP_URL` | Exact browser origin; HTTP is allowed only on localhost |
| `HOST`, `PORT` | Listen address/port; defaults to loopback on port 3000 |
| `DATABASE_FILE` | SQLite path, default `./data/app.sqlite` |
| `APP_ENCRYPTION_KEY` | Stable 64-character hex MFA encryption key; required with `NODE_ENV=production` |
| `PAYSTACK_SECRET_KEY` | Paystack test secret beginning `sk_test_` |
| `EMAIL_PROVIDER` | `disabled` by default; set `smtp` to enable account emails and receipts |
| `SMTP_HOST`, `SMTP_PORT` | Business email SMTP server and port |
| `SMTP_SECURE` | `false` for 587 with required STARTTLS; `true` for 465 |
| `SMTP_USER`, `SMTP_PASSWORD` | Provider-issued SMTP credentials or supported app password |
| `EMAIL_FROM`, `SUPPORT_EMAIL` | Sender and optional receipt reply address |
| `CLAMSCAN_PATH` | Absolute path to installed, updated ClamAV `clamscan` |
| `UPLOAD_DIRECTORY` | Private directory, default `./data/private-files` |

In development an absent encryption key is generated in `<database path>.key`. Preserve it: losing it prevents MFA verification. Production requires an explicit key in the hosting secret manager. Protect `.env`, SQLite files, private files, keys and backups with OS permissions. Node file modes alone do not establish Windows NTFS ACL protection.

## Accounts and orders

- Customer registration requires SMTP email verification. Links expire after 30 minutes and are single-use.
- Administrators invite workers/customers; recipients choose a password. Public signup always creates a customer, regardless of submitted role fields.
- A trusted operator can provision a verified development customer without SMTP: `npm run account:create -- buyer@example.com customer`. Verify real email ownership before using this tool for real accounts.
- Administrators approve orders for verified active customers using integer kobo. 125000 kobo = NGN 1,250.00. Confirm goods, stock and transportation independently: server catalog pricing is not connected yet.
- Customers pay only their own approved orders. Tokens alone no longer authorize checkout.
- Workers access only explicitly assigned orders/evidence and cannot initiate customer payments.
- Suspension revokes sessions and outstanding account-action links. Administrators cannot suspend administrator accounts through the UI.

The existing approval CLI also works for a pre-existing verified customer: `npm run order:approve -- approved-order.json`. Input: `{"id":"TEST-ORDER-001","email":"buyer@example.com","amountKobo":125000}`. This file is ignored by Git.

SQLite replaces the former JSON store. If legacy JSON exists, preserve it, select a new SQLite path and deliberately reconcile/import its records. Startup will not silently overwrite it.

## Paystack and SMTP

Configure the Paystack test webhook as `https://YOUR-TEST-HOST/api/paystack/webhook`. Paystack cannot reach localhost. Set `APP_URL` to the deployed HTTPS origin and open that exact origin in the browser.

The server validates the raw-body signature and independently matches reference, amount, currency, email and test environment. Callback navigation does not establish payment. Transactions create one ledger entry per payment reference. Repeated initialization retains the reference; if a timeout occurs after provider initialization, reconcile that reference before creating a replacement order.

Checkout approval expires after 24 hours. Revocation blocks app checkout access but cannot invalidate an already-issued external Paystack URL. Late successful payments are still reconciled by webhook.

SMTP handles verification, reset, invitation and receipt emails. Password resets retain MFA. Lost-authenticator recovery needs a separately verified operator procedure; there is no online MFA bypass.

Receipt sending is claimed transactionally. Definitive SMTP rejection leaves `pending` and checking payment status retries it. Ambiguous failure leaves `uncertain`; a crash may leave `sending`. Reconcile those states before resending, since SMTP cannot guarantee exactly-once delivery. `sent` means SMTP acceptance, not proven inbox delivery. A background delivery/retry queue and bounce handling remain outstanding.

## Evidence files

JPEG, PNG and PDF uploads have a 5 MB limit, file-signature checks and random server filenames outside public assets. Files remain quarantined until the scanner reports success. Infected files are removed and marked rejected; scanner failures never enable downloads. Downloads require current ownership or worker assignment and use attachment disposition.

Uploads stay disabled without `CLAMSCAN_PATH`. Install ClamAV and keep signatures updated. Actual ClamAV and SMTP delivery were not exercised here: tests use mocks. Scanning cannot guarantee that every file is harmless. Retention, storage quotas and object-storage migration still require deployment decisions.

## Backups and validation

```powershell
npm run build
npm test
npm run backup
npm run backup:check -- PATH-TO-BACKUP.sqlite
```

Backup uses SQLite's snapshot API and checks integrity. Local development keys are copied beside the snapshot. Back up private files separately and preserve the production key in protected secret storage. Keep off-host backups and test recovery in isolation. For restore: stop the server, preserve current data, restore matching snapshot/key/files, revoke restored sessions and account-action links, and reconcile payments received since the snapshot before reopening.

See [security status](SECURITY.md) for remaining launch work. No browser provider was available for visual inspection. HTTPS hosting, WAF rules, centralized alerts and independent penetration testing remain external work. Run one application instance until orchestration and process-failure testing are completed. Rate limits use the direct peer address and ignore spoofable forwarding headers; proxies need edge limits and deliberate trust configuration.

References: [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Paystack transactions](https://paystack.com/docs/api/transaction/), [Paystack webhooks](https://paystack.com/docs/payments/webhooks/), [Nodemailer SMTP](https://nodemailer.com/smtp).
