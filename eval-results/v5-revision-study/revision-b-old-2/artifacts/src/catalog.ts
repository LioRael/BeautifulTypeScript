import type { Product, Promotion } from './model.js';
import { validateProduct, validatePromotion } from './policy.js';

export class Catalog {
  private readonly products = new Map<string, Product>();
  private readonly promotions = new Map<string, Promotion>();

  constructor(products: readonly Product[], promotions: readonly Promotion[]) {
    for (const product of products) {
      validateProduct(product);
      this.products.set(product.sku, { ...product });
    }
    for (const promotion of promotions) {
      validatePromotion(promotion);
      this.promotions.set(promotion.code, { ...promotion });
    }
  }

  product(sku: string): Product {
    const product = this.products.get(sku);
    if (!product) throw new Error(`Unknown SKU: ${sku}`);
    return { ...product };
  }

  promotion(code: string): Promotion | undefined {
    const promotion = this.promotions.get(code);
    return promotion ? { ...promotion } : undefined;
  }
}
