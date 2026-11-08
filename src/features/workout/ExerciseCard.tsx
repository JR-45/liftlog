import { useEffect, useRef, useState } from 'react'
import { progressionHint } from '../../domain/progression'
import { durationUnitForTarget, isCardioExercise, supportsGps } from '../../domain/cardio'
import {
  type DurationUnit,
  formatPerformance,
  formatPlanned,
  formatRange,
  formatWeight,
  parseWeightStep,
  plannedWeight,
  setKey,
  type SetValues,
  stepWeight,
  type TrackingType,
  usesWeight,
} from '../../domain/sets'
import {
  deleteExerciseSets,
  deleteSet,
  type Exercise,
  type LoggedSet,
  type PlanEntry,
  saveSet,
  updateExercise,
  updateNextWeights,
} from './api'
import { CheckIcon, ChevronRightIcon, SettingsIcon } from '../../lib/icons'
import { readDraft, removeDraft } from './drafts'
import { DoneStamp } from '../../components/DoneStamp'
import { SetRow } from './SetRow'

const fieldClass =
  'h-11 rounded-xl border border-transparent bg-control px-3 text-base text-foreground outline-none transition-colors focus:border-neon focus:bg-control-hover disabled:opacity-50'
const OPEN_ANIMATION_MS = 300

/**
 * stacked: Handy und Tablet, Karte mit Aufklappen.
 * summary: Laptop, kompakter Eintrag in der Liste links.
 * detail: Laptop, die geöffnete Übung rechts, immer offen.
 */
export type CardLayout = 'stacked' | 'summary' | 'detail'

type Props = {
  entry: PlanEntry
  layout: CardLayout
  /** Alle Übungen des Tages. Liegt in DayView, damit Liste und Detail denselben Stand zeigen. */
  exercises: Record<string, Exercise>
  /** Übung oder Alternative, die gerade trainiert wird. */
  activeId: string
  userId: string
  today: string
  open: boolean
  /** Ändert sich der Wert, scrollt die Karte an den oberen Rand. */
  scrollRequest: number | null
  savedSets: Record<string, SetValues>
  /** Sätze aus dem Plan. Heute schon mehr gespeicherte Sätze bleiben sichtbar. */
  setCount: number
  lastSets: LoggedSet[]
  getWorkoutId: () => Promise<string>
  onToggle: () => void
  onSetChange: (exerciseId: string, setNumber: number, values: SetValues | null) => void
  onExerciseChange: (exerciseId: string, changes: Partial<Exercise>) => void
  onActiveChange: (exerciseId: string) => void
  /** Heute übersprungen. Der Plan bleibt dabei unverändert. */
  skipped: boolean
  onSkipChange: (skip: boolean) => void
}

