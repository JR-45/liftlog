import { type FormEvent, useMemo, useState } from 'react'
import { type ActivityLevel, ageFromBirthYear, analyzeBody, type Rating, type Sex } from '../../domain/body'
import { PlusIcon, TrashIcon } from '../../lib/icons'
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

/** Reihenfolge, Beschriftung und erlaubter Bereich, gleich wie in der Datenbank. */
const FIELDS: { key: Field; label: string; unit: string; min: number; max: number }[] = [
  { key: 'weightKg', label: 'Gewicht', unit: 'kg', min: 20, max: 350 },
  { key: 'bodyFatPct', label: 'Körperfett', unit: '%', min: 2, max: 70 },
  { key: 'neckCm', label: 'Hals', unit: 'cm', min: 10, max: 250 },
  { key: 'chestCm', label: 'Brust', unit: 'cm', min: 10, max: 250 },
  { key: 'waistCm', label: 'Taille', unit: 'cm', min: 10, max: 250 },
  { key: 'hipsCm', label: 'Hüfte', unit: 'cm', min: 10, max: 250 },
  { key: 'armCm', label: 'Oberarm', unit: 'cm', min: 10, max: 250 },
  { key: 'thighCm', label: 'Oberschenkel', unit: 'cm', min: 10, max: 250 },
  { key: 'calfCm', label: 'Wade', unit: 'cm', min: 10, max: 250 },
]
const CIRCUMFERENCES = FIELDS.slice(2)

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Kaum Bewegung (Büro)',
  light: 'Leicht aktiv (1–2× Sport)',
  moderate: 'Aktiv (3–4× Sport)',
  active: 'Sehr aktiv (5–6× Sport)',
  very_active: 'Extrem aktiv (täglich + körperliche Arbeit)',
}

const RATING_STYLE: Record<Rating, string> = {
  good: 'text-success',
  elevated: 'text-accent-ink',
  high: 'text-danger',
}
const RATING_LABEL: Record<Rating, string> = { good: 'günstig', elevated: 'erhöht', high: 'hoch' }

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
function latestValues(measurements: BodyMeasurement[]): MeasurementValues {
  const result = Object.fromEntries(FIELDS.map(({ key }) => [key, null])) as MeasurementValues
  for (const entry of measurements) {
    for (const { key } of FIELDS) {
      if (entry[key] !== null) result[key] = entry[key]
    }
  }
  return result
}

