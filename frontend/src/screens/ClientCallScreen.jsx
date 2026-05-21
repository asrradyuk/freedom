import { LiveKitRoom, VideoConference, useRoomContext } from '@livekit/components-react'
import '@livekit/components-styles'
import styles from './CallScreen.module.css'

function HangUpButton({ onLeave }) {
  const room = useRoomContext()
  const handle = async () => {
    await room.disconnect()
    onLeave()
  }
  return (
    <button className={styles.hangUpBtn} onClick={handle}>
      📵 Завершить
    </button>
  )
}

export function ClientCallScreen({ token, url, onLeave }) {
  return (
    <div className={styles.lkRoom}>
      <LiveKitRoom
        token={token}
        serverUrl={url}
        connect
        video
        audio
        onDisconnected={onLeave}
        style={{ height: '100dvh' }}
      >
        <VideoConference />
        <div className={styles.hangUpWrap}>
          <HangUpButton onLeave={onLeave} />
        </div>
      </LiveKitRoom>
    </div>
  )
}