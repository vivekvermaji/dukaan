import { NavLink, Link, Outlet } from 'react-router-dom'
import { useCountUp } from '../lib/hooks'
import { rupee } from '../lib/engine'

export function Logo() {
  return <Link to="/" className="logo"><span className="logo-mark">द</span><span>Dukaan</span></Link>
}

export function PublicShell() {
  return (
    <div className="shell">
      <div className="glow g1" /><div className="glow g2" />
      <header className="topnav">
        <Logo />
        <nav>
          <NavLink to="/app">Voice agent</NavLink>
          <NavLink to="/admin">Admin panel</NavLink>
          <a href="https://github.com/vivekvermaji/dukaan" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}

export function AdminShell() {
  const links: [string, string, string][] = [['/admin', 'Dashboard', '◧'], ['/admin/khata', 'Udhaar khata', '₹'], ['/admin/stock', 'Stock', '▦'], ['/admin/log', 'Voice log', '◉']]
  return (
    <div className="admin">
      <div className="glow g1" />
      <aside className="side">
        <Logo />
        <nav>
          {links.map(([to, label, ic]) => (
            <NavLink key={to} to={to} end={to === '/admin'}><i>{ic}</i>{label}</NavLink>
          ))}
        </nav>
        <Link to="/app" className="side-cta"><span className="dot live" />Voice agent kholo</Link>
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
