import type { Carrier, DeliveryOption, Parcel, QuoteResult } from './model.js';
import { compareOptions, copyParcel, isUsableRate, validateParcel } from './policy.js';

export class DeliveryQuotes {
  constructor(private readonly carriers: readonly Carrier[]) {}

  async collect(parcel: Parcel): Promise<QuoteResult> {
    validateParcel(parcel);
    const batches = await Promise.allSettled(this.carriers.map(async carrier => {
      const rates = await carrier.quote(copyParcel(parcel));
      const options: DeliveryOption[] = [];
      for (const rate of rates) {
        if (isUsableRate(rate)) {
          options.push({
            carrierId: carrier.id,
            service: rate.service,
            amountCents: rate.amountCents,
            days: rate.days,
          });
        }
      }
      return options;
    }));
    const options: DeliveryOption[] = [];
    const failedCarrierIds: string[] = [];
    batches.forEach((batch, index) => {
      if (batch.status === 'fulfilled') {
        options.push(...batch.value);
      } else {
        failedCarrierIds.push(this.carriers[index]!.id);
      }
    });
    options.sort(compareOptions);
    return { options, failedCarrierIds };
  }
}
