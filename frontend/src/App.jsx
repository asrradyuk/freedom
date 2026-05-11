import { useEffect, useState } from 'react'
import { authApi, clientsApi } from './api'
import { useAppStore } from './store'
import { useTelegram } from './hooks/useTelegram'
import { BottomNav } from './components/layout/BottomNav'
import { HomeScreen } from './screens/HomeScreen'
import { ClientsScreen } from './screens/ClientsScreen'
import { ClientScreen } from './screens/ClientScreen'
import { SessionsScreen } from './screens/SessionsScreen'
import { MaterialsScreen } from './screens/MaterialsScreen'
import { SubscriptionScreen } from './screens/SubscriptionScreen'
import { RoleSelectScreen } from './screens/RoleSelectScreen'
import { ClientViewScreen } from './screens/ClientViewScreen'

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', flexDirection: 'column', gap: 16, background: 'var(--milk)',
    }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--gray-dark)' }}>
        FREEDOM
      </p>
      <div className="spinner" />
      <style>{`.spinner { width:32px;height:32px;border-radius:50%;border:3px solid var(--blue-light);border-top-color:var(--blue-mid);animation:spin 0.8s linear infinite; } @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const SPECIALIST_SCREENS = {
  home: HomeScreen,
  clients: ClientsScreen,
  client: ClientScreen,
  sessions: SessionsScreen,
  materials: MaterialsScreen,
  subscription: SubscriptionScreen,
}

export default function App() {
  useTelegram()
  const { activeScreen, setUser, setClients, role } = useAppStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([
      authApi.me().then((r) => r.data).catch(() => null),
      clientsApi.list().then((r) => r.data).catch(() => []),
    ])
      .then(([user, clients]) => {
        if (user) setUser(user)
        setClients(clients)
      })
      .finally(() => setReady(true))
  }, [])

  if (!ready) return <LoadingScreen />

  if (!role) return <RoleSelectScreen />

  if (role === 'client') return <ClientViewScreen />

  const Screen = SPECIALIST_SCREENS[activeScreen] || HomeScreen
  return (
    <>
      <Screen />
      <BottomNav />
    </>
  )
}
