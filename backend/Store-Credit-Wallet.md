# Personal invitation codes and store credit

Customers open **Offers & promotions (C22)** for their code, earnings and wallet.
They can replace a random code with a unique word such as ADEOLA or SHOPWITHAMINA.
Codes accept 3–24 letters, numbers, underscores and hyphens and ignore case.
Old codes remain assigned to the same customer so earlier invitations still work;
another customer cannot take them. Customer codes cannot collide with Admin
discount codes. Code changes are limited to five per account per day.

## Registration and attribution

Customer signup has an optional invitation/personal promo code field. Google
signup carries this field into its popup, where it can also be entered directly.
Valid registration binds the inviter permanently to the new customer. Invalid
attribution rolls back account creation rather than leaving a partial account.
Email signup still needs verification; signup alone creates no reward.

Customers can also enter an invitation code on C22 before their first checkout.
The cart's code input recognizes personal invitation codes and attaches them;
Admin promotion codes continue to apply configured price discounts. An invitation
code by itself does not discount the customer's order. Self-referrals, referral
cycles and switching an already attached inviter are blocked.

## Earning and spending

Admin → **Promotions & discounts (A31)** controls commission percent, minimum,
maximum reward, first/repeat eligibility and whether wallet spending is allowed.
Successful, provider-verified eligible purchases append one wallet credit per
reward. Existing test referral rewards are migrated idempotently to test credit.
No customer-facing endpoint can mint or transfer wallet credit.

On **Quotation review (C09)** the customer chooses how much available store credit
to use before accepting the approved quotation. Checkout checks balance and
deducts credit inside the same SQLite transaction as order creation. Duplicate
acceptance returns the existing order without another debit. Insufficient balance,
disabled spending or a rejected checkout rolls back all writes.

An order paid entirely from wallet credit is settled atomically without Paystack.
For a partial wallet payment, Paystack initializes and verifies only the remaining
amount. The immutable order records its full total, wallet portion and external
remainder. The order settlement ledger records the full order total; the separate
wallet ledger records credits/debits. Receipt text distinguishes both portions.

Referral commission excludes delivery, tax, discounts and wallet-funded goods.
Consequently a fully wallet-funded purchase cannot generate additional referral
credit. This prevents repeatedly cycling the same credit into new rewards.

## Cancellation and limitations

Credit applied to an accepted but unpaid order is already deducted from the
available balance. **Payment (C13)** offers cancellation and release before any
Paystack initialization attempt. Release is account-scoped and idempotent. Paid
orders and attempted/ambiguous provider payments require reconciliation before
credit can be restored; automatic late-payment/refund reconciliation is unfinished.
Checkout expiry does not automatically release credit.

**The current application accepts Paystack test payments only. Wallet balances
are test store credit and settle test orders only.** They are not withdrawable,
transferable cash and must not be used to fulfill real purchases. No live credit
environment can be inserted into the current wallet table. Enabling real earning
and spending requires a separate live payment/credit environment, refund and
commission reversal, payout/fraud controls and production acceptance testing.

## Verification and deployment

Tests cover custom-code uniqueness, aliases, promotion collisions, atomic signup,
unverified-signup restrictions, wallet settlement, restart persistence, duplicate
checkout, overdrafts, paused spending, partial provider amount checks, no recycled
credit rewards and safe cancellation/release. Provider calls are mocked.

Restart locally after building. Deploy the updated archive separately to Contabo,
preserving .env, the database and APP_ENCRYPTION_KEY.
