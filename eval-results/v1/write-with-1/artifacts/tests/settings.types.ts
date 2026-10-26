import { parseSettings, loadSettings, type Settings } from '../dist/settings.js';

const parsed: Settings = parseSettings({ endpoint: '/api' });
const loaded: Promise<Settings> = loadSettings(async () => '{"endpoint":"/api"}');
const endpoint: string = parsed.endpoint;
const retries: number = parsed.retries;
const enabled: boolean = parsed.enabled;
void [loaded, endpoint, retries, enabled];

// @ts-expect-error The reader must return a promise of text.
loadSettings(() => 'text');
// @ts-expect-error Settings retains its boolean enabled field.
const invalid: Settings = { endpoint: '/api', retries: 3, enabled: 'yes' };
void invalid;
