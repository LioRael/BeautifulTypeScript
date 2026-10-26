import { DeskError, type Enrollment, type SessionSeed } from './model.js';

export interface SessionState extends SessionSeed {
  admissionsOpen: boolean;
  enrollments: Enrollment[];
}

// Owned by one desk instance. Never exposed directly to callers.
export class SessionStore {
  private readonly sessions = new Map<string, SessionState>();

  constructor(seeds: readonly SessionSeed[]) {
    for (const seed of seeds) {
      if (!seed.id || !seed.title || !Number.isInteger(seed.capacity) || seed.capacity < 1) {
        throw new DeskError('INVALID_SESSION', 'Sessions need an id, title and positive capacity');
      }
      if (this.sessions.has(seed.id)) {
        throw new DeskError('DUPLICATE_SESSION', 'Session ids must be unique');
      }
      this.sessions.set(seed.id, { ...seed, admissionsOpen: true, enrollments: [] });
    }
  }

  get(id: string): SessionState {
    const session = this.sessions.get(id);
    if (!session) throw new DeskError('NOT_FOUND', 'Unknown training session');
    return session;
  }
}
