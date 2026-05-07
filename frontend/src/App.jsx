import { useEffect, useState } from 'react'

const WebApp = window.Telegram?.WebApp || {
  ready: () => {},
  expand: () => {},
  showAlert: (msg) => alert(msg),
  openTelegramLink: (url) => window.open(url),
  BackButton: { show: () => {}, hide: () => {}, onClick: () => {}, offClick: () => {} },
  initDataUnsafe: { user: { first_name: 'Александра', id: 0, username: 'asrradyuk' } },
}

const DAYS = ['вс','пн','вт','ср','чт','пт','сб']
const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']

const MOCK_CLIENTS = [
  { id: 1, name: 'Анна', note: 'математика', username: 'anna_petro', paid: true },
  { id: 2, name: 'Иван', note: 'английский, B1', username: 'ivan_smirnov', paid: false },
  { id: 3, name: 'Мария', note: 'психология', username: 'masha_koz', paid: true },
]

const today = new Date()
const tom = new Date(today); tom.setDate(today.getDate() + 1)

const MOCK_LESSONS = [
  { id: 1, clientName: 'Анна', time: '10:00', date: new Date(today) },
  { id: 2, clientName: 'Иван', time: '14:00', date: new Date(today) },
  { id: 3, clientName: 'Мария', time: '11:00', date: new Date(tom) },
]

function getDateKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function Avatar({ username, name, size = 40 }) {
  const [err, setErr] = useState(false)
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (!username || err) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: '#B5D4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: size * 0.35, color: '#0C447C', flexShrink: 0 }}>
        {initials}
      </div>
    )
  }
  const clean = username.replace('@', '')
  return (
    <img
      src={`https://t.me/i/userpic/320/${clean}.jpg`}
      onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  )
}

export default function App() {
  const [role, setRole] = useState(() => localStorage.getItem('freedom_role'))
  const [screen, setScreen] = useState('home')
  const [selectedClient, setSelectedClient] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [user, setUser] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    WebApp.ready()
    WebApp.expand()
    const tgUser = WebApp.initDataUnsafe?.user
    if (tgUser) setUser(tgUser)
  }, [])

  const goTo = (scr, extra = {}) => {
    setHistory(h => [...h, screen])
    setScreen(scr)
    if (extra.client !== undefined) setSelectedClient(extra.client)
    if (extra.day !== undefined) setSelectedDay(extra.day)
  }

  const goBack = () => {
    const prev = history[history.length - 1] || 'home'
    setHistory(h => h.slice(0, -1))
    setScreen(prev)
    if (prev === 'home' || prev === 'clients') {
      setSelectedClient(null)
      setSelectedDay(null)
    }
  }

  useEffect(() => {
    if (screen !== 'home') {
      WebApp.BackButton.show()
      const handler = () => goBack()
      WebApp.BackButton.onClick(handler)
      return () => WebApp.BackButton.offClick(handler)
    } else {
      WebApp.BackButton.hide()
    }
  }, [screen, history])

  const selectRole = (r) => {
    localStorage.setItem('freedom_role', r)
    setRole(r)
  }

  if (!role) return <RoleScreen onSelect={selectRole} />

  if (role === 'client') {
    if (screen === 'day') return <ClientDayScreen day={selectedDay} goBack={goBack} />
    return <ClientHomeScreen user={user} goTo={goTo} />
  }

  if (screen === 'clients') return <ClientsScreen goTo={goTo} goBack={goBack} />
  if (screen === 'client' && selectedClient) return <ClientCard client={selectedClient} goBack={goBack} />
  if (screen === 'day') return <DayScreen day={selectedDay} goBack={goBack} />

  return <HomeScreen user={user} goTo={goTo} />
}

