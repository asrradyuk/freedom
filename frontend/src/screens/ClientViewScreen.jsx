import { useEffect, useState } from 'react'
import { ClientCallScreen } from './ClientCallScreen'
import { useAppStore } from '../store'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { BottomSheet } from '../components/ui/BottomSheet'
import { livekitApi, BASE_API_URL } from '../api'
import styles from './ClientViewScreen.module.css'

const API_ORIGIN = BASE_API_URL.replace('/api/v1', '')

function formatDateTime(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  const dayStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dDay = dayStart(d).getTime()
  const dToday = dayStart(today).getTime()
  const dTomorrow = dToday + 86400000
  let dayLabel
  if (dDay === dToday) dayLabel = 'Сегодня'
  else if (dDay === dTomorrow) dayLabel = 'Завтра'
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

function Avatar({ url, tgId, name, size = 44, radius = 14 }) {
  const [err, setErr] = useState(false)
  const src = !err
    ? url
      ? url.startsWith('http') ? url : `${API_ORIGIN}${url}`
      : tgId
      ? `${BASE_API_URL}/profile/tg-avatar/${tgId}`
      : null
    : null
  const initials = (name || '?').charAt(0).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: 'var(--blue-light)', overflow: 'hidden',
      flexShrink: 0, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.4,
      fontWeight: 700, color: 'var(--blue-dark)',
    }}>
      {src
        ? <img src={src} alt={name} onError={() => setErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : initials
      }
    </div>
  )
}

const TABS = ['sessions', 'materials']
const TAB_LABELS = { sessions: '📅 Занятия', materials: '📁 Материалы' }

