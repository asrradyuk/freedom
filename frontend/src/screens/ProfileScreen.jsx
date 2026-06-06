import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../store'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import api, { BASE_API_URL } from '../api'
import styles from './ProfileScreen.module.css'

const BOT_USERNAME = 'freedom_call_bot'
const API_ORIGIN = BASE_API_URL.replace('/api/v1', '')

function Avatar({ avatarUrl, tgId, name, size = 88, radius = 28, onError }) {
  const [err, setErr] = useState(false)

  useEffect(() => { setErr(false) }, [avatarUrl])

  const handleError = () => {
    setErr(true)
    onError?.()
  }

  const src = !err && avatarUrl
    ? avatarUrl.startsWith('http') ? avatarUrl : `${API_ORIGIN}${avatarUrl}`
    : !err && tgId
    ? `${BASE_API_URL}/profile/tg-avatar/${tgId}`
    : null

  const initials = (name || '?').charAt(0).toUpperCase()

  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: 'var(--blue-light)', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: 'var(--blue-dark)',
      fontFamily: 'var(--font-display)', flexShrink: 0, position: 'relative',
    }}>
      {src
        ? <img
            src={src}
            alt={name}
            onError={handleError}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        : <span style={{ position: 'relative', zIndex: 1 }}>{initials}</span>
      }
      {!src && <span style={{ position: 'relative', zIndex: 1 }}>{initials}</span>}
    </div>
  )
}

export function ProfileScreen() {
  const { user, setUser, setActiveScreen, subscriptionActive, setRole, clients } = useAppStore()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    setDisplayName(user?.display_name || user?.first_name || '')
  }, [user])

  const handleAvatarError = async () => {
    if (user?.avatar_url && user.avatar_url.startsWith('/api/v1/profile/avatar/')) {
      try {
        const res = await api.delete('/profile/avatar')
        setUser(res.data)
      } catch {}
    }
  }

  const handleSave = async () => {
    if (!displayName.trim()) return
    setSaving(true)
    try {
      const res = await api.patch('/profile/', { display_name: displayName.trim() })
      setUser(res.data)
      setEditing(false)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/profile/avatar', form)
      setUser(res.data)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  const handleCopyInvite = () => {
    const link = `https://t.me/${BOT_USERNAME}?start=specialist_${user?.tg_id}`
    navigator.clipboard?.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
  }

  const tgLink = user?.username ? `https://t.me/${user.username}` : null
  const expiresAt = user?.subscription_expires_at
    ? new Date(user.subscription_expires_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : '—'

  return (
    <div className="screen">
      <div className={styles.header}>
        <h1 className={styles.title}>Аккаунт</h1>
      </div>

      <div className="screen-content">
        <div className={styles.hero}>
          <div className={styles.avatarWrap} onClick={() => !uploadingAvatar && fileRef.current?.click()}>
            <Avatar
              avatarUrl={user?.avatar_url}
              tgId={user?.tg_id}
              name={user?.display_name || user?.first_name}
              size={88}
              radius={28}
              onError={handleAvatarError}
            />
            <div className={styles.avatarOverlay}>
              <span>{uploadingAvatar ? '⏳' : '📷'}</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />

          {editing ? (
            <div className={styles.nameEdit}>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Твоё имя"
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !displayName.trim()}>
                  {saving ? '...' : 'Сохранить'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  setEditing(false)
                  setDisplayName(user?.display_name || user?.first_name || '')
                }}>
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.nameRow}>
              <p className={styles.name}>{user?.display_name || user?.first_name || 'Специалист'}</p>
              <button className={styles.editNameBtn} onClick={() => setEditing(true)}>✏️</button>
            </div>
          )}

          {tgLink && (
            <a href={tgLink} target="_blank" rel="noreferrer" className={styles.tgLink}>
              @{user.username}
            </a>
          )}
        </div>

        <Card className={styles.subCard} variant={subscriptionActive ? 'flat' : 'default'}>
          <div className={styles.subRow}>
            <div>
              <p className={styles.subLabel}>Подписка</p>
              <p className={styles.subStatus}>
                {subscriptionActive ? `✅ Активна до ${expiresAt}` : '❌ Не активна'}
              </p>
            </div>
            {!subscriptionActive && (
              <Button variant="primary" size="sm" onClick={() => setActiveScreen('subscription')}>
                Оформить
              </Button>
            )}
          </div>
        </Card>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <p className={styles.statNum}>{clients?.length || 0}</p>
            <p className={styles.statLabel}>Клиентов</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statNum}>{memberSince}</p>
            <p className={styles.statLabel}>С нами с</p>
          </div>
        </div>

        <Card variant="flat" className={styles.inviteCard}>
          <p className={styles.inviteTitle}>Ссылка для клиентов</p>
          <p className={styles.inviteText}>Отправь клиенту — он сразу попадёт в приложение</p>
          <button className={styles.inviteBtn} onClick={handleCopyInvite}>
            {copied ? '✅ Скопировано!' : '🔗 Скопировать ссылку'}
          </button>
        </Card>

        <Card variant="flat" className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Telegram ID</span>
            <span className={styles.infoValue}>{user?.tg_id}</span>
          </div>
          {user?.username && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Username</span>
              <a href={tgLink} target="_blank" rel="noreferrer" className={styles.infoLink}>
                @{user.username}
              </a>
            </div>
          )}
          {createdAt && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>В FREEDOM с</span>
              <span className={styles.infoValue}>{createdAt}</span>
            </div>
          )}
        </Card>

        <button
          className={styles.switchRoleBtn}
          onClick={() => {
            setRole(null)
            window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium')
          }}
        >
          Сменить роль
        </button>
      </div>
    </div>
  )
}