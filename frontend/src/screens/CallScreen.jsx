import { useState, useEffect, useRef } from 'react'
import {
  LiveKitRoom,
  useRoomContext,
  useTracks,
  useLocalParticipant,
  useChat,
  useParticipants,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { livekitApi } from '../api'
import { useAppStore } from '../store'
import styles from './CallScreen.module.css'

const AUDIO_NORMAL = { noiseSuppression: true, echoCancellation: true, autoGainControl: true }
const AUDIO_ORIGINAL = { noiseSuppression: false, echoCancellation: false, autoGainControl: false, sampleRate: 48000 }

function TrackVideo({ track, muted = false, className }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!track || !ref.current) return
    track.attach(ref.current)
    return () => { try { track.detach(ref.current) } catch {} }
  }, [track])
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />
}

function TrackAudio({ track }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!track || !ref.current) return
    track.attach(ref.current)
    return () => { try { track.detach(ref.current) } catch {} }
  }, [track])
  return <audio ref={ref} autoPlay />
}

function Avatar({ name, large }) {
  return (
    <div className={large ? styles.avatarLarge : styles.avatarSmall}>
      <span>{(name || '?').charAt(0).toUpperCase()}</span>
    </div>
  )
}

function VideoArea() {
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()

  const remoteTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false },
     { source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: true }
  ).filter(t => !t.participant?.isLocal)

  const audioTracks = useTracks(
    [{ source: Track.Source.Microphone }],
    { onlySubscribed: true }
  ).filter(t => !t.participant?.isLocal)

  const localCamPub = localParticipant?.getTrackPublication(Track.Source.Camera)
  const localCamTrack = localCamPub?.track
  const localName = localParticipant?.name || 'Вы'

  const remoteParticipants = participants.filter(p => !p.isLocal)
  const hasRemoteVideo = remoteTracks.length > 0

  return (
    <div className={styles.videoArea}>
      {/* Аудио (невидимое) */}
      {audioTracks.map((t, i) => (
        t.publication?.track && <TrackAudio key={i} track={t.publication.track} />
      ))}

      {/* Основная зона — удалённые участники */}
      <div className={styles.remoteArea}>
        {remoteTracks.length === 0 ? (
          <div className={styles.waitingState}>
            {remoteParticipants.length === 0 ? (
              <>
                <Avatar name="?" large />
                <p className={styles.waitingText}>Ожидание участника...</p>
              </>
            ) : (
              remoteParticipants.map(p => (
                <div key={p.identity} className={styles.remoteEmpty}>
                  <Avatar name={p.name} large />
                  <p className={styles.remoteName}>{p.name}</p>
                </div>
              ))
            )}
          </div>
        ) : remoteTracks.length === 1 ? (
          <TrackVideo
            track={remoteTracks[0].publication?.track}
            className={styles.remoteVideoFull}
          />
        ) : (
          <div className={styles.remoteGrid}>
            {remoteTracks.map((t, i) => (
              <TrackVideo
                key={i}
                track={t.publication?.track}
                className={styles.remoteVideoGrid}
              />
            ))}
          </div>
        )}
      </div>

      {/* Локальное видео — маленькое в углу */}
      <div className={styles.localVideoWrap}>
        {localCamTrack
          ? <TrackVideo track={localCamTrack} muted className={styles.localVideo} />
          : <Avatar name={localName} />
        }
        <p className={styles.localLabel}>Вы</p>
      </div>
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

function CtrlBtn({ icon, label, active, danger, onClick }) {
  return (
    <button
      className={`${styles.ctrlBtn} ${active ? styles.ctrlActive : ''} ${danger ? styles.ctrlDanger : ''}`}
      onClick={onClick}
    >
      <span className={styles.ctrlIcon}>{icon}</span>
      <span className={styles.ctrlLabel}>{label}</span>
    </button>
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
      await localParticipant.setScreenShareEnabled(!screen)
      setScreen(v => !v)
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
        <button
          className={`${styles.toggle} ${originalSound ? styles.toggleOn : ''}`}
          onClick={toggleOriginal}
          disabled={toggling}
        >
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

function InnerCall({ onHangUp, isClient }) {
  const [showChat, setShowChat] = useState(false)
  return (
    <div className={styles.callWrap}>
      <VideoArea />
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