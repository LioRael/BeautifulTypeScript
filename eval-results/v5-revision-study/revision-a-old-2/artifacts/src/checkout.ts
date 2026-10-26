import type { CheckoutDelivery, DeliveryOption, Parcel } from './model.js';
import { DeliveryQuotes } from './quotes.js';
import { describeOption } from './policy.js';

export interface DeliveryRequest {
  parcel: Parcel;
  maximumDays?: number;
}

export class Checkout {
  constructor(private readonly quotes: DeliveryQuotes) {}

  async delivery(request: DeliveryRequest): Promise<CheckoutDelivery> {
    if (request.maximumDays !== undefined
      && (!Number.isSafeInteger(request.maximumDays) || request.maximumDays < 1)) {
      throw new RangeError('Maximum days must be a positive integer');
    }
    const result = await this.quotes.collect(request.parcel);
    const options: DeliveryOption[] = result.options.filter(option =>
      request.maximumDays === undefined || option.days <= request.maximumDays);
    const recommended = options[0] ?? null;
    return {
      options,
      failedCarrierIds: result.failedCarrierIds,
      recommended,
      message: recommended ? describeOption(recommended) : 'No delivery options',
    };
  }
}
