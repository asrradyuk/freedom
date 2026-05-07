import { useEffect, useState } from 'react'

const WebApp = window.Telegram?.WebApp || {
  ready: () => {},
  expand: () => {},
  showAlert: (msg) => alert(msg),
  BackButton: { show: () => {}, hide: () => {}, onClick: () => {} },
  initDataUnsafe: { user: { first_name: 'Александра', id: 0 } },
}

const DAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

const MOCK_CLIENTS = [
  { id: 1, name: 'Анна', note: 'занятия по математике', paid: true },
  { id: 2, name: 'Иван', note: 'английский, B1', paid: false },
  { id: 3, name: 'Мария', note: 'психология, онлайн', paid: true },
]

const MOCK_LESSONS = [
  { id: 1, clientName: 'Анна', time: '10:00', date: new Date() },
  { id: 2, clientName: 'Иван', time: '14:00', date: new Date() },
  { id: 3, clientName: 'Мария', time: '11:00', date: new Date(Date.now() + 86400000) },
]

export default function App() {
  const [role, setRole] = useState(null)
  const [screen, setScreen] = useState('home')
  const [selectedClient, setSelectedClient] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()
    const tgUser = WebApp.initDataUnsafe?.user
    if (tgUser) setUser(tgUser)
  }, [])

  useEffect(() => {
    if (screen !== 'home') {
      WebApp.BackButton.show()
      WebApp.BackButton.onClick(() => {
        setScreen('home')
        setSelectedClient(null)
      })
    } else {
      WebApp.BackButton.hide()
    }
  }, [screen])

  if (!role) return <RoleScreen onSelect={setRole} />
  if (screen === 'clients') return <ClientsScreen onSelect={(c) => { setSelectedClient(c); setScreen('client') }} />
  if (screen === 'client' && selectedClient) return <ClientCard client={selectedClient} />
  if (screen === 'meetings') return <MeetingsScreen />

  return <HomeScreen user={user} onGoClients={() => setScreen('clients')} onGoMeetings={() => setScreen('meetings')} />
}

function RoleScreen({ onSelect }) {
  return (
    <div style={s.page}>
      <div style={s.roleWrap}>
        <div style={s.logo}>FREEDOM</div>
        <div style={s.roleTitle}>Кто вы?</div>
        <div style={s.roleSub}>Выберите роль для входа</div>
        <div style={s.roleBtn('#B5D4F4')} onClick={() => onSelect('specialist')}>
          <div style={s.roleBtnLabel('#0C447C')}>Я специалист</div>
          <div style={s.roleBtnSub('#185FA5')}>репетитор, психолог</div>
        </div>
        <div style={s.roleBtn('#D3D1C7')} onClick={() => onSelect('client')}>
          <div style={s.roleBtnLabel('#2C2C2A')}>Я клиент</div>
          <div style={s.roleBtnSub('#5F5E5A')}>хочу записаться на занятие</div>
        </div>
      </div>
    </div>
  )
}

function HomeScreen({ user, onGoClients, onGoMeetings }) {
  const today = new Date()
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 2 + i)
    return d
  })
  const todayLessons = MOCK_LESSONS.filter(l => l.date.toDateString() === today.toDateString())
  const tomorrowLessons = MOCK_LESSONS.filter(l => {
    const tom = new Date(today); tom.setDate(today.getDate() + 1)
    return l.date.toDateString() === tom.toDateString()
  })

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>FREEDOM</div>
        {user && <div style={s.headerSub}>Привет, {user.first_name}!</div>}
        <div style={s.subBadge}>✅ Подписка активна</div>
      </div>
      <div style={s.body}>
        <div style={s.calRow}>
          {days.map((d, i) => {
            const isToday = d.toDateString() === today.toDateString()
            return (
              <div key={i} style={{ ...s.calDay, ...(isToday ? s.calDayActive : {}) }}>
                <div style={{ fontSize: 10, color: isToday ? '#B5D4F4' : '#888780' }}>{DAYS[d.getDay()]}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: isToday ? '#fff' : '#2C2C2A' }}>{d.getDate()}</div>
              </div>
            )
          })}
        </div>

        <div style={s.folder('#B5D4F4')} onClick={onGoMeetings}>
          <div style={s.folderTitle('#0C447C')}>📅 Мои встречи</div>
          <div style={s.folderSub('#185FA5')}>сегодня и завтра</div>
          {todayLessons.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={s.dayLabel}>Сегодня</div>
              {todayLessons.map(l => <LessonRow key={l.id} lesson={l} />)}
            </div>
          )}
          {tomorrowLessons.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={s.dayLabel}>Завтра</div>
              {tomorrowLessons.map(l => <LessonRow key={l.id} lesson={l} />)}
            </div>
          )}
        </div>

        <div style={s.folder('#D3D1C7')} onClick={onGoClients}>
          <div style={s.folderTitle('#2C2C2A')}>👥 Мои клиенты</div>
          <div style={s.folderSub('#5F5E5A')}>{MOCK_CLIENTS.length} активных клиента</div>
        </div>
      </div>
    </div>
  )
}

