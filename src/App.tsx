import { LoginForm } from './features/auth/LoginForm'
import { useSession } from './features/auth/useSession'
import { HomeScreen } from './features/workout/HomeScreen'

function App() {
  const session = useSession()

  if (session === undefined) return null
  if (session === null) return <LoginForm />
  // key: Ein Wechsel des Users setzt den Zustand der Ansicht vollständig zurück.
  return <HomeScreen key={session.user.id} session={session} />
}

export default App
