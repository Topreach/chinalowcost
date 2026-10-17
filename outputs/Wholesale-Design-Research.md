# ChinaLowCost wholesale design research

Reviewed 15 October 2026. Research used publicly accessible platform pages and official product guidance. It did not include signed-in buyer/admin areas or a usability study.

## Patterns worth adapting

| Reference | Observed pattern | ChinaLowCost implementation |
|---|---|---|
| [Faire storefront](https://www.faire.com/) | Prominent product search, clear category navigation, curated discovery and product cards with purchasing context | Spacious collection-led storefront, persistent search, category chips, clear unit and pack information, consistent product illustrations |
| [Alibaba MOQ and volume-pricing guidance](https://seller.alibaba.com/businessblogs/px6g2lut-what-is-minimum-order-quantity-moq) | Explicit minimum-order quantities and volume-based ladder pricing | Visible MOQ and pack multiples, quantity validation, tier table, unit rate and total calculation |
| [Alibaba quotation flow](https://rfq.alibaba.com/rfq/rfqForm.htm) | A dedicated quotation journey and separate order/action areas | Wholesale calculator → versioned quotation → PDF download → acceptance → cart → checkout |
| [Alibaba storefront](https://www.alibaba.com/) | Product search, image-search entry points, cart and buyer account access | Persistent text/photo discovery, cart quantity indicator and customer activity pages |

Faire’s page also promotes payment and return benefits. Those benefits belong to Faire and have **not** been adopted as ChinaLowCost promises. Alibaba’s supplier-facing marketplace and Trade Assurance service have **not** been presented as ChinaLowCost features. ChinaLowCost’s supply model remains centralized: staff manage supplier relationships and suppliers have no logins.

The observed platform patterns inform layout and information hierarchy. The application-specific worker flows, approval controls and admin finance views are original design proposals derived from ChinaLowCost’s specification.

## Design decisions

1. Preserve the forest-green, ivory and lime identity; use one consistent spacing, typography and component system across the three applications.
2. Keep shopping visually led, with an editorial hero, product grid and category discovery. Keep operational pages denser, with tables, queues and record detail panels.
3. Put minimum quantity, pack multiple, unit basis and price tiers near purchase controls. Show which quantity unlocks the advertised lowest price.
4. Keep quotations discoverable from the header and give them a dedicated record, expiry, version, total and downloadable PDF.
5. Separate order, payment, procurement and delivery states. Never show a payment screenshot as verified funds.
6. Keep photo discovery and video shopping prominent while labeling their prototype simulations accurately.
7. Add a page index and app switcher for reviewers. These prototype controls are not customer-facing production navigation or access control.
8. Provide empty, error and offline preview states for every route; production state behavior needs implementation and testing against real services.

## Review limits

Ankorstore’s public homepage could not be retrieved (403), so no design claims were based on it. Local-file browser automation was previously denied by the browser URL policy. The expanded prototype is checked through route, markup and interaction tests; automated visual screenshots are not available through that blocked path.

## Included prototype

All 69 current screen-register entries have individual hash routes in Screen-Blueprint.html: the original 66 plus customer offers, admin promotions and destination-rate management. This is a connected browser-local prototype. The editable source files are prototype.css, prototype.js and commerce.js; the standalone HTML embeds them so it can open directly without a server.

Shopping, quotations, PDF downloads, local-image preview, messages, catalog review, field tasks and independent approval demonstrations use sample records. No external AI, WhatsApp, payment, courier, authentication or storage service is connected.
