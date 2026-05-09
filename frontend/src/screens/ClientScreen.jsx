import { useState } from 'react'
import { clientsApi } from '../../api'
import { useAppStore } from '../../store'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Input, Textarea } from '../../components/ui/Input'
import styles from './ClientScreen.module.css'

export function ClientScreen() {
  const { currentClient, updateClient, removeClient, setActiveScreen, setCurrentClient } = useAppStore()
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

  const goBack = () => {
    setActiveScreen('clients')
    setCurrentClient(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await clientsApi.update(currentClient.id, {
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
      await clientsApi.delete(currentClient.id)
      removeClient(currentClient.id)
      setActiveScreen('clients')
      setCurrentClient(null)
    } catch {}
  }

  const client = currentClient

  return (
    <div className="screen">
      <div className={styles.header}>
        <button className={styles.back} onClick={goBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Клиенты
        </button>
        <button className={styles.editBtn} onClick={() => setEditOpen(true)}>
          Изменить
        </button>
      </div>

      <div className={styles.hero}>
        <div className={styles.avatar}>{client.name.charAt(0).toUpperCase()}</div>
        <h1 className={styles.name}>{client.name}</h1>
        {client.note && <p className={styles.note}>{client.note}</p>}
      </div>

      <div className="screen-content">
        <div className={styles.actions}>
          <ActionButton
            icon="📅"
            label="Занятия"
            onClick={() => setActiveScreen('sessions')}
          />
          <ActionButton
            icon="📁"
            label="Материалы"
            onClick={() => setActiveScreen('materials')}
          />
        </div>

        {client.meeting_url && (
          <Card className={styles.meetingCard}>
            <p className={styles.sectionLabel}>Встреча</p>
            <p className={styles.meetingUrl}>{client.meeting_url}</p>
            <a href={client.meeting_url} target="_blank" rel="noreferrer">
              <Button variant="primary" size="md" style={{ marginTop: 12, width: '100%' }}>
                Открыть встречу
              </Button>
            </a>
          </Card>
        )}

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

        <button className={styles.deleteBtn} onClick={() => setDeleteOpen(true)}>
          Удалить клиента
        </button>
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
          <Textarea label="Текст напоминания" placeholder="Не забудьте про занятие!" value={form.reminder_text} onChange={(e) => setForm(f => ({ ...f, reminder_text: e.target.value }))} />
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
