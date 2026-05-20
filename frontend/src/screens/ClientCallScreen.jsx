import { useEffect, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import styles from './CallScreen.module.css'

export function ClientCallScreen({ token, url, onLeave }) {
  const [status, setStatus] = useState('connecting')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [duration, setDuration] = useState(0)
  const [remoteVideoTrack, setRemoteVideoTrack] = useState(null)

  const roomRef = useRef(null)
  const localVideoRef = useRef(null)
  const timerRef = useRef(null)

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  useEffect(() => {
    const connect = async () => {
      try {
        const room = new Room({ adaptiveStream: true, dynacast: true })
        roomRef.current = room

        room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video && track.source !== Track.Source.ScreenShare) {
            setRemoteVideoTrack(track)
          }
        })

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (track.kind === Track.Kind.Video) {
            setRemoteVideoTrack(null)
          }
        })

        room.on(RoomEvent.Disconnected, () => onLeave())

        await room.connect(url, token)
        await room.localParticipant.enableCameraAndMicrophone()

        setStatus('connected')
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
      } catch {
        setStatus('error')
      }
    }

    connect()

    return () => {
      clearInterval(timerRef.current)
      roomRef.current?.disconnect()
    }
  }, [])

  useEffect(() => {
    if (status !== 'connected' || !localVideoRef.current) return
    const room = roomRef.current
    if (!room) return
    const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track
    if (track) track.attach(localVideoRef.current)
    return () => {
      try { if (track && localVideoRef.current) track.detach(localVideoRef.current) } catch {}
    }
  }, [status])

  const toggleMic = async () => {
    await roomRef.current?.localParticipant.setMicrophoneEnabled(!micOn)
    setMicOn(v => !v)
  }

  const toggleCam = async () => {
    const room = roomRef.current
    if (!room) return
    const enabling = !camOn
    await room.localParticipant.setCameraEnabled(enabling)
    if (!enabling) {
      const t = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track
      if (t && localVideoRef.current) t.detach(localVideoRef.current)
    } else {
      setTimeout(() => {
        const t = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track
        if (t && localVideoRef.current) t.attach(localVideoRef.current)
      }, 300)
    }
    setCamOn(v => !v)
  }

  const hangUp = async () => {
    clearInterval(timerRef.current)
    await roomRef.current?.disconnect()
    onLeave()
  }

  if (status === 'connecting') {
    return (
      <div className={styles.screen}>
        <div className={styles.centerState}>
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
        {remoteVideoTrack ? (
          <RemoteTrackVideo track={remoteVideoTrack} className={styles.mainVideo} />
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
        <ControlBtn icon={camOn ? '📹' : '🚫'} label={camOn ? 'Камера' : 'Выкл'} active={!camOn} onClick={toggleCam} />
      </div>
    </div>
  )
}

function RemoteTrackVideo({ track, className }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!track || !ref.current) return
    track.attach(ref.current)
    return () => {
      try { track.detach(ref.current) } catch {}
    }
  }, [track])
  return <video ref={ref} autoPlay playsInline className={className} />
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