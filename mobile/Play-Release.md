# Google Play release preparation

Operator supplied by the user: ChinaLowCost Trading Limited. Play Console account type: personal; creation date and public address pending confirmation. Privacy-Policy-Draft.md is for review, not a published policy.

Status: internal-test candidate only. Do not submit for production while the blockers below remain. APK installation and web Google login do not verify native authentication or establish policy compliance.

## Candidate

- Application ID: com.chinalowcost.app (confirm availability in your own Play Console before creating the app).
- Android version: 0.2.0, version code 2, target API 36.
- Build: `powershell -NoProfile -File mobile/scripts/Build-PlayBundle.ps1` from the repository root. Use `-CreateUploadKey` only on the first run when no upload key exists.
- Output: mobile/artifacts/ChinaLowCost-0.2.0-internal.aab. Signed with the local upload certificate, not the debug key.
- Signing material: mobile/.signing, ignored by Git, restricted to the current Windows account. Keep an encrypted off-machine backup of this directory. Do not email, commit or upload it with the app. Only upload the AAB to Play Console. Google Play App Signing should protect the store's distribution key; this local key is the upload key.
- Existing debug installs cannot necessarily be updated with a Play-signed build. Use a separate test device or uninstall only after preserving any unsynced worker drafts.

## Completed in this preparation

- Local release signing setup and signed App Bundle build script with signature verification.
- No provider secrets or signing material in the app assets or Git repository.
- Account-deletion request in the existing profile/security screens, protected by session and CSRF. Support/owner administrators can load the queue from A22 Customers & support.
- Public account-deletion request page at /account-deletion, with an external email request path for users without the app. Deploy the backend before supplying this URL to Google.

## Publication blockers

1. Verify the new system-browser mobile sign-in handoff on real devices. It reuses website Google/password/CAPTCHA/2FA and requires explicit matching-code approval, an expiring one-use proof and correct account role. A direct native Google SDK integration is not included. Deploy the backend before testing this candidate.
2. The live server enables reCAPTCHA. Login/signup/reset now run in the system browser to retain those security checks. Confirm account creation, email verification and password reset through that browser and return/approval flow. Direct native password calls remain blocked when CAPTCHA is required; do not disable the server checks.
3. Device acceptance: real-phone signup/login/reset, account verification, 2FA, logout/session persistence, checkout and payment verification after browser return/process restart, photo attachment, permissions and network recovery. All supported worker/Admin functions require acceptance or must be excluded from the public mobile scope.
4. Native push, private evidence viewing, QR/barcode camera capture and verified payment return links remain pending; either implement and test or explicitly remove unavailable launch controls and claims.
5. Account deletion is a recorded support request, not automatic erasure. The operator must define and perform the deletion process, retention rules and response period, and demonstrate it works. No implementation here silently deletes financial/order history.
6. Supply legal developer/business identity, contact/address, privacy policy, actual retention rules, processor disclosures and Data safety answers. Do not claim that collected information is absent merely because transport is encrypted.
7. Review restricted product categories with the business: merely adding Medicines & pharmaceuticals/agricultural chemicals does not implement prescription verification, licensing or regulated-product sales controls. Confirm the allowed published inventory and business eligibility before submission.
8. Complete Play Console account verification, developer/app identity, store listing, screenshots, content rating, target audience, app access/reviewer instructions and testing requirements shown for that developer account. Screenshots must be real application screens, not design mockups.

## Privacy and Data safety inventory to verify

Email/account identifiers, display name/phone, delivery addresses, order/payment references, app support messages, uploaded product/evidence images and videos, optional worker location with explicit shift consent, and AI prompts/photos when consented. Providers may include Contabo, Cloudflare, OpenAI, Paystack, Spacemail and Google services as actually enabled. The app never needs a user's Google password. Final declarations and retention periods require operator confirmation.

## Draft store copy (review before use)

Title: ChinaLowCost

Short description: Shop retail and wholesale products with ChinaLowCost.

Description: Browse ChinaLowCost's published products, compare retail and wholesale options, request quotations, manage your cart and follow order updates. Contact support when you need help finding a product or checking an order. Availability, delivery charges and payment options depend on the products and services offered in your region.

Support contact: support@chinalowcost.com

Do not advertise unfinished native features or use this draft as a substitute for actual listing/policy review.

## Official references reviewed October 19, 2026

- https://developer.android.com/guide/app-bundle
- https://developer.android.com/google/play/requirements/target-sdk
- https://support.google.com/googleplay/android-developer/answer/13327111
- https://support.google.com/googleplay/android-developer/answer/14151465

Uploading an internal candidate is not publishing a production release. Google review and any required closed testing remain external steps.
