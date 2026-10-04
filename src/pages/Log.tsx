import { useStore, resetAll } from '../lib/store'
import { clock } from '../lib/hooks'

export default function Log() {
  const s = useStore()
  const rows = [...s.log].reverse()
  return (
    <>
      <div className="page-head">
        <div><h1>Voice log</h1><p>Har command, agent ne kya samjha, aur kya kiya. Poori transparency.</p></div>
        <button className="btn sm ghost" onClick={() => { if (confirm('Sample data wapas laye? Sab badlav hat jayenge.')) resetAll() }}>Sample data reset</button>
      </div>
      <div className="card">
        {rows.length === 0 && <div className="muted">Abhi koi command nahi. Voice agent me kuch bolo.</div>}
        {rows.map((l) => (
          <div className="log-row" key={l.id}>
            <div className="log-top">
              <span className="log-time">{clock(l.ts)}</span>
              <span className={`pill ${l.ok ? '' : 'bad'}`}>{l.intent}</span>
              <span className="pill ghost">{l.source === 'llm' ? 'AI model' : l.source === 'rules' ? 'offline parser' : 'admin'}</span>
              {l.undone && <span className="pill warn">undo hua</span>}
            </div>
            <div className="log-said">“{l.utterance}”</div>
            <div className="log-reply">{l.reply}</div>
          </div>
        ))}
      </div>
    </>
  )
}
