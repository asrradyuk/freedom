import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Room,
  RoomEvent,
  Track,
  createLocalTracks,
} from 'livekit-client'
import { livekitApi } from '../api'
import { useAppStore } from '../store'
import styles from './CallScreen.module.css'

export function CallScreen() {
  const { currentClient, setActiveScreen } = useAppStore()
  const [status, setStatus] = useState('connecting')
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [participants, setParticipants] = useState([])
  const [error, setError] = useState(null)
  const [duration, setDuration] = useState(0)

  const roomRef = useRef(null)
  const localVideoRef = useRef(null)
  const timerRef = useRef(null)

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
  }, [])

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const updateParticipants = useCallback((room) => {
    const parts = []
    room.remoteParticipants.forEach(p => {
      const videoTrack = [...p.trackPublications.values()].find(
        pub => pub.track?.kind === Track.Kind.Video && pub.isSubscribed
      )
      parts.push({
        identity: p.identity,
        name: p.name || p.identity,
        videoTrack: videoTrack?.track || null,
      })
    })
    setParticipants([...parts])
  }, [])

  useEffect(() => {
    let room

    const connect = async () => {
      try {
        const res = await livekitApi.getToken(currentClient.id)
        const { token, url } = res.data

        room = new Room({ adaptiveStream: true, dynacast: true })
        roomRef.current = room

        room.on(RoomEvent.ParticipantConnected, () => updateParticipants(room))
        room.on(RoomEvent.ParticipantDisconnected, () => updateParticipants(room))
        room.on(RoomEvent.TrackSubscribed, () => updateParticipants(room))
        room.on(RoomEvent.TrackUnsubscribed, () => updateParticipants(room))
        room.on(RoomEvent.Disconnected, () => setActiveScreen('client'))

        await room.connect(url, token)
        await room.localParticipant.enableCameraAndMicrophone()

        const videoTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track
        if (videoTrack && localVideoRef.current) {
          videoTrack.attach(localVideoRef.current)
        }

        setStatus('connected')
        startTimer()
        updateParticipants(room)
      } catch (e) {
        setError('Не удалось подключиться к звонку')
        setStatus('error')
      }
    }

    connect()

    return () => {
      clearInterval(timerRef.current)
      if (roomRef.current) {
        roomRef.current.disconnect()
      }
    }
  }, [])

  const toggleMic = async () => {
    const room = roomRef.current
    if (!room) return
    await room.localParticipant.setMicrophoneEnabled(!micOn)
    setMicOn(v => !v)
  }

  const toggleCam = async () => {
    const room = roomRef.current
    if (!room) return
    await room.localParticipant.setCameraEnabled(!camOn)
    if (camOn) {
      const videoTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track
      if (videoTrack && localVideoRef.current) videoTrack.detach(localVideoRef.current)
    } else {
      setTimeout(() => {
        const videoTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track
        if (videoTrack && localVideoRef.current) videoTrack.attach(localVideoRef.current)
      }, 500)
    }
    setCamOn(v => !v)
  }

  const hangUp = async () => {
    clearInterval(timerRef.current)
    if (roomRef.current) await roomRef.current.disconnect()
    setActiveScreen('client')
  }

  if (status === 'connecting') {
    return (
      <div className={styles.screen}>
        <div className={styles.connectingState}>
          <div className={styles.avatar}>{currentClient.name.charAt(0).toUpperCase()}</div>
          <p className={styles.clientName}>{currentClient.name}</p>
          <p className={styles.statusText}>Подключение...</p>
          <div className={styles.dots}>
            <span /><span /><span />
          </div>
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
        <div className={styles.connectingState}>
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

  const hasRemote = participants.length > 0

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <p className={styles.headerName}>{currentClient.name}</p>
          <p className={styles.headerDuration}>{formatDuration(duration)}</p>
        </div>
      </div>

      <div className={styles.videoArea}>
        {hasRemote ? (
          <RemoteVideo participant={participants[0]} />
        ) : (
          <div className={styles.waitingState}>
            <div className={styles.avatarLg}>{currentClient.name.charAt(0).toUpperCase()}</div>
            <p className={styles.waitingText}>Ожидание участника...</p>
          </div>
        )}

        <div className={styles.localVideoWrap}>
          {camOn ? (
            <video ref={localVideoRef} autoPlay muted playsInline className={styles.localVideo} />
          ) : (
            <div className={styles.localVideoOff}>
              <span>{currentClient.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.controls}>
        <ControlBtn icon={micOn ? '🎤' : '🔇'} label={micOn ? 'Микрофон' : 'Без звука'} active={!micOn} onClick={toggleMic} />
        <ControlBtn icon="📵" label="Завершить" danger onClick={hangUp} large />
        <ControlBtn icon={camOn ? '📹' : '🚫'} label={camOn ? 'Камера' : 'Камера выкл'} active={!camOn} onClick={toggleCam} />
      </div>
    </div>
  )
}

function RemoteVideo({ participant }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (!participant.videoTrack || !videoRef.current) return
    participant.videoTrack.attach(videoRef.current)
    return () => participant.videoTrack?.detach(videoRef.current)
  }, [participant.videoTrack])

  return participant.videoTrack ? (
    <video ref={videoRef} autoPlay playsInline className={styles.remoteVideo} />
  ) : (
    <div className={styles.remoteNoVideo}>
      <div className={styles.avatarLg}>{participant.name.charAt(0).toUpperCase()}</div>
      <p className={styles.waitingText}>{participant.name}</p>
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