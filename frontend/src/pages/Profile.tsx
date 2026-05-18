import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Zap, ShoppingBag, Edit2, Check, X, TrendingUp, ShoppingCart, BarChart2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { Recommendation } from '../api/types'
import { recsApi } from '../api/recommendations'
import { authApi } from '../api/auth'
import { ordersApi } from '../api/orders'
import { useUserStore } from '../store/userStore'
import { toast } from '../store/toastStore'
import RecommendationCard from '../components/RecommendationCard'

const PIE_COLORS = ['#004B57', '#F5A623', '#6366f1', '#10b981', '#f43f5e']

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' млн ₸'
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' тыс ₸'
  return n.toLocaleString('ru-KZ') + ' ₸'
}

interface Stats {
  total_orders: number
  total_spent: number
  avg_order: number
  by_month: { name: string; spent: number }[]
  by_category: { name: string; count: number; spent: number }[]
}

export default function Profile() {
  const { user, setAuth } = useUserStore()
  const [recs, setRecs]   = useState<Recommendation[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading]   = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [name, setName]       = useState(user?.name ?? '')
  const [email, setEmail]     = useState(user?.email ?? '')
  const [saving, setSaving]   = useState(false)

  const [editing, setEditing]   = useState(false)
  const [name, setName]         = useState(user?.name ?? '')
  const [email, setEmail]       = useState(user?.email ?? '')
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    if (!user) return
    setName(user.name)
    setEmail(user.email)

    recsApi.forUser(user.id, 16)
      .then(setRecs)
      .finally(() => setLoading(false))

    ordersApi.getMyStats()
      .then(setStats)
      .finally(() => setStatsLoading(false))
  }, [user])

  if (!user) return null

  const initials = user.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const updated = await authApi.updateMe({ name: name.trim(), email: email.trim() })
      const token = localStorage.getItem('token') ?? ''
      setAuth(updated, token)
      setEditing(false)
      toast.success('Профиль сақталды / Профиль сохранён')
    } catch {
      toast.error('Сақтау қатесі / Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setName(user.name)
    setEmail(user.email)
    setEditing(false)
  }

  const methodCounts = recs.reduce<Record<string, number>>((acc, r) => {
    acc[r.method] = (acc[r.method] || 0) + 1
    return acc
  }, {})

  const METHOD_COLORS: Record<string, string> = {
    collaborative: 'bg-purple-100 text-purple-700',
    content_based: 'bg-[#004B57]/10 text-[#004B57]',
    popular:       'bg-amber-100 text-amber-700',
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

      {/* Hero card */}
      <div className="bg-gradient-to-br from-[#004B57] to-[#006070] rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 text-white text-2xl flex items-center justify-center font-bold flex-shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-2">
                <input
                  className="bg-white/15 border border-white/20 text-white placeholder-white/50 rounded-lg px-3 py-1.5 text-sm w-full max-w-xs focus:outline-none focus:border-white/40"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Имя"
                />
                <input
                  type="email"
                  className="bg-white/15 border border-white/20 text-white placeholder-white/50 rounded-lg px-3 py-1.5 text-sm w-full max-w-xs focus:outline-none focus:border-white/40"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                />
              </div>
            ) : (
              <>
                <h1 className="text-xl md:text-2xl font-bold">{user.name}</h1>
                <p className="text-white/60 text-sm mt-0.5">{user.email}</p>
                <p className="text-white/40 text-xs mt-1">
                  Тіркелген: {new Date(user.created_at).toLocaleDateString('ru-RU')}
                  {user.is_seller && <span className="ml-2 bg-[#F5A623]/20 text-[#F5A623] text-xs px-2 py-0.5 rounded-full font-medium">Продавец</span>}
                  {user.is_admin  && <span className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium">Admin</span>}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors">
                  <Check size={14} /> {saving ? '...' : 'Сохранить'}
                </button>
                <button onClick={handleCancel} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/70 text-sm px-3 py-2 rounded-xl transition-colors">
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors border border-white/10">
                  <Edit2 size={14} /> Редактировать
                </button>
                <Link to="/orders" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors border border-white/10">
                  <Package size={15} /> Тапсырыстарым
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Analytics dashboard */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-[#004B57]/10 rounded-lg flex items-center justify-center">
            <BarChart2 size={15} className="text-[#004B57]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Менің статистикам / Моя аналитика</h2>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : stats && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { icon: ShoppingCart,  label: 'Жасалған тапсырыстар',  value: stats.total_orders,    unit: 'заказов',   color: 'text-blue-600',   bg: 'bg-blue-50' },
                { icon: TrendingUp,    label: 'Барлық шығын',          value: fmt(stats.total_spent), unit: '',          color: 'text-[#004B57]',  bg: 'bg-[#004B57]/5' },
                { icon: ShoppingBag,   label: 'Орт. тапсырыс суммасы', value: fmt(stats.avg_order),   unit: '',          color: 'text-amber-600',  bg: 'bg-amber-50' },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                  <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <Icon size={20} className={color} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            {stats.total_orders > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Spending by month */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-sm font-semibold text-gray-700 mb-4">Шығын бойынша / Расходы по месяцам</p>
                  {stats.by_month.some(m => m.spent > 0) ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={stats.by_month} barSize={22}>
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => v >= 1000 ? `${v/1000}K` : String(v)} axisLine={false} tickLine={false} width={36} />
                        <Tooltip
                          formatter={(v: number) => [v.toLocaleString('ru-KZ') + ' ₸', 'Потрачено']}
                          contentStyle={{ fontSize: 12, border: 'none', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                        />
                        <Bar dataKey="spent" fill="#004B57" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
                      Данных пока нет
                    </div>
                  )}
                </div>

                {/* Category breakdown */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-sm font-semibold text-gray-700 mb-4">Санаттар бойынша / По категориям</p>
                  {stats.by_category.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={stats.by_category}
                          dataKey="spent"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={3}
                        >
                          {stats.by_category.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => [v.toLocaleString('ru-KZ') + ' ₸', 'Потрачено']}
                          contentStyle={{ fontSize: 12, border: 'none', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                        />
                        <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: '#6b7280' }}>{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
                      Нет данных
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ML Recommendations */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-2">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Менің рекомендацияларым</h2>
            <p className="text-sm text-gray-400 mt-0.5">Мои персональные рекомендации</p>
          </div>
          <span className="flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-purple-100 w-fit">
            <Zap size={11} /> ML · Hybrid (SVD + TF-IDF)
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-5">
          Collaborative Filtering (SVD) + Content-Based Filtering (TF-IDF) гибридтік моделі негізінде жасалған ұсыныстар
        </p>

        {recs.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {Object.entries(methodCounts).map(([method, count]) => (
              <span key={method} className={`text-xs font-semibold px-3 py-1.5 rounded-full ${METHOD_COLORS[method] ?? 'bg-gray-100 text-gray-600'}`}>
                {method.replace('_', ' ')} · {count}
              </span>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recs.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
            <ShoppingBag size={40} className="mx-auto mb-4 text-gray-300" />
            <p className="font-medium text-gray-500">Рекомендациялар жоқ</p>
            <p className="text-sm text-gray-400 mt-1">Сатып алыңыз — ML-жүйе сізге ұқсас тауарларды ұсынады</p>
            <Link to="/" className="inline-flex items-center gap-2 mt-5 bg-[#004B57] hover:bg-[#003840] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              <ShoppingBag size={15} /> Дүкенге / В магазин
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recs.map(r => <RecommendationCard key={r.product.id} rec={r} />)}
          </div>
        )}
      </section>
    </div>
  )
}
