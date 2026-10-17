# Deploy the original application with chatbot and admin features

This update preserves the designed homepage and CSS. It connects the original
customer, worker and admin frontend to the backend. It does not turn unfinished
fulfillment/finance workflows into live transactions. Paystack remains test-only.

## 1. Upload from Windows PowerShell

Run this on the Windows computer, not inside the SSH terminal:

```powershell
scp -P 2222 "C:\Users\DELL\Chinalowcost\chinalowcost-backend-update.tar.gz" root@173.249.34.3:/root/
```

## 2. Back up and install in the Contabo terminal

The archive excludes `.env`, databases, uploads and `node_modules`. Keep the
existing production `.env` and encryption key; do not replace them with defaults.

```bash
cd /opt/chinalowcost
umask 077
install -d -m 700 /root/chinalowcost-release-backups
release_stamp=$(date -u +%Y%m%dT%H%M%SZ)

if runuser -u chinalowcost -- npm run backup; then
  if tar -czf "/root/chinalowcost-release-backups/source-$release_stamp.tar.gz" backend outputs work package.json package-lock.json; then
    if tar --no-same-owner -xzf /root/chinalowcost-backend-update.tar.gz -C /opt/chinalowcost; then
      chown -R root:chinalowcost backend outputs work
      chmod -R go-w backend outputs work
      if npm ci --omit=dev --ignore-scripts && node --check backend/server.cjs && runuser -u chinalowcost -- npm run test:backend; then
        systemctl restart chinalowcost
        systemctl status chinalowcost --no-pager
      else
        echo "Checks failed. The service was not restarted; inspect the errors."
      fi
    fi
  fi
else
  echo "Database backup failed. No application files were changed."
fi
```

The database backup is still on this VPS; copy backups and the encryption key to
separate secure storage. New database tables are additive and are created at
service startup. Existing accounts/orders are retained; no demo products are
imported. This release adds the web-push dependency. The npm ci step above is required before restarting.

## 3. Verify and activate AI

Open `https://chinalowcost.com` and sign in with a server account. Hard-refresh if
the browser retains old scripts. Verify all three roles using their real accounts.

- Customer → **Support**: AI shopping assistant or human support. Text/photo
  queries show approved catalog products and server prices. Optional web research
  shows external estimates and sources.
- Customer → **Photo search**: permission-gated product identification/search.
- Admin → **Integration health**: add the OpenAI key, enter the current admin
  password, set limits and enable AI. Enable web research separately if desired.
  **Test OpenAI connection** makes a real billed API request when clicked.
- Admin → **AI review**: product/QR discovery creates a draft. Actual image
  downloads require approved image hosts and a working malware scanner. Set
  selling prices and have a different administrator review the submitted version.
- Admin → **Customers & support**: preview and send in-app messages to workers,
  customers or both. Optional email batches require working SMTP credentials.
- Shared header → **Language**: English/Yoruba/Hausa/Igbo core navigation and AI
  reply language. Advanced text still falls back to English.

No OpenAI key or live provider call was used during implementation. Perform a
small real chat/photo/discovery test after configuring your account and scanner.
External identity/price observations and translations still require review.
Long-running discovery currently runs in the request; a durable background job
queue remains future work. Browser/mobile acceptance testing is also outstanding.

The complete remaining-work list is in `Prototype-Backend-Map.md`.

Google sign-in, reCAPTCHA v3 and worker GPS setup are documented in
`Google-Setup.md`. Configure them in Admin → Integration health (A30).

Referral commission rules and promotions are now configured in Admin →
Promotions & discounts (A31). Customers find invitation codes and test earnings
under Offers & promotions (C22). See `Referrals-and-Promotions.md` for eligibility,
redemption accounting and the current test-payment/payout limitations.

Paystack secrets, checkout enablement, connection testing and order verification
are now available in Admin → Integration health (A30). Follow `Payment-Setup.md`,
including configuring the displayed webhook URL in Paystack test settings.

All roles now have profile, password, authenticator/recovery-code and session
controls on their existing Account & security screens (C25/W21/A41). Customer
and worker 2FA is optional; Admin 2FA stays mandatory. See
`Profiles-and-Security.md` before enabling it and save the one-time recovery codes.

Customer C22 now includes personal invitation codes and a test store-credit wallet.
Signup accepts invitation codes, and C09 quotation review can apply credit toward
the order total. See `Store-Credit-Wallet.md`; these remain test transactions.

Worker operations now include database-backed supplier permissions/availability,
pickup, inspection, packing, delivery proof, return collection, test COD handover,
worker AI suggestions and scanned short MP4 clips. Customer C16 shows reviewed
shipment tracking and private delivery codes. Follow `Worker-Fulfillment.md` and
configure the malware scanner before trying uploads. Actual refunds and live
financial settlements remain separate work.

Admin A23 now saves the shared WhatsApp business number to SQLite. Customer
controls preview a safe message and open WhatsApp for the customer to send.
See `WhatsApp-Setup.md`; automated messages and a synchronized inbox are not enabled.
