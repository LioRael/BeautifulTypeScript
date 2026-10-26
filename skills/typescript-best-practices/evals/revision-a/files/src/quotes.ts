import type { Carrier, DeliveryOption, Parcel, QuoteResult } from './model.js';
import { compareOptions, copyParcel, isUsableRate, validateParcel } from './policy.js';

export class DeliveryQuotes {
  constructor(private readonly carriers: readonly Carrier[]) {}

  async collect(parcel: Parcel): Promise<QuoteResult> {
    validateParcel(parcel);
    const batches = await Promise.all(this.carriers.map(async carrier => {
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
    const options = batches.flat();
    options.sort(compareOptions);
    return { options };
  }
}
