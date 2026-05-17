import { create } from 'zustand'

const ROLE_KEY = 'freedom_role'
const ONBOARDING_KEY = 'freedom_onboarding_done'

export const useAppStore = create((set) => ({
  user: null,
  clients: [],
  currentClient: null,
  activeScreen: 'home',
  subscriptionActive: false,
  role: localStorage.getItem(ROLE_KEY) || null,
  onboardingDone: localStorage.getItem(ONBOARDING_KEY) === 'true',

  setUser: (user) => set({ user, subscriptionActive: user?.subscription_status === 'active' }),
  setClients: (clients) => set({ clients }),
  setCurrentClient: (client) => set({ currentClient: client }),
  setActiveScreen: (screen) => set({ activeScreen: screen }),

  setRole: (role) => {
    if (role) localStorage.setItem(ROLE_KEY, role)
    else localStorage.removeItem(ROLE_KEY)
    set({ role, activeScreen: 'home' })
  },

  completeOnboarding: () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    set({ onboardingDone: true })
  },

  updateClient: (updated) =>
    set((s) => ({
      clients: s.clients.map((c) => (c.id === updated.id ? updated : c)),
      currentClient: s.currentClient?.id === updated.id ? updated : s.currentClient,
    })),
  removeClient: (id) =>
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),
  addClient: (client) => set((s) => ({ clients: [client, ...s.clients] })),
}))