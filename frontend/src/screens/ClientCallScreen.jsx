import { useState } from 'react'
import { LiveKitRoom, VideoConference, useRoomContext } from '@livekit/components-react'
import '@livekit/components-styles'
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

function InnerClientCall({ onLeave }) {
  const room = useRoomContext()
  const handleLeave = async () => {
    await room.disconnect()
    onLeave()
  }
  return (
    <div className={styles.lkRoom}>
      <VideoConference />
      <div className={styles.topBar}>
        <OriginalSoundToggle />
        <button className={styles.hangUpSmall} onClick={handleLeave}>
          Завершить
        </button>
      </div>
    </div>
  )
}

export function ClientCallScreen({ token, url, onLeave }) {
  return (
    <div className={styles.lkRoom}>
      <LiveKitRoom
        token={token}
        serverUrl={url}
        connect video audio
        onDisconnected={onLeave}
        style={{ height: '100dvh' }}
      >
        <InnerClientCall onLeave={onLeave} />
      </LiveKitRoom>
    </div>
  )
}