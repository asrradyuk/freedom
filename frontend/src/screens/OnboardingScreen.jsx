import { useState } from 'react'
import styles from './OnboardingScreen.module.css'

const STEPS = [
  {
    icon: '👋',
    title: 'Добро пожаловать в FREEDOM',
    description: 'Приложение для специалистов — репетиторов, психологов, консультантов. Всё что нужно для работы с клиентами в одном месте.',
    nav: null,
  },
  {
    icon: '📅',
    title: 'Встречи',
    description: 'Вкладка «Встречи» показывает все занятия на сегодня и завтра. Быстрый доступ к расписанию и ссылкам на встречи.',
    nav: 'home',
    navIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    icon: '👥',
    title: 'Клиенты',
    description: 'Вкладка «Клиенты» — ваша база. Добавляйте клиентов, ведите занятия, храните материалы и настраивайте напоминания для каждого.',
    nav: 'clients',
    navIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        <path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
      </svg>
    ),
  },
  {
    icon: '🎥',
    title: 'Видеозвонки',
    description: 'У каждого клиента есть постоянная комната для видеозвонков. Нажмите «Начать звонок» в карточке клиента — клиент получит уведомление и сможет подключиться.',
    nav: null,
  },
  {
    icon: '🔔',
    title: 'Напоминания',
    description: 'Включите напоминания в карточке клиента — бот автоматически напомнит о занятии за 24 часа и за 1 час. Укажите Telegram ID клиента чтобы он тоже получал уведомления.',
    nav: null,
  },
  {
    icon: '💳',
    title: 'Подписка',
    description: 'Бесплатно: просмотр клиентов и расписания. С подпиской: создание клиентов, материалы, напоминания и видеозвонки. 599 ₽/месяц.',
    nav: 'profile',
    navIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
  },
]

export function OnboardingScreen({ onDone }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className={styles.screen}>
      <div className={styles.skipRow}>
        <button className={styles.skip} onClick={onDone}>Пропустить</button>
      </div>

      <div className={styles.content}>
        <div className={styles.iconWrap}>
          <span className={styles.icon}>{current.icon}</span>
        </div>

        <h2 className={styles.title}>{current.title}</h2>
        <p className={styles.description}>{current.description}</p>

        {current.nav && (
          <div className={styles.navHint}>
            <div className={styles.navIcon}>{current.navIcon}</div>
            <span className={styles.navLabel}>Вкладка внизу экрана</span>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.dots}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${i === step ? styles.dotActive : ''}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        <button
          className={styles.nextBtn}
          onClick={() => isLast ? onDone() : setStep(s => s + 1)}
        >
          {isLast ? 'Начать работу 🚀' : 'Далее →'}
        </button>

        {step > 0 && (
          <button className={styles.backBtn} onClick={() => setStep(s => s - 1)}>
            ← Назад
          </button>
        )}
      </div>
    </div>
  )
}