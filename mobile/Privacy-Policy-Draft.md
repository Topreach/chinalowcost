# ChinaLowCost privacy policy — draft for operator review

Operator: ChinaLowCost Trading Limited

Contact: support@chinalowcost.com

This draft describes the current implementation. The operator must confirm its public address, retention rules, recipients and applicable requirements before publishing it or submitting it in Play Console. It is not yet a published privacy policy.

## Information processed

ChinaLowCost processes account email addresses, account identifiers, optional names and phone numbers, language preferences, delivery addresses, shopping carts, quotations, purchases, payment references, support messages and account security events to operate the shopping and fulfilment service. Passwords are stored as salted hashes. Two-factor setup secrets are encrypted and recovery codes are stored as hashes.

Photos and videos are processed when users choose to upload them for products, sourcing or order evidence. Camera/photo access is requested when used. Customers can optionally capture a delivery pin and accuracy, review it, and save it with their address and order. If they separately select the Google address-lookup option, the coordinates are sent to Google for editable address suggestions. Delivery contact can include a phone number, an optional WhatsApp number and a preferred contact method; this is not marketing consent. Customers may separately opt in to automated booking/order updates through Meta WhatsApp Cloud API. These messages contain a reference, status and account link; users can withdraw the preference or reply STOP. Consent/contact-pause state is retained to enforce the preference; encrypted outbound job records expire after seven days. Confirmed delivery pins are retained with the associated address/order under the operator's retention rules. Worker location is collected only for an explicit on-shift check-in with consent; the app does not request background location. The latest worker coordinates are removed when the shift ends or when a tracking read finds them older than 15 minutes. The operator must confirm separate audit and backup retention.

AI product assistance can process messages and selected photos with OpenAI when the feature is enabled and the user consents to photo sharing. Online research may provide external sources and estimates rather than a confirmed store quotation. Do not include sensitive medical or other unnecessary personal information in product enquiries.

Google sign-in uses Google Identity Services in the system browser. ChinaLowCost receives a verified account identity; it does not receive the Google password. Mobile sign-in requires confirmation of the matching approval code before a short-lived one-time authorisation can create the app session.

Payments are processed through Paystack where configured. ChinaLowCost records order/payment references and status. The app does not ask users to send card credentials to support or an AI assistant.

## Service providers

Approved supplier representatives may access product availability enquiries and preparation instructions assigned to their company. The portal records representative account links, product responsibility, availability quantities, preparation times and progress. Suppliers receive product references and quantities, without customer identity, delivery addresses, selling prices or payment details in the supplier enquiry. Generic account notifications may be sent through configured email services. Assigned workers and authorised company administrators review these records for procurement. The operator must define retention and supplier representative access/deletion procedures.

Applicants may submit a name, contact number, account email, qualifications and experience for a published company vacancy with explicit consent. Recruitment details are available to owner administrators for assessment and contact. Application text and contact details are encrypted in the application database. The operator must establish and publish recruitment retention periods and applicant access/deletion procedures before collecting real applications; accepting a candidate does not automatically create a staff account.

Depending on the enabled services, providers include Contabo for application hosting, Cloudflare for website delivery/security, Spacemail for business email, Google for sign-in/security services, OpenAI for AI assistance and Paystack for payment processing. Delivery and supplier information is shared only as needed for the applicable transaction and assigned operational roles. The operator must confirm the actual providers, processing locations and any other recipients before publication.

## Security and choices

The application uses encrypted HTTPS transport, role-based access, server sessions and optional authenticator-based two-factor security. Users can update available profile fields, sign out, manage security settings and control requested camera/location permissions through device settings. Some processing is necessary to fulfil an order or protect an account.

## Account and data deletion

Users can request account deletion from Profile → Security in the app or email support@chinalowcost.com from the registered email address. The public request instructions are at https://chinalowcost.com/account-deletion after the corresponding backend release is deployed. Support verifies ownership and reviews open orders, refunds and balances before processing. Submitting a request does not immediately erase the account.

The operator must define a response period, the categories actually erased/anonymised, the categories retained for transaction/legal/fraud purposes, their retention periods and when data expires from backups. Do not publish this draft while these operational decisions are unresolved.

## Contact and updates

Contact ChinaLowCost Trading Limited at support@chinalowcost.com for privacy questions or requests. Add the approved public business address and effective date before publishing. Material changes should be communicated through the application or an appropriate account channel.
