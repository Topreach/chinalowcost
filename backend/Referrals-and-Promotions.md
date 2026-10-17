# Referrals and promotions

## Where to configure

Open **Admin → Promotions & discounts (A31)**. Administrator MFA and CSRF
checks protect saving. Configure referral percentage (0.01–50%), maximum reward
per purchase, minimum eligible goods and first qualifying purchase only versus
repeat purchases. The referral program defaults to disabled.

Customers find their persistent invitation code and private earnings under
**Offers & promotions (C22)**, also linked from **Profile (C20)**. Share the code
with a friend, who signs in and enters it there before their first checkout.
Invitation attribution is permanent, one per customer; self-referrals, circular
referrals, inactive inviters and staff accounts are rejected. No contact list or
recipient purchase details are exposed to the inviter.

## Reward calculation

Checkout freezes the referring customer and current commission rules. The basis
is goods after goods discounts, excluding shipping and tax. Integer kobo rewards
round down and obey the configured maximum. Subsequent settings changes apply
to new checkouts. Pausing the program stops new attribution/reward snapshots;
existing eligible checkout snapshots remain valid.

Only a matching provider-verified payment records a reward. Order IDs are unique
in the reward ledger; duplicate callbacks cannot create duplicate rewards.
First-purchase-only means the first qualifying verified purchase to create a
reward, even if several unpaid orders exist. Revoked orders do not earn rewards.

**Payments still use Paystack test mode. All recorded rewards are test-earned,
not withdrawable cash.** Test rewards can now be spent through the store-credit
wallet on test orders. No bank transfer or automated payout is enabled.
Live reward settlement needs live payments, return/refund reversal,
fraud review and payout authorization workflows. Multiple accounts controlled
by one person are not automatically detected by the self-referral check.

Personal code editing, signup attribution and full/partial store-credit checkout
are documented in `Store-Credit-Wallet.md`. Wallet-funded goods are excluded
from referral commission calculations.

## Promotion configuration

The same Admin page creates and edits percentage goods discounts, fixed goods
discounts and fixed delivery discounts. Rules specify retail/wholesale/all
eligibility, minimum eligible goods, maximum discount, start/end UTC, global
checkout limit and per-customer limit. Codes ignore case. One code applies per
order, after published wholesale quantity tiers. Percentage discounts use integer
basis points (100 basis points = 1%) and round down to kobo.

Customers select a promotion on C22 or enter a code in the existing cart/wholesale
form. Server validation supplies previews and checks again at quotation,
staff approval and checkout. Goods, delivery and discount values are frozen in
the accepted order. Changing or pausing a promotion invalidates quotations not
yet accepted; accepted totals stay unchanged.

Delivery discounts are capped at approved shipping charges. An unknown route
still requires staff approval and cannot become an assumed free delivery.
Checkout must retain a positive final amount for the payment workflow.

Redemption capacity is consumed atomically at checkout, including unpaid or
abandoned checkouts. Repeated submission of the same accepted quote uses the
same order and does not consume another use. Competing checkouts cannot exceed
global or per-customer limits. Capacity is not automatically released after
expiry/cancellation; automatic release would need late-payment reconciliation.

## Validation and deployment

Tests cover attribution persistence/privacy, blocked self/circular referral,
frozen net-goods commission, first/repeat reward rules, minimum/cap, duplicate
provider verification, promotion versions/eligibility/limits, transactional
rollback and Admin MFA/CSRF. Original application controls are exercised against
the real HTTP server and SQLite using mocked provider responses.

Run `npm run build`, restart locally, and sign in with real server accounts.
The updated deployment archive must be uploaded separately to Contabo; no
production server change is performed by this local implementation.
