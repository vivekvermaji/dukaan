import { useEffect, useState } from 'react'
import { api } from './api'

/** Number of customer payments waiting for the owner to confirm (polls while the owner area is open). */
export function usePendingCount(enabled: boolean) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!enabled) return
    let live = true
    const tick = () => api.payments().then((r) => live && setN(r.payments.filter((p) => p.status === 'pending').length)).catch(() => {})
    tick()
    const t = setInterval(tick, 10000)
    return () => { live = false; clearInterval(t) }
  }, [enabled])
  return n
}
