import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, ms = 700) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const a = from.current, b = target
    if (a === b) return
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      const e = 1 - Math.pow(1 - p, 3)
      setV(Math.round(a + (b - a) * e))
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

export const ago = (ts: number) => {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000))
  if (s < 60) return 'abhi abhi'
  if (s < 3600) return `${Math.floor(s / 60)} min pehle`
  if (s < 86400) return `${Math.floor(s / 3600)} ghante pehle`
  return `${Math.floor(s / 86400)} din pehle`
}
export const clock = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
