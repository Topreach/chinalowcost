# Automatic booking and order updates

The system reuses the encrypted Meta Cloud API credentials in Admin A23 WhatsApp configuration. The customer contact/chat-link number alone cannot send automatic messages. Saving the company's number in a phone is not detectable by the application and is not required for the Cloud API template flow.

## Activate

1. Configure the business Meta phone number ID, supported Graph API version, access token, app secret and webhook verification token in the existing Admin WhatsApp automation form. AI replies and order updates have separate enable switches; OpenAI is not required for order templates.
2. In Meta WhatsApp Manager, create a utility template appropriate to your business. Example body:

   `ChinaLowCost update for {{1}}: {{2}}. View your booking or order: {{3}}. Reply STOP to stop automatic updates.`

   It must have exactly three positional text body parameters: booking/order reference, status, account link. No header, media or dynamic button parameters are supplied by this adapter. Follow Meta's approval, account, billing and messaging requirements.
3. After Meta approves the template, enter its exact name and language code in Admin A23 and enable automatic booking/order updates. Template rejection is reported as a failed attempt; saving a template name does not approve it with Meta.
4. Configure the existing signed webhook `/api/whatsapp/webhook` for messages so STOP/HUMAN/START commands are processed. These controls work with AI replies disabled.
5. The customer provides an international WhatsApp number and explicitly selects booking/order updates on the delivery-address form. Delivery-contact preference alone does not subscribe them. They can withdraw in the same form or reply STOP. HUMAN pauses automatic messages for staff assistance; START lifts the contact pause, but does not override withdrawn app consent.

## Events and delivery

New booking/quotation requests, quotation approvals, orders placed, payment confirmations, checkout cancellation and reviewed fulfilment-status changes create queued templates. Past audit events are not backfilled on initial installation or when enabling order updates. Test-environment messages are prefixed TEST. Template messages contain a reference, a short status and a normal authenticated-account link; street addresses, GPS, phone numbers, product-sensitive details and delivery/authenticator codes are not included in the body.

The queue is encrypted and keyed by audit event, so polling/restarts do not resend accepted events. Consent, account activation and the contact pause are checked again before sending. Pending attempts expire after 24 hours; job records are removed after seven days. Disabling automatic order updates cancels pending attempts. Changing an address/consent updates the account's permitted contact atomically.

Admin's recent order-attempt panel shows pending, accepted, failed, uncertain or cancelled. Accepted means Meta accepted the API request, not that the handset received or read the message. Provider delivery/read-status callbacks are not incorporated in this adapter yet. Network timeouts, interrupted sends and ambiguous server responses are not automatically retried; staff must review Meta's message history before another contact. No real provider messages are sent by the automated tests.

Live acceptance requires a consenting test customer's real number and the operator's approved Meta template/credentials. No one needs to share tokens or passwords in chat. The website release and updated mobile build are both required to expose the new consent option everywhere.

Provider references:

- https://business.whatsapp.com/policy
- https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/messages/template/
