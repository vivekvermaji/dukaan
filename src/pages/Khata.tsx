import { useState } from 'react'
import { useStore, mutate, pushSnapshot, uid, addLog, flushPush } from '../lib/store'
import { rupee } from '../lib/engine'
import { clock } from '../lib/hooks'

type Edit = { id: string; customerId: string; amount: string; note: string; date: string }
const ymd = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export default function Khata() {
  const s = useStore()
  const [edit, setEdit] = useState<Edit | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const list = [...s.customers].filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.balance - a.balance)
  const total = s.customers.reduce((a, c) => a + Math.max(0, c.balance), 0)

  const settle = (id: string) => {
    const c = s.customers.find((x) => x.id === id)!
    if (c.balance <= 0) return
    pushSnapshot()
    mutate((d) => {
      d.customers.find((x) => x.id === id)!.balance = 0
      d.ledger.push({ id: uid(), ts: Date.now(), customerId: id, amount: -c.balance, kind: 'payment', note: 'Admin panel se' })
    })
    addLog({ utterance: '(admin panel)', intent: 'payment', reply: `${c.name} ka khata saaf`, ok: true, source: 'system', undoable: true })
  }
  const saveEdit = (e0: { id: string; ts: number; amount: number; customerId: string }) => {
    if (!edit) return
    const v = Math.abs(Number(edit.amount))
    if (!(v > 0)) return
    const next = (e0.amount < 0 ? -1 : 1) * v
    const [y, m, d] = edit.date.split('-').map(Number)
    const dt = new Date(e0.ts); if (y && m && d) dt.setFullYear(y, m - 1, d)
    pushSnapshot()
    mutate((dr) => {
      const le = dr.ledger.find((x) => x.id === e0.id)!
      dr.customers.find((x) => x.id === e0.customerId)!.balance += next - le.amount
      le.amount = next; le.note = edit.note.trim() || le.note; le.ts = dt.getTime()
    })
    addLog({ utterance: '(admin panel)', intent: 'edit', reply: 'Entry badli', ok: true, source: 'system', undoable: true })
    setEdit(null)
    void flushPush()
  }
  const delEntry = (e0: { id: string; amount: number; customerId: string }) => {
    if (!window.confirm('Ye entry hata dein? Customer ka baaki bhi badal jayega.')) return
    pushSnapshot()
    mutate((dr) => {
      dr.customers.find((x) => x.id === e0.customerId)!.balance -= e0.amount
      dr.ledger = dr.ledger.filter((x) => x.id !== e0.id)
    })
    addLog({ utterance: '(admin panel)', intent: 'delete', reply: 'Entry hata di', ok: true, source: 'system', undoable: true })
    void flushPush()
  }
  const addCustomer = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim(); if (!n) return
    mutate((d) => { d.customers.push({ id: 'c-' + uid(), name: n, hi: n, aliases: n.toLowerCase().split(/\s+/), balance: 0, since: Date.now(), phone: phone.replace(/\D/g, '').slice(-10), code: String(1000 + Math.floor(Math.random() * 9000)) }) })
    setName(''); setPhone('')
  }
  const remind = (c: { name: string; balance: number }) =>
    `https://wa.me/?text=${encodeURIComponent(`Namaste ${c.name.split(' ')[0]} ji, aapka ${rupee(c.balance)} humare yaha baaki hai. Jab suvidha ho, de dijiye. Dhanyavaad 🙏`)}`

  return (
    <>
      <div className="page-head">
        <div><h1>Udhaar khata</h1><p>Kul baaki <b className="warn">{rupee(total)}</b> · {s.customers.filter((c) => c.balance > 0).length} logon ka</p></div>
        <input className="search" placeholder="Naam dhundo…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="card">
        {list.map((c) => {
          const entries = s.ledger.filter((e) => e.customerId === c.id).sort((a, b) => b.ts - a.ts)
          return (
            <div key={c.id} className="khata-row">
              <div className="khata-main" onClick={() => setOpen(open === c.id ? null : c.id)}>
                <div className="avatar">{c.name[0]}</div>
                <div className="grow"><div>{c.name}</div><small>{c.hi} · {entries.length} entry</small></div>
                <b className={c.balance > 0 ? 'warn' : 'ok'}>{c.balance > 0 ? rupee(c.balance) : 'Saaf'}</b>
                <span className="chev">{open === c.id ? '▴' : '▾'}</span>
              </div>
              {open === c.id && (
                <div className="khata-detail">
                  <div className="khata-actions">
                    <button className="btn sm" disabled={c.balance <= 0} onClick={() => settle(c.id)}>Poora chuka diya</button>
                    <a className={`btn sm ghost ${c.balance <= 0 ? 'disabled' : ''}`} href={c.balance > 0 ? remind(c) : undefined} target="_blank" rel="noreferrer">WhatsApp reminder</a>
                  </div>
                  <div className="contact-row">
                    <span>Khata code (customer ko batao): <b>{c.code ?? '—'}</b></span>
                    <input placeholder="Phone number (10 ank)" inputMode="numeric" value={c.phone ?? ''} onChange={(e) => mutate((d) => { d.customers.find((x) => x.id === c.id)!.phone = e.target.value.replace(/\D/g, '').slice(-10) })} />
                  </div>
                  {entries.map((e) => edit?.id === e.id ? (
                    <div key={e.id} className="ledger-line editing">
                      <input type="date" value={edit.date} onChange={(x) => setEdit({ ...edit, date: x.target.value })} />
                      <input placeholder="Note" value={edit.note} onChange={(x) => setEdit({ ...edit, note: x.target.value })} />
                      <input inputMode="decimal" placeholder="Rupaye" value={edit.amount} onChange={(x) => setEdit({ ...edit, amount: x.target.value.replace(/[^\d.]/g, '') })} />
                      <span className="le-btns"><button className="btn sm" onClick={() => saveEdit(e)}>Save</button><button className="btn sm ghost" onClick={() => setEdit(null)}>Raho</button></span>
                    </div>
                  ) : (
                    <div key={e.id} className="ledger-line">
                      <span>{new Date(e.ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {clock(e.ts)}</span>
                      <span>{e.note ?? (e.kind === 'payment' ? 'Paisa mila' : 'Udhaar')}</span>
                      <b className={e.amount < 0 ? 'ok' : 'warn'}>{e.amount < 0 ? '−' : '+'}{rupee(Math.abs(e.amount))}</b>
                      <span className="le-btns">
                        <button className="link-btn" onClick={() => setEdit({ id: e.id, customerId: c.id, amount: String(Math.abs(e.amount)), note: e.note ?? '', date: ymd(e.ts) })}>Edit</button>
                        <button className="link-btn danger" onClick={() => delEntry(e)}>Hatao</button>
                      </span>
                    </div>
                  ))}
                  {entries.length === 0 && <div className="muted">Abhi koi entry nahi.</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <form className="inline-form" onSubmit={addCustomer}>
        <input placeholder="Naya customer ka naam" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Phone (optional)" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button className="btn sm" type="submit">Khata kholo</button>
      </form>
    </>
  )
}
