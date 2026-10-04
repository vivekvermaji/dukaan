import { NavLink, Link, Outlet } from 'react-router-dom'
import { useCountUp } from '../lib/hooks'
import { rupee } from '../lib/engine'
import { useBase } from '../lib/base'
import { usePendingCount } from '../lib/pending'

export function Logo({ to = '/' }: { to?: string }) {
  return <Link to={to} className="logo"><span className="logo-mark">द</span><span>Dukaan</span></Link>
}

export function PublicShell() {
  return (
    <div className="shell">
      <div className="glow g1" /><div className="glow g2" />
      <header className="topnav">
        <Logo />
        <nav>
          <NavLink to="/hisaab">Mera hisaab</NavLink>
          <NavLink to="/pay">Payment</NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}

export function AdminShell({ demo }: { demo?: boolean }) {
  const base = useBase()
  const pending = usePendingCount(!demo)
  const links: [string, string, string, number?][] = [
    [base, 'Dashboard', '◧'], [base + '/khata', 'Udhaar khata', '₹'], [base + '/payments', 'Payments', '✓', pending],
    [base + '/saathi', 'Saathi (chat)', '✦'], [base + '/stock', 'Stock', '▦'], [base + '/restock', 'Lana hai', '+'], [base + '/log', 'Voice log', '◉'], [base + '/qr', 'Print QR', '▣'], [base + '/settings', 'Settings', '⚙'],
  ]
  return (
    <div className="admin">
      <div className="glow g1" />
      <aside className="side">
        <Logo to={base} />
        {demo && <div className="demo-tag">Demo sandbox · data sirf is browser me</div>}
        <nav>
          {links.map(([to, label, ic, n]) => (
            <NavLink key={to} to={to} end={to === base}><i>{ic}</i>{label}{n ? <em className="badge">{n}</em> : null}</NavLink>
          ))}
        </nav>
        <Link to={base + '/voice'} className="side-cta"><span className="dot live" />Voice agent kholo</Link>
      </aside>
      <main className="admin-main"><Outlet /></main>
    </div>
  )
}

export function Stat({ label, value, money = true, hint, tone }: { label: string; value: number; money?: boolean; hint?: string; tone?: 'warn' | 'ok' }) {
  const v = useCountUp(value)
  return (
    <div className={`stat ${tone ?? ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{money ? rupee(v) : v}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div key={d.label} className="bar-col">
          <div className="bar-val">{d.value ? rupee(d.value) : ''}</div>
          <div className="bar-track"><div className={`bar ${i === data.length - 1 ? 'today' : ''}`} style={{ height: `${(d.value / max) * 100}%` }} /></div>
          <div className="bar-lab">{d.label}</div>
        </div>
      ))}
    </div>
  )
}

export function Wave({ active }: { active: boolean }) {
  return <div className={`wave ${active ? 'on' : ''}`}>{Array.from({ length: 28 }, (_, i) => <span key={i} style={{ animationDelay: `${(i % 7) * 0.09}s`, ['--h' as any]: `${30 + ((i * 37) % 70)}%` }} />)}</div>
}
