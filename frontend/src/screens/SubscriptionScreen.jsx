import { useAppStore } from '../../store/index.js'
import { subscriptionApi } from '../../api/index.js'
import { Button } from '../../components/ui/Button.jsx'
import { Card } from '../../components/ui/Card.jsx'
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
  const { user, subscriptionActive } = useAppStore()

  const handleConfirm = async () => {
    try {
      await subscriptionApi.confirm()
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
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

            <a href={import.meta.env.VITE_PAYMENT_URL || '#'} target="_blank" rel="noreferrer">
              <Button variant="primary" size="lg">
                Оплатить подписку
              </Button>
            </a>

            <button className={styles.confirmBtn} onClick={handleConfirm}>
              Я уже оплатил — подтвердить
            </button>
          </>
        )}
      </div>
    </div>
  )
}
