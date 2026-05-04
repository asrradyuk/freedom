import { useEffect, useState } from 'react'

const WebApp = window.Telegram?.WebApp || {
  ready: () => {},
  expand: () => {},
  showAlert: (msg) => alert(msg),
  BackButton: { show: () => {}, hide: () => {}, onClick: () => {} },
  initDataUnsafe: { user: { first_name: 'Разработчик', id: 0 } },
}

const MOCK_CLIENTS = [
  { id: 1, name: 'Ася' },
  { id: 2, name: 'Стас' },
]

export default function App() {
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState(MOCK_CLIENTS)
  const [screen, setScreen] = useState('home') 
  const [selectedClient, setSelectedClient] = useState(null)

  useEffect(() => {
    WebApp.ready()

    WebApp.expand()

    const tgUser = WebApp.initDataUnsafe?.user
    if (tgUser) {
      setUser(tgUser)
    }
  }, [])

  useEffect(() => {
    if (screen === 'client') {
      WebApp.BackButton.show()
      WebApp.BackButton.onClick(() => setScreen('home'))
    } else {
      WebApp.BackButton.hide()
    }
  }, [screen])

  if (screen === 'client' && selectedClient) {
    return <ClientScreen client={selectedClient} />
  }

  return <HomeScreen user={user} clients={clients} onClientClick={(c) => { setSelectedClient(c); setScreen('client') }} />
}

