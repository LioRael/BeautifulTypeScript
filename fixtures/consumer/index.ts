import { aggregate, type Total } from '../../dist/inventory.js';
const result: Total[] = aggregate([{ key: 'x', quantity: 1 }]);
export const first: Total | undefined = result[0];
