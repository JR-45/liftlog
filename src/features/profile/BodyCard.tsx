import { type FormEvent, useMemo, useState } from 'react'
import { ACTIVITY_LABELS, type ActivityLevel, ageFromBirthYear, analyzeBody, type Sex } from '../../domain/body'
import { PlusIcon, TrashIcon } from '../../lib/icons'
import { enableProfileTargets } from '../nutrition/api'
import {
  deleteMeasurement,
  type BodyMeasurement,
  type MeasurementValues,
  saveMeasurement,
  saveProfile,
  type UserProfile,
} from './api'

const fieldClass =
  'h-11 w-full rounded-xl border border-transparent bg-control px-3.5 text-base text-foreground placeholder-muted/60 outline-none transition-colors focus:border-neon focus:bg-control-hover disabled:opacity-50'
const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-muted'
const SHORT_DATE = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })

type Field = keyof MeasurementValues

/** Eingetragen werden nur Gewicht und Körperfett. Erlaubter Bereich wie in der Datenbank. */
const FIELDS: { key: 'weightKg' | 'bodyFatPct'; label: string; unit: string; min: number; max: number }[] = [
  { key: 'weightKg', label: 'Gewicht', unit: 'kg', min: 20, max: 350 },
  { key: 'bodyFatPct', label: 'Körperfett', unit: '%', min: 2, max: 70 },
]
/** Umfänge gibt es in der Datenbank noch, alte Werte bleiben beim Speichern erhalten. */
const CIRCUMFERENCE_KEYS: Field[] = ['neckCm', 'chestCm', 'waistCm', 'hipsCm', 'armCm', 'thighCm', 'calfCm']

function formatNumber(value: number, digits = 1): string {
  return String(Math.round(value * 10 ** digits) / 10 ** digits).replace('.', ',')
}

function toText(value: number | null): string {
  return value === null ? '' : String(value).replace('.', ',')
}

/** Liest eine Eingabe. Leer ergibt null, ungültig oder außerhalb des Bereichs ergibt undefined. */
function parseField(text: string, min: number, max: number): number | null | undefined {
  if (text.trim() === '') return null
  const value = Number(text.trim().replace(',', '.'))
  if (!Number.isFinite(value) || value < min || value > max) return undefined
  return Math.round(value * 10) / 10
}

/** Neuester eingetragener Wert je Feld, auch wenn er aus einer älteren Messung stammt. */
function latestValues(measurements: BodyMeasurement[]): Record<'weightKg' | 'bodyFatPct', number | null> {
  const result: Record<'weightKg' | 'bodyFatPct', number | null> = { weightKg: null, bodyFatPct: null }
  for (const entry of measurements) {
    for (const { key } of FIELDS) {
      if (entry[key] !== null) result[key] = entry[key]
    }
  }
  return result
}

function summary(entry: BodyMeasurement): string {
  return [
    entry.weightKg !== null && `${formatNumber(entry.weightKg)} kg`,
    entry.bodyFatPct !== null && `${formatNumber(entry.bodyFatPct)} % KFA`,
  ].filter(Boolean).join(' · ')
}

function Tile(props: { label: string; value: string; note?: string; noteClass?: string }) {
  return (
    <div className="rounded-xl bg-surface-inset p-2.5 ring-1 ring-line/[0.05]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{props.label}</p>
      <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">{props.value}</p>
      {props.note && <p className={`text-xs ${props.noteClass ?? 'text-muted'}`}>{props.note}</p>}
    </div>
  )
}

type Props = {
  profile: UserProfile
  today: string
  onProfileChange: (profile: UserProfile) => void
}

