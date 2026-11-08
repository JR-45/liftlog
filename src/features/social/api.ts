import { socialSearchPattern } from '../../domain/social'
import { normalizeUsername } from '../../domain/username'
import { supabase } from '../../lib/supabase'
import type { UserProfile } from '../profile/api'

export type SocialTab = 'followers' | 'following'
export type Relationship = 'none' | 'pending' | 'accepted'
export type SocialSummary = { enabled: boolean; followers: number; following: number }
export type Person = {
  user_id: string; display_name: string; username: string; avatar: string | null; is_private: boolean
  followers_count: number; relationship: Relationship; following: boolean
}
export type PeoplePage = { people: Person[]; hasMore: boolean }
/** Was angenommene Follower sehen: Name, Wochenziel, Gym-Tage und den Plan nur, wenn veröffentlicht. */
export type SharedPlanDay = { weekday: number; name: string; exercises: { name: string; setsMin: number; setsMax: number; repsMin: number | null; repsMax: number | null; durationMin: number | null; durationMax: number | null }[] }
export type SharedOverview = { profile: { displayName: string; weeklyTarget: number }; gymDays: string[]; plan: SharedPlanDay[] | null }
/** Eigene Sichtbarkeit: Wer folgen darf und ob der Trainingsplan veröffentlicht ist. */
export type Sharing = { is_private: boolean; share_plan: boolean }
export const PEOPLE_PAGE_SIZE = 20
const DIRECTORY_COLUMNS = 'user_id, display_name, username, avatar, is_private, followers_count'
type DirectoryPerson = Omit<Person, 'relationship' | 'following'>

async function withRelationships(people: DirectoryPerson[], viewerId: string): Promise<Person[]> {
  if (!people.length) return []
  const { data, error } = await supabase.from('follows').select('followed_user_id, status')
    .eq('user_id', viewerId).in('followed_user_id', people.map(person => person.user_id))
  if (error) throw error
  const relationships = new Map(data.map(row => [row.followed_user_id, row.status as Relationship]))
  return people.map(person => {
    const relationship = relationships.get(person.user_id) ?? 'none'
    return { ...person, relationship, following: relationship === 'accepted' }
  })
}

