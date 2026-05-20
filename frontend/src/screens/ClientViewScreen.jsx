import { useEffect, useState } from 'react'
import { useAppStore } from '../store'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import api from '../api'
import styles from './ClientViewScreen.module.css'

const BASE_URL = 'https://freedom-b3m3.onrender.com/api/v1'

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

function fileIcon(mime) {
  if (!mime) return '📄'
  if (mime.startsWith('image/')) return '🖼️'
  if (mime.includes('pdf')) return '📑'
  if (mime.includes('word') || mime.includes('document')) return '📝'
  if (mime.includes('sheet') || mime.includes('excel')) return '📊'
  if (mime.startsWith('video/')) return '🎬'
  if (mime.startsWith('audio/')) return '🎵'
  return '📄'
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

const TABS = ['sessions', 'materials']
const TAB_LABELS = { sessions: '📅 Занятия', materials: '📁 Материалы' }

export function ClientViewScreen() {
  const { setRole } = useAppStore()
  const [clientInfo, setClientInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('sessions')
  const [callToken, setCallToken] = useState(null)
  const [joiningCall, setJoiningCall] = useState(false)

  useEffect(() => {
    const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    if (!tgId) { setLoading(false); return }

    api.get(`/clients/by-tg/${tgId}`)
      .then(r => setClientInfo(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleJoinCall = async () => {
    if (!clientInfo?.livekit_room) return
    setJoiningCall(true)
    try {
      const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
      const res = await api.post(
        `/livekit/client-token/${clientInfo.client_id}?tg_id=${tgId}`
      )
      const { token, url } = res.data
      setCallToken({ token, url, room: res.data.room })
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setJoiningCall(false)
    }
  }

  if (callToken) {
    return <ClientCallScreen token={callToken} onLeave={() => setCallToken(null)} />
  }

  const groups = clientInfo ? groupSessions(clientInfo.sessions || []) : {}
  const hasUpcoming = Object.keys(groups).length > 0
  const materials = clientInfo?.materials || []

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Мои занятия</h1>
          {clientInfo?.specialist_name && (
            <p className={styles.subtitle}>Специалист: {clientInfo.specialist_name}</p>
          )}
        </div>
        <button className={styles.roleBtn} onClick={() => setRole(null)}>
          Сменить роль
        </button>
      </div>

      {clientInfo && (
        <div className={styles.actions}>
          {clientInfo.meeting_url && (
            <a href={clientInfo.meeting_url} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
              <Button variant="primary" size="md" style={{ width: '100%' }}>
                🔗 Открыть встречу
              </Button>
            </a>
          )}
          {clientInfo.livekit_room && (
            <Button
              variant="secondary"
              size="md"
              style={{ flex: 1 }}
              onClick={handleJoinCall}
              disabled={joiningCall}
            >
              {joiningCall ? '...' : '📹 Подключиться'}
            </Button>
          )}
        </div>
      )}

      {clientInfo && (
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
              onClick={() => setTab(t)}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      <div className={styles.content}>
        {loading ? (
          <div className={styles.empty}><div className={styles.spinner} /></div>
        ) : !clientInfo ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📅</span>
            <p className={styles.emptyTitle}>Вы не привязаны к специалисту</p>
            <p className={styles.emptyText}>
              Попросите специалиста добавить ваш Telegram ID в вашу карточку
            </p>
          </div>
        ) : tab === 'sessions' ? (
          !hasUpcoming ? (
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
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))
          )
        ) : (
          materials.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>📁</span>
              <p className={styles.emptyTitle}>Нет материалов</p>
              <p className={styles.emptyText}>Специалист ещё не добавил материалы</p>
            </div>
          ) : (
            <div className={styles.list}>
              {materials.map(m => (
                <Card key={m.id} className={styles.materialCard}>
                  <span className={styles.fileIcon}>{fileIcon(m.mime_type)}</span>
                  <div className={styles.fileInfo}>
                    <p className={styles.fileName}>{m.original_name}</p>
                    <p className={styles.fileMeta}>{formatSize(m.file_size)}</p>
                  </div>
                  <a
                    href={`${BASE_URL}/clients/${clientInfo.client_id}/materials/${m.id}/download`}
                    className={styles.downloadBtn}
                    download={m.original_name}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </a>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function ClientCallScreen({ token, onLeave }) {
  useEffect(() => {
    const { Room, RoomEvent, Track } = require('livekit-client')
  }, [])

  return (
    <div style={{ height: '100dvh', background: '#1C1C1E', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <p style={{ color: '#fff', fontSize: 17, fontWeight: 600 }}>Подключение к звонку...</p>
      <button
        onClick={onLeave}
        style={{ background: '#FF453A', color: '#fff', border: 'none', borderRadius: 20, padding: '12px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
      >
        Выйти
      </button>
    </div>
  )
}