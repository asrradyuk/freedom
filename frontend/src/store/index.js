import { create } from 'zustand'

const ROLE_KEY = 'freedom_role'

export const useAppStore = create((set) => ({
  user: null,
  clients: [],
  currentClient: null,
  activeScreen: 'home',
  subscriptionActive: false,
  role: localStorage.getItem(ROLE_KEY) || null,

  setUser: (user) => set({ user, subscriptionActive: user?.subscription_status === 'active' }),
  setClients: (clients) => set({ clients }),
  setCurrentClient: (client) => set({ currentClient: client }),
  setActiveScreen: (screen) => set({ activeScreen: screen }),
  setRole: (role) => {
    localStorage.setItem(ROLE_KEY, role)
    set({ role, activeScreen: 'home' })
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