function RoleScreen({ onSelect }) {
  return (
    <div style={s.page}>
      <div style={s.roleWrap}>
        <div style={s.logo}>FREEDOM</div>
        <div style={s.roleTitle}>Кто вы?</div>
        <div style={s.roleSub}>Выберите роль — это можно будет изменить позже</div>
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

function CalendarStrip({ onDayPress }) {
  const [offset, setOffset] = useState(0)
  const base = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + offset + i - 3)
    return d
  })
  const todayKey = getDateKey(new Date())

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <button style={s.calArrow} onClick={() => setOffset(o => o - 1)}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: "'Unbounded', sans-serif", fontSize: 11, color: '#0C447C' }}>
          {MONTHS[days[3].getMonth()]} {days[3].getFullYear()}
        </div>
        <button style={s.calArrow} onClick={() => setOffset(o => o + 1)}>›</button>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {days.map((d, i) => {
          const isToday = getDateKey(d) === todayKey
          return (
            <div key={i} onClick={() => onDayPress(d)} style={{ ...s.calDay, ...(isToday ? s.calDayActive : {}) }}>
              <div style={{ fontSize: 9, color: isToday ? '#B5D4F4' : '#888780' }}>{DAYS[d.getDay()]}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: isToday ? '#fff' : '#2C2C2A' }}>{d.getDate()}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HomeScreen({ user, goTo }) {
  const todayLessons = MOCK_LESSONS.filter(l => getDateKey(l.date) === getDateKey(new Date()))
  const tomLessons = MOCK_LESSONS.filter(l => {
    const t = new Date(); t.setDate(t.getDate() + 1)
    return getDateKey(l.date) === getDateKey(t)
  })

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>FREEDOM</div>
        {user && <div style={s.headerSub}>Привет, {user.first_name}!</div>}
        <div style={s.subBadge}>Подписка активна</div>
      </div>
      <div style={s.body}>
        <CalendarStrip onDayPress={(d) => goTo('day', { day: d })} />
        <div style={s.folder('#B5D4F4')} onClick={() => goTo('day', { day: new Date() })}>
          <div style={s.folderTitle('#0C447C')}>📅 Мои встречи</div>
          <div style={s.folderSub('#185FA5')}>сегодня и завтра</div>
          {todayLessons.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={s.dayLabel}>Сегодня</div>
              {todayLessons.map(l => <LessonRow key={l.id} lesson={l} />)}
            </div>
          )}
          {tomLessons.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={s.dayLabel}>Завтра</div>
              {tomLessons.map(l => <LessonRow key={l.id} lesson={l} />)}
            </div>
          )}
          {!todayLessons.length && !tomLessons.length && (
            <div style={{ fontSize: 12, color: '#185FA5', marginTop: 8 }}>Встреч нет</div>
          )}
        </div>
        <div style={s.folder('#D3D1C7')} onClick={() => goTo('clients')}>
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

function DayScreen({ day, goBack }) {
  const lessons = MOCK_LESSONS.filter(l => getDateKey(l.date) === getDateKey(day))
  const label = `${day.getDate()} ${MONTHS[day.getMonth()]}`

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>📅 {label}</div>
        <div style={s.headerSub}>{DAYS[day.getDay()]}</div>
      </div>
      <div style={s.body}>
        {lessons.length === 0 && <div style={s.empty}>Занятий в этот день нет</div>}
        {lessons.map(l => (
          <div key={l.id} style={{ background: '#fff', border: '0.5px solid #D3D1C7', borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#B5D4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2A' }}>{l.clientName}</div>
              <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>{l.time}</div>
            </div>
            <button style={{ background: '#378ADD', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500 }}
              onClick={() => WebApp.showAlert('Видеозвонки — скоро!')}>
              Начать
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ClientsScreen({ goTo, goBack }) {
  const [clients, setClients] = useState(MOCK_CLIENTS)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newUsername, setNewUsername] = useState('')

  const addClient = () => {
    if (!newName.trim()) return
    setClients([...clients, { id: Date.now(), name: newName, note: newNote, username: newUsername.replace('@', ''), paid: false }])
    setNewName(''); setNewNote(''); setNewUsername(''); setShowAdd(false)
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>👥 Мои клиенты</div>
        <div style={s.headerSub}>{clients.length} клиента</div>
      </div>
      <div style={{ ...s.body, paddingBottom: 90 }}>
        {clients.map(c => (
          <div key={c.id} style={s.clientCard} onClick={() => goTo('client', { client: c })}>
            <Avatar username={c.username} name={c.name} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2A' }}>{c.name}</div>
              {c.username && (
                <div style={{ fontSize: 12, color: '#378ADD', marginTop: 1 }}>@{c.username}</div>
              )}
              {c.note ? <div style={{ fontSize: 12, color: '#888780', marginTop: 1 }}>{c.note}</div> : null}
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
            <input style={{ ...s.input, marginTop: 8 }} placeholder="@username в Telegram" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
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

function ClientCard({ client, goBack }) {
  const [activeTab, setActiveTab] = useState('lessons')
  const tabs = [
    { id: 'lessons', label: '📅 Занятия' },
    { id: 'materials', label: '📁 Материалы' },
    { id: 'meeting', label: '🎥 Встреча' },
    { id: 'reminders', label: '🔔 Напоминания' },
  ]

  const openTg = () => {
    if (!client.username) return WebApp.showAlert('Username не указан')
    WebApp.openTelegramLink(`https://t.me/${client.username}`)
  }

  return (
    <div style={s.page}>
      <div style={{ ...s.header, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar username={client.username} name={client.name} size={48} />
        <div style={{ flex: 1 }}>
          <div style={s.headerTitle}>{client.name}</div>
          {client.username && (
            <div style={{ fontSize: 12, color: '#185FA5', marginTop: 2, cursor: 'pointer' }} onClick={openTg}>
              @{client.username} ✉️
            </div>
          )}
          {client.note && <div style={s.headerSub}>{client.note}</div>}
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

  const togglePaid = (id) => {
    setLessons(lessons.map(l => l.id === id ? { ...l, paid: !l.paid } : l))
  }

  return (
    <div style={{ paddingBottom: 90 }}>
      {lessons.map(l => (
        <div key={l.id} style={{ ...s.clientCard, cursor: 'default' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{l.date}</div>
            <div style={{ fontSize: 12, color: '#888780', marginTop: 2 }}>{l.time}</div>
          </div>
          <span style={{ ...s.tag, ...(l.paid ? s.tagBlue : s.tagGray), cursor: 'pointer' }} onClick={() => togglePaid(l.id)}>
            {l.paid ? 'оплачено' : 'не оплачено'}
          </span>
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
      <div style={{ fontSize: 13, color: '#888780', marginBottom: 4 }}>Постоянная комната для видеозвонков этого клиента</div>
      <button style={s.btnPrimary} onClick={() => WebApp.showAlert('Видеозвонки — скоро!')}>🎥 Начать встречу</button>
      <button style={s.btnSecondary} onClick={() => WebApp.showAlert('Ссылка скопирована!')}>🔗 Скопировать ссылку</button>
    </div>
  )
}

function RemindersTab() {
  const [enabled, setEnabled] = useState(false)
  const [text, setText] = useState('')

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
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, color: '#888780' }}>📨 Клиенту: за 24ч и за 1ч до занятия</div>
          <div style={{ fontSize: 12, color: '#888780' }}>📨 Вам: за 1ч до занятия</div>
          <textarea
            style={{ ...s.input, resize: 'none', height: 72, marginTop: 4 }}
            placeholder="Свой текст напоминания..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <button style={s.btnPrimary} onClick={() => WebApp.showAlert('Сохранено!')}>Сохранить</button>
        </div>
      )}
    </div>
  )
}

function ClientHomeScreen({ user, goTo }) {
  const MY_LESSONS = [
    { id: 1, specialistName: 'Преподаватель Мария', subject: 'Английский язык', time: '10:00', date: new Date(today), paid: true },
    { id: 2, specialistName: 'Преподаватель Мария', subject: 'Английский язык', time: '10:00', date: new Date(tom), paid: false },
  ]
  const todayL = MY_LESSONS.filter(l => getDateKey(l.date) === getDateKey(new Date()))
  const tomL = MY_LESSONS.filter(l => { const t = new Date(); t.setDate(t.getDate()+1); return getDateKey(l.date) === getDateKey(t) })

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>🌿 FREEDOM</div>
        {user && <div style={s.headerSub}>Привет, {user.first_name}!</div>}
      </div>
      <div style={s.body}>
        <CalendarStrip onDayPress={(d) => goTo('day', { day: d })} />
        <div style={{ ...s.folder('#B5D4F4') }}>
          <div style={s.folderTitle('#0C447C')}>📅 Мои занятия</div>
          <div style={s.folderSub('#185FA5')}>сегодня и завтра</div>
          {todayL.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={s.dayLabel}>Сегодня</div>
              {todayL.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#378ADD', flexShrink: 0 }} />
                  <div style={{ fontSize: 11, color: '#185FA5', width: 36, flexShrink: 0 }}>{l.time}</div>
                  <div style={{ fontSize: 11, color: '#0C447C', fontWeight: 500, flex: 1 }}>{l.subject}</div>
                  <button style={{ background: '#378ADD', color: '#fff', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 500 }}
                    onClick={() => WebApp.showAlert('Видеозвонки — скоро!')}>
                    Войти
                  </button>
                </div>
              ))}
            </div>
          )}
          {tomL.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={s.dayLabel}>Завтра</div>
              {tomL.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid rgba(255,255,255,0.4)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#378ADD', flexShrink: 0 }} />
                  <div style={{ fontSize: 11, color: '#185FA5', width: 36, flexShrink: 0 }}>{l.time}</div>
                  <div style={{ fontSize: 11, color: '#0C447C', fontWeight: 500, flex: 1 }}>{l.subject}</div>
                </div>
              ))}
            </div>
          )}
          {!todayL.length && !tomL.length && <div style={{ fontSize: 12, color: '#185FA5', marginTop: 8 }}>Занятий нет</div>}
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #D3D1C7', borderRadius: 14, padding: 14 }}>
          <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, color: '#2C2C2A', marginBottom: 4 }}>Мой специалист</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#B5D4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👩‍🏫</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2A' }}>Преподаватель Мария</div>
              <div style={{ fontSize: 12, color: '#888780', marginTop: 1 }}>Английский язык</div>
            </div>
          </div>
          <button style={{ ...s.btnPrimary, marginTop: 12 }} onClick={() => WebApp.showAlert('Видеозвонки — скоро!')}>
            🎥 Подключиться к встрече
          </button>
        </div>
      </div>
    </div>
  )
}

function ClientDayScreen({ day, goBack }) {
  const MY_LESSONS = [
    { id: 1, subject: 'Английский язык', time: '10:00', date: new Date(today), paid: true },
  ]
  const lessons = MY_LESSONS.filter(l => getDateKey(l.date) === getDateKey(day))
  const label = `${day.getDate()} ${MONTHS[day.getMonth()]}`

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerTitle}>📅 {label}</div>
        <div style={s.headerSub}>{DAYS[day.getDay()]}</div>
      </div>
      <div style={s.body}>
        {lessons.length === 0 && <div style={s.empty}>Занятий в этот день нет</div>}
        {lessons.map(l => (
          <div key={l.id} style={{ background: '#fff', border: '0.5px solid #D3D1C7', borderRadius: 12, padding: '14px', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#2C2C2A' }}>{l.subject}</div>
            <div style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>{l.time}</div>
            <div style={{ marginTop: 8 }}>
              <span style={{ ...s.tag, ...(l.paid ? s.tagBlue : s.tagGray) }}>{l.paid ? 'оплачено' : 'не оплачено'}</span>
            </div>
            <button style={{ ...s.btnPrimary, marginTop: 12 }} onClick={() => WebApp.showAlert('Видеозвонки — скоро!')}>
              🎥 Подключиться к встрече
            </button>
          </div>
        ))}
      </div>
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
  calArrow: { background: 'none', fontSize: 20, color: '#378ADD', padding: '0 6px', fontWeight: 700 },
  calDay: { flex: 1, textAlign: 'center', borderRadius: 8, padding: '6px 0', background: '#fff', border: '0.5px solid #D3D1C7', cursor: 'pointer' },
  calDayActive: { background: '#378ADD', border: '0.5px solid #378ADD' },
  folder: (bg) => ({ background: bg, borderRadius: 14, padding: 14, marginBottom: 10, cursor: 'pointer' }),
  folderTitle: (color) => ({ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, color }),
  folderSub: (color) => ({ fontSize: 11, color, marginTop: 3 }),
  dayLabel: { fontSize: 10, color: '#185FA5', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase' },
  sectionLabel: { fontSize: 11, fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  clientCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fff', borderRadius: 12, marginBottom: 8, cursor: 'pointer', border: '0.5px solid #D3D1C7' },
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