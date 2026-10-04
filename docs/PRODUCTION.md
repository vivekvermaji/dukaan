# From demo to a real shop

The demo confirms UPI payments by hand: the customer submits a UTR, the owner checks the bank and taps confirm. That is safe but not automatic. Automatic confirmation needs a payment gateway.

## What a gateway needs

- A gateway account (Razorpay, Cashfree, PhonePe business, and similar). They ask for the account holder to be an adult and complete KYC: PAN, bank account, and usually a shop or business proof.
- Test mode keys are free and work without KYC, so the whole flow below can be built and tried before KYC is done.
- Gateway fees apply per payment. UPI collect through some gateways is free or very cheap, check the current pricing.

## Plan (Razorpay as the example)

1. **Create a payment per customer request.** In `netlify/functions/shop.mjs`, add an owner-free public op `createpay` that, after the same phone + khata code check as `lookup`, calls the gateway to create a UPI QR or payment link for the amount. Store the gateway id on the payment record (`gatewayId`) with status `pending`.
2. **Show it on `/pay`.** `src/pages/public/Pay.tsx` already shows a QR and a Pay now link. Replace the owner UPI QR with the gateway QR or link returned by `createpay`. The UTR form can stay as a fallback or be removed.
3. **Confirm by webhook, not by owner.** Add `netlify/functions/webhook.mjs`:
   - verify the gateway signature (`X-Razorpay-Signature`, HMAC of the raw body with the webhook secret),
   - find the payment by `gatewayId`,
   - on `payment.captured`, mark it `confirmed` and reduce the customer's balance and add a ledger entry in the `state` blob (same change the owner's Confirm button makes in `src/pages/owner/Payments.tsx`),
   - ignore a gateway id it has already processed (idempotent).
4. **Keep the owner screen.** The Payments page stays as the audit list and as the fallback for cash or direct-UPI payments.
5. **Secrets.** Gateway key id, key secret and webhook secret go in Netlify environment variables, never in the repo.

One thing to fix at that point: today the owner's browser writes the whole shop state. A webhook also writes it, so move the state update into one server function that applies single changes (add payment, reduce balance) instead of replacing the whole state, to avoid overwriting each other.

## Other production notes

- Change the demo phone numbers and khata codes. Customers are matched by phone number plus a 4-digit code the owner gives them.
- Pick a strong `ADMIN_PIN`. Login attempts are rate limited, sessions last 12 hours.
- Netlify Blobs is fine for one shop. For many shops use a real database.