export function ExerciseCard(props: Props) {
  const {
    entry,
    layout,
    exercises,
    activeId,
    userId,
    today,
    open,
    scrollRequest,
    savedSets,
    setCount,
    lastSets,
    getWorkoutId,
    onToggle,
    onSetChange,
    onExerciseChange,
    onActiveChange,
    skipped,
    onSkipChange,
  } = props
  const [busy, setBusy] = useState(false)
  const [savingSets, setSavingSets] = useState(0)
  const [error, setError] = useState<string | null>(null)
  // null: Das Feld zeigt den gespeicherten Wert, sonst die laufende Eingabe.
  const [stepText, setStepText] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [resetRequest, setResetRequest] = useState(0)
  const [confirmingReset, setConfirmingReset] = useState(false)
  // Ein neuer Wert baut die Satzzeilen neu auf, damit auch ihre Eingaben verschwinden.
  const [rowGeneration, setRowGeneration] = useState(0)
  const hasDraftsFor = (exerciseId: string) =>
    Array.from({ length: setCount }, (_, index) => index + 1).some(
      (setNumber) => readDraft(userId, today, exerciseId, setNumber) !== null,
    )
  const [hasEdits, setHasEdits] = useState(() => hasDraftsFor(activeId))
  const cardRef = useRef<HTMLLIElement>(null)

  // Erst nach der Animation scrollen, sonst verschiebt die sich schließende Karte das Ziel.
  useEffect(() => {
    if (scrollRequest === null) return
    const timeout = setTimeout(() => {
      cardRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }, OPEN_ANIMATION_MS)
    return () => clearTimeout(timeout)
  }, [scrollRequest])

  const exercise = exercises[activeId]
  const weighted = usesWeight(exercise.tracking_type)
  const assisted = exercise.tracking_type === 'assisted_reps'
  const cardio = exercise.tracking_type === 'duration' && isCardioExercise(exercise.name)
  const unit: DurationUnit = cardio ? 'minutes' : durationUnitForTarget(entry.duration_min)
  // Bewegungen gehören zur geplanten Übung, nicht zur Alternative.
  const steps = activeId === entry.exercise.id ? (entry.steps ?? []) : []
  const isRounds = entry.sets_min !== entry.sets_max || steps.length > 0
  const reps = formatRange(entry.reps_min, entry.reps_max)
  const duration = formatRange(entry.duration_min === null ? null : entry.duration_min / (unit === 'minutes' ? 60 : 1), entry.duration_max === null ? null : entry.duration_max / (unit === 'minutes' ? 60 : 1))
  const sets = formatRange(entry.sets_min, entry.sets_max)
  const target = reps
    ? `${sets}${isRounds ? ' Runden' : ''} × ${reps}`
    : duration
      ? `${cardio ? '' : `${sets} × `}${duration} ${unit === 'minutes' ? 'Min.' : 'Sek.'}`
      : 'Dauer frei'
  const last = lastSets.filter((set) => set.exercise_id === activeId)
  const hint = progressionHint({
    tracking: exercise.tracking_type,
    currentWeight: exercise.current_weight_kg,
    setsMin: entry.sets_min,
    repsMin: entry.reps_min,
    repsMax: entry.reps_max,
    lastSets: last,
  })
  const hintText = hint === 'increase_weight' ? 'Gewicht erhöhen empfohlen' : 'Gewichtshilfe senken empfohlen'

  const rows = Array.from({ length: setCount }, (_, index) => index + 1)
  const logged = rows.flatMap((setNumber) => {
    const set = savedSets[setKey(activeId, setNumber)]
    return set ? [set] : []
  })
  const done = logged.length >= entry.sets_min
  // Der Stempel kommt nur im Moment des Abschließens, nicht beim Öffnen einer fertigen Übung.
  const [stamp, setStamp] = useState({ done, key: 0 })
  if (stamp.done !== done) setStamp({ done, key: done ? stamp.key + 1 : stamp.key })
  // Am Laptop steht die Übung links in der Liste und rechts groß. Gestempelt wird nur die große Karte.
  const stampLayer = stamp.key > 0 && done && layout !== 'summary' && <DoneStamp key={stamp.key} />
  const direction = assisted ? -1 : 1
  const answered = logged.length > 0 && logged.every((set) => set.next_weight_kg != null)
  // Empfehlung: Dieselbe Regel wie beim Hinweis, nur mit den heutigen Sätzen.
  const recommended =
    done &&
    progressionHint({
      tracking: exercise.tracking_type,
      currentWeight: null,
      setsMin: entry.sets_min,
      repsMin: entry.reps_min,
      repsMax: entry.reps_max,
      lastSets: logged.map((set) => ({ ...set, next_weight_kg: null })),
    }) !== null
  const yesSets = logged.map((set) => ({
    ...set,
    next_weight_kg: set.weight_kg === null ? null : stepWeight(set.weight_kg, exercise.weight_step_kg, direction),
  }))
  const yesPlanned = formatPlanned(yesSets)
  const sameWeight = new Set(logged.map((set) => set.weight_kg)).size === 1
  const stepLabel = `${assisted ? '−' : '+'}${formatWeight(exercise.weight_step_kg)}`
  const yesLabel = sameWeight ? `Ja, ${assisted ? 'Hilfe auf' : 'auf'} ${yesPlanned}` : `Ja, ${stepLabel}`
  const noLabel = assisted ? 'Nein, Hilfe lassen' : 'Nein, Gewicht lassen'

  // Eine geschaffte Übung gilt nicht mehr als übersprungen.
  const isSkipped = skipped && !done
  const isDetail = layout === 'detail'
  // Die Sätze sind im Detail immer sichtbar, in der Laptop-Liste nie.
  const bodyVisible = isDetail || (layout === 'stacked' && open)
  // Die Frage steht in der Liste nur, solange die Übung nicht rechts im Detail offen ist.
  const showAnswer = done && weighted && !(layout === 'summary' && open)
  const showSettingsButton = isDetail || (layout === 'stacked' && open)

  /** Speichert „Geschafft?“ für alle gespeicherten Sätze der Übung. */
  async function applyAnswer(nextFor: (set: SetValues) => number | null) {
    setBusy(true)
    setError(null)
    try {
      const updates = rows.flatMap((setNumber) => {
        const set = savedSets[setKey(activeId, setNumber)]
        return set ? [{ setNumber, set, nextWeight: nextFor(set) }] : []
      })
      await updateNextWeights(await getWorkoutId(), activeId, updates)
      for (const { setNumber, set, nextWeight } of updates) {
        onSetChange(activeId, setNumber, { ...set, next_weight_kg: nextWeight })
      }
      // Das Arbeitsgewicht folgt dem schwersten Satz der Entscheidung.
      const planned = updates.flatMap(({ set, nextWeight }) => {
        const value = nextWeight ?? set.weight_kg
        return value === null ? [] : [value]
      })
      if (planned.length > 0) {
        const heaviest = assisted ? Math.min(...planned) : Math.max(...planned)
        await updateExercise(activeId, { current_weight_kg: heaviest })
        onExerciseChange(activeId, { current_weight_kg: heaviest })
      }
    } catch {
      setError('Deine Antwort wurde nicht gespeichert. Versuch es noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  /** Speichert zuerst und ändert die Anzeige nur bei Erfolg. */
  async function applyExerciseChange(
    changes: Partial<Pick<Exercise, 'current_weight_kg' | 'tracking_type' | 'weight_step_kg'>>,
  ) {
    setBusy(true)
    setError(null)
    try {
      await updateExercise(activeId, changes)
      onExerciseChange(activeId, changes)
    } catch {
      setError('Die Änderung wurde nicht gespeichert. Versuch es noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  function handleTrackingChange(next: TrackingType) {
    // Hilfe und Gewicht bedeuten Gegenteiliges: 30 kg Hilfe dürfen nicht zu 30 kg Zusatzgewicht werden.
    const assistChanged = assisted !== (next === 'assisted_reps')
    if (assistChanged) setResetRequest((current) => current + 1)
    void applyExerciseChange(assistChanged ? { tracking_type: next, current_weight_kg: null } : { tracking_type: next })
  }

  /** Setzt die Übung für heute zurück: gespeicherte Sätze, Antwort auf „Geschafft?“ und Entwürfe. */
  async function handleResetExercise() {
    if (savingSets > 0 || busy) return
    setBusy(true)
    setError(null)
    try {
      if (logged.length > 0) await deleteExerciseSets(await getWorkoutId(), activeId)
      for (const setNumber of rows) {
        removeDraft(userId, today, activeId, setNumber)
        if (savedSets[setKey(activeId, setNumber)]) onSetChange(activeId, setNumber, null)
      }
      setRowGeneration((current) => current + 1)
      setHasEdits(false)
      setConfirmingReset(false)
    } catch {
      setError('Die Übung konnte nicht zurückgesetzt werden. Versuch es noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  function handleStepBlur() {
    if (stepText === null) return
    const step = parseWeightStep(stepText)
    if (step === null) {
      setError('Schrittweite prüfen: mehr als 0 und höchstens 99,99 kg.')
      return
    }
    setStepText(null)
    if (step !== exercise.weight_step_kg) void applyExerciseChange({ weight_step_kg: step })
    else setError(null)
  }

  async function handleSaveSet(setNumber: number, values: SetValues | null) {
    setSavingSets((count) => count + 1)
    try {
      const workoutId = await getWorkoutId()
      if (values) {
        await saveSet(workoutId, activeId, setNumber, { ...values, next_weight_kg: null })
      } else {
        await deleteSet(workoutId, activeId, setNumber)
      }
      // Ein neuer oder geänderter Satz macht eine frühere Antwort ungültig, die Frage kommt dann neu.
      onSetChange(activeId, setNumber, values && { ...values, next_weight_kg: null })
      // Das Arbeitsgewicht ist der schwerste Satz. Es füllt noch leere Sätze und steuert den Hinweis.
      const weight = values?.weight_kg
      const current = exercise.current_weight_kg
      if (weight != null && (current === null || (assisted ? weight < current : weight > current))) {
        await applyExerciseChange({ current_weight_kg: weight })
      }
    } finally {
      setSavingSets((count) => count - 1)
    }
  }

  const statusIcon = (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
        done
          ? 'bg-success-fill text-black shadow-sm shadow-success/25'
          : 'border-2 border-control-hover bg-control/40'
      }`}
      aria-hidden="true"
    >
      {done && <CheckIcon className="h-3.5 w-3.5 stroke-[3]" />}
      {isSkipped && <span className="text-xs font-semibold leading-none text-muted">–</span>}
    </span>
  )

  const subtitle = (
    <span
      className={`block truncate text-sm tabular-nums ${hint && !done && !isSkipped ? 'font-medium text-accent-ink' : 'text-muted'}`}
    >
      {isSkipped ? 'Heute übersprungen' : logged.length > 0 ? formatPerformance(logged, unit, exercise.name === 'Laufband' ? 'speed' : 'pace') : hint && !bodyVisible ? hintText : target}
    </span>
  )

  const settingsButton = showSettingsButton && (
    <button
      className={`mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors active:scale-95 ${
        showSettings ? 'bg-control text-foreground' : 'text-muted hover:text-foreground'
      }`}
      type="button"
      aria-label={`Einstellungen für ${exercise.name}`}
      aria-expanded={showSettings}
      onClick={() => setShowSettings((current) => !current)}
    >
      <SettingsIcon className="h-5 w-5" />
    </button>
  )

  const header = isDetail ? (
    <div className="flex items-center">
      <div className="flex min-h-16 min-w-0 flex-1 items-center gap-3.5 py-3.5 pl-4 pr-2">
        {statusIcon}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{exercise.name}</h3>
          {subtitle}
        </div>
      </div>
      {settingsButton}
    </div>
  ) : (
    <div className="flex items-center bg-surface">
      <button
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3.5 py-3.5 pl-4 pr-2 text-left transition-opacity active:opacity-75"
        type="button"
        aria-label={
          layout === 'summary' ? `${exercise.name} anzeigen` : `${exercise.name} ${open ? 'schließen' : 'öffnen'}`
        }
        aria-expanded={layout === 'stacked' ? open : undefined}
        aria-current={layout === 'summary' && open ? 'true' : undefined}
        onClick={onToggle}
      >
        {statusIcon}
        <span className="min-w-0 flex-1">
          <span
            className={`block font-semibold tracking-tight ${bodyVisible ? '' : 'truncate'} ${
              (done || isSkipped) && !open ? 'text-muted' : 'text-foreground'
            }`}
          >
            {exercise.name}
          </span>
          {subtitle}
        </span>
        <ChevronRightIcon
          className={`h-5 w-5 shrink-0 text-muted transition-transform duration-300 motion-reduce:transition-none ${
            layout === 'stacked' && open ? 'rotate-90 text-foreground' : ''
          }`}
        />
      </button>
      {settingsButton}
    </div>
  )

  const answer = showAnswer && (
    <div className="px-4 pb-3.5">
      {answered ? (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-control/70 px-3 py-2">
          <p className="min-w-0 text-sm text-foreground/80">
            Nächstes Mal: <span className="font-semibold tabular-nums text-foreground">{formatPlanned(logged)}</span>
          </p>
          <button
            className="min-h-11 shrink-0 px-2 text-sm font-medium text-accent-ink disabled:opacity-50"
            type="button"
            disabled={busy}
            onClick={() => void applyAnswer(() => null)}
          >
            Ändern
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-control/60 p-3">
          <p className="text-sm font-semibold text-foreground">
            Geschafft?
            {recommended && <span className="ml-2 font-medium text-accent-ink">Erhöhen empfohlen</span>}
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              className="min-h-11 rounded-xl bg-control-hover px-2 py-2 text-sm font-medium text-foreground transition-transform active:scale-95 disabled:opacity-50"
              type="button"
              disabled={busy}
              onClick={() => void applyAnswer((set) => set.weight_kg)}
            >
              {noLabel}
            </button>
            <button
              className="min-h-11 rounded-xl bg-neon px-2 py-2 text-sm font-semibold tabular-nums text-black shadow-sm transition-transform active:scale-95 disabled:opacity-50"
              type="button"
              disabled={busy}
              onClick={() =>
                void applyAnswer((set) =>
                  set.weight_kg === null ? null : stepWeight(set.weight_kg, exercise.weight_step_kg, direction),
                )
              }
            >
              {yesLabel}
            </button>
          </div>
        </div>
      )}
      {error && !bodyVisible && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  )

  const body = (
    <div className="border-t border-line/[0.06] px-4 pb-4 pt-3">
      {showSettings && (
        <div className="mb-3.5 space-y-2.5 rounded-2xl bg-surface-inset p-3.5 ring-1 ring-line/[0.06]">
          {exercise.tracking_type !== 'duration' && (
            <label className="flex items-center justify-between gap-3 text-sm font-medium text-foreground/85">
              Erfassung
              <select
                className={fieldClass}
                value={exercise.tracking_type}
                disabled={busy}
                onChange={(event) => handleTrackingChange(event.target.value as TrackingType)}
              >
                <option value="weight_reps">Mit Gewicht</option>
                <option value="assisted_reps">Mit Gewichtshilfe</option>
                <option value="reps">Ohne Gewicht</option>
              </select>
            </label>
          )}
          {weighted && (
            <label className="flex items-center justify-between gap-3 text-sm font-medium text-foreground/85">
              Schrittweite
              <span className="flex items-center gap-2 text-muted">
                <input
                  className={`${fieldClass} w-20 text-center tabular-nums`}
                  aria-label="Schrittweite in kg"
                  inputMode="decimal"
                  enterKeyHint="done"
                  value={stepText ?? String(exercise.weight_step_kg).replace('.', ',')}
                  onChange={(event) => setStepText(event.target.value)}
                  onBlur={handleStepBlur}
                />
                kg
              </span>
            </label>
          )}
          {entry.alternative && (
            <button
              className="min-h-11 text-sm font-medium text-accent-ink"
              type="button"
              onClick={() => {
                const alternative = entry.alternative as Exercise
                const nextId = activeId === entry.exercise.id ? alternative.id : entry.exercise.id
                onActiveChange(nextId)
                setHasEdits(hasDraftsFor(nextId))
                setConfirmingReset(false)
                setStepText(null)
                setError(null)
              }}
            >
              Stattdessen: {(activeId === entry.exercise.id ? entry.alternative : entry.exercise).name}
            </button>
          )}
          {exercise.tracking_type === 'duration' && !entry.alternative && (
            <p className="text-sm text-muted">Diese Übung wird über die Dauer erfasst.</p>
          )}
          {!done && !isSkipped && (
            <div className="border-t border-line/[0.06] pt-2">
              <button
                className="min-h-11 w-full text-left text-sm font-medium text-accent-ink"
                type="button"
                onClick={() => {
                  setShowSettings(false)
                  onSkipChange(true)
                }}
              >
                Heute überspringen
              </button>
              <p className="text-xs text-muted">Nur für dieses Training. Dein Plan bleibt unverändert.</p>
            </div>
          )}
        </div>
      )}

      {isSkipped && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-control/70 px-3 py-2">
          <p className="min-w-0 text-sm text-foreground/80">Heute übersprungen</p>
          <button
            className="min-h-11 shrink-0 px-2 text-sm font-medium text-accent-ink"
            type="button"
            onClick={() => onSkipChange(false)}
          >
            Doch trainieren
          </button>
        </div>
      )}

      {steps.length > 0 && (
        <ol className="mb-3 space-y-1 rounded-xl bg-surface-inset px-3 py-2.5 text-sm text-foreground" aria-label="Bewegungen pro Runde">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-2.5">
              <span className="w-4 shrink-0 text-right tabular-nums text-muted">{index + 1}</span>
              <span className="min-w-0">{step}</span>
            </li>
          ))}
        </ol>
      )}

      <p className="text-sm tabular-nums text-muted">
        {logged.length > 0 && <span className="mr-2 text-muted/75">Vorgabe {target} ·</span>}
        {last.length > 0 ? `Letztes Mal: ${formatPerformance(last, unit, exercise.name === 'Laufband' ? 'speed' : 'pace')}` : 'Noch kein letztes Training'}
      </p>

      {hint && !done && (
        <p className="mt-2.5 rounded-xl bg-neon/12 px-3 py-2 text-sm font-medium text-accent-ink ring-1 ring-neon/25">
          {hintText}
        </p>
      )}

      {error && bodyVisible && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}

      <div className="mt-3.5 flex gap-1 px-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted" aria-hidden="true">
        {!cardio && <span className="w-4 shrink-0" />}
        {exercise.tracking_type === 'duration' ? (
          <><span className="flex-1">h / min</span>{cardio && <span className="flex-1">Strecke</span>}</>
        ) : (
          <>
            {weighted && <span className="flex-1">{assisted ? 'Hilfe (kg)' : 'kg'}</span>}
            <span className="flex-1">Wdh.</span>
          </>
        )}
        <span className="w-11 shrink-0" />
      </div>

      <fieldset disabled={busy} aria-label={cardio ? 'Cardio-Einheit' : 'Sätze'}>
      <ul>
        {rows.map((setNumber) => {
          const lastSet = last.find((set) => set.set_number === setNumber)
          const placeholderValue =
            exercise.tracking_type === 'duration'
              ? lastSet?.duration_seconds != null
                ? unit === 'minutes'
                  ? lastSet.duration_seconds / 60
                  : lastSet.duration_seconds
                : ''
              : (lastSet?.reps ?? '')
          return (
            <SetRow
              key={`${setKey(activeId, setNumber)}:${rowGeneration}`}
              label={cardio ? 'Cardio' : isRounds ? `Runde ${setNumber}` : `Satz ${setNumber}`}
              distanceEnabled={cardio}
              metricMode={exercise.name === 'Laufband' ? 'speed' : 'pace'}
              gpsEnabled={cardio && supportsGps(exercise.name)}
              legacyUnit={entry.duration_min === null ? 'minutes' : 'seconds'}
              rowNumber={setNumber}
              userId={userId}
              date={today}
              exerciseId={activeId}
              setNumber={setNumber}
              tracking={exercise.tracking_type}
              unit={unit}
              workingWeight={exercise.current_weight_kg}
              saved={savedSets[setKey(activeId, setNumber)] ?? null}
              initialDraft={readDraft(userId, today, activeId, setNumber)}
              placeholder={String(placeholderValue).replace('.', ',')}
              plannedWeight={lastSet && lastSet.is_assisted === assisted && weighted ? plannedWeight(lastSet) : null}
              resetRequest={resetRequest}
              onSave={handleSaveSet}
              onEdit={() => setHasEdits(true)}
            />
          )
        })}
      </ul>
      </fieldset>
      {(logged.length > 0 || hasEdits) &&
        (confirmingReset ? (
          <div className="mt-3 rounded-xl bg-control p-3">
            <p className="text-sm text-foreground">Eingaben und heutige Sätze dieser Übung löschen?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                className="min-h-11 rounded-xl bg-control-hover px-2 text-sm font-medium text-foreground disabled:opacity-50"
                type="button"
                disabled={busy}
                onClick={() => setConfirmingReset(false)}
              >
                Abbrechen
              </button>
              <button
                className="min-h-11 rounded-xl bg-danger px-2 text-sm font-semibold text-white disabled:opacity-50"
                type="button"
                disabled={busy}
                onClick={() => void handleResetExercise()}
              >
                Ja, zurücksetzen
              </button>
            </div>
          </div>
        ) : (
          <button
            className="mt-3 min-h-11 w-full text-sm font-medium text-muted"
            type="button"
            onClick={() => setConfirmingReset(true)}
          >
            Übung zurücksetzen
          </button>
        ))}
    </div>
  )

  if (isDetail) {
    return (
      <section data-entry={entry.id} aria-label={exercise.name} className="relative scroll-mt-4 rounded-2xl border border-line/[0.08] bg-surface shadow-lg">
        {stampLayer}
        {header}
        {answer}
        {body}
      </section>
    )
  }

  // In der Laptop-Liste markiert ein gelber Rand die Übung, die rechts offen ist.
  const openStyle =
    layout === 'summary'
      ? 'border-neon/60 bg-surface-raised'
      : 'border-line/[0.12] bg-surface shadow-md'
  return (
    <li
      ref={cardRef}
      data-entry={entry.id}
      aria-label={exercise.name}
      className={`relative scroll-mt-16 overflow-hidden rounded-2xl border transition-colors duration-300 motion-reduce:transition-none ${
        open ? openStyle : 'border-line/[0.06] bg-surface/80'
      }`}
    >
      {stampLayer}
      {header}
      {answer}
      {layout === 'stacked' && (
        // Die Höhe von 0fr auf 1fr animiert das Aufklappen ohne feste Pixelwerte.
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
          inert={!open}
        >
          <div className="min-h-0 overflow-hidden">{body}</div>
        </div>
      )}
    </li>
  )
}
