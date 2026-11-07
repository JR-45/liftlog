import { useEffect, useRef, useState } from 'react'
import { progressionHint } from '../../domain/progression'
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
  deletePlanEntry,
  deleteSet,
  deleteSetAndShift,
  type Exercise,
  type LoggedSet,
  type PlanEntry,
  saveSet,
  updateExercise,
  updateNextWeights,
  updatePlanSets,
} from './api'
import { CheckIcon, ChevronRightIcon, PlusIcon, SettingsIcon } from '../../lib/icons'
import { ConfirmDeleteButton } from './ConfirmDeleteButton'
import { readDraft, removeDraft, writeDraft } from './drafts'
import { SetRow } from './SetRow'
import { SwipeToDelete } from './SwipeToDelete'

const fieldClass =
  'h-11 rounded-xl border border-transparent bg-[#2C2C2E] px-3 text-base text-white outline-none transition-colors focus:border-[#FFD60A] focus:bg-[#3A3A3C] disabled:opacity-50'
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
  setCount: number
  onSetCountChange: (count: number) => void
  lastSets: LoggedSet[]
  getWorkoutId: () => Promise<string>
  onToggle: () => void
  onSetChange: (exerciseId: string, setNumber: number, values: SetValues | null) => void
  onExerciseChange: (exerciseId: string, changes: Partial<Exercise>) => void
  onActiveChange: (exerciseId: string) => void
  onRemoveEntry?: () => void
  /** Neue Satzanzahl im Plan, z. B. nach „Satz hinzufügen“. */
  onEntryChange: (changes: Pick<PlanEntry, 'sets_min' | 'sets_max'>) => void
  /** Ein Satz wurde gelöscht, die gespeicherten Sätze dahinter rücken eine Nummer auf. */
  onSetDeleted: (exerciseId: string, setNumber: number) => void
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
    onSetCountChange,
    lastSets,
    getWorkoutId,
    onToggle,
    onSetChange,
    onExerciseChange,
    onActiveChange,
    onRemoveEntry,
    onEntryChange,
    onSetDeleted,
  } = props
  const [busy, setBusy] = useState(false)
  const [changingCount, setChangingCount] = useState(false)
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
  const unit: DurationUnit = entry.duration_min === null ? 'minutes' : 'seconds'
  const isRounds = entry.sets_min !== entry.sets_max
  const reps = formatRange(entry.reps_min, entry.reps_max)
  const duration = formatRange(entry.duration_min, entry.duration_max)
  const sets = String(setCount)
  const target = reps
    ? `${sets}${isRounds ? ' Runden' : ''} × ${reps}`
    : duration
      ? `${sets} × ${duration} Sek.`
      : 'Dauer frei'
  const last = lastSets.filter((set) => set.exercise_id === activeId)
  const hint = progressionHint({
    tracking: exercise.tracking_type,
    currentWeight: exercise.current_weight_kg,
    setsMin: setCount,
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
  const done = logged.length >= setCount
  const direction = assisted ? -1 : 1
  const answered = logged.length > 0 && logged.every((set) => set.next_weight_kg != null)
  // Empfehlung: Dieselbe Regel wie beim Hinweis, nur mit den heutigen Sätzen.
  const recommended =
    done &&
    progressionHint({
      tracking: exercise.tracking_type,
      currentWeight: null,
      setsMin: setCount,
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
    if (changingCount || savingSets > 0 || busy) return
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

  async function handleRemoveEntry() {
    if (!onRemoveEntry) return
    setBusy(true)
    setError(null)
    try {
      await deletePlanEntry(entry.id)
      onRemoveEntry()
    } catch {
      setError('Übung konnte nicht aus dem Tag entfernt werden.')
    } finally {
      setBusy(false)
    }
  }

  /** Fügt einen neuen Satz hinzu und speichert die neue Satzanzahl im Trainingsplan. */
  async function handleAddSet() {
    if (entry.sets_max >= 20) return
    setBusy(true)
    setError(null)
    const nextMax = entry.sets_max + 1
    // Wenn vorher sets_min === sets_max war, ziehen wir sets_min mit hoch; bei Bereichen (z. B. 3–4 Runden) wächst nur das Maximum.
    const nextMin = entry.sets_min === entry.sets_max ? nextMax : entry.sets_min
    try {
      await updatePlanSets(entry.id, nextMin, nextMax)
      onEntryChange({ sets_min: nextMin, sets_max: nextMax })
    } catch {
      setError('Der Satz konnte nicht hinzugefügt werden. Versuch es noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  /** Löscht einen Satz, rückt folgende Sätze und Entwürfe eins vor und reduziert die Satzanzahl im Plan. */
  async function handleDeleteSet(setNumber: number) {
    if (entry.sets_max <= 1) return
    setBusy(true)
    setError(null)
    const nextMax = entry.sets_max - 1
    const nextMin = Math.max(1, Math.min(entry.sets_min, nextMax))
    try {
      const savedNumbers = rows.filter((num) => savedSets[setKey(activeId, num)] !== undefined)
      if (savedNumbers.some((num) => num >= setNumber)) {
        const workoutId = await getWorkoutId()
        await deleteSetAndShift(workoutId, activeId, setNumber, savedNumbers)
      }
      await updatePlanSets(entry.id, nextMin, nextMax)

      // Entwürfe für dahinterliegende Sätze eine Nummer nach vorne verschieben.
      for (let num = setNumber; num < entry.sets_max; num++) {
        const nextDraft = readDraft(userId, today, activeId, num + 1)
        if (nextDraft) writeDraft(userId, today, activeId, num, nextDraft)
        else removeDraft(userId, today, activeId, num)
      }
      removeDraft(userId, today, activeId, entry.sets_max)

      onSetDeleted(activeId, setNumber)
      onEntryChange({ sets_min: nextMin, sets_max: nextMax })
      setRowGeneration((current) => current + 1)
    } catch {
      setError('Der Satz konnte nicht gelöscht werden. Versuch es noch einmal.')
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

  async function removeLastSet() {
    if (setCount <= 1 || changingCount || busy || savingSets > 0) return
    setChangingCount(true)
    setError(null)
    try {
      // Beide Alternativen teilen dieselbe Satzanzahl; vorhandene Sätze werden nie versteckt.
      const ids = entry.alternative ? [entry.exercise.id, entry.alternative.id] : [entry.exercise.id]
      const savedIds = ids.filter((id) => savedSets[setKey(id, setCount)])
      if (savedIds.length > 0) {
        const workoutId = await getWorkoutId()
        for (const id of savedIds) {
          await deleteSet(workoutId, id, setCount)
          onSetChange(id, setCount, null)
        }
      }
      for (const id of ids) removeDraft(userId, today, id, setCount)
      onSetCountChange(setCount - 1)
    } catch {
      setError('Der Satz konnte nicht gelöscht werden. Bitte erneut versuchen.')
    } finally {
      setChangingCount(false)
    }
  }

  const statusIcon = (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
        done
          ? 'bg-[#30D158] text-black shadow-sm shadow-[#30D158]/25'
          : 'border-2 border-[#3A3A3C] bg-[#2C2C2E]/40'
      }`}
      aria-hidden="true"
    >
      {done && <CheckIcon className="h-3.5 w-3.5 stroke-[3]" />}
    </span>
  )

  const subtitle = (
    <span
      className={`block truncate text-sm tabular-nums ${hint && !done ? 'font-medium text-[#FFD60A]' : 'text-[#8E8E93]'}`}
    >
      {logged.length > 0 ? formatPerformance(logged, unit) : hint && !bodyVisible ? hintText : target}
    </span>
  )

  const settingsButton = showSettingsButton && (
    <button
      className={`mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors active:scale-95 ${
        showSettings ? 'bg-[#2C2C2E] text-white' : 'text-[#8E8E93] hover:text-white'
      }`}
      type="button"
      aria-label={`Einstellungen für ${exercise.name}`}
      aria-expanded={showSettings}
      onClick={() => setShowSettings((current) => !current)}
    >
      <SettingsIcon className="h-5 w-5" />
    </button>
  )

  const desktopDeleteButton = onRemoveEntry && layout !== 'stacked' && (
    <div className="mr-2 shrink-0">
      <ConfirmDeleteButton
        label={`${exercise.name} aus diesem Tag entfernen`}
        disabled={busy}
        onConfirm={() => void handleRemoveEntry()}
      />
    </div>
  )

  const rawHeader = isDetail ? (
    <div className="flex items-center">
      <div className="flex min-h-16 min-w-0 flex-1 items-center gap-3.5 py-3.5 pl-4 pr-2">
        {statusIcon}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold tracking-tight text-white">{exercise.name}</h3>
          {subtitle}
        </div>
      </div>
      {settingsButton}
      {desktopDeleteButton}
    </div>
  ) : (
    <div className="flex items-center bg-[#1C1C1E]">
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
              done && !open ? 'text-[#8E8E93]' : 'text-white'
            }`}
          >
            {exercise.name}
          </span>
          {subtitle}
        </span>
        <ChevronRightIcon
          className={`h-5 w-5 shrink-0 text-[#8E8E93] transition-transform duration-300 motion-reduce:transition-none ${
            layout === 'stacked' && open ? 'rotate-90 text-white' : ''
          }`}
        />
      </button>
      {settingsButton}
      {desktopDeleteButton}
    </div>
  )

  const header =
    layout === 'stacked' ? (
      <SwipeToDelete
        label={`${exercise.name} aus diesem Tag entfernen`}
        enabled={onRemoveEntry !== undefined && !busy}
        onDelete={() => void handleRemoveEntry()}
      >
        {rawHeader}
      </SwipeToDelete>
    ) : (
      rawHeader
    )

  const answer = showAnswer && (
    <div className="px-4 pb-3.5">
      {answered ? (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-[#2C2C2E]/70 px-3 py-2">
          <p className="min-w-0 text-sm text-[#EBEBF5]/80">
            Nächstes Mal: <span className="font-semibold tabular-nums text-white">{formatPlanned(logged)}</span>
          </p>
          <button
            className="min-h-11 shrink-0 px-2 text-sm font-medium text-[#FFD60A] disabled:opacity-50"
            type="button"
            disabled={busy}
            onClick={() => void applyAnswer(() => null)}
          >
            Ändern
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-[#2C2C2E]/60 p-3">
          <p className="text-sm font-semibold text-white">
            Geschafft?
            {recommended && <span className="ml-2 font-medium text-[#FFD60A]">Erhöhen empfohlen</span>}
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              className="min-h-11 rounded-xl bg-[#3A3A3C] px-2 py-2 text-sm font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
              type="button"
              disabled={busy}
              onClick={() => void applyAnswer((set) => set.weight_kg)}
            >
              {noLabel}
            </button>
            <button
              className="min-h-11 rounded-xl bg-[#FFD60A] px-2 py-2 text-sm font-semibold tabular-nums text-black shadow-sm transition-transform active:scale-95 disabled:opacity-50"
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
      {error && !bodyVisible && <p role="alert" className="mt-2 text-sm text-[#FF453A]">{error}</p>}
    </div>
  )

  const body = (
    <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
      {showSettings && (
        <div className="mb-3.5 space-y-2.5 rounded-2xl bg-[#141416] p-3.5 ring-1 ring-white/[0.06]">
          {exercise.tracking_type !== 'duration' && (
            <label className="flex items-center justify-between gap-3 text-sm font-medium text-[#EBEBF5]/85">
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
            <label className="flex items-center justify-between gap-3 text-sm font-medium text-[#EBEBF5]/85">
              Schrittweite
              <span className="flex items-center gap-2 text-[#8E8E93]">
                <input
                  className={`${fieldClass} w-20 text-center tabular-nums`}
                  aria-label="Schrittweite in kg"
                  inputMode="decimal"
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
              className="min-h-11 text-sm font-medium text-[#FFD60A]"
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
            <p className="text-sm text-[#8E8E93]">Diese Übung wird über die Dauer erfasst.</p>
          )}
          {onRemoveEntry && (
            <div className="border-t border-white/[0.06] pt-2">
              <button
                className="min-h-11 text-sm font-medium text-[#FF453A] disabled:opacity-50"
                type="button"
                disabled={busy}
                onClick={() => void handleRemoveEntry()}
              >
                Übung aus diesem Tag entfernen
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-sm tabular-nums text-[#8E8E93]">
        {logged.length > 0 && <span className="mr-2 text-[#8E8E93]/75">Vorgabe {target} ·</span>}
        {last.length > 0 ? `Letztes Mal: ${formatPerformance(last, unit)}` : 'Noch kein letztes Training'}
      </p>

      {hint && !done && (
        <p className="mt-2.5 rounded-xl bg-[#FFD60A]/12 px-3 py-2 text-sm font-medium text-[#FFD60A] ring-1 ring-[#FFD60A]/25">
          {hintText}
        </p>
      )}

      {error && bodyVisible && <p role="alert" className="mt-2 text-sm text-[#FF453A]">{error}</p>}

      <div className="mt-3.5 flex gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]" aria-hidden="true">
        <span className="w-4 shrink-0">{isRounds ? 'R' : '#'}</span>
        {exercise.tracking_type === 'duration' ? (
          <span className="flex-1">{unit === 'minutes' ? 'Minuten' : 'Sekunden'}</span>
        ) : (
          <>
            {weighted && <span className="flex-[2]">{assisted ? 'Hilfe (kg)' : 'kg'}</span>}
            <span className="flex-[1.35]">Wdh.</span>
          </>
        )}
        <span className={isDetail && entry.sets_max > 1 ? 'w-[5.75rem] shrink-0' : 'w-11 shrink-0'} />
      </div>

      <fieldset disabled={changingCount || busy} aria-label="Sätze">
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
              label={isRounds ? `Runde ${setNumber}` : `Satz ${setNumber}`}
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
              weightStep={exercise.weight_step_kg}
              deleteMode={isDetail ? 'button' : 'swipe'}
              onSave={handleSaveSet}
              onEdit={() => setHasEdits(true)}
              onDelete={entry.sets_max > 1 ? () => void handleDeleteSet(setNumber) : undefined}
            />
          )
        })}
      </ul>
      </fieldset>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-700 pt-3">
        <span className="mr-auto text-sm text-neutral-400" aria-live="polite">{setCount} {isRounds ? 'Runden' : 'Sätze'}</span>
        <button className="min-h-11 rounded-lg bg-neutral-900 px-3 py-2 text-sm text-red-300 disabled:opacity-40"
          type="button" disabled={setCount <= 1 || busy || changingCount || savingSets > 0} onClick={() => void removeLastSet()}>
          {changingCount ? 'Wird gelöscht …' : `${isRounds ? 'Runde' : 'Satz'} ${setCount} löschen`}
        </button>
        <button className="min-h-11 rounded-lg bg-neutral-900 px-3 py-2 text-sm text-yellow-300 disabled:opacity-40"
          type="button" disabled={setCount >= 100 || busy || changingCount || savingSets > 0} onClick={() => onSetCountChange(setCount + 1)}>
          + {isRounds ? 'Runde' : 'Satz'} hinzufügen
        </button>
      </div>

      {entry.sets_max < 20 && (
        <button
          className="mt-2.5 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/[0.12] bg-[#2C2C2E]/40 px-3 text-sm font-medium text-[#EBEBF5]/85 transition-colors hover:border-white/25 hover:bg-[#2C2C2E] active:scale-[0.99] disabled:opacity-50"
          type="button"
          disabled={busy}
          onClick={() => void handleAddSet()}
        >
          <PlusIcon className="h-4 w-4 text-[#FFD60A]" />
          {isRounds ? 'Runde hinzufügen' : 'Satz hinzufügen'}
        </button>
      )}

      {(logged.length > 0 || hasEdits) &&
        (confirmingReset ? (
          <div className="mt-3 rounded-lg bg-neutral-900/60 p-3">
            <p className="text-sm text-neutral-200">Eingaben und heutige Sätze dieser Übung löschen?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                className="min-h-11 rounded-lg border border-neutral-700 px-2 text-sm text-neutral-200 disabled:opacity-50"
                type="button"
                disabled={busy}
                onClick={() => setConfirmingReset(false)}
              >
                Abbrechen
              </button>
              <button
                className="min-h-11 rounded-lg bg-red-400 px-2 text-sm font-semibold text-neutral-950 disabled:opacity-50"
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
            className="mt-3 min-h-11 w-full text-sm text-neutral-400 underline"
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
      <section aria-label={exercise.name} className="rounded-2xl border border-white/[0.08] bg-[#1C1C1E] shadow-lg">
        {header}
        {answer}
        {body}
      </section>
    )
  }

  // In der Laptop-Liste markiert ein gelber Rand die Übung, die rechts offen ist.
  const openStyle =
    layout === 'summary'
      ? 'border-[#FFD60A]/60 bg-[#242426]'
      : 'border-white/[0.12] bg-[#1C1C1E] shadow-md'
  return (
    <li
      ref={cardRef}
      aria-label={exercise.name}
      className={`scroll-mt-16 overflow-hidden rounded-2xl border transition-colors duration-300 motion-reduce:transition-none ${
        open ? openStyle : 'border-white/[0.06] bg-[#1C1C1E]/80'
      }`}
    >
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
