import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../api/types'
import { wishlistApi } from '../api/wishlist'

interface WishlistStore {
  items: Product[]
  toggle:          (product: Product) => Promise<void>
  has:             (id: number) => boolean
  remove:          (id: number) => Promise<void>
  loadFromBackend: () => Promise<void>
}

function isLoggedIn() {
  return !!localStorage.getItem('token')
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      toggle: async (product) => {
        const exists = get().items.some(p => p.id === product.id)
        set(s => ({
          items: exists
            ? s.items.filter(p => p.id !== product.id)
            : [...s.items, product],
        }))
        if (isLoggedIn()) {
          wishlistApi.toggle(product.id).catch(() => {})
        }
      },

      has: (id) => get().items.some(p => p.id === id),

      remove: async (id) => {
        set(s => ({ items: s.items.filter(p => p.id !== id) }))
        if (isLoggedIn()) {
          wishlistApi.remove(id).catch(() => {})
        }
      },

      loadFromBackend: async () => {
        if (!isLoggedIn()) return
        try {
          const data = await wishlistApi.get()
          set({ items: data.items.map(i => i.product) })
        } catch {
          // keep local state on error
        }
      },
    }),
    { name: 'qolda-wishlist' },
  ),
)
