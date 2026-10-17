# Spacemail sending and receiving

The application includes an encrypted SMTP configuration and a read-only IMAP import from one business mailbox. Deploy the latest code before configuring it. These settings do not purchase/create a Spacemail subscription or change DNS.

## Mailbox and Cloudflare

Create the actual mailbox in Spacemail, for example support@chinalowcost.com. The application Admin account and the Spacemail mailbox are separate accounts with separate passwords. A login email in the application does not create a mailbox.

Follow Spaceship's current instructions for your domain. When Cloudflare hosts DNS, add the records there:

| Type | Name | Value | Priority |
| --- | --- | --- | --- |
| MX | @ | mx1.spacemail.com | 0 |
| MX | @ | mx2.spacemail.com | 0 |
| TXT | @ | v=spf1 include:spf.spacemail.com ~all | |
| TXT | spacemail._domainkey | Copy the unique DKIM value from Spaceship Advanced DNS | |

Do not add a second SPF record if one already exists. Combine authorized senders in one SPF policy. Preserve unrelated website records. Use the domain-specific verification record shown in Spaceship if required. Configure DMARC deliberately; a simple monitoring starting policy is `v=DMARC1; p=none` at `_dmarc`. Add a valid reporting address if you want reports; tighten policy after validating all sending sources. Follow Spaceship's documented SRV record for autodiscovery if desired.

Verify receiving and sending directly in Spacemail webmail before connecting the application. Gmail/Outlook recipients may initially classify new-domain mail as spam; SMTP acceptance does not guarantee inbox delivery.

## Application configuration

Sign in as an owner Admin and open **Integration health (A30) → Email delivery & receiving**.

1. Click **Use Spacemail server settings**.
2. SMTP host: `mail.spacemail.com`; TLS port: `465`.
3. SMTP username: the full mailbox email address; SMTP password: its Spacemail mailbox password.
4. Sender: your actual authorized mailbox address. Support / Reply-To: the mailbox customers should reply to.
5. Enable outgoing SMTP.
6. IMAP host: `mail.spacemail.com`; TLS port is fixed at `993`.
7. IMAP username and password: the mailbox you want to read. Enable incoming sync.
8. Enter your ChinaLowCost Admin password to save settings. This confirms the settings change; it does not enable 2FA.
9. Verify SMTP, then send a test email to your signed-in Admin address. Each action requires entering the current Admin password again.

Blank mailbox passwords retain existing saved credentials. Database configuration overrides environment SMTP settings after saving. Secrets are encrypted with the existing application encryption key and are not returned to the browser. Keep that key backed up securely. Settings changes apply without restarting the application; an already in-flight send may finish with its earlier settings.

## Customer complaints and replies

**Customers & support (A22) → Customer email inbox** lists external email received by your configured mailbox. Customers can send from their normal email client. The customer support screen displays your configured support address. Existing in-app support still works separately, with notification emails when enabled by recipient preferences.

- Automatic import runs every minute and pauses during release maintenance. Manual sync is available.
- First sync imports the latest 50 INBOX messages. Subsequent syncs process up to 50 UID positions per pass, using UIDVALIDITY and account-specific cursors. Changing mailbox configuration may import that mailbox's recent history.
- The application does not mark messages read, move them, or delete them at Spacemail.
- Only plain-text bodies are shown, escaped as text. HTML, embedded remote images and attachments are not rendered. Messages over 1 MB are skipped; use provider webmail for those and for attachments.
- Sender addresses are unverified, and messages are not automatically linked to private customer accounts/orders. Verify identity before disclosing account details or approving sensitive requests.
- Admins with owner or support scope can read and reply. Mail credentials and connection tests require owner scope and current password.
- Each imported email has its own Open/Resolved record and reply history. Automatic thread merging, attachment handling, assignment and outbound Sent-folder synchronization are not implemented.
- Replies are sent only after Admin clicks Send reply. Accepted means SMTP acceptance, not delivery/read confirmation. Failed or uncertain sends are recorded and are never automatically retried. Repeated submission of the same request ID does not send twice. Review uncertain sends before opening a new reply request.
- Inbox content and replies are encrypted in SQLite. There is currently no automated inbox-retention purge; include the database in your retention and backup process.

Application verification/reset/welcome/password emails, receipts, announcement emails and notification emails use the saved SMTP configuration. Pausing sending leaves queued notifications pending. Security/account mail remains independent of optional marketing preferences.

## Live acceptance

No real mailbox credentials are bundled and no live mailbox tests are performed by automated tests. Before launch: verify DNS, send/reset/register with a disposable customer address, send a complaint from an external inbox, import it, reply from Admin and confirm delivery, verify duplicate sync does not create duplicate records, then mark it resolved. Check that mailbox sync does not change read flags in Spacemail. If Contabo blocks outbound mail ports, resolve that with the VPS provider; do not open inbound SMTP/IMAP ports on the VPS.

Official documentation checked October 18, 2026:

- https://www.spaceship.com/en-GB/knowledgebase/connect-spacemail-to-email-client/
- https://www.spaceship.com/knowledgebase/set-up-spacemail-dns-records-cloudflare/
- https://imapflow.com/docs/api/imapflow-client/
- https://nodemailer.com/smtp
