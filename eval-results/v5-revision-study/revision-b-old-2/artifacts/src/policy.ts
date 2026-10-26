import type { CartLine, Product, Promotion } from './model.js';

export function validateLine(line: CartLine): void {
  if (!line.sku || !Number.isSafeInteger(line.quantity) || line.quantity < 1) {
    throw new RangeError('Invalid cart line');
  }
}

export function validateProduct(product: Product): void {
  if (!Number.isSafeInteger(product.unitCents) || product.unitCents < 0) {
    throw new RangeError('Invalid product price');
  }
}

export function validatePromotion(promotion: Promotion): void {
  if (!promotion.code || !Number.isInteger(promotion.percent)
    || promotion.percent < 1 || promotion.percent > 100
    || !Number.isSafeInteger(promotion.minimumEligibleCents)
    || promotion.minimumEligibleCents < 0
    || (promotion.maximumDiscountCents !== undefined
      && (!Number.isSafeInteger(promotion.maximumDiscountCents)
        || promotion.maximumDiscountCents < 0))) {
    throw new RangeError('Invalid promotion');
  }
}

export function addCents(a: number, b: number): number {
  const total = a + b;
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new RangeError('Cart amount exceeds supported range');
  }
  return total;
}

// Discounts round down once for the supplied base, then apply the cap.
export function promotionDiscount(baseCents: number, promotion: Promotion): number {
  const rounded = Number(BigInt(baseCents) * BigInt(promotion.percent) / 100n);
  return Math.min(rounded, promotion.maximumDiscountCents ?? rounded);
}
