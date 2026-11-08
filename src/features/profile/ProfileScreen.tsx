import type { User } from '@supabase/supabase-js'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ExportRow } from '../../domain/export'
import { computeAthleteStats } from '../../domain/profile'
import { formatWeight } from '../../domain/sets'
import { CameraIcon, CheckIcon, TrophyIcon } from '../../lib/icons'
import { SECONDARY_BUTTON } from '../../lib/ui'
import { loadExportRows } from '../stats/api'
import { ExportCard } from '../stats/ExportCard'
import { ConnectionsPage } from '../social/ConnectionsPage'
import { ConnectionsSummary } from '../social/ConnectionsSummary'
import { enableSocialProfile, type SocialTab } from '../social/api'
import { DeleteAccountCard } from './DeleteAccountCard'
import { BodyCard } from './BodyCard'
import {
  cropSquareAvatar,
  loadAvatar,
  loadProfile,
  saveAvatar,
  saveProfile,
  type TrainingGoal,
  type UserProfile,
} from './api'

const GOAL_LABELS: Record<TrainingGoal, string> = {
  hypertrophy: 'Muskelaufbau',
  strength: 'Maximalkraft',
  cut: 'Definition & Fettabbau',
  fitness: 'Allgemeine Fitness',
}

const SHORT_DATE = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
const MEMBER_SINCE_FORMAT = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })

const fieldClass =
  'h-11 w-full rounded-xl border border-transparent bg-control px-3.5 text-base text-foreground placeholder-muted/60 outline-none transition-colors focus:border-neon focus:bg-control-hover disabled:opacity-50'

type Props = {
  user: User
  today: string
  defaultWeeklyTarget: number
  onAvatarChange: (avatarUrl: string | null) => void
  onNameChange: (displayName: string) => void
}