function summary(entry: BodyMeasurement): string {
  return FIELDS.flatMap(({ key, label, unit }) => {
    const value = entry[key]
    if (value === null) return []
    if (key === 'weightKg') return [`${formatNumber(value)} kg`]
    if (key === 'bodyFatPct') return [`${formatNumber(value)} % KFA`]
    return [`${label} ${formatNumber(value)} ${unit}`]
  }).join(' · ')
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
  const [inputs, setInputs] = useState<Record<Field, string>>(
    () => Object.fromEntries(FIELDS.map(({ key }) => [key, toText(todayEntry?.[key] ?? null)])) as Record<Field, string>,
  )
  const [showCircumferences, setShowCircumferences] = useState(() =>
    CIRCUMFERENCES.some(({ key }) => profile.measurements.some((entry) => entry[key] !== null)),
  )
  const [showDetails, setShowDetails] = useState(
    () => profile.heightCm === null || profile.sex === null || profile.birthYear === null,
  )
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
    neckCm: latest.neckCm,
    waistCm: latest.waistCm,
    hipsCm: latest.hipsCm,
  })

  const firstWeight = profile.measurements.find((entry) => entry.weightKg !== null)?.weightKg ?? null
  const firstWaist = profile.measurements.find((entry) => entry.waistCm !== null)?.waistCm ?? null

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
    const values = {} as MeasurementValues
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
    latest.waistCm === null && 'Taille',
    latest.neckCm === null && latest.bodyFatPct === null && 'Hals',
  ].filter(Boolean)

  const diff = analysis.diffToTargetKg
  return (
    <div className="rounded-2xl border border-line/[0.08] bg-surface p-4">
      <div>
        <h3 className="text-base font-bold tracking-tight text-foreground">Körperdaten</h3>
        <p className="text-xs text-muted">Gewicht, Umfänge und daraus berechnete Werte</p>
      </div>

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
                : `${diff > 0 ? '+' : ''}${formatNumber(diff)} kg zum Ziel`
          }
          noteClass={diff === 0 ? 'text-success' : 'text-accent-ink'}
        />
        <Tile label="BMI" value={analysis.bmi === null ? '—' : formatNumber(analysis.bmi)} note={analysis.bmiCategory ?? undefined} />
        <Tile
          label="Körperfett"
          value={analysis.bodyFatPct === null ? '—' : `${formatNumber(analysis.bodyFatPct)} %`}
          note={analysis.bodyFatSource === 'navy' ? 'geschätzt (Navy-Formel)' : analysis.bodyFatSource === 'measured' ? 'gemessen' : undefined}
        />
        {analysis.leanMassKg !== null && (
          <Tile
            label="Magermasse"
            value={`${formatNumber(analysis.leanMassKg)} kg`}
            note={analysis.fatMassKg === null ? undefined : `Fett ${formatNumber(analysis.fatMassKg)} kg`}
          />
        )}
        {analysis.ffmi !== null && <Tile label="FFMI" value={formatNumber(analysis.ffmi)} note="Fettfreie-Masse-Index" />}
        {analysis.waistToHeight !== null && analysis.waistToHeightRating !== null && (
          <Tile
            label="Taille / Größe"
            value={formatNumber(analysis.waistToHeight, 2)}
            note={`${RATING_LABEL[analysis.waistToHeightRating]} (Ziel unter 0,5)`}
            noteClass={RATING_STYLE[analysis.waistToHeightRating]}
          />
        )}
        {analysis.waistToHip !== null && (
          <Tile
            label="Taille / Hüfte"
            value={formatNumber(analysis.waistToHip, 2)}
            note={analysis.waistToHipRating === null ? undefined : RATING_LABEL[analysis.waistToHipRating]}
            noteClass={analysis.waistToHipRating === null ? undefined : RATING_STYLE[analysis.waistToHipRating]}
          />
        )}
        {analysis.bmrKcal !== null && <Tile label="Grundumsatz" value={`${analysis.bmrKcal} kcal`} note="in Ruhe pro Tag" />}
        {analysis.tdeeKcal !== null && <Tile label="Tagesbedarf" value={`${analysis.tdeeKcal} kcal`} note="mit Aktivität" />}
        {analysis.targetKcal !== null && <Tile label="Kalorienziel" value={`${analysis.targetKcal} kcal`} note="passend zu deinem Ziel" />}
        {analysis.proteinG !== null && <Tile label="Eiweiß" value={`${analysis.proteinG} g`} note="pro Tag empfohlen" />}
      </div>
      {missing.length > 0 && (
        <p className="mt-2 text-xs text-muted">Für mehr Werte fehlt noch: {missing.join(', ')}.</p>
      )}
      <p className="mt-1 text-[11px] text-muted/70">Alle Werte sind Schätzungen und ersetzen keine ärztliche Beratung.</p>

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
          type="button"
          className="min-h-11 text-sm text-muted underline"
          aria-expanded={showCircumferences}
          onClick={() => setShowCircumferences((current) => !current)}
        >
          {showCircumferences ? 'Umfänge ausblenden' : 'Umfänge eintragen (Hals, Taille, Hüfte …)'}
        </button>
        {showCircumferences && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {CIRCUMFERENCES.map(({ key, label }) => (
              <label key={key} className={labelClass}>
                {label} (cm)
                <input
                  className={`${fieldClass} mt-1 text-center tabular-nums`}
                  inputMode="decimal"
                  placeholder={latest[key] === null ? '' : toText(latest[key])}
                  value={inputs[key]}
                  onChange={(event) => setInputs({ ...inputs, [key]: event.target.value })}
                />
              </label>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="min-h-11 w-full rounded-xl bg-neon px-4 text-sm font-semibold text-black transition-transform active:scale-[0.99] disabled:opacity-50"
        >
          Messung speichern
        </button>
      </form>

      {/* Angaben für die Berechnungen */}
      <div className="mt-4 border-t border-line/[0.06] pt-3">
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between text-left text-sm font-semibold text-foreground"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((current) => !current)}
        >
          Angaben für die Berechnungen
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
            <p className="text-xs text-muted">
              Geschlecht und Geburtsjahr nutzt die App nur für Grundumsatz und Körperfett-Schätzung.
            </p>
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

      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {feedback && <p role="status" className="mt-3 text-sm text-success">{feedback}</p>}

      {/* Verlauf */}
      {profile.measurements.length > 0 && (
        <div className="mt-4 border-t border-line/[0.06] pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Verlauf</p>
            <p className="text-xs tabular-nums text-muted">
              {[
                firstWeight !== null && latest.weightKg !== null && firstWeight !== latest.weightKg
                  ? `Seit Beginn ${latest.weightKg > firstWeight ? '+' : ''}${formatNumber(latest.weightKg - firstWeight)} kg`
                  : null,
                firstWaist !== null && latest.waistCm !== null && firstWaist !== latest.waistCm
                  ? `Taille ${latest.waistCm > firstWaist ? '+' : ''}${formatNumber(latest.waistCm - firstWaist)} cm`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <ul className="mt-2 divide-y divide-line/[0.06]">
            {[...profile.measurements]
              .reverse()
              .slice(0, 10)
              .map((entry) => (
                <li key={entry.date} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="shrink-0 tabular-nums text-muted">
                    {SHORT_DATE.format(new Date(`${entry.date}T12:00:00`))}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-right tabular-nums text-foreground">{summary(entry)}</span>
                  <button
                    type="button"
                    aria-label={`Messung vom ${entry.date} löschen`}
                    disabled={busy}
                    onClick={() => void handleDelete(entry.date)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:text-danger"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
