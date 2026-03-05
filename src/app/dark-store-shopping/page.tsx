// FILE: src/app/dark-store-shopping/page.tsx

import type { Metadata } from 'next';
import HeaderBrand from '@/components/common/HeaderBrand';
import DarkStoreInteractive from './components/DarkStoreInteractive';

export const metadata: Metadata = {
  title: 'Dark Store Shopping - EdStop',
  description: 'Browse and purchase campus convenience items including snacks, beverages, stationery, and essentials with instant delivery and EdCoins cashback rewards.',
};

export default function DarkStoreShoppingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border shadow-geometric">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <HeaderBrand showBackButton={true} />
        </div>
      </header>

      {/* Main Content */}
      <DarkStoreInteractive />
    </main>
  );
}