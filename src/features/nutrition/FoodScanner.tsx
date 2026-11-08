import { useEffect, useRef, useState } from 'react'
import type { FoodScan } from '../../domain/foodScan'
import type { Meal, NutritionTargets } from '../../domain/nutrition'
import { CameraIcon } from '../../lib/icons'
import { analyzeFood, setPhotoConsent } from './api'
import { prepareFoodPhoto } from './image'
import { MealReview } from './MealReview'
import { primaryClass, secondaryClass } from './NutritionValues'

export function FoodScanner({ consent, date, targets, onConsent, onSaved }: {
  consent: boolean; date: string; targets: NutritionTargets; onConsent: (value: boolean) => void; onSaved: (meal: Meal) => void
}) {
  const [photo, setPhoto] = useState<string | null>(null)
  const [scan, setScan] = useState<FoodScan | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const camera = useRef<HTMLInputElement>(null)
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

  return <section className="rounded-2xl border border-line/10 bg-surface p-4 sm:p-5" aria-labelledby="food-scanner-heading">
    <div className="flex items-center gap-3">
      <span className="rounded-xl bg-neon/10 p-3 text-accent-ink"><CameraIcon className="h-6 w-6" /></span>
      <div><h2 id="food-scanner-heading" className="text-3xl">Was isst du heute?</h2><p className="text-sm text-muted">Foto aufnehmen · prüfen · festhalten</p></div>
    </div>
    {!scan?.foods.length && <>
      <p className="mt-4 text-sm text-muted">Gemini schätzt Lebensmittel und Nährwerte. Portionsgrößen, Öl und Zutaten lassen sich aus einem Foto nicht sicher bestimmen.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy !== null} className={primaryClass} onClick={() => camera.current?.click()}>Foto aufnehmen</button>
        <button type="button" disabled={busy !== null} className={secondaryClass} onClick={() => upload.current?.click()}>Foto auswählen</button>
      </div>
      <input ref={camera} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Essen fotografieren" onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = '' }} />
      <input ref={upload} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Essensfoto auswählen" onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = '' }} />
      <p className="mt-2 text-xs text-muted">JPEG, PNG oder WebP bis 15 MB. Fotos werden vor der Übertragung verkleinert.</p>
      {photo && <img src={`data:image/jpeg;base64,${photo}`} className="mt-4 max-h-64 w-full rounded-xl bg-surface-inset object-contain" alt="Vorschau deiner Mahlzeit vor der Übertragung" />}
      <div className="mt-4 rounded-xl border border-line/15 p-3 text-sm">
        <p>Zur Analyse wird dein Foto an Google (Gemini) übertragen. LiftLog speichert das Foto nicht dauerhaft. Bei Google gelten die Bedingungen des eingesetzten Gemini-Dienstes. Fotografiere nur das Essen, ohne Personen oder persönliche Angaben.</p>
        <p className="mt-2 text-xs text-muted">Die Analyse zeigt geschätzte Kalorien und Makronährwerte. Eine genaue Vitamin- oder Mineralstoffabdeckung lässt sich daraus nicht ableiten.</p>
        {!consent ? <label className="mt-3 flex min-h-11 items-start gap-3"><input className="mt-0.5 h-5 w-5 shrink-0 accent-neon" type="checkbox" checked={agreed} disabled={busy !== null} onChange={(event) => setAgreed(event.target.checked)} />Ich stimme der Übertragung meiner Essensfotos an Google zur Analyse zu. Ich kann diese Einwilligung hier widerrufen.</label>
          : <button className="mt-2 min-h-11 text-left text-sm text-accent-ink disabled:opacity-50" type="button" disabled={busy !== null} onClick={() => { void revoke() }}>Foto-Einwilligung widerrufen</button>}
      </div>
      {photo && <button type="button" className={`${primaryClass} mt-4 w-full sm:w-auto`} disabled={busy !== null || (!consent && !agreed)} onClick={() => { void analyze() }}>Mit Gemini analysieren</button>}
    </>}
    {busy && <p role="status" className="mt-4 text-sm text-muted">{busy}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    {scan && scan.foods.length > 0 && <MealReview scan={scan} date={date} targets={targets} onCancel={() => { setScan(null); setPhoto(null) }} onSaved={(meal) => { setScan(null); setPhoto(null); onSaved(meal) }} />}
  </section>
}
