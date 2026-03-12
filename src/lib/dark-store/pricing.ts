import { DARK_STORE_PRODUCTS } from './catalog';

export interface DarkStoreCartInputItem {
  id: string;
  quantity: number;
}

export interface DarkStoreCalculatedItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export function calculateDarkStorePricing(items: DarkStoreCartInputItem[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart cannot be empty');
  }

  const productMap = new Map(DARK_STORE_PRODUCTS.map((item) => [item.id, item]));

  const normalizedItems: DarkStoreCalculatedItem[] = items.map((item) => {
    const quantity = Math.max(0, Number(item.quantity) || 0);

    if (!item.id || quantity < 1) {
      throw new Error('Invalid item quantity');
    }

    const product = productMap.get(item.id);

    if (!product) {
      throw new Error('Invalid product in cart');
    }

    if (quantity > product.stock) {
      throw new Error(`Only ${product.stock} units available for ${product.name}`);
    }

    const price = Number(product.price) || 0;

    return {
      id: product.id,
      name: product.name,
      quantity,
      price,
      totalPrice: price * quantity,
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => sum + item.totalPrice, 0);

  if (subtotal < 99) {
    throw new Error('Minimum order value for Dark Store is ₹99');
  }

  const deliveryFee = subtotal >= 99 ? 0 : 10;

  return {
    normalizedItems,
    subtotal,
    deliveryFee,
    totalBeforeDiscount: subtotal + deliveryFee,
  };
}
