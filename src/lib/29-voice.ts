import { useCallback, useEffect, useRef, useState } from 'react'

const SR: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null
export const voiceSupported = !!SR
export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

let ttsOn = true
export const setTTS = (v: boolean) => { ttsOn = v; if (!v && ttsSupported) speechSynthesis.cancel() }
export const getTTS = () => ttsOn

export function speak(text: string) {
  if (!ttsSupported || !ttsOn) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'hi-IN'
  const v = speechSynthesis.getVoices().find((x) => x.lang.toLowerCase().startsWith('hi'))
  if (v) u.voice = v
  u.rate = 1.02
  speechSynthesis.speak(u)
}

export function useVoice(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const rec = useRef<any>(null)
  const cb = useRef(onFinal); cb.current = onFinal

  useEffect(() => () => rec.current?.abort?.(), [])

  const start = useCallback(() => {
    if (!SR) { setError('Is browser me voice nahi chalta. Chrome ya Edge use karo, ya neeche type karo.'); return }
    if (ttsSupported) speechSynthesis.cancel()
    const r = new SR()
    r.lang = 'hi-IN'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1
    r.onstart = () => { setListening(true); setError(''); setInterim('') }
    r.onresult = (e: any) => {
      let t = ''
      for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript
      setInterim(t)
      if (e.results[e.results.length - 1].isFinal) { setInterim(''); cb.current(t) }
    }
    r.onerror = (e: any) => {
      setError(e.error === 'not-allowed' ? 'Mic ki permission do (address bar me mic icon).' : e.error === 'no-speech' ? 'Kuch sunai nahi diya, phir se bolo.' : 'Voice error: ' + e.error)
    }
    r.onend = () => { setListening(false) }
    rec.current = r
    try { r.start() } catch { /* already started */ }
  }, [])
  const stop = useCallback(() => rec.current?.stop?.(), [])
  return { listening, interim, error, start, stop }
}
