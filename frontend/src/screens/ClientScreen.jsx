import { useState } from 'react'
import { clientsApi, BASE_API_URL } from '../api'
import { useAppStore } from '../store'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Input, Textarea } from '../components/ui/Input'
import styles from './ClientScreen.module.css'

const API_ORIGIN = BASE_API_URL.replace('/api/v1', '')

function ClientAvatar({ client, size = 80 }) {
  const [error, setError] = useState(false)
  const src = client.avatar_url
    ? client.avatar_url.startsWith('http')
      ? client.avatar_url
      : `${API_ORIGIN}${client.avatar_url}`
    : client.client_tg_id
    ? `${BASE_API_URL}/profile/tg-avatar/${client.client_tg_id}`
    : null
  const radius = Math.round(size * 0.3)
  const initials = client.name.charAt(0).toUpperCase()

  if (src && !error) {
    return (
      <img
        src={src}
        alt={client.name}
        onError={() => setError(true)}
        style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover' }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: 'var(--blue-light)', color: 'var(--blue-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontSize: size * 0.4, fontWeight: 700,
    }}>
      {initials}
    </div>
  )
}

export function ClientScreen() {
  const { currentClient, updateClient, removeClient, setActiveScreen, setCurrentClient, subscriptionActive } = useAppStore()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [form, setForm] = useState({
    name: currentClient?.name || '',
    note: currentClient?.note || '',
    meeting_url: currentClient?.meeting_url || '',
    client_tg_id: currentClient?.client_tg_id || '',
    reminders_enabled: currentClient?.reminders_enabled || false,
    reminder_text: currentClient?.reminder_text || '',
  })
  const [saving, setSaving] = useState(false)

  if (!currentClient) return null
  const client = currentClient

  const goBack = () => {
    setActiveScreen('clients')
    setCurrentClient(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await clientsApi.update(client.id, {
        ...form,
        client_tg_id: form.client_tg_id ? Number(form.client_tg_id) : null,
        reminder_text: form.reminder_text || null,
        meeting_url: form.meeting_url || null,
      })
      updateClient(res.data)
      setEditOpen(false)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await clientsApi.delete(client.id)
      removeClient(client.id)
      setActiveScreen('clients')
      setCurrentClient(null)
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    }
  }

  const handleMeetingPress = () => {
    if (client.meeting_url) {
      window.open(client.meeting_url, '_blank')
    } else if (subscriptionActive && client.livekit_room) {
      setActiveScreen('call')
    }
  }

  const hasMeeting = client.meeting_url || (subscriptionActive && client.livekit_room)
  const meetingLabel = client.meeting_url ? 'Открыть встречу' : '📹 Начать звонок'

  return (
    <div className="screen">
      <div className={styles.header}>
        <button className={styles.back} onClick={goBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Клиенты
        </button>
        {subscriptionActive && (
          <button className={styles.editBtn} onClick={() => setEditOpen(true)}>Изменить</button>
        )}
      </div>

      <div className={styles.hero}>
        <ClientAvatar client={client} size={80} />
        <h1 className={styles.name}>{client.name}</h1>
        {client.username && (
          <a
            href={`https://t.me/${client.username}`}
            target="_blank"
            rel="noreferrer"
            className={styles.tgLink}
          >
            @{client.username}
          </a>
        )}
        {client.note && <p className={styles.note}>{client.note}</p>}
      </div>

      <div className="screen-content">
        <div className={styles.actions}>
          <ActionButton icon="📅" label="Занятия" onClick={() => setActiveScreen('sessions')} />
          {subscriptionActive && (
            <ActionButton icon="📁" label="Материалы" onClick={() => setActiveScreen('materials')} />
          )}
        </div>

        {hasMeeting && (
          <Card className={styles.meetingCard}>
            <p className={styles.sectionLabel}>Встреча</p>
            {client.meeting_url && (
              <p className={styles.meetingUrl}>{client.meeting_url}</p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button variant="primary" size="md" style={{ flex: 1 }} onClick={handleMeetingPress}>
                {meetingLabel}
              </Button>
              {client.meeting_url && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    navigator.clipboard?.writeText(client.meeting_url)
                    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
                  }}
                >
                  Скопировать
                </Button>
              )}
            </div>
          </Card>
        )}

        {subscriptionActive && (
          <Card className={styles.infoCard} variant="flat">
            <p className={styles.sectionLabel}>Напоминания</p>
            <div className={styles.reminderRow}>
              <span className={styles.reminderText}>
                {client.reminders_enabled ? '✅ Включены' : '⬜ Выключены'}
              </span>
              {client.reminder_text && (
                <span className={styles.reminderMsg}>«{client.reminder_text}»</span>
              )}
            </div>
          </Card>
        )}

        {!subscriptionActive && (
          <Card variant="flat" className={styles.infoCard}>
            <p className={styles.sectionLabel}>Полный доступ</p>
            <p className={styles.reminderText}>Материалы, напоминания и видеозвонки доступны по подписке</p>
            <Button variant="secondary" size="md" style={{ marginTop: 12, width: '100%' }} onClick={() => setActiveScreen('subscription')}>
              Оформить подписку
            </Button>
          </Card>
        )}

        {subscriptionActive && (
          <button className={styles.deleteBtn} onClick={() => setDeleteOpen(true)}>
            Удалить клиента
          </button>
        )}
      </div>

      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)} title="Редактировать клиента">
        <Input label="Имя" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
        <Textarea label="Заметка" value={form.note} onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))} />
        <Input label="Ссылка на встречу" placeholder="https://meet.google.com/..." value={form.meeting_url} onChange={(e) => setForm(f => ({ ...f, meeting_url: e.target.value }))} />
        <Input label="Telegram ID клиента" placeholder="123456789" value={form.client_tg_id} onChange={(e) => setForm(f => ({ ...f, client_tg_id: e.target.value }))} />
        <div className={styles.toggle}>
          <span>Напоминания</span>
          <button
            className={`${styles.toggleBtn} ${form.reminders_enabled ? styles.on : ''}`}
            onClick={() => setForm(f => ({ ...f, reminders_enabled: !f.reminders_enabled }))}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
        {form.reminders_enabled && (
          <Textarea
            label="Текст напоминания"
            placeholder="Не забудьте про занятие!"
            value={form.reminder_text}
            onChange={(e) => setForm(f => ({ ...f, reminder_text: e.target.value }))}
          />
        )}
        <Button variant="primary" size="lg" onClick={handleSave} disabled={saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </BottomSheet>

      <BottomSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Удалить клиента?">
        <p className={styles.deleteText}>
          Все занятия и материалы клиента <b>{client.name}</b> будут удалены безвозвратно.
        </p>
        <Button variant="danger" size="lg" onClick={handleDelete}>Удалить</Button>
        <Button variant="ghost" size="lg" onClick={() => setDeleteOpen(false)}>Отмена</Button>
      </BottomSheet>
    </div>
  )
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button className={styles.actionBtn} onClick={onClick}>
      <span className={styles.actionIcon}>{icon}</span>
      <span className={styles.actionLabel}>{label}</span>
    </button>
  )
}