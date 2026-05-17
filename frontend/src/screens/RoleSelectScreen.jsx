import { useAppStore } from '../store/store'
import styles from './RoleSelectScreen.module.css'

export function RoleSelectScreen() {
  const { setRole } = useAppStore()

  return (
    <div className={styles.screen}>
      <div className={styles.top}>
        <h1 className={styles.logo}>FREEDOM</h1>
        <p className={styles.sub}>Выбери, как ты используешь приложение</p>
      </div>

      <div className={styles.cards}>
        <button className={styles.card} onClick={() => setRole('specialist')}>
          <span className={styles.cardIcon}>🎓</span>
          <div className={styles.cardContent}>
            <p className={styles.cardTitle}>Я специалист</p>
            <p className={styles.cardDesc}>Репетитор, психолог, консультант — веду клиентов и занятия</p>
          </div>
          <svg className={styles.arrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <button className={styles.card} onClick={() => setRole('client')}>
          <span className={styles.cardIcon}>📚</span>
          <div className={styles.cardContent}>
            <p className={styles.cardTitle}>Я клиент</p>
            <p className={styles.cardDesc}>Ученик или клиент специалиста — смотрю расписание и подключаюсь к встречам</p>
          </div>
          <svg className={styles.arrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      <p className={styles.note}>Можно изменить позже в настройках</p>
    </div>
  )
}
