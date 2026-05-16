import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Clock, CheckCircle2, Package, MapPin, Phone, User, ArrowRight, Tag, X } from 'lucide-react'
import { toast } from '../store/toastStore'
import { useCartStore } from '../store/cartStore'
import { useUserStore } from '../store/userStore'
import { ordersApi } from '../api/orders'
import { deliveryApi } from '../api/delivery'
import { promoApi } from '../api/promo'
import type { DeliveryService, PromoResult } from '../api/types'
import ProductImage from '../components/ProductImage'

function formatPrice(n: number) {
  return n.toLocaleString('ru-KZ') + ' ₸'
}

function deliveryDays(min: number, max: number) {
  if (min === 0 && max === 0) return 'Сегодня'
  if (min === max) return `${min} дн.`
  return `${min}–${max} дн.`
}

function SuccessPage({ orderId, delivery }: { orderId: number; delivery: DeliveryService | null }) {
  const navigate = useNavigate()
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      {/* Animated checkmark */}
      <div className="relative mx-auto mb-8 w-28 h-28">
        <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-30" />
        <div className="relative w-28 h-28 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-emerald-200">
          <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
      </div>

      <h2 className="text-3xl font-black text-gray-900 mb-2">Тапсырыс қабылданды!</h2>
      <p className="text-gray-500 mb-8">Заказ успешно оформлен и передан в обработку</p>

      {/* Order info card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 text-left space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#004B57]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Package size={18} className="text-[#004B57]" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Тапсырыс номері</p>
            <p className="font-bold text-gray-900 text-lg">№{orderId}</p>
          </div>
        </div>

        {delivery && (
          <div className="flex items-center gap-3 border-t border-gray-50 pt-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Truck size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Жеткізу қызметі</p>
              <p className="font-semibold text-gray-900">{delivery.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Ориентировочно {deliveryDays(delivery.days_min, delivery.days_max)}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-bold text-[#004B57]">
                {delivery.price === 0 ? 'Бесплатно' : formatPrice(delivery.price)}
              </p>
            </div>
          </div>
        )}

        <div className="border-t border-gray-50 pt-4">
          <p className="text-xs text-gray-400 text-center">
            Статус заказа можно отслеживать в разделе «Мои заказы»
          </p>
        </div>
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2 bg-[#004B57] hover:bg-[#003840] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <Package size={16} /> Тапсырыстарым
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-5 py-2.5 rounded-xl border border-gray-200 transition-colors"
        >
          Басты бет <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}

export default function Checkout() {
  const { items, total, clear } = useCartStore()
  const user = useUserStore(s => s.user)
  const navigate = useNavigate()

  const [customerName, setCustomerName] = useState(user?.name || '')
  const [phone, setPhone]               = useState('')
  const [phoneError, setPhoneError]     = useState('')
  const [address, setAddress]           = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [success, setSuccess]           = useState(false)
  const [orderId, setOrderId]           = useState<number | null>(null)

  const [promoCode, setPromoCode]       = useState('')
  const [promoInput, setPromoInput]     = useState('')
  const [promoResult, setPromoResult]   = useState<PromoResult | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)

  const [deliveryServices, setDeliveryServices] = useState<DeliveryService[]>([])
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryService | null>(null)

  useEffect(() => {
    deliveryApi.getAll().then(list => {
      setDeliveryServices(list)
      if (list.length > 0) setSelectedDelivery(list[0])
    })
  }, [])

  const validatePhone = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!value) return 'Введите номер телефона'
    if (!/^(\+7|8)/.test(value)) return 'Номер должен начинаться с +7 или 8'
    if (digits.length !== 11) return 'Номер должен содержать 11 цифр'
    return ''
  }

  const handlePhoneChange = (value: string) => {
    setPhone(value)
    if (phoneError) setPhoneError(validatePhone(value))
  }

  const deliveryCost  = selectedDelivery?.price ?? 0
  const subtotal      = total() + deliveryCost
  const discount      = promoResult?.valid ? promoResult.discount_amount : 0
  const orderTotal    = Math.max(0, subtotal - discount)

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    try {
      const result = await promoApi.validate(promoInput.trim(), subtotal)
      setPromoResult(result)
      if (result.valid) {
        setPromoCode(promoInput.trim())
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error('Промокод тексеру қатесі')
    } finally {
      setPromoLoading(false)
    }
  }

  const handleRemovePromo = () => {
    setPromoCode('')
    setPromoInput('')
    setPromoResult(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validatePhone(phone)
    if (err) { setPhoneError(err); return }
    if (!user || items.length === 0) return
    setSubmitting(true)
    try {
      const order = await ordersApi.create(
        items.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
        address,
        customerName,
        phone,
        selectedDelivery?.id,
        promoCode || undefined,
      )
      clear()
      setOrderId(order.id)
      setSuccess(true)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg || 'Қате болды / Произошла ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  if (success && orderId) {
    return <SuccessPage orderId={orderId} delivery={selectedDelivery} />
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 mb-4">Себет бос / Корзина пуста</p>
        <button onClick={() => navigate('/')} className="btn-primary">Дүкенге оралу / В магазин</button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Тапсырыс беру / Оформление заказа</h1>

      <div className="flex flex-col md:flex-row gap-6">
        <form onSubmit={handleSubmit} className="flex-1 space-y-4">

          {/* Recipient */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User size={16} className="text-[#004B57]" /> Алушы деректері / Данные получателя
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Аты-жөні / ФИО <span className="text-red-500">*</span>
              </label>
              <input
                required
                className="input"
                placeholder="Айдар Бекұлы"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Phone size={13} className="inline mr-1" />Телефон <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="tel"
                className={`input ${phoneError ? 'border-red-400 focus:ring-red-200' : ''}`}
                placeholder="+77771234567 или 87771234567"
                value={phone}
                onChange={e => handlePhoneChange(e.target.value)}
                onBlur={() => setPhoneError(validatePhone(phone))}
              />
              {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin size={16} className="text-[#004B57]" />
              Жеткізу мекенжайы / Адрес доставки <span className="text-red-500">*</span>
            </h3>
            <textarea
              required
              className="input"
              rows={3}
              placeholder="Алматы, ул. Абая 150, кв. 25..."
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          {/* Promo code */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Tag size={16} className="text-[#F5A623]" />
              Промокод
            </h3>
            {promoResult?.valid ? (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-700">{promoCode}</p>
                  <p className="text-xs text-emerald-600">Скидка {promoResult.discount_percent}% — −{promoResult.discount_amount.toLocaleString('ru-KZ')} ₸</p>
                </div>
                <button onClick={handleRemovePromo} className="text-emerald-400 hover:text-emerald-600 transition-colors">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={promoInput}
                  onChange={e => setPromoInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleApplyPromo())}
                  placeholder="QOLDA10"
                  className="input flex-1 uppercase tracking-widest text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={promoLoading || !promoInput.trim()}
                  className="px-4 py-2.5 bg-[#F5A623] hover:bg-[#e09520] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {promoLoading ? '...' : 'Қолдану'}
                </button>
              </div>
            )}
          </div>

          {/* Delivery */}
          {deliveryServices.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Truck size={16} className="text-[#004B57]" />
                Жеткізу тәсілі / Способ доставки
              </h3>
              <div className="space-y-2">
                {deliveryServices.map(svc => {
                  const selected = selectedDelivery?.id === svc.id
                  return (
                    <label
                      key={svc.id}
                      className={`flex items-center gap-4 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        selected
                          ? 'border-[#004B57] bg-[#004B57]/5'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery"
                        className="sr-only"
                        checked={selected}
                        onChange={() => setSelectedDelivery(svc)}
                      />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selected ? 'border-[#004B57]' : 'border-gray-300'
                      }`}>
                        {selected && <div className="w-2 h-2 rounded-full bg-[#004B57]" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{svc.name}</p>
                        <p className="text-xs text-gray-400">{svc.name_kz}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">
                          {svc.price === 0 ? 'Бесплатно' : formatPrice(svc.price)}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                          <Clock size={10} />
                          {deliveryDays(svc.days_min, svc.days_max)}
                        </p>
                      </div>
                      {selected && <CheckCircle2 size={16} className="text-[#004B57] flex-shrink-0" />}
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !address || !customerName || !phone || !!phoneError}
            className="w-full flex items-center justify-center gap-2 bg-[#004B57] hover:bg-[#003840] disabled:bg-gray-300 text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Жіберілуде...
              </>
            ) : (
              <>Растау / Подтвердить заказ</>
            )}
          </button>
        </form>

        {/* Order summary */}
        <div className="w-full md:w-72">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4">Тапсырыс / Заказ</h3>
            <div className="space-y-3 mb-4">
              {items.map(({ product, quantity }) => {
                const price = product.discount_price ?? product.price
                return (
                  <div key={product.id} className="flex gap-3 text-sm">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                      <ProductImage
                        src={product.image_url}
                        alt={product.name_ru}
                        className="w-full h-full object-cover"
                        iconSize={20}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1 text-gray-900">{product.name_ru}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{quantity} × {formatPrice(price)}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Товары</span>
                <span className="font-medium text-gray-900">{formatPrice(total())}</span>
              </div>
              {selectedDelivery && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Доставка</span>
                  <span className={`font-medium ${selectedDelivery.price === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {selectedDelivery.price === 0 ? 'Бесплатно' : formatPrice(selectedDelivery.price)}
                  </span>
                </div>
              )}
              {promoResult?.valid && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span className="flex items-center gap-1"><Tag size={11} /> Промокод {promoResult.discount_percent}%</span>
                  <span className="font-semibold">−{formatPrice(promoResult.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2.5">
                <span>Барлығы / Итого</span>
                <span className="text-[#004B57]">{formatPrice(orderTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