export function BodyCard({ profile, today, onProfileChange }: Props) {
  const todayEntry = profile.measurements.find((entry) => entry.date === today)
  const [inputs, setInputs] = useState(() => ({
    weightKg: toText(todayEntry?.weightKg ?? null), bodyFatPct: toText(todayEntry?.bodyFatPct ?? null),
  }))
  // Zugeklappt, direkt unter den Werten.
  const [showDetails, setShowDetails] = useState(false)
  const [height, setHeight] = useState(toText(profile.heightCm))
  const [target, setTarget] = useState(toText(profile.targetWeightKg))
  const [sex, setSex] = useState<Sex | ''>(profile.sex ?? '')
  const [birthYear, setBirthYear] = useState(profile.birthYear === null ? '' : String(profile.birthYear))
  const [activity, setActivity] = useState<ActivityLevel | ''>(profile.activityLevel ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const latest = useMemo(() => latestValues(profile.measurements), [profile.measurements])
  const analysis = analyzeBody({
    weightKg: latest.weightKg,
    heightCm: profile.heightCm,
    sex: profile.sex,
    age: ageFromBirthYear(profile.birthYear, today),
    activity: profile.activityLevel,
    goal: profile.goal,
    targetWeightKg: profile.targetWeightKg,
    bodyFatPct: latest.bodyFatPct,
    neckCm: null,
    waistCm: null,
    hipsCm: null,
  })


  function flash(message: string) {
    setFeedback(message)
    setTimeout(() => setFeedback((current) => (current === message ? null : current)), 2500)
  }

  function stepWeight(direction: 1 | -1) {
    const current = parseField(inputs.weightKg, 20, 350) ?? latest.weightKg ?? 75
    const next = Math.max(20, Math.min(350, Math.round((current + direction * 0.5) * 10) / 10))
    setInputs({ ...inputs, weightKg: toText(next) })
  }

  async function handleSaveMeasurement(event: FormEvent) {
    event.preventDefault()
    const values = Object.fromEntries(CIRCUMFERENCE_KEYS.map((key) => [key, todayEntry?.[key] ?? null])) as MeasurementValues
    for (const { key, label, min, max, unit } of FIELDS) {
      const parsed = parseField(inputs[key], min, max)
      if (parsed === undefined) {
        setError(`${label} prüfen: zwischen ${min} und ${max} ${unit}.`)
        return
      }
      values[key] = parsed
    }
    if (FIELDS.every(({ key }) => values[key] === null)) {
      setError('Trag mindestens einen Wert ein.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveMeasurement(today, values)
      const others = profile.measurements.filter((entry) => entry.date !== today)
      const measurements = [...others, { date: today, ...values }].sort((a, b) => a.date.localeCompare(b.date))
      onProfileChange({ ...profile, measurements })
      flash('Messung gespeichert')
    } catch {
      setError('Die Messung wurde nicht gespeichert. Versuch es noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveDetails(event: FormEvent) {
    event.preventDefault()
    const parsedHeight = parseField(height, 100, 250)
    const parsedTarget = parseField(target, 20, 350)
    const parsedYear = birthYear.trim() === '' ? null : Number(birthYear)
    if (parsedHeight === undefined) return setError('Größe prüfen: zwischen 100 und 250 cm.')
    if (parsedTarget === undefined) return setError('Zielgewicht prüfen: zwischen 20 und 350 kg.')
    if (parsedYear !== null && (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2020)) {
      return setError('Geburtsjahr prüfen: zwischen 1900 und 2020.')
    }
    const next: UserProfile = {
      ...profile,
      heightCm: parsedHeight === null ? null : Math.round(parsedHeight),
      targetWeightKg: parsedTarget,
      sex: sex === '' ? null : sex,
      birthYear: parsedYear,
      activityLevel: activity === '' ? null : activity,
    }
    setBusy(true)
    setError(null)
    try {
      await saveProfile(next)
      // Neues Zielgewicht: Ernährung rechnet die Tagesziele wieder aus dem Profil.
      if (next.targetWeightKg !== profile.targetWeightKg) await enableProfileTargets()
      onProfileChange(next)
      setShowDetails(false)
      flash('Angaben gespeichert')
    } catch {
      setError('Die Angaben wurden nicht gespeichert. Versuch es noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(date: string) {
    setBusy(true)
    setError(null)
    try {
      await deleteMeasurement(date)
      onProfileChange({ ...profile, measurements: profile.measurements.filter((entry) => entry.date !== date) })
    } catch {
      setError('Die Messung konnte nicht gelöscht werden.')
    } finally {
      setBusy(false)
    }
  }

  const missing = [
    profile.heightCm === null && 'Größe',
    profile.sex === null && 'Geschlecht',
    profile.birthYear === null && 'Geburtsjahr',
    profile.activityLevel === null && 'Aktivität',
  ].filter(Boolean)

  const diff = analysis.diffToTargetKg
  // Messungen nur mit alten Umfängen haben nichts mehr zu zeigen.
  const lastEntry = profile.measurements.filter((entry) => entry.weightKg !== null || entry.bodyFatPct !== null).at(-1)
  return (
    <div className="rounded-2xl border border-line/[0.08] bg-surface p-4">
      <h3 className="text-xl font-bold tracking-tight text-foreground">Körperdaten</h3>

      {/* Auswertung */}
      <div className="mt-3.5 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
        <Tile
          label="Gewicht"
          value={latest.weightKg === null ? '—' : `${formatNumber(latest.weightKg)} kg`}
          note={
            diff === null
              ? undefined
              : diff === 0
                ? 'Ziel erreicht'
                : `${formatNumber(Math.abs(diff))} kg ${diff > 0 ? 'abnehmen' : 'zunehmen'}`
          }
          noteClass={diff === 0 ? 'text-success' : 'text-accent-ink'}
        />
        <Tile label="BMI" value={analysis.bmi === null ? '—' : formatNumber(analysis.bmi)} note={analysis.bmiCategory ?? undefined} />
        <Tile
          label="Körperfett"
          value={analysis.bodyFatPct === null ? '—' : `${formatNumber(analysis.bodyFatPct)} %`}
          note={analysis.bodyFatSource === 'measured' ? 'gemessen' : undefined}
        />
        {analysis.leanMassKg !== null && (
          <Tile
            label="Magermasse"
            value={`${formatNumber(analysis.leanMassKg)} kg`}
            note={analysis.fatMassKg === null ? undefined : `Fett ${formatNumber(analysis.fatMassKg)} kg`}
          />
        )}
        {analysis.ffmi !== null && <Tile label="FFMI" value={formatNumber(analysis.ffmi)} />}
        {analysis.tdeeKcal !== null && <Tile label="Tagesbedarf" value={`${analysis.tdeeKcal} kcal`} />}
        {analysis.targetKcal !== null && <Tile label="Kalorienziel" value={`${analysis.targetKcal} kcal`} />}
        {analysis.proteinG !== null && <Tile label="Eiweiß" value={`${analysis.proteinG} g`} />}
      </div>
      {/* Angaben für die Berechnungen */}
      <div className="mt-3">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between text-left text-sm font-semibold text-foreground"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((current) => !current)}
        >
          <span>
            {missing.length > 0 ? 'Angaben ergänzen' : 'Angaben für die Berechnungen'}
            {missing.length > 0 && !showDetails && <span className="block text-xs font-normal text-muted">Fehlt: {missing.join(', ')}</span>}
          </span>
          <span className="text-xs font-normal text-muted">{showDetails ? 'schließen' : 'bearbeiten'}</span>
        </button>
        {showDetails && (
          <form onSubmit={(event) => void handleSaveDetails(event)} className="mt-2 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <label className={labelClass}>
                Größe (cm)
                <input
                  className={`${fieldClass} mt-1 text-center tabular-nums`}
                  inputMode="numeric"
                  placeholder="z. B. 180"
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                />
              </label>
              <label className={labelClass}>
                Zielgewicht (kg)
                <input
                  className={`${fieldClass} mt-1 text-center tabular-nums`}
                  inputMode="decimal"
                  placeholder="z. B. 78"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                />
              </label>
              <label className={labelClass}>
                Geschlecht
                <select className={`${fieldClass} mt-1`} value={sex} onChange={(event) => setSex(event.target.value as Sex | '')}>
                  <option value="">Keine Angabe</option>
                  <option value="male">Männlich</option>
                  <option value="female">Weiblich</option>
                </select>
              </label>
              <label className={labelClass}>
                Geburtsjahr
                <input
                  className={`${fieldClass} mt-1 text-center tabular-nums`}
                  inputMode="numeric"
                  placeholder="z. B. 1998"
                  value={birthYear}
                  onChange={(event) => setBirthYear(event.target.value)}
                />
              </label>
            </div>
            <label className={labelClass}>
              Aktivität im Alltag
              <select
                className={`${fieldClass} mt-1`}
                value={activity}
                onChange={(event) => setActivity(event.target.value as ActivityLevel | '')}
              >
                <option value="">Keine Angabe</option>
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
                  <option key={level} value={level}>
                    {ACTIVITY_LABELS[level]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 w-full rounded-xl bg-control px-4 text-sm font-semibold text-foreground active:scale-[0.99] disabled:opacity-50"
            >
              Angaben speichern
            </button>
          </form>
        )}
      </div>

      {/* Heutige Messung */}
      <form onSubmit={(event) => void handleSaveMeasurement(event)} className="mt-4 space-y-3 border-t border-line/[0.06] pt-4">
        <p className="text-sm font-semibold text-foreground">Messung heute</p>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)] gap-2.5">
          <div>
            <span className={labelClass}>Gewicht (kg)</span>
            <div className="mt-1 flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Gewicht um 0,5 kg verringern"
                onClick={() => stepWeight(-1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-control text-lg font-medium text-foreground active:scale-95"
              >
                −
              </button>
              <input
                className={`${fieldClass} text-center font-medium tabular-nums`}
                inputMode="decimal"
                aria-label="Gewicht in kg"
                placeholder={latest.weightKg === null ? 'z. B. 80,5' : toText(latest.weightKg)}
                value={inputs.weightKg}
                onChange={(event) => setInputs({ ...inputs, weightKg: event.target.value })}
              />
              <button
                type="button"
                aria-label="Gewicht um 0,5 kg erhöhen"
                onClick={() => stepWeight(1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-control text-foreground active:scale-95"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <label className={labelClass}>
            Körperfett (%)
            <input
              className={`${fieldClass} mt-1 text-center tabular-nums`}
              inputMode="decimal"
              placeholder="optional"
              value={inputs.bodyFatPct}
              onChange={(event) => setInputs({ ...inputs, bodyFatPct: event.target.value })}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="min-h-11 w-full rounded-xl bg-neon px-4 text-sm font-semibold text-black transition-transform active:scale-[0.99] disabled:opacity-50"
        >
          Messung speichern
        </button>
      </form>

      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {feedback && <p role="status" className="mt-3 text-sm text-success">{feedback}</p>}

      {/* Letzte Messung, zum Korrigieren. Der Verlauf steht in der Statistik. */}
      {lastEntry && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/[0.06] pt-3 text-sm">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted">Zuletzt</span>
          <span className="min-w-0 flex-1 truncate text-right tabular-nums text-foreground">
            <span className="text-muted">{SHORT_DATE.format(new Date(`${lastEntry.date}T12:00:00`))} · </span>
            {summary(lastEntry)}
          </span>
          <button
            type="button"
            aria-label={`Messung vom ${lastEntry.date} löschen`}
            disabled={busy}
            onClick={() => void handleDelete(lastEntry.date)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:text-danger"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
