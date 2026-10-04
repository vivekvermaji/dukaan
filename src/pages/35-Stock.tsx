import { useState } from 'react'
import { useStore, mutate, uid } from '../lib/store'
import { rupee } from '../lib/engine'

export default function Stock() {
  const s = useStore()
  const [f, setF] = useState({ name: '', price: '', qty: '', reorder: '' })
  const set = (id: string, patch: Partial<{ qty: number; price: number; reorder: number }>) =>
    mutate((d) => { Object.assign(d.items.find((i) => i.id === id)!, patch) })
  const low = s.items.filter((i) => i.qty <= i.reorder).length
  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const n = f.name.trim(); if (!n || !Number(f.price)) return
    const a = n.toLowerCase().split(/\s+/)
    mutate((d) => { d.items.push({ id: 'i-' + uid(), name: n, hi: n, aliases: a, price: Number(f.price), qty: Number(f.qty) || 0, reorder: Number(f.reorder) || 5, unit: 'piece' }) })
    setF({ name: '', price: '', qty: '', reorder: '' })
  }
  return (
    <>
      <div className="page-head">
        <div><h1>Stock</h1><p>{s.items.length} cheezein · {low ? <b className="warn">{low} kam hain</b> : 'sab theek'}</p></div>
      </div>
      <div className="card tbl">
        <div className="tr th"><span>Item</span><span>Daam</span><span>Bacha</span><span>Kam level</span><span /></div>
        {s.items.map((i) => (
          <div className="tr" key={i.id}>
            <span>{i.name}<small>{i.hi}</small></span>
            <span><input className="num" type="number" min={0} value={i.price} onChange={(e) => set(i.id, { price: Number(e.target.value) })} /></span>
            <span className="qty">
              <button onClick={() => set(i.id, { qty: Math.max(0, i.qty - 1) })}>−</button>
              <b className={i.qty === 0 ? 'bad' : i.qty <= i.reorder ? 'warn' : ''}>{i.qty}</b>
              <button onClick={() => set(i.id, { qty: i.qty + 1 })}>+</button>
            </span>
            <span><input className="num" type="number" min={0} value={i.reorder} onChange={(e) => set(i.id, { reorder: Number(e.target.value) })} /></span>
            <span className="muted">{rupee(i.price * i.qty)}</span>
          </div>
        ))}
      </div>
      <form className="inline-form" onSubmit={add}>
        <input placeholder="Naya item" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="num" type="number" placeholder="Daam" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <input className="num" type="number" placeholder="Qty" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
        <input className="num" type="number" placeholder="Kam level" value={f.reorder} onChange={(e) => setF({ ...f, reorder: e.target.value })} />
        <button className="btn sm" type="submit">Item jodo</button>
      </form>
    </>
  )
}
