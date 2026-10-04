import { useState } from 'react'
import { mutate, uid, useStore } from '../../lib/store'

export default function Restock() {
  const s = useStore()
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const low = s.items.filter((i) => i.qty <= i.reorder).sort((a, b) => a.qty / a.reorder - b.qty / b.reorder)
  const list = s.shopping ?? []
  const has = (n: string) => list.some((x) => x.name.toLowerCase() === n.toLowerCase() && !x.done)
  const add = (n: string, q: string) => {
    const t = n.trim(); if (!t) return
    mutate((d) => { d.shopping = [...(d.shopping ?? []), { id: uid(), name: t, qty: q.trim(), done: false }] })
  }
  return (
    <>
      <div className="page-head"><div><h1>Naya stock lana hai</h1><p>Jo lana hai yaha likhte jao. Kam stock wali cheezein neeche apne aap dikhti hain.</p></div></div>
      <div className="card">
        <div className="card-title">Meri list ({list.filter((x) => !x.done).length} baaki)</div>
        {list.length === 0 && <div className="muted">List khaali hai.</div>}
        {list.map((x) => (
          <div key={x.id} className="shop-row">
            <label className="grow"><input type="checkbox" checked={x.done} onChange={() => mutate((d) => { const r = d.shopping!.find((y) => y.id === x.id)!; r.done = !r.done })} /> <span className={x.done ? 'strike' : ''}>{x.name}</span>{x.qty && <small> · {x.qty}</small>}</label>
            <button className="btn sm ghost" onClick={() => mutate((d) => { d.shopping = d.shopping!.filter((y) => y.id !== x.id) })}>Hatao</button>
          </div>
        ))}
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); add(name, qty); setName(''); setQty('') }}>
          <input placeholder="Kya lana hai" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Kitna (jaise 2 carton)" value={qty} onChange={(e) => setQty(e.target.value)} />
          <button className="btn sm" type="submit">Jodo</button>
        </form>
        {list.some((x) => x.done) && <button className="btn sm ghost" style={{ marginTop: 12 }} onClick={() => mutate((d) => { d.shopping = d.shopping!.filter((y) => !y.done) })}>Ho chuke hataao</button>}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Kam stock (apne aap)</div>
        {low.length === 0 && <div className="muted">Sab stock theek hai.</div>}
        {low.map((i) => (
          <div key={i.id} className="shop-row">
            <div className="grow">{i.name} <small>· bacha {i.qty} {i.unit}, level {i.reorder}</small></div>
            <button className="btn sm" disabled={has(i.name)} onClick={() => add(i.name, `${Math.max(1, i.reorder * 2 - i.qty)} ${i.unit}`)}>{has(i.name) ? 'List me hai' : 'List me daalo'}</button>
          </div>
        ))}
      </div>
    </>
  )
}
