import styles from './Card.module.css'

export function Card({ children, onClick, className = '', variant = 'default', style }) {
  return (
    <div
      className={`${styles.card} ${styles[variant]} ${onClick ? styles.clickable : ''} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  )
}