export function ClientViewScreen() {
  const { user, setRole } = useAppStore()
  const [clientInfo, setClientInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('sessions')
  const [callToken, setCallToken] = useState(null)
  const [joiningCall, setJoiningCall] = useState(false)
  const [openingId, setOpeningId] = useState(null)
  const [notesSession, setNotesSession] = useState(null)
  const [notesText, setNotesText] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
  const myTgId = tgUser?.id
  const clientName = tgUser?.first_name || user?.first_name || 'Клиент'
  const clientUsername = tgUser?.username || user?.username

  const fetchClientInfo = () => {
    if (!myTgId) { setLoading(false); return }
    fetch(`${BASE_API_URL}/clients/by-tg/${myTgId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setClientInfo(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchClientInfo() }, [])

  const handleJoinCall = async () => {
    if (!clientInfo?.livekit_room || !myTgId) return
    setJoiningCall(true)
    try {
      const res = await livekitApi.getClientToken(clientInfo.client_id, myTgId)
      setCallToken({ token: res.data.token, url: res.data.url })
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setJoiningCall(false)
    }
  }

  const handleOpenMaterial = async (material) => {
    if (openingId) return
    setOpeningId(material.id)
    try {
      const res = await fetch(
        `${BASE_API_URL}/clients/${clientInfo.client_id}/materials/${material.id}/client-download-url?tg_id=${myTgId}`
      )
      const data = await res.json()
      window.Telegram?.WebApp?.openLink
        ? window.Telegram.WebApp.openLink(data.url)
        : window.open(data.url, '_blank')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setOpeningId(null)
    }
  }

  const openNotes = (session) => {
    setNotesSession(session)
    setNotesText(session.notes || '')
  }

  const saveNotes = async () => {
    if (!notesSession) return
    setNotesSaving(true)
    try {
      const res = await fetch(
        `${BASE_API_URL}/clients/by-tg/${myTgId}/sessions/${notesSession.id}/notes`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: notesText || null }),
        }
      )
      if (res.ok) {
        setClientInfo(prev => ({
          ...prev,
          sessions: prev.sessions.map(s =>
            s.id === notesSession.id ? { ...s, notes: notesText || null } : s
          ),
        }))
        setNotesSession(null)
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      }
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setNotesSaving(false)
    }
  }

  if (callToken) {
    return <ClientCallScreen token={callToken.token} url={callToken.url} onLeave={() => setCallToken(null)} />
  }

  const groups = clientInfo ? groupSessions(clientInfo.sessions || []) : {}
  const materials = clientInfo?.materials || []
  const allUpcoming = Object.values(groups).flat()
  const nextSession = allUpcoming[0]

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.clientInfo}>
          <Avatar url={clientInfo?.client_avatar} tgId={myTgId} name={clientName} size={40} radius={13} />
          <div>
            <p className={styles.clientName}>{clientName}</p>
            {clientUsername && <p className={styles.clientUsername}>@{clientUsername}</p>}
          </div>
        </div>
        <button className={styles.roleBtn} onClick={() => setRole(null)}>Выйти</button>
      </div>

      {clientInfo && (
        <div className={styles.specialistBanner}>
          <Avatar url={clientInfo.specialist_avatar} tgId={clientInfo.specialist_tg_id} name={clientInfo.specialist_name} size={48} radius={15} />
          <div className={styles.specialistInfo}>
            <p className={styles.specialistLabel}>Ваш специалист</p>
            <p className={styles.specialistName}>{clientInfo.specialist_name}</p>
            {clientInfo.specialist_bio && (
              <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2, lineHeight: 1.4 }}>
                {clientInfo.specialist_bio}
              </p>
            )}
          </div>
          <div className={styles.specialistActions}>
            {clientInfo.meeting_url && (
              <button className={styles.actionBtnSm} onClick={() => {
                window.Telegram?.WebApp?.openLink
                  ? window.Telegram.WebApp.openLink(clientInfo.meeting_url)
                  : window.open(clientInfo.meeting_url, '_blank')
              }}>🔗</button>
            )}
            {clientInfo.livekit_room && (
              <button className={styles.actionBtnSm} onClick={handleJoinCall} disabled={joiningCall}>
                {joiningCall ? '...' : '📹'}
              </button>
            )}
          </div>
        </div>
      )}

      {nextSession && (
        <div className={styles.nextSession}>
          <div>
            <p className={styles.nextLabel}>Следующее занятие</p>
            <p className={styles.nextTime}>
              {formatDateTime(nextSession.scheduled_at).dayLabel} · {formatDateTime(nextSession.scheduled_at).time}
            </p>
          </div>
          <span className={`${styles.badge} ${nextSession.payment_status === 'paid' ? styles.paid : styles.unpaid}`}>
            {nextSession.payment_status === 'paid' ? 'Оплачено' : 'Не оплачено'}
          </span>
        </div>
      )}

      {clientInfo && (clientInfo.meeting_url || clientInfo.livekit_room) && (
        <div className={styles.actions}>
          {clientInfo.meeting_url && (
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => {
              window.Telegram?.WebApp?.openLink
                ? window.Telegram.WebApp.openLink(clientInfo.meeting_url)
                : window.open(clientInfo.meeting_url, '_blank')
            }}>🔗 Открыть встречу</Button>
          )}
          {clientInfo.livekit_room && (
            <Button variant="secondary" size="md" style={{ flex: 1 }} onClick={handleJoinCall} disabled={joiningCall}>
              {joiningCall ? '...' : '📹 Подключиться'}
            </Button>
          )}
        </div>
      )}

      {clientInfo && (
        <div className={styles.tabs}>
          {TABS.map(t => (
            <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
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
            <p className={styles.emptyText}>Попросите специалиста добавить ваш Telegram username в вашу карточку</p>
          </div>
        ) : tab === 'sessions' ? (
          Object.keys(groups).length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>📅</span>
              <p className={styles.emptyTitle}>Нет предстоящих занятий</p>
            </div>
          ) : (
            Object.entries(groups).map(([day, daySessions]) => (
              <div key={day} className={styles.group}>
                <p className={styles.dayLabel}>{day}</p>
                <div className={styles.list}>
                  {daySessions.map((s, i) => {
                    const { time } = formatDateTime(s.scheduled_at)
                    const isNext = i === 0 && day === Object.keys(groups)[0]
                    return (
                      <Card key={s.id} className={`${styles.card} ${isNext ? styles.cardNext : ''}`}>
                        <div className={styles.timeBlock}>
                          <p className={styles.time}>{time}</p>
                          {isNext && <span className={styles.nextBadge}>Ближайшее</span>}
                        </div>
                        <div className={styles.info} style={{ flex: 1 }}>
                          <p className={styles.sessionSpecialist}>с {clientInfo.specialist_name}</p>
                          <span className={`${styles.badge} ${s.payment_status === 'paid' ? styles.paid : styles.unpaid}`}>
                            {s.payment_status === 'paid' ? 'Оплачено' : 'Не оплачено'}
                          </span>
                          {s.notes && (
                            <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 4, lineHeight: 1.4 }}>
                              📝 {s.notes.length > 80 ? s.notes.slice(0, 80) + '...' : s.notes}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => openNotes(s)}
                          style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: '4px 0 4px 8px', flexShrink: 0 }}
                        >
                          📝
                        </button>
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
                <Card key={m.id} className={styles.materialCard} onClick={() => handleOpenMaterial(m)}>
                  <span className={styles.fileIcon}>{fileIcon(m.mime_type)}</span>
                  <div className={styles.fileInfo}>
                    <p className={styles.fileName}>{m.original_name}</p>
                    <p className={styles.fileMeta}>{formatSize(m.file_size)}</p>
                  </div>
                  <span className={styles.downloadBtn}>{openingId === m.id ? '...' : '↗'}</span>
                </Card>
              ))}
            </div>
          )
        )}
      </div>

      <BottomSheet open={!!notesSession} onClose={() => setNotesSession(null)} title="Заметки к занятию">
        {notesSession && (
          <>
            <p style={{ fontSize: 13, color: 'var(--gray-mid)', marginBottom: 8 }}>
              {formatDateTime(notesSession.scheduled_at).dayLabel} · {formatDateTime(notesSession.scheduled_at).time}
            </p>
            <textarea
              value={notesText}
              onChange={e => setNotesText(e.target.value)}
              placeholder="Заметки к занятию..."
              style={{
                width: '100%', minHeight: 120, padding: '10px 12px',
                borderRadius: 12, border: '1.5px solid var(--gray-light)',
                fontSize: 14, fontFamily: 'var(--font-body)', resize: 'vertical',
                boxSizing: 'border-box', outline: 'none', color: 'var(--gray-dark)',
              }}
            />
            <Button variant="primary" size="lg" onClick={saveNotes} disabled={notesSaving} style={{ marginTop: 8 }}>
              {notesSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </>
        )}
      </BottomSheet>
    </div>
  )
}