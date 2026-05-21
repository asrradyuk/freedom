import { useState, useEffect } from 'react'
import { LiveKitRoom, VideoConference, useRoomContext } from '@livekit/components-react'
import '@livekit/components-styles'
import { livekitApi } from '../api'
import { useAppStore } from '../store'
import styles from './CallScreen.module.css'

function HangUpButton({ onHangUp }) {
  const room = useRoomContext()
  const handle = async () => {
    await room.disconnect()
    onHangUp()
  }
  return (
    <button className={styles.hangUpBtn} onClick={handle}>
      📵 Завершить
    </button>
  )
}

export function CallScreen() {
  const { currentClient, setActiveScreen } = useAppStore()
  const [token, setToken] = useState(null)
  const [serverUrl, setServerUrl] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    livekitApi.getToken(currentClient.id)
      .then(r => {
        setToken(r.data.token)
        setServerUrl(r.data.url)
      })
      .catch(() => setError('Не удалось получить токен'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className={styles.screen}>
        <div className={styles.centerState}>
          <div className={styles.avatar}>{currentClient.name.charAt(0).toUpperCase()}</div>
          <p className={styles.clientName}>{currentClient.name}</p>
          <p className={styles.statusText}>Подключение...</p>
          <div className={styles.dots}><span /><span /><span /></div>
        </div>
        <div className={styles.controls}>
          <button className={styles.hangUpBtn} onClick={() => setActiveScreen('client')}>✕ Отмена</button>
        </div>
      </div>
    )
  }

  if (error || !token) {
    return (
      <div className={styles.screen}>
        <div className={styles.centerState}>
          <div className={styles.avatar}>{currentClient.name.charAt(0).toUpperCase()}</div>
          <p className={styles.errorText}>{error || 'Ошибка подключения'}</p>
        </div>
        <div className={styles.controls}>
          <button className={styles.hangUpBtn} onClick={() => setActiveScreen('client')}>✕ Назад</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.lkRoom}>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        video
        audio
        onDisconnected={() => setActiveScreen('client')}
        style={{ height: '100dvh' }}
      >
        <VideoConference />
        <div className={styles.hangUpWrap}>
          <HangUpButton onHangUp={() => setActiveScreen('client')} />
        </div>
      </LiveKitRoom>
    </div>
  )
}