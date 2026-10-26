export interface Product {
  sku: string;
  unitCents: number;
  promotionEligible: boolean;
}
export interface CartLine {
  sku: string;
  quantity: number;
}
export interface Promotion {
  code: string;
  percent: number;
  minimumEligibleCents: number;
  maximumDiscountCents?: number;
}
export interface PricedLine extends CartLine {
  unitCents: number;
  subtotalCents: number;
}
export interface CartQuote {
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  appliedCode: string | null;
}
