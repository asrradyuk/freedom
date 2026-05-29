import { useEffect, useState } from 'react'
import api from '../api'
import { useAppStore } from '../store'
import { Card } from '../components/ui/Card'
import styles from './HomeScreen.module.css'

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
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

function groupByDay(sessions) {
  const groups = {}
  sessions.forEach(s => {
    const label = formatDate(s.scheduled_at)
    if (!groups[label]) groups[label] = []
    groups[label].push(s)
  })
  return groups
}

export function HomeScreen() {
  const { user, clients, setCurrentClient, setActiveScreen } = useAppStore()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/sessions/upcoming')
      .then(r => setSessions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]))
  const groups = groupByDay(sessions)
  const hasAny = sessions.length > 0

  const openClient = (clientId) => {
    const client = clientMap[clientId]
    if (!client) return
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
          Object.entries(groups).map(([day, daySessions], i) => (
            <div key={day} className={styles.group} style={{ animationDelay: `${i * 0.06}s` }}>
              <p className={styles.dayLabel}>{day}</p>
              <div className={styles.sessionList}>
                {daySessions.map(session => (
                  <Card
                    key={session.id}
                    className={styles.sessionCard}
                    onClick={() => openClient(session.client_id)}
                  >
                    <div className={styles.sessionTime}>{formatTime(session.scheduled_at)}</div>
                    <div className={styles.sessionInfo}>
                      <p className={styles.clientName}>{session.client_name}</p>
                      <span className={`${styles.badge} ${session.payment_status === 'paid' ? styles.paid : styles.unpaid}`}>
                        {session.payment_status === 'paid' ? 'Оплачено' : 'Не оплачено'}
                      </span>
                    </div>
                    {session.client_meeting_url && (
                      <a
                        href={session.client_meeting_url}
                        className={styles.joinBtn}
                        onClick={e => e.stopPropagation()}
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