import { useState, useEffect } from 'react'
import { LiveKitRoom, VideoConference, useRoomContext } from '@livekit/components-react'
import '@livekit/components-styles'
import { livekitApi } from '../api'
import { useAppStore } from '../store'
import styles from './CallScreen.module.css'

const AUDIO_NORMAL = {
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
}

const AUDIO_MUSIC = {
  noiseSuppression: false,
  echoCancellation: false,
  autoGainControl: false,
  sampleRate: 48000,
}

function CallControls({ onHangUp }) {
  const room = useRoomContext()
  const [musicMode, setMusicMode] = useState(false)
  const [toggling, setToggling] = useState(false)

  const handleHangUp = async () => {
    await room.disconnect()
    onHangUp()
  }

  const toggleMusicMode = async () => {
    setToggling(true)
    try {
      const next = !musicMode
      const constraints = next ? AUDIO_MUSIC : AUDIO_NORMAL
      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints })
      const audioTrack = stream.getAudioTracks()[0]
      await room.localParticipant.setMicrophoneEnabled(false)
      await room.localParticipant.publishTrack(audioTrack, { source: 'microphone' })
      setMusicMode(next)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className={styles.callControls}>
      <button
        className={`${styles.musicBtn} ${musicMode ? styles.musicBtnActive : ''}`}
        onClick={toggleMusicMode}
        disabled={toggling}
      >
        {toggling ? '⏳' : '🎵'} {musicMode ? 'Музыка вкл' : 'Режим музыки'}
      </button>
      <button className={styles.hangUpBtn} onClick={handleHangUp}>
        📵 Завершить
      </button>
    </div>
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
          <CallControls onHangUp={() => setActiveScreen('client')} />
        </div>
      </LiveKitRoom>
    </div>
  )
}