import { useEffect, useRef, useState, useCallback } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import styles from './CallScreen.module.css'

export function ClientCallScreen({ token, url, onLeave }) {
  const [status, setStatus] = useState('connecting')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [remoteTracks, setRemoteTracks] = useState({ video: null })
  const [duration, setDuration] = useState(0)

  const roomRef = useRef(null)
  const localVideoRef = useRef(null)
  const timerRef = useRef(null)

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const refreshRemote = useCallback((room) => {
    let video = null
    room.remoteParticipants.forEach(p => {
      p.trackPublications.forEach(pub => {
        if (!pub.track || !pub.isSubscribed || pub.track.kind !== Track.Kind.Video) return
        if (pub.source !== Track.Source.ScreenShare) video = pub.track
      })
    })
    setRemoteTracks({ video })
  }, [])

  useEffect(() => {
    let mounted = true

    const connect = async () => {
      try {
        const room = new Room({
          adaptiveStream: false,
          dynacast: false,
          videoCaptureDefaults: { resolution: { width: 640, height: 480, frameRate: 24 } },
        })
        roomRef.current = room

        room.on(RoomEvent.TrackSubscribed, () => refreshRemote(room))
        room.on(RoomEvent.TrackUnsubscribed, () => refreshRemote(room))
        room.on(RoomEvent.ParticipantDisconnected, () => refreshRemote(room))
        room.on(RoomEvent.Disconnected, () => {
          if (mounted) {
            clearInterval(timerRef.current)
            onLeave()
          }
        })

        await room.connect(url, token)
        if (!mounted) { room.disconnect(); return }

        await room.localParticipant.enableCameraAndMicrophone()
        if (!mounted) { room.disconnect(); return }

        if (mounted) {
          setStatus('connected')
          timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
          refreshRemote(room)
        }
      } catch {
        if (mounted) setStatus('error')
      }
    }

    connect()

    return () => {
      mounted = false
      clearInterval(timerRef.current)
      const room = roomRef.current
      if (room) {
        room.localParticipant?.getTrackPublications().forEach(pub => pub.track?.stop())
        room.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    if (status !== 'connected' || !localVideoRef.current) return
    const room = roomRef.current
    if (!room) return
    const tryAttach = () => {
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera)
      if (pub?.track && localVideoRef.current) pub.track.attach(localVideoRef.current)
    }
    tryAttach()
    const t = setTimeout(tryAttach, 500)
    return () => clearTimeout(t)
  }, [status])

  const toggleMic = async () => {
    const room = roomRef.current
    if (!room) return
    await room.localParticipant.setMicrophoneEnabled(!micOn)
    setMicOn(v => !v)
  }

  const toggleCam = async () => {
    const room = roomRef.current
    if (!room) return
    const next = !camOn
    await room.localParticipant.setCameraEnabled(next)
    setCamOn(next)
    if (next) {
      setTimeout(() => {
        const pub = room.localParticipant.getTrackPublication(Track.Source.Camera)
        if (pub?.track && localVideoRef.current) pub.track.attach(localVideoRef.current)
      }, 400)
    }
  }

  const hangUp = async () => {
    clearInterval(timerRef.current)
    const room = roomRef.current
    if (room) {
      room.localParticipant?.getTrackPublications().forEach(pub => pub.track?.stop())
      await room.disconnect()
    }
    onLeave()
  }

  if (status === 'connecting') {
    return (
      <div className={styles.screen}>
        <div className={styles.centerState}>
          <div className={styles.avatar}>📹</div>
          <p className={styles.clientName}>Подключение к занятию...</p>
          <div className={styles.dots}><span /><span /><span /></div>
        </div>
        <div className={styles.controls}>
          <ControlBtn icon="✕" label="Отмена" danger onClick={hangUp} />
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
        {remoteTracks.video
          ? <TrackVideo track={remoteTracks.video} className={styles.mainVideo} />
          : (
            <div className={styles.waitingState}>
              <div className={styles.avatarLg}>👨‍🏫</div>
              <p className={styles.waitingText}>Ожидание специалиста...</p>
            </div>
          )
        }
        <div className={styles.localVideoWrap}>
          {camOn
            ? <video ref={localVideoRef} autoPlay muted playsInline className={styles.localVideo} />
            : <div className={styles.localVideoOff}><span>Вы</span></div>
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

function TrackVideo({ track, className }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!track || !ref.current) return
    track.attach(ref.current)
    return () => { try { track.detach(ref.current) } catch {} }
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