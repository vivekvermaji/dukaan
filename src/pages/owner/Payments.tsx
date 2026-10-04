import { useCallback, useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { flushPush, mutate, pushSnapshot, uid, addLog, useStore } from '../../lib/store'
import { rupee } from '../../lib/engine'
import { ago } from '../../lib/hooks'
import type { Payment } from '../../lib/types'
import { useBase } from '../../lib/base'

function Selfie({ id }: { id: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => { api.photo(id).then((r) => setSrc(r.photo)).catch(() => {}) }, [id])
  return src ? <a href={src} target="_blank" rel="noreferrer"><img className="selfie" src={src} alt="Customer ki photo" /></a> : <div className="selfie ph" />
}

export default function Payments() {
  const demo = useBase() !== '/malik'
  const s = useStore()
  const [list, setList] = useState<Payment[] | null>(null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const load = useCallback(() => api.payments().then((r) => setList(r.payments)).catch((e) => setErr(e.message)), [])
  useEffect(() => { if (demo) return; void load(); const t = setInterval(load, 8000); return () => clearInterval(t) }, [load, demo])

  const confirm = async (p: Payment) => {
    setBusy(p.id); setErr('')
    try {
      const c = s.customers.find((x) => x.id === p.customerId)
      const pay = c ? Math.min(p.amount, Math.max(0, c.balance)) : 0
      await api.resolve(p.id, 'confirmed') // fails (409) if already handled, so khata never reduces twice
      if (c && pay > 0) {
        pushSnapshot()
        mutate((d) => {
          d.customers.find((x) => x.id === c.id)!.balance -= pay
          d.ledger.push({ id: uid(), ts: Date.now(), customerId: c.id, amount: -pay, kind: 'payment', note: `UPI · UTR ${p.utr}` })
        })
        addLog({ utterance: `(UPI payment ${p.utr})`, intent: 'payment', reply: `${p.name} ka ${rupee(pay)} UPI payment confirm kiya`, ok: true, source: 'system', undoable: false })
        await flushPush()
      }
      await load()
    } catch (e) { setErr((e as Error).message) } finally { setBusy('') }
  }
  const reject = async (p: Payment) => {
    setBusy(p.id); setErr('')
    try { await api.resolve(p.id, 'rejected'); await load() } catch (e) { setErr((e as Error).message) } finally { setBusy('') }
  }

  if (demo) return (
    <><div className="page-head"><div><h1>Payments</h1></div></div>
      <div className="card"><p className="muted">Asli owner area me yaha customers ke UPI payments aate hain (UTR ke saath). Owner bank app me paisa dekhkar ek tap me confirm karta hai, tabhi khata ghatta hai. Demo sandbox me ye band hai kyunki isme koi public website judi nahi hai.</p></div></>
  )
  const pending = (list ?? []).filter((p) => p.status === 'pending')
  const done = (list ?? []).filter((p) => p.status !== 'pending').slice(0, 20)
  return (
    <>
      <div className="page-head"><div><h1>Payments</h1><p>Customer ne UPI se diya, UTR daala. Aap bank / UPI app me dekh kar confirm karo. Khata tabhi ghategi.</p></div></div>
      {err && <div className="err">{err}</div>}
      <div className="card">
        <div className="card-title">Confirm karna baaki ({pending.length})</div>
        {list === null && <div className="muted">Load ho raha…</div>}
        {list && pending.length === 0 && <div className="muted">Abhi koi pending payment nahi.</div>}
        {pending.map((p) => (
          <div key={p.id} className="pay-row">
            {p.hasPhoto && <Selfie id={p.id} />}
            <div className="grow">
              <div><b>{p.name}</b> · {rupee(p.amount)}</div>
              <small>UTR <code>{p.utr}</code> · {ago(p.ts)}</small>
            </div>
            <button className="btn sm" disabled={busy === p.id} onClick={() => confirm(p)}>Paisa aa gaya ✓</button>
            <button className="btn sm ghost" disabled={busy === p.id} onClick={() => reject(p)}>Nahi aaya</button>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Pichle payments</div>
        {done.length === 0 && <div className="muted">Abhi kuch nahi.</div>}
        {done.map((p) => (
          <div key={p.id} className="pay-row">
            <div className="grow"><div>{p.name} · {rupee(p.amount)}</div><small>UTR <code>{p.utr}</code> · {ago(p.resolvedTs ?? p.ts)}</small></div>
            <span className={`pill ${p.status === 'confirmed' ? '' : 'bad'}`}>{p.status === 'confirmed' ? 'Confirm' : 'Reject'}</span>
          </div>
        ))}
      </div>
    </>
  )
}
