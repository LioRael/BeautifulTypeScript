import { Catalog } from './catalog.js';
import type { CartLine, CartQuote, PricedLine } from './model.js';
import { addCents, promotionDiscount, validateLine } from './policy.js';

export interface QuoteRequest {
  lines: readonly CartLine[];
  promotionCode?: string;
}

export class CartPricing {
  constructor(private readonly catalog: Catalog) {}

  quote(request: QuoteRequest): CartQuote {
    const lines: PricedLine[] = [];
    let subtotalCents = 0;
    let eligibleSubtotalCents = 0;
    for (const line of request.lines) {
      validateLine(line);
      const product = this.catalog.product(line.sku);
      const lineCents = addCents(0, product.unitCents * line.quantity);
      subtotalCents = addCents(subtotalCents, lineCents);
      if (product.promotionEligible) {
        eligibleSubtotalCents = addCents(eligibleSubtotalCents, lineCents);
      }
      lines.push({
        sku: line.sku,
        quantity: line.quantity,
        unitCents: product.unitCents,
        subtotalCents: lineCents,
      });
    }
    const promotion = request.promotionCode === undefined
      ? undefined : this.catalog.promotion(request.promotionCode);
    let discountCents = 0;
    let appliedCode: string | null = null;
    if (promotion && eligibleSubtotalCents >= promotion.minimumEligibleCents) {
      discountCents = promotionDiscount(eligibleSubtotalCents, promotion);
      if (discountCents > 0) appliedCode = promotion.code;
    }
    return {
      lines,
      subtotalCents,
      eligibleSubtotalCents,
      discountCents,
      totalCents: subtotalCents - discountCents,
      appliedCode,
    };
  }
}
