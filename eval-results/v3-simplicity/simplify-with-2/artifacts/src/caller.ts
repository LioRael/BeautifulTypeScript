import { firstActiveName, pageSize, type Member } from './selection.js';

export function viewModel(members: readonly Member[], limit?: number) {
  return { title: firstActiveName(members), limit: pageSize(limit === undefined ? {} : { limit }) };
}
