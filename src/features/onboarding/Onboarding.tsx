import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildOnboardingPlan,
  type Experience,
  type Focus,
  type Goal,
  type Location,
  type OnboardingAnswers,
  isValidSessionMinutes,
  PRESET_MINUTES,
  type SessionMinutes,
  suggestWeekdays,
} from '../../domain/onboarding'
import { ACTIVITY_LABELS, type ActivityLevel } from '../../domain/body'
import { localDateString } from '../../domain/sets'
import { normalizeUsername } from '../../domain/username'
import { TimeWheelInput } from '../../components/TimeWheelInput'
import { Wordmark } from '../../lib/Wordmark'
import { PlanEditor } from '../plan/PlanEditor'
import { savePlan } from '../plan/api'
import { type MeasurementValues, saveMeasurement } from '../profile/api'
import { enableSocialProfile, saveUsername, usernameTaken } from '../social/api'
import { completeOnboarding, saveOnboardingProfile } from './api'

const STEPS = ['welcome', 'name', 'focus', 'goal', 'experience', 'location', 'schedule', 'plan', 'body', 'done'] as const
type Step = (typeof STEPS)[number]

/** Hintergrundbild je Schritt. Fehlt eine Datei, bleibt der dunkle Cyan-Verlauf. */
const IMAGES: Record<Step, string> = {
  welcome: '/onboarding/01-willkommen.jpg',
  name: '/onboarding/02-name.jpg',
  focus: '/onboarding/02-name.jpg',
  goal: '/onboarding/03-ziel.jpg',
  experience: '/onboarding/04-erfahrung.jpg',
  location: '/onboarding/05-ort.jpg',
  schedule: '/onboarding/06-zeitplan.jpg',
  plan: '/onboarding/07-plan.jpg',
  body: '/onboarding/08-koerper.jpg',
  done: '/onboarding/09-fertig.jpg',
}

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const WEEKDAY_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

type Draft = {
  step: Step
  name: string
  username: string
  /** Schwerpunkt, null = noch nicht beantwortet. */
  focus: Focus | null
  goal: Goal | null
  experience: Experience | null
  location: Location | null
  weekdays: number[]
  minutes: SessionMinutes | null
  /** „Eigene“ Dauer gewählt: Das Zeit-Rad ist sichtbar. */
  customMinutes: boolean
  /** Mobility-Übungen am Ende jedes Trainingstags. */
  mobility: boolean
  /** Zusätzlicher Cardio-Tag. */
  cardioDay: boolean
}

const EMPTY: Draft = {
  step: 'welcome', name: '', username: '', focus: null, goal: null, experience: null, location: null, weekdays: [], minutes: null,
  customMinutes: false, mobility: false, cardioDay: false,
}

function draftKey(userId: string) {
  return `liftlog:onboarding:${userId}`
}

/** Zwischenstand im Gerät, damit niemand nach dem Schließen der App von vorn anfängt. */
function readDraft(userId: string): Draft {
  try {
    const raw = localStorage.getItem(draftKey(userId))
    const draft = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) } : EMPTY
    // Ein Schritt aus einer älteren Version führt zurück zum Namen.
    return STEPS.includes(draft.step) ? draft : { ...draft, step: 'name' }
  } catch {
    return EMPTY
  }
}

function writeDraft(userId: string, draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(draftKey(userId), JSON.stringify(draft))
    else localStorage.removeItem(draftKey(userId))
  } catch {
    // Ohne Speicher geht der Zwischenstand beim Schließen verloren, der Ablauf funktioniert trotzdem.
  }
}

function OptionCard(props: { title: string; text: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={props.selected}
      onClick={props.onClick}
      className={`w-full rounded-2xl border p-4 text-left backdrop-blur-md transition-all active:scale-[0.98] ${
        props.selected
          ? 'border-neon bg-neon/15 shadow-[0_0_24px_-6px_var(--color-neon)]'
          : 'border-white/15 bg-black/45 hover:border-white/35'
      }`}
    >
      <span className="block font-display text-2xl font-extrabold uppercase leading-none tracking-wide text-white">
        {props.title}
      </span>
      <span className="mt-1.5 block text-sm text-white/75">{props.text}</span>
    </button>
  )
}

