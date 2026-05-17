import { useEffect, useState } from 'react'
import { sessionsApi } from '../api'
import { useAppStore } from '../store'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Input } from '../components/ui/Input'
import styles from './SessionsScreen.module.css'

function formatDateTime(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export function SessionsScreen() {
  const { currentClient, setActiveScreen, subscriptionActive } = useAppStore()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState({ scheduled_at: '', payment_status: 'unpaid' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    sessionsApi.list(currentClient.id)
      .then((r) => setSessions(r.data))
      .finally(() => setLoading(false))
  }, [currentClient.id])

  const handleCreate = async () => {
    if (!form.scheduled_at) return
    setSaving(true)
    try {
      const res = await sessionsApi.create(currentClient.id, {
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        payment_status: form.payment_status,
      })
      setSessions((s) => [...s, res.data].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)))
      setSheetOpen(false)
      setForm({ scheduled_at: '', payment_status: 'unpaid' })
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } finally {
      setSaving(false)
    }
  }

  const togglePayment = async (session) => {
    if (!subscriptionActive) return
    const newStatus = session.payment_status === 'paid' ? 'unpaid' : 'paid'
    const res = await sessionsApi.update(currentClient.id, session.id, { payment_status: newStatus })
    setSessions((s) => s.map((x) => (x.id === session.id ? res.data : x)))
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
  }

  const handleDelete = async (id) => {
    if (!subscriptionActive) return
    await sessionsApi.delete(currentClient.id, id)
    setSessions((s) => s.filter((x) => x.id !== id))
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning')
  }

  return (
    <div className="screen">
      <div className={styles.header}>
        <button className={styles.back} onClick={() => setActiveScreen('client')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {currentClient.name}
        </button>
        {subscriptionActive && (
          <Button variant="secondary" size="sm" onClick={() => setSheetOpen(true)}>+ Добавить</Button>
        )}
      </div>

      <div className={styles.titleRow}>
        <h1 className={styles.title}>Занятия</h1>
        <span className={styles.count}>{sessions.length}</span>
      </div>

      {!subscriptionActive && (
        <div style={{ margin: '0 20px 8px', padding: '10px 14px', background: 'var(--blue-light)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--blue-dark)' }}>
          🔒 Просмотр доступен бесплатно. Добавление и редактирование — по подписке.
        </div>
      )}

      <div className="screen-content">
        {loading ? (
          <p className={styles.loading}>Загрузка...</p>
        ) : sessions.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📅</span>
            <p className={styles.emptyTitle}>Нет занятий</p>
            <p className={styles.emptyText}>
              {subscriptionActive ? 'Добавьте первое занятие с клиентом' : 'Занятия появятся здесь когда специалист их добавит'}
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {sessions.map((s, i) => (
              <Card key={s.id} className={styles.card} style={{ animationDelay: `${i * 0.04}s` }}>
                <div className={styles.cardLeft}>
                  <p className={styles.datetime}>{formatDateTime(s.scheduled_at)}</p>
                  <span className={`${styles.badge} ${s.payment_status === 'paid' ? styles.paid : styles.unpaid}`}>
                    {s.payment_status === 'paid' ? 'Оплачено' : 'Не оплачено'}
                  </span>
                  {currentClient.meeting_url && (
                    <a href={currentClient.meeting_url} target="_blank" rel="noreferrer" className={styles.joinLink}>
                      Открыть встречу →
                    </a>
                  )}
                </div>
                {subscriptionActive && (
                  <div className={styles.cardActions}>
                    <button className={styles.payBtn} onClick={() => togglePayment(s)}>
                      {s.payment_status === 'paid' ? '✅' : '⬜'}
                    </button>
                    <button className={styles.delBtn} onClick={() => handleDelete(s.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Новое занятие">
        <Input label="Дата и время" type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))} />
        <div className={styles.paymentToggle}>
          <span className={styles.paymentLabel}>Статус оплаты</span>
          <div className={styles.paymentOptions}>
            {['unpaid', 'paid'].map((v) => (
              <button
                key={v}
                className={`${styles.payOpt} ${form.payment_status === v ? styles.payOptActive : ''}`}
                onClick={() => setForm((f) => ({ ...f, payment_status: v }))}
              >
                {v === 'paid' ? 'Оплачено' : 'Не оплачено'}
              </button>
            ))}
          </div>
        </div>
        <Button variant="primary" size="lg" onClick={handleCreate} disabled={saving || !form.scheduled_at}>
          {saving ? 'Создание...' : 'Добавить занятие'}
        </Button>
      </BottomSheet>
    </div>
  )
}