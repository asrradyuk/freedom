import styles from './Button.module.css'

export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, className = '', ...props }) {
  return (
    <button
      className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