function PrimaryButton(props: { children: ReactNode; disabled?: boolean; onClick?: () => void; type?: 'button' | 'submit' }) {
  return (
    <button
      type={props.type ?? 'button'}
      disabled={props.disabled}
      onClick={props.onClick}
      className="bg-neon min-h-14 w-full rounded-2xl px-4 text-black disabled:opacity-40"
    >
      {props.children}
    </button>
  )
}

function Toggle(props: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={props.on} onClick={props.onClick}
      className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 text-left text-sm font-semibold backdrop-blur-md ${props.on ? 'border-neon bg-neon/15 text-white' : 'border-white/15 bg-black/45 text-white/85'}`}>
      <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${props.on ? 'border-neon bg-neon text-black' : 'border-white/40'}`}>{props.on ? '✓' : ''}</span>
      {props.children}
    </button>
  )
}

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-white/15 bg-black/50 px-3.5 py-3 text-base text-white placeholder-white/40 outline-none backdrop-blur-md focus:border-neon'

type Props = { userId: string; onFinish: () => void }

export function Onboarding({ userId, onFinish }: Props) {
  const [draft, setDraft] = useState<Draft>(() => readDraft(userId))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingPlan, setEditingPlan] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const today = localDateString()

  const stepIndex = STEPS.indexOf(draft.step)
  const { goal, experience, location, minutes, weekdays, mobility, cardioDay } = draft
  const focus = draft.focus ?? undefined
  const answers = useMemo<OnboardingAnswers | null>(
    () => (goal && experience && location && minutes && weekdays.length > 0 ? { goal, experience, location, weekdays, minutes, focus, mobility, cardioDay } : null),
    [goal, experience, location, minutes, weekdays, focus, mobility, cardioDay],
  )
  // Benutzername: kurz nach dem Tippen prüfen, ob er frei ist.
  const username = normalizeUsername(draft.username)
  const [taken, setTaken] = useState<{ name: string; taken: boolean } | null>(null)
  useEffect(() => {
    if (!username) return
    let cancelled = false
    const timeout = window.setTimeout(() => {
      usernameTaken(userId, username).then((value) => { if (!cancelled) setTaken({ name: username, taken: value }) }).catch(() => {})
    }, 400)
    return () => { cancelled = true; window.clearTimeout(timeout) }
  }, [userId, username])
  const usernameState = !draft.username.trim() ? 'empty' : !username ? 'invalid' : taken?.name !== username ? 'checking' : taken.taken ? 'taken' : 'free'
  const plan = useMemo(() => (answers ? buildOnboardingPlan(answers) : null), [answers])
  const firstName = draft.name.trim().split(/\s+/)[0] ?? ''

  useEffect(() => {
    writeDraft(userId, draft)
  }, [userId, draft])

  // Das Foto des nächsten Schritts vorab laden, damit der Wechsel ohne Flackern klappt.
  useEffect(() => {
    const following = STEPS[STEPS.indexOf(draft.step) + 1]
    if (following) new Image().src = IMAGES[following]
  }, [draft.step])

  // Bei jedem Schritt die Überschrift ansteuern, damit Screenreader den Wechsel mitbekommen.
  useEffect(() => {
    headingRef.current?.focus()
    window.scrollTo({ top: 0 })
  }, [draft.step])

  function update(changes: Partial<Draft>) {
    setError(null)
    setDraft((current) => ({ ...current, ...changes }))
  }

  function goTo(step: Step) {
    update({ step })
  }

  function next() {
    goTo(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)])
  }

  function back() {
    if (editingPlan) return setEditingPlan(false)
    goTo(STEPS[Math.max(stepIndex - 1, 0)])
  }

  /** Antwortkarte: ein Tipp wählt aus und geht nach kurzer Bestätigung weiter. */
  function choose(changes: Partial<Draft>) {
    update(changes)
    setTimeout(() => setDraft((current) => ({ ...current, step: STEPS[STEPS.indexOf(current.step) + 1] })), 220)
  }

  async function saveStep(action: () => Promise<void>, then: () => void) {
    setBusy(true)
    setError(null)
    try {
      await action()
      then()
    } catch {
      setError('Das hat nicht geklappt. Prüf deine Verbindung und versuch es noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  async function handleName(event: FormEvent) {
    event.preventDefault()
    const name = draft.name.trim()
    if (!name) return setError('Wie dürfen wir dich nennen?')
    if (!username) return setError('Benutzername: 3 bis 40 Zeichen, nur a–z, 0–9, Punkt und Unterstrich.')
    if (usernameState === 'taken') return setError('Dieser Benutzername ist schon vergeben.')
    setBusy(true)
    setError(null)
    try {
      await saveOnboardingProfile({ displayName: name.slice(0, 50) })
      // Mit dem Benutzernamen ist man auffindbar, das Profil bleibt privat (Anfragen nötig).
      await enableSocialProfile()
      await saveUsername(userId, username)
      next()
    } catch (cause) {
      setError(cause instanceof Error && cause.message.startsWith('Dieser') ? cause.message : 'Das hat nicht geklappt. Prüf deine Verbindung und versuch es noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  /** Speichert Plan, Profil-Antworten und die passende Pausenlänge. */
  async function savePlanAndProfile() {
    if (!plan || !answers) return
    await savePlan(plan.days, plan.method, plan.split)
    await saveOnboardingProfile({
      goal: answers.goal,
      experience: answers.experience,
      location: answers.location,
      minutes: answers.minutes,
      weeklyTarget: plan.days.length,
    })
    try {
      localStorage.setItem('liftlog:rest-seconds', String(plan.restSeconds))
    } catch {
      // Dann gilt die Standardpause.
    }
  }

  async function finish() {
    setBusy(true)
    try {
      await completeOnboarding()
      writeDraft(userId, null)
      onFinish()
    } catch {
      setError('Das hat nicht geklappt. Versuch es noch einmal.')
      setBusy(false)
    }
  }

  /** Wer lieber selbst plant, kommt direkt zum vorhandenen Plan-Editor in der App. */
  async function buildOwnPlan() {
    await finish()
  }

  const firstTraining = useMemo(() => {
    if (!plan) return null
    const todayWeekday = new Date(`${today}T12:00:00`).getDay()
    const ordered = [...plan.days].sort(
      (a, b) => ((a.weekday - todayWeekday + 7) % 7) - ((b.weekday - todayWeekday + 7) % 7),
    )
    const day = ordered[0]
    return { day, isToday: day.weekday === todayWeekday }
  }, [plan, today])

  const showBack = stepIndex > 0 && draft.step !== 'done'
  const showProgress = draft.step !== 'welcome' && draft.step !== 'done'

  let content: ReactNode
  switch (draft.step) {
    case 'welcome':
      content = (
        <>
          <Wordmark className="text-3xl" />
          <h1 ref={headingRef} tabIndex={-1} className="mt-6 text-5xl text-white outline-none">
            Dein Plan.
            <br />
            In 2 Minuten.
          </h1>
          <p className="mt-3 text-base text-white/80">
            Ein paar kurze Fragen, dann steht dein persönlicher Trainingsplan und du kannst direkt loslegen.
          </p>
          <div className="mt-8 space-y-3">
            <PrimaryButton onClick={next}>Los geht's</PrimaryButton>
            <button type="button" disabled={busy} onClick={() => void buildOwnPlan()} className="min-h-11 w-full text-sm font-semibold text-white/70 underline">
              Ich baue meinen Plan lieber selbst
            </button>
          </div>
        </>
      )
      break
    case 'name':
      content = (
        <form onSubmit={(event) => void handleName(event)}>
          <h1 ref={headingRef} tabIndex={-1} className="text-5xl text-white outline-none">Wie heißt du?</h1>
          <input
            className={`${fieldClass} mt-6 text-xl`}
            autoComplete="given-name"
            aria-label="Vorname"
            placeholder="Dein Vorname"
            maxLength={50}
            value={draft.name}
            onChange={(event) => update({ name: event.target.value })}
          />
          <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-white/70">
            Benutzername
            <input
              className={`${fieldClass} text-lg`}
              autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username"
              placeholder="dein.name"
              maxLength={40}
              value={draft.username}
              onChange={(event) => update({ username: event.target.value.toLowerCase() })}
            />
          </label>
          <p className="mt-1.5 min-h-5 text-sm font-medium" aria-live="polite">
            {usernameState === 'invalid' && <span className="text-[#ff9f9a]">Nur a–z, 0–9, Punkt und Unterstrich, 3 bis 40 Zeichen.</span>}
            {usernameState === 'taken' && <span className="text-[#ff9f9a]">Schon vergeben.</span>}
            {usernameState === 'free' && <span className="text-success">Frei ✓</span>}
          </p>
          <div className="mt-4">
            <PrimaryButton type="submit" disabled={busy || !draft.name.trim() || usernameState !== 'free'}>{busy ? 'Wird gespeichert …' : 'Weiter'}</PrimaryButton>
          </div>
        </form>
      )
      break
    case 'focus':
      content = (
        <>
          <h1 ref={headingRef} tabIndex={-1} className="text-5xl text-white outline-none">Worauf liegt dein Fokus?</h1>
          <div className="mt-6 space-y-2.5">
            <OptionCard title="Ausgewogen" text="Ganzer Körper, klassisch aufgebaut." selected={draft.focus === 'balanced'} onClick={() => choose({ focus: 'balanced' })} />
            <OptionCard title="Bauch, Beine & Po" text="Unterkörper zuerst und öfter, dazu Bauch." selected={draft.focus === 'lower'} onClick={() => choose({ focus: 'lower' })} />
            <OptionCard title="Athletisch" text="Kraft, Schnellkraft und Ausdauer, z. B. Swings und Thrusters." selected={draft.focus === 'athletic'} onClick={() => choose({ focus: 'athletic' })} />
          </div>
        </>
      )
      break
    case 'goal':
      content = (
        <>
          <h1 ref={headingRef} tabIndex={-1} className="text-5xl text-white outline-none">
            {firstName ? `Was ist dein Ziel, ${firstName}?` : 'Was ist dein Ziel?'}
          </h1>
          <p className="mt-2 text-base text-white/80">Danach richten sich Wiederholungen, Pausen und Kalorien.</p>
          <div className="mt-6 space-y-2.5">
            <OptionCard title="Muskelaufbau" text="Sichtbar mehr Muskeln, 8–12 Wiederholungen." selected={draft.goal === 'hypertrophy'} onClick={() => choose({ goal: 'hypertrophy' })} />
            <OptionCard title="Maximalkraft" text="Schwerer heben, wenige Wiederholungen, lange Pausen." selected={draft.goal === 'strength'} onClick={() => choose({ goal: 'strength' })} />
            <OptionCard title="Fettabbau" text="Definierter werden und Muskeln dabei halten." selected={draft.goal === 'cut'} onClick={() => choose({ goal: 'cut' })} />
            <OptionCard title="Fitness & Mobility" text="Fit und beweglich bleiben, mit Mobility-Übungen." selected={draft.goal === 'fitness'} onClick={() => choose({ goal: 'fitness', mobility: true })} />
          </div>
        </>
      )
      break
    case 'experience':
      content = (
        <>
          <h1 ref={headingRef} tabIndex={-1} className="text-5xl text-white outline-none">Wie lange trainierst du schon?</h1>
          <p className="mt-2 text-base text-white/80">Ehrlich sein lohnt sich: So passt die Belastung von Anfang an.</p>
          <div className="mt-6 space-y-2.5">
            <OptionCard title="Einsteiger" text="Noch nie oder weniger als 6 Monate." selected={draft.experience === 'beginner'} onClick={() => choose({ experience: 'beginner' })} />
            <OptionCard title="Fortgeschritten" text="6 Monate bis 2 Jahre regelmäßig." selected={draft.experience === 'intermediate'} onClick={() => choose({ experience: 'intermediate' })} />
            <OptionCard title="Erfahren" text="Mehr als 2 Jahre, ich kenne die Grundübungen." selected={draft.experience === 'advanced'} onClick={() => choose({ experience: 'advanced' })} />
          </div>
        </>
      )
      break
    case 'location':
      content = (
        <>
          <h1 ref={headingRef} tabIndex={-1} className="text-5xl text-white outline-none">Wo trainierst du?</h1>
          <p className="mt-2 text-base text-white/80">Dein Plan enthält nur Übungen, die du dort auch machen kannst.</p>
          <div className="mt-6 space-y-2.5">
            <OptionCard title="Fitnessstudio" text="Langhantel, Maschinen, Kabelzug." selected={draft.location === 'gym'} onClick={() => choose({ location: 'gym' })} />
            <OptionCard title="Ohne Geräte" text="Mit eigenem Körpergewicht und Gewichtshilfen." selected={draft.location === 'bodyweight'} onClick={() => choose({ location: 'bodyweight' })} />
            <OptionCard title="Calisthenics-Park" text="Klimmzugstange und Barren, Skills wie L-Sit und Handstand." selected={draft.location === 'calisthenics'} onClick={() => choose({ location: 'calisthenics' })} />
          </div>
        </>
      )
      break
    case 'schedule': {
      const count = draft.weekdays.length
      const cheer =
        count === 0 ? 'Tippe die Tage an, an denen du trainieren willst.'
          : count <= 2 ? 'Guter Start! Regelmäßig schlägt viel.'
            : count <= 4 ? 'Stark! Damit machst du schnell Fortschritte.'
              : 'Beast Mode! Achte auch auf deine Erholung.'
      content = (
        <>
          <h1 ref={headingRef} tabIndex={-1} className="text-5xl text-white outline-none">Wann trainierst du?</h1>
          <p className="mt-2 text-base text-white/80">{cheer}</p>
          <div className="mt-5 flex gap-1.5" role="group" aria-label="Schnellauswahl Tage pro Woche">
            {[2, 3, 4, 5, 6].map((n) => (
              <button key={n} type="button" onClick={() => update({ weekdays: suggestWeekdays(n) })}
                className={`min-h-10 flex-1 rounded-xl border text-sm font-semibold backdrop-blur-md ${count === n ? 'border-neon text-neon' : 'border-white/15 bg-black/40 text-white/80'}`}>
                {n}×
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1.5" role="group" aria-label="Trainingstage">
            {WEEKDAY_ORDER.map((weekday) => {
              const on = draft.weekdays.includes(weekday)
              return (
                <button key={weekday} type="button" aria-pressed={on}
                  onClick={() => update({ weekdays: on ? draft.weekdays.filter((day) => day !== weekday) : [...draft.weekdays, weekday] })}
                  className={`aspect-square rounded-xl text-sm font-bold transition-all active:scale-95 ${on ? 'bg-neon text-black shadow-[0_0_18px_-4px_var(--color-neon)]' : 'border border-white/15 bg-black/45 text-white/85 backdrop-blur-md'}`}>
                  {WEEKDAY_SHORT[weekday]}
                </button>
              )
            })}
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-white/70">Wie lange pro Training?</p>
          <div className="mt-2 grid grid-cols-5 gap-1.5" role="group" aria-label="Trainingsdauer">
            {PRESET_MINUTES.map((minutes) => {
              const on = !draft.customMinutes && draft.minutes === minutes
              return (
                <button key={minutes} type="button" aria-pressed={on} onClick={() => update({ minutes, customMinutes: false })}
                  className={`min-h-12 rounded-xl font-display text-xl font-extrabold ${on ? 'bg-neon text-black' : 'border border-white/15 bg-black/45 text-white backdrop-blur-md'}`}>
                  {minutes}<span className="ml-0.5 text-xs font-semibold">Min</span>
                </button>
              )
            })}
            <button type="button" aria-pressed={draft.customMinutes}
              onClick={() => update({ customMinutes: true, minutes: draft.customMinutes && draft.minutes ? draft.minutes : 75 })}
              className={`min-h-12 rounded-xl font-display text-base font-extrabold uppercase ${draft.customMinutes ? 'bg-neon text-black' : 'border border-white/15 bg-black/45 text-white backdrop-blur-md'}`}>
              Eigene
            </button>
          </div>
          {draft.customMinutes && (
            <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-white/70">
              Deine Trainingsdauer (10 Min. bis 4 Std.)
              <TimeWheelInput
                className={`${fieldClass} cursor-pointer text-center font-display text-xl font-extrabold tracking-wide`}
                aria-label="Eigene Trainingsdauer"
                placeholder="Tippen zum Einstellen"
                valueSeconds={draft.minutes ? draft.minutes * 60 : null}
                onSecondsChange={(seconds) => {
                  const minutes = seconds === null ? null : Math.round(seconds / 60)
                  if (minutes !== null && !isValidSessionMinutes(minutes)) {
                    update({ minutes: null })
                    setError('Wähle eine Dauer von 10 Minuten bis 4 Stunden.')
                    return
                  }
                  update({ minutes })
                }}
              />
            </label>
          )}
          {count > 6 && <p className="mt-3 text-sm text-[#ff9f9a]">Plane mindestens einen Ruhetag ein, höchstens 6 Trainingstage.</p>}
          <div className="mt-6">
            <PrimaryButton disabled={count === 0 || count > 6 || !draft.minutes} onClick={next}>Plan erstellen</PrimaryButton>
          </div>
        </>
      )
      break
    }
    case 'plan':
      content = editingPlan ? (
        <>
          {/* Der Editor speichert jeden Tag selbst. Der Plan ist schon gesichert, weiter geht es jederzeit. */}
          <div className="rounded-3xl bg-surface p-1 text-foreground">
            <PlanEditor hasPlan onSaved={() => {}} />
          </div>
          <div className="mt-4">
            <PrimaryButton onClick={() => { setEditingPlan(false); next() }}>Fertig, weiter</PrimaryButton>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-neon">Fertig berechnet</p>
          <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-5xl text-white outline-none">
            {firstName ? `Dein Plan, ${firstName}.` : 'Dein Plan.'}
          </h1>
          {plan && (
            <p className="mt-2 text-base text-white/80">
              {plan.days.length} Tage pro Woche · {draft.minutes} Min. · {String(Math.round(plan.restSeconds / 30) / 2).replace('.', ',')} Min. Pause zwischen den Sätzen
            </p>
          )}
          <div className="mt-4 space-y-2">
            <Toggle on={draft.mobility} onClick={() => update({ mobility: !draft.mobility })}>Mobility dazu (2 Übungen am Ende)</Toggle>
            {/* Bei 6 Trainingstagen bleibt sonst kein Ruhetag. */}
            {draft.weekdays.length < 6 && <Toggle on={draft.cardioDay} onClick={() => update({ cardioDay: !draft.cardioDay })}>Cardio-Tag dazu (30–45 Min.)</Toggle>}
          </div>
          <ul className="mt-5 space-y-2">
            {plan?.days.map((day) => (
              <li key={day.weekday} className="rounded-2xl border border-white/15 bg-black/55 p-3.5 backdrop-blur-md">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-xl font-extrabold uppercase tracking-wide text-white">{day.name}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-neon">{WEEKDAY_LONG[day.weekday]}</span>
                </div>
                <p className="mt-1 text-sm text-white/75">
                  {day.exercises.map((exercise) => exercise.name).join(' · ')}
                </p>
                <p className="mt-1 text-xs text-white/55">
                  {day.exercises[0]?.reps_min !== null
                    ? `${day.exercises[0].sets_min} × ${day.exercises[0].reps_min}–${day.exercises[0].reps_max} Wiederholungen`
                    : day.exercises.length === 1 && day.exercises[0].duration_min !== null
                      ? `${day.exercises[0].duration_min / 60}–${(day.exercises[0].duration_max ?? day.exercises[0].duration_min) / 60} Min.`
                      : `${day.exercises.length} Übungen`}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-2">
            <PrimaryButton disabled={busy} onClick={() => void saveStep(savePlanAndProfile, next)}>
              {busy ? 'Wird gespeichert …' : 'Passt, weiter'}
            </PrimaryButton>
            <button type="button" disabled={busy}
              onClick={() => void saveStep(savePlanAndProfile, () => setEditingPlan(true))}
              className="min-h-12 w-full rounded-2xl border border-white/25 bg-black/40 text-sm font-semibold text-white backdrop-blur-md">
              Plan anpassen
            </button>
          </div>
        </>
      )
      break
    case 'body':
      content = <BodyStep today={today} busy={busy} onSave={(values) => saveStep(values, next)} onSkip={next} />
      break
    case 'done':
      content = (
        <>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-neon">Alles eingerichtet</p>
          <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-5xl text-white outline-none">
            {firstName ? `Let's go, ${firstName}.` : "Let's go."}
          </h1>
          {firstTraining && (
            <div className="mt-5 rounded-2xl border border-neon/50 bg-black/55 p-4 backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-neon">
                {firstTraining.isToday ? 'Heute' : `Dein erstes Training · ${WEEKDAY_LONG[firstTraining.day.weekday]}`}
              </p>
              <p className="mt-1 font-display text-3xl font-extrabold uppercase text-white">{firstTraining.day.name}</p>
              <p className="mt-1 text-sm text-white/75">{firstTraining.day.exercises.length} Übungen · ca. {draft.minutes} Min.</p>
            </div>
          )}
          <p className="mt-4 text-sm text-white/70">Plan, Ziele und Körperdaten kannst du jederzeit im Profil und unter „Trainingsplan“ ändern.</p>
          <div className="mt-6">
            <PrimaryButton disabled={busy} onClick={() => void finish()}>
              {firstTraining?.isToday ? '▶ Zum ersten Training' : 'Zur App'}
            </PrimaryButton>
          </div>
        </>
      )
      break
  }

  return (
    <main
      className="onboarding relative min-h-dvh bg-black bg-cover bg-center text-white"
      style={{ backgroundImage: `linear-gradient(180deg, rgb(0 0 0 / 0.35) 0%, rgb(0 0 0 / 0.75) 45%, #000 100%), radial-gradient(ellipse 90% 60% at 80% 0%, rgb(24 224 255 / 0.28), transparent 70%), url(${IMAGES[draft.step]})` }}
    >
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex h-12 items-center gap-3">
          {showBack ? (
            <button type="button" onClick={back} aria-label="Zurück" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/45 text-xl text-white backdrop-blur-md">
              ‹
            </button>
          ) : (
            <span className="h-11 w-11 shrink-0" />
          )}
          {showProgress && (
            <div className="flex flex-1 gap-1" role="progressbar" aria-label="Fortschritt" aria-valuemin={1} aria-valuemax={STEPS.length - 2} aria-valuenow={stepIndex}>
              {STEPS.slice(1, -1).map((step, index) => (
                <span key={step} className={`h-1.5 flex-1 rounded-full transition-colors ${index < stepIndex ? 'bg-neon shadow-[0_0_8px_var(--color-neon)]' : 'bg-white/20'}`} />
              ))}
            </div>
          )}
        </header>
        <section key={draft.step} className="onboarding-step mt-auto pt-10">
          {content}
          {error && <p role="alert" className="mt-3 text-sm font-medium text-[#ff9f9a]">{error}</p>}
        </section>
      </div>
    </main>
  )
}

function BodyStep(props: {
  today: string
  busy: boolean
  onSave: (action: () => Promise<void>) => Promise<void>
  onSkip: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [target, setTarget] = useState('')
  const [sex, setSex] = useState<'male' | 'female' | ''>('')
  const [birthYear, setBirthYear] = useState('')
  const [activity, setActivity] = useState<ActivityLevel | ''>('')
  const [problem, setProblem] = useState<string | null>(null)

  function parse(text: string, min: number, max: number): number | null | undefined {
    if (text.trim() === '') return null
    const value = Number(text.trim().replace(',', '.'))
    return Number.isFinite(value) && value >= min && value <= max ? Math.round(value * 10) / 10 : undefined
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const weightKg = parse(weight, 20, 350)
    const heightCm = parse(height, 100, 250)
    const year = parse(birthYear, 1900, 2020)
    const targetKg = parse(target, 20, 350)
    if (weightKg === undefined) return setProblem('Gewicht prüfen: zwischen 20 und 350 kg.')
    if (heightCm === undefined) return setProblem('Größe prüfen: zwischen 100 und 250 cm.')
    if (targetKg === undefined) return setProblem('Zielgewicht prüfen: zwischen 20 und 350 kg.')
    if (year === undefined || (year !== null && !Number.isInteger(year))) return setProblem('Geburtsjahr prüfen: zwischen 1900 und 2020.')
    setProblem(null)
    void props.onSave(async () => {
      await saveOnboardingProfile({
        heightCm: heightCm === null ? null : Math.round(heightCm), sex: sex || null, birthYear: year, targetWeightKg: targetKg, activityLevel: activity || null,
      })
      if (weightKg !== null) {
        const values: MeasurementValues = {
          weightKg, bodyFatPct: null, neckCm: null, chestCm: null, waistCm: null, hipsCm: null, armCm: null, thighCm: null, calfCm: null,
        }
        await saveMeasurement(props.today, values)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Optional</p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-5xl text-white outline-none">Deine Körperdaten</h1>
      <p className="mt-2 text-base text-white/80">Damit rechnet die App deine Kalorien und Makros aus.</p>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-white/70">
          Gewicht (kg)
          <input className={fieldClass} inputMode="decimal" placeholder="z. B. 78" value={weight} onChange={(event) => setWeight(event.target.value)} />
        </label>
        <label className="text-xs font-bold uppercase tracking-wider text-white/70">
          Größe (cm)
          <input className={fieldClass} inputMode="numeric" placeholder="z. B. 180" value={height} onChange={(event) => setHeight(event.target.value)} />
        </label>
        <label className="text-xs font-bold uppercase tracking-wider text-white/70">
          Zielgewicht (kg)
          <input className={fieldClass} inputMode="decimal" placeholder="z. B. 75" value={target} onChange={(event) => setTarget(event.target.value)} />
        </label>
        <label className="text-xs font-bold uppercase tracking-wider text-white/70">
          Geburtsjahr
          <input className={fieldClass} inputMode="numeric" placeholder="z. B. 1998" value={birthYear} onChange={(event) => setBirthYear(event.target.value)} />
        </label>
      </div>
      <label className="mt-2.5 block text-xs font-bold uppercase tracking-wider text-white/70">
        Geschlecht
        <select className={fieldClass} value={sex} onChange={(event) => setSex(event.target.value as 'male' | 'female' | '')}>
          <option value="">Keine Angabe</option>
          <option value="male">Männlich</option>
          <option value="female">Weiblich</option>
        </select>
      </label>
      <label className="mt-2.5 block text-xs font-bold uppercase tracking-wider text-white/70">
        Aktivität im Alltag
        <select className={fieldClass} value={activity} onChange={(event) => setActivity(event.target.value as ActivityLevel | '')}>
          <option value="">Keine Angabe</option>
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => <option key={level} value={level}>{ACTIVITY_LABELS[level]}</option>)}
        </select>
      </label>
      {problem && <p role="alert" className="mt-3 text-sm font-medium text-[#ff9f9a]">{problem}</p>}
      <div className="mt-6 space-y-2">
        <PrimaryButton type="submit" disabled={props.busy}>{props.busy ? 'Wird gespeichert …' : 'Speichern & weiter'}</PrimaryButton>
        <button type="button" onClick={props.onSkip} className="min-h-12 w-full text-sm font-semibold text-white/75 underline">
          Überspringen
        </button>
      </div>
    </form>
  )
}
