import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Menu, X, Search, ShoppingCart, Heart, User, Package, LayoutDashboard, Shield } from 'lucide-react'
import { useCartStore } from '../store/cartStore'
import { useWishlistStore } from '../store/wishlistStore'
import { useUserStore } from '../store/userStore'
import { productsApi } from '../api/products'
import type { Product } from '../api/types'
import ProductImage from './ProductImage'
import NotificationBell from './NotificationBell'

function formatPrice(n: number) {
  return n.toLocaleString('ru-KZ') + ' ₸'
}

function SearchBar({ onSubmit }: { onSubmit: (q: string) => void }) {
  const [q, setQ]                   = useState('')
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [open, setOpen]             = useState(false)
  const [loading, setLoading]       = useState(false)
  const containerRef                = useRef<HTMLDivElement>(null)
  const timerRef                    = useRef<ReturnType<typeof setTimeout> | null>(null)

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.trim().length < 2) { setSuggestions([]); setOpen(false); return }

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await productsApi.search(q.trim(), 1)
        setSuggestions(data.items.slice(0, 5))
        setOpen(data.items.length > 0)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 280)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [q])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!q.trim()) return
    setOpen(false)
    setSuggestions([])
    onSubmit(q.trim())
    setQ('')
  }

  const handlePick = (product: Product) => {
    setOpen(false)
    setSuggestions([])
    setQ('')
    onSubmit(`__product__${product.id}`)
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-2xl mx-4">
      <form onSubmit={handleSubmit}>
        <div className="flex w-full bg-white/10 rounded-xl overflow-hidden border border-white/10 focus-within:border-white/30 transition-colors">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="Іздеу / Поиск товаров..."
            className="flex-1 px-4 py-2.5 bg-transparent text-white placeholder-white/50 text-sm focus:outline-none"
          />
          <button type="submit" className="px-4 bg-[#F5A623] hover:bg-[#e09520] text-white transition-colors flex-shrink-0">
            {loading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Search size={17} />}
          </button>
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          {suggestions.map(p => (
            <button
              key={p.id}
              onClick={() => handlePick(p)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <ProductImage src={p.image_url} alt={p.name_ru} className="w-full h-full object-cover" iconSize={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.name_ru}</p>
                <p className="text-xs text-gray-400">{p.category}</p>
              </div>
              <span className="text-sm font-semibold text-[#004B57] flex-shrink-0">
                {formatPrice(p.discount_price ?? p.price)}
              </span>
            </button>
          ))}
          <div className="px-3 py-2 border-t border-gray-100">
            <button
              onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
              className="text-xs text-[#004B57] font-medium hover:underline"
            >
              Показать все результаты для «{q}» →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileQ, setMobileQ]  = useState('')
  const navigate = useNavigate()
  const count      = useCartStore(s => s.count())
  const wishCount  = useWishlistStore(s => s.items.length)
  const { user, logout } = useUserStore()

  const handleSearch = (q: string) => {
    if (q.startsWith('__product__')) {
      navigate(`/product/${q.replace('__product__', '')}`)
    } else {
      navigate(`/search?q=${encodeURIComponent(q)}`)
    }
    setMenuOpen(false)
  }

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (mobileQ.trim()) {
      navigate(`/search?q=${encodeURIComponent(mobileQ.trim())}`)
      setMobileQ('')
      setMenuOpen(false)
    }
  }

  return (
    <header className="bg-[#004B57] text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm tracking-tight">Q</span>
          </div>
          <span className="text-xl font-black tracking-tight">QOLDA</span>
        </Link>

        {/* Search bar — desktop */}
        <div className="hidden md:flex flex-1">
          <SearchBar onSubmit={handleSearch} />
        </div>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-2">
          <Link to="/favorites" className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">
            <Heart size={20} />
            {wishCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center">
                {wishCount > 9 ? '9+' : wishCount}
              </span>
            )}
            <span className="hidden sm:inline text-sm font-medium">Таңдаулы</span>
          </Link>

          <Link to="/cart" className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors">
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#F5A623] text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
            <span className="hidden sm:inline text-sm font-medium">Себет</span>
          </Link>

          {user ? (
            <div className="hidden md:flex items-center gap-1">
              <NotificationBell />
              <Link to="/profile" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {user.name[0].toUpperCase()}
                </div>
                {user.name.split(' ')[0]}
              </Link>
              {user.is_seller && (
                <Link to="/seller/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors">
                  <LayoutDashboard size={13} /> Кабинет
                </Link>
              )}
              {user.is_admin && (
                <Link to="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5A623]/20 hover:bg-[#F5A623]/30 text-[#F5A623] text-xs font-semibold transition-colors">
                  <Shield size={13} /> Admin
                </Link>
              )}
              <button
                onClick={() => { logout(); navigate('/login') }}
                className="px-3 py-2 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white text-xs"
              >
                Шығу
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link to="/login" className="px-4 py-2 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium">Кіру</Link>
              <Link to="/register" className="px-4 py-2 rounded-xl bg-[#F5A623] hover:bg-[#e09520] text-white text-sm font-semibold transition-colors">Тіркелу</Link>
            </div>
          )}

          <button className="md:hidden p-2 rounded-xl hover:bg-white/10 transition-colors" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#004B57] px-4 py-4 space-y-3">
          <form onSubmit={handleMobileSearch} className="flex">
            <input
              value={mobileQ}
              onChange={e => setMobileQ(e.target.value)}
              placeholder="Іздеу / Поиск..."
              className="flex-1 px-4 py-2.5 rounded-l-xl bg-white/10 text-white placeholder-white/50 text-sm focus:outline-none border border-white/10"
            />
            <button type="submit" className="bg-[#F5A623] px-4 rounded-r-xl"><Search size={16} /></button>
          </form>

          {user ? (
            <div className="space-y-1">
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-sm font-medium">
                <User size={16} /> {user.name}
              </Link>
              <Link to="/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-sm">
                <Package size={16} /> Тапсырыстарым
              </Link>
              {user.is_seller && (
                <Link to="/seller/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-sm font-semibold text-emerald-300">
                  <LayoutDashboard size={16} /> Дүкенім
                </Link>
              )}
              {user.is_admin && (
                <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 text-sm font-semibold text-[#F5A623]">
                  <Shield size={16} /> Admin панель
                </Link>
              )}
              <button
                onClick={() => { logout(); setMenuOpen(false); navigate('/login') }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 text-sm text-white/60"
              >
                Шығу / Выйти
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2.5 border border-white/20 rounded-xl text-sm hover:bg-white/10 transition-colors">Кіру</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2.5 bg-[#F5A623] rounded-xl text-sm font-semibold hover:bg-[#e09520] transition-colors">Тіркелу</Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
