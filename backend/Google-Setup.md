# Google services and location

Open **Admin → Integration health (A30) → Google services & location**. An
administrator with two-factor authentication must enter their current password
to save settings. Secrets are encrypted with the existing APP_ENCRYPTION_KEY.
Blank secret fields preserve saved values; removal has explicit checkboxes.
Back up the encryption key securely alongside your database backups.

## Customer Google sign-in

In Google Cloud, configure Google Auth Platform branding, audience and data
access, then create an OAuth client of type **Web application**. Add
`https://chinalowcost.com` to authorized JavaScript origins. For local testing,
add the exact local APP_URL, including its port. This implementation uses the
Google Identity Services popup callback, not an OAuth redirect flow; no OAuth
client secret or redirect URI is needed. Set the web client ID in Admin and
enable customer Google sign-in. During Google's testing mode, add test users.

The customer login screen gains **Continue with Google**. The server verifies
Google's RSA signature, issuer, audience, expiry, verified email and a single-use
browser-bound nonce. Identities are bound to Google's subject identifier.
Google creates verified customer accounts only. Existing email accounts must
use their existing password; automatic email-based linking is deliberately
unavailable. Worker/admin access and Admin TOTP are unchanged.

Customers with application 2FA enabled must enter an authenticator or recovery
code in the Google popup before continuing. Google sign-in cannot bypass 2FA.

## reCAPTCHA

Create a **reCAPTCHA v3 score-based site key and matching secret** compatible
with the siteverify API. Add `chinalowcost.com` (and localhost if testing locally)
to permitted domains. Enterprise assessment keys are not interchangeable with
these credentials. Enter both values in Admin, choose a minimum score
(initial default 0.5), and enable protection. Do not enable before checking that
the keys work for your domain; preserve your Admin session during initial testing.

Password login, registration, password reset and verification resend obtain a
fresh token in the trusted application host. The server verifies hostname,
action, score, freshness and single use. Enabled protection fails closed on
Google/network errors. Existing rate limits remain in effect. Google sign-in uses
its own identity verification and nonce checks, not a reCAPTCHA token.

## Worker location and Google Maps

Enable worker GPS in Admin. A worker uses **Shift & check-ins (W16)**, consents
to starting the shift, then clicks **Share current device location** and confirms
the individual check-in. HTTPS or localhost and browser location permission are
required. No background tracking runs. Ending the shift deletes the position.
Only the latest point is saved; points older than 15 minutes are removed when
staff data is next read. Database backup retention also applies to old snapshots.

Admin → **Worker tracking (A34)** displays recent device check-ins and accuracy.
**Open Google Maps** navigates to Google with the selected coordinates. GPS and
these Google Maps links require no Maps API key. Locations are device-reported;
they are not proof of arrival, delivery or worker identity.

An optional Maps API key can be encrypted in Admin, but embedded maps, Places
autocomplete, reverse geocoding and route optimization are not implemented.
No Maps API requests or billing are triggered by storing this key.

## Deployment and acceptance checks

Run `npm run build` and restart the application. These changes are local until
the updated application is uploaded to Contabo. No credentials are included in
the deployment archive. Configure keys separately in the deployed Admin screen.

Automated tests use synthetic credentials, locally signed JWTs and mocked Google
responses. Complete real browser/mobile checks after adding your Google keys:
customer sign-in, repeat sign-in, rejected existing-account linking, reCAPTCHA
pass/failure, denied GPS permission, on-shift check-in, private Admin visibility,
and shift-end clearing. No live Google credentials were used during development.

Official references: [Google ID token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token),
[reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3),
[verification](https://developers.google.com/recaptcha/docs/verify),
[Maps URLs](https://developers.google.com/maps/documentation/urls/get-started).
