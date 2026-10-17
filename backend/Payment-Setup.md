# Payment review and Admin setup

The existing checkout keeps amounts on the server, uses a stable order reference,
verifies signed raw webhooks and checks the Paystack verification response against
reference, exact kobo amount, currency, customer email and test environment.
Payment ledger and referral reward entries are idempotent. A browser callback
alone never marks an order paid.

## Configure from the original Admin interface

1. Sign in as Admin and complete two-factor authentication.
2. Open **Integration health (A30) → Paystack payment configuration**.
3. Enter your **test secret key**, current Admin password, and enable checkout.
4. Save, then click **Test saved Paystack connection**. This performs a read-only
   authenticated balance request and returns no financial balance information.
5. Copy the displayed webhook URL into the test API Keys & Webhooks settings
   in Paystack. For production-domain testing it is:
   `https://chinalowcost.com/api/paystack/webhook`.
6. Create an approved customer quotation and complete a Paystack test checkout.
   Check both browser-return verification and signed webhook processing.

The secret key is encrypted in SQLite with APP_ENCRYPTION_KEY. It is never
returned to the browser. Blank input retains the existing key. An explicit
checkbox removes it. The existing PAYSTACK_SECRET_KEY environment variable is
used until Admin saves an override; after that, database settings take precedence.
Removing the override's key does not silently restore an environment key.
Back up the database and encryption key securely.

No public key is needed for the hosted-checkout integration. Neither live keys
nor live transactions are enabled by this release. Admin connection testing does
not prove that a charge or webhook can complete; perform the test checkout too.

## Checkout and return handling

The customer pays an accepted, immutable server order. Hosted checkout accepts
only HTTPS checkout.paystack.com URLs without embedded credentials or a custom
port. Return URLs carry the order reference. The trusted host forwards the
reference to the original interface, which matches it to the signed-in customer's
orders before asking the server to verify. Signing in after a return resumes
this check. Customer payment/order/history screens also have **Check payment
status** buttons. The Admin integration screen can verify orders directly with
Paystack; it cannot manually assert a successful payment.

New checkouts can be disabled while existing payment verification and signed
webhooks remain active. Changing/removing keys is blocked while initialization
is in progress or an attempted payment remains unpaid. Ambiguous network errors
retain the original reference and this restriction, even after checkout expiry.
A first attempt rejected with HTTP 401/403 can be corrected without this lock;
an earlier ambiguous attempt is never cleared by a subsequent rejection.
Reconcile outstanding attempts with the provider before rotation. Permanently
failed/abandoned attempts may need operational support; an automatic credential
retirement or forced rotation workflow is not implemented.

## Verification and remaining limits

Automated tests cover encrypted settings/restart persistence, Admin password,
MFA and CSRF, secret hiding, disabled checkout with continued verification,
ambiguous failures, key rotation restrictions, provider mismatches, duplicate
callbacks, forged webhooks, private order scope, original-interface settings and
return verification. Tests use synthetic keys and mocked Paystack responses.

No real provider test was run and this update is local until uploaded to Contabo.
The application is not yet approved for live payment collection: live-mode
activation, refund/dispute/reversal workflows, cash referral payouts and browser
acceptance testing remain outstanding. Receipt email requires working SMTP.

Official references:
[payment verification](https://paystack.com/docs/payments/verify-payments/),
[webhook signatures](https://paystack.com/docs/payments/webhooks/),
[hosted checkout](https://paystack.com/docs/payments/accept-payments/),
[API authentication](https://paystack.com/docs/api/authentication/),
[read-only balance request](https://paystack.com/docs/api/transfer-control/).
