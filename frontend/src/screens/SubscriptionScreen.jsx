import { useState } from 'react'
import { useAppStore } from '../store'
import { clientsApi, subscriptionApi } from '../api'
import api from '../api'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import styles from './SubscriptionScreen.module.css'

const FEATURES = [
  { icon: '👥', text: 'Ведение клиентов' },
  { icon: '📅', text: 'Планирование занятий' },
  { icon: '🎥', text: 'Видеозвонки через LiveKit' },
  { icon: '🔔', text: 'Автоматические напоминания' },
  { icon: '📁', text: 'Хранение материалов' },
  { icon: '💳', text: 'Учёт оплат' },
]

const FALLBACK_URL = 'https://yookassa.ru/my/i/agDO8i12AyV0/l'

export function SubscriptionScreen() {
  const { user, subscriptionActive, setUser, setClients, setActiveScreen } = useAppStore()
  const [loadingPay, setLoadingPay] = useState(false)
  const [loadingConfirm, setLoadingConfirm] = useState(false)

  const handlePay = async () => {
    setLoadingPay(true)
    try {
      const res = await api.get('/subscription/payment-url')
      const url = res.data?.url || FALLBACK_URL
      window.open(url, '_blank')
    } catch {
      window.open(FALLBACK_URL, '_blank')
    } finally {
      setLoadingPay(false)
    }
  }

  const handleConfirm = async () => {
    setLoadingConfirm(true)
    try {
      const [subRes, clientsRes] = await Promise.all([
        subscriptionApi.confirm(),
        clientsApi.list(),
      ])
      setUser(subRes.data)
      setClients(clientsRes.data)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      setActiveScreen('home')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setLoadingConfirm(false)
    }
  }

  const expiresAt = user?.subscription_expires_at
    ? new Date(user.subscription_expires_at).toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  return (
    <div className="screen">
      <div className={styles.header}>
        <h1 className={styles.title}>Подписка</h1>
      </div>

      <div className="screen-content">
        {subscriptionActive ? (
          <div className={styles.activeBlock}>
            <div className={styles.activeIcon}>✅</div>
            <p className={styles.activeTitle}>Подписка активна</p>
            {expiresAt && <p className={styles.expiresAt}>Действует до {expiresAt}</p>}
          </div>
        ) : (
          <>
            <Card className={styles.priceCard} variant="blue">
              <p className={styles.priceName}>FREEDOM</p>
              <p className={styles.price}>599 ₽<span className={styles.priceUnit}>/месяц</span></p>
              <p className={styles.priceNote}>Всё необходимое для работы со своими клиентами</p>
            </Card>

            <div className={styles.features}>
              {FEATURES.map((f) => (
                <div key={f.text} className={styles.feature}>
                  <span className={styles.featureIcon}>{f.icon}</span>
                  <span className={styles.featureText}>{f.text}</span>
                </div>
              ))}
            </div>

            <Button
              variant="primary"
              size="lg"
              style={{ width: '100%' }}
              onClick={handlePay}
              disabled={loadingPay}
            >
              {loadingPay ? 'Загрузка...' : 'Оплатить подписку — 599 ₽'}
            </Button>

            <button
              className={styles.confirmBtn}
              onClick={handleConfirm}
              disabled={loadingConfirm}
            >
              {loadingConfirm ? 'Проверяем...' : 'Я уже оплатил — подтвердить'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}