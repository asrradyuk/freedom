import { useEffect, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import styles from './CallScreen.module.css'

export function ClientCallScreen({ token, url, onLeave }) {
  const [status, setStatus] = useState('connecting')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [duration, setDuration] = useState(0)
  const [hasRemote, setHasRemote] = useState(false)

  const roomRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const timerRef = useRef(null)

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  useEffect(() => {
    let room

    const connect = async () => {
      try {
        room = new Room({ adaptiveStream: true, dynacast: true })
        roomRef.current = room

        room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
          if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
            track.attach(remoteVideoRef.current)
            setHasRemote(true)
          }
        })

        room.on(RoomEvent.TrackUnsubscribed, () => {
          setHasRemote(false)
        })

        room.on(RoomEvent.Disconnected, () => onLeave())

        await room.connect(url, token)
        await room.localParticipant.enableCameraAndMicrophone()

        const videoTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track
        if (videoTrack && localVideoRef.current) {
          videoTrack.attach(localVideoRef.current)
        }

        setStatus('connected')
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
      } catch {
        setStatus('error')
      }
    }

    connect()

    return () => {
      clearInterval(timerRef.current)
      if (roomRef.current) roomRef.current.disconnect()
    }
  }, [])

  const toggleMic = async () => {
    await roomRef.current?.localParticipant.setMicrophoneEnabled(!micOn)
    setMicOn(v => !v)
  }

  const toggleCam = async () => {
    await roomRef.current?.localParticipant.setCameraEnabled(!camOn)
    if (camOn) {
      const t = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track
      if (t && localVideoRef.current) t.detach(localVideoRef.current)
    } else {
      setTimeout(() => {
        const t = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera)?.track
        if (t && localVideoRef.current) t.attach(localVideoRef.current)
      }, 500)
    }
    setCamOn(v => !v)
  }

  const hangUp = async () => {
    clearInterval(timerRef.current)
    if (roomRef.current) await roomRef.current.disconnect()
    onLeave()
  }

  if (status === 'connecting') {
    return (
      <div className={styles.screen}>
        <div className={styles.centerState}>
          <div className={styles.avatar}>📹</div>
          <p className={styles.clientName}>Подключение...</p>
          <div className={styles.dots}><span /><span /><span /></div>
        </div>
        <div className={styles.controls}>
          <ControlBtn icon="✕" label="Отмена" danger onClick={onLeave} />
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={styles.screen}>
        <div className={styles.centerState}>
          <p className={styles.errorText}>Не удалось подключиться</p>
        </div>
        <div className={styles.controls}>
          <ControlBtn icon="✕" label="Назад" danger onClick={onLeave} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <p className={styles.headerName}>Занятие</p>
          <p className={styles.headerDuration}>{formatDuration(duration)}</p>
        </div>
      </div>

      <div className={styles.videoArea}>
        {hasRemote ? (
          <video ref={remoteVideoRef} autoPlay playsInline className={styles.mainVideo} />
        ) : (
          <div className={styles.waitingState}>
            <div className={styles.avatarLg}>👨‍🏫</div>
            <p className={styles.waitingText}>Ожидание специалиста...</p>
          </div>
        )}
        <div className={styles.localVideoWrap}>
          {camOn
            ? <video ref={localVideoRef} autoPlay muted playsInline className={styles.localVideo} />
            : <div className={styles.localVideoOff}>Вы</div>
          }
        </div>
      </div>

      <div className={styles.controls}>
        <ControlBtn icon={micOn ? '🎤' : '🔇'} label={micOn ? 'Микрофон' : 'Без звука'} active={!micOn} onClick={toggleMic} />
        <ControlBtn icon="📵" label="Завершить" danger large onClick={hangUp} />
        <ControlBtn icon={camOn ? '📹' : '🚫'} label={camOn ? 'Камера' : 'Выкл' } active={!camOn} onClick={toggleCam} />
      </div>
    </div>
  )
}

function ControlBtn({ icon, label, onClick, danger, active, large }) {
  return (
    <button
      className={`${styles.controlBtn} ${danger ? styles.danger : ''} ${active ? styles.active : ''} ${large ? styles.large : ''}`}
      onClick={onClick}
    >
      <span className={styles.controlIcon}>{icon}</span>
      <span className={styles.controlLabel}>{label}</span>
    </button>
  )
}