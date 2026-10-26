export interface Parcel {
  weightGrams: number;
  destination: string;
}
export interface CarrierRate {
  service: string;
  amountCents: number;
  days: number;
}
export interface Carrier {
  id: string;
  quote(parcel: Parcel): Promise<readonly CarrierRate[]>;
}
export interface DeliveryOption extends CarrierRate {
  carrierId: string;
}
export interface QuoteResult {
  options: DeliveryOption[];
}
export interface CheckoutDelivery {
  options: DeliveryOption[];
  recommended: DeliveryOption | null;
  message: string;
}
