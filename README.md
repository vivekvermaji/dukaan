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
- **Admin panel:** `/admin` dashboard (live sales, 7-day chart, top items, activity feed), `/admin/khata` (udhaar ledger, WhatsApp reminder, settle), `/admin/stock`, `/admin/log` (every command, what was understood, how).
- **Data:** stored in the browser (localStorage), seeded with a clearly labelled sample shop. Reset from the Voice log page.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Without an API key the app runs on the offline parser only.

## Deploy with the AI layer (Vercel)

1. Import this repo in Vercel.
2. Add environment variable `OPENROUTER_API_KEY` (a free OpenRouter key). Optionally `OPENROUTER_MODELS`.
3. Deploy. `api/agent.ts` becomes the `/api/agent` function. The key never reaches the browser or the repo.

## Project layout

```
src/lib/parser.ts   offline Hinglish parser
src/lib/engine.ts   actions (sale, udhaar, payment, stock, queries, undo) + LLM result validation
src/lib/llm.ts      client for the serverless proxy
src/lib/store.ts    state, persistence, undo snapshots
src/pages/          Home, Console (voice), Dashboard, Khata, Stock, Log
api/agent.ts        serverless proxy to OpenRouter
```

## License

MIT. See [LICENSE](LICENSE).
