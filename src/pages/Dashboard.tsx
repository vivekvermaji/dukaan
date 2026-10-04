import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { rupee, salesIn } from '../lib/engine'
import { BarChart, Stat } from '../components/ui'
import { ago, clock } from '../lib/hooks'

export default function Dashboard() {
  const s = useStore()
  const today = salesIn(s, 'today')
  const week = salesIn(s, 'week')
  const owed = s.customers.reduce((a, c) => a + Math.max(0, c.balance), 0)
  const low = s.items.filter((i) => i.qty <= i.reorder)

  const days = Array.from({ length: 7 }, (_, k) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - k))
    const t0 = d.getTime()
    return { label: k === 6 ? 'Aaj' : d.toLocaleDateString('en-IN', { weekday: 'short' }), value: s.sales.filter((x) => x.ts >= t0 && x.ts < t0 + 86400000).reduce((a, x) => a + x.total, 0) }
  })

  const counts: Record<string, number> = {}
  week.sales.forEach((x) => x.lines.forEach((l) => (counts[l.itemId] = (counts[l.itemId] ?? 0) + l.qty)))
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topMax = top[0]?.[1] ?? 1

  type Feed = { id: string; ts: number; title: string; sub: string; amt?: string; kind: string }
  const feed: Feed[] = [
    ...s.sales.slice(-12).map((x) => ({
      id: x.id, ts: x.ts, kind: x.credit ? 'udhaar' : 'sale',
      title: x.lines.map((l) => `${l.qty} ${s.items.find((i) => i.id === l.itemId)?.name.split(' (')[0]}`).join(', '),
      sub: x.credit ? `Udhaar · ${s.customers.find((c) => c.id === x.customerId)?.name}` : 'Sale', amt: rupee(x.total),
    })),
    ...s.ledger.filter((e) => !e.id.startsWith('open-')).slice(-8).map((e) => ({
      id: e.id, ts: e.ts, kind: e.kind, title: `${s.customers.find((c) => c.id === e.customerId)?.name}`,
      sub: e.kind === 'payment' ? 'Paisa mila' : 'Udhaar likha', amt: rupee(Math.abs(e.amount)),
    })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 9)

  return (
    <>
      <div className="page-head">
        <div><h1>Dashboard</h1><p>Sample dukaan · voice se jo bhi likhoge, yaha turant dikhega</p></div>
        <Link to="/app" className="btn">🎙 Voice se kuch likho</Link>
      </div>
      <div className="stats">
        <Stat label="Aaj ki sale" value={today.total} hint={`${today.sales.length} bill`} />
        <Stat label="Is hafte" value={week.total} hint={`${week.sales.length} bill`} />
        <Stat label="Kul udhaar baaki" value={owed} tone="warn" hint={`${s.customers.filter((c) => c.balance > 0).length} logon ka`} />
        <Stat label="Kam stock" value={low.length} money={false} tone={low.length ? 'warn' : 'ok'} hint="cheezein" />
      </div>
      <div className="grid2">
        <div className="card">
          <div className="card-title">Pichle 7 din ki sale</div>
          <BarChart data={days} />
        </div>
        <div className="card">
          <div className="card-title">Is hafte sabse zyada bika</div>
          {top.map(([id, n]) => {
            const it = s.items.find((i) => i.id === id)!
            return <div className="hbar" key={id}><span>{it.name.split(' (')[0]}</span><div><i style={{ width: `${(n / topMax) * 100}%` }} /></div><b>{n}</b></div>
          })}
        </div>
      </div>
      <div className="grid2">
        <div className="card">
          <div className="card-title">Live activity</div>
          <div className="feed">
            {feed.map((f) => (
              <div className={`feed-row ${f.kind}`} key={f.id}>
                <span className="feed-ic">{f.kind === 'payment' ? '↓' : f.kind === 'udhaar' ? '₹' : '＋'}</span>
                <div><div>{f.title}</div><small>{f.sub} · {clock(f.ts)} · {ago(f.ts)}</small></div>
                <b>{f.amt}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Dhyan do <Link to="/admin/stock">Stock dekho →</Link></div>
          {low.length === 0 && <div className="muted">Sab kuch theek stock me hai.</div>}
          {low.map((i) => (
            <div className="alert-row" key={i.id}><span>{i.name}</span><b className={i.qty === 0 ? 'bad' : 'warn'}>{i.qty} bacha</b></div>
          ))}
          <div className="card-title" style={{ marginTop: 22 }}>Sabse zyada udhaar <Link to="/admin/khata">Khata →</Link></div>
          {[...s.customers].sort((a, b) => b.balance - a.balance).slice(0, 3).map((c) => (
            <div className="alert-row" key={c.id}><span>{c.name}</span><b className="warn">{rupee(c.balance)}</b></div>
          ))}
        </div>
      </div>
    </>
  )
}