function LessonRow({ lesson }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#378ADD', flexShrink: 0 }} />
      <div style={{ fontSize: 11, color: '#185FA5', width: 36, flexShrink: 0 }}>{lesson.time}</div>
      <div style={{ fontSize: 11, color: '#0C447C', fontWeight: 500 }}>{lesson.clientName}</div>
    </div>
  )
}

function MeetingsScreen() {
  const today = new Date()
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const todayLessons = MOCK_LESSONS.filter(l => l.date.toDateString() === today.toDateString())
  const tomorrowLessons = MOCK_LESSONS.filter(l => l.date.toDateString() === tomorrow.toDateString())

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>📅 Встречи</div>
        <div style={s.headerSub}>{today.getDate()} {MONTHS[today.getMonth()]}</div>
      </div>
      <div style={s.body}>
        {todayLessons.length > 0 && <>
          <div style={s.sectionLabel}>Сегодня</div>
          {todayLessons.map(l => <MeetingCard key={l.id} lesson={l} />)}
        </>}
        {tomorrowLessons.length > 0 && <>
          <div style={{ ...s.sectionLabel, marginTop: 16 }}>Завтра</div>
          {tomorrowLessons.map(l => <MeetingCard key={l.id} lesson={l} />)}
        </>}
        {!todayLessons.length && !tomorrowLessons.length && <div style={s.empty}>Встреч нет</div>}
      </div>
    </div>
  )
}

function MeetingCard({ lesson }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid #D3D1C7', borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#B5D4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2A' }}>{lesson.clientName}</div>
        <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>{lesson.time}</div>
      </div>
      <button style={{ background: '#378ADD', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500 }}
        onClick={() => WebApp.showAlert('Видеозвонки — скоро!')}>
        Начать
      </button>
    </div>
  )
}

