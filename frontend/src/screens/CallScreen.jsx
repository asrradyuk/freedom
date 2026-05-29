import { useState, useEffect, useRef, useCallback } from 'react'
import {
  LiveKitRoom,
  useRoomContext,
  useTracks,
  useLocalParticipant,
  useChat,
  useParticipants,
} from '@livekit/components-react'
import { Track, createLocalAudioTrack } from 'livekit-client'
import { livekitApi } from '../api'
import { useAppStore } from '../store'
import styles from './CallScreen.module.css'

const AUDIO_NORMAL = { noiseSuppression: true, echoCancellation: true, autoGainControl: true }
const AUDIO_ORIGINAL = { noiseSuppression: false, echoCancellation: false, autoGainControl: false, sampleRate: 48000 }

async function publishAudioTrack(localParticipant, constraints) {
  const existing = localParticipant.getTrackPublication(Track.Source.Microphone)
  if (existing?.track) {
    await localParticipant.unpublishTrack(existing.track)
    existing.track.mediaStreamTrack.stop()
  }
  const track = await createLocalAudioTrack(constraints)
  await localParticipant.publishTrack(track, { source: Track.Source.Microphone })
  return track
}

async function unpublishAudioTrack(localParticipant) {
  const pub = localParticipant.getTrackPublication(Track.Source.Microphone)
  if (!pub?.track) return
  await localParticipant.unpublishTrack(pub.track)
  pub.track.mediaStreamTrack.stop()
}

function stopAllLocalTracks(localParticipant) {
  try {
    localParticipant.getTrackPublications().forEach(pub => {
      try { pub.track?.mediaStreamTrack?.stop() } catch {}
    })
  } catch {}
}

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
    const el = ref.current
    track.attach(el)
    el.play().catch(() => {})
    return () => { try { track.detach(el) } catch {} }
  }, [track])
  return <audio ref={ref} autoPlay playsInline />
}

function VideoArea() {
  const { localParticipant } = useLocalParticipant()
  const participants = useParticipants()

  const remoteCamTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: true }
  ).filter(t => !t.participant?.isLocal)

  const remoteScreenTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: true }
  ).filter(t => !t.participant?.isLocal)

  const localScreenTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false }
  ).filter(t => t.participant?.isLocal)

  const audioTracks = useTracks(
    [{ source: Track.Source.Microphone }],
    { onlySubscribed: true }
  ).filter(t => !t.participant?.isLocal)

  const localCamTrack = localParticipant?.getTrackPublication(Track.Source.Camera)?.track
  const localName = localParticipant?.name || 'Вы'

  const mainTrack = remoteScreenTracks[0]?.publication?.track
    || localScreenTracks[0]?.publication?.track
    || remoteCamTracks[0]?.publication?.track
  const mainMuted = !remoteScreenTracks[0] && !!localScreenTracks[0]
  const pipTrack = (remoteScreenTracks[0] || localScreenTracks[0])
    ? remoteCamTracks[0]?.publication?.track
    : null

  const remoteParticipant = participants.find(p => !p.isLocal)

  return (
    <div className={styles.videoArea}>
      {audioTracks.map((t, i) =>
        t.publication?.track && <TrackAudio key={i} track={t.publication.track} />
      )}
      <div className={styles.mainVideo}>
        {mainTrack ? (
          <TrackVideo track={mainTrack} muted={mainMuted} className={styles.mainVideoEl} />
        ) : (
          <div className={styles.waitingState}>
            <div className={styles.waitingAvatar}>
              {(remoteParticipant?.name || '?').charAt(0).toUpperCase()}
            </div>
            <p className={styles.waitingText}>
              {remoteParticipant ? remoteParticipant.name : 'Ожидание участника...'}
            </p>
          </div>
        )}
      </div>
      {pipTrack && (
        <div className={styles.pip}>
          <TrackVideo track={pipTrack} className={styles.pipVideo} />
        </div>
      )}
      <div className={styles.localWrap}>
        {localCamTrack
          ? <TrackVideo track={localCamTrack} muted className={styles.localVideo} />
          : <div className={styles.localAvatar}>{localName.charAt(0).toUpperCase()}</div>
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
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])
  const handleSend = () => { if (!text.trim()) return; send(text.trim()); setText('') }
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

