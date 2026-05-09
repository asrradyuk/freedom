import { useAppStore } from '../store'
import styles from './ClientViewScreen.module.css'

export function ClientViewScreen() {
  const { setRole } = useAppStore()

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>Мои занятия</h1>
        <button className={styles.roleBtn} onClick={() => setRole(null)}>
          Сменить роль
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📅</span>
          <p className={styles.emptyTitle}>Нет предстоящих занятий</p>
          <p className={styles.emptyText}>
            Чтобы видеть расписание, попроси специалиста добавить твой Telegram ID в твою карточку
          </p>
        </div>
      </div>
    </div>
  )
}
