import { useEffect, useState } from 'react'
import { clientsApi } from './api/index.js'
import { useAppStore } from './store/index.js'
import { useTelegram } from './hooks/useTelegram.js'
import { BottomNav } from './components/layout/BottomNav'
import { HomeScreen } from './screens/HomeScreen'
import { ClientsScreen } from './screens/ClientsScreen'
import { ClientScreen } from './screens/ClientScreen'
import { SessionsScreen } from './screens/SessionsScreen'
import { MaterialsScreen } from './screens/MaterialsScreen'
import { SubscriptionScreen } from './screens/SubscriptionScreen'

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

const SCREENS = {
  home: HomeScreen,
  clients: ClientsScreen,
  client: ClientScreen,
  sessions: SessionsScreen,
  materials: MaterialsScreen,
  subscription: SubscriptionScreen,
}

export default function App() {
  useTelegram()
  const { activeScreen, setUser, setClients } = useAppStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData || ''
    Promise.all([
      fetch('/api/v1/auth', { headers: { 'X-Init-Data': initData } })
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null),
      clientsApi.list().then((r) => r.data).catch(() => []),
    ])
      .then(([user, clients]) => {
        if (user) setUser(user)
        setClients(clients)
      })
      .finally(() => setReady(true))
  }, [])

  if (!ready) return <LoadingScreen />

  const Screen = SCREENS[activeScreen] || HomeScreen
  return (
    <>
      <Screen />
      <BottomNav />
    </>
  )
}
