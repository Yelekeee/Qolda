import client from './client'
import type { Notification } from './types'

export const notificationsApi = {
  getAll: () =>
    client.get<Notification[]>('/notifications').then(r => r.data),

  getUnreadCount: () =>
    client.get<{ count: number }>('/notifications/unread-count').then(r => r.data),

  markRead: (id: number) =>
    client.post(`/notifications/${id}/read`).then(r => r.data),

  markAllRead: () =>
    client.post('/notifications/read-all').then(r => r.data),
}
