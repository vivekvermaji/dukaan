import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AdminShell, PublicShell } from './components/ui'
import Home from './pages/Home'
import Console from './pages/Console'
import Dashboard from './pages/Dashboard'
import Khata from './pages/Khata'
import Stock from './pages/Stock'
import Log from './pages/Log'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicShell />}><Route index element={<Home />} /></Route>
        <Route path="/app" element={<Console />} />
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<Dashboard />} />
          <Route path="khata" element={<Khata />} />
          <Route path="stock" element={<Stock />} />
          <Route path="log" element={<Log />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
