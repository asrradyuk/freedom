import { useEffect, useRef, useState, useCallback } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import { livekitApi } from '../api'
import { useAppStore } from '../store'
import styles from './CallScreen.module.css'

export function CallScreen() {
  const { currentClient, setActiveScreen } = useAppStore()
  const [status, setStatus] = useState('connecting')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [remoteTracks, setRemoteTracks] = useState({ video: null, screen: null })
  const [error, setError] = useState(null)
  const [duration, setDuration] = useState(0)

  const roomRef = useRef(null)
  const localVideoRef = useRef(null)
  const screenVideoRef = useRef(null)
  const timerRef = useRef(null)

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const attachLocalVideo = useCallback(() => {
    const room = roomRef.current
    if (!room || !localVideoRef.current) return
    const pub = room.localParticipant.getTrackPublication(Track.Source.Camera)
    if (pub?.track) pub.track.attach(localVideoRef.current)
  }, [])

  const refreshRemote = useCallback((room) => {
    let video = null
    let screen = null
    room.remoteParticipants.forEach(p => {
      p.trackPublications.forEach(pub => {
        if (!pub.track || !pub.isSubscribed || pub.track.kind !== Track.Kind.Video) return
        if (pub.source === Track.Source.ScreenShare) screen = pub.track
        else video = pub.track
      })
    })
    setRemoteTracks({ video, screen })
  }, [])

  useEffect(() => {
    let mounted = true

    const connect = async () => {
      try {
        const res = await livekitApi.getToken(currentClient.id)
        const { token, url } = res.data

        const room = new Room({
          adaptiveStream: false,
          dynacast: false,
          reconnectPolicy: { maxRetryDelay: 7000, minRetryDelay: 1000, retryAttempts: 10 },
          videoCaptureDefaults: { resolution: { width: 640, height: 480, frameRate: 24 } },
        })
        roomRef.current = room

        room.on(RoomEvent.TrackSubscribed, () => { if (mounted) refreshRemote(room) })
        room.on(RoomEvent.TrackUnsubscribed, () => { if (mounted) refreshRemote(room) })
        room.on(RoomEvent.ParticipantDisconnected, () => { if (mounted) refreshRemote(room) })
        room.on(RoomEvent.Reconnecting, () => console.log('LiveKit reconnecting...'))
        room.on(RoomEvent.Reconnected, () => { console.log('LiveKit reconnected'); if (mounted) refreshRemote(room) })
        room.on(RoomEvent.Disconnected, (reason) => {
          console.log('LiveKit disconnected, reason:', reason)
          if (mounted) {
            clearInterval(timerRef.current)
            setActiveScreen('client')
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
      } catch (e) {
        console.error('LiveKit connect error:', e)
        if (mounted) {
          setError('Не удалось подключиться. Проверьте камеру и микрофон.')
          setStatus('error')
        }
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
    if (status !== 'connected') return
    const t1 = setTimeout(attachLocalVideo, 100)
    const t2 = setTimeout(attachLocalVideo, 800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [status, attachLocalVideo])

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
    if (next) setTimeout(attachLocalVideo, 400)
  }

  const toggleScreenShare = async () => {
    const room = roomRef.current
    if (!room) return
    try {
      const next = !screenSharing
      await room.localParticipant.setScreenShareEnabled(next)
      setScreenSharing(next)
      if (next) {
        setTimeout(() => {
          const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare)
          if (pub?.track && screenVideoRef.current) pub.track.attach(screenVideoRef.current)
        }, 400)
      }
    } catch { setScreenSharing(false) }
  }

  const hangUp = async () => {
    clearInterval(timerRef.current)
    const room = roomRef.current
    if (room) {
      room.localParticipant?.getTrackPublications().forEach(pub => pub.track?.stop())
      await room.disconnect()
    }
    setActiveScreen('client')
  }

  if (status === 'connecting') {
    return (
      <div className={styles.screen}>
        <div className={styles.centerState}>
          <div className={styles.avatar}>{currentClient.name.charAt(0).toUpperCase()}</div>
          <p className={styles.clientName}>{currentClient.name}</p>
          <p className={styles.statusText}>Подключение...</p>
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
          <div className={styles.avatar}>{currentClient.name.charAt(0).toUpperCase()}</div>
          <p className={styles.errorText}>{error}</p>
        </div>
        <div className={styles.controls}>
          <ControlBtn icon="✕" label="Назад" danger onClick={() => setActiveScreen('client')} />
        </div>
      </div>
    )
  }

  const mainContent = screenSharing ? 'local-screen'
    : remoteTracks.screen ? 'remote-screen'
    : remoteTracks.video ? 'remote-video'
    : 'waiting'

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <p className={styles.headerName}>{currentClient.name}</p>
          <p className={styles.headerDuration}>{formatDuration(duration)}</p>
        </div>
        {(screenSharing || remoteTracks.screen) && (
          <div className={styles.screenBadge}>🖥 Демонстрация</div>
        )}
      </div>

      <div className={styles.videoArea}>
        {mainContent === 'local-screen' && <video ref={screenVideoRef} autoPlay playsInline className={styles.mainVideo} />}
        {mainContent === 'remote-screen' && <TrackVideo track={remoteTracks.screen} className={styles.mainVideo} />}
        {mainContent === 'remote-video' && <TrackVideo track={remoteTracks.video} className={styles.mainVideo} />}
        {mainContent === 'waiting' && (
          <div className={styles.waitingState}>
            <div className={styles.avatarLg}>{currentClient.name.charAt(0).toUpperCase()}</div>
            <p className={styles.waitingText}>Ожидание участника...</p>
          </div>
        )}
        <div className={styles.localVideoWrap}>
          {camOn
            ? <video ref={localVideoRef} autoPlay muted playsInline className={styles.localVideo} />
            : <div className={styles.localVideoOff}><span>{currentClient.name.charAt(0).toUpperCase()}</span></div>
          }
        </div>
      </div>

      <div className={styles.controls}>
        <ControlBtn icon={micOn ? '🎤' : '🔇'} label={micOn ? 'Микрофон' : 'Без звука'} active={!micOn} onClick={toggleMic} />
        <ControlBtn icon="📵" label="Завершить" danger large onClick={hangUp} />
        <ControlBtn icon={camOn ? '📹' : '🚫'} label={camOn ? 'Камера' : 'Выкл'} active={!camOn} onClick={toggleCam} />
        <ControlBtn icon="🖥" label={screenSharing ? 'Стоп' : 'Экран'} active={screenSharing} onClick={toggleScreenShare} />
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
