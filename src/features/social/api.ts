import { socialSearchPattern } from '../../domain/social'
import { supabase } from '../../lib/supabase'

export type SocialTab = 'followers' | 'following'
export type SocialSummary = { enabled: boolean; followers: number; following: number }
export type Person = { user_id: string; display_name: string; avatar: string | null; following: boolean }
export type PeoplePage = { people: Person[]; hasMore: boolean }
export const PEOPLE_PAGE_SIZE = 20

export async function loadSocialSummary(userId: string): Promise<SocialSummary> {
  const [profile, followers, following] = await Promise.all([
    supabase.from('social_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followed_user_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  for (const result of [profile, followers, following]) if (result.error) throw result.error
  return { enabled: profile.data !== null, followers: followers.count ?? 0, following: following.count ?? 0 }
}

export async function enableSocialProfile(): Promise<void> {
  const { error } = await supabase.rpc('enable_social_profile')
  if (error) throw error
}

export async function disableSocialProfile(userId: string): Promise<void> {
  const { error } = await supabase.from('social_profiles').delete().eq('user_id', userId)
  if (error) throw error
}

export async function setFollowing(personId: string, following: boolean): Promise<void> {
  // user_id stammt ausschließlich aus auth.uid(); auch die Löschung ist durch RLS auf eigene Beziehungen beschränkt.
  const result = following
    ? await supabase.from('follows').upsert({ followed_user_id: personId }, { onConflict: 'user_id,followed_user_id', ignoreDuplicates: true })
    : await supabase.from('follows').delete().eq('followed_user_id', personId)
  if (result.error) throw result.error
}

export async function loadPeople(userId: string, tab: SocialTab, query: string, page: number): Promise<PeoplePage> {
  const from = page * PEOPLE_PAGE_SIZE
  let people: Omit<Person, 'following'>[]
  if (query) {
    const pattern = socialSearchPattern(query)
    if (!pattern) throw new Error('Bitte 2 bis 50 Zeichen eingeben.')
    const { data, error } = await supabase.from('social_profiles')
      .select('user_id, display_name, avatar').neq('user_id', userId)
      .ilike('display_name', pattern).order('display_name').order('user_id').range(from, from + PEOPLE_PAGE_SIZE)
    if (error) throw error
    people = data
  } else {
    const incoming = tab === 'followers'
    const { data, error } = await supabase.from('follows')
      .select(incoming
        ? 'person:social_profiles!follows_user_id_fkey(user_id, display_name, avatar)'
        : 'person:social_profiles!follows_followed_user_id_fkey(user_id, display_name, avatar)')
      .eq(incoming ? 'followed_user_id' : 'user_id', userId)
      .order(incoming ? 'user_id' : 'followed_user_id').range(from, from + PEOPLE_PAGE_SIZE)
    if (error) throw error
    // PostgREST unterscheidet die beiden Beziehungen zur selben Tabelle über die FK-Namen.
    people = (data as unknown as { person: Omit<Person, 'following'> | null }[])
      .flatMap(row => row.person ? [row.person] : [])
  }
  const hasMore = people.length > PEOPLE_PAGE_SIZE
  people = people.slice(0, PEOPLE_PAGE_SIZE)
  if (!people.length) return { people: [], hasMore }
  const { data, error } = await supabase.from('follows').select('followed_user_id')
    .eq('user_id', userId).in('followed_user_id', people.map(person => person.user_id))
  if (error) throw error
  const following = new Set(data.map(row => row.followed_user_id))
  return { people: people.map(person => ({ ...person, following: following.has(person.user_id) })), hasMore }
}
