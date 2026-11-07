import type { User } from '@supabase/supabase-js'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ExportRow } from '../../domain/export'
import { computeAthleteStats, formatVolume } from '../../domain/profile'
import { formatWeight } from '../../domain/sets'
import { CameraIcon, CheckIcon, TrashIcon, TrophyIcon } from '../../lib/icons'
import { loadExportRows } from '../stats/api'
import { ExportCard } from '../stats/ExportCard'
import { REST_OPTIONS, type RestTimer } from '../workout/useRestTimer'
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
  'h-11 w-full rounded-xl border border-transparent bg-[#2C2C2E] px-3.5 text-base text-white placeholder-[#8E8E93]/60 outline-none transition-colors focus:border-[#FFD60A] focus:bg-[#3A3A3C] disabled:opacity-50'

type Props = {
  user: User
  today: string
  defaultWeeklyTarget: number
  restTimer: RestTimer
  onAvatarChange: (avatarUrl: string | null) => void
  onSignOut: () => void
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
        <p role="alert" className="text-sm text-red-300">Dein Profil konnte nicht geladen werden.</p>
        <button
          className="mt-2 py-2 text-sm text-neutral-200 underline"
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
  if (loaded === null) return <p className="mt-6 text-sm text-neutral-400">Profil wird geladen …</p>
  return <ProfileView {...props} initialProfile={loaded.profile} initialAvatar={loaded.avatar} />
}

