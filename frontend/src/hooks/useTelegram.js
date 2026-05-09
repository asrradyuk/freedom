import { useEffect } from 'react'

export function useTelegram() {
  const tg = window.Telegram?.WebApp

  useEffect(() => {
    if (!tg) return
    tg.ready()
    tg.expand()
    tg.setHeaderColor('#FAFAF7')
    tg.setBackgroundColor('#FAFAF7')
  }, [])

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    initData: tg?.initData || '',
    haptic: tg?.HapticFeedback,
  }
}