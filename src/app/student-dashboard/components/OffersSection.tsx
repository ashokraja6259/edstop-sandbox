// FILE: src/app/student-dashboard/components/OffersSection.tsx

'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface Offer {
  id: string;
  title: string;
  description: string;
  code: string;
  discount: string;
  validUntil: string;
  image: string;
  alt: string;
  type: 'cashback' | 'discount' | 'free-delivery';
  minOrder?: number;
}

interface OffersSectionProps {
  offers: Offer[];
}

const OffersSection = ({ offers }: OffersSectionProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || offers.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentOfferIndex((prev) => (prev + 1) % offers.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isHydrated, offers.length]);

  if (!isHydrated || offers.length === 0) return null;

  const currentOffer = offers[currentOfferIndex];

  const getOfferConfig = (type: Offer['type']) => {
    const configs = {
      cashback: { icon: 'CurrencyRupeeIcon', emoji: '💰', gradient: 'from-emerald-500 to-teal-600', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
      discount: { icon: 'TagIcon', emoji: '🏷️', gradient: 'from-blue-500 to-indigo-600', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
      'free-delivery': { icon: 'TruckIcon', emoji: '🚚', gradient: 'from-purple-500 to-violet-600', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
    };
    return configs[type];
  };

  const config = getOfferConfig(currentOffer.type);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentOffer.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        <AppImage
          src={currentOffer.image}
          alt={currentOffer.alt}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,26,0.9) 100%)' }}></div>
        <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r ${config.gradient} rounded-full shadow-geometric-sm`}>
          <span className="text-sm">{config.emoji}</span>
          <span className="text-xs text-white font-bold">{currentOffer.discount}</span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-lg text-white mb-1">{currentOffer.title}</h3>
        <p className="text-xs text-white/60 mb-4 leading-relaxed">{currentOffer.description}</p>

        {/* Code copy */}
        <div className={`flex items-center gap-3 p-3 glass rounded-xl border ${config.border} mb-4`}>
          <div className="flex-1">
            <p className="text-xs text-white/40 mb-0.5">Promo Code</p>
            <p className="font-mono font-bold text-lg text-white tracking-widest">{currentOffer.code}</p>
          </div>
          <button
            onClick={handleCopyCode}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-smooth press-scale ${
              copied
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : `${config.bg} ${config.color} border ${config.border} hover:opacity-80`
            }`}
          >
            <Icon name={copied ? 'CheckIcon' : 'ClipboardDocumentIcon'} size={14} variant="outline" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Icon name="ClockIcon" size={12} className="text-amber-400" />
            <span className="text-white/50">Valid until {currentOffer.validUntil}</span>
          </div>
          {currentOffer.minOrder ? (
            <span className="text-white/40">Min ₹{currentOffer.minOrder}</span>
          ) : null}
        </div>

        {offers.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/10">
            {offers.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentOfferIndex(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === currentOfferIndex
                    ? `w-6 h-2 bg-gradient-to-r ${config.gradient}`
                    : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`View offer ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OffersSection;