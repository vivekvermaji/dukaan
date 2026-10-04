import { useBase } from '../lib/base'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { handle, rupee, salesIn } from '../lib/engine'
import { useStore, undoLast, addLog } from '../lib/store'
import { speak, useVoice, voiceSupported, setTTS, getTTS } from '../lib/voice'
import { probeLLM, llmStatus } from '../lib/llm'
import { Wave } from '../components/ui'
import type { Outcome } from '../lib/types'

type Msg = { id: number; who: 'me' | 'bot'; text: string; out?: Outcome; undone?: boolean; pending?: boolean }
let thread: Msg[] = []
let nid = 1

const CHIPS = ['2 doodh aur 1 bread becho', 'Ramesh ka 500 udhaar likh do', 'Sunita ne 200 diye', 'aaj kitni sale hui?', 'kiska sabse zyada udhaar hai?', 'kya khatam ho raha hai?', '50 packet Maggi aaya', 'wo wapas karo']

export default function Console() {
  const base = useBase()
  const s = useStore()
  const [msgs, setMsgs] = useState<Msg[]>(thread)
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')
  const [tts, setTts] = useState(getTTS())
  const [llm, setLlm] = useState<boolean | null>(llmStatus())
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { probeLLM().then(setLlm) }, [])
  useEffect(() => { thread = msgs; end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs])

  const submit = async (t: string) => {
    if (!t.trim() || busy) return
    setBusy(true)
    const me: Msg = { id: nid++, who: 'me', text: t.trim() }
    setMsgs((m) => [...m, me])
    const out = await handle(t)
    setMsgs((m) => [...m, { id: nid++, who: 'bot', text: out.reply.text, out }])
    speak(out.reply.speech)
    setBusy(false)
  }
  const { listening, interim, error, start, stop } = useVoice(submit)

  const undoMsg = (id: number) => {
    if (undoLast()) {
      setMsgs((m) => m.map((x) => (x.id === id ? { ...x, undone: true } : x)))
      addLog({ utterance: '(undo button)', intent: 'undo', reply: 'Undo from card', ok: true, source: 'system' })
    }
  }

  const today = salesIn(s, 'today')
  const owed = s.customers.reduce((a, c) => a + Math.max(0, c.balance), 0)
  const low = s.items.filter((i) => i.qty <= i.reorder)
  const lastBotId = [...msgs].reverse().find((m) => m.who === 'bot' && m.out?.card?.undoable && !m.undone)?.id

  return (
    <div className="console">
      <div className="glow g1" /><div className="glow g2" />
      <header className="topnav slim">
        <Link to={base} className="logo"><span className="logo-mark">द</span><span>Dukaan</span></Link>
        <nav>
          <Link to={base}>Dashboard →</Link>
        </nav>
      </header>
      <div className="console-grid">
        <section className="talk">
          <div className="thread">
            {msgs.length === 0 && (
              <div className="empty">
                <h2>Boliye, kya likhna hai?</h2>
                <p>Mic dabao aur apni bhasha me bolo. Neeche se koi example bhi tap kar sakte ho.</p>
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={`msg ${m.who}`}>
                <div className="bubble">{m.text}</div>
                {m.out?.card && (
                  <div className={`action-card ${m.out.card.tone ?? ''} ${m.undone ? 'undone' : ''}`}>
                    <div className="ac-head"><span>{m.out.card.title}</span>{m.out.source === 'llm' && <em>AI samjha</em>}</div>
                    {m.out.card.rows.map(([k, v], i) => <div className="ac-row" key={i}><span>{k}</span><b>{v}</b></div>)}
                    {m.out.card.undoable && (m.undone
                      ? <div className="ac-undone">Wapas ho gaya</div>
                      : m.id === lastBotId && <button className="link-btn" onClick={() => undoMsg(m.id)}>↶ Undo</button>)}
                  </div>
                )}
              </div>
            ))}
            {(busy || interim) && <div className="msg me"><div className="bubble ghost">{interim || '…'}</div></div>}
            <div ref={end} />
          </div>

          <div className="chips">{CHIPS.map((c) => <button key={c} onClick={() => submit(c)}>{c}</button>)}</div>

          <div className="mic-row">
            <form onSubmit={(e) => { e.preventDefault(); submit(text); setText('') }} className="typebox">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ya yaha type karo: Imran ka 150 udhaar likh do" />
              <button type="submit" disabled={busy}>Bhejo</button>
            </form>
            <button className={`mic ${listening ? 'on' : ''}`} onClick={listening ? stop : start} aria-label="mic">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v5a4 4 0 0 0 4 4zm7-4a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.08A7 7 0 0 0 19 11z" /></svg>
            </button>
          </div>
          <Wave active={listening} />
          <div className="mic-note">
            {error ? <span className="err">{error}</span> : listening ? 'Sun raha hu…' : voiceSupported ? 'Mic dabao aur Hindi / Hinglish me bolo' : 'Voice ke liye Chrome ya Edge chahiye. Type karke bhi chalega.'}
            <label className="tog"><input type="checkbox" checked={tts} onChange={(e) => { setTts(e.target.checked); setTTS(e.target.checked) }} /> Jawab bolkar sunao</label>
          </div>
        </section>

        <aside className="livepanel">
          <div className="live-head"><span className="dot live" />Dukaan abhi</div>
          <div className="mini"><span>Aaj ki sale</span><b>{rupee(today.total)}</b></div>
          <div className="mini"><span>Bill aaj</span><b>{today.sales.length}</b></div>
          <div className="mini"><span>Kul udhaar</span><b>{rupee(owed)}</b></div>
          <div className="mini"><span>Kam stock</span><b className={low.length ? 'warn' : ''}>{low.length}</b></div>
          <div className="live-sep" />
          <div className="live-title">Pichle kaam</div>
          {s.log.filter((l) => l.undoable).slice(-4).reverse().map((l) => (
            <div key={l.id} className={`mini-log ${l.undone ? 'undone' : ''}`}><div>{l.utterance}</div><small>{l.intent}{l.undone ? ' · undo' : ''}</small></div>
          ))}
          {!s.log.some((l) => l.undoable) && <div className="muted">Abhi koi kaam nahi hua.</div>}
          <div className="live-sep" />
          <div className="brain">
            <div><span className="dot ok" />Offline Hinglish parser: chalu</div>
            <div><span className={`dot ${llm ? 'ok' : 'off'}`} />AI model: {llm === null ? 'check ho raha…' : llm ? 'chalu' : 'band (parser se kaam chal raha)'}</div>
          </div>
          <Link to={base} className="live-cta">Dashboard me live dekho →</Link>
        </aside>
      </div>
    </div>
  )
}
