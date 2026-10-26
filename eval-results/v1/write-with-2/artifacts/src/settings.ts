export interface Settings { endpoint: string; retries: number; enabled: boolean }

export function parseSettings(input: unknown): Settings {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new TypeError('settings must be an object');
  }

  const fields = input as Record<string, unknown>;
  const endpoint = Object.hasOwn(fields, 'endpoint') ? fields.endpoint : undefined;
  if (typeof endpoint !== 'string' || endpoint.length === 0) {
    throw new TypeError('endpoint must be a nonempty string');
  }

  const retries = Object.hasOwn(fields, 'retries') ? fields.retries : 3;
  if (typeof retries !== 'number' || !Number.isInteger(retries) || retries < 0 || retries > 5) {
    throw new TypeError('retries must be an integer from 0 to 5');
  }

  const enabled = Object.hasOwn(fields, 'enabled') ? fields.enabled : true;
  if (typeof enabled !== 'boolean') {
    throw new TypeError('enabled must be a boolean');
  }

  return { endpoint, retries, enabled };
}

export async function loadSettings(readText: () => Promise<string>): Promise<Settings> {
  const input: unknown = JSON.parse(await readText());
  return parseSettings(input);
}
