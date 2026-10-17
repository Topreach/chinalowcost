# Notifications

## Included

The existing Notifications control now opens a shared server-backed inbox for customers, workers and Admins. It supports full-history unread counts, 50-item pagination, individual and mark-all read, and email/device preferences. Announcements already in the database are imported without resending old email. Read state remains synchronized with legacy announcement inboxes. Visible tabs refresh the badge every 30 seconds without resetting forms; this is polling, not a websocket service.

Automatic events are emitted by the application's audited business operations. Notifications and delivery jobs created inside a business transaction roll back with it. Duplicate payment confirmations do not send duplicate payment alerts. Role-specific links are validated; order/task notifications carry context for the existing selected-order/task controls.

- Customers: order placement, confirmed test payment, checkout cancellation, approved quotations, fulfillment/dispatch/transit/delivery updates, return updates, support replies and account security changes.
- Workers: assignments, task transitions/reassignment, fulfillment evidence submission/review, catalog submission/publication/correction, support replies and account security changes.
- Admins: quotations, placed/paid orders, task and catalog review activity, shipment and return updates, cash reconciliation, new support messages and provider delivery problems.

In-app alerts remain available regardless of optional channel preferences. Existing mandatory account security emails remain separate. New operational email is enabled by default per account and may be disabled in Notifications > Notification preferences. Device push is off until the user opts in and registers a device.

## Activation and delivery

SMTP must be configured for email. The durable worker wakes every 15 seconds and sends up to ten operational email/push jobs and five queued Admin announcement emails. Admin's manual announcement batch button remains available. Eligibility and preferences are checked at delivery time; each email has only one recipient. App restart preserves pending jobs; interrupted sends become uncertain rather than being blindly retried.

Admin > Integration health (A30) > Notifications & browser push enables push and displays aggregate/recent delivery state. Signing keys are generated locally once and encrypted with APP_ENCRYPTION_KEY. No third-party paid notification account or pasted VAPID private key is required. Preserve your encryption key and database during deployment. Known rejected operational deliveries can be explicitly retried up to three attempts with the Admin password; uncertain outcomes can only be marked reviewed after checking provider logs. Accepted means provider acceptance, not confirmed display or inbox delivery.

Each user opens Notifications > Enable on this device and approves the browser permission. A native host dialog ensures permission is requested by a direct click. Subscriptions are encrypted and limited to five devices per user; only Google FCM, Mozilla Push and Apple Web Push endpoints are accepted. Disabling a device removes its subscription. Explicit logout detaches the current device when the browser and server are reachable; generic lock-screen text never includes account, task, order, address or payment details.

Browser push requires a supported secure browser. Mobile delivery is web push, not an Android/iOS native app integration. iPhone/iPad require a supported installed Home Screen web app; this release includes a manifest and service worker, but physical-device permission/delivery testing is still required. The service worker does not cache authenticated pages or account data. Notifications open the application and require its normal login/MFA/access checks.

## Deployment and practical limits

Run npm ci --omit=dev --ignore-scripts on Contabo before restarting: this release adds web-push. Follow Deploy-Original-Application.md. All implementation and automated tests are local; no real SMTP, push or WhatsApp messages were sent by development tools. Verify HTTPS, provider connectivity and delivery on actual devices after deployment.

Run one application process with this SQLite queue. SMTP bounce/read tracking, native mobile apps and automatic business-initiated WhatsApp order templates are outside this web notification implementation. WhatsApp currently replies to verified incoming text only; outgoing order templates require separate Meta template approval, verified recipient binding and consent. No new OpenAI calls are used for notifications.

References: https://github.com/web-push-libs/web-push and https://developer.mozilla.org/en-US/docs/Web/API/Push_API.
