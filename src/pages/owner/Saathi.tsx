import { useEffect, useRef, useState } from 'react'
import { useBase } from '../../lib/base'
import { api } from '../../lib/api'
import { handle } from '../../lib/engine'
import { buildDigest, localSummary, SUMMARY_WORDS } from '../../lib/digest'
import { askSaathi, probeLLM } from '../../lib/llm'
import { addLog, getState, undoLast, useStore } from '../../lib/store'
import { speak, useVoice, voiceSupported } from '../../lib/voice'
import type { Outcome, Payment } from '../../lib/types'

type Msg = { id: number; who: 'me' | 'bot'; text: string; out?: Outcome; undone?: boolean }
let thread: Msg[] = []
let nid = 1

const CHIPS = ['Aaj kya hua?', 'Aaj kitna udhaar diya aur kisne paise diye?', 'Sabse zyada udhaar kiska hai?', 'Kya khatam ho raha hai?', 'Aaj Ramesh ne 2 doodh udhaar liya aur 100 rupaye diye']

export default function Saathi() {
  const base = useBase()
  const demo = base !== '/malik'
  const s = useStore()
  const [msgs, setMsgs] = useState<Msg[]>(thread)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [ai, setAi] = useState<boolean | null>(null)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { probeLLM().then(setAi) }, [])
  useEffect(() => { thread = msgs; end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs])

  const add = (m: Omit<Msg, 'id'>) => setMsgs((x) => [...x, { ...m, id: nid++ }])

  const submit = async (t: string) => {
    const q = t.trim()
    if (!q || busy) return
    setBusy(true)
    const history = msgs.map((m) => ({ who: m.who, text: m.text }))
    add({ who: 'me', text: q })
    let payments: Payment[] = []
    if (!demo) { try { payments = (await api.payments()).payments } catch { /* digest works without it */ } }
    const digest = buildDigest(getState(), payments)
    try {
      const r = await askSaathi(q, digest, history, getState())
      add({ who: 'bot', text: r.reply })
      speak(r.reply)
      for (const a of r.actions || []) {
        const out = await handle(a)
        add({ who: 'bot', text: out.reply.text, out })
      }
    } catch {
      // Model not reachable: still do the job with the offline parser and plain facts.
      if (SUMMARY_WORDS.test(q) && !/\d/.test(q)) {
        add({ who: 'bot', text: localSummary(getState(), payments) })
      } else {
        const out = await handle(q)
        add({ who: 'bot', text: out.reply.text, out })
      }
    }
    setBusy(false)
  }
  const { listening, interim, start, stop } = useVoice(submit)

  const undoMsg = (id: number) => {
    if (undoLast()) {
      setMsgs((m) => m.map((x) => (x.id === id ? { ...x, undone: true } : x)))
      addLog({ utterance: '(undo button)', intent: 'undo', reply: 'Undo from card', ok: true, source: 'system' })
    }
  }
  const lastCard = [...msgs].reverse().find((m) => m.out?.card?.undoable && !m.undone)?.id
  void s

  return (
    <div className="saathi-wrap">
      <header className="page-head"><h1>Saathi</h1><p>Apne dukaan ke saath baat karo. "Aaj kya hua?" pucho, ya bolo "Ramesh ne 200 diye" - main khata me likh dunga.</p></header>
      <section className="talk">
        <div className="thread">
          {msgs.length === 0 && (
            <div className="empty">
              <h2>Namaste! Aaj ka hisaab batau?</h2>
              <p>Simple bhasha me pucho ya bolo kya hua. Jo bologe, main samajh ke likh dunga. Galti ho toh Undo dabao.</p>
            </div>
          )}
          {msgs.map((m) => (
            <div key={m.id} className={`msg ${m.who}`}>
              <div className="bubble" style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
              {m.out?.card && (
                <div className={`action-card ${m.out.card.tone ?? ''} ${m.undone ? 'undone' : ''}`}>
                  <div className="ac-head"><span>{m.out.card.title}</span><em>Khate me likha</em></div>
                  {m.out.card.rows.map(([k, v], i) => <div className="ac-row" key={i}><span>{k}</span><b>{v}</b></div>)}
                  {m.out.card.undoable && (m.undone ? <div className="ac-undone">Wapas ho gaya</div> : m.id === lastCard && <button className="link-btn" onClick={() => undoMsg(m.id)}>↶ Undo</button>)}
                </div>
              )}
            </div>
          ))}
          {(busy || interim) && <div className="msg me"><div className="bubble ghost">{interim || 'Soch raha hu…'}</div></div>}
          <div ref={end} />
        </div>
        <div className="chips">{CHIPS.map((c) => <button key={c} onClick={() => submit(c)}>{c}</button>)}</div>
        <div className="mic-row">
          <form onSubmit={(e) => { e.preventDefault(); void submit(text); setText('') }} className="typebox">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Yaha likho: aaj Sunita ne 300 diye, 2 kilo chini udhaar gayi" />
            <button type="submit" disabled={busy}>Bhejo</button>
          </form>
          {voiceSupported && (
            <button className={`mic ${listening ? 'on' : ''}`} onClick={listening ? stop : start} aria-label="mic">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4zm7-4a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.08A7 7 0 0 0 19 11z" /></svg>
            </button>
          )}
        </div>
        <div className="mic-note">{ai === false ? 'AI abhi band hai, seedha khate se jawab milega.' : 'Jawab AI se aata hai, entry hamesha Undo ho sakti hai.'}</div>
      </section>
    </div>
  )
}
