import client from './client'
import type { PromoResult } from './types'

export const promoApi = {
  validate: (code: string, order_total: number) =>
    client.post<PromoResult>('/promo/validate', { code, order_total }).then(r => r.data),
}