function HomeScreen({ user, clients, onClientClick }) {
  return (
    <div style={styles.page}>
      {/* Хедер */}
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>🌿 FREEDOM</div>
          {user && (
            <div style={styles.headerSub}>Привет, {user.first_name}!</div>
          )}
        </div>
        <div style={styles.subscriptionBadge}>
          ✅ Подписка активна
        </div>
      </div>

      {/* Список клиентов */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Мои клиенты</div>

        {clients.length === 0 ? (
          <div style={styles.empty}>Пока нет клиентов. Добавьте первого!</div>
        ) : (
          clients.map(client => (
            <div
              key={client.id}
              style={styles.clientCard}
              onClick={() => onClientClick(client)}
            >
              <div style={styles.clientAvatar}>
                {client.name[0]}
              </div>
              <div style={styles.clientName}>{client.name}</div>
              <div style={styles.clientArrow}>›</div>
            </div>
          ))
        )}
      </div>

      {/* Кнопка добавить */}
      <div style={styles.bottomBar}>
        <button
          style={styles.addButton}
          onClick={() => WebApp.showAlert('Форма добавления клиента — скоро!')}
        >
          + Добавить клиента
        </button>
      </div>
    </div>
  )
}

function ClientScreen({ client }) {
  const [activeTab, setActiveTab] = useState('lessons')

  const tabs = [
    { id: 'lessons', label: '📅 Занятия' },
    { id: 'materials', label: '📁 Материалы' },
    { id: 'meeting', label: '🎥 Встреча' },
    { id: 'reminders', label: '🔔 Напоминания' },
  ]

  return (
    <div style={styles.page}>
      <div style={styles.clientHeader}>
        <div style={styles.clientHeaderAvatar}>{client.name[0]}</div>
        <div style={styles.clientHeaderName}>{client.name}</div>
      </div>

      {/* Табы */}
      <div style={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Контент таба */}
      <div style={styles.tabContent}>
        {activeTab === 'lessons' && <LessonsTab />}
        {activeTab === 'materials' && <MaterialsTab />}
        {activeTab === 'meeting' && <MeetingTab />}
        {activeTab === 'reminders' && <RemindersTab />}
      </div>
    </div>
  )
}

function LessonsTab() {
  return (
    <div>
      <div style={styles.sectionTitle}>Занятия</div>
      <div style={styles.empty}>Занятий пока нет</div>
      <div style={styles.bottomBar}>
        <button style={styles.addButton} onClick={() => WebApp.showAlert('Форма добавления занятия — скоро!')}>
          + Добавить занятие
        </button>
      </div>
    </div>
  )
}

function MaterialsTab() {
  return (
    <div>
      <div style={styles.sectionTitle}>Материалы</div>
      <div style={styles.empty}>Файлов пока нет</div>
      <div style={styles.bottomBar}>
        <button style={styles.addButton} onClick={() => WebApp.showAlert('Загрузка файлов — скоро!')}>
          + Загрузить файл
        </button>
      </div>
    </div>
  )
}

function MeetingTab() {
  return (
    <div>
      <div style={styles.sectionTitle}>Встреча</div>
      <div style={styles.meetingCard}>
        <div style={styles.meetingText}>Постоянная комната для видеозвонков</div>
        <button style={styles.meetingButton} onClick={() => WebApp.showAlert('Видеозвонки — скоро!')}>
          🎥 Начать встречу
        </button>
        <button style={styles.copyButton} onClick={() => WebApp.showAlert('Ссылка скопирована!')}>
          🔗 Скопировать ссылку
        </button>
      </div>
    </div>
  )
}

function RemindersTab() {
  const [enabled, setEnabled] = useState(false)
  return (
    <div>
      <div style={styles.sectionTitle}>Напоминания</div>
      <div style={styles.reminderRow}>
        <span>Включить напоминания</span>
        <button
          style={{ ...styles.toggle, ...(enabled ? styles.toggleOn : {}) }}
          onClick={() => setEnabled(!enabled)}
        >
          {enabled ? 'Вкл' : 'Выкл'}
        </button>
      </div>
      {enabled && (
        <div style={styles.reminderInfo}>
          <div>📨 Клиенту: за 24ч и за 1ч до занятия</div>
          <div>📨 Вам: за 1ч до занятия</div>
        </div>
      )}
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', paddingBottom: 80 },
  header: { background: '#2F4F4F', color: '#fff', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 700 },
  headerSub: { fontSize: 13, opacity: 0.85, marginTop: 2 },
  subscriptionBadge: { fontSize: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 10px' },
  section: { padding: '16px' },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color, #888)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  empty: { textAlign: 'center', color: 'var(--tg-theme-hint-color, #888)', padding: '40px 0', fontSize: 15 },
  clientCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', borderRadius: 12, marginBottom: 8, cursor: 'pointer' },
  clientAvatar: { width: 40, height: 40, borderRadius: '50%', background: '#A9A9A9', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, flexShrink: 0 },
  clientName: { flex: 1, fontSize: 16 },
  clientArrow: { fontSize: 22, color: 'var(--tg-theme-hint-color, #888)' },
  bottomBar: { position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'var(--tg-theme-bg-color, #fff)', borderTop: '1px solid var(--tg-theme-secondary-bg-color, #eee)' },
  addButton: { width: '100%', padding: '14px', background: '#2F4F4F', color: 'var(--tg-theme-button-text-color, #fff)', borderRadius: 12, fontSize: 16, fontWeight: 600 },
  clientHeader: { padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  clientHeaderAvatar: { width: 52, height: 52, borderRadius: '50%', background: '#A9A9A9', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24 },
  clientHeaderName: { fontSize: 20, fontWeight: 700 },
  tabs: { display: 'flex', overflowX: 'auto', padding: '0 16px', gap: 8, borderBottom: '1px solid var(--tg-theme-secondary-bg-color, #eee)', paddingBottom: 0 },
  tab: { flexShrink: 0, padding: '10px 14px', background: 'none', fontSize: 13, color: 'var(--tg-theme-hint-color, #888)', borderBottom: '2px solid transparent', borderRadius: 0 },
  tabActive: { color: '#2F4F4F', borderBottom: '2px solid #2F4F4F', fontWeight: 600 },
  tabContent: { padding: '16px' },
  meetingCard: { background: 'var(--tg-theme-secondary-bg-color, #f5f5f5)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  meetingText: { fontSize: 14, color: 'var(--tg-theme-hint-color, #888)', marginBottom: 4 },
  meetingButton: { padding: '13px', background: '#2F4F4F', color: '#fff', borderRadius: 12, fontSize: 15, fontWeight: 600 },
  copyButton: { padding: '13px', background: 'var(--tg-theme-secondary-bg-color, #eee)', color: 'var(--tg-theme-text-color, #1a1a1a)', borderRadius: 12, fontSize: 15 },
  reminderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--tg-theme-secondary-bg-color, #eee)' },
  toggle: { padding: '6px 16px', borderRadius: 20, background: 'var(--tg-theme-secondary-bg-color, #ddd)', fontSize: 14 },
  toggleOn: { background: '#2F4F4F', color: '#fff' },
  reminderInfo: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: 'var(--tg-theme-hint-color, #888)' },
}