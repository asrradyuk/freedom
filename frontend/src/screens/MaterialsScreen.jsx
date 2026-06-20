import { useEffect, useRef, useState } from 'react'
import { materialsApi } from '../api'
import { useAppStore } from '../store'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
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

export function MaterialsScreen() {
  const { currentClient, setActiveScreen } = useAppStore()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [openingId, setOpeningId] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    materialsApi.list(currentClient.id)
      .then(r => setMaterials(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [currentClient.id])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await materialsApi.upload(currentClient.id, file)
      setMaterials(m => [res.data, ...m])
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
    } catch {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleOpen = async (material) => {
    if (openingId) return
    setOpeningId(material.id)
    try {
      const res = await materialsApi.getDownloadUrl(currentClient.id, material.id)
      const url = res.data.url
      window.Telegram?.WebApp?.openLink
        ? window.Telegram.WebApp.openLink(url)
        : window.open(url, '_blank')
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
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning')
    } catch {
      setMaterials(m => [material, ...m])
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
    } finally {
      setDeletingId(null)
    }
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
        <input ref={fileRef} type="file" hidden onChange={handleUpload} />
      </div>

      <div className={styles.titleRow}>
        <h1 className={styles.title}>Материалы</h1>
        <span className={styles.count}>{materials.length}</span>
      </div>

      <div className="screen-content">
        {loading ? (
          <div className={styles.empty}><p>Загрузка...</p></div>
        ) : materials.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📁</span>
            <p className={styles.emptyTitle}>Нет файлов</p>
            <p className={styles.emptyText}>Загрузите материалы для этого клиента</p>
            <Button variant="primary" onClick={() => fileRef.current?.click()} style={{ marginTop: 16 }}>
              Загрузить файл
            </Button>
          </div>
        ) : (
          <div className={styles.list}>
            {materials.map((m, i) => (
              <Card
                key={m.id}
                className={styles.card}
                style={{ animationDelay: `${i * 0.04}s`, opacity: deletingId === m.id ? 0.4 : 1 }}
                onClick={() => handleOpen(m)}
              >
                <span className={styles.icon}>{fileIcon(m.mime_type)}</span>
                <div className={styles.info}>
                  <p className={styles.filename}>{m.original_name}</p>
                  <p className={styles.meta}>{formatSize(m.file_size)}</p>
                </div>
                <div className={styles.actions}>
                  <span className={styles.openHint}>{openingId === m.id ? '...' : '↗'}</span>
                  <button
                    className={styles.delBtn}
                    onClick={(e) => { e.stopPropagation(); handleDelete(m) }}
                    disabled={!!deletingId}
                  >
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
    </div>
  )
}