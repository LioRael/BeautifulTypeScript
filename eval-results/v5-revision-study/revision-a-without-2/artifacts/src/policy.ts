import type { CarrierRate, DeliveryOption, Parcel } from './model.js';

export function validateParcel(parcel: Parcel): void {
  if (!Number.isSafeInteger(parcel.weightGrams) || parcel.weightGrams <= 0) {
    throw new RangeError('Weight must be a positive integer');
  }
  if (!parcel.destination.trim()) {
    throw new RangeError('Destination is required');
  }
}

// Carrier payloads are untrusted, even when the adapter has static types.
export function isUsableRate(rate: CarrierRate): boolean {
  return typeof rate.service === 'string' && rate.service.trim().length > 0
    && Number.isSafeInteger(rate.amountCents) && rate.amountCents >= 0
    && Number.isSafeInteger(rate.days) && rate.days >= 1;
}

export function compareOptions(a: DeliveryOption, b: DeliveryOption): number {
  return a.amountCents - b.amountCents
    || a.days - b.days
    || a.carrierId.localeCompare(b.carrierId)
    || a.service.localeCompare(b.service);
}

export function copyParcel(parcel: Parcel): Parcel {
  return { weightGrams: parcel.weightGrams, destination: parcel.destination };
}

export function describeOption(option: DeliveryOption): string {
  const unit = option.days === 1 ? 'day' : 'days';
  return `${option.carrierId} ${option.service}: ${option.days} ${unit}`;
}