function ProfileView({
  user,
  today,
  restTimer,
  onAvatarChange,
  onSignOut,
  initialProfile,
  initialAvatar,
}: Props & { initialProfile: UserProfile; initialAvatar: string | null }) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile)
  const [avatar, setAvatar] = useState<string | null>(initialAvatar)
  const [rows, setRows] = useState<ExportRow[]>([])
  const [editingProfile, setEditingProfile] = useState(false)
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

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
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
      setEditingProfile(false)
      showSuccess('Profil gespeichert')
    } catch {
      setError('Profil konnte nicht gespeichert werden.')
    } finally {
      setBusy(false)
    }
  }

  const visiblePrs = showAllPrs ? stats.personalRecords : stats.personalRecords.slice(0, 5)

  return (
    <section className="mt-5 space-y-5">
      {/* 1. Athleten-Header mit Profilbild-Upload */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#1C1C1E] p-4 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={`Profilbild von ${profile.displayName}`}
                  className="h-22 w-22 rounded-full object-cover ring-2 ring-[#FFD60A]/80"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-22 w-22 items-center justify-center rounded-full bg-gradient-to-br from-[#FFD60A] to-[#FF9F0A] text-2xl font-bold tracking-tight text-black shadow-md"
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
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#1C1C1E] bg-[#2C2C2E] text-[#FFD60A] shadow-md transition-transform hover:bg-[#3A3A3C] active:scale-95"
              >
                <CameraIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold tracking-tight text-white">{profile.displayName}</h2>
                <span className="rounded-full bg-[#FFD60A]/15 px-2.5 py-0.5 text-xs font-semibold text-[#FFD60A] ring-1 ring-[#FFD60A]/30">
                  {GOAL_LABELS[profile.goal]}
                </span>
              </div>
              {profile.bio ? (
                <p className="mt-1 text-sm text-[#EBEBF5]/85">{profile.bio}</p>
              ) : (
                <p className="mt-1 text-sm text-[#8E8E93]">{user.email}</p>
              )}
              <p className="mt-1 text-xs text-[#8E8E93]">Mitglied seit {memberSince}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNameDraft(profile.displayName)
                setBioDraft(profile.bio)
                setGoalDraft(profile.goal)
                setWeeklyDraft(profile.weeklyTarget)
                setEditingProfile((current) => !current)
              }}
              className="min-h-11 rounded-xl bg-[#2C2C2E] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#3A3A3C] active:scale-95"
            >
              {editingProfile ? 'Schließen' : 'Profil bearbeiten'}
            </button>
            {avatar && (
              <button
                type="button"
                aria-label="Profilbild entfernen"
                onClick={() => void handleRemoveAvatar()}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2C2C2E] text-[#FF453A] transition-colors hover:bg-[#FF453A]/15 active:scale-95"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {feedback && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#30D158]">
            <CheckIcon className="h-4 w-4" />
            {feedback}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-[#FF453A]">
            {error}
          </p>
        )}

        {editingProfile && (
          <form onSubmit={(event) => void handleSaveIdentity(event)} className="mt-4 space-y-3 border-t border-white/[0.08] pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[#EBEBF5]/85">
                Anzeigename
                <input
                  className={`${fieldClass} mt-1`}
                  value={nameDraft}
                  maxLength={40}
                  onChange={(event) => setNameDraft(event.target.value)}
                  placeholder="Dein Name"
                />
              </label>
              <label className="block text-sm font-medium text-[#EBEBF5]/85">
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
              <label className="block text-sm font-medium text-[#EBEBF5]/85">
                Motto / Trainings-Split
                <input
                  className={`${fieldClass} mt-1`}
                  value={bioDraft}
                  maxLength={80}
                  onChange={(event) => setBioDraft(event.target.value)}
                  placeholder="z. B. Push / Pull / Beine · Fokus Progression"
                />
              </label>
              <label className="block text-sm font-medium text-[#EBEBF5]/85">
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
                className="min-h-11 rounded-xl bg-[#2C2C2E] px-4 text-sm font-medium text-[#8E8E93]"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={busy}
                className="min-h-11 rounded-xl bg-[#FFD60A] px-5 text-sm font-semibold text-black shadow-sm transition-transform active:scale-95 disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. Athleten-Übersicht & Wochenziel */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#1C1C1E] p-4 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">Wochenziel</span>
            <span className="rounded-full bg-[#30D158]/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-[#30D158]">
              {stats.activeWeeksStreak} {stats.activeWeeksStreak === 1 ? 'Woche' : 'Wochen'} Serie
            </span>
          </div>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-white">
            {stats.thisWeekWorkouts} <span className="text-base font-medium text-[#8E8E93]">/ {profile.weeklyTarget} Trainings</span>
          </p>
          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#2C2C2E]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                stats.weekProgress >= 1 ? 'bg-[#30D158]' : 'bg-[#FFD60A]'
              }`}
              style={{ width: `${Math.round(stats.weekProgress * 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1C1C1E] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">Trainings gesamt</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-white">{stats.totalWorkouts}</p>
          <p className="mt-0.5 text-xs text-[#8E8E93]">Absolvierte Einheiten</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1C1C1E] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">Sätze gesamt</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-white">{stats.totalSets}</p>
          <p className="mt-0.5 text-xs text-[#8E8E93]">Geloggte Arbeitssätze</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#1C1C1E] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">Gesamtvolumen</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums text-[#FFD60A]">{formatVolume(stats.totalVolumeKg)}</p>
          <p className="mt-0.5 text-xs text-[#8E8E93]">Bewegtes Gewicht</p>
        </div>
      </div>

      {/* 3. Körperdaten mit Messungen und Berechnungen */}
      <BodyCard profile={profile} today={today} onProfileChange={setProfile} />

      {/* 4. Persönliche Rekorde (PRs & 1RM) */}
      <div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#1C1C1E] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFD60A]/15 text-[#FFD60A]">
                <TrophyIcon className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-bold tracking-tight text-white">Persönliche Rekorde (PRs)</h3>
                <p className="text-xs text-[#8E8E93]">Schwerster Satz & geschätztes 1RM je Übung</p>
              </div>
            </div>
          </div>

          {stats.personalRecords.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#8E8E93]">
              Sobald du deine ersten Sätze speicherst, erscheinen hier deine Bestleistungen.
            </p>
          ) : (
            <>
              <ul className="mt-3 divide-y divide-white/[0.06]">
                {visiblePrs.map((pr) => (
                  <li key={pr.name} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{pr.name}</p>
                      <p className="text-xs tabular-nums text-[#8E8E93]">
                        {SHORT_DATE.format(new Date(`${pr.date}T12:00:00`))}
                      </p>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      {pr.maxWeightKg !== null ? (
                        <>
                          <p className="text-sm font-bold text-[#30D158]">
                            {formatWeight(pr.maxWeightKg)} × {pr.bestSetReps}
                          </p>
                          {pr.estimated1RmKg !== null && (
                            <p className="text-xs font-medium text-[#FFD60A]">
                              1RM ~ {formatWeight(pr.estimated1RmKg)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm font-bold text-[#30D158]">{pr.maxRepsOnly} Wdh.</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {stats.personalRecords.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllPrs((current) => !current)}
                  className="mt-2 min-h-11 w-full rounded-xl bg-[#2C2C2E] text-sm font-medium text-[#FFD60A]"
                >
                  {showAllPrs ? 'Weniger anzeigen' : `Alle ${stats.personalRecords.length} Rekorde anzeigen`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 5. Trainings-Einstellungen & Datenexport */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#1C1C1E] p-4">
        <h3 className="text-base font-bold tracking-tight text-white">Trainings-Einstellungen</h3>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">Standard-Pausenzeit</p>
            <p className="text-xs text-[#8E8E93]">Wird automatisch nach jedem neuen Arbeitssatz gestartet</p>
          </div>
          <div className="flex rounded-xl bg-[#2C2C2E] p-0.5" role="group" aria-label="Standard-Pausenzeit">
            {REST_OPTIONS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                aria-pressed={restTimer.duration === seconds}
                onClick={() => restTimer.chooseDuration(seconds)}
                className={`h-11 min-w-14 rounded-[10px] px-3 text-sm tabular-nums transition-all ${
                  restTimer.duration === seconds
                    ? 'bg-[#FFD60A] font-semibold text-black shadow-sm'
                    : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                {seconds} s
              </button>
            ))}
          </div>
        </div>
      </div>

      <ExportCard today={today} />

      <div className="rounded-2xl border border-white/[0.08] bg-[#1C1C1E] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user.email}</p>
            <p className="text-xs text-[#8E8E93]">Angemeldetes Konto</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="min-h-11 shrink-0 rounded-xl bg-[#FF453A]/15 px-4 text-sm font-semibold text-[#FF453A] transition-colors hover:bg-[#FF453A]/25 active:scale-95"
          >
            Abmelden
          </button>
        </div>
      </div>
    </section>
  )
}
