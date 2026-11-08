import { useEffect, useRef, useState } from 'react'
import { isBarcode, type BarcodeProduct } from '../../domain/barcode'
import { LINK, SECONDARY_BUTTON } from '../../lib/ui'
import { lookupBarcode } from './api'

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> }

/** Lädt die Erkennung erst beim Scannen. Die WASM-Datei liegt in der App, nichts kommt von fremden Servern. */
async function createDetector(): Promise<Detector> {
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) } })
  return new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
}

/** Kamera auf den Barcode halten oder die Nummer eintippen. Liefert das Produkt aus Open Food Facts. */
export function BarcodeScanner({ onFound, onCancel }: { onFound: (product: BarcodeProduct, code: string) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState('Kamera wird gestartet …')
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const found = useRef(false)
  // Die Kamera-Schleife startet nur einmal und ruft immer die aktuelle Suche auf.
  const searchRef = useRef<(value: string) => Promise<void>>(async () => {})

  async function search(value: string) {
    if (!isBarcode(value)) { setError('Bitte eine Barcode-Nummer mit 8 bis 14 Ziffern eingeben.'); return }
    setBusy(true)
    setError('')
    setStatus(`Suche ${value} …`)
    try {
      const product = await lookupBarcode(value.trim())
      if (product) onFound(product, value.trim())
      else { setError(`Zu ${value} gibt es noch keine Daten. Trag das Produkt selbst ein.`); found.current = false }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Suche hat nicht geklappt.')
      found.current = false
    } finally { setBusy(false); setStatus('') }
  }

  useEffect(() => { searchRef.current = search })

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setInterval> | undefined
    let cancelled = false
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (cancelled || !video.current) return
        video.current.srcObject = stream
        await video.current.play()
        const detector = await createDetector()
        if (cancelled) return
        setStatus('Halte den Barcode in den Rahmen.')
        timer = setInterval(() => {
          const element = video.current
          if (!element || found.current || element.readyState < 2) return
          detector.detect(element).then((codes) => {
            const value = codes.find((entry) => isBarcode(entry.rawValue))?.rawValue
            if (!value || found.current) return
            found.current = true
            setCode(value)
            void searchRef.current(value)
          }).catch(() => { /* Einzelne Bilder ohne Treffer sind normal. */ })
        }, 300)
      } catch {
        if (!cancelled) setStatus('Kamera nicht verfügbar. Tipp die Nummer unter dem Barcode ein.')
      }
    }
    void start()
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  return <div className="mt-3 space-y-3">
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video ref={video} className="aspect-[4/3] w-full object-cover" muted playsInline aria-label="Kamerabild für den Barcode" />
      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-20 -translate-y-1/2 rounded-lg border-2 border-neon/80" aria-hidden="true" />
    </div>
    {status && <p role="status" className="text-sm text-muted">{status}</p>}
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void search(code) }}>
      <input className="h-11 min-w-0 flex-1 rounded-xl border border-line/15 bg-control px-3 text-base text-foreground outline-none focus:border-neon"
        inputMode="numeric" enterKeyHint="search" placeholder="Nummer eintippen" aria-label="Barcode-Nummer" maxLength={14}
        value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} />
      <button className={SECONDARY_BUTTON} type="submit" disabled={busy || !code}>Suchen</button>
    </form>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button className={LINK} type="button" onClick={onCancel}>Abbrechen</button>
  </div>
}

