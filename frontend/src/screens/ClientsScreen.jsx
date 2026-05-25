import { useState } from 'react'
import { clientsApi } from '../api'
import { useAppStore } from '../store'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Input, Textarea } from '../components/ui/Input'
import styles from './ClientsScreen.module.css'

const BASE_URL = 'https://freedom-b3m3.onrender.com'

function ClientAvatar({ client, size = 44 }) {
  const [error, setError] = useState(false)
  const src = client.client_avatar_url
    ? client.client_avatar_url.startsWith('http')
      ? client.client_avatar_url
      : `${BASE_URL}${client.client_avatar_url}`
    : null

  const initials = client.name.charAt(0).toUpperCase()
  const radius = Math.round(size * 0.3)

  if (src && !error) {
    return (
      <img
        src={src}
        alt={client.name}
        onError={() => setError(true)}
        style={{
          width: size, height: size, borderRadius: radius,
          objectFit: 'cover', flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: 'var(--blue-light)', color: 'var(--blue-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontSize: size * 0.4,
      fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function ClientCard({ client, onClick }) {
  return (
    <Card className={styles.clientCard} onClick={onClick}>
      <ClientAvatar client={client} size={44} />
      <div className={styles.info}>
        <p className={styles.name}>{client.name}</p>
        {client.note && <p className={styles.note}>{client.note}</p>}
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gray-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </Card>
  )
}

export function ClientsScreen() {
  const { clients, addClient, setCurrentClient, setActiveScreen, subscriptionActive } = useAppStore()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState({ name: '', note: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const openClient = (client) => {
    setCurrentClient(client)
    setActiveScreen('client')
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
  }

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Введите имя клиента'); return }
    setLoading(true)
    setError('')
    try {
      const res = await clientsApi.create({ name: form.name.trim(), note: form.note.trim() || null })
      addClient(res.data)
      setSheetOpen(false)
      setForm({ name: '', note: '' })
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      setError('Не удалось создать клиента')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen">
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Мои клиенты</h1>
          <p className={styles.count}>{clients.length} {declension(clients.length, ['клиент', 'клиента', 'клиентов'])}</p>
        </div>
        {subscriptionActive && (
          <Button variant="primary" size="sm" onClick={() => setSheetOpen(true)}>
            + Добавить
          </Button>
        )}
      </div>

      {!subscriptionActive && (
        <div className={styles.freeBanner}>
          <span>🔒</span>
          <div>
            <p className={styles.freeBannerTitle}>Бесплатный доступ</p>
            <p className={styles.freeBannerText}>Просмотр клиентов и расписания доступен. Для добавления клиентов нужна подписка.</p>
          </div>
          <button className={styles.freeBannerBtn} onClick={() => setActiveScreen('subscription')}>
            Подписка →
          </button>
        </div>
      )}

      <div className="screen-content">
        {clients.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>👥</span>
            <p className={styles.emptyTitle}>Нет клиентов</p>
            {subscriptionActive
              ? <Button variant="primary" onClick={() => setSheetOpen(true)} style={{ marginTop: 16 }}>Добавить клиента</Button>
              : <p className={styles.emptyText}>Оформите подписку чтобы добавлять клиентов</p>
            }
          </div>
        ) : (
          <div className={styles.list}>
            {clients.map((c, i) => (
              <div key={c.id} style={{ animationDelay: `${i * 0.05}s` }} className={styles.item}>
                <ClientCard client={c} onClick={() => openClient(c)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Новый клиент">
        <Input label="Имя" placeholder="Анна Смирнова" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Textarea label="Заметка" placeholder="Например: занимается английским, уровень B1" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
        {error && <p className={styles.error}>{error}</p>}
        <Button variant="primary" size="lg" onClick={handleCreate} disabled={loading}>
          {loading ? 'Создание...' : 'Создать клиента'}
        </Button>
      </BottomSheet>
    </div>
  )
}

function declension(n, forms) {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}