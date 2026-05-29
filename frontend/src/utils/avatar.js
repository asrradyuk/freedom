import { useState } from 'react'
import { BASE_API_URL } from '../api'

const API_ORIGIN = BASE_API_URL.replace('/api/v1', '')

export function getAvatarSrc(avatarUrl, tgId) {
  if (avatarUrl) {
    return avatarUrl.startsWith('http') ? avatarUrl : `${API_ORIGIN}${avatarUrl}`
  }
  if (tgId) {
    return `${BASE_API_URL}/profile/tg-avatar/${tgId}`
  }
  return null
}

export function AvatarCircle({ avatarUrl, tgId, name, size = 44, radius = 14, className = '', onClick }) {
  const [err, setErr] = useState(false)
  const src = !err ? getAvatarSrc(avatarUrl, tgId) : null
  const initials = (name || '?').charAt(0).toUpperCase()

  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'var(--blue-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontSize: size * 0.4,
        fontWeight: 700,
        color: 'var(--blue-dark)',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {src && (
        <img
          src={src}
          alt={name}
          onError={() => setErr(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      <span style={{ position: 'relative', zIndex: 0 }}>{initials}</span>
    </div>
  )
}