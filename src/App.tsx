import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AdminShell, PublicShell } from './components/ui'
import Home from './pages/Home'
import Hisaab from './pages/public/Hisaab'
import Pay from './pages/public/Pay'
import Console from './pages/Console'
import Dashboard from './pages/Dashboard'
import Khata from './pages/Khata'
import Stock from './pages/Stock'
import Log from './pages/Log'
import OwnerRoot from './pages/owner/OwnerRoot'
import Payments from './pages/owner/Payments'
import Restock from './pages/owner/Restock'
import Settings from './pages/owner/Settings'
import Poster from './pages/owner/Poster'

// Owner area: /malik (PIN login, shared server data). /demo: same screens on browser-only sample data for reviewers.
const owner = (base: string, mode: 'local' | 'remote') => (
  <Route path={base} element={<OwnerRoot base={base} mode={mode} />}>
    <Route element={<AdminShell demo={mode === 'local'} />}>
      <Route index element={<Dashboard />} />
      <Route path="khata" element={<Khata />} />
      <Route path="payments" element={<Payments />} />
      <Route path="stock" element={<Stock />} />
      <Route path="restock" element={<Restock />} />
      <Route path="log" element={<Log />} />
      <Route path="settings" element={<Settings />} />
      <Route path="qr" element={<Poster />} />
    </Route>
    <Route path="voice" element={<Console />} />
  </Route>
)

const OWNER_SITE = import.meta.env.VITE_APP === 'owner'

export default function App() {
  if (OWNER_SITE) {
    return (
      <BrowserRouter>
        <Routes>
            <Route path="*" element={<Navigate to="/malik" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicShell />}>
          <Route index element={<Home />} />
          <Route path="hisaab" element={<Hisaab />} />
          <Route path="pay" element={<Pay />} />
        </Route>
        {owner('/demo', 'local')}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