/** Lädt Profil und Profilbild aus der Datenbank und zeigt danach die Ansicht. */
export function ProfileScreen(props: Props) {
  const { user, defaultWeeklyTarget } = props
  const [loaded, setLoaded] = useState<{ profile: UserProfile; avatar: string | null } | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([loadProfile(user, defaultWeeklyTarget), loadAvatar()])
      .then(([profile, avatar]) => {
        if (!cancelled) setLoaded({ profile, avatar })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [user, defaultWeeklyTarget, attempt])

  if (failed) {
    return (
      <div className="mt-6">
        <p role="alert" className="text-sm text-danger">Dein Profil konnte nicht geladen werden.</p>
        <button
          className="mt-2 min-h-11 text-sm font-medium text-accent-ink"
          type="button"
          onClick={() => {
            setFailed(false)
            setAttempt((current) => current + 1)
          }}
        >
          Noch einmal versuchen
        </button>
      </div>
    )
  }
  if (loaded === null) return <p className="mt-6 text-sm text-muted">Profil wird geladen …</p>
  return <ProfileView {...props} initialProfile={loaded.profile} initialAvatar={loaded.avatar} />
}

function ProfileView({
  user,
  today,
  onAvatarChange,
  onNameChange,
  initialProfile,
  initialAvatar,
}: Props & { initialProfile: UserProfile; initialAvatar: string | null }) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile)
  const [avatar, setAvatar] = useState<string | null>(initialAvatar)
  const [rows, setRows] = useState<ExportRow[]>([])
  const [editingProfile, setEditingProfile] = useState(false)
  const [connections, setConnections] = useState<SocialTab | null>(null)
  const connectionEntry = useRef<{ tab: SocialTab; scroll: number } | null>(null)
  const [showAllPrs, setShowAllPrs] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Formularfelder für Profil-Bearbeitung
  const [nameDraft, setNameDraft] = useState(profile.displayName)
  const [bioDraft, setBioDraft] = useState(profile.bio)
  const [goalDraft, setGoalDraft] = useState<TrainingGoal>(profile.goal)
  const [weeklyDraft, setWeeklyDraft] = useState(profile.weeklyTarget)

  useEffect(() => {
    let cancelled = false
    loadExportRows()
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch(() => {
        // Statistik bleibt auf 0, falls das Laden fehlschlägt.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(
    () => computeAthleteStats(rows, today, profile.weeklyTarget),
    [rows, today, profile.weeklyTarget],
  )

  const initials =
    profile.displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'LL'

  const memberSince = MEMBER_SINCE_FORMAT.format(new Date(user.created_at))

  function showSuccess(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback((current) => (current === msg ? null : current)), 2500)
  }

  // Mit Bild öffnet die Kamera ein kleines Menü (neues Foto oder entfernen), ohne Bild direkt die Auswahl.
  const [photoMenu, setPhotoMenu] = useState(false)

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    setPhotoMenu(false)
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    try {
      const dataUrl = await cropSquareAvatar(file)
      await saveAvatar(dataUrl)
      setAvatar(dataUrl)
      onAvatarChange(dataUrl)
      showSuccess('Profilbild gespeichert')
    } catch {
      setError('Das Bild konnte nicht verarbeitet werden.')
    }
  }

  async function handleRemoveAvatar() {
    setPhotoMenu(false)
    setError(null)
    try {
      await saveAvatar(null)
      setAvatar(null)
      onAvatarChange(null)
      showSuccess('Profilbild entfernt')
    } catch {
      setError('Profilbild konnte nicht entfernt werden.')
    }
  }

  async function handleSaveIdentity(event: React.FormEvent) {
    event.preventDefault()
    const cleanName = nameDraft.trim() || 'Athlet'
    const next: UserProfile = {
      ...profile,
      displayName: cleanName,
      bio: bioDraft.trim(),
      goal: goalDraft,
      weeklyTarget: Math.min(7, Math.max(1, weeklyDraft)),
    }
    setBusy(true)
    setError(null)
    try {
      await saveProfile(next)
      setProfile(next)
      onNameChange(next.displayName)
      setEditingProfile(false)
      showSuccess('Profil gespeichert')
    } catch {
      setError('Profil konnte nicht gespeichert werden.')
    } finally {
      setBusy(false)
    }
  }

  const visiblePrs = showAllPrs ? stats.personalRecords : stats.personalRecords.slice(0, 5)

  if (connections) return <ConnectionsPage userId={user.id} displayName={profile.displayName} initialTab={connections}
    onEnable={async () => { await saveProfile(profile); await enableSocialProfile() }}
    onBack={() => {
      setConnections(null)
      requestAnimationFrame(() => {
        if (!connectionEntry.current) return
        document.getElementById(`profile-${connectionEntry.current.tab}`)?.focus({ preventScroll: true })
        window.scrollTo(0, connectionEntry.current.scroll)
      })
    }} />

  return (
    <section className="mt-5 space-y-5">
      {/* 1. Athleten-Header mit Profilbild-Upload */}
      <div className="rounded-2xl border border-line/[0.08] bg-surface p-4 shadow-lg">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={`Profilbild von ${profile.displayName}`}
                  className="h-22 w-22 rounded-full object-cover ring-2 ring-neon/80"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-22 w-22 items-center justify-center rounded-full bg-gradient-to-br from-neon to-neon/60 text-2xl font-bold tracking-tight text-black shadow-md"
                >
                  {initials}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Profilbild auswählen"
                onChange={(event) => void handleFileSelect(event)}
              />
              <button
                type="button"
                aria-label="Profilbild ändern"
                aria-expanded={avatar ? photoMenu : undefined}
                onClick={() => (avatar ? setPhotoMenu((open) => !open) : fileInputRef.current?.click())}
                className="absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full border-2 border-surface bg-control text-accent-ink shadow-md transition-transform hover:bg-control-hover active:scale-95"
              >
                <CameraIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold tracking-tight text-foreground">{profile.displayName}</h2>
                <span className="rounded-full bg-neon/15 px-2.5 py-0.5 text-xs font-semibold text-accent-ink ring-1 ring-neon/30">
                  {GOAL_LABELS[profile.goal]}
                </span>
              </div>
              {profile.bio ? (
                <p className="mt-1 text-sm text-foreground/85">{profile.bio}</p>
              ) : (
                <p className="mt-1 text-sm text-muted">{user.email}</p>
              )}
              <p className="mt-1 text-xs text-muted">Mitglied seit {memberSince}</p>
            </div>
          </div>

          {photoMenu && (
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Profilbild">
              <button type="button" className={SECONDARY_BUTTON} onClick={() => fileInputRef.current?.click()}>Neues Foto</button>
              <button type="button" className={`${SECONDARY_BUTTON} text-danger`} onClick={() => void handleRemoveAvatar()}>Foto entfernen</button>
            </div>
          )}

          <ConnectionsSummary userId={user.id} onOpen={tab => {
            connectionEntry.current = { tab, scroll: window.scrollY }
            setConnections(tab)
          }} />
          <button
            type="button"
            onClick={() => {
              setNameDraft(profile.displayName)
              setBioDraft(profile.bio)
              setGoalDraft(profile.goal)
              setWeeklyDraft(profile.weeklyTarget)
              setEditingProfile((current) => !current)
            }}
            className={`${SECONDARY_BUTTON} w-full`}
          >
            {editingProfile ? 'Schließen' : 'Profil bearbeiten'}
          </button>
        </div>

        {feedback && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-success">
            <CheckIcon className="h-4 w-4" />
            {feedback}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}

        {editingProfile && (
          <form onSubmit={(event) => void handleSaveIdentity(event)} className="mt-4 space-y-3 border-t border-line/[0.08] pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-foreground/85">
                Anzeigename
                <input
                  className={`${fieldClass} mt-1`}
                  value={nameDraft}
                  maxLength={40}
                  onChange={(event) => setNameDraft(event.target.value)}
                  placeholder="Dein Name"
                />
              </label>
              <label className="block text-sm font-medium text-foreground/85">
                Trainingsziel
                <select
                  className={`${fieldClass} mt-1`}
                  value={goalDraft}
                  onChange={(event) => setGoalDraft(event.target.value as TrainingGoal)}
                >
                  <option value="hypertrophy">Muskelaufbau</option>
                  <option value="strength">Maximalkraft</option>
                  <option value="cut">Definition & Fettabbau</option>
                  <option value="fitness">Allgemeine Fitness</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
              <label className="block text-sm font-medium text-foreground/85">
                Motto / Trainings-Split
                <input
                  className={`${fieldClass} mt-1`}
                  value={bioDraft}
                  maxLength={80}
                  onChange={(event) => setBioDraft(event.target.value)}
                  placeholder="z. B. Push / Pull / Beine · Fokus Progression"
                />
              </label>
              <label className="block text-sm font-medium text-foreground/85">
                Wochenziel (Tage)
                <select
                  className={`${fieldClass} mt-1`}
                  value={weeklyDraft}
                  onChange={(event) => setWeeklyDraft(Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                    <option key={days} value={days}>
                      {days}× pro Woche
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="min-h-11 rounded-xl bg-control px-4 text-sm font-medium text-muted"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={busy}
                className="min-h-11 rounded-xl bg-neon px-5 text-sm font-semibold text-black shadow-sm transition-transform active:scale-95 disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. Wochenziel mit Serie */}
      <div className="rounded-2xl border border-line/[0.08] bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Wochenziel</h2>
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-success">
            {stats.activeWeeksStreak} {stats.activeWeeksStreak === 1 ? 'Woche' : 'Wochen'} Serie
          </span>
        </div>
        <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
          {stats.thisWeekWorkouts} <span className="text-base font-medium text-muted">/ {profile.weeklyTarget} {profile.weeklyTarget === 1 ? 'Training' : 'Trainings'}</span>
        </p>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-control">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              stats.weekProgress >= 1 ? 'bg-success' : 'bg-neon'
            }`}
            style={{ width: `${Math.round(stats.weekProgress * 100)}%` }}
          />
        </div>
      </div>

      {/* 3. Körperdaten mit Messungen und Berechnungen */}
      <BodyCard profile={profile} today={today} onProfileChange={setProfile} />

      {/* 4. Persönliche Rekorde (PRs & 1RM) */}
      <div>
        <div className="rounded-2xl border border-line/[0.08] bg-surface p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon/15 text-accent-ink">
                <TrophyIcon className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">Persönliche Rekorde (PRs)</h3>
              </div>
            </div>
          </div>

          {stats.personalRecords.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">
              Sobald du deine ersten Sätze speicherst, erscheinen hier deine Bestleistungen.
            </p>
          ) : (
            <>
              <ul className="mt-3 divide-y divide-line/[0.06]">
                {visiblePrs.map((pr) => (
                  <li key={pr.name} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{pr.name}</p>
                      <p className="text-xs tabular-nums text-muted">
                        {SHORT_DATE.format(new Date(`${pr.date}T12:00:00`))}
                      </p>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      {pr.maxWeightKg !== null ? (
                        <>
                          <p className="text-sm font-bold text-success">
                            {formatWeight(pr.maxWeightKg)} × {pr.bestSetReps}
                          </p>
                          {pr.estimated1RmKg !== null && (
                            <p className="text-xs font-medium text-accent-ink">
                              1RM ~ {formatWeight(pr.estimated1RmKg)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm font-bold text-success">{pr.maxRepsOnly} Wdh.</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {stats.personalRecords.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllPrs((current) => !current)}
                  className="mt-2 min-h-11 w-full rounded-xl bg-control text-sm font-medium text-accent-ink"
                >
                  {showAllPrs ? 'Weniger anzeigen' : `Alle ${stats.personalRecords.length} Rekorde anzeigen`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 5. Datenexport. Die Pausenlänge wählst du direkt in der Pausenleiste. */}
      <ExportCard today={today} />

      {user.email && <DeleteAccountCard email={user.email} />}
    </section>
  )
}
