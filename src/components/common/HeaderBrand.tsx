// FILE: src/components/common/HeaderBrand.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

interface HeaderBrandProps {
  showBackButton?: boolean;
  onBackClick?: () => void;
}

const HeaderBrand = ({ showBackButton = false, onBackClick }: HeaderBrandProps) => {
  const pathname = usePathname();
  
  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      window.history.back();
    }
  };

  const getBreadcrumbText = () => {
    switch (pathname) {
      case '/food-ordering-interface':
        return 'Food Delivery';
      case '/dark-store-shopping':
        return 'Dark Store';
      case '/ai-companion-interface':
        return 'AI Companion';
      case '/rider-dashboard':
        return 'Rider Dashboard';
      default:
        return '';
    }
  };

  const breadcrumbText = getBreadcrumbText();

  return (
    <div className="flex items-center gap-4">
      {showBackButton && (
        <button
          onClick={handleBackClick}
          className="flex items-center justify-center w-10 h-10 rounded-md hover:bg-muted transition-smooth press-scale focus-ring"
          aria-label="Go back"
        >
          <Icon name="ArrowLeftIcon" size={20} variant="outline" />
        </button>
      )}
      
      <Link 
        href="/student-dashboard" 
        className="flex items-center gap-3 hover-lift press-scale focus-ring rounded-md"
      >
        <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-md shadow-geometric">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary-foreground"
          >
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-heading font-bold text-lg text-foreground leading-none">
            EdStop
          </span>
          <span className="font-caption text-xs text-text-secondary leading-none mt-1">
            IIT Kharagpur
          </span>
        </div>
      </Link>

      {breadcrumbText && (
        <div className="flex items-center gap-2 ml-2">
          <Icon name="ChevronRightIcon" size={16} className="text-muted-foreground" />
          <span className="font-heading font-medium text-sm text-foreground">
            {breadcrumbText}
          </span>
        </div>
      )}
    </div>
  );
};

export default HeaderBrand;