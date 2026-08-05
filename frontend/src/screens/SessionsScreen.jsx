import { useEffect, useState } from 'react'
import { sessionsApi, packagesApi } from '../api'
import { useAppStore } from '../store'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Input, Textarea } from '../components/ui/Input'
import styles from './SessionsScreen.module.css'

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_LABELS = { scheduled: '📅 Запланировано', completed: '✅ Проведено', cancelled: '❌ Отменено' }
const STATUS_NEXT = { scheduled: 'completed', completed: 'cancelled', cancelled: 'scheduled' }

export function SessionsScreen() {
  const { currentClient, setActiveScreen, subscriptionActive } = useAppStore()
  const [sessions, setSessions] = useState([])
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('upcoming')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pkgSheetOpen, setPkgSheetOpen] = useState(false)
  const [detailSession, setDetailSession] = useState(null)
  const [form, setForm] = useState({ scheduled_at: '', payment_status: 'unpaid', notes: '', homework: '', package_id: '' })
  const [pkgForm, setPkgForm] = useState({ name: '', total_sessions: '', price: '' })
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    Promise.all([
      sessionsApi.list(currentClient.id).then(r => setSessions(r.data)).catch(() => {}),
      packagesApi.list(currentClient.id).then(r => setPackages(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [currentClient.id])

  const now = new Date()
  const upcoming = sessions.filter(s => s.status === 'scheduled' && new Date(s.scheduled_at) >= now)
  const archive = sessions.filter(s => s.status !== 'scheduled' || new Date(s.scheduled_at) < now)
  const shown = tab === 'upcoming' ? upcoming : archive

  const handleCreate = async () => {
    if (!form.scheduled_at) return
    setSaving(true)
    try {
      const res = await sessionsApi.create(currentClient.id, {
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        payment_status: form.payment_status,
        notes: form.notes || null,
        homework: form.homework || null,
        package_id: form.package_id || null,
      })
      setSessions(s => [...s, res.data].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)))
      setSheetOpen(false)
      setForm({ scheduled_at: '', payment_status: 'unpaid', notes: '', homework: '', package_id: '' })
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setSaving(false)
    }
  }

  const handleCreatePackage = async () => {
    if (!pkgForm.name || !pkgForm.total_sessions) return
    setSaving(true)
    try {
      const res = await packagesApi.create(currentClient.id, {
        name: pkgForm.name,
        total_sessions: parseInt(pkgForm.total_sessions),
        price: pkgForm.price ? parseInt(pkgForm.price) : null,
      })
      setPackages(p => [res.data, ...p])
      setPkgSheetOpen(false)
      setPkgForm({ name: '', total_sessions: '', price: '' })
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (session) => {
    if (!subscriptionActive || togglingId) return
    const newStatus = STATUS_NEXT[session.status] || 'scheduled'
    setTogglingId(session.id)
    setSessions(s => s.map(x => x.id === session.id ? { ...x, status: newStatus } : x))
    try {
      const res = await sessionsApi.update(currentClient.id, session.id, { status: newStatus })
      setSessions(s => s.map(x => x.id === session.id ? res.data : x))
      setPackages(await packagesApi.list(currentClient.id).then(r => r.data).catch(() => packages))
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
    } catch {
      setSessions(s => s.map(x => x.id === session.id ? session : x))
    } finally {
      setTogglingId(null)
    }
  }

  const togglePayment = async (session) => {
    if (!subscriptionActive || togglingId) return
    const newStatus = session.payment_status === 'paid' ? 'unpaid' : 'paid'
    setTogglingId(session.id + '_pay')
    setSessions(s => s.map(x => x.id === session.id ? { ...x, payment_status: newStatus } : x))
    try {
      const res = await sessionsApi.update(currentClient.id, session.id, { payment_status: newStatus })
      setSessions(s => s.map(x => x.id === session.id ? res.data : x))
    } catch {
      setSessions(s => s.map(x => x.id === session.id ? session : x))
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (session) => {
    if (!subscriptionActive || deletingId) return
    setDeletingId(session.id)
    setSessions(s => s.filter(x => x.id !== session.id))
    try {
      await sessionsApi.delete(currentClient.id, session.id)
      setPackages(await packagesApi.list(currentClient.id).then(r => r.data).catch(() => packages))
    } catch {
      setSessions(s => [...s, session].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)))
    } finally {
      setDeletingId(null)
    }
  }

  const saveDetail = async () => {
    if (!detailSession) return
    setSaving(true)
    try {
      const res = await sessionsApi.update(currentClient.id, detailSession.id, {
        notes: detailSession.notes || null,
        homework: detailSession.homework || null,
      })
      setSessions(s => s.map(x => x.id === res.data.id ? res.data : x))
      setDetailSession(null)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setSaving(false)
    }
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
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setPkgSheetOpen(true)}>📦</Button>
            <Button variant="secondary" size="sm" onClick={() => setSheetOpen(true)}>+ Занятие</Button>
          </div>
        )}
      </div>

      {packages.length > 0 && (
        <div style={{ padding: '0 20px 8px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {packages.map(pkg => (
            <div key={pkg.id} style={{
              background: 'var(--blue-light)', borderRadius: 12, padding: '8px 14px',
              flexShrink: 0, fontSize: 13,
            }}>
              <p style={{ fontWeight: 600, color: 'var(--blue-dark)', margin: 0 }}>{pkg.name}</p>
              <p style={{ color: 'var(--blue-mid)', margin: '2px 0 0' }}>
                {pkg.remaining_sessions}/{pkg.total_sessions} занятий
                {pkg.price ? ` · ${pkg.price} ₽` : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className={styles.tabs} style={{ padding: '0 20px 0' }}>
        {['upcoming', 'archive'].map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {t === 'upcoming' ? '📅 Предстоящие' : '🗂 Архив'}
          </button>
        ))}
      </div>

      <div className="screen-content">
        {loading ? (
          <p className={styles.loading}>Загрузка...</p>
        ) : shown.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>{tab === 'upcoming' ? '📅' : '🗂'}</span>
            <p className={styles.emptyTitle}>{tab === 'upcoming' ? 'Нет предстоящих занятий' : 'Архив пуст'}</p>
          </div>
        ) : (
          <div className={styles.list}>
            {shown.map(s => (
              <Card key={s.id} className={styles.card}>
                <div className={styles.cardLeft}>
                  <p className={styles.datetime}>{formatDateTime(s.scheduled_at)}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    <span className={`${styles.badge} ${s.payment_status === 'paid' ? styles.paid : styles.unpaid}`}>
                      {s.payment_status === 'paid' ? 'Оплачено' : 'Не оплачено'}
                    </span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 20,
                      background: s.status === 'completed' ? '#e8f5e9' : s.status === 'cancelled' ? '#fce4ec' : '#e3f2fd',
                      color: s.status === 'completed' ? '#2e7d32' : s.status === 'cancelled' ? '#c62828' : '#1565c0',
                    }}>
                      {STATUS_LABELS[s.status]}
                    </span>
                  </div>
                  {s.notes && <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 4 }}>📝 {s.notes.slice(0, 60)}{s.notes.length > 60 ? '...' : ''}</p>}
                  {s.homework && <p style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>📚 {s.homework.slice(0, 60)}{s.homework.length > 60 ? '...' : ''}</p>}
                </div>
                {subscriptionActive && (
                  <div className={styles.cardActions}>
                    <button className={styles.payBtn} onClick={() => togglePayment(s)} disabled={!!togglingId}>
                      {s.payment_status === 'paid' ? '✅' : '⬜'}
                    </button>
                    <button onClick={() => toggleStatus(s)} disabled={!!togglingId} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', padding: '4px' }}>
                      {s.status === 'scheduled' ? '▶️' : s.status === 'completed' ? '↩️' : '🔄'}
                    </button>
                    <button className={styles.notesBtn} onClick={() => setDetailSession({ ...s })}>📝</button>
                    <button className={styles.delBtn} onClick={() => handleDelete(s)} disabled={!!deletingId}>
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
        <Input label="Дата и время" type="datetime-local" value={form.scheduled_at}
          onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
        <div className={styles.paymentToggle}>
          <span className={styles.paymentLabel}>Статус оплаты</span>
          <div className={styles.paymentOptions}>
            {['unpaid', 'paid'].map(v => (
              <button key={v}
                className={`${styles.payOpt} ${form.payment_status === v ? styles.payOptActive : ''}`}
                onClick={() => setForm(f => ({ ...f, payment_status: v }))}>
                {v === 'paid' ? 'Оплачено' : 'Не оплачено'}
              </button>
            ))}
          </div>
        </div>
        {packages.length > 0 && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Абонемент</p>
            <select value={form.package_id} onChange={e => setForm(f => ({ ...f, package_id: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid var(--gray-light)', fontSize: 14 }}>
              <option value="">Без абонемента</option>
              {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.remaining_sessions} ост.)</option>)}
            </select>
          </div>
        )}
        <Textarea label="Заметки" placeholder="Тема занятия..." value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        <Textarea label="Домашнее задание" placeholder="Задание на следующее занятие..." value={form.homework}
          onChange={e => setForm(f => ({ ...f, homework: e.target.value }))} />
        <Button variant="primary" size="lg" onClick={handleCreate} disabled={saving || !form.scheduled_at}>
          {saving ? 'Создание...' : 'Добавить занятие'}
        </Button>
      </BottomSheet>

      <BottomSheet open={pkgSheetOpen} onClose={() => setPkgSheetOpen(false)} title="Новый абонемент">
        <Input label="Название" placeholder="Базовый, 8 занятий" value={pkgForm.name}
          onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} />
        <Input label="Количество занятий" type="number" placeholder="8" value={pkgForm.total_sessions}
          onChange={e => setPkgForm(f => ({ ...f, total_sessions: e.target.value }))} />
        <Input label="Стоимость (₽, необязательно)" type="number" placeholder="5000" value={pkgForm.price}
          onChange={e => setPkgForm(f => ({ ...f, price: e.target.value }))} />
        <Button variant="primary" size="lg" onClick={handleCreatePackage} disabled={saving || !pkgForm.name || !pkgForm.total_sessions}>
          {saving ? 'Создание...' : 'Создать абонемент'}
        </Button>
      </BottomSheet>

      <BottomSheet open={!!detailSession} onClose={() => setDetailSession(null)} title="Заметки и ДЗ">
        {detailSession && (
          <>
            <p style={{ fontSize: 13, color: 'var(--gray-mid)', marginBottom: 8 }}>{formatDateTime(detailSession.scheduled_at)}</p>
            <Textarea label="Заметки к занятию" placeholder="Что разбирали..."
              value={detailSession.notes || ''}
              onChange={e => setDetailSession(d => ({ ...d, notes: e.target.value }))} />
            <Textarea label="Домашнее задание" placeholder="Задание на следующий раз..."
              value={detailSession.homework || ''}
              onChange={e => setDetailSession(d => ({ ...d, homework: e.target.value }))} />
            <Button variant="primary" size="lg" onClick={saveDetail} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </>
        )}
      </BottomSheet>
    </div>
  )
}