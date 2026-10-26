export interface Member { name: string; active: boolean }

export function firstActiveName(members: readonly Member[]): string | undefined {
  return members.find(member => member.active === true)?.name;
}

export function pageSize(options: { limit?: number }): number {
  return options.limit ?? 20;
}
