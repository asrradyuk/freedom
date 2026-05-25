import { useState, useEffect } from 'react'
import { LiveKitRoom, VideoConference, useRoomContext, useLocalParticipant } from '@livekit/components-react'
import '@livekit/components-styles'
import { livekitApi } from '../api'
import { useAppStore } from '../store'
import styles from './CallScreen.module.css'

const AUDIO_NORMAL = {
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
}

const AUDIO_ORIGINAL = {
  noiseSuppression: false,
  echoCancellation: false,
  autoGainControl: false,
  sampleRate: 48000,
}

function CallControls({ clientName, onHangUp }) {
  const room = useRoomContext()
  const [originalSound, setOriginalSound] = useState(false)
  const [toggling, setToggling] = useState(false)

  const handleHangUp = async () => {
    await room.disconnect()
    onHangUp()
  }

  const toggleOriginalSound = async () => {
    setToggling(true)
    try {
      const next = !originalSound
      const constraints = next ? AUDIO_ORIGINAL : AUDIO_NORMAL
      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints })
      const audioTrack = stream.getAudioTracks()[0]
      await room.localParticipant.setMicrophoneEnabled(false)
      await room.localParticipant.publishTrack(audioTrack, { source: 'microphone' })
      setOriginalSound(next)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className={styles.controls}>
      <div className={styles.soundToggleRow}>
        <span className={styles.soundLabel}>Оригинальный звук</span>
        <button
          className={`${styles.toggle} ${originalSound ? styles.toggleOn : ''}`}
          onClick={toggleOriginalSound}
          disabled={toggling}
          aria-label="Оригинальный звук"
        >
          <span className={styles.toggleThumb} />
        </button>
      </div>
      <div className={styles.btnRow}>
        <div className={styles.controlItem}>
          <div className={styles.controlBtn}>📵</div>
          <span className={styles.controlLabel}>Завершить</span>
        </div>
        <div className={styles.controlItem}>
          <button className={styles.hangUpRound} onClick={handleHangUp} aria-label="Завершить звонок">
            📵
          </button>
          <span className={styles.controlLabel}>Завершить</span>
        </div>
        <div className={styles.controlItem}>
          <div className={styles.controlBtn}>📹</div>
          <span className={styles.controlLabel}>Камера</span>
        </div>
      </div>
    </div>
  )
}

function InnerCall({ clientName, onHangUp }) {
  const room = useRoomContext()
  const [originalSound, setOriginalSound] = useState(false)
  const [toggling, setToggling] = useState(false)

  const handleHangUp = async () => {
    await room.disconnect()
    onHangUp()
  }

  const toggleOriginalSound = async () => {
    setToggling(true)
    try {
      const next = !originalSound
      const constraints = next ? AUDIO_ORIGINAL : AUDIO_NORMAL
      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints })
      const audioTrack = stream.getAudioTracks()[0]
      await room.localParticipant.setMicrophoneEnabled(false)
      await room.localParticipant.publishTrack(audioTrack, { source: 'microphone' })
      setOriginalSound(next)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className={styles.lkRoom}>
      <VideoConference />
      <div className={styles.overlay}>
        <div className={styles.soundToggleRow}>
          <span className={styles.soundLabel}>Оригинальный звук</span>
          <button
            className={`${styles.toggle} ${originalSound ? styles.toggleOn : ''}`}
            onClick={toggleOriginalSound}
            disabled={toggling}
            aria-label="Оригинальный звук"
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
        <button className={styles.hangUpBtn} onClick={handleHangUp}>
          📵 Завершить
        </button>
      </div>
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
          <div className={styles.avatarCircle}>{currentClient.name.charAt(0).toUpperCase()}</div>
          <p className={styles.clientName}>{currentClient.name}</p>
          <p className={styles.statusText}>Подключение...</p>
          <div className={styles.dots}><span /><span /><span /></div>
        </div>
        <div className={styles.bottomArea}>
          <button className={styles.hangUpBtn} onClick={() => setActiveScreen('client')}>✕ Отмена</button>
        </div>
      </div>
    )
  }

  if (error || !token) {
    return (
      <div className={styles.screen}>
        <div className={styles.centerState}>
          <div className={styles.avatarCircle}>{currentClient.name.charAt(0).toUpperCase()}</div>
          <p className={styles.errorText}>{error || 'Ошибка подключения'}</p>
        </div>
        <div className={styles.bottomArea}>
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
        <InnerCall clientName={currentClient.name} onHangUp={() => setActiveScreen('client')} />
      </LiveKitRoom>
    </div>
  )
}