import { useEffect, useState } from 'react'
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { livekitApi } from '../api'
import { useAppStore } from '../store'
import styles from './CallScreen.module.css'

export function CallScreen() {
  const { currentClient, setActiveScreen } = useAppStore()
  const [token, setToken] = useState(null)
  const [serverUrl, setServerUrl] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    livekitApi.getToken(currentClient.id)
      .then((r) => {
        setToken(r.data.token)
        setServerUrl(r.data.url)
      })
      .catch(() => setError('Не удалось получить токен для звонка'))
      .finally(() => setLoading(false))
  }, [currentClient.id])

  const handleDisconnect = () => {
    setActiveScreen('client')
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Подключение...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.center}>
        <p className={styles.error}>{error}</p>
        <button className={styles.backBtn} onClick={() => setActiveScreen('client')}>
          Назад
        </button>
      </div>
    )
  }

  return (
    <div className={styles.room}>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={handleDisconnect}
        style={{ height: '100dvh' }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  )
}