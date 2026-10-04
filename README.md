# Dukaan

A Hindi / Hinglish voice agent for Indian kirana shopkeepers, with a live admin panel.
Built for the **Amazon Developer Hackathon, Alexa+ track** (simulated Alexa+ style experience in a web app).

**Live demo: https://dukaan-voice.netlify.app** (voice agent at `/app`, admin panel at `/admin`)

The shopkeeper's hands are busy. They talk, Dukaan acts:

| Say | What happens |
|---|---|
| "2 doodh aur 1 bread becho" | Sale recorded, stock reduced |
| "Ramesh ka 500 udhaar likh do" | Credit added to Ramesh's khata. If two Rameshes exist, the agent asks "Kaun sa Ramesh?" |
| "Sunita ne 200 diye" | Payment deducted from her udhaar |
| "aaj kitni sale hui?" | Today's total, bill count, top item |
| "kiska sabse zyada udhaar hai?" | Biggest debtor and total outstanding |
| "kya khatam ho raha hai?" | Low-stock list |
| "50 packet Maggi aaya" | Stock added |
| "wo wapas karo" | Last action undone |

Devanagari works too: "रमेश का 500 उधार लिख दो", "दो दूध और एक ब्रेड बेचो".

## How it works

- **Voice in/out:** browser Web Speech API (`hi-IN`) for recognition and speech. Chrome or Edge. A text box works everywhere.
- **Two-layer brain:**
  1. An offline Hinglish parser (Hindi number words, "paanch sau", item and name fuzzy matching, ambiguity questions). Needs no key and no network.
  2. An LLM (OpenRouter free models) through a small serverless proxy, used when the parser is unsure. It returns a structured action; the app validates it against real items and customers before doing anything.
- **Actions are real:** the agent changes the books (sales, udhaar ledger, stock). Every action is shown as a card and can be undone.
- **Owner area:** `/malik` (PIN login, shared server data) and `/demo` (same screens on browser-only sample data, no login, for reviewers). Pages: dashboard, udhaar khata, payments, stock, "lana hai" shopping list, voice log, printable QR, settings. Nothing on the public site links to or mentions them.
- **Public customer site:** `/` home, `/hisaab` (customer enters phone number plus the 4-digit khata code the owner gave them, then sees balance, items taken and every entry), `/pay` (UPI QR, "Pay now" deep link, UTR form).
- **Shared data:** Netlify Functions + Netlify Blobs (free). The owner's voice commands write to the same data customers read. Customer lookups reveal only that one customer's record.

## Payments: what is verified and what is not

There is no payment gateway, so the app cannot ask a bank "did this UTR really arrive". The flow is built so a fake payment cannot reduce anyone's udhaar:

1. The customer scans the shop's QR (or taps Pay now on a phone), pays by UPI, and types the 12-digit UTR.
2. The payment lands in the owner's Payments page as **pending**. The same UTR cannot be submitted twice.
3. The owner checks the money in the bank or UPI app and taps **Paisa aa gaya**. Only then does the khata go down.

The shop's UPI ID is set by the owner in Settings. Until it is set, the page shows a labelled demo QR and a disabled Pay now button.

**Printable QR:** owner area, "Print QR". It encodes `/pay` of the deployed site, so a customer can pay even when the owner's phone is not with them.

## Going to production (real auto-verification)

Automatic confirmation needs a payment gateway account with business KYC. See [docs/PRODUCTION.md](docs/PRODUCTION.md) for the Razorpay webhook plan: where it plugs into this code and what to change.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Without an API key the app runs on the offline parser only.

## Deploy (Netlify, free)

1. Import this repo in Netlify. `netlify.toml` already sets the build, the functions and the redirects.
2. Add environment variables (Site configuration, Environment variables):
   - `OPENROUTER_API_KEY`: a free OpenRouter key, for the AI layer (optional, the offline parser works without it).
   - `ADMIN_PIN`: the owner's PIN or password for `/malik` (6+ characters). Never commit it.
   - `OPENROUTER_MODELS`: optional, comma-separated free model ids.
3. Deploy. Open `/malik`, log in once. That seeds the shop data. Then set the UPI ID in Settings.
4. In Netlify project settings, set visibility to Public and turn off the "Powered by Netlify" badge if you want a clean page.

`api/agent.ts` and `vercel.json` are an equivalent Vercel setup for the AI proxy only. The shared-data functions are Netlify-specific.

## Project layout

```
src/lib/parser.ts   offline Hinglish parser
src/lib/engine.ts   actions (sale, udhaar, payment, stock, queries, undo) + LLM result validation
src/lib/llm.ts      client for the serverless proxy
src/lib/store.ts    state, persistence, undo snapshots
src/pages/          public: Home, public/Hisaab, public/Pay. owner: Console (voice), Dashboard, Khata, Stock, Log, owner/*
netlify/functions/  agent.mjs (OpenRouter proxy), shop.mjs (shared data, customer lookup, payments, owner login)
api/agent.ts        Vercel version of the AI proxy
```

## License

MIT. See [LICENSE](LICENSE).
