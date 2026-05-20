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
  const [participants, setParticipants] = useState([])
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

  const updateParticipants = useCallback((room) => {
    const parts = []
    room.remoteParticipants.forEach(p => {
      const videoTrack = [...p.trackPublications.values()].find(
        pub => pub.track?.kind === Track.Kind.Video &&
               pub.isSubscribed &&
               pub.source !== Track.Source.ScreenShare
      )
      const screenTrack = [...p.trackPublications.values()].find(
        pub => pub.track?.kind === Track.Kind.Video &&
               pub.isSubscribed &&
               pub.source === Track.Source.ScreenShare
      )
      parts.push({
        identity: p.identity,
        name: p.name || p.identity,
        videoTrack: videoTrack?.track || null,
        screenTrack: screenTrack?.track || null,
      })
    })
    setParticipants([...parts])
  }, [])

  useEffect(() => {
    const connect = async () => {
      try {
        const res = await livekitApi.getToken(currentClient.id)
        const { token, url } = res.data

        const room = new Room({ adaptiveStream: true, dynacast: true })
        roomRef.current = room

        room.on(RoomEvent.ParticipantConnected, () => updateParticipants(room))
        room.on(RoomEvent.ParticipantDisconnected, () => updateParticipants(room))
        room.on(RoomEvent.TrackSubscribed, () => updateParticipants(room))
        room.on(RoomEvent.TrackUnsubscribed, () => updateParticipants(room))
        room.on(RoomEvent.Disconnected, () => setActiveScreen('client'))

        await room.connect(url, token)
        await room.localParticipant.enableCameraAndMicrophone()

        setStatus('connected')
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
        updateParticipants(room)
      } catch {
        setError('Не удалось подключиться к звонку')
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
    if (status !== 'connected') return
    const room = roomRef.current
    if (!room || !localVideoRef.current) return
    const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track
    if (track) track.attach(localVideoRef.current)
    return () => {
      if (track && localVideoRef.current) track.detach(localVideoRef.current)
    }
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

  const toggleScreenShare = async () => {
    const room = roomRef.current
    if (!room) return
    try {
      if (!screenSharing) {
        await room.localParticipant.setScreenShareEnabled(true)
        setTimeout(() => {
          const t = room.localParticipant.getTrackPublication(Track.Source.ScreenShare)?.track
          if (t && screenVideoRef.current) t.attach(screenVideoRef.current)
        }, 300)
        setScreenSharing(true)
      } else {
        const t = room.localParticipant.getTrackPublication(Track.Source.ScreenShare)?.track
        if (t && screenVideoRef.current) t.detach(screenVideoRef.current)
        await room.localParticipant.setScreenShareEnabled(false)
        setScreenSharing(false)
      }
    } catch {
      setScreenSharing(false)
    }
  }

  const hangUp = async () => {
    clearInterval(timerRef.current)
    await roomRef.current?.disconnect()
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
          <ControlBtn icon="✕" label="Отмена" danger onClick={() => setActiveScreen('client')} />
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={styles.screen}>
        <div className={styles.centerState}>
          <div className={styles.avatar}>{currentClient.name.charAt(0).toUpperCase()}</div>
          <p className={styles.clientName}>{currentClient.name}</p>
          <p className={styles.errorText}>{error}</p>
        </div>
        <div className={styles.controls}>
          <ControlBtn icon="✕" label="Назад" danger onClick={() => setActiveScreen('client')} />
        </div>
      </div>
    )
  }

  const remoteParticipant = participants[0] || null
  const remoteScreen = remoteParticipant?.screenTrack || null
  const mainContent = screenSharing
    ? 'local-screen'
    : remoteScreen
    ? 'remote-screen'
    : remoteParticipant?.videoTrack
    ? 'remote-video'
    : 'waiting'

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <p className={styles.headerName}>{currentClient.name}</p>
          <p className={styles.headerDuration}>{formatDuration(duration)}</p>
        </div>
        {(screenSharing || remoteScreen) && (
          <div className={styles.screenBadge}>🖥 Демонстрация</div>
        )}
      </div>

      <div className={styles.videoArea}>
        {mainContent === 'local-screen' && (
          <video ref={screenVideoRef} autoPlay playsInline className={styles.mainVideo} />
        )}
        {mainContent === 'remote-screen' && (
          <RemoteTrackVideo track={remoteScreen} className={styles.mainVideo} />
        )}
        {mainContent === 'remote-video' && (
          <RemoteTrackVideo track={remoteParticipant.videoTrack} className={styles.mainVideo} />
        )}
        {mainContent === 'waiting' && (
          <div className={styles.waitingState}>
            <div className={styles.avatarLg}>{currentClient.name.charAt(0).toUpperCase()}</div>
            <p className={styles.waitingText}>Ожидание участника...</p>
          </div>
        )}

        <div className={styles.localVideoWrap}>
          {camOn
            ? <video ref={localVideoRef} autoPlay muted playsInline className={styles.localVideo} />
            : <div className={styles.localVideoOff}>{currentClient.name.charAt(0).toUpperCase()}</div>
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