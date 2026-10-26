import type { Carrier, DeliveryOption, Parcel, QuoteResult } from './model.js';
import { compareOptions, copyParcel, isUsableRate, validateParcel } from './policy.js';

export class DeliveryQuotes {
  constructor(private readonly carriers: readonly Carrier[]) {}

  async collect(parcel: Parcel): Promise<QuoteResult> {
    validateParcel(parcel);
    const batches = await Promise.allSettled(this.carriers.map(async carrier =>
      carrier.quote(copyParcel(parcel))));
    const options: DeliveryOption[] = [];
    const failedCarrierIds: string[] = [];
    for (const [index, batch] of batches.entries()) {
      const carrier = this.carriers[index]!;
      if (batch.status === 'rejected') {
        failedCarrierIds.push(carrier.id);
        continue;
      }
      for (const rate of batch.value) {
        if (isUsableRate(rate)) {
          options.push({
            carrierId: carrier.id,
            service: rate.service,
            amountCents: rate.amountCents,
            days: rate.days,
          });
        }
      }
    }
    options.sort(compareOptions);
    return { options, failedCarrierIds };
  }
}
