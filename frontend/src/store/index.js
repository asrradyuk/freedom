import { create } from 'zustand'

export const useAppStore = create((set) => ({
  user: null,
  clients: [],
  currentClient: null,
  activeScreen: 'home',
  subscriptionActive: false,

  setUser: (user) => set({ user, subscriptionActive: user?.subscription_status === 'active' }),
  setClients: (clients) => set({ clients }),
  setCurrentClient: (client) => set({ currentClient: client }),
  setActiveScreen: (screen) => set({ activeScreen: screen }),
  updateClient: (updated) =>
    set((s) => ({
      clients: s.clients.map((c) => (c.id === updated.id ? updated : c)),
      currentClient: s.currentClient?.id === updated.id ? updated : s.currentClient,
    })),
  removeClient: (id) =>
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),
  addClient: (client) => set((s) => ({ clients: [client, ...s.clients] })),
}))