function CtrlBtn({ icon, label, active, danger, disabled, onClick }) {
  return (
    <button
      className={`${styles.ctrlBtn} ${active ? styles.ctrlActive : ''} ${danger ? styles.ctrlDanger : ''}`}
      onClick={onClick}
      disabled={disabled}
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
  const [micBusy, setMicBusy] = useState(false)
  const [camBusy, setCamBusy] = useState(false)
  const [screenBusy, setScreenBusy] = useState(false)

  const toggleMic = useCallback(async () => {
    if (micBusy) return
    setMicBusy(true)
    try {
      if (mic) {
        await unpublishAudioTrack(localParticipant)
        setMic(false)
      } else {
        await publishAudioTrack(localParticipant, originalSound ? AUDIO_ORIGINAL : AUDIO_NORMAL)
        setMic(true)
      }
    } catch {
    } finally {
      setMicBusy(false)
    }
  }, [mic, micBusy, originalSound, localParticipant])

  const toggleCam = useCallback(async () => {
    if (camBusy) return
    setCamBusy(true)
    try {
      if (cam) {
        const pub = localParticipant.getTrackPublication(Track.Source.Camera)
        if (pub?.track) {
          await localParticipant.unpublishTrack(pub.track)
          pub.track.mediaStreamTrack.stop()
        }
        setCam(false)
      } else {
        await localParticipant.setCameraEnabled(true)
        setCam(true)
      }
    } catch {
    } finally {
      setCamBusy(false)
    }
  }, [cam, camBusy, localParticipant])

  const toggleScreen = useCallback(async () => {
    if (screenBusy) return
    setScreenBusy(true)
    try {
      await localParticipant.setScreenShareEnabled(!screen)
      setScreen(v => !v)
    } catch {
      setScreen(false)
    } finally {
      setScreenBusy(false)
    }
  }, [screen, screenBusy, localParticipant])

  const toggleOriginal = useCallback(async () => {
    if (micBusy) return
    setMicBusy(true)
    const next = !originalSound
    try {
      await publishAudioTrack(localParticipant, next ? AUDIO_ORIGINAL : AUDIO_NORMAL)
      setOriginalSound(next)
      setMic(true)
    } catch {
    } finally {
      setMicBusy(false)
    }
  }, [originalSound, micBusy, localParticipant])

  const hangUp = useCallback(async () => {
    stopAllLocalTracks(localParticipant)
    try { await room.disconnect() } finally { onHangUp() }
  }, [localParticipant, room, onHangUp])

  return (
    <div className={styles.controls}>
      <div className={styles.soundRow}>
        <span className={styles.soundLabel}>Оригинальный звук</span>
        <button
          className={`${styles.toggle} ${originalSound ? styles.toggleOn : ''}`}
          onClick={toggleOriginal}
          disabled={micBusy}
        >
          <span className={styles.toggleThumb} />
        </button>
      </div>
      <div className={styles.btnRow}>
        <CtrlBtn
          icon={micBusy ? '⏳' : mic ? '🎤' : '🔇'}
          label={mic ? 'Звук' : 'Выкл'}
          active={!mic}
          disabled={micBusy}
          onClick={toggleMic}
        />
        <CtrlBtn
          icon={camBusy ? '⏳' : cam ? '📹' : '🚫'}
          label={cam ? 'Камера' : 'Выкл'}
          active={!cam}
          disabled={camBusy}
          onClick={toggleCam}
        />
        <CtrlBtn icon="📵" label="Завершить" danger onClick={hangUp} />
        <CtrlBtn icon="💬" label="Чат" active={showChat} onClick={() => setShowChat(v => !v)} />
        {!isClient && (
          <CtrlBtn
            icon={screenBusy ? '⏳' : '🖥'}
            label={screen ? 'Стоп' : 'Экран'}
            active={screen}
            disabled={screenBusy}
            onClick={toggleScreen}
          />
        )}
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

function CallLoadingScreen({ name, error, onCancel }) {
  return (
    <div className={styles.screen}>
      <div className={styles.centerState}>
        <div className={styles.avatarCircle}>{(name || '?').charAt(0).toUpperCase()}</div>
        {name && <p className={styles.clientName}>{name}</p>}
        {error
          ? <p className={styles.errorText}>{error}</p>
          : (
            <>
              <p className={styles.statusText}>Подключение...</p>
              <div className={styles.dots}><span /><span /><span /></div>
            </>
          )
        }
      </div>
      <div className={styles.bottomArea}>
        <button className={styles.hangUpBtn} onClick={onCancel}>
          {error ? 'Назад' : 'Отмена'}
        </button>
      </div>
    </div>
  )
}

export function CallScreen() {
  const { currentClient, setActiveScreen } = useAppStore()
  const [roomData, setRoomData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    livekitApi.getToken(currentClient.id)
      .then(r => setRoomData({ token: r.data.token, url: r.data.url }))
      .catch(() => setError('Не удалось подключиться. Проверьте подписку и попробуйте снова.'))
  }, [])

  if (error || !roomData) {
    return (
      <CallLoadingScreen
        name={currentClient.name}
        error={error}
        onCancel={() => setActiveScreen('client')}
      />
    )
  }

  return (
    <LiveKitRoom
      token={roomData.token}
      serverUrl={roomData.url}
      connect
      video
      audio
      onDisconnected={() => setActiveScreen('client')}
      style={{ height: '100dvh' }}
    >
      <InnerCall onHangUp={() => setActiveScreen('client')} isClient={false} />
    </LiveKitRoom>
  )
}

export function ClientCallScreen({ token, url, onLeave }) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect
      video
      audio
      onDisconnected={onLeave}
      style={{ height: '100dvh' }}
    >
      <InnerCall onHangUp={onLeave} isClient={true} />
    </LiveKitRoom>
  )
}