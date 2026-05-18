import client from './client'
import type { Product } from './types'

export interface WishlistItemOut {
  product_id: number
  product: Product
  added_at: string
}

export interface WishlistOut {
  items: WishlistItemOut[]
  total: number
}

export const wishlistApi = {
  get: () =>
    client.get<WishlistOut>('/wishlist').then(r => r.data),

  toggle: (productId: number) =>
    client.post<{ added: boolean }>(`/wishlist/${productId}`).then(r => r.data),

  remove: (productId: number) =>
    client.delete(`/wishlist/${productId}`).then(r => r.data),
}
