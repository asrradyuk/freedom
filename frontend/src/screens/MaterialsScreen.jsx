import { useEffect, useRef, useState } from 'react'
import { materialsApi } from '../api'
import { useAppStore } from '../store'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { BottomSheet } from '../components/ui/BottomSheet'
import { Input } from '../components/ui/Input'
import styles from './MaterialsScreen.module.css'

function fileIcon(mime) {
  if (!mime) return '📄'
  if (mime.startsWith('image/')) return '🖼️'
  if (mime.includes('pdf')) return '📑'
  if (mime.includes('word') || mime.includes('document')) return '📝'
  if (mime.includes('sheet') || mime.includes('excel')) return '📊'
  if (mime.startsWith('video/')) return '🎬'
  if (mime.startsWith('audio/')) return '🎵'
  return '📄'
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

function FileViewer({ url, mime, name, onClose }) {
  const isImage = mime?.startsWith('image/')
  const isPdf = mime?.includes('pdf')
  const isVideo = mime?.startsWith('video/')
  const isAudio = mime?.startsWith('audio/')
  const canPreview = isImage || isPdf || isVideo || isAudio

  const openExternal = () => {
    window.Telegram?.WebApp?.openLink
      ? window.Telegram.WebApp.openLink(url)
      : window.open(url, '_blank')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px 14px',
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
      }}>
        <p style={{
          margin: 0, fontSize: 14, fontWeight: 500, color: '#fff',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginRight: 12,
        }}>
          {name}
        </p>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={openExternal} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            borderRadius: 10, padding: '7px 14px', fontSize: 13, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}>
            Открыть ↗
          </button>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
            borderRadius: 10, width: 34, height: 34, fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {isImage && (
          <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        )}
        {isPdf && (
          <iframe src={url} title={name} style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} />
        )}
        {isVideo && (
          <video src={url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%' }} />
        )}
        {isAudio && (
          <div style={{ textAlign: 'center', color: '#fff', padding: 32 }}>
            <div style={{ fontSize: 72, marginBottom: 20 }}>🎵</div>
            <p style={{ fontSize: 16, marginBottom: 24, opacity: 0.8 }}>{name}</p>
            <audio src={url} controls style={{ width: '100%', maxWidth: 300 }} />
          </div>
        )}
        {!canPreview && (
          <div style={{ textAlign: 'center', color: '#fff', padding: 32 }}>
            <div style={{ fontSize: 72, marginBottom: 20 }}>📄</div>
            <p style={{ fontSize: 16, marginBottom: 8, opacity: 0.9, fontWeight: 500 }}>{name}</p>
            <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 32 }}>Предпросмотр недоступен</p>
            <button onClick={openExternal} style={{
              background: 'var(--blue-mid)', color: '#fff', border: 'none',
              borderRadius: 14, padding: '14px 32px', fontSize: 15, cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 500,
            }}>
              Открыть файл
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function MaterialsScreen() {
  const { currentClient, setActiveScreen } = useAppStore()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [openingId, setOpeningId] = useState(null)
  const [viewer, setViewer] = useState(null)
  const [search, setSearch] = useState('')
  const [activeFolder, setActiveFolder] = useState(null)
  const [uploadSheet, setUploadSheet] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [uploadForm, setUploadForm] = useState({ display_name: '', folder: '' })
  const fileRef = useRef()

  useEffect(() => {
    materialsApi.list(currentClient.id)
      .then(r => setMaterials(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentClient.id])

  const folders = [...new Set(materials.map(m => m.folder).filter(Boolean))]

  const filtered = materials.filter(m => {
    const name = (m.display_name || m.original_name).toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase())
    const matchFolder = !activeFolder || m.folder === activeFolder
    return matchSearch && matchFolder
  })

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setUploadForm({ display_name: file.name, folder: '' })
    setUploadSheet(true)
    e.target.value = ''
  }

  const handleUpload = async () => {
    if (!pendingFile) return
    const fileToUpload = pendingFile
    const name = uploadForm.display_name || null
    const folderName = uploadForm.folder || null
    setUploadSheet(false)
    setPendingFile(null)
    setUploading(true)
    try {
      const res = await materialsApi.upload(currentClient.id, fileToUpload, name, folderName)
      setMaterials(m => [res.data, ...m])
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch (err) {
      console.error('Upload error:', err?.response?.data || err?.message || err)
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
      alert('Ошибка загрузки: ' + (err?.response?.data?.detail || err?.message || 'неизвестная ошибка'))
    } finally {
      setUploading(false)
    }
  }

  const handleOpen = async (material) => {
    if (openingId) return
    setOpeningId(material.id)
    try {
      const res = await materialsApi.getDownloadUrl(currentClient.id, material.id)
      setViewer({
        url: res.data.url,
        mime: res.data.mime_type,
        name: material.display_name || material.original_name,
      })
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setOpeningId(null)
    }
  }

  const handleDelete = async (material) => {
    if (deletingId) return
    setDeletingId(material.id)
    setMaterials(m => m.filter(x => x.id !== material.id))
    try {
      await materialsApi.delete(currentClient.id, material.id)
    } catch {
      setMaterials(m => [material, ...m])
    } finally {
      setDeletingId(null)
    }
  }

  if (viewer) {
    return <FileViewer url={viewer.url} mime={viewer.mime} name={viewer.name} onClose={() => setViewer(null)} />
  }

  return (
    <div className="screen">
      <div className={styles.header}>
        <button className={styles.back} onClick={() => setActiveScreen('client')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          {currentClient.name}
        </button>
        <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Загрузка...' : '+ Файл'}
        </Button>
        <input ref={fileRef} type="file" hidden onChange={handleFileSelect} />
      </div>

      <div style={{ padding: '0 20px 10px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию..."
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 12,
            border: '1.5px solid var(--gray-light)', fontSize: 14,
            fontFamily: 'var(--font-body)', boxSizing: 'border-box',
            outline: 'none', color: 'var(--gray-dark)', background: '#fff',
          }}
        />
      </div>

      {folders.length > 0 && (
        <div style={{ padding: '0 20px 10px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          <button onClick={() => setActiveFolder(null)} style={{
            flexShrink: 0, padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: !activeFolder ? 'var(--blue-mid)' : 'var(--blue-light)',
            color: !activeFolder ? '#fff' : 'var(--blue-dark)',
            fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: 500,
          }}>
            Все
          </button>
          {folders.map(f => (
            <button key={f} onClick={() => setActiveFolder(f === activeFolder ? null : f)} style={{
              flexShrink: 0, padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: activeFolder === f ? 'var(--blue-mid)' : 'var(--blue-light)',
              color: activeFolder === f ? '#fff' : 'var(--blue-dark)',
              fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: 500,
            }}>
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="screen-content">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--gray-mid)', paddingTop: 40 }}>Загрузка...</p>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📁</span>
            <p className={styles.emptyTitle}>{search ? 'Ничего не найдено' : 'Нет файлов'}</p>
            {!search && (
              <Button variant="primary" onClick={() => fileRef.current?.click()} style={{ marginTop: 16 }}>
                Загрузить файл
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map((m, i) => (
              <Card
                key={m.id}
                className={styles.card}
                style={{ animationDelay: `${i * 0.04}s`, opacity: deletingId === m.id ? 0.4 : 1 }}
                onClick={() => handleOpen(m)}
              >
                <span className={styles.icon}>{fileIcon(m.mime_type)}</span>
                <div className={styles.info}>
                  <p className={styles.filename}>{m.display_name || m.original_name}</p>
                  <p className={styles.meta}>
                    {formatSize(m.file_size)}
                    {m.folder && <span style={{ color: 'var(--blue-mid)', marginLeft: 6 }}>· {m.folder}</span>}
                  </p>
                </div>
                <div className={styles.actions} onClick={e => e.stopPropagation()}>
                  <span className={styles.openHint}>{openingId === m.id ? '...' : '↗'}</span>
                  <button className={styles.delBtn} onClick={() => handleDelete(m)} disabled={!!deletingId}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6"/>
                      <path d="M14 11v6"/>
                    </svg>
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomSheet
        open={uploadSheet}
        onClose={() => { setUploadSheet(false); setPendingFile(null) }}
        title="Загрузить файл"
      >
        {pendingFile && (
          <>
            <div style={{
              padding: '10px 14px', background: 'var(--blue-light)', borderRadius: 12,
              marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>{fileIcon(pendingFile.type)}</span>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--blue-dark)', fontWeight: 500 }}>
                  {pendingFile.name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--blue-mid)' }}>
                  {formatSize(pendingFile.size)}
                </p>
              </div>
            </div>
            <Input
              label="Название"
              value={uploadForm.display_name}
              onChange={e => setUploadForm(f => ({ ...f, display_name: e.target.value }))}
              placeholder="Как назвать файл"
            />
            <Input
              label="Папка (необязательно)"
              value={uploadForm.folder}
              onChange={e => setUploadForm(f => ({ ...f, folder: e.target.value }))}
              placeholder="Домашние задания"
            />
            <Button variant="primary" size="lg" onClick={handleUpload}>
              Загрузить
            </Button>
          </>
        )}
      </BottomSheet>
    </div>
  )
}