# Nigeria destinations transportation and promotions

Design update · 15 October 2026 · Editable requirements and prototype guide

## What changed

The application now collects state/FCT and town/city/delivery area. Every customer page exposes a destination selector. Product details, the wholesale calculator, cart, quotations and checkout show location-dependent transportation separately from goods pricing. Three new pages expand the register to 69: customer offers (C22), admin promotions (A31) and delivery zones/rates (A32).

All 36 states and the FCT are selectable. Nigeria’s administrative structure is confirmed by the [National Bureau of Statistics](https://www.nigerianstat.gov.ng/page/about-us). Suggested towns are representative, not an exhaustive official settlement directory. A town/area can also be entered manually. State selection does not imply delivery coverage. No transport rate is silently assigned to an unconfigured town.

## Customer experience

1. Choose state/FCT and town, or Other town / area.
2. Enter street/building, optional landmark and optional postcode during checkout. Postcode remains text; this preview does not validate a national postcode database.
3. Review transportation for that destination and the sample package weight.
4. Apply one eligible promo code.
5. Review goods subtotal, product discount, transportation charge, transport discount and final estimated total.
6. If the route is unconfigured, see goods after product discount plus “transportation quotation required.” Payment is blocked until transportation is resolved. There is no misleading zero delivery fee.

Changing destination updates estimates, not past records. Issued quotations retain their destination and cost snapshot. A changed destination, rate or promo requires a revised quotation before acceptance. A paid order retains its original amount and address snapshot.

## Prototype rate examples

All fees below are fabricated demonstration values, not courier quotations or market recommendations. The sample dispatch origin is one Lagos consolidation hub. Suggested delivery windows are likewise illustrative and not service commitments.

Chargeable weight = max(total actual weight, total volumetric weight). Sample SKU weights are explicitly stored in commerce.js. No claim is made that these match real products.

Transport fee = town route base fee + ceil(max(0, chargeable kg − included kg) / step kg) × step fee.

| Example: 55 desk fans | Lagos / Ikeja | FCT / Abuja |
|---|---:|---:|
| Goods at ₦4,000/unit | ₦220,000 | ₦220,000 |
| Sample chargeable weight | 82.5 kg | 82.5 kg |
| Route base, includes 5 kg | ₦3,000 | ₦9,000 |
| Additional 5 kg increments | 16 × ₦500 | 16 × ₦1,200 |
| Transportation estimate | ₦11,000 | ₦28,200 |
| Total before promo | ₦231,000 | ₦248,200 |
| BULK5 product discount | −₦11,000 | −₦11,000 |
| Total with BULK5 | ₦220,000 | ₦237,200 |

The prototype includes 11 illustrative town routes. Every other destination needs a staff quote until an admin adds a sample route. In Admin → Delivery zones & rates, select a state/town and set its base and additional-weight fee. An existing exact state/town entry is updated rather than duplicated.

## Discounts and promotional rules

Published retail/wholesale SKU prices remain the goods-price basis. Wholesale tiers already reduce the unit price. “Wholesale tier savings” is a reference comparison and is **not subtracted a second time**.

One promo is allowed per order in the current design. It can stack with published wholesale tiers when eligible. Product and transport discounts are calculated separately, and no discount can exceed its eligible amount or configured cap.

| Demo code | Eligibility | Benefit | Minimum eligible goods | Cap |
|---|---|---|---:|---:|
| WELCOME10 | Retail lines | 10% product discount | ₦20,000 | ₦5,000 |
| BULK5 | Wholesale lines | 5% additional product discount | ₦100,000 | ₦15,000 |
| SHIP5000 | Retail or wholesale | Transportation discount | ₦50,000 | ₦5,000 |
| EXPIRED10 | Expired example | Rejected | — | — |

Demo active codes expire at the end of 2027 and are sample offers only. The promotion engine checks code existence, active state, start/end time, usage limit, eligible purchase mode, minimum eligible spend and cap. Mixed carts apply product discounts only to eligible lines. Shipping discounts require a known transport fee. One promo cannot make an unquoted route payable.

Admin → Promotions & discounts supports sample percent, fixed-amount and transport promotions; minimum spend, cap, eligible mode, expiry and usage limit; and pause/reactivation controls. Percentage values above 100 are rejected. Sample redemption increments only on the first verified-payment simulation, not on each Apply click or payment retry.

## Production architecture additions

| Record | Important fields |
|---|---|
| StateRegion | Stable ID, name, country NG, type state/FCT |
| Locality | ID, parent state, canonical town/area, alternate spellings, optional LGA and postcode references |
| AddressSnapshot | State/locality IDs, captured display names, custom town if applicable, street, landmark, postcode, optional authorized coordinates |
| DeliveryZone | Origin hub, destination state/locality/zone, carrier and service, serviceable status, remote-area flag |
| DeliveryRateVersion | Zone, base, included weight, increment, surcharge rules, effective dates, approver, currency |
| ShipmentRating | Shipment/package quantities, actual/dimensional weights, rate version, surcharge breakdown, estimate/confirmed state |
| PromotionVersion | Code, benefit type, amount/percentage, eligible modes/SKUs/categories, spend minimum, cap, start/end, timezone, channels, stacking, budget, approver |
| PromoRedemption | Customer/order/promotion, reservation expiry, applied amount, reserved/redeemed/released/reversed state, unique idempotency reference |
| PriceAdjustment | Order/quote version, product/shipping scope, amount, reason, approval, allocated line amounts |

Production rules:

- Normalize locality identifiers and maintain reviewed aliases; never price on an unverified free-text match alone. A new/custom town enters the operations verification queue.
- Rate each real shipment from its actual pickup/consolidation origin. For multi-supplier orders, distinguish procurement transport from customer delivery and define whether consolidation or split deliveries apply. Avoid double-charging the same leg.
- Separate product cost, customer selling price, transportation, handling and approved remote-area surcharges. Customer-visible amounts must match the accepted quote/order version.
- Record measurements and carrier dimensional-weight rules, not the prototype’s assumed item weights. Missing data, remote routes or oversized goods enter manual quotation.
- Calculate and validate totals server-side in integer kobo with a documented rounding rule. The current prototype uses whole-naira illustrative prices.
- Require independent approval for live rates/promotions and margin exceptions. The prototype saves local sample rules directly for review; it is not that production approval system.
- Reserve promotion usage/budget atomically during checkout and finalize on verified payment; expire or release reservations on failure/cancellation according to policy. Prevent simultaneous checkouts exceeding the limit.
- Define per-customer limits and attribution to verified accounts; global limits alone do not prevent repeat-customer abuse. Configure product exclusions and minimum margin as part of promotion approval.
- Allocate product discounts to lines and shipping discounts to shipments with consistent rounding. Partial refunds use paid net amounts, not undiscounted catalog prices. Define coupon restoration and budget reversal policy explicitly.
- If an accepted quotation changes, issue a new version and get customer agreement. Never automatically increase a paid order because the destination or carrier rate later changes.
- Tax configuration and discount/tax ordering remain subject to approved business/accounting policy; no tax rate is assumed here.

## How to preview

Open Screen-Blueprint.html and refresh. Use Change location in the customer header. Try Lagos → Ikeja, then FCT → Abuja, with 55 desk fans. Open the calculator or cart and apply BULK5. Try Abia → Aba to see the unconfigured-route state. Add that route in Admin → Delivery zones & rates, then return to the customer view. Try WELCOME10 on wholesale goods to see eligibility rejection.

Location selections, rules and demo orders are saved only in browser local storage where available. No carrier, map service or real promotion system is connected. A reset clears only sample workspace data.
