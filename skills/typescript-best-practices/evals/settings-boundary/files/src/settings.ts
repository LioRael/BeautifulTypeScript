export interface Settings { endpoint: string; retries: number; enabled: boolean }
export function parseSettings(_input: unknown): Settings { throw new Error('not implemented'); }
export function loadSettings(_readText: () => Promise<string>): Promise<Settings> { throw new Error('not implemented'); }
