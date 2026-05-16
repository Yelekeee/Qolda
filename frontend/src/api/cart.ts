import client from './client'
import type { Product } from './types'

export interface CartItemOut {
  product_id: number
  quantity: number
  product: Product
}

export interface CartOut {
  items: CartItemOut[]
  total: number
}

export const cartApi = {
  get: () =>
    client.get<CartOut>('/cart').then(r => r.data),

  add: (productId: number, quantity = 1) =>
    client.post<CartItemOut>(`/cart/${productId}`, { quantity }).then(r => r.data),

  update: (productId: number, quantity: number) =>
    client.put<CartItemOut>(`/cart/${productId}`, { quantity }).then(r => r.data),

  remove: (productId: number) =>
    client.delete(`/cart/${productId}`).then(r => r.data),

  clear: () =>
    client.delete('/cart').then(r => r.data),
}
