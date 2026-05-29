import { useState } from 'react'
import { useAppStore } from '../store'
import { subscriptionApi, clientsApi } from '../api'
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

export function SubscriptionScreen() {
  const { user, subscriptionActive, setUser, setClients, setActiveScreen } = useAppStore()
  const [loadingPay, setLoadingPay] = useState(false)
  const [loadingCheck, setLoadingCheck] = useState(false)
  const [checkMsg, setCheckMsg] = useState(null)

  const handlePay = async () => {
    setLoadingPay(true)
    try {
      const res = await subscriptionApi.paymentUrl()
      window.open(res.data.url, '_blank')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setLoadingPay(false)
    }
  }

  const handleCheck = async () => {
    setLoadingCheck(true)
    setCheckMsg(null)
    try {
      const [subRes, clientsRes] = await Promise.all([
        subscriptionApi.get(),
        clientsApi.list(),
      ])
      setUser(subRes.data)
      setClients(clientsRes.data)
      if (subRes.data.subscription_status === 'active') {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
        setActiveScreen('home')
      } else {
        setCheckMsg('Оплата ещё не подтверждена. Попробуйте через минуту.')
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
      }
    } catch {
      setCheckMsg('Ошибка проверки. Попробуйте ещё раз.')
    } finally {
      setLoadingCheck(false)
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
              onClick={handleCheck}
              disabled={loadingCheck}
            >
              {loadingCheck ? 'Проверяем...' : 'Я уже оплатил — проверить статус'}
            </button>

            {checkMsg && <p className={styles.checkMsg}>{checkMsg}</p>}
          </>
        )}
      </div>
    </div>
  )
}