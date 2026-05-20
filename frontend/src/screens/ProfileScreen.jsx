import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../store'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import api from '../api'
import styles from './ProfileScreen.module.css'

const BASE_URL = 'https://freedom-b3m3.onrender.com'

export function ProfileScreen() {
  const { user, setUser, setActiveScreen, subscriptionActive } = useAppStore()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    setDisplayName(user?.display_name || user?.first_name || '')
    setAvatarError(false)
  }, [user])

  const avatarSrc = user?.avatar_url
    ? user.avatar_url.startsWith('http')
      ? user.avatar_url
      : `${BASE_URL}${user.avatar_url}`
    : null

  const showAvatar = avatarSrc && !avatarError
  const initials = (user?.display_name || user?.first_name || '?').charAt(0).toUpperCase()

  const handleSave = async () => {
    if (!displayName.trim()) return
    setSaving(true)
    try {
      const res = await api.patch('/profile', { display_name: displayName.trim() })
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
      setAvatarError(false)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setUploadingAvatar(false)
      e.target.value = ''
    }
  }

  const tgLink = user?.username ? `https://t.me/${user.username}` : null

  const expiresAt = user?.subscription_expires_at
    ? new Date(user.subscription_expires_at).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  return (
    <div className="screen">
      <div className={styles.header}>
        <h1 className={styles.title}>Аккаунт</h1>
      </div>

      <div className="screen-content">
        <div className={styles.avatarSection}>
          <div
            className={styles.avatarWrap}
            onClick={() => !uploadingAvatar && fileRef.current?.click()}
          >
            {showAvatar ? (
              <img
                src={avatarSrc}
                alt="avatar"
                className={styles.avatarImg}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className={styles.avatarFallback}>{initials}</div>
            )}
            <div className={styles.avatarOverlay}>
              <span>{uploadingAvatar ? '⏳' : '📷'}</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />

          {editing ? (
            <div className={styles.nameEdit}>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
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
        </Card>
      </div>
    </div>
  )
}