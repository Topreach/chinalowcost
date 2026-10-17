# OpenAI, product discovery, languages and announcements

These features are connected to the **original application interface** at `/`. Customers use **Support (C18)** for AI shopping help or human support, and **Photo search (C05)** for product/price research. Administrators use **Integration health (A30)** for OpenAI settings, **AI review (A25)** for photo/QR discovery, and **Customers & support (A22)** for announcements to workers/customers. The standalone file preview remains a demo. Admin actions require MFA.

## OpenAI setup in Admin

Open **OpenAI configuration**, enter your existing API key, choose the model and request limits, enable AI and enter your current administrator password to save. The API key is encrypted using the server encryption key. It is never returned through configuration APIs, logged intentionally, or saved in browser storage. Leave its field blank when updating other settings to keep the existing key. To remove it, disable AI and select the removal checkbox.

Select **Test connection** for a small real request after saving. No live OpenAI request was performed during implementation. The test and subsequent AI calls use your project's API billing; application request limits do not replace a provider spending limit. Configure project limits and model access separately. The model defaults to `gpt-4.1-mini` and can be changed by an administrator. Image-search availability depends on the selected model/account; a successful text connection test alone does not verify image search.

Online research is a separate administrator setting. With it off, the assistant uses the approved catalog and its general product knowledge; it must not claim to have searched current external prices.

## Customer shopping assistant

Customer pages have a **Chat with AI** button in the bottom-right corner. It opens
a responsive chat panel without leaving the current page. Guests are prompted to
sign in. The panel shares the existing assistant/history and human-support choice;
on the Support page the button focuses that page's chat instead of creating a
duplicate form. Close it with its Close button, the launcher or Escape.

Signed-in users can describe a product or attach a JPEG/PNG photo. Supported chat languages are English, Yoruba, Hausa and Igbo. Conversation history stays in page memory and is cleared on sign-out or **Clear conversation**; the app sends a bounded recent history to OpenAI for follow-up questions. The Responses API is called with `store:false`; this is not a claim of zero provider retention under every account policy.

Photo submission requires the displayed permission checkbox. Browser processing reduces supported photos to approximately 1200 pixels and under 1 MB; originals over 10 MB are rejected. Photos are sent to OpenAI for analysis and are not saved as customer uploads by this feature. Do not include private documents or people unnecessarily.

Approved product cards show server-controlled NGN prices. AI prose and external seller prices are suggestions, not confirmed ChinaLowCost offers, inventory or checkout totals. The assistant cannot create orders, approve products or charge payments. Product/photo matching and language quality require real-world evaluation; uncertain matches should be checked with staff.

The language selector saves only a language preference in browser storage. Core labels have English/Yoruba/Hausa/Igbo translations; advanced diagnostic text falls back to English. User-authored announcements are not automatically translated. Native-speaker review of interface translations remains required.

## Administrator product discovery

Use **Product photo and QR discovery** to enter a description, decoded QR text, or a photo of the item/packaging. **Read QR from selected photo** uses the browser's native QR detector where supported. On unsupported browsers, paste QR text or submit a clear photo for AI review; reliable universal QR decoding is not yet bundled. QR URLs are treated as product data, not blindly followed by the application.

AI creates an unpublished draft with product details, uncertainty notes, source links, external seller observations and real image-search candidates when available. External observations never populate your selling prices. The new database catalog starts empty; fictional prototype prices are not automatically imported.

Automatic image downloads require:

1. Online research enabled and a model/account supporting image search.
2. An updated malware scanner configured with `CLAMSCAN_PATH`.
3. Exact supplier/CDN hostnames entered in **Approved image download hosts**.

The downloader permits HTTPS only, checks public IPv4 destinations and pins the checked address, refuses redirects, and enforces time/size limits. Image bytes are scanned before use. Unapproved hosts or scanning failures leave notes and source links for review; no unsafe fallback download occurs. IPv6-only hosts and redirecting image URLs are currently unsupported.

You can also create a manual draft and upload JPEG/PNG images. Reorder gallery images, remove incorrect ones, edit SKU/specifications, set selling prices in integer kobo, review availability and confirm the exact variant and image-use permission reference. **Approve and publish** requires a retail price, at least one scanned image and rights confirmation. AI never publishes. Adding/removing/reordering images returns a product to draft. Removed images are soft-removed and retained privately until a retention/cleanup policy is implemented.

Online photos may depict a different variant and may require permission to reuse. Publication therefore needs human review; no claim of perfect automatic identification or image arrangement is made. Discovery currently processes a small batch in a request, not a large background import queue. Supplier bulk feeds, reliable universal barcode scanning, durable import jobs and automatic catalog-priced checkout remain future work.

## Admin messages

Open **Admin → Customers & support → Message workers and customers**. Choose workers, customers or both. Write a subject/body and optionally queue SMTP email. The message language uses the application language choice; the message is sent exactly as written, not automatically translated. Select **Preview message**, review the exact recipient count and text, then **Send reviewed message**. Selected individual recipients remain supported by the backend/maintenance tools.

The preview freezes the recipient list for 10 minutes. If an included recipient becomes ineligible, create a new preview. Duplicate submissions with the same request identifier do not duplicate announcements. In-app delivery is immediate and persists in SQLite. Each user sees only their own inbox and can mark messages read. The administrator's delivery history shows recipient/read/email counts without exposing recipient lists to other users.

Optional email requires configured SMTP. **Deliver next email batch** attempts up to five pending/definitively failed emails, one recipient per message; repeat to drain the queue. Definitive SMTP failures are limited to three attempts. Ambiguous failures or interrupted `sending` states are not automatically resent. Inspect provider logs before resolving them. Suspended/unverified recipients are cancelled at delivery time. The notification worker now delivers queued emails automatically every 15 seconds and respects the account email preference. The manual batch control remains available. SMTP bounce processing remains outstanding; use these messages for account and operational communication. See Notification-Status.md.

## Verification

Automated tests use mock OpenAI/SMTP/scanners and synthetic users. They exercise encrypted configuration, role/CSRF/password checks, language prompts, photo consent, usage limits, recipient isolation, idempotency, publication gates, draft-media privacy and blocked private-network image downloads. No real user announcement, email, AI request or third-party image download was performed. No connected browser was available for visual testing.

References: [Responses API](https://developers.openai.com/api/reference/responses/overview), [web and image search](https://developers.openai.com/api/docs/guides/tools-web-search), [image inputs](https://developers.openai.com/api/docs/guides/images-vision).
