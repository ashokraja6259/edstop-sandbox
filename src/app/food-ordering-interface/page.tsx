// FILE: src/app/food-ordering-interface/page.tsx

import type { Metadata } from 'next';
import FoodOrderingInteractive from './components/FoodOrderingInteractive';

/* Prevent caching since restaurants/menu change dynamically */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Food Ordering - EdStop',
  description:
    'Order delicious food from campus restaurants with EdCoins cashback and convenient delivery to your doorstep at IIT Kharagpur.',
  openGraph: {
    title: 'Food Ordering - EdStop',
    description:
      'Order delicious food from campus restaurants with EdCoins cashback and convenient delivery to your doorstep at IIT Kharagpur.',
    type: 'website',
  },
};

export default function FoodOrderingPage() {
  return <FoodOrderingInteractive />;
}