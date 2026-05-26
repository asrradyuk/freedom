import { useState, useEffect, useRef } from 'react'
import {
  LiveKitRoom,
  useRoomContext,
  useTracks,
  useLocalParticipant,
  useChat,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { livekitApi } from '../api'
import { useAppStore } from '../store'
import styles from './CallScreen.module.css'

const AUDIO_NORMAL = { noiseSuppression: true, echoCancellation: true, autoGainControl: true }
const AUDIO_ORIGINAL = { noiseSuppression: false, echoCancellation: false, autoGainControl: false, sampleRate: 48000 }

function VideoTile({ trackRef }) {
  const ref = useRef(null)

  useEffect(() => {
    const track = trackRef?.publication?.track
    if (!track || !ref.current) return
    track.attach(ref.current)
    return () => { try { track.detach(ref.current) } catch {} }
  }, [trackRef?.publication?.track])

  const name = trackRef?.participant?.name || '?'
  const hasVideo = !!trackRef?.publication?.track

  return (
    <div className={styles.tile}>
      {hasVideo
        ? <video ref={ref} autoPlay playsInline muted={trackRef?.participant?.isLocal} className={styles.tileVideo} />
        : <div className={styles.tileEmpty}>
            <div className={styles.tileAvatar}>{name.charAt(0).toUpperCase()}</div>
            <p className={styles.tileName}>{name}</p>
          </div>
      }
      <p className={styles.tileLabel}>{name}{trackRef?.participant?.isLocal ? ' (вы)' : ''}</p>
    </div>
  )
}

function AudioTile({ trackRef }) {
  const ref = useRef(null)
  useEffect(() => {
    const track = trackRef?.publication?.track
    if (!track || !ref.current) return
    track.attach(ref.current)
    return () => { try { track.detach(ref.current) } catch {} }
  }, [trackRef?.publication?.track])
  return <audio ref={ref} autoPlay style={{ display: 'none' }} />
}

function VideoGrid() {
  const videoTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true },
     { source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  )
  const audioTracks = useTracks(
    [{ source: Track.Source.Microphone }],
    { onlySubscribed: true }
  )

  const count = videoTracks.length || 1
  const gridClass = count === 1 ? styles.grid1 : count === 2 ? styles.grid2 : styles.grid4

  return (
    <div className={`${styles.videoGrid} ${gridClass}`}>
      {videoTracks.map((t, i) => <VideoTile key={i} trackRef={t} />)}
      {audioTracks.filter(t => !t.participant?.isLocal).map((t, i) => <AudioTile key={i} trackRef={t} />)}
    </div>
  )
}

