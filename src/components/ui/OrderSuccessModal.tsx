// FILE: src/components/ui/OrderSuccessModal.tsx

'use client';

import { useEffect, useState, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderType: 'food' | 'darkstore';
  orderId: string;
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  walletUsed?: number;
  estimatedTime?: string;
  promoCode?: string;
  promoDiscount?: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'circle' | 'square' | 'star';
}

const CONFETTI_COLORS = [
  '#a855f7', '#ec4899', '#6366f1', '#22d3ee', '#f59e0b',
  '#10b981', '#f97316', '#e879f9', '#38bdf8', '#fb7185',
];

const OrderSuccessModal = ({
  isOpen,
  onClose,
  orderType,
  orderId,
  items,
  total,
  paymentMethod,
  walletUsed = 0,
  estimatedTime,
  promoCode,
  promoDiscount = 0,
}: OrderSuccessModalProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showContent, setShowContent] = useState(false);
  const [checkAnimated, setCheckAnimated] = useState(false);
  const [copied, setCopied] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const particleStateRef = useRef<Particle[]>([]);
  const [, forceUpdate] = useState(0);

  const trackingUrl = `/student-dashboard?order=${orderId}`;

  useEffect(() => {
    if (!isOpen) {
      setShowContent(false);
      setCheckAnimated(false);
      setParticles([]);
      particleStateRef.current = [];
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    // Stagger content reveal
    const t1 = setTimeout(() => setShowContent(true), 100);
    const t2 = setTimeout(() => setCheckAnimated(true), 300);

    // Launch confetti
    const t3 = setTimeout(() => {
      const newParticles: Particle[] = Array.from({ length: 80 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 6 + Math.random() * 8,
        speedX: (Math.random() - 0.5) * 1.5,
        speedY: 1.5 + Math.random() * 2.5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        opacity: 1,
        shape: (['circle', 'square', 'star'] as const)[Math.floor(Math.random() * 3)],
      }));
      particleStateRef.current = newParticles;
      setParticles([...newParticles]);

      const animate = () => {
        particleStateRef.current = particleStateRef.current
          .map(p => ({
            ...p,
            x: p.x + p.speedX,
            y: p.y + p.speedY,
            rotation: p.rotation + p.rotationSpeed,
            opacity: p.y > 80 ? Math.max(0, p.opacity - 0.04) : p.opacity,
          }))
          .filter(p => p.opacity > 0 && p.y < 120);

        setParticles([...particleStateRef.current]);

        if (particleStateRef.current.length > 0) {
          animFrameRef.current = requestAnimationFrame(animate);
        }
      };
      animFrameRef.current = requestAnimationFrame(animate);
    }, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen]);

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(orderId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTrackOrder = () => {
    window.location.href = trackingUrl;
  };

  if (!isOpen) return null;

  const isFood = orderType === 'food';
  const gradientFrom = isFood ? 'from-orange-500' : 'from-purple-600';
  const gradientTo = isFood ? 'to-pink-500' : 'to-indigo-600';
  const glowColor = isFood ? 'shadow-orange-500/40' : 'shadow-purple-500/40';
  const ringColor = isFood ? 'ring-orange-400/30' : 'ring-purple-400/30';
  const accentText = isFood ? 'text-orange-400' : 'text-purple-400';
  const borderAccent = isFood ? 'border-orange-500/30' : 'border-purple-500/30';
  const bgAccent = isFood ? 'bg-orange-500/10' : 'bg-purple-500/10';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Confetti Canvas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.shape === 'star' ? p.size : p.size,
              backgroundColor: p.shape !== 'star' ? p.color : 'transparent',
              borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'square' ? '2px' : '0',
              transform: `rotate(${p.rotation}deg)`,
              opacity: p.opacity,
              color: p.color,
              fontSize: p.size,
              lineHeight: 1,
            }}
          >
            {p.shape === 'star' ? '★' : null}
          </div>
        ))}
      </div>

      {/* Modal */}
      <div
        className={`
          relative w-full max-w-md z-10
          transition-all duration-500
          ${showContent ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-8'}
        `}
      >
        <div className={`
          relative overflow-hidden rounded-2xl
          bg-[#0f0f1a] border border-white/10
          shadow-2xl ${glowColor}
          ring-1 ${ringColor}
        `}>
          {/* Animated gradient top bar */}
          <div className={`h-1 w-full bg-gradient-to-r ${gradientFrom} ${gradientTo} animate-gradient-x`} />

          {/* Floating orbs background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-full opacity-10 blur-3xl animate-float`} />
            <div className={`absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br ${gradientTo} ${gradientFrom} rounded-full opacity-10 blur-3xl animate-float`} style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative p-6">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 press-scale focus-ring"
            >
              <Icon name="XMarkIcon" size={16} className="text-white/60" />
            </button>

            {/* Success icon with ring animation */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                {/* Outer pulsing ring */}
                <div className={`
                  absolute inset-0 rounded-full
                  bg-gradient-to-br ${gradientFrom} ${gradientTo}
                  opacity-20
                  ${checkAnimated ? 'scale-150 opacity-0' : 'scale-100 opacity-20'}
                  transition-all duration-1000
                `} />
                {/* Middle ring */}
                <div className={`
                  absolute inset-0 rounded-full
                  bg-gradient-to-br ${gradientFrom} ${gradientTo}
                  opacity-30
                  ${checkAnimated ? 'scale-125 opacity-0' : 'scale-100 opacity-30'}
                  transition-all duration-700 delay-100
                `} />
                {/* Icon container */}
                <div className={`
                  relative w-20 h-20 rounded-full
                  bg-gradient-to-br ${gradientFrom} ${gradientTo}
                  flex items-center justify-center
                  shadow-xl ${glowColor}
                  ${checkAnimated ? 'scale-100' : 'scale-0'}
                  transition-all duration-500 delay-200
                `}>
                  <Icon name="CheckCircleIcon" size={40} variant="solid" className="text-white" />
                </div>
              </div>

              <h2 className={`
                font-heading font-bold text-2xl text-white text-center
                ${checkAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                transition-all duration-500 delay-300
              `}>
                {isFood ? '🍔 Order Placed!' : '📦 Order Confirmed!'}
              </h2>
              <p className={`
                font-body text-sm text-white/60 text-center mt-1
                ${checkAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                transition-all duration-500 delay-400
              `}>
                {isFood
                  ? 'Your food is being prepared with love 🔥' :'Your items are being packed for delivery 🚀'}
              </p>
            </div>

            {/* Order ID */}
            <div className={`
              flex items-center justify-between p-3 rounded-xl
              ${bgAccent} ${borderAccent} border mb-4
              ${checkAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              transition-all duration-500 delay-500
            `}>
              <div>
                <p className="font-caption text-xs text-white/50 mb-0.5">Order ID</p>
                <p className={`font-data font-bold text-sm ${accentText}`}>#{orderId}</p>
              </div>
              <button
                onClick={handleCopyOrderId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 press-scale"
              >
                <Icon name={copied ? 'CheckIcon' : 'ClipboardDocumentIcon'} size={14} className={copied ? 'text-green-400' : 'text-white/60'} />
                <span className="font-caption text-xs text-white/60">{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {/* Estimated time */}
            {estimatedTime && (
              <div className={`
                flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mb-4
                ${checkAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                transition-all duration-500 delay-[550ms]
              `}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center flex-shrink-0 shadow-lg ${glowColor}`}>
                  <Icon name="ClockIcon" size={20} variant="solid" className="text-white" />
                </div>
                <div>
                  <p className="font-caption text-xs text-white/50">Estimated Delivery</p>
                  <p className="font-heading font-bold text-base text-white">{estimatedTime}</p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="font-caption text-xs text-green-400">Live</span>
                </div>
              </div>
            )}

            {/* Order items */}
            <div className={`
              rounded-xl bg-white/5 border border-white/10 mb-4 overflow-hidden
              ${checkAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              transition-all duration-500 delay-[600ms]
            `}>
              <div className="px-4 py-3 border-b border-white/10">
                <p className="font-heading font-semibold text-sm text-white/80">Order Summary</p>
              </div>
              <div className="p-4 space-y-2 max-h-36 overflow-y-auto scrollbar-hide">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-md bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {item.quantity}
                      </span>
                      <span className="font-body text-sm text-white/70 line-clamp-1">{item.name}</span>
                    </div>
                    <span className="font-data text-sm text-white/80 flex-shrink-0 ml-2">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 pb-3 space-y-2 border-t border-white/10 pt-3">
                {promoDiscount > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-body text-xs text-white/50">Original Price</span>
                      <span className="font-data text-xs text-white/50 line-through">₹{(total + promoDiscount).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon name="TagIcon" size={12} className="text-green-400" />
                        <span className="font-body text-xs text-green-400">
                          Promo{promoCode ? `: ${promoCode}` : ''}
                        </span>
                      </div>
                      <span className="font-data text-xs font-bold text-green-400">-₹{promoDiscount.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-white/10">
                  <span className="font-heading font-semibold text-sm text-white/80">Total Paid</span>
                  <span className={`font-data font-bold text-lg bg-gradient-to-r ${gradientFrom} ${gradientTo} bg-clip-text text-transparent`}>
                    ₹{total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment & cashback info */}
            <div className={`
              grid grid-cols-2 gap-3 mb-5
              ${checkAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              transition-all duration-500 delay-[650ms]
            `}>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="font-caption text-xs text-white/50 mb-1">Payment</p>
                <div className="flex items-center gap-1.5">
                  <Icon name={paymentMethod === 'cod' ? 'BanknotesIcon' : 'CreditCardIcon'} size={14} className={accentText} />
                  <span className="font-heading font-semibold text-xs text-white">
                    {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                <p className="font-caption text-xs text-white/50 mb-1">EdCoins Earned</p>
                <div className="flex items-center gap-1.5">
                  <Icon name="SparklesIcon" size={14} className="text-green-400 animate-spin-slow" />
                  <span className="font-heading font-semibold text-xs text-green-400">
                    +₹{(total * 0.05).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className={`
              flex gap-3
              ${checkAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              transition-all duration-500 delay-[700ms]
            `}>
              <button
                onClick={handleTrackOrder}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                  bg-gradient-to-r ${gradientFrom} ${gradientTo}
                  text-white font-heading font-bold text-sm
                  shadow-lg ${glowColor} hover:shadow-xl
                  transition-all duration-300 press-scale focus-ring btn-glow
                `}
              >
                <Icon name="MapPinIcon" size={16} variant="solid" />
                Track Order
              </button>
              <button
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-heading font-semibold text-sm transition-all duration-200 press-scale focus-ring"
              >
                <Icon name="HomeIcon" size={16} />
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessModal;
