// Post-hoc diagnostic prompted by one blind review, not a frozen primary test.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const workspace = path.resolve(process.argv[2]);
const count = 200_000;
const { DeliveryQuotes } = await import(pathToFileURL(path.join(workspace, 'dist/quotes.js')).href);
const rates = Array.from({ length: count }, () => ({ service: 'standard', amountCents: 100, days: 1 }));
const quotes = new DeliveryQuotes([{ id: 'large', async quote() { return rates; } }]);
let outcome;
try {
  const result = await quotes.collect({ weightGrams: 500, destination: 'XY2' });
  outcome = {
    pass: result.options.length === count && result.failedCarrierIds.length === 0,
    returnedOptions: result.options.length,
    failedCarrierIds: result.failedCarrierIds,
  };
} catch (error) {
  outcome = { pass: false, error: `${error.name}: ${error.message}` };
}
console.log(JSON.stringify({ node: process.version, inputRates: count, ...outcome }));