function ChatPanel({ onClose }) {
  const { chatMessages, send } = useChat()
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSend = () => {
    if (!text.trim()) return
    send(text.trim())
    setText('')
  }

  return (
    <div className={styles.chatPanel}>
      <div className={styles.chatHeader}>
        <span>Чат</span>
        <button className={styles.chatClose} onClick={onClose}>✕</button>
      </div>
      <div className={styles.chatMessages}>
        {chatMessages.length === 0 && <p className={styles.chatEmpty}>Сообщений пока нет</p>}
        {chatMessages.map((m, i) => (
          <div key={i} className={styles.chatMsg}>
            <span className={styles.chatSender}>{m.from?.name || 'Аноним'}</span>
            <span className={styles.chatText}>{m.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className={styles.chatInputRow}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Написать..."
          className={styles.chatField}
        />
        <button className={styles.chatSend} onClick={handleSend}>➤</button>
      </div>
    </div>
  )
}

function Controls({ onHangUp, showChat, setShowChat, isClient }) {
  const room = useRoomContext()
  const { localParticipant } = useLocalParticipant()
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(true)
  const [screen, setScreen] = useState(false)
  const [originalSound, setOriginalSound] = useState(false)
  const [toggling, setToggling] = useState(false)

  const toggleMic = async () => {
    const next = !mic
    await localParticipant.setMicrophoneEnabled(next)
    setMic(next)
  }

  const toggleCam = async () => {
    const next = !cam
    await localParticipant.setCameraEnabled(next)
    setCam(next)
  }

  const toggleScreen = async () => {
    try {
      const next = !screen
      await localParticipant.setScreenShareEnabled(next)
      setScreen(next)
    } catch { setScreen(false) }
  }

  const toggleOriginal = async () => {
    setToggling(true)
    try {
      const next = !originalSound
      const stream = await navigator.mediaDevices.getUserMedia({ audio: next ? AUDIO_ORIGINAL : AUDIO_NORMAL })
      const track = stream.getAudioTracks()[0]
      await localParticipant.setMicrophoneEnabled(false)
      await localParticipant.publishTrack(track, { source: 'microphone' })
      await localParticipant.setMicrophoneEnabled(true)
      setOriginalSound(next)
      setMic(true)
    } catch {} finally { setToggling(false) }
  }

  const hangUp = async () => {
    await room.disconnect()
    onHangUp()
  }

  return (
    <div className={styles.controls}>
      <div className={styles.soundRow}>
        <span className={styles.soundLabel}>Оригинальный звук</span>
        <button className={`${styles.toggle} ${originalSound ? styles.toggleOn : ''}`} onClick={toggleOriginal} disabled={toggling}>
          <span className={styles.toggleThumb} />
        </button>
      </div>
      <div className={styles.btnRow}>
        <CtrlBtn icon={mic ? '🎤' : '🔇'} label={mic ? 'Звук' : 'Выкл'} active={!mic} onClick={toggleMic} />
        <CtrlBtn icon={cam ? '📹' : '🚫'} label={cam ? 'Камера' : 'Выкл'} active={!cam} onClick={toggleCam} />
        <CtrlBtn icon="📵" label="Завершить" danger onClick={hangUp} />
        <CtrlBtn icon="💬" label="Чат" active={showChat} onClick={() => setShowChat(v => !v)} />
        {!isClient && <CtrlBtn icon="🖥" label={screen ? 'Стоп' : 'Экран'} active={screen} onClick={toggleScreen} />}
      </div>
    </div>
  )
}

function CtrlBtn({ icon, label, active, danger, onClick }) {
  return (
    <button className={`${styles.ctrlBtn} ${active ? styles.ctrlActive : ''} ${danger ? styles.ctrlDanger : ''}`} onClick={onClick}>
      <span className={styles.ctrlIcon}>{icon}</span>
      <span className={styles.ctrlLabel}>{label}</span>
    </button>
  )
}

function InnerCall({ onHangUp, isClient }) {
  const [showChat, setShowChat] = useState(false)
  return (
    <div className={styles.callWrap}>
      <div className={styles.videoWrap}>
        <VideoGrid />
      </div>
      {showChat && <ChatPanel onClose={() => setShowChat(false)} />}
      <Controls onHangUp={onHangUp} showChat={showChat} setShowChat={setShowChat} isClient={isClient} />
    </div>
  )
}

function LoadingScreen({ name, error, onCancel }) {
  return (
    <div className={styles.screen}>
      <div className={styles.centerState}>
        <div className={styles.avatarCircle}>{(name || '?').charAt(0).toUpperCase()}</div>
        {name && <p className={styles.clientName}>{name}</p>}
        {error
          ? <p className={styles.errorText}>{error}</p>
          : <><p className={styles.statusText}>Подключение...</p><div className={styles.dots}><span /><span /><span /></div></>
        }
      </div>
      <div className={styles.bottomArea}>
        <button className={styles.hangUpBtn} onClick={onCancel}>{error ? 'Назад' : 'Отмена'}</button>
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
      .catch(() => setError('Не удалось подключиться'))
      .finally(() => setLoading(false))
  }, [])

  if (loading || error || !token)
    return <LoadingScreen name={currentClient.name} error={error} onCancel={() => setActiveScreen('client')} />

  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect video audio
      onDisconnected={() => setActiveScreen('client')} style={{ height: '100dvh' }}>
      <InnerCall onHangUp={() => setActiveScreen('client')} isClient={false} />
    </LiveKitRoom>
  )
}

export function ClientCallScreen({ token, url, onLeave }) {
  return (
    <LiveKitRoom token={token} serverUrl={url} connect video audio
      onDisconnected={onLeave} style={{ height: '100dvh' }}>
      <InnerCall onHangUp={onLeave} isClient={true} />
    </LiveKitRoom>
  )
}