function ClientsScreen({ onSelect }) {
  const [clients, setClients] = useState(MOCK_CLIENTS)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')

  const addClient = () => {
    if (!newName.trim()) return
    setClients([...clients, { id: Date.now(), name: newName, note: newNote, paid: false }])
    setNewName(''); setNewNote(''); setShowAdd(false)
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>👥 Мои клиенты</div>
        <div style={s.headerSub}>{clients.length} клиента</div>
      </div>
      <div style={{ ...s.body, paddingBottom: 90 }}>
        {clients.map(c => (
          <div key={c.id} style={s.clientCard} onClick={() => onSelect(c)}>
            <div style={s.avatar}>{c.name[0]}{c.name.split(' ')[1]?.[0] || ''}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2A' }}>{c.name}</div>
              {c.note ? <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>{c.note}</div> : null}
              <div style={{ marginTop: 4 }}>
                <span style={{ ...s.tag, ...(c.paid ? s.tagBlue : s.tagGray) }}>{c.paid ? 'оплачено' : 'не оплачено'}</span>
              </div>
            </div>
            <div style={{ fontSize: 20, color: '#D3D1C7' }}>›</div>
          </div>
        ))}
        {showAdd && (
          <div style={{ background: '#fff', border: '0.5px solid #D3D1C7', borderRadius: 12, padding: 14, marginTop: 8 }}>
            <input style={s.input} placeholder="Имя клиента" value={newName} onChange={e => setNewName(e.target.value)} />
            <input style={{ ...s.input, marginTop: 8 }} placeholder="Пометка (необязательно)" value={newNote} onChange={e => setNewNote(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button style={s.btnSecondary} onClick={() => setShowAdd(false)}>Отмена</button>
              <button style={{ ...s.btnPrimary, flex: 1 }} onClick={addClient}>Добавить</button>
            </div>
          </div>
        )}
      </div>
      <div style={s.bottomBar}>
        <button style={s.addBtn} onClick={() => setShowAdd(!showAdd)}>+ Добавить клиента</button>
      </div>
    </div>
  )
}

function ClientCard({ client }) {
  const [activeTab, setActiveTab] = useState('lessons')
  const tabs = [
    { id: 'lessons', label: '📅 Занятия' },
    { id: 'materials', label: '📁 Материалы' },
    { id: 'meeting', label: '🎥 Встреча' },
    { id: 'reminders', label: '🔔 Напоминания' },
  ]
  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={s.avatar}>{client.name[0]}{client.name.split(' ')[1]?.[0] || ''}</div>
          <div>
            <div style={s.headerTitle}>{client.name}</div>
            {client.note && <div style={s.headerSub}>{client.note}</div>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '0.5px solid #D3D1C7', background: '#fff' }}>
        {tabs.map(t => (
          <button key={t.id} style={{ ...s.tab, ...(activeTab === t.id ? s.tabActive : {}) }} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div style={s.body}>
        {activeTab === 'lessons' && <LessonsTab />}
        {activeTab === 'materials' && <MaterialsTab />}
        {activeTab === 'meeting' && <MeetingTab />}
        {activeTab === 'reminders' && <RemindersTab />}
      </div>
    </div>
  )
}

function LessonsTab() {
  const [lessons, setLessons] = useState([
    { id: 1, date: '07.05.2026', time: '10:00', paid: true },
    { id: 2, date: '14.05.2026', time: '10:00', paid: false },
  ])
  const [showAdd, setShowAdd] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  const add = () => {
    if (!date || !time) return
    setLessons([...lessons, { id: Date.now(), date, time, paid: false }])
    setDate(''); setTime(''); setShowAdd(false)
  }

  return (
    <div style={{ paddingBottom: 90 }}>
      {lessons.map(l => (
        <div key={l.id} style={{ ...s.clientCard, cursor: 'default' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{l.date}</div>
            <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>{l.time}</div>
          </div>
          <span style={{ ...s.tag, ...(l.paid ? s.tagBlue : s.tagGray) }}>{l.paid ? 'оплачено' : 'не оплачено'}</span>
        </div>
      ))}
      {showAdd && (
        <div style={{ background: '#fff', border: '0.5px solid #D3D1C7', borderRadius: 12, padding: 14, marginTop: 8 }}>
          <input type="date" style={s.input} value={date} onChange={e => setDate(e.target.value)} />
          <input type="time" style={{ ...s.input, marginTop: 8 }} value={time} onChange={e => setTime(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={s.btnSecondary} onClick={() => setShowAdd(false)}>Отмена</button>
            <button style={{ ...s.btnPrimary, flex: 1 }} onClick={add}>Добавить</button>
          </div>
        </div>
      )}
      <div style={s.bottomBar}>
        <button style={s.addBtn} onClick={() => setShowAdd(!showAdd)}>+ Добавить занятие</button>
      </div>
    </div>
  )
}

function MaterialsTab() {
  return (
    <div>
      <div style={s.empty}>Файлов пока нет</div>
      <div style={s.bottomBar}>
        <button style={s.addBtn} onClick={() => WebApp.showAlert('Загрузка файлов — скоро!')}>+ Загрузить файл</button>
      </div>
    </div>
  )
}

function MeetingTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, color: '#888780' }}>Постоянная комната для видеозвонков</div>
      <button style={s.btnPrimary} onClick={() => WebApp.showAlert('Видеозвонки — скоро!')}>🎥 Начать встречу</button>
      <button style={s.btnSecondary} onClick={() => WebApp.showAlert('Ссылка скопирована!')}>🔗 Скопировать ссылку</button>
    </div>
  )
}

function RemindersTab() {
  const [enabled, setEnabled] = useState(false)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '0.5px solid #D3D1C7' }}>
        <span style={{ fontSize: 15 }}>Включить напоминания</span>
        <button style={{ padding: '6px 16px', borderRadius: 20, background: enabled ? '#378ADD' : '#D3D1C7', color: enabled ? '#fff' : '#2C2C2A', fontSize: 13, fontWeight: 500 }}
          onClick={() => setEnabled(!enabled)}>
          {enabled ? 'Вкл' : 'Выкл'}
        </button>
      </div>
      {enabled && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#888780' }}>
          <div>📨 Клиенту: за 24ч и за 1ч до занятия</div>
          <div>📨 Вам: за 1ч до занятия</div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#FAFAF7' },
  header: { background: '#B5D4F4', padding: '14px 16px' },
  headerTitle: { fontFamily: "'Unbounded', sans-serif", fontSize: 16, fontWeight: 700, color: '#0C447C' },
  headerSub: { fontSize: 12, color: '#185FA5', marginTop: 3 },
  subBadge: { fontSize: 11, background: 'rgba(255,255,255,0.4)', borderRadius: 20, padding: '3px 10px', display: 'inline-block', marginTop: 6, color: '#0C447C' },
  body: { padding: 14 },
  calRow: { display: 'flex', gap: 6, marginBottom: 14 },
  calDay: { flex: 1, textAlign: 'center', borderRadius: 8, padding: '6px 0', background: '#fff', border: '0.5px solid #D3D1C7' },
  calDayActive: { background: '#378ADD', border: '0.5px solid #378ADD' },
  folder: (bg) => ({ background: bg, borderRadius: 14, padding: 14, marginBottom: 10, cursor: 'pointer' }),
  folderTitle: (color) => ({ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, color }),
  folderSub: (color) => ({ fontSize: 11, color, marginTop: 3 }),
  dayLabel: { fontSize: 10, color: '#185FA5', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase' },
  sectionLabel: { fontSize: 11, fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  clientCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fff', borderRadius: 12, marginBottom: 8, cursor: 'pointer', border: '0.5px solid #D3D1C7' },
  avatar: { width: 40, height: 40, borderRadius: '50%', background: '#B5D4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: 14, color: '#0C447C', flexShrink: 0 },
  tag: { display: 'inline-block', borderRadius: 6, padding: '2px 8px', fontSize: 11 },
  tagBlue: { background: '#E6F1FB', color: '#185FA5' },
  tagGray: { background: '#F1EFE8', color: '#5F5E5A' },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #D3D1C7', fontSize: 14, background: '#FAFAF7', outline: 'none', fontFamily: "'Inter', sans-serif" },
  btnPrimary: { width: '100%', padding: 13, background: '#378ADD', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 500 },
  btnSecondary: { flex: 1, padding: 11, background: '#D3D1C7', color: '#2C2C2A', borderRadius: 10, fontSize: 13 },
  bottomBar: { position: 'fixed', bottom: 0, left: 0, right: 0, padding: '10px 14px', background: '#FAFAF7', borderTop: '0.5px solid #D3D1C7' },
  addBtn: { width: '100%', padding: 13, background: '#378ADD', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 500, fontFamily: "'Unbounded', sans-serif" },
  tab: { flexShrink: 0, padding: '10px 12px', background: 'none', fontSize: 12, color: '#888780', borderBottom: '2px solid transparent', borderRadius: 0, whiteSpace: 'nowrap' },
  tabActive: { color: '#378ADD', borderBottom: '2px solid #378ADD', fontWeight: 500 },
  empty: { textAlign: 'center', color: '#888780', padding: '40px 0', fontSize: 14 },
  logo: { fontFamily: "'Unbounded', sans-serif", fontSize: 22, fontWeight: 700, color: '#0C447C', marginBottom: 32, textAlign: 'center' },
  roleWrap: { padding: '60px 20px 20px' },
  roleTitle: { fontFamily: "'Unbounded', sans-serif", fontSize: 18, fontWeight: 700, color: '#2C2C2A', textAlign: 'center', marginBottom: 6 },
  roleSub: { fontSize: 13, color: '#888780', textAlign: 'center', marginBottom: 24 },
  roleBtn: (bg) => ({ background: bg, borderRadius: 14, padding: '16px', marginBottom: 10, cursor: 'pointer' }),
  roleBtnLabel: (color) => ({ fontFamily: "'Unbounded', sans-serif", fontSize: 14, fontWeight: 700, color }),
  roleBtnSub: (color) => ({ fontSize: 12, color, marginTop: 4 }),
}