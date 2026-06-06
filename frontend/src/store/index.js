import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAppStore = create(
  persist(
    (set, get) => ({
      user: null,
      clients: [],
      role: null,
      onboardingDone: false,
      activeScreen: 'home',
      currentClient: null,

      setUser: (user) => set({ user }),

      setClients: (clients) => set({ clients }),

      setRole: (role) => set({ role, activeScreen: 'home' }),

      completeOnboarding: () => set({ onboardingDone: true }),

      setActiveScreen: (screen) => set({ activeScreen: screen }),

      setCurrentClient: (client) => set({ currentClient: client }),

      updateClient: (updated) => set((state) => ({
        clients: state.clients.map((c) => c.id === updated.id ? updated : c),
        currentClient: state.currentClient?.id === updated.id ? updated : state.currentClient,
      })),

      removeClient: (id) => set((state) => ({
        clients: state.clients.filter((c) => c.id !== id),
        currentClient: state.currentClient?.id === id ? null : state.currentClient,
      })),

      addClient: (client) => set((state) => ({
        clients: [client, ...state.clients],
      })),

      get subscriptionActive() {
        const user = get().user
        if (!user) return false
        if (user.subscription_status !== 'active') return false
        if (!user.subscription_expires_at) return false
        return new Date(user.subscription_expires_at) > new Date()
      },
    }),
    {
      name: 'freedom-store',
      partialize: (state) => ({
        role: state.role,
        onboardingDone: state.onboardingDone,
        user: state.user,
      }),
    }
  )
)

export { useAppStore }
export default useAppStore