import { useEffect, useState } from 'react'
import { useAppStore } from '../store'
import { Card } from '../components/ui/Card'
import styles from './ClientViewScreen.module.css'

const BASE_URL = 'https://squeamish-progress-roster.ngrok-free.dev/api/v1'

function formatDateTime(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  let dayLabel
  if (d.toDateString() === today.toDateString()) dayLabel = 'Сегодня'
  else if (d.toDateString() === tomorrow.toDateString()) dayLabel = 'Завтра'
  else dayLabel = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })

  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return { dayLabel, time }
}

function groupSessions(sessions) {
  const now = new Date()
  const upcoming = sessions
    .filter(s => new Date(s.scheduled_at) >= now)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))

  const groups = {}
  upcoming.forEach(s => {
    const { dayLabel } = formatDateTime(s.scheduled_at)
    if (!groups[dayLabel]) groups[dayLabel] = []
    groups[dayLabel].push(s)
  })
  return groups
}

export function ClientViewScreen() {
  const { setRole } = useAppStore()
  const [sessions, setSessions] = useState([])
  const [clientInfo, setClientInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    const tgId = tg?.initDataUnsafe?.user?.id
    if (!tgId) { setLoading(false); return }

    fetch(`${BASE_URL}/clients/by-tg/${tgId}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setClientInfo(data)
          setSessions(data.sessions || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const groups = groupSessions(sessions)
  const hasUpcoming = Object.keys(groups).length > 0

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>Мои занятия</h1>
        <button className={styles.roleBtn} onClick={() => setRole(null)}>
          Сменить роль
        </button>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.empty}>
            <div className={styles.spinner} />
          </div>
        ) : !clientInfo ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📅</span>
            <p className={styles.emptyTitle}>Нет предстоящих занятий</p>
            <p className={styles.emptyText}>
              Чтобы видеть расписание, попроси специалиста добавить твой Telegram ID в твою карточку
            </p>
          </div>
        ) : !hasUpcoming ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📅</span>
            <p className={styles.emptyTitle}>Нет предстоящих занятий</p>
            <p className={styles.emptyText}>Следующие занятия появятся здесь</p>
          </div>
        ) : (
          Object.entries(groups).map(([day, daySessions]) => (
            <div key={day} className={styles.group}>
              <p className={styles.dayLabel}>{day}</p>
              <div className={styles.list}>
                {daySessions.map(s => {
                  const { time } = formatDateTime(s.scheduled_at)
                  return (
                    <Card key={s.id} className={styles.card}>
                      <div className={styles.timeBlock}>
                        <p className={styles.time}>{time}</p>
                      </div>
                      <div className={styles.info}>
                        <p className={styles.specialistName}>{clientInfo.specialist_name}</p>
                        <span className={`${styles.badge} ${s.payment_status === 'paid' ? styles.paid : styles.unpaid}`}>
                          {s.payment_status === 'paid' ? 'Оплачено' : 'Не оплачено'}
                        </span>
                      </div>
                      {clientInfo.meeting_url && (
                        <a
                          href={clientInfo.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.joinBtn}
                          onClick={e => e.stopPropagation()}
                        >
                          Войти →
                        </a>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}