/** null, wenn die Person ihr Profil nicht sichtbar gemacht hat. */
export async function loadAccount(personId: string, viewerId: string): Promise<Person | null> {
  const { data, error } = await supabase.from('social_directory').select(DIRECTORY_COLUMNS).eq('user_id', personId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return (await withRelationships([data as DirectoryPerson], viewerId))[0]!
}

export async function loadSocialSummary(userId: string): Promise<SocialSummary> {
  const [profile, following] = await Promise.all([
    supabase.from('social_directory').select('followers_count').eq('user_id', userId).maybeSingle(),
    supabase.from('visible_follows').select('*', { head: true, count: 'exact' }).eq('user_id', userId),
  ])
  if (profile.error) throw profile.error
  if (following.error) throw following.error
  if (!profile.data) return { enabled: false, followers: 0, following: 0 }
  return { enabled: true, followers: profile.data.followers_count ?? 0, following: following.count ?? 0 }
}

export async function enableSocialProfile(): Promise<void> {
  const { error } = await supabase.rpc('enable_social_profile')
  if (error) throw error
}

/** Profil verbergen: nicht mehr auffindbar, alle Folgebeziehungen werden entfernt. Eigene Daten bleiben. */
export async function disableSocialProfile(userId: string): Promise<void> {
  const { error } = await supabase.from('social_profiles').delete().eq('user_id', userId)
  if (error) throw error
}

export async function loadSharing(userId: string): Promise<Sharing> {
  const { data, error } = await supabase.from('social_profiles').select('is_private, share_plan').eq('user_id', userId).single()
  if (error) throw error
  return data
}

export async function saveSharing(userId: string, sharing: Sharing): Promise<void> {
  const { error } = await supabase.from('social_profiles').update(sharing).eq('user_id', userId)
  if (error) throw error
}

export async function saveUsername(userId: string, input: string): Promise<string> {
  const username = normalizeUsername(input)
  if (!username) throw new Error('Benutzername geht so nicht: 3 bis 40 Zeichen, nur Kleinbuchstaben, Zahlen, Punkt und Unterstrich.')
  const { error } = await supabase.from('social_profiles').update({ username }).eq('user_id', userId)
  if (error?.code === '23505') throw new Error('Dieser Benutzername ist bereits vergeben.')
  if (error) throw new Error('Benutzername konnte nicht gespeichert werden.')
  return username
}

export async function saveProfileIdentity(profile: UserProfile, input: string): Promise<string> {
  const username = normalizeUsername(input)
  if (!username) throw new Error('Benutzername geht so nicht: 3 bis 40 Zeichen, nur Kleinbuchstaben, Zahlen, Punkt und Unterstrich.')
  const { error } = await supabase.rpc('save_profile_identity', {
    p_username: username, p_name: profile.displayName, p_bio: profile.bio, p_goal: profile.goal, p_weekly_target: profile.weeklyTarget,
  })
  if (error?.code === '23505') throw new Error('Dieser Benutzername ist bereits vergeben.')
  if (error) throw new Error('Profil konnte nicht gespeichert werden.')
  return username
}

export async function setFollowing(personId: string, following: boolean, viewerId?: string): Promise<void> {
  const actor = viewerId ?? (await supabase.auth.getUser()).data.user?.id
  if (!actor || actor === personId) throw new Error('Ungültige Folgeaktion.')
  // Die Datenbank bestimmt anhand der Kontoprivatsphäre, ob eine Anfrage nötig ist.
  const result = following
    ? await supabase.from('follows').upsert({ followed_user_id: personId }, { onConflict: 'user_id,followed_user_id', ignoreDuplicates: true })
    : await supabase.from('follows').delete().eq('user_id', actor).eq('followed_user_id', personId)
  if (result.error) throw result.error
}

export async function loadPeople(viewerId: string, tab: SocialTab, query: string, page: number, ownerId = viewerId): Promise<PeoplePage> {
  const from = page * PEOPLE_PAGE_SIZE
  let people: DirectoryPerson[]
  if (query) {
    const pattern = socialSearchPattern(query)
    if (!pattern) throw new Error('Bitte 2 bis 50 Zeichen eingeben.')
    const { data, error } = await supabase.rpc('search_social_accounts', { p_query: query, p_offset: from })
    if (error) throw error
    people = data as DirectoryPerson[]
  } else {
    const incoming = tab === 'followers'
    const { data, error } = await supabase.from('visible_follows').select('user_id, followed_user_id')
      .eq(incoming ? 'followed_user_id' : 'user_id', ownerId)
      .order(incoming ? 'user_id' : 'followed_user_id').range(from, from + PEOPLE_PAGE_SIZE)
    if (error) throw error
    const ids = data.map(row => incoming ? row.user_id : row.followed_user_id).filter((id): id is string => id !== null)
    if (!ids.length) return { people: [], hasMore: false }
    const accounts = await supabase.from('social_directory').select(DIRECTORY_COLUMNS).in('user_id', ids)
    if (accounts.error) throw accounts.error
    const positions = new Map(ids.map((id, index) => [id, index]))
    people = (accounts.data as DirectoryPerson[]).sort((a, b) => positions.get(a.user_id)! - positions.get(b.user_id)!)
  }
  const hasMore = people.length > PEOPLE_PAGE_SIZE
  return { people: await withRelationships(people.slice(0, PEOPLE_PAGE_SIZE), viewerId), hasMore }
}

export async function loadSharedOverview(personId: string): Promise<SharedOverview | null> {
  const { data, error } = await supabase.from('shared_profile_overviews').select('overview').eq('user_id', personId).maybeSingle()
  if (error) throw error
  return data?.overview as unknown as SharedOverview | null ?? null
}

/** Anzahl offener Folgeanfragen an mich, für das rote Abzeichen. */
export async function countRequests(userId: string): Promise<number> {
  const { count, error } = await supabase.from('follows').select('user_id', { count: 'exact', head: true })
    .eq('followed_user_id', userId).eq('status', 'pending')
  if (error) throw error
  return count ?? 0
}

export async function loadRequests(userId: string): Promise<Person[]> {
  const { data, error } = await supabase.from('follows').select('user_id').eq('followed_user_id', userId).eq('status', 'pending').order('created_at').limit(50)
  if (error) throw error
  if (!data.length) return []
  const people = await supabase.from('social_directory').select(DIRECTORY_COLUMNS).in('user_id', data.map(row => row.user_id))
  if (people.error) throw people.error
  return withRelationships(people.data as DirectoryPerson[], userId)
}

export async function decideRequest(userId: string, requesterId: string, accept: boolean): Promise<void> {
  const query = accept ? supabase.from('follows').update({ status: 'accepted' }) : supabase.from('follows').delete()
  const { error } = await query.eq('followed_user_id', userId).eq('user_id', requesterId).eq('status', 'pending')
  if (error) throw error
}
