import { useState } from 'react'
import styles from './OnboardingScreen.module.css'

const STEPS = [
  {
    icon: '👋',
    title: 'Добро пожаловать в FREEDOM',
    description: 'Здесь ты увидишь расписание занятий со своим специалистом, сможешь подключаться к видеозвонкам и скачивать материалы.',
  },
  {
    icon: '📅',
    title: 'Занятия',
    description: 'Вкладка «Занятия» показывает все предстоящие встречи с твоим специалистом — дату, время и статус оплаты.',
  },
  {
    icon: '🎥',
    title: 'Видеозвонки',
    description: 'Когда специалист назначит звонок, кнопка «Подключиться» появится прямо на главном экране. Просто нажми и заходи.',
  },
  {
    icon: '📁',
    title: 'Материалы',
    description: 'Все файлы, которые специалист добавит для тебя, будут доступны во вкладке «Материалы» — открывай и скачивай в любое время.',
  },
]

export function ClientOnboardingScreen({ onDone }) {
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

        <button className={styles.nextBtn} onClick={() => isLast ? onDone() : setStep(s => s + 1)}>
          {isLast ? 'Начать 🚀' : 'Далее →'}
        </button>

        {step > 0 && (
          <button className={styles.backBtn} onClick={() => setStep(s => s - 1)}>← Назад</button>
        )}
      </div>
    </div>
  )
}