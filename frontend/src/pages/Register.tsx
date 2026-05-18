import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Store, User, CheckCircle } from 'lucide-react'
import { authApi } from '../api/auth'
import { useUserStore } from '../store/userStore'

function getPasswordStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw) || /[A-Z]/.test(pw)) score++
  if (score === 1) return { level: 1, label: 'Әлсіз / Слабый', color: 'bg-red-500' }
  if (score === 2) return { level: 2, label: 'Орташа / Средний', color: 'bg-amber-400' }
  return { level: 3, label: 'Күшті / Надёжный', color: 'bg-emerald-500' }
}

export default function Register() {
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [showCf, setShowCf]       = useState(false)
  const [isSeller, setIsSeller]   = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const setAuth  = useUserStore(s => s.setAuth)
  const navigate = useNavigate()

  const pwStrength = getPasswordStrength(password)
  const confirmMatch = confirm.length > 0 && confirm === password

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Құпиясөздер сәйкес келмейді / Пароли не совпадают')
      return
    }
    if (password.length < 6) {
      setError('Кемінде 6 символ / Минимум 6 символов')
      return
    }
    setLoading(true)
    try {
      const data = await authApi.register(name, email, password, isSeller)
      setAuth(data.user, data.access_token)
      navigate(isSeller ? '/seller/dashboard' : '/')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Тіркелу қатесі / Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — brand panel */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-[#004B57] via-[#006070] to-[#00414C] flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-lg">Q</span>
          </div>
          <span className="text-white font-black text-2xl tracking-tight">QOLDA</span>
        </div>

        <div>
          <h2 className="text-3xl font-black text-white leading-tight mb-4">
            Бізге қосылыңыз
          </h2>
          <p className="text-white/60 mb-10">
            Алматы мен Қазақстанның ең ақылды маркетплейсінде тіркеліп, жаңа мүмкіндіктерге жетіңіз.
          </p>
          <div className="space-y-3">
            {[
              'Персонализацияланған ML-рекомендациялар',
              'Жылдам жеткізу және қауіпсіз төлем',
              'Сатушыларға арналған толық кабинет',
            ].map(text => (
              <div key={text} className="flex items-start gap-2 text-white/80 text-sm">
                <CheckCircle size={15} className="mt-0.5 flex-shrink-0 text-[#F5A623]" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs">© 2026 QOLDA — Дипломдық жоба</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 bg-[#004B57] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">Q</span>
            </div>
            <span className="font-black text-xl text-gray-900">QOLDA</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Тіркелу</h1>
            <p className="text-gray-500 mt-1 text-sm">Жаңа аккаунт жасаңыз / Создайте новый аккаунт</p>
          </div>

          {/* Account type toggle */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { seller: false, icon: User,  label: 'Покупатель', sub: 'Сатып алушы' },
              { seller: true,  icon: Store, label: 'Продавец',   sub: 'Сатушы'      },
            ].map(({ seller, icon: Icon, label, sub }) => (
              <button
                key={label}
                type="button"
                onClick={() => setIsSeller(seller)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isSeller === seller
                    ? 'border-[#004B57] bg-[#004B57]/5 text-[#004B57]'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <Icon size={22} />
                <div className="text-center">
                  <p className="text-sm font-semibold leading-tight">{label}</p>
                  <p className="text-xs opacity-70 mt-0.5">{sub}</p>
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {isSeller ? 'Дүкен атауы / Название магазина' : 'Аты-жөні / Имя'}
              </label>
              <input
                required
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={isSeller ? 'TechStore KZ' : 'Айдар Бекұлы'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Құпиясөз / Пароль
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  className="input pr-10"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              {/* Password strength meter */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i <= pwStrength.level ? pwStrength.color : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${
                    pwStrength.level === 1 ? 'text-red-500' :
                    pwStrength.level === 2 ? 'text-amber-500' :
                    'text-emerald-600'
                  }`}>
                    {pwStrength.label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Растау / Подтверждение пароля
              </label>
              <div className="relative">
                <input
                  type={showCf ? 'text' : 'password'}
                  required
                  className={`input pr-10 ${
                    confirm.length > 0
                      ? confirmMatch
                        ? 'border-emerald-400 focus:ring-emerald-200'
                        : 'border-red-400 focus:ring-red-200'
                      : ''
                  }`}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCf(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showCf ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {confirm.length > 0 && (
                <p className={`text-xs mt-1 ${confirmMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                  {confirmMatch ? '✓ Пароли совпадают' : '✗ Пароли не совпадают'}
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#004B57] hover:bg-[#003840] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Тіркелуде...
                </>
              ) : isSeller ? 'Сатушы ретінде тіркелу' : 'Тіркелу / Зарегистрироваться'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Аккаунтыңыз бар ма?{' '}
            <Link to="/login" className="text-[#004B57] hover:text-[#003840] font-semibold">
              Кіру / Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
