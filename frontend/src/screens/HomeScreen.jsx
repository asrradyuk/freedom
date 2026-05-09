import { useEffect, useState } from 'react'
import { sessionsApi, clientsApi } from '../../api/index.js'
import { useAppStore } from '../../store/index.js'
import { Card } from '../../components/ui/Card.jsx'
import styles from './HomeScreen.module.css'

function formatTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  if (d.toDateString() === today.toDateString()) return 'Сегодня'
  if (d.toDateString() === tomorrow.toDateString()) return 'Завтра'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function groupByDay(sessions, clients) {
  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]))
  const now = new Date()
  const dayAfterTomorrow = new Date()
  dayAfterTomorrow.setDate(now.getDate() + 2)
  dayAfterTomorrow.setHours(0, 0, 0, 0)

  const upcoming = sessions
    .filter((s) => new Date(s.scheduled_at) >= now && new Date(s.scheduled_at) < dayAfterTomorrow)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))

  const groups = {}
  upcoming.forEach((s) => {
    const label = formatDate(s.scheduled_at)
    if (!groups[label]) groups[label] = []
    groups[label].push({ ...s, client: clientMap[s.client_id] })
  })
  return groups
}

export function HomeScreen() {
  const { user, clients, setCurrentClient, setActiveScreen } = useAppStore()
  const [allSessions, setAllSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clients.length) { setLoading(false); return }

    Promise.all(clients.map((c) => sessionsApi.list(c.id).then((r) => r.data)))
      .then((results) => setAllSessions(results.flat()))
      .finally(() => setLoading(false))
  }, [clients])

  const groups = groupByDay(allSessions, clients)
  const hasAny = Object.keys(groups).length > 0

  const openClient = (client) => {
    setCurrentClient(client)
    setActiveScreen('client')
  }

  return (
    <div className="screen">
      <div className={styles.header}>
        <div>
          <p className={styles.greeting}>Привет, {user?.first_name || 'специалист'} 👋</p>
          <h1 className={styles.title}>Мои встречи</h1>
        </div>
      </div>

      <div className="screen-content">
        {loading ? (
          <div className={styles.empty}>
            <div className={styles.skeleton} />
            <div className={styles.skeleton} style={{ width: '60%' }} />
          </div>
        ) : !hasAny ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📅</span>
            <p className={styles.emptyTitle}>Нет встреч сегодня</p>
            <p className={styles.emptyText}>Запланированные занятия появятся здесь</p>
          </div>
        ) : (
          Object.entries(groups).map(([day, sessions], i) => (
            <div key={day} className={styles.group} style={{ animationDelay: `${i * 0.06}s` }}>
              <p className={styles.dayLabel}>{day}</p>
              <div className={styles.sessionList}>
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className={styles.sessionCard}
                    onClick={() => session.client && openClient(session.client)}
                  >
                    <div className={styles.sessionTime}>{formatTime(session.scheduled_at)}</div>
                    <div className={styles.sessionInfo}>
                      <p className={styles.clientName}>{session.client?.name || '—'}</p>
                      <span className={`${styles.badge} ${session.payment_status === 'paid' ? styles.paid : styles.unpaid}`}>
                        {session.payment_status === 'paid' ? 'Оплачено' : 'Не оплачено'}
                      </span>
                    </div>
                    {session.client?.meeting_url && (
                      <a
                        href={session.client.meeting_url}
                        className={styles.joinBtn}
                        onClick={(e) => e.stopPropagation()}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Открыть встречу →
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
