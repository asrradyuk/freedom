import { useState, useEffect } from 'react'
import { LiveKitRoom, VideoConference, useRoomContext } from '@livekit/components-react'
import '@livekit/components-styles'
import { livekitApi } from '../api'
import { useAppStore } from '../store'
import styles from './CallScreen.module.css'

const AUDIO_NORMAL = { noiseSuppression: true, echoCancellation: true, autoGainControl: true }
const AUDIO_ORIGINAL = { noiseSuppression: false, echoCancellation: false, autoGainControl: false, sampleRate: 48000 }

function OriginalSoundToggle() {
  const room = useRoomContext()
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    setBusy(true)
    try {
      const next = !on
      const stream = await navigator.mediaDevices.getUserMedia({ audio: next ? AUDIO_ORIGINAL : AUDIO_NORMAL })
      const track = stream.getAudioTracks()[0]
      await room.localParticipant.setMicrophoneEnabled(false)
      await room.localParticipant.publishTrack(track, { source: 'microphone' })
      setOn(next)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.soundToggle}>
      <span className={styles.soundLabel}>Оригинальный звук</span>
      <button
        className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
        onClick={toggle}
        disabled={busy}
      >
        <span className={styles.toggleThumb} />
      </button>
    </div>
  )
}

function InnerCall({ onHangUp }) {
  const room = useRoomContext()

  const handleHangUp = async () => {
    await room.disconnect()
    onHangUp()
  }

  return (
    <div className={styles.lkRoom}>
      <VideoConference />
      <div className={styles.topBar}>
        <OriginalSoundToggle />
        <button className={styles.hangUpSmall} onClick={handleHangUp}>
          Завершить
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
      .then(r => { setToken(r.data.token); setServerUrl(r.data.url) })
      .catch(() => setError('Не удалось получить токен'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className={styles.screen}>
      <div className={styles.centerState}>
        <div className={styles.avatarCircle}>{currentClient.name.charAt(0).toUpperCase()}</div>
        <p className={styles.clientName}>{currentClient.name}</p>
        <p className={styles.statusText}>Подключение...</p>
        <div className={styles.dots}><span /><span /><span /></div>
      </div>
      <div className={styles.bottomArea}>
        <button className={styles.hangUpBtn} onClick={() => setActiveScreen('client')}>Отмена</button>
      </div>
    </div>
  )

  if (error || !token) return (
    <div className={styles.screen}>
      <div className={styles.centerState}>
        <div className={styles.avatarCircle}>{currentClient.name.charAt(0).toUpperCase()}</div>
        <p className={styles.errorText}>{error || 'Ошибка подключения'}</p>
      </div>
      <div className={styles.bottomArea}>
        <button className={styles.hangUpBtn} onClick={() => setActiveScreen('client')}>Назад</button>
      </div>
    </div>
  )

  return (
    <div className={styles.lkRoom}>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect video audio
        onDisconnected={() => setActiveScreen('client')}
        style={{ height: '100dvh' }}
      >
        <InnerCall onHangUp={() => setActiveScreen('client')} />
      </LiveKitRoom>
    </div>
  )
}