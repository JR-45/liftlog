import { useEffect, useRef, useState } from 'react'
import type { FoodScan } from '../../domain/foodScan'
import type { Meal, NutritionTargets } from '../../domain/nutrition'
import { CameraIcon, TrashIcon } from '../../lib/icons'
import { analyzeFood, setPhotoConsent } from './api'
import { prepareFoodPhoto } from './image'
import { BarcodeScanner } from './BarcodeScanner'
import { MealReview, type ReviewFood, type ReviewSource } from './MealReview'
import { PRIMARY_BUTTON as primaryClass, SECONDARY_BUTTON as secondaryClass } from '../../lib/ui'

export function FoodScanner({ consent, date, targets, onConsent, onSaved }: {
  consent: boolean; date: string; targets: NutritionTargets; onConsent: (value: boolean) => void; onSaved: (meal: Meal) => void
}) {
  const [photo, setPhoto] = useState<string | null>(null)
  const [scan, setScan] = useState<FoodScan | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  // Barcode-Scanner offen oder ein Eintrag aus Barcode bzw. von Hand, der gerade geprüft wird.
  const [scanning, setScanning] = useState(false)
  const [entry, setEntry] = useState<{ source: ReviewSource; foods: ReviewFood[]; title: string } | null>(null)
  const upload = useRef<HTMLInputElement>(null)
  const controller = useRef<AbortController | null>(null)
  const lock = useRef(false)
  const generation = useRef(0)
  useEffect(() => () => { controller.current?.abort(); generation.current++ }, [])

  async function choose(file?: File) {
    if (!file || lock.current) return
    lock.current = true
    const current = ++generation.current
    setError('')
    setScan(null)
    setPhoto(null)
    setBusy('Foto wird vorbereitet …')
    try {
      const image = await prepareFoodPhoto(file)
      if (generation.current === current) setPhoto(image)
    } catch (cause) {
      if (generation.current === current) setError(cause instanceof Error ? cause.message : 'Foto konnte nicht geöffnet werden.')
    } finally { lock.current = false; if (generation.current === current) setBusy(null) }
  }

  async function analyze() {
    if (!photo || lock.current || (!consent && !agreed)) return
    lock.current = true
    const current = ++generation.current
    const abort = new AbortController()
    controller.current = abort
    setError('')
    setBusy('Gemini analysiert dein Foto …')
    try {
      if (!consent) { await setPhotoConsent(true); onConsent(true) }
      const result = await analyzeFood(photo, abort.signal)
      if (generation.current !== current) return
      setScan(result)
      if (result.foods.length === 0) setError(result.note || 'Keine Lebensmittel erkannt. Bitte ein anderes Foto versuchen.')
    } catch (cause) {
      if (generation.current === current && !abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'Die Analyse ist fehlgeschlagen.')
    } finally { lock.current = false; if (generation.current === current) setBusy(null) }
  }

  async function revoke() {
    if (lock.current) return
    lock.current = true
    setBusy('Einwilligung wird widerrufen …')
    setError('')
    try {
      await setPhotoConsent(false)
      onConsent(false)
      setAgreed(false)
      setPhoto(null)
      setScan(null)
    } catch { setError('Einwilligung konnte nicht widerrufen werden. Bitte erneut versuchen.') }
    finally { lock.current = false; setBusy(null) }
  }

  return <section className="rounded-2xl border border-line/[0.08] bg-surface p-4" aria-labelledby="food-scanner-heading">
    <h2 id="food-scanner-heading" className="text-xl">Essen eintragen</h2>
    {!scan?.foods.length && !entry && !scanning && <>
      {/* Drei Wege: Foto (Kamera oder Galerie fragt das Handy selbst), Barcode, von Hand. */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" disabled={busy !== null} className={`${primaryClass} inline-flex items-center justify-center gap-1.5 px-2`} onClick={() => upload.current?.click()}><CameraIcon className="h-5 w-5" /> Foto</button>
        <button type="button" disabled={busy !== null} className={`${secondaryClass} px-2`} onClick={() => { setError(''); setPhoto(null); setScanning(true) }}>Barcode</button>
        <button type="button" disabled={busy !== null} className={`${secondaryClass} px-2`} onClick={() => {
          setError('')
          setPhoto(null)
          setEntry({ source: 'manual', title: 'Meine Mahlzeit', foods: [{ name: '', grams: null, per100g: { kcal: null, protein: null, carbs: null, fat: null, fiber: null, sugar: null }, question: null, uncertain: false }] })
        }}>Manuell</button>
      </div>
      <input ref={upload} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Essensfoto auswählen" onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = '' }} />
      {photo && <>
        <img src={`data:image/jpeg;base64,${photo}`} className="mt-4 max-h-64 w-full rounded-xl bg-surface-inset object-contain" alt="Vorschau deiner Mahlzeit vor der Übertragung" />
        <button type="button" disabled={busy !== null} className={`${secondaryClass} mt-2 inline-flex items-center justify-center gap-2`} onClick={() => {
          if (lock.current) return
          setPhoto(null)
          setScan(null)
          setError('')
        }}><TrashIcon className="h-5 w-5" />Foto entfernen</button>
        <div className="mt-3 text-xs text-muted">
          <p>Das Foto geht zur Analyse an Google Gemini und wird nicht gespeichert. Die Werte sind Schätzungen.</p>
          {!consent && <label className="mt-2 flex min-h-11 items-start gap-3 text-sm text-foreground"><input className="mt-0.5 h-5 w-5 shrink-0 accent-neon" type="checkbox" checked={agreed} disabled={busy !== null} onChange={(event) => setAgreed(event.target.checked)} />Ich stimme der Übertragung meiner Essensfotos an Google zur Analyse zu. Ich kann diese Einwilligung hier widerrufen.</label>}
        </div>
        <button type="button" className={`${primaryClass} mt-4 w-full sm:w-auto`} disabled={busy !== null || (!consent && !agreed)} onClick={() => { void analyze() }}>Mit Gemini analysieren</button>
      </>}
      {consent && <button className="mt-1 min-h-11 text-left text-xs text-muted disabled:opacity-50" type="button" disabled={busy !== null} onClick={() => { void revoke() }}>Foto-Einwilligung widerrufen</button>}
    </>}
    {scanning && <BarcodeScanner onCancel={() => setScanning(false)} onFound={(product) => {
      setScanning(false)
      setEntry({ source: 'barcode', title: product.name, foods: [{ name: product.name, grams: product.grams, per100g: product.per100g, question: null, uncertain: false }] })
    }} />}
    {busy && <p role="status" className="mt-4 text-sm text-muted">{busy}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    {entry && <MealReview key={entry.source + entry.title} foods={entry.foods} source={entry.source} defaultTitle={entry.title} date={date} targets={targets}
      onCancel={() => setEntry(null)} onSaved={(meal) => { setEntry(null); onSaved(meal) }} />}
    {!entry && scan && scan.foods.length > 0 && <MealReview foods={scan.foods.map((food) => ({ ...food, uncertain: food.portion_uncertain }))} note={scan.note} source="photo"
      defaultTitle="Meine Mahlzeit" date={date} targets={targets}
      onCancel={() => { setScan(null); setPhoto(null) }} onSaved={(meal) => { setScan(null); setPhoto(null); onSaved(meal) }} />}
  </section>
}
