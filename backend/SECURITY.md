# Security implementation status

Updated 15 October 2026. Automated tests and source inspection are not a penetration test or a guarantee against compromise.

## Implemented

- SQLite users, sessions, action tokens, orders, ledger, assignments, file metadata, audit records and rate limits; prepared SQL parameters.
- Unique salts and scrypt password hashing (`N=32768`, `r=8`, `p=3`), 12–128-character passwords and bounded hash concurrency.
- HttpOnly, SameSite=Strict cookies; Secure and `__Host-` scope on HTTPS. Hashed session tokens, 30-minute idle and 12-hour absolute expiry; revocation on password change/reset and suspension.
- Server-controlled roles, mandatory administrator TOTP MFA, AES-256-GCM protection for MFA secrets, and OTP replay rejection.
- Hashed, single-use, 30-minute verification/reset/invitation tokens. Reset preserves MFA. Generic account-help responses reduce enumeration; timing differences need further testing.
- CSRF and origin checks, order ownership enforcement, and explicit worker assignments.
- Persistent IP/account/user/payment/upload limits, body limits, outbound timeouts and HTTP request/header timeouts. Forwarding headers are not blindly trusted.
- Paystack signature and transaction verification, approved server amounts, test-key enforcement, single ledger entries and transactional receipt claims. Tokens no longer replace customer login.
- New interface uses DOM text rendering and external scripts. Strict CSP, framing restrictions, no-sniff/no-referrer, permissions restrictions and HTTPS HSTS. Legacy prototype is sandboxed from server APIs.
- Private uploads require file-signature validation and malware scanning, with quarantine, random paths, size limits and authorized attachment downloads.
- Static-file allowlist excludes secrets, databases, keys and server source.
- Audit events for authentication and sensitive changes. Passwords, provider keys and raw session tokens are not deliberately logged.
- Snapshot backups and integrity checks; restore procedure documented.

## Remaining before launch

New controls: Admin OpenAI configuration requires MFA, CSRF and current-password verification; keys are encrypted and never returned. AI has bounded input/output, concurrency and persisted request limits. Chat receives public catalog data and optional consented photos, not account/payment records. Remote image downloads use approved hosts, public IPv4 checks, pinned DNS results, HTTPS, no redirects, scanning and human publication gates. Admin broadcasts use expiring previews, fixed recipient snapshots, idempotent publishing and recipient-scoped inboxes. Email recipients are sent separately. Real AI/provider integration and native-language quality still require validation.

1. Move catalog/pricing, transport quotes, stock reservations, procurement, fulfillment, returns and settlements to trusted server records. Separate finance/catalog/operations permissions and require independent approval for sensitive changes.
2. Complete refunds, reconciliation, supplier payments, SMTP bounce handling and remaining finance workflows. Live keys remain disabled.
3. Configure HTTPS hosting, firewall/WAF, edge limits, secret management, private network/storage permissions and proxy trust. Local limits are not DDoS protection.
4. Add centralized security logs/alerts, operational monitoring, dependency update scanning and incident response. Local audit rows are not tamper-proof against host/database compromise.
5. Configure actual SMTP and an updated scanner. Establish storage quotas/retention, protected off-host backups and tested restore. Apply Windows NTFS ACLs explicitly.
6. Add a substantial compromised-password blocklist, independently verified lost-MFA recovery, finer admin scopes and reauthentication for sensitive changes. TOTP is not phishing-resistant; consider passkeys.
7. Complete penetration testing, concurrent/process-failure testing, visual/mobile/accessibility review and real Paystack test-environment verification.

No real provider transaction, email delivery, malware scan or production deployment was performed. Legacy prototype checks do not establish the security of its browser-local features; the new backend does not trust them for authorization.
