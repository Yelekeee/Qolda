import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '../api/types'
import { cartApi } from '../api/cart'

export interface CartItem {
  product: Product
  quantity: number
}

interface CartState {
  items: CartItem[]
  addItem:         (product: Product, quantity?: number) => Promise<void>
  removeItem:      (productId: number) => Promise<void>
  updateQuantity:  (productId: number, quantity: number) => Promise<void>
  clear:           () => Promise<void>
  total:           () => number
  count:           () => number
  loadFromBackend: () => Promise<void>
}

function isLoggedIn() {
  return !!localStorage.getItem('token')
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: async (product, quantity = 1) => {
        set(state => {
          const existing = state.items.find(i => i.product.id === product.id)
          if (existing) {
            return {
              items: state.items.map(i =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            }
          }
          return { items: [...state.items, { product, quantity }] }
        })
        if (isLoggedIn()) {
          cartApi.add(product.id, quantity).catch(() => {})
        }
      },

      removeItem: async (productId) => {
        set(state => ({ items: state.items.filter(i => i.product.id !== productId) }))
        if (isLoggedIn()) {
          cartApi.remove(productId).catch(() => {})
        }
      },

      updateQuantity: async (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set(state => ({
          items: state.items.map(i =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        }))
        if (isLoggedIn()) {
          cartApi.update(productId, quantity).catch(() => {})
        }
      },

      clear: async () => {
        set({ items: [] })
        if (isLoggedIn()) {
          cartApi.clear().catch(() => {})
        }
      },

      total: () => {
        return get().items.reduce((sum, item) => {
          const price = item.product.discount_price ?? item.product.price
          return sum + price * item.quantity
        }, 0)
      },

      count: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

      loadFromBackend: async () => {
        if (!isLoggedIn()) return
        try {
          const data = await cartApi.get()
          set({
            items: data.items.map(i => ({ product: i.product, quantity: i.quantity })),
          })
        } catch {
          // keep local state on error
        }
      },
    }),
    { name: 'qolda-cart' }
  )
)
