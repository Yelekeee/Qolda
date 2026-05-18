import { useEffect, useRef, useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { Send, ArrowLeft, MessageCircle } from 'lucide-react'
import { messagesApi, type MessageOut } from '../api/messages'
import { useUserStore } from '../store/userStore'

export default function BuyerChat() {
  const { sellerId }  = useParams<{ sellerId: string }>()
  const location      = useLocation()
  const user          = useUserStore(s => s.user)
  const id            = Number(sellerId)

  const [messages, setMessages] = useState<MessageOut[]>([])
  const [sellerName, setSellerName] = useState<string>(
    (location.state as { sellerName?: string })?.sellerName ?? 'Продавец'
  )
  const [text, setText]   = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id || !user) return

    Promise.all([
      messagesApi.getConversation(id),
      sellerName === 'Продавец' ? messagesApi.getUserInfo(id) : Promise.resolve(null),
    ]).then(([msgs, info]) => {
      setMessages(msgs)
      if (info) setSellerName(info.name)
    }).finally(() => setLoading(false))
  }, [id, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll for new messages every 5s
  useEffect(() => {
    if (!id || !user) return
    const interval = setInterval(async () => {
      try {
        const msgs = await messagesApi.getConversation(id)
        setMessages(msgs)
      } catch { /* ignore */ }
    }, 5000)
    return () => clearInterval(interval)
  }, [id, user])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || sending || !id) return
    setSending(true)
    try {
      const msg = await messagesApi.send(id, text.trim())
      setMessages(prev => [...prev, msg])
      setText('')
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link to="/" className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="w-9 h-9 rounded-full bg-[#004B57] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {sellerName[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{sellerName}</p>
          <p className="text-xs text-gray-400">Продавец</p>
        </div>
      </div>

      {/* Chat window */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[65vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Загрузка...</div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <MessageCircle size={40} className="mb-3 text-gray-200" />
              <p className="font-medium text-gray-500">Начните диалог</p>
              <p className="text-sm mt-1">Напишите продавцу любой вопрос о товаре</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMine = msg.sender_id === user.id
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? 'bg-[#004B57] text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}>
                    <p>{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-white/50' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="border-t border-gray-100 p-3 flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Напишите сообщение..."
            className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#004B57]/20 border border-gray-200"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="w-10 h-10 bg-[#004B57] hover:bg-[#003840] text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
