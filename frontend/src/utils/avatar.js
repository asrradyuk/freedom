const BASE_URL = 'https://freedom-b3m3.onrender.com'

export function getAvatarUrl(avatarUrl, username) {
  if (avatarUrl) {
    return avatarUrl.startsWith('http') ? avatarUrl : `${BASE_URL}${avatarUrl}`
  }
  if (username) {
    return `https://t.me/i/userpic/320/${username}.jpg`
  }
  return null
}

export function AvatarCircle({ avatarUrl, username, name, size = 44, radius = 14, className = '' }) {
  const src = getAvatarUrl(avatarUrl, username)
  const initials = (name || '?').charAt(0).toUpperCase()
  const style = {
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
  }

  return (
    <div style={style} className={className}>
      {src && (
        <img
          src={src}
          alt={name}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { e.target.style.display = 'none' }}
        />
      )}
      <span style={{ position: 'relative', zIndex: 0 }}>{initials}</span>
    </div>
  )
}