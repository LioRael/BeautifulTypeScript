export interface Member { name: string; active: boolean }

export function firstActiveName(members: readonly Member[]): string | undefined {
  let name: string | undefined = undefined;
  for (const member of members) {
    if (member.active === true) {
      name = member.name;
      break;
    }
  }
  return name;
}

export function pageSize(options: { limit?: number }): number {
  if (options.limit !== undefined) {
    return options.limit;
  } else {
    return 20;
  }
}
