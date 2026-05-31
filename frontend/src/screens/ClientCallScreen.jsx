import { useState, useEffect, useRef, useCallback } from 'react'
import {
  LiveKitRoom,
  useRoomContext,
  useTracks,
  useLocalParticipant,
  useParticipants,
  useChat,
} from '@livekit/components-react'
import { Track, createLocalAudioTrack } from 'livekit-client'
import styles from './CallScreen.module.css'

const AUDIO_NORMAL = {
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
}
const AUDIO_ORIGINAL = {
  noiseSuppression: false,
  echoCancellation: false,
  autoGainControl: false,
  sampleRate: 48000,
}

async function replaceAudioTrack(localParticipant, constraints) {
  const pubs = localParticipant.getTrackPublications()
  for (const pub of pubs.values()) {
    if (pub.source === Track.Source.Microphone || pub.kind === 'audio') {
      try { await localParticipant.unpublishTrack(pub.track, true) } catch {}
    }
  }
  const track = await createLocalAudioTrack(constraints)
  await localParticipant.publishTrack(track, { source: Track.Source.Microphone })
  return track
}

async function removeAudioTrack(localParticipant) {
  const pubs = localParticipant.getTrackPublications()
  for (const pub of pubs.values()) {
    if (pub.source === Track.Source.Microphone || pub.kind === 'audio') {
      try { await localParticipant.unpublishTrack(pub.track, true) } catch {}
    }
  }
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

  const audioTracks = useTracks(
    [{ source: Track.Source.Microphone }],
    { onlySubscribed: true }
  ).filter(t => !t.participant?.isLocal)

  const localCamTrack = localParticipant?.getTrackPublication(Track.Source.Camera)?.track
  const localName = localParticipant?.name || 'Вы'
  const remoteParticipant = participants.find(p => !p.isLocal)

  const mainTrack =
    remoteScreenTracks[0]?.publication?.track ||
    remoteCamTracks[0]?.publication?.track

  return (
    <div className={styles.videoArea}>
      {audioTracks.map((t, i) =>
        t.publication?.track ? <TrackAudio key={i} track={t.publication.track} /> : null
      )}
      <div className={styles.mainVideo}>
        {mainTrack ? (
          <TrackVideo track={mainTrack} className={styles.mainVideoEl} />
        ) : (
          <div className={styles.waitingState}>
            <div className={styles.waitingAvatar}>
              {(remoteParticipant?.name || '?').charAt(0).toUpperCase()}
            </div>
            <p className={styles.waitingText}>
              {remoteParticipant ? remoteParticipant.name : 'Ожидание специалиста...'}
            </p>
          </div>
        )}
      </div>
      <div className={styles.localWrap}>
        {localCamTrack ? (
          <TrackVideo track={localCamTrack} muted className={styles.localVideo} />
        ) : (
          <div className={styles.localAvatar}>{localName.charAt(0).toUpperCase()}</div>
        )}
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

function InnerClientCall({ onLeave }) {
  const room = useRoomContext()
  const { localParticipant } = useLocalParticipant()
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [originalSound, setOriginalSound] = useState(false)
  const [audioBusy, setAudioBusy] = useState(false)
  const [camBusy, setCamBusy] = useState(false)

  const toggleMic = useCallback(async () => {
    if (audioBusy) return
    setAudioBusy(true)
    try {
      if (mic) {
        await removeAudioTrack(localParticipant)
        setMic(false)
      } else {
        await replaceAudioTrack(localParticipant, originalSound ? AUDIO_ORIGINAL : AUDIO_NORMAL)
        setMic(true)
      }
    } catch {
    } finally {
      setAudioBusy(false)
    }
  }, [mic, audioBusy, originalSound, localParticipant])

  const toggleOriginal = useCallback(async () => {
    if (audioBusy) return
    setAudioBusy(true)
    const next = !originalSound
    try {
      await replaceAudioTrack(localParticipant, next ? AUDIO_ORIGINAL : AUDIO_NORMAL)
      setOriginalSound(next)
      setMic(true)
    } catch {
    } finally {
      setAudioBusy(false)
    }
  }, [originalSound, audioBusy, localParticipant])

  const toggleCam = useCallback(async () => {
    if (camBusy) return
    setCamBusy(true)
    try {
      if (cam) {
        const pub = localParticipant.getTrackPublication(Track.Source.Camera)
        if (pub?.track) await localParticipant.unpublishTrack(pub.track, true)
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

  const hangUp = useCallback(async () => {
    try {
      const pubs = localParticipant.getTrackPublications()
      for (const pub of pubs.values()) {
        try { pub.track?.mediaStreamTrack?.stop() } catch {}
      }
    } catch {}
    try { await room.disconnect() } finally { onLeave() }
  }, [localParticipant, room, onLeave])

  return (
    <div className={styles.callWrap}>
      <VideoArea />
      {showChat && <ChatPanel onClose={() => setShowChat(false)} />}
      <div className={styles.controls}>
        <div className={styles.soundRow}>
          <span className={styles.soundLabel}>Оригинальный звук</span>
          <button
            className={`${styles.toggle} ${originalSound ? styles.toggleOn : ''}`}
            onClick={toggleOriginal}
            disabled={audioBusy}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
        <div className={styles.btnRow}>
          <button
            className={`${styles.ctrlBtn} ${!mic ? styles.ctrlActive : ''}`}
            onClick={toggleMic}
            disabled={audioBusy}
          >
            <span className={styles.ctrlIcon}>{audioBusy ? '⏳' : mic ? '🎤' : '🔇'}</span>
            <span className={styles.ctrlLabel}>{mic ? 'Звук' : 'Выкл'}</span>
          </button>
          <button
            className={`${styles.ctrlBtn} ${!cam ? styles.ctrlActive : ''}`}
            onClick={toggleCam}
            disabled={camBusy}
          >
            <span className={styles.ctrlIcon}>{camBusy ? '⏳' : cam ? '📹' : '🚫'}</span>
            <span className={styles.ctrlLabel}>{cam ? 'Камера' : 'Выкл'}</span>
          </button>
          <button className={`${styles.ctrlBtn} ${styles.ctrlDanger}`} onClick={hangUp}>
            <span className={styles.ctrlIcon}>📵</span>
            <span className={styles.ctrlLabel}>Завершить</span>
          </button>
          <button
            className={`${styles.ctrlBtn} ${showChat ? styles.ctrlActive : ''}`}
            onClick={() => setShowChat(v => !v)}
          >
            <span className={styles.ctrlIcon}>💬</span>
            <span className={styles.ctrlLabel}>Чат</span>
          </button>
        </div>
      </div>
    </div>
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
      <InnerClientCall onLeave={onLeave} />
    </LiveKitRoom>
  )
}