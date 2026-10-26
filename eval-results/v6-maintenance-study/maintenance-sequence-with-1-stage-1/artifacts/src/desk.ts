import { canonicalEmail, DeskError, type Enrollment, type Roster, type SessionSeed } from './model.js';
import { SessionStore } from './store.js';

export class TrainingDesk {
  private readonly store: SessionStore;

  constructor(seeds: readonly SessionSeed[]) {
    this.store = new SessionStore(seeds);
  }

  enroll(sessionId: string, rawEmail: string, options?: { waitlist: boolean }): Enrollment {
    const session = this.store.get(sessionId);
    const email = canonicalEmail(rawEmail);
    if (session.enrollments.some(entry => entry.email === email)) {
      throw new DeskError('ALREADY_ENROLLED', 'Employee already enrolled');
    }
    const full = session.enrollments.filter(entry => entry.status === 'confirmed').length >= session.capacity;
    if (full && !options?.waitlist) {
      throw new DeskError('FULL', 'Session is full');
    }
    const entry: Enrollment = { email, status: full ? 'waitlisted' : 'confirmed' };
    session.enrollments.push(entry);
    return { ...entry };
  }

  cancel(sessionId: string, rawEmail: string): void {
    const session = this.store.get(sessionId);
    const email = canonicalEmail(rawEmail);
    const index = session.enrollments.findIndex(entry => entry.email === email);
    const entry = session.enrollments[index];
    if (!entry) throw new DeskError('NOT_ENROLLED', 'Employee is not enrolled');
    session.enrollments.splice(index, 1);
    if (entry.status === 'confirmed') {
      const waiting = session.enrollments.find(entry => entry.status === 'waitlisted');
      if (waiting) waiting.status = 'confirmed';
    }
  }

  roster(sessionId: string): Roster {
    const session = this.store.get(sessionId);
    return {
      id: session.id,
      title: session.title,
      capacity: session.capacity,
      enrollments: session.enrollments.map(entry => ({ ...entry })),
    };
  }
}
